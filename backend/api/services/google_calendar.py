from datetime import datetime, timedelta, timezone as dt_timezone, date as date_type

from django.conf import settings
from django.utils import timezone
from google.auth.exceptions import RefreshError
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
        try:
            creds.refresh(Request())
        except RefreshError as e:
            logger.warning(f"Google token refresh failed for user, marking token invalid: {e}")
            raise ValueError("Google Calendar token has expired or been revoked. Please reconnect.")
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


def _get_calendar_timezone(service, calendar_id) -> str:
    try:
        cal = service.calendars().get(calendarId=calendar_id).execute()
        return cal.get("timeZone", "UTC")
    except HttpError:
        return "UTC"


def _build_event_body(task, tz: str = "UTC") -> dict:
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
        start = {"dateTime": start_dt, "timeZone": tz}
        end = {"dateTime": end_dt, "timeZone": tz}
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
    tz = _get_calendar_timezone(service, calendar_id)
    event_body = _build_event_body(task, tz)

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


def _parse_google_event_datetime(dt_field: dict):
    """Return (date, time_or_None) from a Google Calendar start/end dict."""
    if "dateTime" in dt_field:
        dt = datetime.fromisoformat(dt_field["dateTime"])
        return dt.date(), dt.time().replace(second=0, microsecond=0)
    # All-day event
    return date_type.fromisoformat(dt_field["date"]), None


def _match_project(title: str, projects) -> object | None:
    """
    Return the project whose name appears in *title* (case-insensitive).
    If multiple names match, the longest (most specific) wins.
    Returns None if no project name is found in the title.
    """
    title_lower = title.lower()
    best = None
    for project in projects:
        name_lower = project.name.lower()
        if name_lower in title_lower:
            if best is None or len(name_lower) > len(best.name):
                best = project
    return best


def pull_events(user, date_from: date_type, date_to: date_type) -> dict:
    """
    Fetch events from the user's selected Google Calendar between date_from
    and date_to (inclusive) and create Task records for any that don't already
    exist (matched by google_event_id).

    Project auto-assignment: if a project name (case-insensitive) appears in
    the event title, the task is assigned to that project. The longest matching
    project name wins when multiple match.

    Returns {"imported": N, "skipped": N, "tasks": [<serialized tasks>]}
    """
    from api.models import Project, Task

    service, token_record = get_calendar_service(user)
    calendar_id = token_record.selected_calendar_id or "primary"

    time_min = datetime.combine(date_from, datetime.min.time()).replace(tzinfo=dt_timezone.utc).isoformat()
    time_max = datetime.combine(date_to, datetime.max.time()).replace(tzinfo=dt_timezone.utc).isoformat()

    try:
        result = (
            service.events()
            .list(
                calendarId=calendar_id,
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
    except HttpError as e:
        logger.error(f"Google Calendar API error pulling events for user {user.id}: {e}")
        raise

    events = result.get("items", [])
    existing_ids = set(
        Task.objects.filter(user=user, google_event_id__isnull=False)
        .values_list("google_event_id", flat=True)
    )
    user_projects = list(Project.objects.filter(user=user))

    imported = 0
    skipped = 0
    created_tasks = []

    for event in events:
        event_id = event.get("id")
        if not event_id or event.get("status") == "cancelled":
            skipped += 1
            continue

        if event_id in existing_ids:
            skipped += 1
            continue

        start = event.get("start", {})
        end = event.get("end", {})

        begin_date, begin_time = _parse_google_event_datetime(start)
        _, end_time = _parse_google_event_datetime(end)

        title = event.get("summary") or "(No title)"
        project = _match_project(title, user_projects)

        task = Task.objects.create(
            user=user,
            title=title,
            description=event.get("description") or "",
            category="meeting",
            begin_date=begin_date,
            begin_time=begin_time,
            end_time=end_time,
            google_event_id=event_id,
            is_done=False,
            project=project,
        )
        created_tasks.append(task)
        existing_ids.add(event_id)
        imported += 1
        logger.info(f"Pulled Google Calendar event {event_id} as task {task.id} for user {user.id}")

    return {"imported": imported, "skipped": skipped, "tasks": created_tasks}
