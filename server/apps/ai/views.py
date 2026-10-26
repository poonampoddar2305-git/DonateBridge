from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import DonationAssistantRequestSerializer
from .services.donation_intent import DonationIntentProcessor
from .services.ollama_service import OllamaService

class AIHealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        ollama = OllamaService()
        status_info = ollama.get_status()
        is_ollama = status_info["engine"] == "ollama"
        return Response({
            "status": "ok",
            "available": True,
            "engine": status_info["engine"],
            "model": status_info["model"],
            "base_url": ollama.base_url,
            "ollama_available": is_ollama,
            "installed_models": status_info.get("installed_models", []),
            "message": f"Ollama ({status_info['model']}) active" if is_ollama else "Embedded RAG & Smart Match Engine active"
        }, status=status.HTTP_200_OK)


class DonationAssistantView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = DonationAssistantRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        message = validated_data['message'].strip()
        if not message:
            return Response({"message": ["Message cannot be empty or whitespace only."]}, status=status.HTTP_400_BAD_REQUEST)

        lat = validated_data.get('lat')
        lng = validated_data.get('lng')
        history = validated_data.get('history', [])

        user_location = None
        if lat is not None and lng is not None:
            user_location = {'lat': lat, 'lng': lng}

        try:
            processor = DonationIntentProcessor()
            result = processor.process_message(message, user_location, history)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "answer": "AI Assistant is temporarily unavailable. Please try again.",
                "status": "unavailable",
                "intent": "general",
                "error": str(e)
            }, status=status.HTTP_200_OK)

