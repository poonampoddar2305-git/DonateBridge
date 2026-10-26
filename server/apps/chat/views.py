import random
from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q

from .models import ChatChannel, ChatMember, ChatMessage
from .serializers import ChatChannelSerializer, ChatMessageSerializer

class ChannelListView(generics.ListCreateAPIView):
    serializer_class = ChatChannelSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        # Channels where current user is a member
        return ChatChannel.objects.filter(members__user=self.request.user)

    def create(self, request, *args, **kwargs):
        # Create a channel with another user
        other_user_id = request.data.get('other_user_id')
        if not other_user_id:
            return Response({"error": "other_user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response({"error": "Other user not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Role authorization check
        if request.user.role == 'donor' and other_user.role not in ['ngo', 'admin']:
            return Response({"error": "Donors can only start conversations with registered NGOs."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == 'ngo' and other_user.role not in ['donor', 'admin']:
            return Response({"error": "NGOs can only start conversations with registered Donors."}, status=status.HTTP_403_FORBIDDEN)

        # Check if direct channel already exists between these two users
        existing_channel = ChatChannel.objects.filter(
            members__user=request.user
        ).filter(
            members__user=other_user
        ).first()
        
        if existing_channel:
            serializer = self.get_serializer(existing_channel, context={'request': request})
            return Response(serializer.data)
            
        # Create new channel
        channel = ChatChannel.objects.create()
        ChatMember.objects.create(channel=channel, user=request.user)
        ChatMember.objects.create(channel=channel, user=other_user)
        
        serializer = self.get_serializer(channel, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AvailableContactsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        search_query = request.query_params.get('search', '').strip()
        contacts = []

        if user.role in ['donor', 'admin']:
            from ngo.models import NGO, VerificationStatus
            ngos = NGO.objects.filter(verification_status=VerificationStatus.APPROVED)
            if search_query:
                ngos = ngos.filter(
                    Q(name__icontains=search_query) |
                    Q(city__icontains=search_query) |
                    Q(state__icontains=search_query) |
                    Q(address__icontains=search_query) |
                    Q(district__icontains=search_query)
                )
            for n in ngos:
                contacts.append({
                    'id': n.id,
                    'user_id': n.user.id,
                    'name': n.name,
                    'role': 'ngo',
                    'email': n.user.email,
                    'city': n.city or '',
                    'state': n.state or '',
                    'address': n.address,
                    'phone': n.phone,
                    'avatar': getattr(n.user, 'avatar', '🏫'),
                    'trust_score': n.trust_score
                })

        if user.role in ['ngo', 'admin']:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            donors = User.objects.filter(role='donor').exclude(id=user.id)
            if search_query:
                donors = donors.filter(
                    Q(username__icontains=search_query) |
                    Q(email__icontains=search_query) |
                    Q(profile__city__icontains=search_query) |
                    Q(profile__state__icontains=search_query) |
                    Q(profile__address__icontains=search_query)
                )
            for d in donors:
                prof = getattr(d, 'profile', None)
                city = prof.city if prof and prof.city else ''
                state = prof.state if prof and prof.state else ''
                address = prof.address if prof and prof.address else ''
                phone = prof.phone if prof and prof.phone else ''
                
                contacts.append({
                    'id': d.id,
                    'user_id': d.id,
                    'name': d.username or d.email.split('@')[0],
                    'role': 'donor',
                    'email': d.email,
                    'city': city,
                    'state': state,
                    'address': address,
                    'phone': phone,
                    'avatar': getattr(d, 'avatar', '🙋‍♂️')
                })

        return Response(contacts, status=status.HTTP_200_OK)


class MessageListView(APIView):

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, channel_id):
        # Verify user is member of this channel
        if not ChatMember.objects.filter(channel_id=channel_id, user=request.user).exists():
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
            
        messages = ChatMessage.objects.filter(channel_id=channel_id).order_by('created_at')
        
        # Mark other user's messages as read
        ChatMessage.objects.filter(channel_id=channel_id).exclude(sender=request.user).update(is_read=True, is_delivered=True)
        
        serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, channel_id):
        # Verify user is member
        if not ChatMember.objects.filter(channel_id=channel_id, user=request.user).exists():
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
            
        text = request.data.get('text', '')
        message_type = request.data.get('message_type', 'text')
        media_url = request.data.get('media_url')
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        
        text = text.strip() if text else ''
        if message_type == 'text' and not text:
            return Response({"error": "Message text cannot be empty or whitespace only."}, status=status.HTTP_400_BAD_REQUEST)
            
        if len(text) > 10000:
            return Response({"error": "Message exceeds maximum allowed length."}, status=status.HTTP_400_BAD_REQUEST)

        message = ChatMessage.objects.create(
            channel_id=channel_id,
            sender=request.user,
            message_type=message_type,
            text=text,
            media_url=media_url,
            lat=lat,
            lng=lng,
            is_delivered=True,
            is_read=False
        )
        
        messages = ChatMessage.objects.filter(channel_id=channel_id).order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
