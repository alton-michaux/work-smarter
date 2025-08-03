import pytest

def project_payload(user, **overrides):
    payload = {
        "name": "Test Project",
        "user": user.id
    }
    payload.update(overrides)
    return payload

@pytest.mark.django_db
def test_project_index(auth_client):
    response = auth_client.get("/api/projects/")
    assert response.status_code == 200  
  
@pytest.mark.django_db
def test_project_create(auth_client, get_user):
    response = auth_client.post("/api/projects/", project_payload(get_user))
    assert response.status_code == 201
  
@pytest.mark.django_db
def test_project_update(auth_client, get_user, create_project):
    project = create_project(name="test_update", user=get_user)
    response = auth_client.put(f"/api/projects/{project.id}/", project_payload(get_user, name="Test Project Update"))
    assert response.status_code == 200
  
@pytest.mark.django_db
def test_project_delete(auth_client, get_user, create_project):
    project = create_project(name="test_delete", user=get_user)
    response = auth_client.delete(f"/api/projects/{project.id}/")
    assert response.status_code == 204