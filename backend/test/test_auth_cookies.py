import pytest


def _login(api_client, user, password):
    return api_client.post(
        "/api/auth/login/",
        {"email": user.email, "password": password},
        format="json",
    )


def _csrf_header(api_client):
    """Seed the CSRF cookie (as the frontend does on bootstrap) and return the
    header dict a subsequent mutating request needs to pass the manual CSRF
    check in CookieTokenRefreshView."""
    api_client.get("/api/auth/csrf/")
    token = api_client.cookies["csrftoken"].value
    return {"HTTP_X_CSRFTOKEN": token}


@pytest.mark.django_db
def test_login_sets_httponly_cookies_and_no_body_tokens(api_client, create_user):
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    response = _login(api_client, user, "madhatter")

    assert response.status_code == 200
    assert "access" not in response.data and "refresh" not in response.data

    assert response.cookies["ws-access"].value
    assert response.cookies["ws-access"]["httponly"]
    assert response.cookies["ws-refresh"].value
    assert response.cookies["ws-refresh"]["httponly"]


@pytest.mark.django_db
def test_cookie_only_request_is_authenticated(api_client, create_user):
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    _login(api_client, user, "madhatter")

    # No .credentials()/Authorization header set — relies purely on the
    # cookies the test client picked up from the login response.
    response = api_client.get("/api/user/")
    assert response.status_code == 200


@pytest.mark.django_db
def test_bearer_header_still_works(api_client, create_user):
    """Existing API clients / pytest fixtures that send a raw Bearer token
    must keep working (JWTCookieAuthentication checks the header first)."""
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    login_response = _login(api_client, user, "madhatter")
    access = login_response.cookies["ws-access"].value

    fresh_client = api_client.__class__()
    fresh_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    response = fresh_client.get("/api/user/")
    assert response.status_code == 200


@pytest.mark.django_db
def test_refresh_rotates_cookies(api_client, create_user):
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    _login(api_client, user, "madhatter")
    old_refresh = api_client.cookies["ws-refresh"].value

    response = api_client.post("/api/auth/refresh/", **_csrf_header(api_client))

    assert response.status_code == 200
    assert response.cookies["ws-access"].value
    assert response.cookies["ws-refresh"].value != old_refresh


@pytest.mark.django_db
def test_refresh_without_csrf_header_is_rejected(api_client, create_user):
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    _login(api_client, user, "madhatter")

    # Seed the CSRF cookie but deliberately omit the X-CSRFToken header —
    # this is what a cross-site attacker's form submission would look like.
    api_client.get("/api/auth/csrf/")
    response = api_client.post("/api/auth/refresh/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_logout_clears_cookies_and_revokes_session(api_client, create_user):
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    _login(api_client, user, "madhatter")

    logout_response = api_client.post("/api/auth/logout/")
    assert logout_response.status_code == 200

    response = api_client.get("/api/user/")
    assert response.status_code == 401
