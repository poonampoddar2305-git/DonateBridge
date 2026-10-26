import urllib.parse
from django.conf import settings
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import AnonymousUser

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token_key):
    try:
        access_token = AccessToken(token_key)
        user_id_claim = settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id') if hasattr(settings, 'SIMPLE_JWT') else 'user_id'
        user_id = access_token[user_id_claim]
        user = User.objects.get(id=user_id)
        return user
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError, Exception):
        return AnonymousUser()

class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = urllib.parse.parse_qs(query_string)
        token_key = query_params.get("token", [None])[0]

        if not token_key:
            headers = dict(scope.get("headers", []))
            if b"authorization" in headers:
                auth_header = headers[b"authorization"].decode("utf-8")
                if auth_header.startswith("Bearer "):
                    token_key = auth_header.split(" ")[1]

        if token_key:
            scope["user"] = await get_user_from_token(token_key)
        else:
            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)
