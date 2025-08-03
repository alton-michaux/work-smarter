import io
import pytest

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

@pytest.mark.django_db
def test_task_index(auth_client):
    response = auth_client.get("/api/tasks/")
    assert response.status_code == 200
  
@pytest.mark.django_db
def test_task_create(auth_client, get_user):
    response = auth_client.post("/api/tasks/", task_payload(get_user))
    assert response.status_code == 201
  
@pytest.mark.django_db
def test_task_update(auth_client, get_user, create_task):
    task = create_task(title="test_update", description="for testing update", begin_date="2025-07-31", is_done=True, user=get_user)
    response = auth_client.put(f"/api/tasks/{task.id}/", task_payload(get_user, title="Test Task Update", description="Task for testing update"))
    assert response.status_code == 200
  
@pytest.mark.django_db
def test_task_delete(auth_client, get_user, create_task):
    task = create_task(title="test_delete", description="for testing delete", begin_date="2025-08-01", is_done=False, user=get_user)
    response = auth_client.delete(f"/api/tasks/{task.id}/")
    assert response.status_code == 204

@pytest.mark.django_db
def test_import_tasks(auth_client, get_user):
    # Simulate a .txt file with task content expected by DevParser
    file_content = """
    [Task]
    category: Work
    title: Test Import Task
    done: False
    priority: 1
    carry_over: False
    description: Imported task for testing
    sub_task: False
    """
    file = io.BytesIO(file_content.encode("utf-8"))
    file.name = "tasks.txt"

    response = auth_client.post(
        "/api/import/",
        {"file": file},
        format="multipart"
    )
    assert response.status_code == 201
    assert "imported" in response.data
