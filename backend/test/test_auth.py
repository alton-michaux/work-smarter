import pytest

@pytest.mark.django_db
def test_login_success(api_client, create_user):
    user = create_user(username= "alice", email="alice@wonderland.com", password="madhatter")
    response = api_client.post("/api/auth/login/", {"email": user.email, "password": "madhatter"}, format="json")
    assert response.status_code == 200

@pytest.mark.django_db
def test_login_fail(api_client):
    response = api_client.post("/api/auth/login/", {"email": "bill@wrong.com", "password": f"wrong_password"}, format="json")
    assert response.status_code == 400
