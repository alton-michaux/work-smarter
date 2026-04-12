import pytest
from datetime import date, timedelta, datetime, timezone as dt_timezone
from unittest.mock import patch
from django.urls import reverse
from api.services.recurring_tasks import ensure_recurring_tasks_in_range, _should_generate
from api.models import Task, RecurringTask, RecurringTaskException

def task_detail_url(task_id: int) -> str:
    return reverse("task-detail", args=[task_id])

def task_payload(**overrides):
    """
    API payload for Task create/update.
    NOTE: user is server-controlled (read-only) and should NOT be sent.
    """
    payload = {
        "title": "Test Task",
        "description": "Task for testing",
        "begin_date": date.today().isoformat(),
        "is_done": False,
        "recurring_task": None,
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_task_index(auth_client):
    response = auth_client.get("/api/tasks/")
    assert response.status_code == 200
    assert isinstance(response.data["results"], list)


@pytest.mark.django_db
def test_weekly_task_filtering(auth_client, get_user, create_task, create_recurring_task):
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)

    # Included: non-recurring carry-over task (started before week, still open)
    create_task(
        title="Ongoing Task",
        begin_date=(start_of_week - timedelta(days=3)).isoformat(),
        is_done=False,
        user=get_user
    )

    # Included: Task starts during the week
    create_task(
        title="New Task This Week",
        begin_date=(start_of_week + timedelta(days=2)).isoformat(),
        is_done=False,
        user=get_user
    )

    # Included: No begin_date, completed this week
    create_task(
        title="No Begin, Done This Week",
        begin_date=None,
        end_date=(start_of_week + timedelta(days=1)).isoformat(),
        is_done=True,
        user=get_user
    )

    # Excluded: Done entirely last week
    create_task(
        title="Done Last Week",
        begin_date=(start_of_week - timedelta(days=10)).isoformat(),
        end_date=(start_of_week - timedelta(days=2)).isoformat(),
        is_done=True,
        user=get_user
    )

    # Excluded: Future non-recurring open task
    create_task(
        title="Future Task",
        begin_date=(end_of_week + timedelta(days=5)).isoformat(),
        is_done=False,
        user=get_user
    )

    # --- recurring occurrences ---
    rt = create_recurring_task(
        title="Weekly Standup",
        frequency="weekly",
        start_date=(start_of_week - timedelta(days=14)),  # should be a date, not string
        day_of_week=start_of_week.weekday(),
        user=get_user,
    )

    # occurrence last week (should be excluded)
    create_task(
        title="Weekly Standup",
        begin_date=(start_of_week - timedelta(days=7)).isoformat(),
        is_done=False,
        recurring_task=rt,
        user=get_user
    )

    # occurrence this week (should be included)
    create_task(
        title="Weekly Standup",
        begin_date=start_of_week.isoformat(),
        is_done=False,
        recurring_task=rt,
        user=get_user
    )

    # occurrence next week (should be excluded)
    create_task(
        title="Weekly Standup",
        begin_date=(start_of_week + timedelta(days=7)).isoformat(),
        is_done=False,
        recurring_task=rt,
        user=get_user
    )

    response = auth_client.get(
        f"/api/tasks/?begin_date={start_of_week}&end_date={end_of_week}"
    )

    assert response.status_code == 200
    titles = [task["title"] for task in response.data["results"]]

    assert "New Task This Week" in titles
    assert "No Begin, Done This Week" in titles
    assert "Ongoing Task" in titles
    assert "Done Last Week" not in titles
    assert "Future Task" not in titles

    # Only one recurring occurrence should appear in the selected week
    assert titles.count("Weekly Standup") == 1


# -----------------------
# Parent/Child Subtask Tests
# -----------------------

@pytest.mark.django_db
def test_create_subtask_same_date_ok(auth_client, get_user, create_project, tasks_list_url):
    auth_client.force_authenticate(user=get_user)
    project = create_project(name="Vamos", user=get_user)

    parent = Task.objects.create(
        user=get_user,
        title="Parent",
        begin_date=date(2026, 2, 3),
        project=project,
        category="meeting",
    )

    payload = {
        "title": "Child",
        "begin_date": "2026-02-03",
        "project": project.id,
        "category": "meeting",
        "parent": parent.id,
        "is_subtask": False,  # should be ignored/read-only
        "recurring_task": None,
    }

    res = auth_client.post(tasks_list_url, payload, format="json")
    assert res.status_code == 201, res.data

    child = Task.objects.get(id=res.data["id"])
    assert child.parent_id == parent.id
    assert child.begin_date == parent.begin_date
    assert child.is_subtask is True


