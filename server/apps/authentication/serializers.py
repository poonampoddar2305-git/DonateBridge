from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Profile

User = get_user_model()

from django.db import models

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Allow either email or username in the login payload
        self.fields[self.username_field].required = False
        self.fields['username'] = serializers.CharField(required=False)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Custom claims
        token['email'] = user.email
        token['role'] = user.role
        token['username'] = user.username
        token['avatar'] = user.avatar
        return token

    def validate(self, attrs):
        username_or_email = attrs.get('email') or attrs.get('username')
        if not username_or_email:
            raise serializers.ValidationError({"email": "Email or Username is required."})

        matched_user = User.objects.filter(
            models.Q(email__iexact=username_or_email) | models.Q(username__iexact=username_or_email)
        ).first()
        if not matched_user:
            raise serializers.ValidationError({"detail": "Account not found. Please register first."})
        attrs[self.username_field] = matched_user.email

        try:
            data = super().validate(attrs)
        except Exception:
            raise serializers.ValidationError({"detail": "Invalid email or password."})

        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'username': self.user.username,
            'role': self.user.role,
            'avatar': self.user.avatar,
        }
        return data


import re

def validate_coordinates(lat, lng):
    if lat is not None and lat != '':
        try:
            lat_val = float(lat)
            if not (-90 <= lat_val <= 90):
                raise serializers.ValidationError("Invalid coordinates. Latitude must be between -90 and 90.")
        except (ValueError, TypeError):
            raise serializers.ValidationError("Invalid coordinates. Latitude must be a numeric value.")
    if lng is not None and lng != '':
        try:
            lng_val = float(lng)
            if not (-180 <= lng_val <= 180):
                raise serializers.ValidationError("Invalid coordinates. Longitude must be between -180 and 180.")
        except (ValueError, TypeError):
            raise serializers.ValidationError("Invalid coordinates. Longitude must be a numeric value.")


class UserRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        validators=[],
        error_messages={'invalid': 'Please enter a valid email address.'}
    )
    password = serializers.CharField(write_only=True, required=True, min_length=8, style={'input_type': 'password'})
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    city = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    state = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    pin_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    country = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='India')

    # Donor Identity Verification
    aadhaar_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    pan_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    aadhaar_doc = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    pan_doc = serializers.URLField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'password', 'role', 'avatar',
            'lat', 'lng', 'address', 'city', 'state', 'pin_code', 'country',
            'aadhaar_number', 'pan_number', 'aadhaar_doc', 'pan_doc'
        )

    def validate_username(self, value):
        val = value.strip()
        if len(val) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if not re.match(r'^[a-zA-Z0-9_.-]+$', val):
            raise serializers.ValidationError("Username can only contain letters, numbers, dots, hyphens, and underscores.")
        return val

    def validate_email(self, value):
        val = value.strip().lower()
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("This email address is already registered.")
        return val

    def validate(self, attrs):
        lat = attrs.get('lat')
        lng = attrs.get('lng')
        validate_coordinates(lat, lng)

        aadhaar = attrs.get('aadhaar_number')
        if aadhaar:
            clean_aadhaar = re.sub(r'[\s-]+', '', str(aadhaar))
            if not re.match(r'^\d{12}$', clean_aadhaar):
                raise serializers.ValidationError({"aadhaar_number": "Aadhaar number must be a valid 12-digit number (format: 1234-5678-9012)."})
            attrs['aadhaar_number'] = clean_aadhaar

        pan = attrs.get('pan_number')
        if pan:
            clean_pan = str(pan).strip().upper()
            if not re.match(r'^[A-Z0-9]{10}$', clean_pan):
                raise serializers.ValidationError({"pan_number": "PAN number must be a valid 10-character alphanumeric code (e.g. ABCDE1234F)."})
            attrs['pan_number'] = clean_pan

        return attrs

    def create(self, validated_data):
        lat = validated_data.pop('lat', None)
        lng = validated_data.pop('lng', None)
        address = validated_data.pop('address', None)
        city = validated_data.pop('city', None)
        state = validated_data.pop('state', None)
        pin_code = validated_data.pop('pin_code', None)
        country = validated_data.pop('country', 'India')

        aadhaar_number = validated_data.pop('aadhaar_number', None)
        pan_number = validated_data.pop('pan_number', None)
        aadhaar_doc = validated_data.pop('aadhaar_doc', None)
        pan_doc = validated_data.pop('pan_doc', None)

        role = validated_data.get('role', 'donor')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=role,
            avatar=validated_data.get('avatar', '👩‍💼')
        )
        profile, _ = Profile.objects.get_or_create(user=user)
        if lat is not None: profile.lat = float(lat)
        if lng is not None: profile.lng = float(lng)
        if address: profile.address = address
        if city: profile.city = city
        if state: profile.state = state
        if pin_code: profile.pin_code = pin_code
        if country: profile.country = country

        if role == 'donor':
            if aadhaar_number: profile.aadhaar_number = aadhaar_number
            if pan_number: profile.pan_number = pan_number
            if aadhaar_doc: profile.aadhaar_doc = aadhaar_doc
            if pan_doc: profile.pan_doc = pan_doc
            profile.verification_status = 'pending'

        profile.save()
        return user

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = (
            'phone', 'address', 'city', 'state', 'pin_code', 'country',
            'lat', 'lng', 'mfa_enabled',
            'aadhaar_number', 'pan_number', 'aadhaar_doc', 'pan_doc',
            'verification_status', 'rejection_reason', 'verified_at',
            'created_at', 'updated_at'
        )

    def validate_phone(self, value):
        if value:
            clean_val = value.strip()
            if not re.match(r'^[6-9]\d{9}$', clean_val):
                raise serializers.ValidationError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).")
            return clean_val
        return value

    def validate(self, attrs):
        lat = attrs.get('lat')
        lng = attrs.get('lng')
        validate_coordinates(lat, lng)
        return attrs


class DonorVerificationResubmitSerializer(serializers.Serializer):
    aadhaar_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    pan_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    aadhaar_doc = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    pan_doc = serializers.URLField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        aadhaar = attrs.get('aadhaar_number')
        if aadhaar:
            clean_aadhaar = re.sub(r'[\s-]+', '', str(aadhaar))
            if not re.match(r'^\d{12}$', clean_aadhaar):
                raise serializers.ValidationError({"aadhaar_number": "Aadhaar number must be a valid 12-digit number (format: 1234-5678-9012)."})
            attrs['aadhaar_number'] = clean_aadhaar

        pan = attrs.get('pan_number')
        if pan:
            clean_pan = str(pan).strip().upper()
            if not re.match(r'^[A-Z0-9]{10}$', clean_pan):
                raise serializers.ValidationError({"pan_number": "PAN number must be a valid 10-character alphanumeric code (e.g. ABCDE1234F)."})
            attrs['pan_number'] = clean_pan

        return attrs





class UserDetailsSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'avatar', 'profile')
        read_only_fields = ('id', 'email', 'role')

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user registered with this email address.")
        return value

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)
