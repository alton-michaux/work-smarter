from allauth.account.adapter import DefaultAccountAdapter
from dj_rest_auth.serializers import UserDetailsSerializer


class NoVerifyEmailAdapter(DefaultAccountAdapter):
    def send_confirmation_mail(self, request, emailconfirmation, signup):
        print("sending confirmation email")
        emailconfirmation.confirm(request)  # Auto-confirm email


class WritableEmailUserSerializer(UserDetailsSerializer):
    """Extends the default dj_rest_auth serializer to allow email updates."""
    class Meta(UserDetailsSerializer.Meta):
        fields = ('pk', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = ('pk',)