@pytest.mark.django_db
def test_create_subtask_autocopies_begin_date_from_parent(auth_client, get_user, create_project, tasks_list_url):
    auth_client.force_authenticate(user=get_user)
    project = create_project(name="Vamos", user=get_user)

    parent = Task.objects.create(
        user=get_user,
        title="Parent",
        begin_date=date(2026, 2, 3),
        project=project,
        category="note",
    )

    payload = {
        "title": "Child",
        "project": project.id,
        "category": "note",
        "parent": parent.id,
        "recurring_task": None,
        # begin_date omitted on purpose
    }

    res = auth_client.post(tasks_list_url, payload, format="json")
    assert res.status_code == 201, res.data

    child = Task.objects.get(id=res.data["id"])
    assert child.begin_date == parent.begin_date
    assert child.is_subtask is True


@pytest.mark.django_db
def test_create_subtask_rejects_mismatched_begin_date(auth_client, get_user, create_project, tasks_list_url):
    auth_client.force_authenticate(user=get_user)
    project = create_project(name="Vamos", user=get_user)

    parent = Task.objects.create(
        user=get_user,
        title="Parent",
        begin_date=date(2026, 2, 3),
        project=project,
        category="meeting",
    )

    payload = {
        "title": "Child",
        "begin_date": "2026-02-04",  # mismatch
        "project": project.id,
        "category": "meeting",
        "parent": parent.id,
        "recurring_task": None,
    }

    res = auth_client.post(tasks_list_url, payload, format="json")
    assert res.status_code == 400
    assert "begin_date" in res.data


@pytest.mark.django_db
def test_rejects_subtask_of_subtask_depth_limit(auth_client, get_user, create_project, tasks_list_url):
    auth_client.force_authenticate(user=get_user)
    project = create_project(name="Vamos", user=get_user)

    parent = Task.objects.create(
        user=get_user,
        title="Parent",
        begin_date=date(2026, 2, 3),
        project=project,
        category="task",
    )
    child = Task.objects.create(
        user=get_user,
        title="Child",
        begin_date=date(2026, 2, 3),
        project=project,
        category="task",
        parent=parent,
    )

    payload = {
        "title": "Grandchild",
        "begin_date": "2026-02-03",
        "project": project.id,
        "category": "task",
        "parent": child.id,  # child is already a subtask
        "recurring_task": None,
    }

    res = auth_client.post(tasks_list_url, payload, format="json")
    assert res.status_code == 400
    assert "parent" in res.data or "non_field_errors" in res.data


@pytest.mark.django_db
def test_rejects_self_parenting_on_update(auth_client, get_user, create_project):
    auth_client.force_authenticate(user=get_user)
    project = create_project(name="Vamos", user=get_user)

    t = Task.objects.create(
        user=get_user,
        title="Lonely task",
        begin_date=date(2026, 2, 3),
        project=project,
        category="task",
    )

    res = auth_client.patch(task_detail_url(t.id), {"parent": t.id}, format="json")
    assert res.status_code == 400
    assert "parent" in res.data or "non_field_errors" in res.data


@pytest.mark.django_db
def test_rejects_cross_user_parent(auth_client, get_user, create_user, tasks_list_url):
    auth_client.force_authenticate(user=get_user)

    other_user = create_user(username="other", email="other@email.com", password="Password1!")

    foreign_parent = Task.objects.create(
        user=other_user,
        title="Other user's parent",
        begin_date=date(2026, 2, 3),
        category="task",
    )

    payload = {
        "title": "Child",
        "begin_date": "2026-02-03",
        "category": "task",
        "parent": foreign_parent.id,
        "recurring_task": None,
    }

    res = auth_client.post(tasks_list_url, payload, format="json")
    assert res.status_code == 400
    assert "parent" in res.data or "non_field_errors" in res.data


