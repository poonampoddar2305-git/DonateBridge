import random
from datetime import datetime
from rest_framework import serializers
from .models import Donation, DonationPhoto, WishlistItem, CommunityChallenge
from ngo.serializers import NGODetailsSerializer

class DonationPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonationPhoto
        fields = ('id', 'photo_url', 'uploaded_at')

class DonationDetailsSerializer(serializers.ModelSerializer):
    photos = serializers.SerializerMethodField()
    donor_name = serializers.CharField(source='donor.username', read_only=True)
    donor_email = serializers.CharField(source='donor.email', read_only=True)
    matched_ngo_details = serializers.SerializerMethodField()
    is_wishlisted = serializers.SerializerMethodField()

    class Meta:
        model = Donation
        fields = (
            'id', 'donor_name', 'donor_email', 'title', 'category', 'condition', 
            'quantity', 'description', 'pickup_address', 'pickup_lat', 'pickup_lng', 
            'preferred_pickup_time', 'status', 'rejection_reason', 'matched_ngo', 
            'matched_ngo_details', 'match_score', 'submitted_at', 'reviewed_at', 
            'matched_at', 'delivered_at', 'photos', 'is_wishlisted'
        )

    def get_photos(self, obj):
        return [photo.photo_url for photo in obj.photos.all()]

    def get_matched_ngo_details(self, obj):
        if obj.matched_ngo:
            return {
                "id": obj.matched_ngo.id,
                "name": obj.matched_ngo.name,
                "address": obj.matched_ngo.address,
                "phone": obj.matched_ngo.phone,
                "lat": obj.matched_ngo.lat,
                "lng": obj.matched_ngo.lng
            }
        return None

    def get_is_wishlisted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return WishlistItem.objects.filter(user=request.user, donation=obj).exists()
        return False

class DonationCreateSerializer(serializers.ModelSerializer):
    photos = serializers.ListField(child=serializers.URLField(), required=False, write_only=True)

    class Meta:
        model = Donation
        fields = (
            'id', 'title', 'category', 'condition', 'quantity', 'description', 
            'pickup_address', 'pickup_lat', 'pickup_lng', 'preferred_pickup_time', 
            'photos', 'status', 'matched_ngo', 'delivered_at', 'rejection_reason'
        )
        read_only_fields = ('id',)

    def validate_quantity(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Donation quantity must be a positive integer greater than zero.")
        return value

    def validate_title(self, value):
        clean_val = str(value).strip() if value else ''
        if len(clean_val) < 3:
            raise serializers.ValidationError("Donation title must be at least 3 characters long.")
        return clean_val

    def validate_pickup_address(self, value):
        clean_val = str(value).strip() if value else ''
        if len(clean_val) < 5:
            raise serializers.ValidationError("Pickup address must be at least 5 characters long.")
        return clean_val

    def validate_photos(self, value):
        for item in value:
            # Validate format (e.g. extension, double extension checks)
            ext = item.split('.')[-1].split('?')[0].lower()
            if ext not in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
                raise serializers.ValidationError("Only JPG, JPEG, PNG, WEBP, and GIF images are permitted.")
            # Double extension validation
            if len(item.split('.')) > 3 and any(x in item.split('.')[:-1] for x in ['php', 'sh', 'py', 'exe', 'html']):
                raise serializers.ValidationError("Suspicious double file extension detected.")
        return value


    def create(self, validated_data):
        photos_data = validated_data.pop('photos', [])
        donor = validated_data.pop('donor', None) or self.context['request'].user
        
        # Generate custom id: DNT-YYYY-XXXXX
        year = datetime.now().year
        while True:
            rand_val = random.randint(10000, 99999)
            custom_id = f"DNT-{year}-{rand_val}"
            if not Donation.objects.filter(id=custom_id).exists():
                break
                
        donation = Donation.objects.create(
            id=custom_id,
            donor=donor,
            **validated_data
        )
        
        for photo_url in photos_data:
            DonationPhoto.objects.create(
                donation=donation,
                photo_url=photo_url
            )
            
        return donation

class CommunityChallengeSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = CommunityChallenge
        fields = '__all__'

    def get_progress_percentage(self, obj):
        if obj.target_quantity <= 0:
            return 0
        percentage = (obj.current_quantity / obj.target_quantity) * 100
        return min(round(percentage), 100)
