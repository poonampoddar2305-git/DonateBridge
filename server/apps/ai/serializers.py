from rest_framework import serializers

class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField(max_length=2000)

class DonationAssistantRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, required=True)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    history = ChatMessageSerializer(many=True, required=False, default=list)
