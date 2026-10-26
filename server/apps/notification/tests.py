from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from core.asgi import application
from notification.models import Notification

User = get_user_model()

class NotificationWebSocketTests(TransactionTestCase):
    async def test_anonymous_notification_websocket_rejected(self):
        communicator = WebsocketCommunicator(application, "/ws/notifications/")
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_notification_user_isolation(self):
        user_a = await database_sync_to_async(User.objects.create_user)(
            username='user_a', email='usera@test.com', password='Password123!'
        )
        user_b = await database_sync_to_async(User.objects.create_user)(
            username='user_b', email='userb@test.com', password='Password123!'
        )
        token_a = str(AccessToken.for_user(user_a))
        token_b = str(AccessToken.for_user(user_b))

        comm_a = WebsocketCommunicator(application, f"/ws/notifications/?token={token_a}")
        connected_a, _ = await comm_a.connect()
        self.assertTrue(connected_a)

        comm_b = WebsocketCommunicator(application, f"/ws/notifications/?token={token_b}")
        connected_b, _ = await comm_b.connect()
        self.assertTrue(connected_b)

        # Create notification for User A
        notif_a = await database_sync_to_async(Notification.objects.create)(
            user=user_a,
            notification_type="match",
            title="Match Alert",
            message="Your donation was matched!"
        )

        # User A receives real-time notification
        res_a = await comm_a.receive_json_from()
        self.assertEqual(res_a['type'], 'notification')
        self.assertEqual(res_a['notification']['title'], "Match Alert")

        # User B should NOT receive anything
        has_msg = await comm_b.receive_nothing()
        self.assertTrue(has_msg)

        await comm_a.disconnect()
        await comm_b.disconnect()

    async def test_chat_message_triggers_realtime_notification_for_recipient(self):
        from chat.models import ChatChannel, ChatMember, ChatMessage

        user_sender = await database_sync_to_async(User.objects.create_user)(
            username='sender_user', email='sender@test.com', password='Password123!'
        )
        user_recipient = await database_sync_to_async(User.objects.create_user)(
            username='recipient_user', email='recipient@test.com', password='Password123!'
        )
        token_recipient = str(AccessToken.for_user(user_recipient))

        # Recipient is connected to notification websocket
        comm_recipient = WebsocketCommunicator(application, f"/ws/notifications/?token={token_recipient}")
        connected, _ = await comm_recipient.connect()
        self.assertTrue(connected)

        # Create channel and members
        channel = await database_sync_to_async(ChatChannel.objects.create)(name="Direct Chat")
        await database_sync_to_async(ChatMember.objects.create)(channel=channel, user=user_sender)
        await database_sync_to_async(ChatMember.objects.create)(channel=channel, user=user_recipient)

        # Sender posts a chat message
        await database_sync_to_async(ChatMessage.objects.create)(
            channel=channel, sender=user_sender, text="Hello recipient! Are the donations ready?"
        )

        # Recipient should receive real-time notification
        notif_msg = await comm_recipient.receive_json_from()
        self.assertEqual(notif_msg['type'], 'notification')
        self.assertEqual(notif_msg['notification']['notification_type'], 'chat')
        self.assertIn("sender_user", notif_msg['notification']['title'])
        self.assertIn("Hello recipient!", notif_msg['notification']['message'])

        await comm_recipient.disconnect()


class NotificationRestAPITests(TransactionTestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.user = User.objects.create_user(username='apiuser', email='apiuser@test.com', password='Password123!')
        self.client.force_authenticate(user=self.user)

        self.notif_chat = Notification.objects.create(
            user=self.user, notification_type='chat', title='Chat 1', message='Chat body'
        )
        self.notif_delivery = Notification.objects.create(
            user=self.user, notification_type='delivery', title='Delivery 1', message='Delivery body'
        )

    def test_list_notifications_with_type_filter(self):
        res_all = self.client.get('/api/notifications/')
        self.assertEqual(res_all.status_code, 200)
        self.assertEqual(len(res_all.data), 2)

        res_chat = self.client.get('/api/notifications/?type=chat')
        self.assertEqual(res_chat.status_code, 200)
        self.assertEqual(len(res_chat.data), 1)
        self.assertEqual(res_chat.data[0]['notification_type'], 'chat')

    def test_mark_single_notification_read(self):
        res = self.client.patch(f'/api/notifications/{self.notif_chat.id}/read/')
        self.assertEqual(res.status_code, 200)
        self.notif_chat.refresh_from_db()
        self.assertTrue(self.notif_chat.is_read)

    def test_mark_all_notifications_read(self):
        res = self.client.post('/api/notifications/mark-all-read/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(Notification.objects.filter(user=self.user, is_read=False).exists())
