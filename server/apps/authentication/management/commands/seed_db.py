import datetime
import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from authentication.models import Profile
from ngo.models import NGO, Need, VerificationStatus, EmergencyCampaign, VolunteerEvent, VolunteerRegistration
from donation.models import Donation, DonationStatus, DonationPhoto, CommunityChallenge
from logistics.models import LogisticsJob, TrackingMilestone
from moderation.models import FraudLog, AuditLog
from notification.models import Notification, NotificationType
from chat.models import ChatChannel, ChatMember, ChatMessage

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with test data matching the DonateBridge frontend context'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database...')

        # 1. Clear existing data
        self.stdout.write('Clearing old data...')
        User.objects.all().delete()
        NGO.objects.all().delete()
        Need.objects.all().delete()
        Donation.objects.all().delete()
        LogisticsJob.objects.all().delete()
        FraudLog.objects.all().delete()
        Notification.objects.all().delete()
        ChatChannel.objects.all().delete()
        EmergencyCampaign.objects.all().delete()
        VolunteerEvent.objects.all().delete()
        VolunteerRegistration.objects.all().delete()
        CommunityChallenge.objects.all().delete()
        AuditLog.objects.all().delete()

        # 2. Create Admin User
        self.stdout.write('Creating admin user...')
        admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@donatebridge.org',
            password='admin123',
            role='admin',
            avatar='👨‍💼'
        )
        p_admin, _ = Profile.objects.get_or_create(user=admin_user)
        p_admin.phone = '1112223334'
        p_admin.address = 'Central Admin Office'
        p_admin.save()

        # 3. Create NGO Users & Profiles
        self.stdout.write('Creating NGO users in different Indian cities...')
        
        # Mumbai NGO
        ngo1_user = User.objects.create_user(
            username='hopefoundation', email='contact@hopefoundation.org',
            password='ngo12345', role='ngo', avatar='🏫'
        )
        ngo1 = NGO.objects.create(
            user=ngo1_user, name='Hope Foundation',
            lat=21.1500, lng=79.0900,
            address='123 NGO Hub, Sadar, Nagpur, MH, 440001',
            registration_number='NGO-123456', gov_registration_number='GOV-998811',
            ngo_type='Trust', phone='9988776655', website='https://hopefoundation.org',
            state='Maharashtra', district='Nagpur', city='Nagpur', pin_code='440001',
            description='Dedicated to educational support and nourishment for underprivileged children.',
            mission='Ensure quality education and food reaches every child in the district.',
            working_areas='Education, Food, Health', operating_since='2015', volunteers_count=45,
            verification_status=VerificationStatus.APPROVED, trust_score=95, response_time='2 hrs', success_rate='98%'
        )

        # Pune NGO
        ngo2_user = User.objects.create_user(
            username='greenearth', email='info@greenearth.org',
            password='ngo12345', role='ngo', avatar='🌳'
        )
        ngo2 = NGO.objects.create(
            user=ngo2_user, name='Green Earth Foundation',
            lat=21.1400, lng=79.0800,
            address='45 Eco Park, Sitabuldi, Nagpur, MH, 440012',
            registration_number='NGO-234567', gov_registration_number='GOV-887766',
            ngo_type='Society', phone='8877665544', website='https://greenearth.org',
            state='Maharashtra', district='Nagpur', city='Nagpur', pin_code='440012',
            description='Focused on environment, clothing recycling, and waste reduction programs.',
            mission='Promote zero waste and repurpose household item donations.',
            working_areas='Environment, Clothing, Household', operating_since='2018', volunteers_count=30,
            verification_status=VerificationStatus.APPROVED, trust_score=88, response_time='4 hrs', success_rate='92%'
        )

        # Nagpur NGO
        ngo3_user = User.objects.create_user(
            username='nagpurseva', email='care@nagpurseva.org',
            password='ngo12345', role='ngo', avatar='🤝'
        )
        ngo3 = NGO.objects.create(
            user=ngo3_user, name='Nagpur Seva Samiti',
            lat=21.1458, lng=79.0882,
            address='88 Seva Sadan, Dharampeth, Nagpur, MH, 440010',
            registration_number='NGO-345678', gov_registration_number='GOV-776655',
            ngo_type='Society', phone='7766554433', website='https://nagpurseva.org',
            state='Maharashtra', district='Nagpur', city='Nagpur', pin_code='440010',
            description='Providing medical supplies, blankets, and essential care to elderly citizens.',
            mission='Ensure dignity and basic comfort kits to vulnerable communities.',
            working_areas='Health, Blanket, Shelter', operating_since='2012', volunteers_count=60,
            verification_status=VerificationStatus.APPROVED, trust_score=92, response_time='1 hr', success_rate='96%'
        )

        # 4. Create Emergency Campaigns
        self.stdout.write('Creating disaster relief campaigns...')
        c1 = EmergencyCampaign.objects.create(
            title='Mumbai Monsoon Floods Relief',
            description='Urgent relief campaign offering food, blankets, and dry clothes to families affected by heavy rains.',
            location='Mumbai Suburban Areas',
            is_active=True
        )
        c2 = EmergencyCampaign.objects.create(
            title='Nagpur Heatwave Support',
            description='Distributing summer hydration kits, caps, and light cotton apparel to daily wage labourers.',
            location='Nagpur Slum Clusters',
            is_active=True
        )

        # 5. Create NGO Needs
        self.stdout.write('Creating NGO needs...')
        # Normal Need
        Need.objects.create(
            ngo=ngo1, category='Books', item='Textbooks for Grade 1-5',
            quantity=100, fulfilled_quantity=40, urgency='High',
            description='School textbooks needed for academic year start.',
            lat=19.076, lng=72.8777
        )
        # Campaign Linked Need
        Need.objects.create(
            ngo=ngo1, category='Blanket', item='Warm Bedding & Blankets',
            quantity=150, fulfilled_quantity=0, urgency='High',
            description='Emergency blankets needed for flood displaced shelters.',
            campaign=c1, lat=19.076, lng=72.8777
        )
        # Pune Need
        Need.objects.create(
            ngo=ngo2, category='Clothing', item='Winter Sweaters & Jackets',
            quantity=80, fulfilled_quantity=20, urgency='Medium',
            description='Warm clothes for evening classes.',
            lat=18.5204, lng=73.8567
        )

        # 6. Create Volunteer Events
        self.stdout.write('Creating volunteer events...')
        e1 = VolunteerEvent.objects.create(
            ngo=ngo1, title='Flood Relief Package Packing',
            description='Join us to pack essential food, clothing and hygiene kits for flood-hit families.',
            date=timezone.now() + datetime.timedelta(days=3),
            location='Hope Foundation Hub, Bandra East',
            max_volunteers=20
        )
        e2 = VolunteerEvent.objects.create(
            ngo=ngo2, title='E-Waste and Clothes Recycling Day',
            description='Sort and categorise donated items for reuse distribution.',
            date=timezone.now() + datetime.timedelta(days=7),
            location='Eco Park Campus, Pune',
            max_volunteers=15
        )

        # 7. Create Donors & Profiles
        self.stdout.write('Creating donor users...')
        donor1 = User.objects.create_user(
            username='johndoe', email='donor@gmail.com',
            password='donor123', role='donor', avatar='🙋‍♂️'
        )
        p1, _ = Profile.objects.get_or_create(user=donor1)
        p1.phone = '9123456789'
        p1.address = '456 Dharampeth Main Road, Nagpur, MH, 440010'
        p1.city = 'Nagpur'
        p1.state = 'Maharashtra'
        p1.pin_code = '440010'
        p1.lat = 21.1458
        p1.lng = 79.0882
        p1.country = 'India'
        p1.save()

        donor_test = User.objects.create_user(
            username='donortest', email='donor@test.com',
            password='password123', role='donor', avatar='🙋‍♂️'
        )
        p_test, _ = Profile.objects.get_or_create(user=donor_test)
        p_test.phone = '9998887770'
        p_test.address = '789 Civil Lines Residency, Nagpur, MH, 440001'
        p_test.city = 'Nagpur'
        p_test.state = 'Maharashtra'
        p_test.pin_code = '440001'
        p_test.lat = 21.1500
        p_test.lng = 79.0800
        p_test.country = 'India'
        p_test.save()

        donor2 = User.objects.create_user(
            username='amitkumar', email='amit@gmail.com',
            password='donor123', role='donor', avatar='🧑‍💼'
        )
        p2, _ = Profile.objects.get_or_create(user=donor2)
        p2.phone = '9876543210'
        p2.address = '12 Wardha Road, Manish Nagar, Nagpur, MH, 440015'
        p2.city = 'Nagpur'
        p2.state = 'Maharashtra'
        p2.pin_code = '440015'
        p2.lat = 21.1000
        p2.lng = 79.0700
        p2.country = 'India'
        p2.save()



        # Register donor to volunteer event
        VolunteerRegistration.objects.create(event=e1, user=donor1, status='approved')
        VolunteerRegistration.objects.create(event=e2, user=donor2, status='approved')

        # 8. Create Community Challenges
        self.stdout.write('Creating community challenges...')
        CommunityChallenge.objects.create(
            title='Winter Blanket Drive',
            description='Cumulative city drive to pool 500 blankets for homeless shelters.',
            category='Blanket',
            target_quantity=500,
            current_quantity=150,
            start_date=timezone.now() - datetime.timedelta(days=10),
            end_date=timezone.now() + datetime.timedelta(days=20),
            is_active=True
        )
        CommunityChallenge.objects.create(
            title='Back to School Book Drive',
            description='Aggregate 300 textbooks to support underprivileged educational hubs.',
            category='Books',
            target_quantity=300,
            current_quantity=90,
            start_date=timezone.now() - datetime.timedelta(days=5),
            end_date=timezone.now() + datetime.timedelta(days=15),
            is_active=True
        )

        # 9. Create Donations
        self.stdout.write('Creating donations...')
        # Donation 1: Verified
        d1 = Donation.objects.create(
            id='DNT-2026-88001', donor=donor1,
            title='Grade 1-5 School Textbooks', category='Books',
            condition='Like New', quantity=50,
            description='Clean, non-torn CBSE text notebooks.',
            pickup_address='456 Donor Villa, Bandra West, Mumbai, MH, 400050',
            pickup_lat=19.088, pickup_lng=72.889,
            preferred_pickup_time='Weekend evenings', status=DonationStatus.VERIFIED
        )
        DonationPhoto.objects.create(
            donation=d1, photo_url='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'
        )

        # Donation 2: Claimed & Logistics Setup
        d2 = Donation.objects.create(
            id='DNT-2026-99002', donor=donor1,
            title='Warm Blankets Pack', category='Blanket',
            condition='Like New', quantity=30,
            description='Unused soft blankets stored in bags.',
            pickup_address='456 Donor Villa, Bandra West, Mumbai, MH, 400050',
            pickup_lat=19.088, pickup_lng=72.889,
            preferred_pickup_time='Anytime', status=DonationStatus.MATCHED,
            matched_ngo=ngo1, match_score=92,
            matched_at=timezone.now() - datetime.timedelta(days=1)
        )
        DonationPhoto.objects.create(
            donation=d2, photo_url='https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500'
        )

        # 10. Logistics setup
        self.stdout.write('Creating logistics jobs...')
        verify_token = "VERIFY-990212-DNT-2026-99002"
        job, _ = LogisticsJob.objects.get_or_create(donation=d2)
        job.carrier_name = 'Express Cargo #DB-990'
        job.current_step = 4
        job.verification_token = verify_token
        job.qr_code_content = f"https://donatebridge.org/verify-delivery/{verify_token}"
        job.save()
        TrackingMilestone.objects.filter(job=job).delete()
        
        TrackingMilestone.objects.create(
            job=job, step_num=1, title='Requested',
            description='Donation request logged by donor, pending verification.',
            lat=d2.pickup_lat, lng=d2.pickup_lng, time_stamp=timezone.now() - datetime.timedelta(days=1)
        )
        TrackingMilestone.objects.create(
            job=job, step_num=2, title='Approved',
            description='Listing approved by Admin and matched with NGO parameters.',
            lat=d2.pickup_lat, lng=d2.pickup_lng, time_stamp=timezone.now() - datetime.timedelta(hours=20)
        )
        TrackingMilestone.objects.create(
            job=job, step_num=3, title='Dispatched',
            description='Logistics carrier assigned and dispatched to donor pickup location.',
            lat=d2.pickup_lat, lng=d2.pickup_lng, time_stamp=timezone.now() - datetime.timedelta(hours=15)
        )
        TrackingMilestone.objects.create(
            job=job, step_num=4, title='In Transit',
            description='Shipment picked up, currently in transit to destination NGO hub.',
            lat=(d2.pickup_lat + ngo1.lat)/2, lng=(d2.pickup_lng + ngo1.lng)/2,
            time_stamp=timezone.now() - datetime.timedelta(hours=2)
        )

        # 11. Create Audit logs
        self.stdout.write('Creating audit logs...')
        AuditLog.objects.create(
            user=admin_user, action_type='NGO_AUDIT',
            description="NGO 'Hope Foundation' approved after document verification."
        )
        AuditLog.objects.create(
            user=admin_user, action_type='NGO_AUDIT',
            description="NGO 'Green Earth Foundation' approved after document verification."
        )
        AuditLog.objects.create(
            user=ngo1_user, action_type='DONATION_CLAIM',
            description=f"Donation listing {d2.id} claimed by NGO Hope Foundation."
        )

        # 12. Create Fraud Radar Logs
        self.stdout.write('Creating fraud radar logs...')
        FraudLog.objects.create(
            entity_name='Unregistered Donor Hub',
            trigger='Multiple rapid registration attempts with duplicate device fingerprint',
            risk_score='Medium (42%)'
        )
        FraudLog.objects.create(
            entity_name='NGO FakeRegistration Inc',
            trigger='Invalid PAN document checksum matching fake template format',
            risk_score='Critical (95%)'
        )

        # 13. Create Notifications
        self.stdout.write('Creating notifications...')
        Notification.objects.create(
            user=donor1, notification_type=NotificationType.SECURITY,
            title='Listing Verified',
            message='Your school textbooks listing (DNT-2026-88001) has been approved by admin board.',
            is_read=False
        )
        Notification.objects.create(
            user=ngo1_user, notification_type=NotificationType.DELIVERY,
            title='Cargo Dispatched',
            message='Express Cargo #DB-990 is dispatched to pick up the blankets.',
            is_read=True
        )

        # 14. Create Chat Channel & Messages
        self.stdout.write('Creating chat channels...')
        channel = ChatChannel.objects.create()
        ChatMember.objects.create(channel=channel, user=donor1)
        ChatMember.objects.create(channel=channel, user=ngo1_user)
        
        ChatMessage.objects.create(
            channel=channel, sender=ngo1_user, message_type='text',
            text='Hi John, thank you for listing the blankets! They will help families affected by the monsoons.',
            is_delivered=True, is_read=True
        )
        ChatMessage.objects.create(
            channel=channel, sender=donor1, message_type='text',
            text='You are welcome! Let me know if the carrier needs directions.',
            is_delivered=True, is_read=True
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded database!'))
