import secrets
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Donation, DonationStatus, CommunityChallenge

@receiver(post_save, sender=Donation)
def handle_donation_status_change(sender, instance, created, **kwargs):
    # Import lazily to prevent circular imports
    from logistics.models import LogisticsJob, TrackingMilestone
    from ngo.models import Need
    from notification.models import Notification, NotificationType
    from moderation.models import AuditLog

    # 1. Log audit trail for donation changes
    if not created:
        AuditLog.objects.create(
            user=instance.donor,
            action_type="DONATION_STATUS_CHANGE",
            description=f"Donation {instance.id} status updated to {instance.status}."
        )
    else:
        AuditLog.objects.create(
            user=instance.donor,
            action_type="DONATION_CREATION",
            description=f"Donation {instance.id} created by donor."
        )

    # 2. Automation when donation is MATCHED/Claimed
    if instance.status == DonationStatus.MATCHED and instance.matched_ngo:
        # A. Create LogisticsJob if it doesn't exist
        secure_token = f"DB-VERIFY-{instance.id}-{secrets.token_hex(12).upper()}"
        job, job_created = LogisticsJob.objects.get_or_create(
            donation=instance,
            defaults={
                'carrier_name': "Express Cargo #DB-990",
                'current_step': 1,
                'verification_token': secure_token
            }
        )
        if job_created:
            job.qr_code_content = job.verification_token
            job.save()

            # Create initial TrackingMilestone
            TrackingMilestone.objects.get_or_create(
                job=job,
                step_num=1,
                defaults={
                    'title': "Pickup Scheduled",
                    'description': f"Carrier Express Cargo has scheduled pickup from donor location: {instance.pickup_address}.",
                    'lat': instance.pickup_lat,
                    'lng': instance.pickup_lng
                }
            )

            # B. Send Notifications
            # Notify donor
            Notification.objects.create(
                user=instance.donor,
                notification_type=NotificationType.DELIVERY,
                title="Donation Claimed",
                message=f"Good news! Your donation '{instance.title}' has been claimed by {instance.matched_ngo.name}. A pickup has been scheduled."
            )
            # Notify NGO representative user
            if instance.matched_ngo.user:
                Notification.objects.create(
                    user=instance.matched_ngo.user,
                    notification_type=NotificationType.DELIVERY,
                    title="Donation Matched",
                    message=f"You have successfully claimed the donation '{instance.title}' (ID: {instance.id}). Tracking is now live."
                )

            # C. Update NGO Needs
            # Find pending needs for this NGO matching the donation category
            matching_needs = Need.objects.filter(
                ngo=instance.matched_ngo,
                category__iexact=instance.category
            ).exclude(fulfilled_quantity__gte=models_f_expression_fallback(Need))

            remaining_qty = instance.quantity
            for need in matching_needs:
                if remaining_qty <= 0:
                    break
                needed_qty = need.quantity - need.fulfilled_quantity
                allocated = min(needed_qty, remaining_qty)
                need.fulfilled_quantity += allocated
                need.save()
                remaining_qty -= allocated

                if need.fulfilled_quantity >= need.quantity and instance.matched_ngo.user:
                    Notification.objects.create(
                        user=instance.matched_ngo.user,
                        notification_type=NotificationType.ALL,
                        title="Need Fully Met",
                        message=f"Your request for '{need.item}' has been fully met by donations!"
                    )

            # D. Update Community Challenges
            active_challenges = CommunityChallenge.objects.filter(
                category__iexact=instance.category,
                is_active=True,
                start_date__lte=timezone.now(),
                end_date__gte=timezone.now()
            )
            for challenge in active_challenges:
                challenge.current_quantity = min(
                    challenge.current_quantity + instance.quantity,
                    challenge.target_quantity
                )
                challenge.save()


def models_f_expression_fallback(model_class):
    # Helper to clean up comparison query logic
    from django.db.models import F
    return F('quantity')
