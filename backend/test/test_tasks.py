import pytest

@pytest.mark.django_db
def test_task_index(api_client, get_token):
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {get_token}")
    response = api_client.get("/api/tasks/")
    assert response.status_code == 200
  
@pytest.mark.django_db
def test_task_create(api_client, get_token, get_user):
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {get_token}")
    user = get_user
    response = api_client.post("/api/tasks/", {
      "title": "Test Task",
      "description": "Task for testing",
      "begin_date": "2025-11-09",
      "is_done": False,
      "user": user.id
    })
    assert response.status_code == 201
  
@pytest.mark.django_db
def test_task_update(api_client, get_token, get_user, create_task):
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {get_token}")
    user = get_user
    task = create_task(title="test_update", description="for testing update", begin_date="2025-07-31", is_done=True, user=user)
    response = api_client.put(f"/api/tasks/{task.id}/", {
      "title": "Test Task Update",
      "description": "Task for testing update",
      "begin_date": "2025-11-09",
      "is_done": False,
      "user": user.id
    })
    assert response.status_code == 200
  
@pytest.mark.django_db
def test_task_delete(api_client, get_token, get_user, create_task):
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {get_token}")
    user = get_user
    task = create_task(title="test_delete", description="for testing delete", begin_date="2025-08-01", is_done=False, user=user)
    response = api_client.delete(f"/api/tasks/{task.id}/")
    assert response.status_code == 204
