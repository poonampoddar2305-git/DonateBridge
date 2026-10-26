# pyrefly: ignore [missing-import]
from rest_framework import status, permissions, generics
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from django.utils import timezone

from .models import LogisticsJob, TrackingMilestone
from .serializers import LogisticsJobSerializer
from donation.models import Donation, DonationStatus

class LogisticsTrackingView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, donation_id):
        try:
            job = LogisticsJob.objects.prefetch_related('milestones').get(donation_id=donation_id)
        except LogisticsJob.DoesNotExist:
            return Response({"error": "Tracking record not found for this donation ID"}, status=status.HTTP_404_NOT_FOUND)
            
        donation = job.donation
        is_donor = (donation.donor == request.user)
        is_ngo_owner = (donation.matched_ngo and donation.matched_ngo.user == request.user)
        is_admin = (request.user.is_staff or getattr(request.user, 'role', '') == 'admin')

        if not (is_donor or is_ngo_owner or is_admin):
            return Response({"error": "You do not have permission to view tracking details for this donation"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = LogisticsJobSerializer(job)
        return Response(serializer.data)

class UpdateLogisticsStepView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def patch(self, request, donation_id):
        try:
            job = LogisticsJob.objects.get(donation_id=donation_id)
        except LogisticsJob.DoesNotExist:
            return Response({"error": "Tracking record not found"}, status=status.HTTP_404_NOT_FOUND)
            
        donation = job.donation
        is_donor = (donation.donor == request.user)
        is_ngo_owner = (donation.matched_ngo and donation.matched_ngo.user == request.user)
        is_admin = (request.user.is_staff or getattr(request.user, 'role', '') == 'admin')
        
        if not (is_donor or is_ngo_owner or is_admin):
            return Response({"error": "You do not have permission to update tracking milestones for this shipment"}, status=status.HTTP_403_FORBIDDEN)

        if donation.status == DonationStatus.DELIVERED or job.current_step >= 6:
            return Response({"error": "Cannot update logistics step for an already delivered or completed shipment."}, status=status.HTTP_400_BAD_REQUEST)

        step = request.data.get('step')
        if step is None:
            return Response({"error": "Step number is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            step_num = int(step)
            if not (1 <= step_num <= 6):
                return Response({"error": "Step number must be between 1 and 6"}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({"error": "Invalid step number format"}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce sequential progression
        if step_num > job.current_step + 1:
            return Response({
                "error": f"Invalid step transition from Step {job.current_step} to Step {step_num}. Steps must progress sequentially."
            }, status=status.HTTP_400_BAD_REQUEST)

        if step_num < job.current_step:
            return Response({
                "error": f"Cannot move backward from Step {job.current_step} to Step {step_num}."
            }, status=status.HTTP_400_BAD_REQUEST)

        job.current_step = step_num
        job.save()
        
        milestone_choices = {
            1: ('Requested', 'Donation request logged by donor, pending verification.'),
            2: ('Approved', 'Listing approved by Admin and matched with NGO parameters.'),
            3: ('Dispatched', 'Logistics carrier assigned and dispatched to donor pickup location.'),
            4: ('In Transit', 'Shipment picked up, currently in transit to destination NGO hub.'),
            5: ('Delivered', 'Parcels delivered to the destination NGO Hub address.'),
            6: ('Completed', 'Digital receipt matching complete, transaction hashed on ledger.')
        }
        
        lat = donation.pickup_lat
        lng = donation.pickup_lng
        if step_num >= 4:
            if donation.matched_ngo:
                lat = (donation.pickup_lat + donation.matched_ngo.lat) / 2
                lng = (donation.pickup_lng + donation.matched_ngo.lng) / 2
        if step_num >= 5:
            if donation.matched_ngo:
                lat = donation.matched_ngo.lat
                lng = donation.matched_ngo.lng
        
        title, desc = milestone_choices[step_num]
        TrackingMilestone.objects.get_or_create(
            job=job,
            step_num=step_num,
            defaults={
                'title': title,
                'description': desc,
                'lat': lat,
                'lng': lng
            }
        )
        
        if step_num in (5, 6):
            donation.status = DonationStatus.DELIVERED
            if not donation.delivered_at:
                donation.delivered_at = timezone.now()
            donation.save()
            
        try:
            from notification.models import Notification, NotificationType
            if step_num == 3:
                Notification.objects.create(user=donation.donor, notification_type=NotificationType.DELIVERY, title="🚚 Carrier Dispatched", message=f"A logistics carrier is on the way to pick up your donation '{donation.title}'.")
            elif step_num == 5:
                Notification.objects.create(user=donation.donor, notification_type=NotificationType.DELIVERY, title="✅ Delivery Successful", message=f"Your donation '{donation.title}' has been successfully delivered to the NGO!")
        except Exception as e:
            print("[Notification Error Logistics]", e)
            
        return Response(LogisticsJobSerializer(job).data)

class VerifyQRCodeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, donation_id):
        token = request.data.get('token')
        if not token or not str(token).strip():
            return Response({"error": "Verification token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            job = LogisticsJob.objects.get(donation_id=donation_id)
        except LogisticsJob.DoesNotExist:
            return Response({"error": "Tracking record not found"}, status=status.HTTP_404_NOT_FOUND)

        donation = job.donation
        is_ngo_owner = (donation.matched_ngo and donation.matched_ngo.user == request.user)
        is_admin = (request.user.is_staff or getattr(request.user, 'role', '') == 'admin')

        if not (is_ngo_owner or is_admin):
            return Response({"error": "Only the receiving NGO or an administrator can verify delivery QR code."}, status=status.HTTP_403_FORBIDDEN)

        if donation.status == DonationStatus.DELIVERED or job.current_step >= 5:
            return Response({"error": "This shipment has already been verified and delivered."}, status=status.HTTP_400_BAD_REQUEST)

        if job.verification_token != token:
            return Response({"error": "Invalid verification token"}, status=status.HTTP_400_BAD_REQUEST)

        job.current_step = 5
        job.save()

        donation.status = DonationStatus.DELIVERED
        if not donation.delivered_at:
            donation.delivered_at = timezone.now()
        donation.save()

        TrackingMilestone.objects.get_or_create(
            job=job,
            step_num=5,
            defaults={
                'title': 'Delivered',
                'description': 'Parcels delivered to the destination NGO Hub address, verified via secure QR handover code.',
                'lat': donation.matched_ngo.lat if donation.matched_ngo else donation.pickup_lat,
                'lng': donation.matched_ngo.lng if donation.matched_ngo else donation.pickup_lng
            }
        )
        
        try:
            from notification.models import Notification, NotificationType
            Notification.objects.create(user=donation.donor, notification_type=NotificationType.DELIVERY, title="✅ Delivery Verified", message=f"Your donation '{donation.title}' was successfully handed over to the NGO via secure QR Code.")
        except Exception as e:
            print("[Notification Error Logistics]", e)

        return Response({
            "message": "Delivery verified successfully via QR code.",
            "job": LogisticsJobSerializer(job).data
        }, status=status.HTTP_200_OK)
