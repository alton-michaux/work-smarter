import pytest
from datetime import date, timedelta
from django.urls import reverse
from api.models import Task

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
        category="Dev",
    )

    payload = {
        "title": "Child",
        "begin_date": "2026-02-03",
        "project": project.id,
        "category": "Dev",
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
        category="Dev",
    )

    payload = {
        "title": "Child",
        "project": project.id,
        "category": "Dev",
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
        category="Dev",
    )

    payload = {
        "title": "Child",
        "begin_date": "2026-02-04",  # mismatch
        "project": project.id,
        "category": "Dev",
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
        category="Dev",
    )
    child = Task.objects.create(
        user=get_user,
        title="Child",
        begin_date=date(2026, 2, 3),
        project=project,
        category="Dev",
        parent=parent,
    )

    payload = {
        "title": "Grandchild",
        "begin_date": "2026-02-03",
        "project": project.id,
        "category": "Dev",
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
        category="Dev",
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
        category="Dev",
    )

    payload = {
        "title": "Child",
        "begin_date": "2026-02-03",
        "category": "Dev",
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
        "category": "Dev",
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
        category="Dev",
        user=get_user,
    )
    child = create_task(
        title="Child",
        begin_date=date(2026, 2, 3),
        category="Dev",
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
