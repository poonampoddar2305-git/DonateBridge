# pyrefly: ignore [missing-import]
from django.db import models
# pyrefly: ignore [missing-import]
from django.conf import settings

class NotificationType(models.TextChoices):
    ALL = 'all', 'All'
    DELIVERY = 'delivery', 'Delivery Status'
    SECURITY = 'security', 'Security Alert'
    MATCH = 'match', 'Donation Match'
    CHAT = 'chat', 'Chat Message'

class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.ALL)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.title} ({self.notification_type})"
