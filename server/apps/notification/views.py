from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, NotificationType
from .serializers import NotificationSerializer

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user)
        
        # Optional type filtering (all, unread, delivery, security, match, chat)
        notif_type = self.request.query_params.get('type')
        if notif_type == 'unread':
            queryset = queryset.filter(is_read=False)
        elif notif_type in ['delivery', 'security', 'match', 'chat']:
            queryset = queryset.filter(notification_type=notif_type)
            
        return queryset.order_by('-created_at')

class ReadNotificationView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def patch(self, request, id):
        try:
            notif = Notification.objects.get(id=id, user=request.user)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)
            
        notif.is_read = True
        notif.save()
        return Response(NotificationSerializer(notif).data)

class MarkAllReadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": "All notifications marked as read"})
