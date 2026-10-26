from django.urls import path
from .views import ChannelListView, MessageListView, AvailableContactsView

urlpatterns = [
    path('chat/contacts/', AvailableContactsView.as_view(), name='chat_contacts'),
    path('chat/channels/', ChannelListView.as_view(), name='channel_list'),
    path('chat/channels/<int:channel_id>/messages/', MessageListView.as_view(), name='channel_messages'),
]

