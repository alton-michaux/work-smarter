from rest_framework import mixins, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from api.models import PersonalAPIToken
from api.serializers import PersonalAPITokenSerializer


class PersonalAPITokenViewSet(
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Create, list and revoke the requesting user's API keys.

    `authentication_classes` omits PersonalAPITokenAuthentication on purpose: a
    key must never be able to mint or revoke another key — least of all widen
    its own scope — so key management is reachable only from a logged-in session.
    """

    serializer_class = PersonalAPITokenSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = None

    MAX_TOKENS_PER_USER = 10

    def get_queryset(self):
        return PersonalAPIToken.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        if self.get_queryset().count() >= self.MAX_TOKENS_PER_USER:
            return Response(
                {
                    "error": (
                        f"Limit of {self.MAX_TOKENS_PER_USER} API keys reached. "
                        "Revoke an existing key first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        scope = str(request.data.get("scope") or PersonalAPIToken.SCOPE_READ)
        valid_scopes = [value for value, _label in PersonalAPIToken.SCOPE_CHOICES]
        if scope not in valid_scopes:
            return Response(
                {"scope": f"Expected one of: {', '.join(valid_scopes)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = str(request.data.get("name") or "").strip()[:100]
        token, raw_key = PersonalAPIToken.generate(request.user, name=name, scope=scope)

        data = self.get_serializer(token).data
        # The only time the secret is ever returned; it is not recoverable later.
        data["key"] = raw_key
        return Response(data, status=status.HTTP_201_CREATED)
