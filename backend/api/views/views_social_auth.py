from django.views import View
from django.shortcuts import redirect
from django.contrib.auth import logout
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken


class SocialAuthCompleteView(View):
    def get(self, request):
        user = request.user
        if not user.is_authenticated:
            return redirect(f"{settings.FRONTEND_URL}/login?error=auth_failed")
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        logout(request)
        return redirect(f"{settings.FRONTEND_URL}/auth/callback?access={access}")
