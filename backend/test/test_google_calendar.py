"""Tests for Google Calendar sync feature."""

from datetime import date, time, datetime, timezone as dt_timezone
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model

from api.models import CalendarBlacklist, GoogleCalendarToken, Project, RecurringTask, Task
from api.services.google_calendar import _build_event_body, _match_project, _parse_rrule, push_meeting, pull_events, push_deadline

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_token(user, **kwargs):
    defaults = {
        "access_token": "access",
        "refresh_token": "refresh",
        "token_expiry": datetime(2099, 1, 1, tzinfo=dt_timezone.utc),
        "selected_calendar_id": "primary",
    }
    defaults.update(kwargs)
    return GoogleCalendarToken.objects.create(user=user, **defaults)


# ---------------------------------------------------------------------------
# _build_event_body
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestBuildEventBody:
    def _task(self, user, **kwargs):
        defaults = dict(
            title="Team Standup",
            description="Daily sync",
            begin_date=date(2026, 4, 10),
            begin_time=time(9, 0),
            end_time=time(9, 30),
            category="meeting",
        )
        defaults.update(kwargs)
        return Task.objects.create(user=user, **defaults)

    def test_with_begin_and_end_time(self, get_user):
        task = self._task(get_user)
        body = _build_event_body(task)
        assert body["summary"] == "Team Standup"
        assert body["description"] == "Daily sync"
        assert body["start"] == {"dateTime": "2026-04-10T09:00:00", "timeZone": "UTC"}
        assert body["end"] == {"dateTime": "2026-04-10T09:30:00", "timeZone": "UTC"}

    def test_without_end_time_defaults_to_plus_one_hour(self, get_user):
        task = self._task(get_user, end_time=None)
        body = _build_event_body(task)
        assert body["end"] == {"dateTime": "2026-04-10T10:00:00", "timeZone": "UTC"}

    def test_without_begin_time_uses_all_day(self, get_user):
        task = self._task(get_user, begin_time=None, end_time=None)
        body = _build_event_body(task)
        assert body["start"] == {"date": "2026-04-10"}
        assert body["end"] == {"date": "2026-04-10"}


