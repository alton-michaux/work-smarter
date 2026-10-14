"""Task.status (open / in_progress / done) and the legacy `is_done` alias."""

import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework.test import APIClient

from api.models import PersonalAPIToken, Task


def task_detail_url(task_id):
    return reverse("task-detail", args=[task_id])


def v1_task_detail_url(task_id):
    return reverse("v1-task-detail", args=[task_id])


@pytest.fixture
def write_client(get_user):
    _, raw_key = PersonalAPIToken.generate(
        get_user, name="automation", scope=PersonalAPIToken.SCOPE_READ_WRITE
    )
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Api-Key {raw_key}")
    return client


# --- Model ------------------------------------------------------------------

@pytest.mark.django_db
def test_is_done_property_maps_to_status(get_user):
    task = Task.objects.create(user=get_user, title="t", is_done=True)
    assert task.status == Task.STATUS_DONE
    assert task.is_done is True

    task.is_done = False
    assert task.status == Task.STATUS_OPEN


@pytest.mark.django_db
def test_is_done_false_leaves_in_progress_alone(get_user):
    task = Task.objects.create(user=get_user, title="t", status=Task.STATUS_IN_PROGRESS)
    task.is_done = False
    assert task.status == Task.STATUS_IN_PROGRESS


@pytest.mark.django_db
def test_started_at_lifecycle(get_user):
    task = Task.objects.create(user=get_user, title="t")
    assert task.started_at is None

    task.status = Task.STATUS_IN_PROGRESS
    task.save()
    started = task.started_at
    assert started is not None

    task.status = Task.STATUS_DONE
    task.save()
    assert task.started_at == started
    assert task.end_date is not None

    task.status = Task.STATUS_OPEN
    task.save()
    assert task.started_at is None
    assert task.end_date is None


@pytest.mark.django_db
@pytest.mark.parametrize("category", ["meeting", "note"])
def test_non_task_categories_cannot_stay_in_progress(get_user, category):
    task = Task.objects.create(user=get_user, title="t", category=category, status=Task.STATUS_IN_PROGRESS)
    assert task.status == Task.STATUS_OPEN
    assert task.started_at is None


@pytest.mark.django_db
def test_queryset_open_and_done(get_user, create_task):
    create_task(title="open", user=get_user)
    Task.objects.create(user=get_user, title="started", status=Task.STATUS_IN_PROGRESS)
    create_task(title="closed", user=get_user, is_done=True)

    assert sorted(Task.objects.open().values_list("title", flat=True)) == ["open", "started"]
    assert list(Task.objects.done().values_list("title", flat=True)) == ["closed"]


# --- App API ----------------------------------------------------------------

@pytest.mark.django_db
def test_patch_status_in_progress(auth_client, get_user, create_task):
    task = create_task(user=get_user)

    res = auth_client.patch(task_detail_url(task.id), {"status": "in_progress"}, format="json")

    assert res.status_code == 200
    assert res.data["status"] == "in_progress"
    assert res.data["is_done"] is False
    assert res.data["started_at"] is not None


@pytest.mark.django_db
def test_patch_in_progress_on_meeting_is_rejected(auth_client, get_user, create_task):
    meeting = create_task(user=get_user, category="meeting")

    res = auth_client.patch(task_detail_url(meeting.id), {"status": "in_progress"}, format="json")

    assert res.status_code == 400
    assert "status" in res.data


@pytest.mark.django_db
def test_changing_category_away_from_task_resets_to_open(auth_client, get_user):
    task = Task.objects.create(user=get_user, title="t", status=Task.STATUS_IN_PROGRESS)

    res = auth_client.patch(task_detail_url(task.id), {"category": "meeting"}, format="json")

    assert res.status_code == 200
    assert res.data["status"] == "open"


@pytest.mark.django_db
def test_is_done_alias_still_writes(auth_client, get_user, create_task):
    task = create_task(user=get_user)

    res = auth_client.patch(task_detail_url(task.id), {"is_done": True}, format="json")

    assert res.data["status"] == "done"
    assert res.data["end_date"] is not None


