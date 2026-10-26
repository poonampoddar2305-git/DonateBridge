from rest_framework import serializers
from .models import NGO, NGODocument, NGOReview, Need, EmergencyCampaign, VolunteerEvent, VolunteerRegistration

class NGODocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = NGODocument
        fields = ('id', 'doc_type', 'file_url', 'uploaded_at')

class NGOReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = NGOReview
        fields = ('id', 'author_name', 'rating', 'comment', 'created_at')

class EmergencyCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyCampaign
        fields = '__all__'

import re
from datetime import datetime

class NeedSerializer(serializers.ModelSerializer):
    ngo_name = serializers.CharField(source='ngo.name', read_only=True)
    ngo_id = serializers.IntegerField(source='ngo.id', read_only=True)
    campaign_title = serializers.CharField(source='campaign.title', read_only=True)

    class Meta:
        model = Need
        fields = (
            'id', 'ngo_id', 'ngo_name', 'category', 'item', 'quantity', 
            'fulfilled_quantity', 'urgency', 'description', 'status', 'campaign', 
            'campaign_title', 'lat', 'lng', 'created_at'
        )

    def validate_quantity(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Quantity must be a positive integer greater than zero.")
        return value

class NGORegistrationSerializer(serializers.ModelSerializer):
    documents = serializers.JSONField(required=False, write_only=True)

    class Meta:
        model = NGO
        fields = (
            'name', 'lat', 'lng', 'address', 'registration_number', 
            'gov_registration_number', 'ngo_type', 'phone', 'website', 
            'state', 'district', 'city', 'pin_code', 'description', 
            'mission', 'working_areas', 'operating_since', 'volunteers_count',
            'documents'
        )

    def validate_phone(self, value):
        clean_val = str(value).strip() if value else ''
        if not re.match(r'^[6-9]\d{9}$', clean_val):
            raise serializers.ValidationError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).")
        return clean_val


    def validate_pin_code(self, value):
        clean_val = str(value).strip() if value else ''
        if not re.match(r'^[1-9]\d{5}$', clean_val):
            raise serializers.ValidationError("Enter a valid 6-digit Indian pincode (e.g. 440001).")
        return clean_val

    def validate_operating_since(self, value):
        clean_val = str(value).strip() if value else ''
        if not re.match(r'^\d{4}$', clean_val):
            raise serializers.ValidationError("Operating year must be a 4-digit year (e.g. 2018).")
        year = int(clean_val)
        current_year = datetime.now().year
        if year < 1850 or year > current_year:
            raise serializers.ValidationError(f"Operating year must be between 1850 and {current_year}.")
        return clean_val

    def validate(self, attrs):

        lat = attrs.get('lat')
        lng = attrs.get('lng')
        if lat is not None:
            try:
                lat_val = float(lat)
                if not (-90 <= lat_val <= 90):
                    raise serializers.ValidationError({"lat": "Invalid coordinates. Latitude must be between -90 and 90."})
            except (ValueError, TypeError):
                raise serializers.ValidationError({"lat": "Invalid coordinates. Latitude must be a numeric value."})
        if lng is not None:
            try:
                lng_val = float(lng)
                if not (-180 <= lng_val <= 180):
                    raise serializers.ValidationError({"lng": "Invalid coordinates. Longitude must be between -180 and 180."})
            except (ValueError, TypeError):
                raise serializers.ValidationError({"lng": "Invalid coordinates. Longitude must be a numeric value."})
        return attrs



    def create(self, validated_data):
        documents_data = validated_data.pop('documents', {})
        ngo = NGO.objects.create(
            user=self.context['request'].user,
            **validated_data
        )
        
        # Save documents if provided (handles both string URLs and list of page URLs)
        for doc_key, doc_val in documents_data.items():
            if isinstance(doc_val, list):
                for page_url in doc_val:
                    if page_url:
                        NGODocument.objects.create(
                            ngo=ngo,
                            doc_type=doc_key,
                            file_url=page_url
                        )
            elif doc_val:
                NGODocument.objects.create(
                    ngo=ngo,
                    doc_type=doc_key,
                    file_url=doc_val
                )
            
        return ngo

    def update(self, instance, validated_data):
        documents_data = validated_data.pop('documents', {})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.verification_status = 'pending'
        instance.rejection_reason = None
        instance.save()

        if documents_data:
            instance.documents.all().delete()
            for doc_key, doc_val in documents_data.items():
                if isinstance(doc_val, list):
                    for page_url in doc_val:
                        if page_url:
                            NGODocument.objects.create(
                                ngo=instance,
                                doc_type=doc_key,
                                file_url=page_url
                            )
                elif doc_val:
                    NGODocument.objects.create(
                        ngo=instance,
                        doc_type=doc_key,
                        file_url=doc_val
                    )
        return instance

class NGODetailsSerializer(serializers.ModelSerializer):
    documents = serializers.SerializerMethodField()
    reviews = NGOReviewSerializer(many=True, read_only=True)
    needs = NeedSerializer(many=True, read_only=True)

    class Meta:
        model = NGO
        fields = (
            'id', 'name', 'lat', 'lng', 'address', 'registration_number', 
            'gov_registration_number', 'ngo_type', 'phone', 'website', 
            'state', 'district', 'city', 'pin_code', 'description', 
            'mission', 'working_areas', 'operating_since', 'volunteers_count',
            'verification_status', 'rejection_reason', 'trust_score', 
            'response_time', 'success_rate', 'created_at', 'updated_at', 
            'documents', 'reviews', 'needs'
        )

    def get_documents(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            is_owner = (obj.user == request.user)
            is_admin = (request.user.is_staff or getattr(request.user, 'role', '') == 'admin')
            if is_owner or is_admin:
                docs = obj.documents.all()
                result = {}
                for doc in docs:
                    if doc.doc_type not in result:
                        result[doc.doc_type] = []
                    result[doc.doc_type].append(doc.file_url)
                return result
        return {}

class VolunteerEventSerializer(serializers.ModelSerializer):
    ngo_name = serializers.CharField(source='ngo.name', read_only=True)
    registered_count = serializers.SerializerMethodField()

    class Meta:
        model = VolunteerEvent
        fields = '__all__'
        read_only_fields = ('ngo',)

    def get_registered_count(self, obj):
        return obj.registrations.count()

class VolunteerRegistrationSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)
    ngo_name = serializers.CharField(source='event.ngo.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = VolunteerRegistration
        fields = '__all__'
        read_only_fields = ('user',)
