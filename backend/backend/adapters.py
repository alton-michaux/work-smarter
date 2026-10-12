from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from dj_rest_auth.serializers import UserDetailsSerializer
from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


PENDING_APPROVAL_URL = f"{settings.FRONTEND_URL}/login?error=pending"


class ApprovalAccountAdapter(DefaultAccountAdapter):
    """Access is invite-only for now: self-service signups start inactive.

    `is_active` doubles as the approval flag, so every auth path (password
    login, JWT refresh/auth, social login) already refuses pending users.
    Approve them in Django admin.
    """

    def save_user(self, request, user, form, commit=True):
        user.is_active = False
        return super().save_user(request, user, form, commit=commit)

    def respond_user_inactive(self, request, user):
        # Send pending users back to the frontend rather than allauth's own
        # server-rendered "account inactive" page.
        return redirect(PENDING_APPROVAL_URL)


class WorkSmarterSocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        # Auto-signup skips the account adapter's save_user, so mark new
        # social accounts pending here too.
        sociallogin.user.is_active = False
        return super().save_user(request, sociallogin, form)

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


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'