@pytest.mark.django_db
def test_client_cannot_force_is_subtask_true_without_parent(auth_client, get_user, tasks_list_url):
    auth_client.force_authenticate(user=get_user)

    payload = {
        "title": "I try to be a subtask",
        "begin_date": "2026-02-03",
        "category": "note",
        "is_subtask": True,  # should be ignored/read-only
        "parent": None,
        "recurring_task": None,
    }

    res = auth_client.post(tasks_list_url, payload, format="json")
    assert res.status_code == 201, res.data

    t = Task.objects.get(id=res.data["id"])
    assert t.parent_id is None
    assert t.is_subtask is False


@pytest.mark.django_db
def test_delete_parent_detaches_children(auth_client, get_user, create_task):
    auth_client.force_authenticate(user=get_user)

    parent = create_task(
        title="Parent",
        begin_date=date(2026, 2, 3),
        category="task",
        user=get_user,
    )
    child = create_task(
        title="Child",
        begin_date=date(2026, 2, 3),
        category="task",
        user=get_user,
        parent=parent,
    )
    assert child.is_subtask is True

    res = auth_client.delete(task_detail_url(parent.id))
    assert res.status_code in (204, 200)

    child.refresh_from_db()
    assert child.parent_id is None
    assert child.is_subtask is False


# -----------------------
# Existing CRUD Tests (patched for user read-only)
# -----------------------

@pytest.mark.django_db
def test_task_create(auth_client):
    response = auth_client.post("/api/tasks/", task_payload(), format="json")
    assert response.status_code == 201
    assert response.data["title"] == "Test Task"


@pytest.mark.django_db
def test_task_update(auth_client, get_user, create_task):
    task = create_task(
        title="test_update",
        description="for testing update",
        begin_date="2025-07-31",
        end_date=None,
        is_done=False,
        user=get_user
    )

    response = auth_client.put(
        f"/api/tasks/{task.id}/",
        task_payload(title="Test Task Update", description="Task for testing update", is_done=True),
        format="json"
    )

    assert response.status_code == 200
    assert response.data["title"] == "Test Task Update"

    task.refresh_from_db()
    assert task.title == "Test Task Update"
    assert task.end_date == date.today()  # end_date populated when done

    response = auth_client.put(
        f"/api/tasks/{task.id}/",
        task_payload(is_done=False),
        format="json"
    )
    task.refresh_from_db()

    assert task.end_date is None  # end_date cleared when done=False


@pytest.mark.django_db
def test_task_delete(auth_client, get_user, create_task):
    task = create_task(
        title="test_delete",
        description="for testing delete",
        begin_date="2025-08-01",
        is_done=False,
        user=get_user
    )

    response = auth_client.delete(f"/api/tasks/{task.id}/")
    assert response.status_code == 204
    assert not Task.objects.filter(id=task.id).exists()
    
@pytest.mark.django_db
def test_delete_recurring_occurrence_creates_skip_exception(auth_client, get_user, create_task, create_recurring_task):
    auth_client.force_authenticate(user=get_user)

    rt = create_recurring_task(
        user=get_user,
        frequency="daily",
        start_date=date(2026, 2, 3),
    )

    occ = create_task(
        user=get_user,
        title="Daily thing",
        begin_date=date(2026, 2, 3),
        category="task",
        recurring_task=rt,
    )

    res = auth_client.delete(task_detail_url(occ.id))
    assert res.status_code in (204, 200)

    assert not Task.objects.filter(id=occ.id).exists()

    assert RecurringTaskException.objects.filter(
        user=get_user,
        recurring_task=rt,
        date=date(2026, 2, 3),
        type="skip",
    ).exists()

