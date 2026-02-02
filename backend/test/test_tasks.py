import pytest
from datetime import date, timedelta
from api.models import Task

def task_payload(user, **overrides):
    payload = {
        "title": "Test Task",
        "description": "Task for testing",
        "begin_date": date.today(),
        "is_done": False,
        "user": user.id,
        "recurring_task": ""
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
        # pick a start date that ensures occurrences exist across weeks
        start_date=(start_of_week - timedelta(days=14)).isoformat(),
        day_of_week=start_of_week.weekday(),  # same weekday as start_of_week
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
  
@pytest.mark.django_db
def test_task_create(auth_client, get_user):
    response = auth_client.post("/api/tasks/", task_payload(get_user))
    assert response.status_code == 201
    assert response.data["title"] == "Test Task"
    assert Task.objects.filter(title="Test Task", user=get_user).exists()
  
@pytest.mark.django_db
def test_task_update(auth_client, get_user, create_task):
    task = create_task(title="test_update", description="for testing update", begin_date="2025-07-31", end_date=None, is_done=False, user=get_user)
    response = auth_client.put(f"/api/tasks/{task.id}/", task_payload(get_user, title="Test Task Update", description="Task for testing update", is_done=True))
    
    assert response.status_code == 200
    assert response.data["title"] == "Test Task Update"
    
    task.refresh_from_db()
    
    print({f.name: getattr(task, f.name) for f in task._meta.fields})
    assert task.title == "Test Task Update"
    assert task.end_date == date.today() # ensures that end_date is populated when task is marked as "done"
    
    response = auth_client.put(f"/api/tasks/{task.id}/", task_payload(get_user, is_done=False))
    task.refresh_from_db()
    
    assert task.end_date == None # end_date should be cleared when "done" task is marked as "False"
  
@pytest.mark.django_db
def test_task_delete(auth_client, get_user, create_task):
    task = create_task(title="test_delete", description="for testing delete", begin_date="2025-08-01", is_done=False, user=get_user)
    response = auth_client.delete(f"/api/tasks/{task.id}/")
    assert response.status_code == 204
    assert not Task.objects.filter(id=task.id).exists()
