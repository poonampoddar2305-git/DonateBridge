from django.urls import path
from .views import DonationAssistantView, AIHealthView

urlpatterns = [
    path('ai/health/', AIHealthView.as_view(), name='ai-health'),
    path('ai/donation-assistant/', DonationAssistantView.as_view(), name='ai-donation-assistant'),
]

