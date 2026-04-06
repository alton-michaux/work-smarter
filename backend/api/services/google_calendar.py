from datetime import datetime, timedelta, timezone as dt_timezone

from django.conf import settings
from django.utils import timezone
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from loguru import logger


SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _build_credentials(token_record) -> Credentials:
    creds = Credentials(
        token=token_record.access_token,
        refresh_token=token_record.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_OAUTH2_CLIENT_ID,
        client_secret=settings.GOOGLE_OAUTH2_CLIENT_SECRET,
        scopes=SCOPES,
    )
    creds.expiry = token_record.token_expiry.replace(tzinfo=None)

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_record.access_token = creds.token
        token_record.token_expiry = datetime.utcnow().replace(tzinfo=dt_timezone.utc) + timedelta(hours=1)
        token_record.save(update_fields=["access_token", "token_expiry"])

    return creds


def get_calendar_service(user):
    from api.models import GoogleCalendarToken

    try:
        token_record = GoogleCalendarToken.objects.get(user=user)
    except GoogleCalendarToken.DoesNotExist:
        raise ValueError("User has not connected Google Calendar.")

    creds = _build_credentials(token_record)
    return build("calendar", "v3", credentials=creds), token_record


def list_user_calendars(user):
    service, _ = get_calendar_service(user)
    result = service.calendarList().list().execute()
    return [
        {"id": cal["id"], "summary": cal.get("summary", cal["id"])}
        for cal in result.get("items", [])
    ]


def _build_event_body(task) -> dict:
    date_str = str(task.begin_date)

    if task.begin_time:
        start_dt = f"{date_str}T{task.begin_time.strftime('%H:%M:%S')}"
        if task.end_time:
            end_dt = f"{date_str}T{task.end_time.strftime('%H:%M:%S')}"
        else:
            end_time = (
                datetime.combine(task.begin_date, task.begin_time) + timedelta(hours=1)
            ).time()
            end_dt = f"{date_str}T{end_time.strftime('%H:%M:%S')}"
        start = {"dateTime": start_dt, "timeZone": "UTC"}
        end = {"dateTime": end_dt, "timeZone": "UTC"}
    else:
        start = {"date": date_str}
        end = {"date": date_str}

    return {
        "summary": task.title,
        "description": task.description or "",
        "start": start,
        "end": end,
    }


def push_meeting(task, user) -> str:
    if task.category != "meeting":
        raise ValueError("Only meetings can be pushed to Google Calendar.")

    if task.begin_date is None:
        raise ValueError("Meeting must have a begin_date to push to Google Calendar.")

    service, token_record = get_calendar_service(user)
    calendar_id = token_record.selected_calendar_id or "primary"
    event_body = _build_event_body(task)

    try:
        if task.google_event_id:
            event = (
                service.events()
                .update(calendarId=calendar_id, eventId=task.google_event_id, body=event_body)
                .execute()
            )
            logger.info(f"Updated Google Calendar event {event['id']} for task {task.id}")
        else:
            event = (
                service.events()
                .insert(calendarId=calendar_id, body=event_body)
                .execute()
            )
            logger.info(f"Created Google Calendar event {event['id']} for task {task.id}")
    except HttpError as e:
        logger.error(f"Google Calendar API error for task {task.id}: {e}")
        raise

    return event["id"]