@pytest.mark.django_db
def test_skip_exception_prevents_regeneration(auth_client, get_user, create_task, create_recurring_task):
    auth_client.force_authenticate(user=get_user)

    rt = create_recurring_task(
        user=get_user,
        frequency="daily",
        start_date=date(2026, 2, 3),
    )

    # occurrence exists
    occ = create_task(
        user=get_user,
        title="Daily thing",
        begin_date=date(2026, 2, 3),
        category="task",
        recurring_task=rt,
    )

    # delete occurrence -> creates skip
    res = auth_client.delete(task_detail_url(occ.id))
    assert res.status_code in (204, 200)

    assert RecurringTaskException.objects.filter(
        user=get_user,
        recurring_task=rt,
        date=date(2026, 2, 3),
        type="skip",
    ).exists()

    # call ensure again for that day
    ensure_recurring_tasks_in_range(date(2026, 2, 3), date(2026, 2, 3), user=get_user)

    # should NOT come back
    assert not Task.objects.filter(
        user=get_user,
        recurring_task=rt,
        begin_date=date(2026, 2, 3),
    ).exists()


# -----------------------
# Biweekly Frequency Tests
# -----------------------

@pytest.mark.django_db
def test_biweekly_generates_on_start_date(get_user, create_recurring_task):
    # Monday 2026-03-02
    start = date(2026, 3, 2)
    rt = create_recurring_task(
        user=get_user,
        frequency="biweekly",
        start_date=start,
    )

    assert _should_generate(rt, start) is True


@pytest.mark.django_db
def test_biweekly_skips_one_week_later(get_user, create_recurring_task):
    start = date(2026, 3, 2)  # Monday
    rt = create_recurring_task(
        user=get_user,
        frequency="biweekly",
        start_date=start,
    )

    one_week_later = start + timedelta(weeks=1)
    assert _should_generate(rt, one_week_later) is False


@pytest.mark.django_db
def test_biweekly_generates_two_weeks_later(get_user, create_recurring_task):
    start = date(2026, 3, 2)  # Monday
    rt = create_recurring_task(
        user=get_user,
        frequency="biweekly",
        start_date=start,
    )

    two_weeks_later = start + timedelta(weeks=2)
    assert _should_generate(rt, two_weeks_later) is True


@pytest.mark.django_db
def test_biweekly_ensure_generates_correct_occurrences(get_user, create_recurring_task):
    start = date(2026, 3, 2)  # Monday
    rt = create_recurring_task(
        user=get_user,
        frequency="biweekly",
        start_date=start,
    )

    # 4-week range should produce occurrences on week 0 and week 2 only
    ensure_recurring_tasks_in_range(start, start + timedelta(weeks=4), user=get_user)

    dates = list(
        Task.objects.filter(user=get_user, recurring_task=rt)
        .values_list("begin_date", flat=True)
        .order_by("begin_date")
    )

    assert start in dates                              # week 0
    assert start + timedelta(weeks=1) not in dates    # week 1 skipped
    assert start + timedelta(weeks=2) in dates        # week 2
    assert start + timedelta(weeks=3) not in dates    # week 3 skipped
    assert start + timedelta(weeks=4) in dates        # week 4


# -----------------------
# Quarterly Frequency Tests
# -----------------------

@pytest.mark.django_db
def test_quarterly_generates_on_start_date(get_user, create_recurring_task):
    start = date(2026, 1, 15)
    rt = create_recurring_task(
        user=get_user,
        frequency="quarterly",
        start_date=start,
    )

    assert _should_generate(rt, start) is True


@pytest.mark.django_db
def test_quarterly_skips_one_month_later(get_user, create_recurring_task):
    start = date(2026, 1, 15)
    rt = create_recurring_task(
        user=get_user,
        frequency="quarterly",
        start_date=start,
    )

    assert _should_generate(rt, date(2026, 2, 15)) is False
    assert _should_generate(rt, date(2026, 3, 15)) is False


@pytest.mark.django_db
def test_quarterly_generates_three_months_later(get_user, create_recurring_task):
    start = date(2026, 1, 15)
    rt = create_recurring_task(
        user=get_user,
        frequency="quarterly",
        start_date=start,
    )

    assert _should_generate(rt, date(2026, 4, 15)) is True
    assert _should_generate(rt, date(2026, 7, 15)) is True
    assert _should_generate(rt, date(2026, 10, 15)) is True


# -----------------------
# Delete Series Tests
# -----------------------

