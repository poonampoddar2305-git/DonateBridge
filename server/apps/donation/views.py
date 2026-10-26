import math
import random
import secrets
from datetime import datetime
from django.utils import timezone as django_timezone
from rest_framework import status, permissions, generics, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .models import Donation, WishlistItem, DonationPhoto, CommunityChallenge
from .serializers import DonationDetailsSerializer, DonationCreateSerializer, CommunityChallengeSerializer
from ngo.models import NGO, Need
from ngo.views import get_distance_km
from logistics.models import LogisticsJob, TrackingMilestone
from moderation.models import AuditLog

# Smart Matching Priority Calculation
def calculate_match_score(donation, need, ngo):
    # 1. Category Fit (30%)
    don_cat = donation.category.lower()
    need_cat = need.category.lower()
    if don_cat == need_cat:
        category_fit = 100
    elif don_cat in need_cat or need_cat in don_cat:
        category_fit = 80
    else:
        category_fit = 0
        
    # 2. Distance Score (20%)
    dist = get_distance_km(donation.pickup_lat, donation.pickup_lng, ngo.lat, ngo.lng)
    distance_score = max(0, 100 - (dist * 5)) # 0km = 100, 20km = 0
    
    # 3. Quantity Score (15%)
    qty_diff = abs(donation.quantity - need.quantity)
    max_qty = max(donation.quantity, need.quantity)
    quantity_score = 100 if max_qty == 0 else max(0, 100 - ((qty_diff / max_qty) * 100))
    
    # 4. Urgency Score (15%)
    urgency_map = {'High': 100, 'Medium': 70, 'Low': 30}
    urgency_score = urgency_map.get(need.urgency, 30)
    
    # 5. NGO Trust Score (10%)
    trust_score = getattr(ngo, 'trust_score', 70)
    
    # 6. Freshness Score (10%)
    delta_days = (django_timezone.now() - donation.submitted_at).days
    freshness_score = max(0, 100 - (delta_days * 10))
    
    total_score = round(
        (category_fit * 0.30) +
        (distance_score * 0.20) +
        (quantity_score * 0.15) +
        (urgency_score * 0.15) +
        (trust_score * 0.10) +
        (freshness_score * 0.10)
    )
    
    return {
        "total": total_score,
        "categoryFit": round(category_fit * 0.30),
        "distanceScore": round(distance_score * 0.20),
        "quantityScore": round(quantity_score * 0.15),
        "urgencyScore": round(urgency_score * 0.15),
        "trustScore": round(trust_score * 0.10),
        "freshnessScore": round(freshness_score * 0.10),
        "distance": round(dist, 1)
    }

class IsDonorOwnerOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        if request.user.is_staff or getattr(request.user, 'role', '') == 'admin':
            return True
        return obj.donor == request.user

