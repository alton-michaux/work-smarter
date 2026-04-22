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


_BYDAY_MAP = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}


def _parse_rrule(rrule_string: str, start_date) -> dict:
    """
    Parse a Google Calendar RRULE string into RecurringTask field values.
    Returns a dict with 'frequency' and 'day_of_week'.
    """
    rule = rrule_string.replace("RRULE:", "")
    parts = dict(p.split("=", 1) for p in rule.split(";") if "=" in p)

    freq = parts.get("FREQ", "").lower()
    interval = int(parts.get("INTERVAL", "1"))
    byday = parts.get("BYDAY", "")

    day_of_week = None
    if byday:
        # Strip ordinal prefixes like "1MO" → "MO"
        day_code = "".join(c for c in byday[:3] if c.isalpha())[:2]
        day_of_week = _BYDAY_MAP.get(day_code)

    if freq == "daily":
        frequency = "daily"
    elif freq == "weekly" and interval == 2:
        frequency = "biweekly"
        if day_of_week is None:
            day_of_week = start_date.weekday()
    elif freq == "weekly":
        frequency = "weekly"
        if day_of_week is None:
            day_of_week = start_date.weekday()
    elif freq == "monthly" and interval == 3:
        frequency = "quarterly"
    elif freq == "monthly":
        frequency = "monthly"
    else:
        frequency = "weekly"

    return {"frequency": frequency, "day_of_week": day_of_week}


def _fetch_recurring_task_map(service, calendar_id, recurring_event_ids: set, user, user_projects) -> dict:
    """
    For each Google recurring event ID, fetch the parent event, parse its RRULE,
    and get_or_create a RecurringTask. Returns a dict mapping google_recurring_event_id → RecurringTask.
    """
    from api.models import RecurringTask

    result = {}
    for parent_id in recurring_event_ids:
        try:
            parent = service.events().get(calendarId=calendar_id, eventId=parent_id).execute()
        except HttpError as e:
            logger.warning(f"Could not fetch parent event {parent_id}: {e}")
            continue

        recurrence_rules = parent.get("recurrence", [])
        rrule_string = next((r for r in recurrence_rules if r.startswith("RRULE:")), None)
        if not rrule_string:
            continue

        start = parent.get("start", {})
        start_date, _ = _parse_google_event_datetime(start)
        title = parent.get("summary") or "(No title)"
        description = parent.get("description") or ""
        project = _match_project(title, user_projects, description)
        rrule_fields = _parse_rrule(rrule_string, start_date)

        rt, created = RecurringTask.objects.get_or_create(
            google_recurring_event_id=parent_id,
            defaults={
                "user": user,
                "title": title,
                "category": "meeting",
                "start_date": start_date,
                "project": project,
                "is_active": True,
                **rrule_fields,
            },
        )
        result[parent_id] = rt
        if created:
            logger.info(f"Created RecurringTask {rt.id} for Google recurring event {parent_id}")

    return result


def _match_project(title: str, projects, description: str = "") -> object | None:
    """
    Return the project whose name appears in *title* or *description* (case-insensitive).
    If multiple names match, the longest (most specific) wins.
    Returns None if no project name is found.
    """
    haystack = f"{title} {description}".lower()
    best = None
    for project in projects:
        name_lower = project.name.lower()
        if name_lower in haystack:
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
    from api.models import CalendarBlacklist, Project, Task

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
    blacklisted_ids = set(
        CalendarBlacklist.objects.filter(user=user)
        .values_list("google_event_id", flat=True)
    )
    user_projects = list(Project.objects.filter(user=user))

    # Collect unique recurring parent IDs from new events so we can batch-fetch them
    new_events = [
        e for e in events
        if e.get("id")
        and e.get("status") != "cancelled"
        and e.get("eventType", "default") == "default"
        and e.get("id") not in existing_ids
        and e.get("id") not in blacklisted_ids
    ]
    recurring_parent_ids = {
        e["recurringEventId"] for e in new_events if e.get("recurringEventId")
    }
    recurring_task_map = _fetch_recurring_task_map(
        service, calendar_id, recurring_parent_ids, user, user_projects
    ) if recurring_parent_ids else {}

    imported = 0
    skipped = 0
    created_tasks = []

    for event in events:
        event_id = event.get("id")
        if not event_id or event.get("status") == "cancelled":
            skipped += 1
            continue

        if event.get("eventType", "default") != "default":
            skipped += 1
            continue

        if event_id in existing_ids or event_id in blacklisted_ids:
            skipped += 1
            continue

        start = event.get("start", {})
        end = event.get("end", {})

        begin_date, begin_time = _parse_google_event_datetime(start)
        _, end_time = _parse_google_event_datetime(end)

        title = event.get("summary") or "(No title)"
        description = event.get("description") or ""
        project = _match_project(title, user_projects, description)
        recurring_task = recurring_task_map.get(event.get("recurringEventId"))

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
            recurring_task=recurring_task,
        )
        created_tasks.append(task)
        existing_ids.add(event_id)
        imported += 1
        logger.info(f"Pulled Google Calendar event {event_id} as task {task.id} for user {user.id}")

    return {"imported": imported, "skipped": skipped, "tasks": created_tasks}


def push_deadline(task, user) -> str:
    """
    Push (or update) the task's deadline_date as an all-day Google Calendar event.
    Returns the Google Calendar event ID.
    Raises ValueError if deadline_date is missing or calendar not connected.
    Raises HttpError on Google API errors.
    """
    if task.deadline_date is None:
        raise ValueError("Task must have a deadline_date to sync to Google Calendar.")

    service, token_record = get_calendar_service(user)
    calendar_id = token_record.selected_calendar_id or "primary"

    date_str = str(task.deadline_date)
    event_body = {
        "summary": f"Deadline: {task.title}",
        "description": task.description or "",
        "start": {"date": date_str},
        "end": {"date": date_str},
    }

    try:
        if task.deadline_event_id:
            event = (
                service.events()
                .update(calendarId=calendar_id, eventId=task.deadline_event_id, body=event_body)
                .execute()
            )
            logger.info(f"Updated deadline Calendar event {event['id']} for task {task.id}")
        else:
            event = (
                service.events()
                .insert(calendarId=calendar_id, body=event_body)
                .execute()
            )
            logger.info(f"Created deadline Calendar event {event['id']} for task {task.id}")
    except HttpError as e:
        logger.error(f"Google Calendar API error pushing deadline for task {task.id}: {e}")
        raise

    return event["id"]