@pytest.mark.django_db
def test_delete_series_removes_all_occurrences_and_recurring_task(auth_client, get_user, create_task, create_recurring_task):
    auth_client.force_authenticate(user=get_user)

    rt = create_recurring_task(
        user=get_user,
        frequency="daily",
        start_date=date(2026, 3, 1),
    )

    occ1 = create_task(user=get_user, title="Daily", begin_date=date(2026, 3, 1), recurring_task=rt)
    occ2 = create_task(user=get_user, title="Daily", begin_date=date(2026, 3, 2), recurring_task=rt)
    occ3 = create_task(user=get_user, title="Daily", begin_date=date(2026, 3, 3), recurring_task=rt)

    res = auth_client.delete(task_detail_url(occ1.id) + "?delete_series=true")
    assert res.status_code in (200, 204)

    assert not Task.objects.filter(recurring_task=rt).exists()
    assert not RecurringTask.objects.filter(id=rt.id).exists()


@pytest.mark.django_db
def test_delete_series_does_not_affect_other_recurring_tasks(auth_client, get_user, create_task, create_recurring_task):
    auth_client.force_authenticate(user=get_user)

    rt_a = create_recurring_task(user=get_user, frequency="daily", start_date=date(2026, 3, 1))
    rt_b = create_recurring_task(user=get_user, frequency="daily", start_date=date(2026, 3, 1))

    occ_a = create_task(user=get_user, title="A", begin_date=date(2026, 3, 1), recurring_task=rt_a)
    occ_b = create_task(user=get_user, title="B", begin_date=date(2026, 3, 1), recurring_task=rt_b)

    res = auth_client.delete(task_detail_url(occ_a.id) + "?delete_series=true")
    assert res.status_code in (200, 204)

    assert not RecurringTask.objects.filter(id=rt_a.id).exists()
    assert RecurringTask.objects.filter(id=rt_b.id).exists()
    assert Task.objects.filter(id=occ_b.id).exists()


# -----------------------
# Delete Future Tests
# -----------------------

@pytest.mark.django_db
def test_delete_future_removes_this_and_future_occurrences(auth_client, get_user, create_task, create_recurring_task):
    auth_client.force_authenticate(user=get_user)

    rt = create_recurring_task(
        user=get_user,
        frequency="daily",
        start_date=date(2026, 3, 1),
    )

    past_occ = create_task(user=get_user, title="Daily", begin_date=date(2026, 3, 1), recurring_task=rt)
    pivot_occ = create_task(user=get_user, title="Daily", begin_date=date(2026, 3, 3), recurring_task=rt)
    future_occ = create_task(user=get_user, title="Daily", begin_date=date(2026, 3, 5), recurring_task=rt)

    res = auth_client.delete(task_detail_url(pivot_occ.id) + "?delete_future=true")
    assert res.status_code in (200, 204)

    assert Task.objects.filter(id=past_occ.id).exists()
    assert not Task.objects.filter(id=pivot_occ.id).exists()
    assert not Task.objects.filter(id=future_occ.id).exists()


@pytest.mark.django_db
def test_delete_future_sets_recurring_task_end_date(auth_client, get_user, create_task, create_recurring_task):
    auth_client.force_authenticate(user=get_user)

    rt = create_recurring_task(
        user=get_user,
        frequency="daily",
        start_date=date(2026, 3, 1),
    )

    occ = create_task(user=get_user, title="Daily", begin_date=date(2026, 3, 5), recurring_task=rt)

    res = auth_client.delete(task_detail_url(occ.id) + "?delete_future=true")
    assert res.status_code in (200, 204)

    rt.refresh_from_db()
    assert rt.end_date == date(2026, 3, 5)


@pytest.mark.django_db
def test_delete_future_stops_future_generation(auth_client, get_user, create_task, create_recurring_task):
    auth_client.force_authenticate(user=get_user)

    rt = create_recurring_task(
        user=get_user,
        frequency="daily",
        start_date=date(2026, 3, 1),
    )

    occ = create_task(user=get_user, title="Daily", begin_date=date(2026, 3, 3), recurring_task=rt)

    auth_client.delete(task_detail_url(occ.id) + "?delete_future=true")

    # Try to regenerate across the cutoff range
    ensure_recurring_tasks_in_range(date(2026, 3, 3), date(2026, 3, 7), user=get_user)

    assert not Task.objects.filter(
        user=get_user,
        recurring_task=rt,
        begin_date__gte=date(2026, 3, 3),
    ).exists()


