from django.conf import settings
from django.middleware.csrf import get_token
from dj_rest_auth.registration.views import RegisterView
from dj_rest_auth.views import PasswordResetView
from rest_framework import status
from rest_framework.authentication import CSRFCheck
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings as simplejwt_settings
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from backend.adapters import EmailTokenObtainPairSerializer


def _cookie_kwargs():
    cfg = settings.REST_AUTH
    return {
        "secure": cfg.get("JWT_AUTH_SECURE", not settings.DEBUG),
        "httponly": cfg.get("JWT_AUTH_HTTPONLY", True),
        "samesite": cfg.get("JWT_AUTH_SAMESITE", "Lax"),
    }


def set_jwt_cookies(response, access=None, refresh=None):
    """Write the access/refresh JWTs as httpOnly cookies instead of the response body."""
    cfg = settings.REST_AUTH
    kwargs = _cookie_kwargs()

    if access is not None and cfg.get("JWT_AUTH_COOKIE"):
        response.set_cookie(
            cfg["JWT_AUTH_COOKIE"],
            str(access),
            max_age=int(simplejwt_settings.ACCESS_TOKEN_LIFETIME.total_seconds()),
            path="/",
            **kwargs,
        )
    if refresh is not None and cfg.get("JWT_AUTH_REFRESH_COOKIE"):
        response.set_cookie(
            cfg["JWT_AUTH_REFRESH_COOKIE"],
            str(refresh),
            max_age=int(simplejwt_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
            path=cfg["JWT_AUTH_REFRESH_COOKIE_PATH"],
            **kwargs,
        )


def unset_jwt_cookies(response):
    cfg = settings.REST_AUTH
    if cfg.get("JWT_AUTH_COOKIE"):
        response.delete_cookie(cfg["JWT_AUTH_COOKIE"], path="/")
    if cfg.get("JWT_AUTH_REFRESH_COOKIE"):
        response.delete_cookie(cfg["JWT_AUTH_REFRESH_COOKIE"], path=cfg["JWT_AUTH_REFRESH_COOKIE_PATH"])


def _csrf_failure_reason(request):
    """Manually run Django's CSRF check.

    DRF's APIView.as_view() marks the dispatch csrf_exempt at the Django
    level, so views that don't authenticate via a cookie (like this one,
    which is anonymous until the refresh token is validated) never get the
    CSRF enforcement that JWTCookieAuthentication provides for authenticated
    cookie requests. Without this, an attacker's cross-site form could POST
    here and silently mint fresh cookies for the victim.
    """
    check = CSRFCheck(lambda r: None)
    check.process_request(request)
    return check.process_view(request, None, (), {})


class CookieTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access = response.data.pop("access", None)
            refresh = response.data.pop("refresh", None)
            set_jwt_cookies(response, access, refresh)
            response.data = {"detail": "Login successful."}
        return response


class CookieTokenRefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "token_refresh"

    def post(self, request, *args, **kwargs):
        reason = _csrf_failure_reason(request)
        if reason:
            return Response({"detail": f"CSRF Failed: {reason}"}, status=status.HTTP_403_FORBIDDEN)

        refresh_cookie_name = settings.REST_AUTH.get("JWT_AUTH_REFRESH_COOKIE")
        raw_refresh = request.COOKIES.get(refresh_cookie_name)
        if not raw_refresh:
            return Response({"detail": "Refresh token cookie missing."}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        data["refresh"] = raw_refresh

        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        access = serializer.validated_data.get("access")
        new_refresh = serializer.validated_data.get("refresh", raw_refresh)

        response = Response({"detail": "Refreshed."}, status=status.HTTP_200_OK)
        set_jwt_cookies(response, access, new_refresh)
        return response


class CsrfCookieView(APIView):
    """Seeds the CSRF cookie for the frontend to read before any mutating request."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        get_token(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class IPScopedRateThrottle(ScopedRateThrottle):
    """ScopedRateThrottle that always keys on client IP.

    The stock class keys authenticated requests by user id. Registration
    sets auth cookies on success, so a client that keeps its cookies would
    make each next signup as the account it just created — a fresh,
    empty throttle bucket every time, never hitting the limit.
    """

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class ThrottledRegisterView(RegisterView):
    throttle_classes = [IPScopedRateThrottle]
    throttle_scope = "registration"

    def create(self, request, *args, **kwargs):
        # dj-rest-auth's stock RegisterView puts access/refresh in the
        # response body (its own cookie-setting, if any, is a separate,
        # additive mechanism) — strip them the same way login does, so a
        # fresh signup doesn't leak a JS-readable token at the one moment
        # this migration is specifically trying to close off.
        response = super().create(request, *args, **kwargs)
        if isinstance(response.data, dict):
            access = response.data.pop("access", None)
            refresh = response.data.pop("refresh", None)
            if access or refresh:
                set_jwt_cookies(response, access, refresh)
                response.data = {"detail": "Registration successful."}
        return response


class ThrottledPasswordResetView(PasswordResetView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"
