import pytest

@pytest.mark.django_db
def test_task_index(api_client, get_token):
    token = get_token    
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    response = api_client.get("/api/tasks/")
    assert response.status_code == 200
  
@pytest.mark.django_db
def test_task_create(api_client, get_token, get_user):  
    token = get_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    user = get_user
    response = api_client.post("/api/tasks/", {
      "title": "Test Task",
      "description": "Task for testing",
      "begin_date": "2025-11-09",
      "is_done": False,
      "user": user.id
    })
    print(f"response: {response.data}")
    assert response.status_code == 201
  
@pytest.mark.django_db
def test_task_update(api_client):
  print("task_update")
  
@pytest.mark.django_db
def test_task_delete(api_client):
  print("task_delete")