# ---------------------------------------------------------------------------
# push_meeting service
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPushMeetingService:
    def _task(self, user, **kwargs):
        defaults = dict(
            title="Planning",
            begin_date=date(2026, 4, 10),
            begin_time=time(10, 0),
            category="meeting",
        )
        defaults.update(kwargs)
        return Task.objects.create(user=user, **defaults)

    def test_raises_for_non_meeting(self, get_user):
        _make_token(get_user)
        task = self._task(get_user, category="task")
        with pytest.raises(ValueError, match="Only meetings"):
            push_meeting(task, get_user)

    def test_raises_for_missing_begin_date(self, get_user):
        _make_token(get_user)
        task = self._task(get_user, begin_date=None)
        with pytest.raises(ValueError, match="begin_date"):
            push_meeting(task, get_user)

    def test_raises_when_no_token(self, get_user):
        task = self._task(get_user)
        with pytest.raises(ValueError, match="not connected"):
            push_meeting(task, get_user)

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_creates_event_when_no_google_event_id(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        task = self._task(get_user)

        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.insert.return_value.execute.return_value = {"id": "new-event-123"}

        event_id = push_meeting(task, get_user)

        assert event_id == "new-event-123"
        mock_service.events.return_value.insert.assert_called_once()
        mock_service.events.return_value.update.assert_not_called()

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_updates_event_when_google_event_id_exists(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        task = self._task(get_user, google_event_id="existing-event-456")

        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.update.return_value.execute.return_value = {"id": "existing-event-456"}

        event_id = push_meeting(task, get_user)

        assert event_id == "existing-event-456"
        mock_service.events.return_value.update.assert_called_once()
        mock_service.events.return_value.insert.assert_not_called()


# ---------------------------------------------------------------------------
# push-to-calendar API endpoint
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPushToCalendarEndpoint:
    def _meeting(self, user):
        return Task.objects.create(
            user=user,
            title="Sprint Review",
            begin_date=date(2026, 4, 10),
            begin_time=time(14, 0),
            category="meeting",
        )

    def test_unauthenticated_returns_401(self, api_client, get_user):
        task = self._meeting(get_user)
        res = api_client.post(f"/api/tasks/{task.id}/push-to-calendar/")
        assert res.status_code == 401

    def test_non_meeting_returns_400(self, auth_client, get_user):
        task = Task.objects.create(
            user=get_user,
            title="Write report",
            begin_date=date(2026, 4, 10),
            category="task",
        )
        res = auth_client.post(f"/api/tasks/{task.id}/push-to-calendar/")
        assert res.status_code == 400
        assert "Only meetings" in res.data.get("error", "")

    def test_returns_400_when_calendar_not_connected(self, auth_client, get_user):
        task = self._meeting(get_user)
        res = auth_client.post(f"/api/tasks/{task.id}/push-to-calendar/")
        assert res.status_code == 400

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_successful_push_returns_task_with_event_id(self, mock_creds, mock_build, auth_client, get_user):
        _make_token(get_user)
        task = self._meeting(get_user)

        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.insert.return_value.execute.return_value = {"id": "gcal-abc-789"}

        res = auth_client.post(f"/api/tasks/{task.id}/push-to-calendar/")
        assert res.status_code == 200
        assert res.data["google_event_id"] == "gcal-abc-789"

        task.refresh_from_db()
        assert task.google_event_id == "gcal-abc-789"


# ---------------------------------------------------------------------------
# pull_events service
# ---------------------------------------------------------------------------

def _gcal_event(event_id, summary, start_dt, end_dt, description=""):
    """Build a minimal Google Calendar event dict."""
    return {
        "id": event_id,
        "summary": summary,
        "description": description,
        "status": "confirmed",
        "start": {"dateTime": start_dt},
        "end": {"dateTime": end_dt},
    }


@pytest.mark.django_db
class TestPullEventsService:
    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_imports_new_events(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [
                _gcal_event("evt-1", "Standup", "2026-04-10T09:00:00+00:00", "2026-04-10T09:30:00+00:00"),
                _gcal_event("evt-2", "Planning", "2026-04-11T10:00:00+00:00", "2026-04-11T11:00:00+00:00"),
            ]
        }

        result = pull_events(get_user, date(2026, 4, 10), date(2026, 4, 11))

        assert result["imported"] == 2
        assert result["skipped"] == 0
        assert Task.objects.filter(user=get_user, google_event_id="evt-1").exists()
        assert Task.objects.filter(user=get_user, google_event_id="evt-2").exists()

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_skips_already_imported_events(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        # Pre-create a task that was already pulled
        Task.objects.create(
            user=get_user, title="Standup", category="meeting",
            begin_date=date(2026, 4, 10), google_event_id="evt-1",
        )
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [
                _gcal_event("evt-1", "Standup", "2026-04-10T09:00:00+00:00", "2026-04-10T09:30:00+00:00"),
                _gcal_event("evt-2", "New meeting", "2026-04-11T10:00:00+00:00", "2026-04-11T11:00:00+00:00"),
            ]
        }

        result = pull_events(get_user, date(2026, 4, 10), date(2026, 4, 11))

        assert result["imported"] == 1
        assert result["skipped"] == 1
        assert Task.objects.filter(user=get_user, google_event_id="evt-2").exists()

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_skips_cancelled_events(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        cancelled = _gcal_event("evt-c", "Cancelled", "2026-04-10T09:00:00+00:00", "2026-04-10T09:30:00+00:00")
        cancelled["status"] = "cancelled"
        mock_service.events.return_value.list.return_value.execute.return_value = {"items": [cancelled]}

        result = pull_events(get_user, date(2026, 4, 10), date(2026, 4, 10))

        assert result["imported"] == 0
        assert result["skipped"] == 1

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_all_day_event_has_no_time(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [{
                "id": "evt-allday",
                "summary": "Company Holiday",
                "status": "confirmed",
                "start": {"date": "2026-04-10"},
                "end": {"date": "2026-04-10"},
            }]
        }

        pull_events(get_user, date(2026, 4, 10), date(2026, 4, 10))

        task = Task.objects.get(user=get_user, google_event_id="evt-allday")
        assert task.begin_date == date(2026, 4, 10)
        assert task.begin_time is None
        assert task.end_time is None

    def test_raises_when_no_token(self, get_user):
        with pytest.raises(ValueError, match="not connected"):
            pull_events(get_user, date(2026, 4, 10), date(2026, 4, 10))

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_skips_non_default_event_types(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [
                {**_gcal_event("evt-wl", "Home", "2026-04-10T00:00:00+00:00", "2026-04-11T00:00:00+00:00"), "eventType": "workingLocation"},
                {**_gcal_event("evt-oo", "Out of office", "2026-04-10T00:00:00+00:00", "2026-04-11T00:00:00+00:00"), "eventType": "outOfOffice"},
                {**_gcal_event("evt-ft", "Focus time", "2026-04-10T09:00:00+00:00", "2026-04-10T11:00:00+00:00"), "eventType": "focusTime"},
                _gcal_event("evt-ok", "Real meeting", "2026-04-10T14:00:00+00:00", "2026-04-10T15:00:00+00:00"),
            ]
        }

        result = pull_events(get_user, date(2026, 4, 10), date(2026, 4, 10))

        assert result["imported"] == 1
        assert result["skipped"] == 3
        assert Task.objects.filter(user=get_user, google_event_id="evt-ok").exists()
        assert not Task.objects.filter(user=get_user, google_event_id__in=["evt-wl", "evt-oo", "evt-ft"]).exists()

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_recurring_events_linked_to_recurring_task(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [
                {
                    **_gcal_event("evt-r1", "Weekly Sync", "2026-04-10T09:00:00+00:00", "2026-04-10T09:30:00+00:00"),
                    "recurringEventId": "parent-series-1",
                },
                {
                    **_gcal_event("evt-r2", "Weekly Sync", "2026-04-17T09:00:00+00:00", "2026-04-17T09:30:00+00:00"),
                    "recurringEventId": "parent-series-1",
                },
            ]
        }
        mock_service.events.return_value.get.return_value.execute.return_value = {
            "id": "parent-series-1",
            "summary": "Weekly Sync",
            "status": "confirmed",
            "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=FR"],
            "start": {"dateTime": "2026-01-09T09:00:00+00:00"},
            "end": {"dateTime": "2026-01-09T09:30:00+00:00"},
        }

        result = pull_events(get_user, date(2026, 4, 10), date(2026, 4, 17))

        assert result["imported"] == 2
        rt = RecurringTask.objects.get(google_recurring_event_id="parent-series-1")
        assert rt.frequency == "weekly"
        assert rt.day_of_week == 4  # Friday
        assert rt.title == "Weekly Sync"
        assert Task.objects.filter(user=get_user, recurring_task=rt).count() == 2

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_recurring_task_reused_across_pulls(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        mock_service = MagicMock()
        mock_build.return_value = mock_service

        parent_event = {
            "id": "parent-series-2",
            "summary": "Daily Standup",
            "status": "confirmed",
            "recurrence": ["RRULE:FREQ=DAILY"],
            "start": {"dateTime": "2026-01-05T09:00:00+00:00"},
            "end": {"dateTime": "2026-01-05T09:15:00+00:00"},
        }
        mock_service.events.return_value.get.return_value.execute.return_value = parent_event

        # First pull — one instance
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [{
                **_gcal_event("evt-d1", "Daily Standup", "2026-04-10T09:00:00+00:00", "2026-04-10T09:15:00+00:00"),
                "recurringEventId": "parent-series-2",
            }]
        }
        pull_events(get_user, date(2026, 4, 10), date(2026, 4, 10))

        # Second pull — new instance
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [{
                **_gcal_event("evt-d2", "Daily Standup", "2026-04-11T09:00:00+00:00", "2026-04-11T09:15:00+00:00"),
                "recurringEventId": "parent-series-2",
            }]
        }
        pull_events(get_user, date(2026, 4, 11), date(2026, 4, 11))

        assert RecurringTask.objects.filter(google_recurring_event_id="parent-series-2").count() == 1
        rt = RecurringTask.objects.get(google_recurring_event_id="parent-series-2")
        assert Task.objects.filter(user=get_user, recurring_task=rt).count() == 2

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_assigns_project_when_title_matches(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        project = Project.objects.create(user=get_user, name="Alpha")
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [
                _gcal_event("evt-1", "Alpha team standup", "2026-04-10T09:00:00+00:00", "2026-04-10T09:30:00+00:00"),
            ]
        }

        pull_events(get_user, date(2026, 4, 10), date(2026, 4, 10))

        task = Task.objects.get(user=get_user, google_event_id="evt-1")
        assert task.project == project

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_no_project_assigned_when_no_match(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        Project.objects.create(user=get_user, name="Alpha")
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [
                _gcal_event("evt-2", "Unrelated meeting", "2026-04-10T10:00:00+00:00", "2026-04-10T11:00:00+00:00"),
            ]
        }

        pull_events(get_user, date(2026, 4, 10), date(2026, 4, 10))

        task = Task.objects.get(user=get_user, google_event_id="evt-2")
        assert task.project is None

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_longest_project_name_wins_on_tie(self, mock_creds, mock_build, get_user):
        _make_token(get_user)
        Project.objects.create(user=get_user, name="Beta")
        longer = Project.objects.create(user=get_user, name="Beta launch")
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [
                _gcal_event("evt-3", "Beta launch planning", "2026-04-10T14:00:00+00:00", "2026-04-10T15:00:00+00:00"),
            ]
        }

        pull_events(get_user, date(2026, 4, 10), date(2026, 4, 10))

        task = Task.objects.get(user=get_user, google_event_id="evt-3")
        assert task.project == longer


