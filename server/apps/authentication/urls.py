from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    UserRegistrationView,
    UserMeView,
    ForgotPasswordView,
    ResetPasswordView,
    SecureFileUploadView,
    ResendOTPView,
    VerifyOTPView,
    FeedbackView,
    ReverseGeocodeView,
    DonorResubmitVerificationView
)

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('auth/register/', UserRegistrationView.as_view(), name='auth_register'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth_reset_password'),
    path('auth/resend-otp/', ResendOTPView.as_view(), name='auth_resend_otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='auth_verify_otp'),
    path('auth/feedback/', FeedbackView.as_view(), name='auth_feedback'),
    path('feedback/', FeedbackView.as_view(), name='feedback'),
    path('upload/', SecureFileUploadView.as_view(), name='file_upload'),
    path('users/me/', UserMeView.as_view(), name='user_me'),
    path('users/resubmit-verification/', DonorResubmitVerificationView.as_view(), name='donor_resubmit_verification'),
    path('location/reverse-geocode/', ReverseGeocodeView.as_view(), name='reverse_geocode'),
]

