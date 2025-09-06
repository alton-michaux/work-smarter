import pytest
from api.models import Project

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
    assert isinstance(response.data["results"], list)
  
@pytest.mark.django_db
def test_project_create(auth_client, get_user):
    response = auth_client.post("/api/projects/", project_payload(get_user))
    assert response.status_code == 201
    assert response.data["name"] == "Test Project"
    assert Project.objects.filter(name="Test Project", user=get_user).exists()
  
@pytest.mark.django_db
def test_project_update(auth_client, get_user, create_project):
    project = create_project(name="test_update", user=get_user)
    response = auth_client.put(f"/api/projects/{project.id}/", project_payload(get_user, name="Test Project Update"))
    assert response.status_code == 200
    assert response.data["name"] == "Test Project Update"
    project.refresh_from_db()
    assert project.name == "Test Project Update"
  
@pytest.mark.django_db
def test_project_delete(auth_client, get_user, create_project):
    project = create_project(name="test_delete", user=get_user)
    response = auth_client.delete(f"/api/projects/{project.id}/")
    assert response.status_code == 204
    assert not Project.objects.filter(id=project.id).exists()