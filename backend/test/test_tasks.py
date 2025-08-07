import io
import pytest
from datetime import date, timedelta
from api.models import Task

def task_payload(user, **overrides):
    payload = {
        "title": "Test Task",
        "description": "Task for testing",
        "begin_date": "2025-11-09",
        "is_done": False,
        "user": user.id
    }
    payload.update(overrides)
    return payload
  
def create_file():    
    # Simulate a .txt file with task content expected by DevParser
    file_content = """
    Work:
    - [ ] Test Import Task
    """
    file = io.BytesIO(file_content.encode("utf-8"))
    file.name = "tasks.txt"
    
    return file

@pytest.mark.django_db
def test_task_index(auth_client):
    response = auth_client.get("/api/tasks/")
    assert response.status_code == 200
    assert isinstance(response.data, list)
    
@pytest.mark.django_db
def test_weekly_task_filtering(auth_client, get_user, create_task):
    # Week boundaries
    start_of_week = date(2025, 8, 4)   # Monday
    end_of_week = date(2025, 8, 10)    # Sunday

    # Included: Ongoing task (starts before, no end date)
    create_task(title="Ongoing Task", begin_date="2025-08-01", is_done=False, user=get_user)

    # Included: Task starts during the week
    create_task(title="New Task This Week", begin_date="2025-08-06", is_done=False, user=get_user)

    # Included: No begin_date, completed this week
    create_task(title="No Begin, Done This Week", begin_date=None, end_date="2025-08-05", is_done=True, user=get_user)

    # Excluded: Completed before the week
    create_task(title="Done Last Week", begin_date="2025-07-25", end_date="2025-08-02", is_done=True, user=get_user)

    # Excluded: Starts after the week
    create_task(title="Future Task", begin_date="2025-08-15", is_done=False, user=get_user)

    # Call the endpoint with begin_date and end_date query params
    response = auth_client.get(f"/api/tasks/?begin_date={start_of_week}&end_date={end_of_week}")

    assert response.status_code == 200
    titles = [task["title"] for task in response.data]

    assert "Ongoing Task" in titles
    assert "New Task This Week" in titles
    assert "No Begin, Done This Week" in titles

    assert "Done Last Week" not in titles
    assert "Future Task" not in titles
  
@pytest.mark.django_db
def test_task_create(auth_client, get_user):
    response = auth_client.post("/api/tasks/", task_payload(get_user))
    assert response.status_code == 201
    assert response.data["title"] == "Test Task"
    assert Task.objects.filter(title="Test Task", user=get_user).exists()
  
@pytest.mark.django_db
def test_task_update(auth_client, get_user, create_task):
    task = create_task(title="test_update", description="for testing update", begin_date="2025-07-31", end_date="2025-08-01", is_done=True, user=get_user)
    response = auth_client.put(f"/api/tasks/{task.id}/", task_payload(get_user, title="Test Task Update", description="Task for testing update"))
    assert response.status_code == 200
    assert response.data["title"] == "Test Task Update"
    task.refresh_from_db()
    assert task.title == "Test Task Update"
  
@pytest.mark.django_db
def test_task_delete(auth_client, get_user, create_task):
    task = create_task(title="test_delete", description="for testing delete", begin_date="2025-08-01", is_done=False, user=get_user)
    response = auth_client.delete(f"/api/tasks/{task.id}/")
    assert response.status_code == 204
    assert not Task.objects.filter(id=task.id).exists()

@pytest.mark.django_db
def test_import_tasks(auth_client):
    response = auth_client.post(
        "/api/import/",
        {"file": create_file()},
        format="multipart"
    )
    assert response.status_code == 201
    assert "imported" in response.data
    assert response.data["imported"] > 0
