from datetime import timedelta

from django.utils import timezone
from rest_framework import authentication, exceptions

from api.models import PersonalAPIToken

# `last_used_at` is a convenience for the user, not an audit log, so it is only
# rewritten once it is this stale — otherwise every read would cost a write.
LAST_USED_RESOLUTION = timedelta(minutes=1)


class PersonalAPITokenAuthentication(authentication.BaseAuthentication):
    """Authenticates ``Authorization: Api-Key ws_live_<public_id>.<secret>``.

    Deliberately absent from DEFAULT_AUTHENTICATION_CLASSES: it is attached only
    to the read-only v1 viewsets, so a leaked key cannot reach the app's own
    read/write endpoints or mint further keys.
    """

    keyword = "Api-Key"

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if not header or header[0].lower() != self.keyword.lower().encode():
            return None

        if len(header) != 2:
            raise exceptions.AuthenticationFailed(
                "Invalid Api-Key header. Expected 'Api-Key <key>'."
            )

        try:
            raw_key = header[1].decode()
        except UnicodeError:
            raise exceptions.AuthenticationFailed("Invalid API key.")

        token = self._resolve(raw_key)
        self._touch(token)
        return (token.user, token)

    def authenticate_header(self, request):
        return self.keyword

    def _resolve(self, raw_key):
        prefix = PersonalAPIToken.PREFIX
        if not raw_key.startswith(prefix):
            raise exceptions.AuthenticationFailed("Invalid API key.")

        public_id, separator, secret = raw_key[len(prefix):].partition(".")
        if not separator or not secret:
            raise exceptions.AuthenticationFailed("Invalid API key.")

        try:
            token = PersonalAPIToken.objects.select_related("user").get(public_id=public_id)
        except PersonalAPIToken.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid API key.")

        if not token.secret_matches(secret):
            raise exceptions.AuthenticationFailed("Invalid API key.")

        if not token.user.is_active:
            raise exceptions.AuthenticationFailed("User inactive or deleted.")

        return token

    @staticmethod
    def _touch(token):
        now = timezone.now()
        if token.last_used_at and now - token.last_used_at < LAST_USED_RESOLUTION:
            return
        token.last_used_at = now
        token.save(update_fields=["last_used_at"])
