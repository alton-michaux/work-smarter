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
    """Create, list and revoke the requesting user's read-only API keys.

    `authentication_classes` omits PersonalAPITokenAuthentication on purpose: a
    key must never be able to mint or revoke another key, so key management is
    reachable only from a logged-in session.
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

        name = str(request.data.get("name") or "").strip()[:100]
        token, raw_key = PersonalAPIToken.generate(request.user, name=name)

        data = self.get_serializer(token).data
        # The only time the secret is ever returned; it is not recoverable later.
        data["key"] = raw_key
        return Response(data, status=status.HTTP_201_CREATED)
