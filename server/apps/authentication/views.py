import random
import uuid
import os
import sys
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Profile
from .serializers import (
    CustomTokenObtainPairSerializer, 
    UserRegistrationSerializer, 
    UserDetailsSerializer,
    ProfileSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    DonorVerificationResubmitSerializer
)

import urllib.request
import json
import logging
logger = logging.getLogger(__name__)

class ReverseGeocodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')

        if lat is None or lng is None:
            return Response({'error': 'Missing lat or lng query parameters.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lat_val = float(lat)
            lng_val = float(lng)
            if not (-90 <= lat_val <= 90) or not (-180 <= lng_val <= 180):
                return Response({'error': 'Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid coordinates. Latitude and Longitude must be numbers.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Check server-side cache with rounded coordinates (~110m precision)
        cache_key = f"revgeo_{lat_val:.3f}_{lng_val:.3f}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return Response(cached_result, status=status.HTTP_200_OK)

        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat_val}&lon={lng_val}&addressdetails=1"
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'DonateBridgeApp/1.0 (contact@donatebridge.org)'}
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    addr = data.get('address', {})
                    city = addr.get('city') or addr.get('town') or addr.get('village') or addr.get('suburb') or addr.get('county') or ''
                    state = addr.get('state') or addr.get('state_district') or ''
                    pin_code = addr.get('postcode') or ''
                    country = addr.get('country') or 'India'
                    display_name = data.get('display_name') or f"{city}, {state}, {country}"

                    res_data = {
                        'lat': lat_val,
                        'lng': lng_val,
                        'address': display_name,
                        'city': city,
                        'state': state,
                        'pin_code': pin_code,
                        'country': country,
                        'raw': addr
                    }
                    # Cache result for 24 hours (86,400s) to prevent Nominatim HTTP 429 rate limit errors
                    cache.set(cache_key, res_data, 86400)
                    return Response(res_data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.warning(f"Reverse geocode lookup error: {e}")

        # Fallback response if external service fails or times out
        fallback_data = {
            'lat': lat_val,
            'lng': lng_val,
            'address': f"Coordinates: {lat_val:.4f}, {lng_val:.4f}",
            'city': 'Nagpur' if (21.0 <= lat_val <= 21.3 and 78.9 <= lng_val <= 79.2) else '',
            'state': 'Maharashtra' if (21.0 <= lat_val <= 21.3 and 78.9 <= lng_val <= 79.2) else '',
            'pin_code': '440001' if (21.0 <= lat_val <= 21.3 and 78.9 <= lng_val <= 79.2) else '',
            'country': 'India'
        }
        cache.set(cache_key, fallback_data, 3600)
        return Response(fallback_data, status=status.HTTP_200_OK)

User = get_user_model()


import secrets
# ─── OTP Helpers ───────────────────────────────────────
OTP_CACHE_PREFIX = 'otp_'
OTP_VERIFIED_PREFIX = 'otp_verified_'
OTP_COOLDOWN_PREFIX = 'otp_cooldown_'
OTP_ATTEMPTS_PREFIX = 'otp_attempts_'

OTP_TTL_SECONDS = 300       # 5 minutes
OTP_COOLDOWN_SECONDS = 60   # 60 seconds resend cooldown
MAX_OTP_ATTEMPTS = 5        # Max verification attempts

def _generate_otp():
    """Generate a cryptographically secure 6-digit OTP string."""
    return "".join(secrets.choice("0123456789") for _ in range(6))

def _check_cooldown(email):
    """Check if resend cooldown is active for an email."""
    email_clean = email.lower().strip()
    return cache.get(f"{OTP_COOLDOWN_PREFIX}{email_clean}") is not None

def _set_cooldown(email):
    """Set resend cooldown timer for an email."""
    email_clean = email.lower().strip()
    cache.set(f"{OTP_COOLDOWN_PREFIX}{email_clean}", True, OTP_COOLDOWN_SECONDS)

def _store_otp(email, otp):
    """Store OTP in Django's cache with a 5-minute TTL, resetting attempts."""
    email_clean = email.lower().strip()
    cache_key = f"{OTP_CACHE_PREFIX}{email_clean}"
    attempts_key = f"{OTP_ATTEMPTS_PREFIX}{email_clean}"
    
    cache.set(cache_key, str(otp), OTP_TTL_SECONDS)
    cache.delete(attempts_key)
    _set_cooldown(email_clean)

def _verify_otp(email, code, mark_verified=True):
    """
    Verify OTP against cache with max attempt enforcement.
    Returns (is_valid, error_or_success_message).
    """
    email_clean = email.lower().strip()
    cache_key = f"{OTP_CACHE_PREFIX}{email_clean}"
    verified_key = f"{OTP_VERIFIED_PREFIX}{email_clean}"
    attempts_key = f"{OTP_ATTEMPTS_PREFIX}{email_clean}"

    attempts = cache.get(attempts_key, 0)
    if attempts >= MAX_OTP_ATTEMPTS:
        cache.delete(cache_key)
        return False, "Maximum verification attempts exceeded. Please request a new OTP."

    stored_otp = cache.get(cache_key)
    is_already_verified = cache.get(verified_key)

    if stored_otp and str(stored_otp) == str(code).strip():
        if mark_verified:
            cache.set(verified_key, True, OTP_TTL_SECONDS)
        cache.delete(cache_key)
        cache.delete(attempts_key)
        return True, "OTP verified successfully."

    if is_already_verified:
        return True, "OTP verified successfully."

    if not stored_otp:
        return False, "OTP has expired. Please request a new OTP."

    # Track failed attempt for invalid code
    cache.set(attempts_key, attempts + 1, OTP_TTL_SECONDS)
    return False, "Invalid verification code."

from django.core.mail import send_mail
import logging
logger = logging.getLogger(__name__)

def _send_otp_to_email(email, otp):
    """Send OTP via real email backend without exposing code or credentials in logs."""
    subject = "DonateBridge - Your Email Verification OTP"
    message = (
        f"Hello,\n\n"
        f"Thank you for registering with DonateBridge.\n\n"
        f"Your email verification OTP is:\n\n"
        f"{otp}\n\n"
        f"This OTP is valid for 5 minutes.\n\n"
        f"Please do not share this OTP with anyone.\n\n"
        f"If you did not request this OTP, you can safely ignore this email.\n\n"
        f"Regards,\n"
        f"DonateBridge Team"
    )
    html_message = f"""
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">DonateBridge</h2>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
        <h3 style="color: #1e293b; margin-bottom: 10px;">Email Verification</h3>
        <p style="color: #475569; font-size: 14px;">Hello,</p>
        <p style="color: #475569; font-size: 14px;">Thank you for registering with DonateBridge.</p>
        <p style="color: #475569; font-size: 14px;">Your email verification OTP is:</p>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 18px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="color: #10b981; letter-spacing: 6px; font-size: 32px; font-weight: bold; font-family: monospace;">{otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This OTP is valid for 5 minutes.</p>
        <p style="color: #64748b; font-size: 13px;">Please do not share this OTP with anyone.</p>
        <p style="color: #64748b; font-size: 13px;">If you did not request this OTP, you can safely ignore this email.</p>
        <br />
        <p style="color: #334155; font-size: 13px; margin-bottom: 0;">Regards,<br /><strong>DonateBridge Team</strong></p>
    </div>
    """

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
            html_message=html_message
        )
        return True
    except Exception as e:
        logger.error(f"[EMAIL ERROR] Failed to send OTP email: {type(e).__name__} - {str(e)}")
        return False


# ─── Auth Views ────────────────────────────────────────

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = (permissions.AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Auto generate access/refresh tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        # Custom claims mapping
        refresh['email'] = user.email
        refresh['role'] = user.role
        refresh['username'] = user.username
        refresh['avatar'] = user.avatar
        
        return Response({
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "role": user.role,
                "avatar": user.avatar
            },
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

class UserMeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDetailsSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        
        if 'avatar' in request.data:
            user.avatar = request.data['avatar']
        if 'name' in request.data and request.data['name']:
            user.username = request.data['name']
        elif 'username' in request.data and request.data['username']:
            user.username = request.data['username']
        user.save()
        
        profile, _ = Profile.objects.get_or_create(user=user)
        
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'location' in data and 'address' not in data:
            data['address'] = data['location']
            
        profile_serializer = ProfileSerializer(profile, data=data, partial=True)
        profile_serializer.is_valid(raise_exception=True)
        profile_serializer.save()
        
        return Response(self.get_serializer(user).data)


# ─── OTP Send / Verify / Resend ───────────────────────

class ResendOTPView(APIView):
    """Generate and send an OTP for email verification during registration or forgot-password."""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        email_clean = email.lower().strip()
        is_signup = request.data.get('is_signup') or request.data.get('purpose') == 'register'
        
        if is_signup and User.objects.filter(email__iexact=email_clean).exists():
            return Response({"email": ["This email address is already registered."]}, status=status.HTTP_400_BAD_REQUEST)

        if _check_cooldown(email_clean):
            return Response({"error": "Please wait 60 seconds before requesting a new OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        otp = _generate_otp()
        sent = _send_otp_to_email(email_clean, otp)

        if not sent:
            return Response({"error": "Unable to send the verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        _store_otp(email_clean, otp)

        return Response({
            "success": True,
            "message": "OTP has been sent to your email address."
        }, status=status.HTTP_200_OK)

class VerifyOTPView(APIView):
    """Verify the OTP code submitted by the user."""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        
        if not email or not code:
            return Response({"error": "Email and code are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        is_valid, msg = _verify_otp(email, code)
        if not is_valid:
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"success": True, "message": "OTP verified successfully."}, status=status.HTTP_200_OK)


# ─── Forgot / Reset Password ──────────────────────────

class ForgotPasswordView(APIView):
    """Generate and send an OTP for password reset."""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        email_clean = email.lower().strip()

        if _check_cooldown(email_clean):
            return Response({"error": "Please wait 60 seconds before requesting a new OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Generate OTP and store it in cache
        otp = _generate_otp()
        sent = _send_otp_to_email(email_clean, otp)

        if not sent:
            return Response({"error": "Unable to send the verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        _store_otp(email_clean, otp)

        return Response({
            "success": True,
            "message": "OTP has been sent to your email address."
        }, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    """Verify OTP and reset the user's password."""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        new_password = serializer.validated_data['new_password']

        # Validate OTP before allowing password change
        is_valid, msg = _verify_otp(email, code)
        if not is_valid:
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User matching email not found"}, status=status.HTTP_404_NOT_FOUND)

        # Set new password
        user.set_password(new_password)
        user.save()

        # Clean up cache keys
        cache.delete(f"{OTP_CACHE_PREFIX}{email.lower().strip()}")
        cache.delete(f"{OTP_VERIFIED_PREFIX}{email.lower().strip()}")

        return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)


# ─── File Upload ───────────────────────────────────────

class SecureFileUploadView(APIView):
    permission_classes = (permissions.AllowAny,)
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Size check: max 5MB
        if file_obj.size > 5 * 1024 * 1024:
            return Response({"error": "File size exceeds 5MB limit"}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Extension check
        ext = file_obj.name.split('.')[-1].lower()
        allowed_extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx']
        if ext not in allowed_extensions:
            return Response({"error": f"File extension .{ext} is not allowed. Only JPG, JPEG, PNG, WEBP, GIF, PDF, DOC, and DOCX are allowed."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Double extension validation
        if len(file_obj.name.split('.')) > 2:
            return Response({"error": "Suspicious double file extension detected."}, status=status.HTTP_400_BAD_REQUEST)

        # 4. MIME content-type inspection
        disallowed_mime_substrings = ['javascript', 'html', 'svg', 'php', 'x-sh', 'msdos', 'x-executable']
        content_type = getattr(file_obj, 'content_type', '').lower()
        if any(bad in content_type for bad in disallowed_mime_substrings):
            return Response({"error": "Executable or unsafe MIME content type detected."}, status=status.HTTP_400_BAD_REQUEST)

        # 5. Magic byte / script payload signature check
        initial_chunk = file_obj.read(512)
        file_obj.seek(0)
        lowered_chunk = initial_chunk.lower()
        if b"<script" in lowered_chunk or b"<?php" in lowered_chunk or b"<html" in lowered_chunk:
            return Response({"error": "File content contains prohibited script or executable payloads."}, status=status.HTTP_400_BAD_REQUEST)

        # Create media upload path
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
        os.makedirs(upload_dir, exist_ok=True)

        # 6. Generate safe unique filename
        safe_filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(upload_dir, safe_filename)

        # Write file chunk by chunk
        with open(file_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)

        # 5. Build absolute URL
        file_url = request.build_absolute_uri(settings.MEDIA_URL + 'uploads/' + safe_filename)

        return Response({
            "message": "File uploaded successfully",
            "url": file_url
        }, status=status.HTTP_201_CREATED)


class DonorResubmitVerificationView(APIView):
    """Allows an authenticated donor to resubmit updated Aadhaar/PAN details and documents when changes are requested or rejected."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if request.user.role != 'donor':
            return Response({"error": "Only donors can submit donor verification details."}, status=status.HTTP_403_FORBIDDEN)

        serializer = DonorVerificationResubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        profile, _ = Profile.objects.get_or_create(user=request.user)

        if 'aadhaar_number' in data and data['aadhaar_number']:
            profile.aadhaar_number = data['aadhaar_number']
        if 'pan_number' in data and data['pan_number']:
            profile.pan_number = data['pan_number']
        if 'aadhaar_doc' in data and data['aadhaar_doc']:
            profile.aadhaar_doc = data['aadhaar_doc']
        if 'pan_doc' in data and data['pan_doc']:
            profile.pan_doc = data['pan_doc']

        profile.verification_status = 'pending'
        profile.rejection_reason = None
        profile.save()

        # Send security notification to donor
        try:
            from notification.models import Notification, NotificationType
            Notification.objects.create(
                user=request.user,
                notification_type=NotificationType.SECURITY,
                title="Identity Verification Resubmitted",
                message="Your updated Aadhaar and PAN documents have been resubmitted and are pending administrator audit."
            )
        except Exception as e:
            logger.warning(f"Failed to create notification: {e}")

        try:
            from moderation.models import AuditLog
            AuditLog.objects.create(
                user=request.user,
                action_type="DONOR_VERIFICATION_RESUBMIT",
                description=f"Donor '{request.user.email}' resubmitted identity verification documents for review."
            )
        except Exception as e:
            logger.warning(f"Failed to create audit log: {e}")

        return Response({
            "message": "Verification documents resubmitted successfully. Your profile is now pending admin audit.",
            "profile": ProfileSerializer(profile).data
        }, status=status.HTTP_200_OK)


# ─── User Feedback Email Endpoint ──────────────────────

from django.utils import timezone

class FeedbackView(APIView):
    """Submit user feedback and dispatch email to FEEDBACK_RECEIVER_EMAIL."""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip()
        role = request.data.get('role', 'User').strip()
        message = request.data.get('message') or request.data.get('feedback', '')
        message = message.strip() if message else ''

        if not name or not email or not message:
            return Response({"error": "Name, email, and feedback message are required."}, status=status.HTTP_400_BAD_REQUEST)

        if len(message) > 5000:
            return Response({"error": "Feedback message exceeds maximum allowed length of 5000 characters."}, status=status.HTTP_400_BAD_REQUEST)

        receiver_email = getattr(settings, 'FEEDBACK_RECEIVER_EMAIL', 'testgmail498@gmail.com')
        submitted_at = timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')

        subject = "DonateBridge User Feedback"
        body = (
            f"DonateBridge User Feedback\n"
            f"----------------------------------------\n"
            f"User Name:    {name}\n"
            f"User Email:   {email}\n"
            f"Role:         {role}\n"
            f"Submitted At: {submitted_at}\n"
            f"----------------------------------------\n\n"
            f"Feedback:\n{message}\n"
        )

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[receiver_email],
                fail_silently=False
            )
            return Response({
                "success": True,
                "message": "Feedback submitted successfully."
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"[FEEDBACK ERROR] Failed to send feedback email: {type(e).__name__} - {str(e)}")
            return Response({
                "error": "Unable to send feedback email. Please check server configuration and try again."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