# -----------------------
# RecurringTask end_date Stops Generation
# -----------------------

@pytest.mark.django_db
def test_recurring_task_end_date_stops_generation(get_user, create_recurring_task):
    rt = create_recurring_task(
        user=get_user,
        frequency="daily",
        start_date=date(2026, 3, 1),
    )
    rt.end_date = date(2026, 3, 4)
    rt.save(update_fields=["end_date"])

    ensure_recurring_tasks_in_range(date(2026, 3, 1), date(2026, 3, 7), user=get_user)

    dates = list(
        Task.objects.filter(user=get_user, recurring_task=rt)
        .values_list("begin_date", flat=True)
    )

    assert date(2026, 3, 1) in dates
    assert date(2026, 3, 3) in dates
    assert date(2026, 3, 4) not in dates  # end_date is exclusive
    assert date(2026, 3, 5) not in dates


# -----------------------
# skip_weekends
# -----------------------

@pytest.mark.django_db
def test_skip_weekends_excludes_saturday_and_sunday(get_user, create_recurring_task):
    # 2026-03-30 is Monday; the week contains Sat 2026-04-04 and Sun 2026-04-05
    rt = create_recurring_task(
        user=get_user,
        frequency="daily",
        start_date=date(2026, 3, 30),
        skip_weekends=True,
    )

    ensure_recurring_tasks_in_range(date(2026, 3, 30), date(2026, 4, 5), user=get_user)

    dates = list(
        Task.objects.filter(user=get_user, recurring_task=rt)
        .values_list("begin_date", flat=True)
    )

    assert date(2026, 3, 30) in dates  # Monday
    assert date(2026, 3, 31) in dates  # Tuesday
    assert date(2026, 4, 1)  in dates  # Wednesday
    assert date(2026, 4, 2)  in dates  # Thursday
    assert date(2026, 4, 3)  in dates  # Friday
    assert date(2026, 4, 4)  not in dates  # Saturday
    assert date(2026, 4, 5)  not in dates  # Sunday


@pytest.mark.django_db
def test_skip_weekends_false_includes_saturday_and_sunday(get_user, create_recurring_task):
    rt = create_recurring_task(
        user=get_user,
        frequency="daily",
        start_date=date(2026, 3, 30),
        skip_weekends=False,
    )

    ensure_recurring_tasks_in_range(date(2026, 3, 30), date(2026, 4, 5), user=get_user)

    dates = list(
        Task.objects.filter(user=get_user, recurring_task=rt)
        .values_list("begin_date", flat=True)
    )

    assert date(2026, 4, 4) in dates  # Saturday
    assert date(2026, 4, 5) in dates  # Sunday


@pytest.mark.django_db
def test_skip_weekends_uses_should_generate_directly(get_user, create_recurring_task):
    rt = create_recurring_task(
        user=get_user,
        frequency="daily",
        start_date=date(2026, 3, 30),
        skip_weekends=True,
    )

    assert _should_generate(rt, date(2026, 4, 3)) is True   # Friday
    assert _should_generate(rt, date(2026, 4, 4)) is False  # Saturday
    assert _should_generate(rt, date(2026, 4, 5)) is False  # Sunday
    assert _should_generate(rt, date(2026, 4, 6)) is True   # Monday


# -----------------------
# Meeting Time Tests
# -----------------------

@pytest.mark.django_db
def test_meeting_time_fields_stored_and_returned(auth_client, tasks_list_url):
    """begin_time and end_time are persisted and returned by the API."""
    payload = {
        "title": "Standup",
        "category": "meeting",
        "begin_date": "2026-04-10",
        "begin_time": "09:00:00",
        "end_time": "09:30:00",
        "recurring_task": None,
    }
    res = auth_client.post(tasks_list_url, payload, format="json")
    assert res.status_code == 201, res.data
    assert res.data["begin_time"] == "09:00:00"
    assert res.data["end_time"] == "09:30:00"

    task_id = res.data["id"]
    res = auth_client.get(f"/api/tasks/{task_id}/")
    assert res.status_code == 200
    assert res.data["begin_time"] == "09:00:00"
    assert res.data["end_time"] == "09:30:00"


