import math
# pyrefly: ignore [missing-import]
from rest_framework import status, permissions, generics, viewsets
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.exceptions import ValidationError

from .models import NGO, NGODocument, NGOReview, Need, EmergencyCampaign, VolunteerEvent, VolunteerRegistration
from .serializers import (
    NGORegistrationSerializer, 
    NGODetailsSerializer, 
    NGOReviewSerializer, 
    NeedSerializer,
    EmergencyCampaignSerializer,
    VolunteerEventSerializer,
    VolunteerRegistrationSerializer
)
from donation.models import Donation, DonationStatus
# pyrefly: ignore [missing-import]
from django.utils import timezone
from datetime import timedelta
# pyrefly: ignore [missing-import]
from django.db.models import Count
# pyrefly: ignore [missing-import]
from django.db.models.functions import TruncMonth

def get_distance_km(lat1, lon1, lat2, lon2):
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999.0
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
        R = 6371.0 # Radius of the Earth in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2.0) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c
    except (TypeError, ValueError):
        return 999.0

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == 'admin'

class IsNgoUserOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and (request.user.role == 'ngo' or request.user.role == 'admin')

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        if request.user.is_staff or getattr(request.user, 'role', '') == 'admin':
            return True
        ngo = getattr(request.user, 'ngo_details', None)
        return ngo is not None and getattr(obj, 'ngo', None) == ngo

