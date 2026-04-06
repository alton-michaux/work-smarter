from datetime import datetime, timedelta, timezone as dt_timezone

from django.conf import settings
from django.shortcuts import redirect
from google_auth_oauthlib.flow import Flow
from loguru import logger
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import GoogleCalendarToken
from api.services.google_calendar import list_user_calendars

SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _build_flow(state=None):
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_OAUTH2_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH2_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_OAUTH2_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        state=state,
    )
    flow.redirect_uri = settings.GOOGLE_OAUTH2_REDIRECT_URI
    return flow


class GoogleOAuthInitView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        flow = _build_flow()
        auth_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )
        # Encode user ID in state so callback can identify the user
        state_with_user = f"{state}:{request.user.id}"
        auth_url = auth_url.replace(state, state_with_user)
        return Response({"auth_url": auth_url})


class GoogleOAuthCallbackView(APIView):
    permission_classes = []  # Google redirects here, no JWT in this request

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state", "")
        error = request.query_params.get("error")

        if error:
            logger.warning(f"Google OAuth error: {error}")
            return redirect(f"{settings.FRONTEND_URL}/settings?calendar_error={error}")

        if not code:
            return redirect(f"{settings.FRONTEND_URL}/settings?calendar_error=missing_code")

        # Extract user ID from state
        try:
            _, user_id_str = state.rsplit(":", 1)
            user_id = int(user_id_str)
        except (ValueError, AttributeError):
            return redirect(f"{settings.FRONTEND_URL}/settings?calendar_error=invalid_state")

        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return redirect(f"{settings.FRONTEND_URL}/settings?calendar_error=user_not_found")

        # Exchange code for tokens
        base_state = state.rsplit(":", 1)[0]
        flow = _build_flow(state=base_state)
        try:
            flow.fetch_token(code=code)
        except Exception as e:
            logger.error(f"Token exchange failed: {e}")
            return redirect(f"{settings.FRONTEND_URL}/settings?calendar_error=token_exchange_failed")

        creds = flow.credentials
        expiry = creds.expiry or (datetime.now(tz=dt_timezone.utc) + timedelta(hours=1))
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=dt_timezone.utc)

        GoogleCalendarToken.objects.update_or_create(
            user=user,
            defaults={
                "access_token": creds.token,
                "refresh_token": creds.refresh_token or "",
                "token_expiry": expiry,
            },
        )

        return redirect(f"{settings.FRONTEND_URL}/settings?calendar_connected=true")


class GoogleCalendarStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            token = GoogleCalendarToken.objects.get(user=request.user)
            return Response({
                "connected": True,
                "selected_calendar_id": token.selected_calendar_id or "primary",
            })
        except GoogleCalendarToken.DoesNotExist:
            return Response({"connected": False, "selected_calendar_id": None})


class GoogleCalendarListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            calendars = list_user_calendars(request.user)
            return Response(calendars)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error listing calendars for user {request.user.id}: {e}")
            return Response({"error": "Failed to fetch calendars."}, status=status.HTTP_502_BAD_GATEWAY)


class GoogleCalendarSelectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        calendar_id = request.data.get("calendar_id")
        if not calendar_id:
            return Response({"error": "calendar_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        updated = GoogleCalendarToken.objects.filter(user=request.user).update(
            selected_calendar_id=calendar_id
        )
        if not updated:
            return Response({"error": "Google Calendar not connected."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"selected_calendar_id": calendar_id})