@pytest.mark.django_db
def test_meeting_time_fields_are_optional(auth_client, tasks_list_url):
    """Meetings without times are valid and return null for both time fields."""
    payload = {
        "title": "Untimed Meeting",
        "category": "meeting",
        "begin_date": "2026-04-10",
        "recurring_task": None,
    }
    res = auth_client.post(tasks_list_url, payload, format="json")
    assert res.status_code == 201, res.data
    assert res.data["begin_time"] is None
    assert res.data["end_time"] is None


@pytest.mark.django_db
def test_effective_is_done_past_date(auth_client, get_user):
    """Meeting with a past begin_date is auto-done regardless of time."""
    task = Task.objects.create(
        user=get_user,
        title="Yesterday's Meeting",
        category="meeting",
        begin_date=date(2026, 1, 1),
        begin_time=None,
    )
    res = auth_client.get(f"/api/tasks/{task.id}/")
    assert res.status_code == 200
    assert res.data["effective_is_done"] is True
    assert res.data["is_done"] is False


@pytest.mark.django_db
def test_effective_is_done_today_time_has_passed(auth_client, get_user):
    """Meeting today whose begin_time has already passed is auto-done."""
    fake_now = datetime(2026, 4, 3, 15, 0, 0, tzinfo=dt_timezone.utc)

    task = Task.objects.create(
        user=get_user,
        title="Morning Standup",
        category="meeting",
        begin_date=date(2026, 4, 3),
        begin_time=datetime.strptime("09:00", "%H:%M").time(),
    )
    with patch("api.serializers.timezone.now", return_value=fake_now):
        res = auth_client.get(f"/api/tasks/{task.id}/")

    assert res.status_code == 200
    assert res.data["effective_is_done"] is True
    assert res.data["is_done"] is False


@pytest.mark.django_db
def test_effective_is_done_today_time_not_yet(auth_client, get_user):
    """Meeting today whose begin_time hasn't arrived yet is NOT auto-done."""
    fake_now = datetime(2026, 4, 3, 8, 0, 0, tzinfo=dt_timezone.utc)

    task = Task.objects.create(
        user=get_user,
        title="Afternoon Sync",
        category="meeting",
        begin_date=date(2026, 4, 3),
        begin_time=datetime.strptime("14:00", "%H:%M").time(),
    )
    with patch("api.serializers.timezone.now", return_value=fake_now):
        res = auth_client.get(f"/api/tasks/{task.id}/")

    assert res.status_code == 200
    assert res.data["effective_is_done"] is False


@pytest.mark.django_db
def test_effective_is_done_today_no_time(auth_client, get_user):
    """Meeting today with no begin_time is NOT auto-done (date alone is not enough)."""
    fake_now = datetime(2026, 4, 3, 23, 59, 0, tzinfo=dt_timezone.utc)

    task = Task.objects.create(
        user=get_user,
        title="Timeless Meeting",
        category="meeting",
        begin_date=date(2026, 4, 3),
        begin_time=None,
    )
    with patch("api.serializers.timezone.now", return_value=fake_now):
        res = auth_client.get(f"/api/tasks/{task.id}/")

    assert res.status_code == 200
    assert res.data["effective_is_done"] is False

@pytest.mark.django_db
def test_marking_parent_done_cascades_to_children(auth_client, get_user):
    """Marking a parent task done should also mark all incomplete children done."""
    parent = Task.objects.create(
        user=get_user,
        title="Parent Task",
        category="task",
        begin_date=date(2026, 4, 7),
        is_done=False,
    )
    child1 = Task.objects.create(
        user=get_user,
        title="Child One",
        category="task",
        begin_date=date(2026, 4, 7),
        parent=parent,
        is_done=False,
    )
    child2 = Task.objects.create(
        user=get_user,
        title="Child Two",
        category="task",
        begin_date=date(2026, 4, 7),
        parent=parent,
        is_done=False,
    )
    already_done_child = Task.objects.create(
        user=get_user,
        title="Already Done Child",
        category="task",
        begin_date=date(2026, 4, 7),
        parent=parent,
        is_done=True,
    )

    res = auth_client.patch(f"/api/tasks/{parent.id}/", {"is_done": True}, format="json")
    assert res.status_code == 200
    assert res.data["is_done"] is True

    child1.refresh_from_db()
    child2.refresh_from_db()
    already_done_child.refresh_from_db()

    assert child1.is_done is True
    assert child2.is_done is True
    # already-done child is untouched (end_date not overwritten)
    assert already_done_child.is_done is True


