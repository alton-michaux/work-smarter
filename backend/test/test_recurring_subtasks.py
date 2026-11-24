"""Recurring series that file their occurrences under a parent task."""

import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework.test import APIClient

from api.models import PersonalAPIToken, RecurringTask, Task
from api.services.recurring_tasks import ensure_recurring_tasks_in_range

PARENT_DATE = date(2026, 9, 23)
MONDAY = date(2026, 11, 23)


@pytest.fixture
def parent(get_user, create_task):
    return create_task(title="VAMOS: WORK", begin_date=PARENT_DATE, user=get_user)


@pytest.fixture
def series(get_user, create_recurring_task, parent):
    rt = create_recurring_task(
        title="PR Reviews", frequency="weekly", day_of_week=MONDAY.weekday(),
        start_date=MONDAY, user=get_user,
    )
    rt.parent = parent
    rt.save()
    return rt


@pytest.fixture
def write_client(get_user):
    _, raw_key = PersonalAPIToken.generate(
        get_user, name="automation", scope=PersonalAPIToken.SCOPE_READ_WRITE
    )
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Api-Key {raw_key}")
    return client


# --- Generator --------------------------------------------------------------

@pytest.mark.django_db
def test_generator_files_occurrences_under_series_parent(get_user, series, parent):
    ensure_recurring_tasks_in_range(MONDAY, MONDAY + timedelta(weeks=1), user=get_user)

    occurrences = Task.objects.filter(recurring_task=series).order_by("begin_date")
    assert [t.begin_date for t in occurrences] == [MONDAY, MONDAY + timedelta(weeks=1)]
    for t in occurrences:
        assert t.parent_id == parent.id
        assert t.is_subtask is True


@pytest.mark.django_db
def test_generator_without_parent_stays_top_level(get_user, create_recurring_task):
    rt = create_recurring_task(
        frequency="weekly", day_of_week=MONDAY.weekday(), start_date=MONDAY, user=get_user,
    )
    ensure_recurring_tasks_in_range(MONDAY, MONDAY, user=get_user)

    t = Task.objects.get(recurring_task=rt)
    assert t.parent_id is None
    assert t.is_subtask is False


@pytest.mark.django_db
def test_deleting_parent_detaches_series(series, parent):
    parent.delete()
    series.refresh_from_db()
    assert series.parent_id is None


# --- RecurringTaskSerializer ------------------------------------------------

@pytest.mark.django_db
def test_recurring_task_api_sets_and_returns_parent(auth_client, get_user, parent):
    res = auth_client.post(reverse("recurring-task-list"), {
        "title": "PR Reviews", "frequency": "weekly", "day_of_week": 0,
        "start_date": MONDAY.isoformat(), "parent": parent.id,
    }, format="json")
    assert res.status_code == 201, res.data
    assert res.data["parent"] == parent.id
    assert RecurringTask.objects.get(pk=res.data["id"]).parent_id == parent.id


@pytest.mark.django_db
def test_recurring_task_patch_without_parent_keeps_it(auth_client, series, parent):
    # The task form PATCHes the series without `parent`; that must not clear it.
    res = auth_client.patch(
        reverse("recurring-task-detail", args=[series.id]), {"title": "Renamed"}, format="json"
    )
    assert res.status_code == 200, res.data
    series.refresh_from_db()
    assert series.parent_id == parent.id


@pytest.mark.django_db
def test_recurring_task_rejects_another_users_parent(auth_client, create_user, create_task):
    bob = create_user(username="bob", email="bob@builder.com", password="canwefixit")
    theirs = create_task(title="Bob's", begin_date=PARENT_DATE, user=bob)

    res = auth_client.post(reverse("recurring-task-list"), {
        "title": "PR Reviews", "frequency": "weekly", "day_of_week": 0,
        "start_date": MONDAY.isoformat(), "parent": theirs.id,
    }, format="json")
    assert res.status_code == 400
    assert "parent" in res.data


