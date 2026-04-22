from datetime import datetime, timedelta, timezone as dt_timezone, date as date_type

from django.conf import settings
from django.shortcuts import redirect
from google_auth_oauthlib.flow import Flow
from googleapiclient.errors import HttpError
from loguru import logger
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import IntegrityError
from django.shortcuts import get_object_or_404

from api.models import CalendarBlacklist, GoogleCalendarToken, Task
from api.serializers import CalendarBlacklistSerializer, TaskSerializer
from api.services.google_calendar import list_user_calendars, pull_events, push_deadline

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
        except GoogleCalendarToken.DoesNotExist:
            return Response({"connected": False, "selected_calendar_id": None})

        # Proactively check if the token is still valid by attempting a refresh if expired
        from api.services.google_calendar import _build_credentials
        try:
            _build_credentials(token)
        except ValueError:
            # Token is expired/revoked — treat as disconnected so UI shows reconnect
            return Response({"connected": False, "selected_calendar_id": None})

        return Response({
            "connected": True,
            "selected_calendar_id": token.selected_calendar_id or "primary",
        })


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


class GoogleCalendarPullView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        today = date_type.today()
        raw_from = request.data.get("date_from")
        raw_to = request.data.get("date_to")

        try:
            date_from = date_type.fromisoformat(raw_from) if raw_from else today
            date_to = date_type.fromisoformat(raw_to) if raw_to else today + timedelta(days=7)
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if date_to < date_from:
            return Response(
                {"error": "date_to must be on or after date_from."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = pull_events(request.user, date_from, date_to)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except HttpError as e:
            logger.error(f"Google Calendar pull error for user {request.user.id}: {e}")
            return Response({"error": "Google Calendar API error."}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.error(f"Unexpected error pulling calendar for user {request.user.id}: {e}")
            return Response({"error": "Failed to pull events."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serialized_tasks = TaskSerializer(result["tasks"], many=True).data
        return Response({
            "imported": result["imported"],
            "skipped": result["skipped"],
            "tasks": serialized_tasks,
        }, status=status.HTTP_200_OK)


class BlacklistEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        google_event_id = request.data.get("google_event_id")
        if not google_event_id:
            return Response({"error": "google_event_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get("title", "")
        delete_task = bool(request.data.get("delete_task", False))

        try:
            entry = CalendarBlacklist.objects.create(
                user=request.user,
                google_event_id=google_event_id,
                title=title,
            )
        except IntegrityError:
            return Response({"error": "Already blacklisted."}, status=status.HTTP_409_CONFLICT)

        if delete_task:
            Task.objects.filter(user=request.user, google_event_id=google_event_id).delete()

        return Response(CalendarBlacklistSerializer(entry).data, status=status.HTTP_201_CREATED)


class BlacklistListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = CalendarBlacklist.objects.filter(user=request.user).order_by("-created_at")
        return Response(CalendarBlacklistSerializer(entries, many=True).data)

    def delete(self, request, pk):
        entry = get_object_or_404(CalendarBlacklist, pk=pk, user=request.user)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PushDeadlineView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        task = get_object_or_404(Task, pk=task_id, user=request.user)

        if task.deadline_date is None:
            return Response({"error": "Task has no deadline_date set."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event_id = push_deadline(task, request.user)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except HttpError as e:
            logger.error(f"Google Calendar API error pushing deadline for task {task_id}: {e}")
            return Response({"error": "Google Calendar API error."}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.error(f"Unexpected error pushing deadline for task {task_id}: {e}")
            return Response({"error": "Unexpected error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        task.deadline_event_id = event_id
        task.save(update_fields=["deadline_event_id"])

        return Response(TaskSerializer(task, context={"request": request}).data, status=status.HTTP_200_OK)