# ---------------------------------------------------------------------------
# _parse_rrule unit tests
# ---------------------------------------------------------------------------

class TestParseRrule:
    def test_daily(self):
        result = _parse_rrule("RRULE:FREQ=DAILY", date(2026, 4, 10))
        assert result == {"frequency": "daily", "day_of_week": None}

    def test_weekly_with_byday(self):
        result = _parse_rrule("RRULE:FREQ=WEEKLY;BYDAY=MO", date(2026, 4, 10))
        assert result == {"frequency": "weekly", "day_of_week": 0}

    def test_weekly_without_byday_falls_back_to_start_date(self):
        # date(2026, 4, 10) is a Friday (weekday=4)
        result = _parse_rrule("RRULE:FREQ=WEEKLY", date(2026, 4, 10))
        assert result == {"frequency": "weekly", "day_of_week": 4}

    def test_biweekly(self):
        result = _parse_rrule("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=WE", date(2026, 4, 10))
        assert result == {"frequency": "biweekly", "day_of_week": 2}

    def test_monthly(self):
        result = _parse_rrule("RRULE:FREQ=MONTHLY", date(2026, 4, 10))
        assert result == {"frequency": "monthly", "day_of_week": None}

    def test_quarterly(self):
        result = _parse_rrule("RRULE:FREQ=MONTHLY;INTERVAL=3", date(2026, 4, 10))
        assert result == {"frequency": "quarterly", "day_of_week": None}

    def test_byday_with_ordinal_prefix(self):
        # "1MO" means first Monday of the month — ordinal stripped, day extracted
        result = _parse_rrule("RRULE:FREQ=MONTHLY;BYDAY=1MO", date(2026, 4, 10))
        assert result["day_of_week"] == 0


