from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile

from authentication.models import Profile
from ngo.models import NGO, Need, VerificationStatus, EmergencyCampaign, VolunteerEvent, VolunteerRegistration
from donation.models import Donation, DonationStatus, CommunityChallenge
from donation.views import calculate_match_score
from logistics.models import LogisticsJob

User = get_user_model()

class DonateBridgeBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create testing users
        self.donor_user = User.objects.create_user(
            username='donor_test',
            email='donor@test.com',
            password='password123',
            role='donor'
        )
        
        self.ngo_user = User.objects.create_user(
            username='ngo_test',
            email='ngo@test.com',
            password='password123',
            role='ngo'
        )

    def test_donor_registration_and_login(self):
        # Test signup
        response = self.client.post('/api/auth/register/', {
            'username': 'newdonor',
            'email': 'newdonor@test.com',
            'password': 'donorpassword123',
            'role': 'donor'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        
        # Test login
        response = self.client.post('/api/auth/login/', {
            'email': 'newdonor@test.com',
            'password': 'donorpassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['role'], 'donor')

    def test_login_non_existent_email_rejection(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'unregistered_user_999@test.com',
            'password': 'somepassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Account not found. Please register first.', str(response.data))

    def test_ngo_registration_and_needs(self):

        # Register NGO detail
        self.client.force_authenticate(user=self.ngo_user)
        response = self.client.post('/api/ngos/register/', {
            'name': 'Helping Hands NGO',
            'lat': 19.076,
            'lng': 72.8777,
            'address': 'Bandra Kurla Complex, Mumbai',
            'registration_number': 'REG-BKC-789',
            'gov_registration_number': 'GOV-BKC-990',
            'ngo_type': 'Society',
            'phone': '9998887776',
            'state': 'Maharashtra',
            'district': 'Mumbai Suburban',
            'city': 'Mumbai',
            'pin_code': '400051',
            'description': 'Underprivileged assistance society',
            'mission': 'Assist society needs',
            'working_areas': 'Education, Food',
            'operating_since': '2020',
            'volunteers_count': 10
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['verification_status'], 'pending')
        
        # Approve NGO using admin
        ngo = NGO.objects.get(user=self.ngo_user)
        ngo.verification_status = VerificationStatus.APPROVED
        ngo.save()
        
        # Refresh authentication with updated database state
        self.client.force_authenticate(user=User.objects.get(id=self.ngo_user.id))
        
        # Post a Need
        response = self.client.post('/api/needs/', {
            'category': 'Books',
            'item': 'School Textbooks',
            'quantity': 50,
            'urgency': 'High',
            'description': 'High school books',
            'lat': 19.076,
            'lng': 72.8777
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Need.objects.count(), 1)

    def test_donation_and_claim_flow(self):
        # 1. Register NGO & Approve it
        ngo_profile = NGO.objects.create(
            user=self.ngo_user,
            name='Claiming NGO',
            lat=19.076,
            lng=72.8777,
            address='Bandra',
            registration_number='REG-1',
            gov_registration_number='GOV-1',
            ngo_type='Trust',
            phone='12345',
            state='MH',
            district='Mumbai',
            city='Mumbai',
            pin_code='400050',
            description='Test description',
            mission='Test mission',
            working_areas='Books',
            operating_since='2018',
            verification_status=VerificationStatus.APPROVED
        )

        # 2. Upload Donation by Donor
        self.client.force_authenticate(user=self.donor_user)
        response = self.client.post('/api/donations/', {
            'title': 'Cbse school books',
            'category': 'Books',
            'condition': 'Good',
            'quantity': 30,
            'description': '30 textbooks',
            'pickup_address': 'Bandra West',
            'pickup_lat': 19.088,
            'pickup_lng': 72.889,
            'preferred_pickup_time': 'Weekends'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        donation_id = response.data['id']
        
        # Donation starts as PENDING. Admin verifies it.
        donation = Donation.objects.get(id=donation_id)
        donation.status = DonationStatus.VERIFIED
        donation.save()
        
        # 3. Claim Donation by NGO
        self.client.force_authenticate(user=self.ngo_user)
        response = self.client.post(f'/api/donations/{donation_id}/claim/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        donation.refresh_from_db()
        self.assertEqual(donation.status, DonationStatus.MATCHED)
        self.assertEqual(donation.matched_ngo, ngo_profile)

    def test_smart_matching_algorithm(self):
        ngo_profile = NGO.objects.create(
            user=self.ngo_user,
            name='Matching NGO',
            lat=19.076,
            lng=72.8777,
            address='Bandra East',
            registration_number='REG-2',
            gov_registration_number='GOV-2',
            ngo_type='Trust',
            phone='123',
            state='MH',
            district='Mumb',
            city='Mumb',
            pin_code='400',
            description='Test',
            mission='Test',
            working_areas='Books',
            operating_since='2010',
            verification_status=VerificationStatus.APPROVED
        )
        
        need = Need.objects.create(
            ngo=ngo_profile,
            category='Books',
            item='Maths Books',
            quantity=50,
            urgency='High',
            lat=19.076,
            lng=72.8777
        )
        
        donation = Donation.objects.create(
            id='DNT-TEST-001',
            donor=self.donor_user,
            title='Used books',
            category='Books',
            condition='Good',
            quantity=20,
            description='Test description',
            pickup_address='Bandra West',
            pickup_lat=19.088,
            pickup_lng=72.889,
            preferred_pickup_time='Anytime',
            status=DonationStatus.VERIFIED
        )
        
        # Calculate matching affinity score
        score_breakdown = calculate_match_score(donation, need, ngo_profile)
        
        # Distance between 19.088, 72.889 and 19.076, 72.8777 is ~1.76 km.
        self.assertGreater(score_breakdown['total'], 80)
        self.assertEqual(score_breakdown['categoryFit'], 30)

    def test_differentiator_features(self):
        # 1. Create a campaign & challenge
        campaign = EmergencyCampaign.objects.create(
            title='Disaster relief 1',
            description='Relief',
            location='Mumbai',
            is_active=True
        )
        challenge = CommunityChallenge.objects.create(
            title='Winter blanket drive',
            description='Blanket drive',
            category='Blanket',
            target_quantity=100,
            current_quantity=10,
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=10),
            is_active=True
        )

        # 2. Register NGO and Approved
        ngo_profile = NGO.objects.create(
            user=self.ngo_user,
            name='Differentiator NGO',
            lat=19.076,
            lng=72.8777,
            address='Bandra',
            registration_number='REG-DIFF',
            gov_registration_number='GOV-DIFF',
            ngo_type='Trust',
            phone='1234567890',
            state='MH',
            district='Mumbai',
            city='Mumbai',
            pin_code='400050',
            description='Desc',
            mission='Mission',
            working_areas='Blanket',
            operating_since='2018',
            verification_status=VerificationStatus.APPROVED
        )

        # 3. Create a Need linked to campaign
        need = Need.objects.create(
            ngo=ngo_profile,
            category='Blanket',
            item='Warm Blankets',
            quantity=50,
            fulfilled_quantity=0,
            urgency='High',
            campaign=campaign,
            lat=19.076,
            lng=72.8777
        )

        # 4. Upload Donation of Blanket category
        self.client.force_authenticate(user=self.donor_user)
        response = self.client.post('/api/donations/', {
            'title': '30 Blankets donation',
            'category': 'Blanket',
            'condition': 'Like New',
            'quantity': 30,
            'description': '30 fresh blankets',
            'pickup_address': 'Bandra West',
            'pickup_lat': 19.088,
            'pickup_lng': 72.889,
            'preferred_pickup_time': 'Weekends'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        donation_id = response.data['id']

        donation = Donation.objects.get(id=donation_id)
        donation.status = DonationStatus.VERIFIED
        donation.save()

        # 5. Claim the donation to trigger Need and Challenge progress increment
        self.client.force_authenticate(user=self.ngo_user)
        response = self.client.post(f'/api/donations/{donation_id}/claim/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify Need & Challenge progress has incremented
        need.refresh_from_db()
        self.assertEqual(need.fulfilled_quantity, 30)

        challenge.refresh_from_db()
        self.assertEqual(challenge.current_quantity, 40) # 10 (base) + 30 (donation) = 40

        # Verify logistics job and token generation
        logistics_job = LogisticsJob.objects.get(donation=donation)
        self.assertIsNotNone(logistics_job.verification_token)

        # 6. Verify QR handover delivery completion
        response = self.client.post(f'/api/tracking/{donation_id}/verify-qr/', {
            'token': logistics_job.verification_token
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        logistics_job.refresh_from_db()
        self.assertEqual(logistics_job.current_step, 5) # Step 5: Delivered

        donation.refresh_from_db()
        self.assertEqual(donation.status, DonationStatus.DELIVERED)

        # 7. Volunteer events & registration
        event = VolunteerEvent.objects.create(
            ngo=ngo_profile,
            title='Blanket distribution drive',
            description='Help sort blankets',
            date=timezone.now() + timezone.timedelta(days=2),
            location='Shelter home',
            max_volunteers=10
        )
        self.client.force_authenticate(user=self.donor_user)
        response = self.client.post('/api/volunteer-registrations/', {
            'event': event.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VolunteerRegistration.objects.count(), 1)

    def test_forgot_password_and_reset_password(self):
        from django.core.cache import cache
        # 1. Forgot password request
        response = self.client.post('/api/auth/forgot-password/', {
            'email': 'donor@test.com'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        otp_code = cache.get('otp_donor@test.com')
        self.assertIsNotNone(otp_code)

        # 2. Reset password using the code
        response = self.client.post('/api/auth/reset-password/', {
            'email': 'donor@test.com',
            'code': otp_code,
            'new_password': 'newpassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 3. Try to login with new password
        response = self.client.post('/api/auth/login/', {
            'email': 'donor@test.com',
            'password': 'newpassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_secure_file_upload(self):
        self.client.force_authenticate(user=self.donor_user)

        # 1. Valid image file
        dummy_file = SimpleUploadedFile("picture.png", b"file_content", content_type="image/png")
        response = self.client.post('/api/upload/', {'file': dummy_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('url', response.data)
        self.assertTrue(response.data['url'].endswith('.png'))

        # 2. Invalid file type (e.g. php/executable)
        invalid_file = SimpleUploadedFile("script.py", b"print('hack')", content_type="text/plain")
        response = self.client.post('/api/upload/', {'file': invalid_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Double extension check
        double_ext_file = SimpleUploadedFile("script.php.png", b"file_content", content_type="image/png")
        response = self.client.post('/api/upload/', {'file': double_ext_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_feedback_submission(self):
        # 1. Test missing fields
        response = self.client.post('/api/feedback/', {
            'name': '',
            'email': 'donor@test.com',
            'message': ''
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Test valid feedback submission
        response = self.client.post('/api/feedback/', {
            'name': 'Test User',
            'email': 'testuser@example.com',
            'role': 'donor',
            'message': 'DonateBridge platform is working fantastically!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))

    def test_coordinate_location_registration_and_validation(self):
        # 1. Test valid coordinate registration
        response = self.client.post('/api/auth/register/', {
            'username': 'coorddonor',
            'email': 'coorddonor@test.com',
            'password': 'donorpassword123',
            'role': 'donor',
            'lat': 21.1458,
            'lng': 79.0882,
            'address': 'Sitabuldi, Nagpur, MH 440001',
            'city': 'Nagpur',
            'state': 'Maharashtra',
            'pin_code': '440001',
            'country': 'India'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        coord_user = User.objects.get(email='coorddonor@test.com')
        self.assertEqual(coord_user.profile.lat, 21.1458)
        self.assertEqual(coord_user.profile.lng, 79.0882)
        self.assertEqual(coord_user.profile.city, 'Nagpur')

        # 2. Test invalid latitude (> 90) rejection
        response = self.client.post('/api/auth/register/', {
            'username': 'badlatuser',
            'email': 'badlat@test.com',
            'password': 'password123',
            'role': 'donor',
            'lat': 999.0,
            'lng': 79.0882
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid coordinates', str(response.data))

        # 3. Test invalid longitude (> 180) rejection
        response = self.client.post('/api/auth/register/', {
            'username': 'badlnguser',
            'email': 'badlng@test.com',
            'password': 'password123',
            'role': 'donor',
            'lat': 21.1458,
            'lng': 500.0
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid coordinates', str(response.data))

    def test_reverse_geocode_api_endpoint(self):
        # 1. Missing params
        response = self.client.get('/api/location/reverse-geocode/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Out of bound coords
        response = self.client.get('/api/location/reverse-geocode/?lat=999&lng=500')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Valid coords query
        response = self.client.get('/api/location/reverse-geocode/?lat=21.1458&lng=79.0882')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('city', response.data)
        self.assertIn('state', response.data)

    def test_donor_registration_with_aadhaar_and_pan(self):
        # 1. Invalid Aadhaar format (must be 12 digits)
        response = self.client.post('/api/auth/register/', {
            'username': 'badaadhaar',
            'email': 'badaadhaar@test.com',
            'password': 'password123',
            'role': 'donor',
            'aadhaar_number': '12345'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('aadhaar_number', response.data)

        # 2. Invalid PAN format (must be 10 chars, e.g. ABCDE1234F)
        response = self.client.post('/api/auth/register/', {
            'username': 'badpan',
            'email': 'badpan@test.com',
            'password': 'password123',
            'role': 'donor',
            'pan_number': 'INVALIDPAN12'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('pan_number', response.data)

        # 3. Successful donor registration with valid Aadhaar & PAN
        response = self.client.post('/api/auth/register/', {
            'username': 'verifieddonor',
            'email': 'verifieddonor@test.com',
            'password': 'password123',
            'role': 'donor',
            'aadhaar_number': '123456789012',
            'pan_number': 'ABCDE1234F',
            'aadhaar_doc': 'https://example.com/aadhaar.pdf',
            'pan_doc': 'https://example.com/pan.pdf'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email='verifieddonor@test.com')
        self.assertEqual(new_user.profile.verification_status, 'pending')
        self.assertEqual(new_user.profile.aadhaar_number, '123456789012')
        self.assertEqual(new_user.profile.pan_number, 'ABCDE1234F')

    def test_admin_donor_audit_workflow(self):
        # Create admin user
        admin_user = User.objects.create_superuser(
            username='admin_audit',
            email='admin_audit@test.com',
            password='adminpassword123'
        )
        self.client.force_authenticate(user=admin_user)

        # Register donor
        donor = User.objects.create_user(
            username='audit_donor',
            email='audit_donor@test.com',
            password='password123',
            role='donor'
        )
        donor.profile.aadhaar_number = '987654321098'
        donor.profile.pan_number = 'XYZAB5678C'
        donor.profile.verification_status = 'pending'
        donor.profile.save()

        # 1. Admin views pending donors queue
        response = self.client.get('/api/admin/donors/pending/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        donor_ids = [d['id'] for d in response.data]
        self.assertIn(donor.id, donor_ids)

        # 2. Admin requests changes
        response = self.client.post(f'/api/admin/donors/{donor.id}/audit/', {
            'action': 'request_changes',
            'reason': 'Please upload a clearer PAN card image.'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        donor.profile.refresh_from_db()
        self.assertEqual(donor.profile.verification_status, 'changes_requested')
        self.assertEqual(donor.profile.rejection_reason, 'Please upload a clearer PAN card image.')

        # 3. Donor resubmits updated verification
        self.client.force_authenticate(user=donor)
        resubmit_res = self.client.post('/api/users/resubmit-verification/', {
            'pan_doc': 'https://example.com/clearer_pan.jpg'
        })
        self.assertEqual(resubmit_res.status_code, status.HTTP_200_OK)
        donor.profile.refresh_from_db()
        self.assertEqual(donor.profile.verification_status, 'pending')

        # 4. Admin approves donor
        self.client.force_authenticate(user=admin_user)
        approve_res = self.client.post(f'/api/admin/donors/{donor.id}/audit/', {
            'action': 'approve'
        })
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)
        donor.profile.refresh_from_db()
        self.assertEqual(donor.profile.verification_status, 'approved')



