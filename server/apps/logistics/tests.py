from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from donation.models import Donation, DonationStatus
from ngo.models import NGO, VerificationStatus
from logistics.models import LogisticsJob, TrackingMilestone

User = get_user_model()

class LogisticsSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin = User.objects.create_superuser(
            username='admin_usr', email='admin@test.com', password='Password123!', role='admin'
        )
        self.donor = User.objects.create_user(
            username='donor_usr', email='donor@test.com', password='Password123!', role='donor'
        )
        self.ngo_user = User.objects.create_user(
            username='ngo_usr', email='ngo@test.com', password='Password123!', role='ngo'
        )
        self.other_user = User.objects.create_user(
            username='other_usr', email='other@test.com', password='Password123!', role='donor'
        )

        # NGO
        self.ngo = NGO.objects.create(
            user=self.ngo_user,
            name="Care Foundation",
            registration_number="REG-LOG-01",
            lat=12.9716, lng=77.5946,
            verification_status=VerificationStatus.APPROVED
        )

        # Donation & Logistics Job
        self.donation = Donation.objects.create(
            id="DNT-2026-TEST1",
            donor=self.donor,
            matched_ngo=self.ngo,
            title="Warm Blankets",
            category="Clothing",
            quantity=10,
            pickup_lat=12.9716, pickup_lng=77.5946,
            status=DonationStatus.MATCHED
        )
        self.job, _ = LogisticsJob.objects.get_or_create(
            donation=self.donation,
            defaults={
                'carrier_name': "Express Logistics",
                'current_step': 2,
                'verification_token': "TEST-TOKEN-12345"
            }
        )
        self.job.current_step = 2
        self.job.verification_token = "TEST-TOKEN-12345"
        self.job.save()

    def test_anonymous_user_cannot_update_logistics(self):
        """Anonymous user cannot access or update logistics step."""
        res = self.client.patch(f'/api/tracking/{self.donation.id}/step/', {'step': 3}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unrelated_user_cannot_update_logistics(self):
        """Unrelated user cannot update logistics step."""
        self.client.force_authenticate(user=self.other_user)
        res = self.client.patch(f'/api/tracking/{self.donation.id}/step/', {'step': 3}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_authorized_user_can_update_logistics_sequentially(self):
        """Authorized donor or NGO owner can update step 2 -> 3 sequentially."""
        self.client.force_authenticate(user=self.donor)
        res = self.client.patch(f'/api/tracking/{self.donation.id}/step/', {'step': 3}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.job.refresh_from_db()
        self.assertEqual(self.job.current_step, 3)

    def test_invalid_step_values_rejected(self):
        """Step values outside [1..6] or non-numeric must be rejected."""
        self.client.force_authenticate(user=self.donor)
        for bad_step in [0, 7, -1, "abc"]:
            res = self.client.patch(f'/api/tracking/{self.donation.id}/step/', {'step': bad_step}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_step_jump_rejected(self):
        """Jumping from step 2 directly to step 6 must be rejected."""
        self.client.force_authenticate(user=self.donor)
        res = self.client.patch(f'/api/tracking/{self.donation.id}/step/', {'step': 6}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("progress sequentially", res.data['error'])

    def test_backward_step_transition_rejected(self):
        """Moving backward from step 3 to step 1 must be rejected."""
        self.job.current_step = 3
        self.job.save()

        self.client.force_authenticate(user=self.donor)
        res = self.client.patch(f'/api/tracking/{self.donation.id}/step/', {'step': 1}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_on_delivered_donation_rejected(self):
        """Modifying a shipment that is already DELIVERED must be rejected."""
        self.job.current_step = 5
        self.job.save()
        self.donation.status = DonationStatus.DELIVERED
        self.donation.save()

        self.client.force_authenticate(user=self.donor)
        res = self.client.patch(f'/api/tracking/{self.donation.id}/step/', {'step': 6}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_qr_code_verification_workflow(self):
        """QR Verification requires matched NGO user and valid token."""
        # 1. Unrelated user blocked
        self.client.force_authenticate(user=self.other_user)
        res1 = self.client.post(f'/api/tracking/{self.donation.id}/verify-qr/', {'token': 'TEST-TOKEN-12345'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Invalid token rejected
        self.client.force_authenticate(user=self.ngo_user)
        res2 = self.client.post(f'/api/tracking/{self.donation.id}/verify-qr/', {'token': 'WRONG-TOKEN'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Valid token by NGO owner succeeds
        res3 = self.client.post(f'/api/tracking/{self.donation.id}/verify-qr/', {'token': 'TEST-TOKEN-12345'}, format='json')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.donation.refresh_from_db()
        self.assertEqual(self.donation.status, DonationStatus.DELIVERED)

        # 4. Double verification rejected
        res4 = self.client.post(f'/api/tracking/{self.donation.id}/verify-qr/', {'token': 'TEST-TOKEN-12345'}, format='json')
        self.assertEqual(res4.status_code, status.HTTP_400_BAD_REQUEST)
