import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from api.models import Task
from django.contrib.auth import get_user_model



@pytest.fixture
def api_client():
    """
    Provides a DRF APIClient instance for making requests in tests.
    """
    return APIClient()


@pytest.fixture
def create_user(db):
    """
    A factory function to create users easily in tests.
    Usage:
        user = create_user(username="john", password="doe123")
    """
    def make_user(username="testuser", email="testemail@email.com", password="testpass"):
        return User.objects.create_user(username=username, email=email, password=password)
    return make_user

@pytest.fixture
def create_task(db):
    """
    A factory function to create tasks easily in tests.
    Usage:
        task = create_taks(title="work", description="coding", begin_date="0000-00-00", is_done=True, user=1)
    """
    user = get_user
    def make_task(title="work", description="coding", begin_date="0000-00-00", is_done=True, user=user):
        return Task.objects.create(title=title, description=description, begin_date=begin_date, is_done=is_done, user=user)
    return make_task

@pytest.fixture
def get_user():
    """
    fetch default user
    """
    queryset = get_user_model().objects.filter(email="alice@wonderland.com")
    user = queryset.first()
    return user

@pytest.fixture()
def get_token(api_client, create_user):
    """
    function that instantiates a user, logs them in and returns the token
    Usage:
        token = get_token
    """
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    login_response = api_client.post(
        "/api/auth/login/",
        {"email": user.email, "password": "madhatter"},
        format="json"
    )
    token = login_response.data["key"]
    return token
