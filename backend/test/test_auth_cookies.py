import pytest
from rest_framework.test import APIClient


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
def test_refresh_without_csrf_header_is_rejected(create_user):
    # APIClient skips CSRF checks by default (it flags the request with
    # _dont_enforce_csrf_checks, which Django's CSRF middleware honors), so
    # this test needs a client that behaves like a real browser.
    api_client = APIClient(enforce_csrf_checks=True)
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


@pytest.mark.django_db
def test_api_key_management_accepts_cookie_auth(create_user):
    # Key management overrides authentication_classes, so it doesn't inherit
    # the cookie-aware default — force_authenticate in test_api_keys.py can't
    # catch that, hence a real login + CSRF-enforcing client here.
    api_client = APIClient(enforce_csrf_checks=True)
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    _login(api_client, user, "madhatter")

    assert api_client.get("/api/keys/").status_code == 200

    response = api_client.post(
        "/api/keys/", {"name": "laptop", "scope": "read"}, format="json",
        **_csrf_header(api_client),
    )
    assert response.status_code == 201

    assert api_client.get("/api/v1/tasks/").status_code == 200


def _refresh_with(raw_refresh):
    """POST to the refresh endpoint from a fresh client holding only this token."""
    client = APIClient()
    client.cookies["ws-refresh"] = raw_refresh
    return client.post("/api/auth/refresh/")


@pytest.mark.django_db
def test_logout_revokes_refresh_token(api_client, create_user):
    # Clearing cookies only protects a well-behaved browser. A copied refresh
    # token must stop working too, or logout doesn't actually end the session.
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    _login(api_client, user, "madhatter")
    refresh = api_client.cookies["ws-refresh"].value

    assert api_client.post("/api/auth/logout/").status_code == 200

    assert _refresh_with(refresh).status_code == 401


@pytest.mark.django_db
def test_logout_deletes_refresh_cookie_on_the_path_it_was_set(api_client, create_user):
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    login = _login(api_client, user, "madhatter")
    set_path = login.cookies["ws-refresh"]["path"]

    logout = api_client.post("/api/auth/logout/")

    cleared = logout.cookies["ws-refresh"]
    assert cleared.value == ""
    # A delete on any other path leaves the browser's cookie in place.
    assert cleared["path"] == set_path


@pytest.mark.django_db
def test_rotated_refresh_token_cannot_be_reused(api_client, create_user):
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    _login(api_client, user, "madhatter")
    old_refresh = api_client.cookies["ws-refresh"].value

    assert _refresh_with(old_refresh).status_code == 200
    assert _refresh_with(old_refresh).status_code == 401
