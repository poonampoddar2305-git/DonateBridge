import json
import random
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatChannel, ChatMember, ChatMessage

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        kwargs = self.scope['url_route']['kwargs']
        self.channel_id = kwargs.get('channel_id') or kwargs.get('room_id')
        self.room_group_name = f'chat_{self.channel_id}'
        self.user = self.scope.get('user')

        # 1. Reject anonymous connections
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return

        # 2. Check channel membership authorization
        is_member = await self.is_channel_member(self.channel_id, self.user)
        if not is_member:
            await self.close(code=4003)
            return

        # 3. Join room group and accept connection
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'error': 'Invalid JSON format'}))
            return
        
        message_type = text_data_json.get('message_type', 'text')
        text = text_data_json.get('text', '').strip()
        media_url = text_data_json.get('media_url')
        lat = text_data_json.get('lat')
        lng = text_data_json.get('lng')

        # Reject empty text messages or overly long messages
        if message_type == 'text' and not text:
            await self.send(text_data=json.dumps({'error': 'Cannot send empty message'}))
            return

        if len(text) > 10000:
            await self.send(text_data=json.dumps({'error': 'Message exceeds maximum allowed length.'}))
            return

        try:
            msg_obj = await self.save_message(
                channel_id=self.channel_id,
                sender=self.user,
                message_type=message_type,
                text=text,
                media_url=media_url,
                lat=lat,
                lng=lng
            )
        except Exception as e:
            await self.send(text_data=json.dumps({'error': 'Failed to save message to database'}))
            return

        sender_avatar = getattr(self.user, 'avatar', None)
        message_dict = {
            'id': msg_obj.id,
            'sender_id': self.user.id,
            'sender_name': self.user.username or self.user.email,
            'sender_avatar': sender_avatar if isinstance(sender_avatar, str) else None,
            'message_type': msg_obj.message_type,
            'text': msg_obj.text,
            'media_url': msg_obj.media_url,
            'lat': float(msg_obj.lat) if msg_obj.lat is not None else None,
            'lng': float(msg_obj.lng) if msg_obj.lng is not None else None,
            'is_delivered': msg_obj.is_delivered,
            'is_read': msg_obj.is_read,
            'time': msg_obj.created_at.strftime("%I:%M %p"),
            'status': 'sent'
        }

        # Broadcast message to channel room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message_dict': message_dict
            }
        )

    async def chat_message(self, event):
        message_dict = dict(event['message_dict'])
        # Compute 'self' dynamically per connected client
        message_dict['self'] = (message_dict['sender_id'] == self.user.id)
        
        if not message_dict['self']:
            message_dict['status'] = 'delivered'

        await self.send(text_data=json.dumps(message_dict))

    @database_sync_to_async
    def is_channel_member(self, channel_id, user):
        return ChatMember.objects.filter(channel_id=channel_id, user=user).exists()

    @database_sync_to_async
    def save_message(self, channel_id, sender, message_type, text, media_url, lat, lng):
        msg = ChatMessage.objects.create(
            channel_id=channel_id,
            sender=sender,
            message_type=message_type,
            text=text,
            media_url=media_url,
            lat=lat,
            lng=lng,
            is_delivered=True,
            is_read=False
        )
        return msg

    @database_sync_to_async
    def trigger_mock_reply(self, channel_id, current_user):
        # Auto-message disabled as requested by user
        return None