@pytest.mark.django_db
def test_recurring_task_rejects_parent_at_max_depth(auth_client, get_user, create_task, parent):
    child = create_task(title="child", begin_date=PARENT_DATE, parent=parent, user=get_user)
    grandchild = create_task(title="grandchild", begin_date=PARENT_DATE, parent=child, user=get_user)

    res = auth_client.post(reverse("recurring-task-list"), {
        "title": "PR Reviews", "frequency": "weekly", "day_of_week": 0,
        "start_date": MONDAY.isoformat(), "parent": grandchild.id,
    }, format="json")
    assert res.status_code == 400
    assert "parent" in res.data


# --- Task begin_date rule ---------------------------------------------------

@pytest.mark.django_db
def test_app_accepts_recurring_child_with_later_begin_date(auth_client, get_user, create_task, series, parent):
    occ = create_task(title="PR Reviews", begin_date=MONDAY, recurring_task=series, user=get_user)

    res = auth_client.patch(
        reverse("task-detail", args=[occ.id]), {"parent": parent.id}, format="json"
    )
    assert res.status_code == 200, res.data
    occ.refresh_from_db()
    assert occ.parent_id == parent.id
    assert occ.begin_date == MONDAY


@pytest.mark.django_db
def test_app_accepts_non_recurring_child_with_later_begin_date(auth_client, get_user, create_task, parent):
    task = create_task(title="one-off", begin_date=MONDAY, user=get_user)

    res = auth_client.patch(
        reverse("task-detail", args=[task.id]), {"parent": parent.id}, format="json"
    )
    assert res.status_code == 200, res.data
    task.refresh_from_db()
    assert task.parent_id == parent.id
    assert task.begin_date == MONDAY


@pytest.mark.django_db
def test_app_accepts_child_dated_before_parent(auth_client, get_user, create_task, parent):
    """Old tasks (e.g. past recurring occurrences) can be filed under a newer parent."""
    earlier = PARENT_DATE - timedelta(days=30)
    task = create_task(title="one-off", begin_date=earlier, user=get_user)

    res = auth_client.patch(
        reverse("task-detail", args=[task.id]), {"parent": parent.id}, format="json"
    )
    assert res.status_code == 200, res.data
    task.refresh_from_db()
    assert task.parent_id == parent.id
    assert task.begin_date == earlier


@pytest.mark.django_db
def test_v1_accepts_recurring_child_with_later_begin_date(write_client, get_user, create_task, series, parent):
    occ = create_task(title="PR Reviews", begin_date=MONDAY, recurring_task=series, user=get_user)

    res = write_client.patch(
        reverse("v1-task-detail", args=[occ.id]), {"parent": parent.id}, format="json"
    )
    assert res.status_code == 200, res.data
    occ.refresh_from_db()
    assert occ.parent_id == parent.id


@pytest.mark.django_db
def test_v1_accepts_non_recurring_child_with_later_begin_date(write_client, get_user, create_task, parent):
    task = create_task(title="one-off", begin_date=MONDAY, user=get_user)

    res = write_client.patch(
        reverse("v1-task-detail", args=[task.id]), {"parent": parent.id}, format="json"
    )
    assert res.status_code == 200, res.data
    task.refresh_from_db()
    assert task.parent_id == parent.id
    assert task.begin_date == MONDAY


@pytest.mark.django_db
def test_v1_accepts_child_dated_before_parent(write_client, get_user, create_task, parent):
    """Old tasks (e.g. past recurring occurrences) can be filed under a newer parent."""
    earlier = PARENT_DATE - timedelta(days=30)
    task = create_task(title="one-off", begin_date=earlier, user=get_user)

    res = write_client.patch(
        reverse("v1-task-detail", args=[task.id]), {"parent": parent.id}, format="json"
    )
    assert res.status_code == 200, res.data
    task.refresh_from_db()
    assert task.parent_id == parent.id
    assert task.begin_date == earlier
