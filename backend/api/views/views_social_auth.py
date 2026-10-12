from django.views import View
from django.shortcuts import redirect
from django.contrib.auth import logout
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from api.views.views_auth import set_jwt_cookies
from backend.adapters import PENDING_APPROVAL_URL


class SocialAuthCompleteView(View):
    def get(self, request):
        user = request.user
        if not user.is_authenticated:
            return redirect(f"{settings.FRONTEND_URL}/login?error=auth_failed")
        if not user.is_active:
            logout(request)
            return redirect(PENDING_APPROVAL_URL)
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        logout(request)
        response = redirect(f"{settings.FRONTEND_URL}/auth/callback")
        set_jwt_cookies(response, access, str(refresh))
        return response
