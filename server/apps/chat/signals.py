from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ChatMessage, ChatMember
from notification.models import Notification, NotificationType

@receiver(post_save, sender=ChatMessage)
def notify_channel_members_on_message(sender, instance, created, **kwargs):
    """
    When a ChatMessage is sent, automatically notify other channel members via the Notification service.
    This pushes a real-time notification over WebSocket to recipients across all pages.
    """
    if not created or not instance.channel_id:
        return

    other_members = ChatMember.objects.filter(
        channel=instance.channel
    ).exclude(user=instance.sender).select_related('user')

    sender_name = instance.sender.username or (instance.sender.email.split('@')[0] if instance.sender.email else 'User')
    if hasattr(instance.sender, 'ngo_profile') and instance.sender.ngo_profile and instance.sender.ngo_profile.name:
        sender_name = instance.sender.ngo_profile.name

    msg_body = instance.text.strip() if instance.text else ''
    preview_text = msg_body[:100] if msg_body else f"Sent an attachment ({instance.message_type})"
    if len(msg_body) > 100:
        preview_text += '...'

    for member in other_members:
        try:
            Notification.objects.create(
                user=member.user,
                notification_type=NotificationType.CHAT,
                title=f"Message from {sender_name}",
                message=preview_text
            )
        except Exception:
            pass