class NGORegisterView(generics.CreateAPIView):
    serializer_class = NGORegistrationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        if request.user.role != 'ngo':
            return Response({"error": "User role must be NGO to register organization detail"}, status=status.HTTP_403_FORBIDDEN)
        
        if hasattr(request.user, 'ngo_details'):
            existing_ngo = request.user.ngo_details
            if existing_ngo.verification_status == 'approved':
                return Response({"error": "NGO registration is already approved."}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = self.get_serializer(existing_ngo, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            ngo = serializer.save()
            
            from notification.models import Notification, NotificationType
            Notification.objects.create(
                user=request.user,
                notification_type=NotificationType.SECURITY,
                title="NGO Verification Resubmitted",
                message=f"Your updated NGO registration for '{ngo.name}' has been resubmitted and is pending admin audit."
            )
            
            data = NGODetailsSerializer(ngo).data
            data["message"] = "NGO registration submitted for verification"
            data["verification_status"] = ngo.verification_status
            return Response(data, status=status.HTTP_200_OK)
            
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ngo = serializer.save()
        
        from notification.models import Notification, NotificationType
        Notification.objects.create(
            user=request.user,
            notification_type=NotificationType.SECURITY,
            title="NGO Application Submitted",
            message=f"Your NGO registration for '{ngo.name}' has been submitted and is pending admin audit."
        )
        
        data = NGODetailsSerializer(ngo).data
        data["message"] = "NGO registration submitted for verification"
        data["verification_status"] = ngo.verification_status
        return Response(data, status=status.HTTP_201_CREATED)

class NGOListView(generics.ListAPIView):
    serializer_class = NGODetailsSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        queryset = NGO.objects.prefetch_related('documents', 'reviews', 'needs').filter(verification_status='approved')
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(working_areas__icontains=category)

        query = self.request.query_params.get('query')
        if query:
            queryset = queryset.filter(name__icontains=query)

        trust_score = self.request.query_params.get('trust_score')
        if trust_score:
            try:
                queryset = queryset.filter(trust_score__gte=int(trust_score))
            except ValueError:
                pass

        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        distance_limit = self.request.query_params.get('distance')
        
        if lat and lng and distance_limit:
            try:
                center_lat = float(lat)
                center_lng = float(lng)
                radius = float(distance_limit)
                
                filtered_ids = []
                for ngo in queryset:
                    dist = get_distance_km(center_lat, center_lng, ngo.lat, ngo.lng)
                    if dist <= radius:
                        filtered_ids.append(ngo.id)
                queryset = queryset.filter(id__in=filtered_ids)
            except ValueError:
                pass

        return queryset

class NGODetailsView(generics.RetrieveAPIView):
    queryset = NGO.objects.prefetch_related('documents', 'reviews', 'needs').all()
    serializer_class = NGODetailsSerializer
    permission_classes = (permissions.AllowAny,)

    def get_object(self):
        ngo = super().get_object()
        user = self.request.user
        if user.is_authenticated and (user.role == 'admin' or ngo.user == user):
            return ngo
        if ngo.verification_status != 'approved':
            from rest_framework.exceptions import NotFound
            raise NotFound("NGO profile not found or not yet verified.")
        return ngo

class NGODetailsCurrentUserView(generics.RetrieveAPIView):
    """Returns the NGO profile of the currently authenticated NGO user."""
    serializer_class = NGODetailsSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        if not hasattr(self.request.user, 'ngo_details'):
            # pyrefly: ignore [missing-import]
            from rest_framework.exceptions import NotFound
            raise NotFound("No NGO profile found for this user.")
        return NGO.objects.prefetch_related('documents', 'reviews', 'needs').get(user=self.request.user)

class NGOCreateReviewView(generics.CreateAPIView):
    serializer_class = NGOReviewSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        try:
            ngo = NGO.objects.get(pk=pk)
        except NGO.DoesNotExist:
            return Response({"error": "NGO does not exist"}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(ngo=ngo, author_name=request.user.username)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class NGOAnalyticsView(APIView):
    """Returns analytics data (monthly trend and category distribution) for the currently authenticated NGO."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if request.user.role != 'ngo' or not hasattr(request.user, 'ngo_details'):
            return Response({"error": "No NGO profile found for this user."}, status=status.HTTP_403_FORBIDDEN)
            
        ngo = request.user.ngo_details
        
        # 1. Monthly Data (Last 6 months)
        six_months_ago = timezone.now() - timedelta(days=180)
        donations_last_6_months = Donation.objects.filter(
            matched_ngo=ngo, 
            status__in=[DonationStatus.MATCHED, DonationStatus.DELIVERED],
            matched_at__gte=six_months_ago
        )
        
        # Group by month
        monthly_counts = donations_last_6_months.annotate(
            month=TruncMonth('matched_at')
        ).values('month').annotate(total=Count('id')).order_by('month')
        
        # Initialize 6 months with 0
        monthly_data = []
        for i in range(5, -1, -1):
            date = timezone.now() - timedelta(days=30*i)
            monthly_data.append({
                'month': date.strftime('%b'),
                'received': 0,
                'target': 100 # Default target
            })
            
        for item in monthly_counts:
            if item['month']:
                month_name = item['month'].strftime('%b')
                for m in monthly_data:
                    if m['month'] == month_name:
                        m['received'] += item['total']
        
        # 2. Category Data (All time or last year)
        all_donations = Donation.objects.filter(
            matched_ngo=ngo, 
            status__in=[DonationStatus.MATCHED, DonationStatus.DELIVERED]
        )
        category_counts = all_donations.values('category').annotate(value=Count('id'))
        
        category_data = []
        for item in category_counts:
            category_data.append({
                'name': item['category'],
                'value': item['value']
            })
            
        # Fallback if no data
        if not category_data:
            category_data = [
                {'name': 'Clothing', 'value': 1},
                {'name': 'Food', 'value': 1}
            ]
            
        return Response({
            'monthly': monthly_data,
            'categories': category_data
        })

class NeedViewSet(viewsets.ModelViewSet):
    serializer_class = NeedSerializer
    permission_classes = (IsNgoUserOrReadOnly,)

    def get_queryset(self):
        ngo_id = self.request.query_params.get('ngo_id')
        campaign_id = self.request.query_params.get('campaign_id')
        status_param = self.request.query_params.get('status')
        all_param = self.request.query_params.get('all')
        
        from django.db import models
        from django.db.models import F

        # Security Sync: Only show needs from APPROVED NGOs, unless the user is the NGO itself looking at their own needs
        is_ngo_owner = self.request.user.is_authenticated and self.request.user.role == 'ngo' and hasattr(self.request.user, 'ngo_details')
        if is_ngo_owner:
            queryset = Need.objects.filter(models.Q(ngo__verification_status='approved') | models.Q(ngo=self.request.user.ngo_details))
        else:
            queryset = Need.objects.filter(ngo__verification_status='approved')
            
        if ngo_id:
            queryset = queryset.filter(ngo_id=ngo_id)
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
            
        # Real-time visibility filter:
        # Public listings only show ACTIVE, unfulfilled requests.
        # NGOs can view complete history when explicitly requested (all=true or status specified).
        if is_ngo_owner and (all_param == 'true' or status_param):
            if status_param and status_param != 'ALL':
                queryset = queryset.filter(status=status_param)
        else:
            queryset = queryset.filter(status='ACTIVE', fulfilled_quantity__lt=F('quantity'))
            
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'ngo_details'):
            raise ValidationError("You must register an NGO account to broadcast needs")
        ngo = self.request.user.ngo_details
        if ngo.verification_status != 'approved':
            raise ValidationError("Your NGO verification must be approved to broadcast needs")
        serializer.save(ngo=ngo)

class EmergencyCampaignViewSet(viewsets.ModelViewSet):
    queryset = EmergencyCampaign.objects.all()
    serializer_class = EmergencyCampaignSerializer
    permission_classes = (IsAdminOrReadOnly,)

class VolunteerEventViewSet(viewsets.ModelViewSet):
    queryset = VolunteerEvent.objects.all()
    serializer_class = VolunteerEventSerializer
    permission_classes = (IsNgoUserOrReadOnly,)

    def get_queryset(self):
        ngo_id = self.request.query_params.get('ngo_id')
        
        # Security Sync: Only show events from APPROVED NGOs, unless the user is the NGO itself
        if self.request.user.is_authenticated and self.request.user.role == 'ngo' and hasattr(self.request.user, 'ngo_details'):
            # pyrefly: ignore [missing-import]
            from django.db import models
            queryset = VolunteerEvent.objects.filter(models.Q(ngo__verification_status='approved') | models.Q(ngo=self.request.user.ngo_details))
        else:
            queryset = VolunteerEvent.objects.filter(ngo__verification_status='approved')
            
        if ngo_id:
            return queryset.filter(ngo_id=ngo_id)
        return queryset

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'ngo_details'):
            raise ValidationError("You must register an NGO account to create events")
        ngo = self.request.user.ngo_details
        if ngo.verification_status != 'approved':
            raise ValidationError("Your NGO verification must be approved to create events")
        serializer.save(ngo=ngo)

class VolunteerRegistrationViewSet(viewsets.ModelViewSet):
    serializer_class = VolunteerRegistrationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return VolunteerRegistration.objects.all()
        elif user.role == 'ngo' and hasattr(user, 'ngo_details'):
            return VolunteerRegistration.objects.filter(event__ngo=user.ngo_details)
        else:
            return VolunteerRegistration.objects.filter(user=user)

    def perform_create(self, serializer):
        event = serializer.validated_data.get('event')
        
        # Check if already registered
        if VolunteerRegistration.objects.filter(event=event, user=self.request.user).exists():
            raise ValidationError("You are already registered for this event")
            
        if event.max_volunteers > 0 and event.registrations.filter(status='approved').count() >= event.max_volunteers:
            raise ValidationError("This event has reached its maximum volunteer capacity")
            
        serializer.save(user=self.request.user)
