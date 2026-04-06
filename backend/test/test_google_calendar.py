"""Tests for Google Calendar sync feature."""

from datetime import date, time, datetime, timezone as dt_timezone
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model

from api.models import GoogleCalendarToken, Task
from api.services.google_calendar import _build_event_body, push_meeting

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
