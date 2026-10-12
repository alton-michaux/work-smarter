import pytest

@pytest.mark.django_db
def test_registration_success(api_client):
    response = api_client.post(
        "/api/auth/registration/",
        {
            "username": "newuser",
            "email": "newuser@example.com",
            "password1": "strongpassword123",
            "password2": "strongpassword123"
        },
        format="json"
    )
    assert response.status_code == 201
    # Tokens are delivered as httpOnly cookies now, never in the JSON body.
    assert "access" not in response.data and "refresh" not in response.data

@pytest.mark.django_db
def test_registration_password_mismatch(api_client):
    response = api_client.post(
        "/api/auth/registration/",
        {
            "username": "failuser",
            "email": "failuser@example.com",
            "password1": "password123",
            "password2": "differentpassword"
        },
        format="json"
    )
    assert response.status_code == 400
    assert "password" in str(response.data).lower()

@pytest.mark.django_db
def test_login_success(api_client, create_user):
    user = create_user(username= "alice", email="alice@wonderland.com", password="madhatter")
    response = api_client.post("/api/auth/login/", {"email": user.email, "password": "madhatter"}, format="json")
    assert response.status_code == 200
    # Tokens are delivered as httpOnly cookies now, never in the JSON body.
    assert "access" not in response.data and "refresh" not in response.data
    assert response.cookies["ws-access"].value
    assert response.cookies["ws-access"]["httponly"]
    assert response.cookies["ws-refresh"].value

@pytest.mark.django_db
def test_login_fail(api_client):
    response = api_client.post("/api/auth/login/", {"email": "notreal@example.com", "password": "wrong_password"}, format="json")
    assert response.status_code == 401
    assert "detail" in response.data or "non_field_errors" in response.data
    
@pytest.mark.django_db
def test_logout(api_client, create_user):
    user = create_user(username="bob", email="bob@builder.com", password="canwefixit")
    login_response = api_client.post("/api/auth/login/", {"email": user.email, "password": "canwefixit"}, format="json")
    assert login_response.status_code == 200

    logout_response = api_client.post("/api/auth/logout/")
    assert logout_response.status_code == 200
    assert "detail" in logout_response.data or "success" in logout_response.data


@pytest.mark.django_db
def test_registration_creates_pending_user_without_cookies(api_client, django_user_model):
    response = api_client.post(
        "/api/auth/registration/",
        {
            "username": "pending",
            "email": "pending@example.com",
            "password1": "strongpassword123",
            "password2": "strongpassword123",
        },
        format="json",
    )
    assert response.status_code == 201
    assert "pending" in response.data["detail"].lower()
    assert "ws-access" not in response.cookies and "ws-refresh" not in response.cookies
    assert django_user_model.objects.get(email="pending@example.com").is_active is False


@pytest.mark.django_db
def test_login_pending_user_returns_403(api_client, create_user):
    user = create_user(username="waiting", email="waiting@example.com", password="letmein123")
    user.is_active = False
    user.save()

    response = api_client.post("/api/auth/login/", {"email": user.email, "password": "letmein123"}, format="json")
    assert response.status_code == 403
    assert "pending" in response.data["error"].lower()
    assert "ws-access" not in response.cookies


@pytest.mark.django_db
def test_login_pending_user_wrong_password_returns_401(api_client, create_user):
    user = create_user(username="waiting", email="waiting@example.com", password="letmein123")
    user.is_active = False
    user.save()

    response = api_client.post("/api/auth/login/", {"email": user.email, "password": "nope"}, format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_approved_user_can_log_in(api_client, django_user_model):
    api_client.post(
        "/api/auth/registration/",
        {
            "username": "approved",
            "email": "approved@example.com",
            "password1": "strongpassword123",
            "password2": "strongpassword123",
        },
        format="json",
    )
    django_user_model.objects.filter(email="approved@example.com").update(is_active=True)

    response = api_client.post(
        "/api/auth/login/", {"email": "approved@example.com", "password": "strongpassword123"}, format="json"
    )
    assert response.status_code == 200
    assert response.cookies["ws-access"].value


@pytest.mark.django_db
def test_refresh_rejected_after_deactivation(api_client, create_user):
    user = create_user(username="carol", email="carol@example.com", password="refreshme1")
    login = api_client.post("/api/auth/login/", {"email": user.email, "password": "refreshme1"}, format="json")
    assert login.status_code == 200

    user.is_active = False
    user.save()

    response = api_client.post("/api/auth/refresh/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_social_complete_redirects_pending_user(client, create_user, settings):
    # The default backends never resolve an inactive session user (allauth
    # stops them first); allow it here to exercise the view's own guard.
    settings.AUTHENTICATION_BACKENDS = ["django.contrib.auth.backends.AllowAllUsersModelBackend"]
    user = create_user(username="social", email="social@example.com", password="x-unused-1")
    user.is_active = False
    user.save()
    client.force_login(user)

    response = client.get("/api/auth/social/complete/")
    assert response.status_code == 302
    assert response.url.endswith("/login?error=pending")
    assert "ws-access" not in response.cookies
