from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from dj_rest_auth.serializers import UserDetailsSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class NoVerifyEmailAdapter(DefaultAccountAdapter):
    def send_confirmation_mail(self, request, emailconfirmation, signup):
        print("sending confirmation email")
        emailconfirmation.confirm(request)  # Auto-confirm email


class WorkSmarterSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        if sociallogin.is_existing:
            return

        email = sociallogin.account.extra_data.get('email', '')
        if not email:
            return

        try:
            user = User.objects.get(email=email)
            sociallogin.connect(request, user)
        except User.DoesNotExist:
            pass


class WritableEmailUserSerializer(UserDetailsSerializer):
    """Extends the default dj_rest_auth serializer to allow email updates."""
    class Meta(UserDetailsSerializer.Meta):
        fields = ('pk', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = ('pk',)