class DonationViewSet(viewsets.ModelViewSet):
    queryset = Donation.objects.select_related('donor', 'matched_ngo').prefetch_related('photos')
    permission_classes = (IsDonorOwnerOrReadOnly,)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DonationCreateSerializer
        return DonationDetailsSerializer

    def get_queryset(self):
        queryset = Donation.objects.select_related('donor', 'matched_ngo').prefetch_related('photos')
        
        status_param = self.request.query_params.get('status')
        ngo_id = self.request.query_params.get('ngo_id') or self.request.query_params.get('ngo')
        
        if status_param:
            queryset = queryset.filter(status=status_param)
            
        if ngo_id:
            if ngo_id == 'me' and hasattr(self.request.user, 'ngo_profile'):
                queryset = queryset.filter(matched_ngo=self.request.user.ngo_profile)
            elif ngo_id != 'all':
                try:
                    queryset = queryset.filter(matched_ngo_id=int(ngo_id))
                except (ValueError, TypeError):
                    pass
        elif not status_param:
            queryset = queryset.exclude(status='REJECTED')
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__icontains=category)
            
        conditions = self.request.query_params.get('condition')
        if conditions:
            condition_list = [c.strip() for c in conditions.split(',')]
            queryset = queryset.filter(condition__in=condition_list)
            
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        distance_limit = self.request.query_params.get('distance')
        
        if lat and lng and distance_limit:
            try:
                center_lat = float(lat)
                center_lng = float(lng)
                radius = float(distance_limit)
                
                filtered_ids = []
                for donation in queryset:
                    dist = get_distance_km(center_lat, center_lng, donation.pickup_lat, donation.pickup_lng)
                    if dist <= radius:
                        filtered_ids.append(donation.id)
                queryset = queryset.filter(id__in=filtered_ids)
            except ValueError:
                pass
                
        sort_by = self.request.query_params.get('sortBy', 'date')
        if sort_by == 'date':
            queryset = queryset.order_by('-submitted_at')
        elif sort_by == 'quantity':
            queryset = queryset.order_by('-quantity')
            
        return queryset

    def perform_create(self, serializer):
        donation = serializer.save(donor=self.request.user, status='VERIFIED')
        
        matched_ngo_id = self.request.data.get('matched_ngo_id') or self.request.data.get('ngo_id') or self.request.data.get('ngoId')
        matching_need = None
        
        if matched_ngo_id:
            try:
                from ngo.models import NGO
                target_ngo = NGO.objects.get(id=matched_ngo_id)
                donation.matched_ngo = target_ngo
                donation.status = 'MATCHED'
                donation.save()
                matching_need = Need.objects.filter(ngo=target_ngo, category__icontains=donation.category).first()
            except Exception as e:
                print("[Matched NGO Fetch Error]", e)

        if not matching_need:
            matching_need = Need.objects.filter(
                status='ACTIVE',
                category__icontains=donation.category
            ).first()
        
        if matching_need:
            if not donation.matched_ngo:
                donation.matched_ngo = matching_need.ngo
                donation.status = 'MATCHED'
                donation.save()
            
            # Send real-time notification to the relevant NGO owner
            try:
                from notification.models import Notification, NotificationType
                Notification.objects.create(
                    user=matching_need.ngo.user,
                    notification_type=NotificationType.MATCH,
                    title=f"🎁 Requirement Fulfilled: {matching_need.item}",
                    message=f"Donor '{self.request.user.username or self.request.user.email}' pledged {donation.quantity}x '{donation.title}' towards your requirement '{matching_need.item}'!"
                )
            except Exception as e:
                print("[Notification Error]", e)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status == 'DELIVERED' and not instance.delivered_at:
            instance.delivered_at = django_timezone.now()
            instance.save()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_donations(self, request):
        donations = Donation.objects.select_related('donor', 'matched_ngo').prefetch_related('photos').filter(donor=request.user).order_by('-submitted_at')
        serializer = DonationDetailsSerializer(donations, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def claim(self, request, pk=None):
        donation = self.get_object()
        
        if not hasattr(request.user, 'ngo_details'):
            return Response({"error": "User role/profile must be NGO to claim donations"}, status=status.HTTP_403_FORBIDDEN)
        ngo = request.user.ngo_details
        if ngo.verification_status != 'approved':
            return Response({"error": "Your NGO verification status must be approved to claim donations"}, status=status.HTTP_403_FORBIDDEN)
            
        if donation.status == 'MATCHED' and donation.matched_ngo == ngo:
            return Response(DonationDetailsSerializer(donation, context={'request': request}).data, status=status.HTTP_200_OK)

        if donation.status not in ['VERIFIED', 'PENDING']:
            return Response({"error": "Donation is not available for claim"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Match Score logic & fulfill quantity update
        matching_need = Need.objects.filter(ngo=ngo, category__icontains=donation.category).first()
        if not matching_need:
            matching_need = Need.objects.filter(ngo=ngo).first() # Fallback for fuzzy matching

        score = 80
        if matching_need:
            score_breakdown = calculate_match_score(donation, matching_need, ngo)
            score = score_breakdown['total']
            
        donation.status = 'MATCHED'
        donation.matched_ngo = ngo
        donation.match_score = score
        donation.matched_at = django_timezone.now()
        donation.save()
        
        # Notify Donor that their donation has been claimed by NGO
        try:
            from notification.models import Notification, NotificationType
            Notification.objects.create(
                user=donation.donor,
                notification_type=NotificationType.MATCH,
                title=f"🎉 Donation Claimed by {ngo.name}!",
                message=f"NGO '{ngo.name}' has matched & claimed your donation '{donation.title}' (Qty: {donation.quantity}). Pickup logistics and tracking milestone generated!"
            )
        except Exception as e:
            print("[Notification Error]", e)
        
        # Generate logistics job with verification QR code token
        verify_token = f"DB-VERIFY-{donation.id}-{secrets.token_hex(12).upper()}"
        logistics_job, _ = LogisticsJob.objects.get_or_create(
            donation=donation,
            defaults={
                'carrier_name': "Express Cargo #DB-990",
                'current_step': 2,
                'verification_token': verify_token,
                'qr_code_content': f"https://donatebridge.org/verify-delivery/{verify_token}"
            }
        )
        
        TrackingMilestone.objects.get_or_create(
            job=logistics_job, step_num=1,
            defaults={
                'title': 'Requested',
                'description': 'Donation request logged by donor, pending verification.',
                'lat': donation.pickup_lat, 'lng': donation.pickup_lng
            }
        )
        TrackingMilestone.objects.get_or_create(
            job=logistics_job, step_num=2,
            defaults={
                'title': 'Approved',
                'description': 'Listing approved by Admin and matched with NGO parameters.',
                'lat': donation.pickup_lat, 'lng': donation.pickup_lng
            }
        )
        
        # Audit log creation
        AuditLog.objects.create(
            user=request.user,
            action_type="DONATION_CLAIM",
            description=f"Donation {donation.id} claimed by NGO {ngo.name} with match score {score}."
        )
        
        return Response({
            "message": "Donation claimed successfully",
            "donation_id": donation.id,
            "status": donation.status,
            "match_score": donation.match_score,
            "qr_token": verify_token
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def wishlist(self, request, pk=None):
        donation = self.get_object()
        wish_item = WishlistItem.objects.filter(user=request.user, donation=donation).first()
        
        if wish_item:
            wish_item.delete()
            return Response({"message": "Removed from wishlist", "is_wishlisted": False})
        else:
            WishlistItem.objects.create(user=request.user, donation=donation)
            return Response({"message": "Added to wishlist", "is_wishlisted": True})

class NgoSmartMatchesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if not hasattr(request.user, 'ngo_details'):
            return Response({"error": "User must be NGO to view smart matches"}, status=status.HTTP_403_FORBIDDEN)
        ngo = request.user.ngo_details
        
        ngo_needs = Need.objects.filter(ngo=ngo)
        available_donations = Donation.objects.filter(status='VERIFIED')
        
        matches = []
        for donation in available_donations:
            for need in ngo_needs:
                don_cat = donation.category.lower()
                need_cat = need.category.lower()
                if don_cat in need_cat or need_cat in don_cat:
                    score_breakdown = calculate_match_score(donation, need, ngo)
                    matches.append({
                        "donation": DonationDetailsSerializer(donation, context={'request': request}).data,
                        "need": {
                            "id": need.id,
                            "item": need.item,
                            "category": need.category,
                            "urgency": need.urgency
                        },
                        "scoreBreakdown": score_breakdown
                    })
                    
        matches.sort(key=lambda x: x['scoreBreakdown']['total'], reverse=True)
        return Response(matches)

class DonationSmartMatchesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, id):
        try:
            donation = Donation.objects.get(id=id)
        except Donation.DoesNotExist:
            return Response({"error": "Donation listing not found"}, status=status.HTTP_404_NOT_FOUND)
            
        needs = Need.objects.filter(ngo__verification_status='approved')
        
        matches = []
        for need in needs:
            don_cat = donation.category.lower()
            need_cat = need.category.lower()
            if don_cat in need_cat or need_cat in don_cat:
                ngo = need.ngo
                score_breakdown = calculate_match_score(donation, need, ngo)
                matches.append({
                    "need": {
                        "id": need.id,
                        "item": need.item,
                        "category": need.category,
                        "urgency": need.urgency
                    },
                    "ngo": {
                        "id": ngo.id,
                        "name": ngo.name,
                        "address": ngo.address,
                        "trustScore": ngo.trust_score
                    },
                    "scoreBreakdown": score_breakdown
                })
                
        matches.sort(key=lambda x: x['scoreBreakdown']['total'], reverse=True)
        return Response(matches)

class CommunityChallengeViewSet(viewsets.ModelViewSet):
    queryset = CommunityChallenge.objects.all()
    serializer_class = CommunityChallengeSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        active_only = self.request.query_params.get('active')
        if active_only == 'true':
            return CommunityChallenge.objects.filter(is_active=True)
        return CommunityChallenge.objects.all()
