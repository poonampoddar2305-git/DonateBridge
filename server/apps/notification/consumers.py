import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')

        # 1. Reject anonymous connections
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return

        # 2. Join isolated user group
        self.group_name = f'user_{self.user.id}'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def notification_message(self, event):
        notification_data = event.get('notification', {})
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': notification_data
        }))
