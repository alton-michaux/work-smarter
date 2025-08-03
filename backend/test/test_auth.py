import pytest

@pytest.mark.django_db
def test_login_success(api_client, create_user):
    user = create_user(username= "alice", email="alice@wonderland.com", password="madhatter")
    response = api_client.post("/api/auth/login/", {"email": user.email, "password": "madhatter"}, format="json")
    assert response.status_code == 200
    assert "key" in response.data or "access" in response.data

@pytest.mark.django_db
def test_login_fail(api_client):
    response = api_client.post("/api/auth/login/", {"email": "bill@wrong.com", "password": f"wrong_password"}, format="json")
    assert response.status_code == 400
    assert "error" in response.data or "non_field_errors" in response.data
    
@pytest.mark.django_db
def test_logout(api_client, create_user):
    user = create_user(username="bob", email="bob@builder.com", password="canwefixit")
    login_response = api_client.post("/api/auth/login/", {"email": user.email, "password": "canwefixit"}, format="json")
    assert login_response.status_code == 200

    logout_response = api_client.post("/api/auth/logout/")
    assert logout_response.status_code == 200
    assert "detail" in logout_response.data or "success" in logout_response.data
