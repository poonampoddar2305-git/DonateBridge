from django.db import models
from django.conf import settings

class VerificationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Audit'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    CHANGES_REQUESTED = 'changes_requested', 'Changes Requested'

from django.core.validators import RegexValidator

ngo_phone_validator = RegexValidator(
    regex=r'^[6-9]\d{9}$',
    message='Please enter a valid 10-digit Indian mobile number.'
)


ngo_pincode_validator = RegexValidator(
    regex=r'^[1-9]\d{5}$',
    message='Enter a valid 6-digit Indian pincode.'
)

class NGO(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ngo_details')
    name = models.CharField(max_length=255)
    lat = models.FloatField()
    lng = models.FloatField()
    address = models.TextField()
    registration_number = models.CharField(max_length=100)
    gov_registration_number = models.CharField(max_length=100)
    ngo_type = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, validators=[ngo_phone_validator])
    website = models.URLField(blank=True, null=True)
    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    pin_code = models.CharField(max_length=20, validators=[ngo_pincode_validator])

    description = models.TextField()
    mission = models.TextField()
    working_areas = models.CharField(max_length=500) # Comma-separated list
    operating_since = models.CharField(max_length=4)
    volunteers_count = models.PositiveIntegerField(default=0)
    
    verification_status = models.CharField(
        max_length=20, 
        choices=VerificationStatus.choices, 
        default=VerificationStatus.PENDING,
        db_index=True
    )
    rejection_reason = models.TextField(blank=True, null=True)
    trust_score = models.IntegerField(default=70) # out of 100
    response_time = models.CharField(max_length=20, default="--")
    success_rate = models.CharField(max_length=10, default="--")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.verification_status})"

class NGODocumentType(models.TextChoices):
    GOV_REG_CERT = 'govRegCert', 'Gov Registration Certificate'
    PAN_CARD = 'panCard', 'PAN Card Copy'
    TRUST_REG_CERT = 'trustRegCert', 'Trust Registration Certificate'
    DOC_80G = 'doc80G', '80G Exemption Certificate'
    DOC_12A = 'doc12A', '12A Registration Certificate'
    LOGO = 'logo', 'NGO Logo Brand'
    OFFICE_PHOTO = 'officePhoto', 'Registered Office Photo'
    AUTH_PERSON_PHOTO = 'authPersonPhoto', 'Authorized Person Photo'
    ADDRESS_PROOF = 'addressProof', 'Office Address Proof'
    ID_PROOF = 'idProof', 'Authorized Person ID Proof'
    VERIFICATION_LETTER = 'verificationLetter', 'Verification Request Letter'
    LOGO_IMG = 'logoImg', 'NGO Brand Logo'

class NGODocument(models.Model):
    ngo = models.ForeignKey(NGO, on_delete=models.CASCADE, related_name='documents')
    doc_type = models.CharField(max_length=30, choices=NGODocumentType.choices)
    file_url = models.URLField(max_length=500)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ngo.name} - {self.doc_type}"

class NGOReview(models.Model):
    ngo = models.ForeignKey(NGO, on_delete=models.CASCADE, related_name='reviews')
    author_name = models.CharField(max_length=255)
    rating = models.PositiveIntegerField(default=5)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for {self.ngo.name} by {self.author_name} ({self.rating} stars)"

class EmergencyCampaign(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class NeedStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    ACTIVE = 'ACTIVE', 'Active'
    ACCEPTED = 'ACCEPTED', 'Accepted'
    FULFILLED = 'FULFILLED', 'Fulfilled'
    REJECTED = 'REJECTED', 'Rejected'
    CANCELLED = 'CANCELLED', 'Cancelled'
    EXPIRED = 'EXPIRED', 'Expired'

class Need(models.Model):
    ngo = models.ForeignKey(NGO, on_delete=models.CASCADE, related_name='needs')
    category = models.CharField(max_length=100, db_index=True)
    item = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    fulfilled_quantity = models.PositiveIntegerField(default=0)
    urgency = models.CharField(max_length=20, choices=[('High', 'High'), ('Medium', 'Medium'), ('Low', 'Low')])
    description = models.TextField(blank=True, null=True)
    campaign = models.ForeignKey(EmergencyCampaign, on_delete=models.SET_NULL, null=True, blank=True, related_name='needs')
    status = models.CharField(max_length=20, choices=NeedStatus.choices, default=NeedStatus.ACTIVE, db_index=True)
    lat = models.FloatField()
    lng = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item} ({self.fulfilled_quantity}/{self.quantity}) - {self.status} needed by {self.ngo.name}"

class VolunteerEvent(models.Model):
    ngo = models.ForeignKey(NGO, on_delete=models.CASCADE, related_name='events')
    title = models.CharField(max_length=255)
    description = models.TextField()
    date = models.DateTimeField()
    location = models.CharField(max_length=255)
    max_volunteers = models.PositiveIntegerField(default=0) # 0 means unlimited
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.ngo.name}"

class VolunteerRegistration(models.Model):
    event = models.ForeignKey(VolunteerEvent, on_delete=models.CASCADE, related_name='registrations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    registered_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='approved') # approved, cancelled

    class Meta:
        unique_together = ('event', 'user')

    def __str__(self):
        return f"{self.user.email} registered for {self.event.title}"