# ---------------------------------------------------------------------------
# _match_project unit tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestMatchProject:
    def test_case_insensitive_match(self, get_user):
        project = Project.objects.create(user=get_user, name="Phoenix")
        result = _match_project("PHOENIX quarterly review", [project])
        assert result == project

    def test_returns_none_when_no_match(self, get_user):
        project = Project.objects.create(user=get_user, name="Phoenix")
        result = _match_project("Completely unrelated", [project])
        assert result is None

    def test_returns_longest_match(self, get_user):
        short = Project.objects.create(user=get_user, name="Data")
        long = Project.objects.create(user=get_user, name="Data platform")
        result = _match_project("Data platform migration sync", [short, long])
        assert result == long

    def test_returns_none_for_empty_projects(self, get_user):
        result = _match_project("Some meeting", [])
        assert result is None

    def test_matches_project_name_in_description(self, get_user):
        project = Project.objects.create(user=get_user, name="Phoenix")
        result = _match_project("Weekly sync", [project], description="Updates for the Phoenix project")
        assert result == project

    def test_title_match_takes_priority_over_description_when_longer(self, get_user):
        short = Project.objects.create(user=get_user, name="Data")
        long = Project.objects.create(user=get_user, name="Data platform")
        result = _match_project("Data platform review", [short, long], description="Data notes")
        assert result == long


# ---------------------------------------------------------------------------
# pull endpoint
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPullEndpoint:
    def test_unauthenticated_returns_401(self, api_client):
        res = api_client.post("/api/calendar/pull/", {"date_from": "2026-04-10", "date_to": "2026-04-17"})
        assert res.status_code == 401

    def test_returns_400_when_not_connected(self, auth_client):
        res = auth_client.post("/api/calendar/pull/", {"date_from": "2026-04-10", "date_to": "2026-04-17"})
        assert res.status_code == 400

    def test_returns_400_for_invalid_date(self, auth_client, get_user):
        _make_token(get_user)
        res = auth_client.post("/api/calendar/pull/", {"date_from": "not-a-date", "date_to": "2026-04-17"})
        assert res.status_code == 400

    def test_returns_400_when_date_to_before_date_from(self, auth_client, get_user):
        _make_token(get_user)
        res = auth_client.post("/api/calendar/pull/", {"date_from": "2026-04-17", "date_to": "2026-04-10"})
        assert res.status_code == 400

    @patch("api.services.google_calendar.build")
    @patch("api.services.google_calendar._build_credentials")
    def test_successful_pull_returns_summary(self, mock_creds, mock_build, auth_client, get_user):
        _make_token(get_user)
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.events.return_value.list.return_value.execute.return_value = {
            "items": [
                _gcal_event("evt-x", "Kickoff", "2026-04-10T09:00:00+00:00", "2026-04-10T10:00:00+00:00"),
            ]
        }

        res = auth_client.post("/api/calendar/pull/", {"date_from": "2026-04-10", "date_to": "2026-04-10"})

        assert res.status_code == 200
        assert res.data["imported"] == 1
        assert res.data["skipped"] == 0
        assert len(res.data["tasks"]) == 1
        assert res.data["tasks"][0]["google_event_id"] == "evt-x"
        assert res.data["tasks"][0]["category"] == "meeting"
