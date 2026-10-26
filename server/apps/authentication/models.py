# pyrefly: ignore [missing-import]
from django.db import models
# pyrefly: ignore [missing-import]
from django.contrib.auth.models import AbstractUser, BaseUserManager

class UserRole(models.TextChoices):
    DONOR = 'donor', 'Donor'
    NGO = 'ngo', 'NGO'
    ADMIN = 'admin', 'Admin'

class CustomUserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, username, password, **extra_fields)

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=UserRole.choices, default=UserRole.DONOR)
    avatar = models.CharField(max_length=500, default="👩‍💼")

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} ({self.role})"

from django.core.validators import RegexValidator

phone_validator = RegexValidator(
    regex=r'^[6-9]\d{9}$',
    message='Please enter a valid 10-digit Indian mobile number.'
)

aadhaar_validator = RegexValidator(
    regex=r'^(\d{12}|\d{4}-\d{4}-\d{4})$',
    message='Please enter a valid 12-digit Indian Aadhaar number.'
)

pan_validator = RegexValidator(
    regex=r'^[A-Z0-9]{10}$',
    message='Please enter a valid 10-character Indian PAN number (e.g., ABCDE1234F).'
)


class DonorVerificationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Audit'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    CHANGES_REQUESTED = 'changes_requested', 'Changes Requested'


class Profile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=15, validators=[phone_validator], blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    pin_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, default='India', blank=True, null=True)
    lat = models.FloatField(blank=True, null=True)
    lng = models.FloatField(blank=True, null=True)
    mfa_enabled = models.BooleanField(default=False)

    # Donor Identity Verification (Aadhaar & PAN)
    aadhaar_number = models.CharField(max_length=20, validators=[aadhaar_validator], blank=True, null=True)
    pan_number = models.CharField(max_length=20, validators=[pan_validator], blank=True, null=True)
    aadhaar_doc = models.URLField(max_length=500, blank=True, null=True)
    pan_doc = models.URLField(max_length=500, blank=True, null=True)
    verification_status = models.CharField(
        max_length=20,
        choices=DonorVerificationStatus.choices,
        default=DonorVerificationStatus.APPROVED,
        db_index=True
    )
    rejection_reason = models.TextField(blank=True, null=True)
    verified_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.email} ({self.verification_status})"