@pytest.mark.django_db
def test_status_wins_over_is_done(auth_client, get_user, create_task):
    task = create_task(user=get_user)

    res = auth_client.patch(
        task_detail_url(task.id), {"status": "in_progress", "is_done": True}, format="json"
    )

    assert res.data["status"] == "in_progress"


@pytest.mark.django_db
def test_round_tripping_is_done_false_keeps_in_progress(auth_client, get_user):
    task = Task.objects.create(user=get_user, title="t", status=Task.STATUS_IN_PROGRESS)

    res = auth_client.patch(task_detail_url(task.id), {"is_done": False, "title": "renamed"}, format="json")

    assert res.data["status"] == "in_progress"


@pytest.mark.django_db
def test_undoing_an_in_progress_then_done_task_lands_on_open(auth_client, get_user):
    task = Task.objects.create(user=get_user, title="t", status=Task.STATUS_IN_PROGRESS)
    auth_client.patch(task_detail_url(task.id), {"is_done": True}, format="json")

    res = auth_client.patch(task_detail_url(task.id), {"is_done": False}, format="json")

    assert res.data["status"] == "open"
    assert res.data["started_at"] is None


@pytest.mark.django_db
def test_parent_done_cascades_to_in_progress_children(auth_client, get_user, create_task):
    parent = create_task(title="parent", user=get_user)
    child = Task.objects.create(user=get_user, title="child", parent=parent, status=Task.STATUS_IN_PROGRESS)

    auth_client.patch(task_detail_url(parent.id), {"is_done": True}, format="json")

    child.refresh_from_db()
    assert child.status == Task.STATUS_DONE


@pytest.mark.django_db
def test_in_progress_task_carries_over(auth_client, get_user):
    today = date.today()
    Task.objects.create(
        user=get_user, title="started last week", begin_date=today - timedelta(days=7),
        status=Task.STATUS_IN_PROGRESS,
    )

    res = auth_client.get(f"/api/tasks/?begin_date={today}&end_date={today}&active_on={today}")

    assert any(t["title"] == "started last week" for t in res.data["results"])


# --- v1 API -----------------------------------------------------------------

@pytest.mark.django_db
def test_v1_filter_by_status(write_client, get_user, create_task):
    create_task(title="open", user=get_user)
    Task.objects.create(user=get_user, title="started", status=Task.STATUS_IN_PROGRESS)
    create_task(title="closed", user=get_user, is_done=True)

    res = write_client.get(reverse("v1-task-list"), {"status": "in_progress"})

    assert [t["title"] for t in res.data["results"]] == ["started"]


@pytest.mark.django_db
def test_v1_is_done_false_includes_in_progress(write_client, get_user, create_task):
    create_task(title="open", user=get_user)
    Task.objects.create(user=get_user, title="started", status=Task.STATUS_IN_PROGRESS)
    create_task(title="closed", user=get_user, is_done=True)

    res = write_client.get(reverse("v1-task-list"), {"is_done": "false"})

    assert sorted(t["title"] for t in res.data["results"]) == ["open", "started"]


@pytest.mark.django_db
def test_v1_rejects_invalid_status(write_client):
    res = write_client.get(reverse("v1-task-list"), {"status": "blocked"})

    assert res.status_code == 400
    assert "status" in res.data


@pytest.mark.django_db
def test_v1_put_with_only_is_done_stays_done(write_client, get_user, create_task):
    task = create_task(user=get_user)

    res = write_client.put(v1_task_detail_url(task.id), {"title": "t", "is_done": True}, format="json")

    assert res.status_code == 200
    assert res.data["status"] == "done"
    assert res.data["is_done"] is True


@pytest.mark.django_db
def test_v1_put_without_status_resets_in_progress(write_client, get_user):
    task = Task.objects.create(user=get_user, title="t", status=Task.STATUS_IN_PROGRESS)

    res = write_client.put(v1_task_detail_url(task.id), {"title": "t"}, format="json")

    assert res.status_code == 200
    assert res.data["status"] == "open"


@pytest.mark.django_db
def test_v1_patch_status(write_client, get_user, create_task):
    task = create_task(user=get_user)

    res = write_client.patch(v1_task_detail_url(task.id), {"status": "in_progress"}, format="json")

    assert res.status_code == 200
    assert res.data["status"] == "in_progress"
    assert res.data["started_at"] is not None
