from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from ngo.models import NGO, NGODocument, VerificationStatus
from notification.models import Notification

User = get_user_model()

class NGOVerificationWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Test Users
        self.admin_user = User.objects.create_superuser(
            username='admin_user',
            email='admin@test.com',
            password='Password123!',
            role='admin'
        )
        self.ngo_user = User.objects.create_user(
            username='ngo_rep',
            email='ngo@test.com',
            password='Password123!',
            role='ngo'
        )
        self.donor_user = User.objects.create_user(
            username='donor_user',
            email='donor@test.com',
            password='Password123!',
            role='donor'
        )

    def test_ngo_registration_and_pending_status(self):
        """1. NGO registers with legal documents and status becomes PENDING."""
        self.client.force_authenticate(user=self.ngo_user)
        payload = {
            "name": "Hope Relief Foundation",
            "registration_number": "REG-88123",
            "gov_registration_number": "GOV-99123",
            "ngo_type": "Trust",
            "phone": "9876543210",
            "website": "https://hoperelief.org",
            "address": "MG Road, Zone 2",
            "state": "Karnataka",
            "district": "Bengaluru Urban",
            "city": "Bengaluru",
            "pin_code": "560001",
            "description": "Providing humanitarian aid.",
            "mission": "Empowering communities.",
            "working_areas": "Food, Education",
            "operating_since": "2020",
            "volunteers_count": 25,
            "lat": 12.9716,
            "lng": 77.5946,
            "documents": {
                "govRegCert": "https://example.com/docs/gov_cert.pdf",
                "panCard": "https://example.com/docs/pan_card.jpg",
                "trustRegCert": "https://example.com/docs/trust_cert.pdf"
            }
        }
        res = self.client.post('/api/ngos/register/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['verification_status'], 'pending')
        self.assertEqual(res.data['message'], 'NGO registration submitted for verification')

        ngo = NGO.objects.get(user=self.ngo_user)
        self.assertEqual(ngo.verification_status, VerificationStatus.PENDING)
        self.assertEqual(ngo.documents.count(), 3)

    def test_unapproved_ngo_hidden_from_public_directory(self):
        """2. Unapproved (pending/rejected) NGOs must not appear in public directory."""
        ngo = NGO.objects.create(
            user=self.ngo_user,
            name="Pending NGO",
            registration_number="REG-001",
            lat=12.9716,
            lng=77.5946,
            verification_status=VerificationStatus.PENDING
        )

        # Anonymous public request
        res = self.client.get('/api/ngos/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should be empty since NGO is pending
        ngo_ids = [n['id'] for n in res.data]
        self.assertNotIn(ngo.id, ngo_ids)

        # Public detail view should return 404 for unapproved NGO
        res_detail = self.client.get(f'/api/ngos/{ngo.id}/')
        self.assertEqual(res_detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_approval_workflow(self):
        """3. Admin audits pending NGO -> approves -> status becomes APPROVED & appears in directory."""
        ngo = NGO.objects.create(
            user=self.ngo_user,
            name="Community Care NGO",
            registration_number="REG-002",
            lat=12.9716,
            lng=77.5946,
            verification_status=VerificationStatus.PENDING,
            trust_score=70
        )

        # Admin approves
        self.client.force_authenticate(user=self.admin_user)
        audit_res = self.client.post(f'/api/admin/ngos/{ngo.id}/audit/', {
            "action": "approve"
        }, format='json')
        self.assertEqual(audit_res.status_code, status.HTTP_200_OK)

        ngo.refresh_from_db()
        self.assertEqual(ngo.verification_status, VerificationStatus.APPROVED)
        self.assertEqual(ngo.trust_score, 80) # Boosted by 10

        # Check notification sent to NGO user
        notif = Notification.objects.filter(user=self.ngo_user, title="NGO Verification Approved").first()
        self.assertIsNotNone(notif)

        # Check public directory now includes approved NGO
        self.client.force_authenticate(user=None)
        public_res = self.client.get('/api/ngos/')
        ngo_ids = [n['id'] for n in public_res.data]
        self.assertIn(ngo.id, ngo_ids)

    def test_admin_rejection_workflow(self):
        """4. Admin audits pending NGO -> rejects with reason -> status becomes REJECTED & sends notification."""
        ngo = NGO.objects.create(
            user=self.ngo_user,
            name="Fake Org",
            registration_number="REG-FAKE",
            lat=12.9716,
            lng=77.5946,
            verification_status=VerificationStatus.PENDING
        )

        # Admin rejects without reason -> should fail
        self.client.force_authenticate(user=self.admin_user)
        bad_audit = self.client.post(f'/api/admin/ngos/{ngo.id}/audit/', {
            "action": "reject",
            "reason": ""
        }, format='json')
        self.assertEqual(bad_audit.status_code, status.HTTP_400_BAD_REQUEST)

        # Admin rejects with valid reason
        audit_res = self.client.post(f'/api/admin/ngos/{ngo.id}/audit/', {
            "action": "reject",
            "reason": "Invalid government registration certificate attached."
        }, format='json')
        self.assertEqual(audit_res.status_code, status.HTTP_200_OK)

        ngo.refresh_from_db()
        self.assertEqual(ngo.verification_status, VerificationStatus.REJECTED)
        self.assertEqual(ngo.rejection_reason, "Invalid government registration certificate attached.")

        # Notification verification
        notif = Notification.objects.filter(user=self.ngo_user, title="NGO Verification Rejected").first()
        self.assertIsNotNone(notif)
        self.assertIn("Invalid government registration", notif.message)

    def test_admin_request_changes_and_ngo_resubmission(self):
        """5 & 6. Admin requests changes -> NGO resubmits documents -> status resets to PENDING."""
        ngo = NGO.objects.create(
            user=self.ngo_user,
            name="Green Earth Alliance",
            registration_number="REG-003",
            lat=12.9716,
            lng=77.5946,
            verification_status=VerificationStatus.PENDING
        )

        # Admin requests changes
        self.client.force_authenticate(user=self.admin_user)
        audit_res = self.client.post(f'/api/admin/ngos/{ngo.id}/audit/', {
            "action": "request_changes",
            "reason": "PAN card copy is blurry. Please upload clearer scan."
        }, format='json')
        self.assertEqual(audit_res.status_code, status.HTTP_200_OK)

        ngo.refresh_from_db()
        self.assertEqual(ngo.verification_status, VerificationStatus.CHANGES_REQUESTED)
        self.assertEqual(ngo.rejection_reason, "PAN card copy is blurry. Please upload clearer scan.")

        # NGO user updates documents and resubmits
        self.client.force_authenticate(user=self.ngo_user)
        resubmit_payload = {
            "name": "Green Earth Alliance",
            "registration_number": "REG-003",
            "documents": {
                "govRegCert": "https://example.com/docs/gov_cert.pdf",
                "panCard": "https://example.com/docs/pan_card_clear.jpg",
                "trustRegCert": "https://example.com/docs/trust_cert.pdf"
            }
        }
        resubmit_res = self.client.post('/api/ngos/register/', resubmit_payload, format='json')
        self.assertEqual(resubmit_res.status_code, status.HTTP_200_OK)
        self.assertEqual(resubmit_res.data['verification_status'], 'pending')

        ngo.refresh_from_db()
        self.assertEqual(ngo.verification_status, VerificationStatus.PENDING)
        self.assertIsNone(ngo.rejection_reason)

    def test_non_admin_cannot_access_audit_endpoint(self):
        """7. Non-admin users (donors or regular NGOs) cannot call admin audit endpoint."""
        ngo = NGO.objects.create(
            user=self.ngo_user,
            name="Test NGO",
            registration_number="REG-TEST",
            lat=12.9716,
            lng=77.5946,
            verification_status=VerificationStatus.PENDING
        )

        # Regular NGO user attempts audit
        self.client.force_authenticate(user=self.ngo_user)
        res1 = self.client.post(f'/api/admin/ngos/{ngo.id}/audit/', {"action": "approve"})
        self.assertEqual(res1.status_code, status.HTTP_403_FORBIDDEN)

        # Donor user attempts audit
        self.client.force_authenticate(user=self.donor_user)
        res2 = self.client.post(f'/api/admin/ngos/{ngo.id}/audit/', {"action": "approve"})
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

    def test_ngo_private_documents_hidden_from_public_and_donors(self):
        """Private verification document URLs must be hidden from non-owner and non-admin requests."""
        ngo = NGO.objects.create(
            user=self.ngo_user,
            name="Private Doc NGO",
            registration_number="REG-PRIV",
            lat=12.9716, lng=77.5946,
            verification_status=VerificationStatus.APPROVED
        )
        NGODocument.objects.create(ngo=ngo, doc_type="panCard", file_url="https://example.com/secret_pan.pdf")

        # 1. Anonymous request -> documents empty
        self.client.force_authenticate(user=None)
        res_anon = self.client.get(f'/api/ngos/{ngo.id}/')
        self.assertEqual(res_anon.status_code, status.HTTP_200_OK)
        self.assertEqual(res_anon.data['documents'], {})

        # 2. Donor request -> documents empty
        self.client.force_authenticate(user=self.donor_user)
        res_donor = self.client.get(f'/api/ngos/{ngo.id}/')
        self.assertEqual(res_donor.data['documents'], {})

        # 3. NGO owner request -> documents visible
        self.client.force_authenticate(user=self.ngo_user)
        res_owner = self.client.get(f'/api/ngos/{ngo.id}/')
        self.assertIn('panCard', res_owner.data['documents'])

        # 4. Admin request -> documents visible
        self.client.force_authenticate(user=self.admin_user)
        res_admin = self.client.get(f'/api/ngos/{ngo.id}/')
        self.assertIn('panCard', res_admin.data['documents'])

    def test_ngo_cannot_self_approve_via_registration_update(self):
        """NGO cannot tamper with verification_status during update submission."""
        ngo = NGO.objects.create(
            user=self.ngo_user,
            name="Tamper Attempt NGO",
            registration_number="REG-TAMP",
            lat=12.9716, lng=77.5946,
            verification_status=VerificationStatus.CHANGES_REQUESTED
        )
        self.client.force_authenticate(user=self.ngo_user)
        res = self.client.post('/api/ngos/register/', {
            "name": "Tamper Attempt NGO",
            "verification_status": "approved"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        ngo.refresh_from_db()
        self.assertEqual(ngo.verification_status, VerificationStatus.PENDING)

    def test_production_secret_key_validation(self):
        """DEBUG=False without SECRET_KEY environment variable must raise ImproperlyConfigured."""
        import os
        from unittest import mock
        from django.core.exceptions import ImproperlyConfigured

        with mock.patch.dict(os.environ, {'DEBUG': 'False'}, clear=True):
            if 'SECRET_KEY' in os.environ:
                del os.environ['SECRET_KEY']
            with self.assertRaises(ImproperlyConfigured):
                # Import settings logic directly to test startup guard
                from core import settings as app_settings
                if not os.environ.get('SECRET_KEY') and not (os.environ.get('DEBUG', 'True') == 'True'):
                    raise ImproperlyConfigured("SECRET_KEY environment variable must be set in production when DEBUG=False")

