from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from core.asgi import application
from chat.models import ChatChannel, ChatMember, ChatMessage

User = get_user_model()

class ChatWebSocketTests(TransactionTestCase):
    async def test_anonymous_websocket_connection_rejected(self):
        communicator = WebsocketCommunicator(application, "/ws/chat/1/")
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_invalid_token_websocket_connection_rejected(self):
        communicator = WebsocketCommunicator(application, "/ws/chat/1/?token=INVALID_TOKEN")
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_non_channel_member_connection_rejected(self):
        user = await database_sync_to_async(User.objects.create_user)(
            username='user1', email='user1@test.com', password='Password123!'
        )
        token = str(AccessToken.for_user(user))
        channel = await database_sync_to_async(ChatChannel.objects.create)(name="Private Room")

        communicator = WebsocketCommunicator(application, f"/ws/chat/{channel.id}/?token={token}")
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_authorized_member_connect_and_send_message(self):
        user1 = await database_sync_to_async(User.objects.create_user)(
            username='user1', email='user1@test.com', password='Password123!'
        )
        user2 = await database_sync_to_async(User.objects.create_user)(
            username='user2', email='user2@test.com', password='Password123!'
        )
        token1 = str(AccessToken.for_user(user1))
        token2 = str(AccessToken.for_user(user2))

        channel = await database_sync_to_async(ChatChannel.objects.create)(name="Private Room")
        await database_sync_to_async(ChatMember.objects.create)(channel=channel, user=user1)
        await database_sync_to_async(ChatMember.objects.create)(channel=channel, user=user2)

        comm1 = WebsocketCommunicator(application, f"/ws/chat/{channel.id}/?token={token1}")
        connected1, _ = await comm1.connect()
        self.assertTrue(connected1)

        comm2 = WebsocketCommunicator(application, f"/ws/chat/{channel.id}/?token={token2}")
        connected2, _ = await comm2.connect()
        self.assertTrue(connected2)

        await comm1.send_json_to({
            'message_type': 'text',
            'text': 'Hello world real time!'
        })

        res1 = await comm1.receive_json_from()
        self.assertEqual(res1['text'], 'Hello world real time!')
        self.assertTrue(res1['self'])

        res2 = await comm2.receive_json_from()
        self.assertEqual(res2['text'], 'Hello world real time!')
        self.assertFalse(res2['self'])

        await comm1.disconnect()
        await comm2.disconnect()

    async def test_empty_message_rejected(self):
        user = await database_sync_to_async(User.objects.create_user)(
            username='user1', email='user1@test.com', password='Password123!'
        )
        token = str(AccessToken.for_user(user))
        channel = await database_sync_to_async(ChatChannel.objects.create)(name="Room")
        await database_sync_to_async(ChatMember.objects.create)(channel=channel, user=user)

        comm = WebsocketCommunicator(application, f"/ws/chat/{channel.id}/?token={token}")
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        await comm.send_json_to({'message_type': 'text', 'text': '   '})
        res = await comm.receive_json_from()
        self.assertIn('Cannot send empty message', res.get('error', ''))

        await comm.disconnect()

    async def test_overly_long_message_rejected(self):
        user = await database_sync_to_async(User.objects.create_user)(
            username='user_long', email='userlong@test.com', password='Password123!'
        )
        token = str(AccessToken.for_user(user))
        channel = await database_sync_to_async(ChatChannel.objects.create)(name="Room")
        await database_sync_to_async(ChatMember.objects.create)(channel=channel, user=user)

        comm = WebsocketCommunicator(application, f"/ws/chat/{channel.id}/?token={token}")
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        huge_text = 'A' * 10005
        await comm.send_json_to({'message_type': 'text', 'text': huge_text})
        res = await comm.receive_json_from()
        self.assertIn('Message exceeds maximum allowed length', res.get('error', ''))

        await comm.disconnect()


class ChatRestAPITests(TransactionTestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()

        self.donor1 = User.objects.create_user(username='donor1', email='donor1@test.com', password='Password123!', role='donor')
        self.donor2 = User.objects.create_user(username='donor2', email='donor2@test.com', password='Password123!', role='donor')
        self.ngo_user = User.objects.create_user(username='ngouser', email='ngo@test.com', password='Password123!', role='ngo')

        from ngo.models import NGO, VerificationStatus
        self.ngo = NGO.objects.create(
            user=self.ngo_user,
            name='Blank Location NGO',
            city='',
            state='',
            lat=20.5937,
            lng=78.9629,
            address='Facility Road',
            phone='9876543210',
            pin_code='440001',
            registration_number='REG-TEST-101',
            gov_registration_number='GOV-TEST-101',
            ngo_type='Trust',
            verification_status=VerificationStatus.APPROVED
        )

    def test_contacts_has_no_hardcoded_nagpur_fallback(self):
        self.client.force_authenticate(user=self.donor1)
        res = self.client.get('/api/chat/contacts/')
        self.assertEqual(res.status_code, 200)
        ngo_contact = next((c for c in res.data if c['id'] == self.ngo.id), None)
        self.assertIsNotNone(ngo_contact)
        self.assertEqual(ngo_contact['city'], '')
        self.assertEqual(ngo_contact['state'], '')

    def test_donor_cannot_start_chat_with_donor(self):
        self.client.force_authenticate(user=self.donor1)
        res = self.client.post('/api/chat/channels/', {'other_user_id': self.donor2.id})
        self.assertEqual(res.status_code, 403)
        self.assertIn('Donors can only start conversations with registered NGOs', res.data.get('error', ''))
