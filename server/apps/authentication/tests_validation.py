from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from authentication.serializers import UserRegistrationSerializer, ProfileSerializer
from ngo.serializers import NGORegistrationSerializer, NeedSerializer
from donation.serializers import DonationCreateSerializer

User = get_user_model()

class ValidationAuditTestCase(TestCase):
    def test_invalid_phone_numbers_rejected(self):
        invalid_phones = [
            'abc123',
            'hello',
            '123abc456',
            '98765',
            '98765432101',
            '98765abc10',
            '987-654-3210',
            '98765@3210',
            '5876543210', # Invalid starting digit
        ]
        for phone in invalid_phones:
            serializer = ProfileSerializer(data={'phone': phone})
            self.assertFalse(serializer.is_valid(), f"Phone '{phone}' should be rejected as invalid.")
            self.assertIn('phone', serializer.errors)

    def test_valid_phone_numbers_accepted(self):
        valid_phones = ['9876543210', '9123456789', '8887776655', '7000000000', '6999999999']
        for phone in valid_phones:
            serializer = ProfileSerializer(data={'phone': phone})
            self.assertTrue(serializer.is_valid(), f"Phone '{phone}' should be accepted as valid.")

    def test_invalid_pincodes_rejected(self):
        invalid_pincodes = ['123', 'abcdef', '012345', '4400010', '44000a']
        for pin in invalid_pincodes:
            data = {
                'name': 'Test NGO',
                'lat': 21.15,
                'lng': 79.09,
                'address': '123 Test Street, Nagpur',
                'registration_number': 'NGO-100',
                'gov_registration_number': 'GOV-100',
                'ngo_type': 'Trust',
                'phone': '9876543210',
                'pin_code': pin,
                'operating_since': '2020',
                'state': 'MH',
                'district': 'Nagpur',
                'city': 'Nagpur',
                'description': 'Test NGO',
                'mission': 'Test Mission',
                'working_areas': 'Food'
            }
            serializer = NGORegistrationSerializer(data=data)
            self.assertFalse(serializer.is_valid(), f"Pincode '{pin}' should be rejected as invalid.")
            self.assertIn('pin_code', serializer.errors)

    def test_invalid_quantities_rejected(self):
        invalid_quantities = [-10, 0]
        for qty in invalid_quantities:
            need_serializer = NeedSerializer(data={
                'category': 'Books',
                'item': 'Textbooks',
                'quantity': qty,
                'urgency': 'High',
                'lat': 21.15,
                'lng': 79.09
            })
            self.assertFalse(need_serializer.is_valid(), f"Need quantity {qty} should be rejected.")
            self.assertIn('quantity', need_serializer.errors)

            donation_serializer = DonationCreateSerializer(data={
                'title': 'School Books',
                'category': 'Books',
                'condition': 'Like New',
                'quantity': qty,
                'description': 'Clean books',
                'pickup_address': '123 Test Address, Nagpur',
                'pickup_lat': 21.15,
                'pickup_lng': 79.09,
                'preferred_pickup_time': 'Anytime'
            })
            self.assertFalse(donation_serializer.is_valid(), f"Donation quantity {qty} should be rejected.")
            self.assertIn('quantity', donation_serializer.errors)

    def test_duplicate_email_registration_rejected(self):
        User.objects.create_user(username='existinguser', email='existing@test.com', password='Password123!')
        serializer = UserRegistrationSerializer(data={
            'username': 'newuser',
            'email': 'existing@test.com',
            'password': 'Password123!'
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
        self.assertIn("already registered", str(serializer.errors['email']))