# -----------------------
# Deadline Date Tests
# -----------------------

@pytest.mark.django_db
def test_deadline_date_default_is_null(auth_client, tasks_list_url):
    """Tasks created without a deadline return null for deadline_date."""
    res = auth_client.post(tasks_list_url, task_payload(), format="json")
    assert res.status_code == 201, res.data
    assert res.data["deadline_date"] is None


@pytest.mark.django_db
def test_deadline_date_stored_and_returned(auth_client, tasks_list_url):
    """A deadline set on create is persisted and returned by the API."""
    res = auth_client.post(
        tasks_list_url,
        task_payload(deadline_date="2026-12-31"),
        format="json",
    )
    assert res.status_code == 201, res.data
    assert res.data["deadline_date"] == "2026-12-31"

    task_id = res.data["id"]
    res = auth_client.get(f"/api/tasks/{task_id}/")
    assert res.status_code == 200
    assert res.data["deadline_date"] == "2026-12-31"


@pytest.mark.django_db
def test_deadline_date_can_be_set_via_patch(auth_client, get_user, create_task):
    """PATCH can add a deadline to an existing task."""
    task = create_task(title="No deadline yet", begin_date=date.today(), user=get_user)
    assert task.deadline_date is None

    res = auth_client.patch(
        task_detail_url(task.id),
        {"deadline_date": "2026-06-01"},
        format="json",
    )
    assert res.status_code == 200
    assert res.data["deadline_date"] == "2026-06-01"

    task.refresh_from_db()
    assert task.deadline_date == date(2026, 6, 1)


@pytest.mark.django_db
def test_deadline_date_can_be_cleared_via_patch(auth_client, get_user):
    """PATCH can remove a deadline by setting it to null."""
    task = Task.objects.create(
        user=get_user,
        title="Has a deadline",
        begin_date=date.today(),
        deadline_date=date(2026, 6, 1),
        category="task",
    )

    res = auth_client.patch(
        task_detail_url(task.id),
        {"deadline_date": None},
        format="json",
    )
    assert res.status_code == 200
    assert res.data["deadline_date"] is None

    task.refresh_from_db()
    assert task.deadline_date is None


@pytest.mark.django_db
def test_deadline_date_survives_marking_done(auth_client, get_user):
    """Completing a task does not clear its deadline (unlike end_date)."""
    task = Task.objects.create(
        user=get_user,
        title="Task with deadline",
        begin_date=date.today(),
        deadline_date=date(2026, 12, 31),
        category="task",
    )

    res = auth_client.patch(
        task_detail_url(task.id),
        {"is_done": True},
        format="json",
    )
    assert res.status_code == 200
    assert res.data["is_done"] is True
    assert res.data["deadline_date"] == "2026-12-31"

    task.refresh_from_db()
    assert task.deadline_date == date(2026, 12, 31)
    assert task.end_date == date.today()  # end_date stamped; deadline untouched


@pytest.mark.django_db
def test_deadline_date_survives_marking_undone(auth_client, get_user):
    """Un-completing a task clears end_date but leaves deadline intact."""
    task = Task.objects.create(
        user=get_user,
        title="Done task with deadline",
        begin_date=date.today(),
        deadline_date=date(2026, 12, 31),
        end_date=date.today(),
        is_done=True,
        category="task",
    )

    res = auth_client.patch(
        task_detail_url(task.id),
        {"is_done": False},
        format="json",
    )
    assert res.status_code == 200
    assert res.data["end_date"] is None
    assert res.data["deadline_date"] == "2026-12-31"

    task.refresh_from_db()
    assert task.end_date is None
    assert task.deadline_date == date(2026, 12, 31)
