from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification
from .serializers import NotificationSerializer

@receiver(post_save, sender=Notification)
def send_realtime_notification(sender, instance, created, **kwargs):
    if created and instance.user_id:
        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"user_{instance.user_id}",
                    {
                        "type": "notification_message",
                        "notification": NotificationSerializer(instance).data
                    }
                )
            except Exception as e:
                # Silently catch channel layer exceptions (e.g. during test runs without redis)
                pass
