import pytest
import io
from datetime import date
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from api.models import Task, Project, RecurringTask
from django.contrib.auth import get_user_model

# --- API Client Fixtures ---

@pytest.fixture
def api_client():
    """Provides a DRF APIClient instance for making requests in tests."""
    return APIClient()

@pytest.fixture
def auth_client(api_client, get_token):
    """Returns an APIClient with authentication credentials set."""
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {get_token}")
    return api_client

# --- User Fixtures ---

@pytest.fixture
def create_user(db):
    """
    Factory to create users easily in tests.
    Usage:
        user = create_user(username="john", password="doe123")
    """
    def make_user(username="testuser", email="testemail@email.com", password="testpass"):
        return User.objects.create_user(username=username, email=email, password=password)
    return make_user

@pytest.fixture
def get_user():
    """Fetch default user by email."""
    queryset = get_user_model().objects.filter(email="alice@wonderland.com")
    user = queryset.first()
    return user

@pytest.fixture()
def get_token(api_client, create_user):
    """
    Instantiates a user, logs them in, and returns the token.
    Usage:
        token = get_token
    """
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    login_response = api_client.post(
        "/api/auth/login/",
        {"username": user.username, "password": "madhatter"},
        format="json"
    )
    token = login_response.data["access"]
    return token

# --- API Endpoint Fixtures ---

@pytest.fixture
def create_task(db):
    """
    Factory to create tasks easily in tests.
    Usage:
        task = create_task(title="work", description="coding", begin_date="0000-00-00", is_done=True, user=1, recurring_task="")
    """
    def make_task(
        title="work", 
        description="coding", 
        begin_date="0000-00-00", 
        end_date="0000-00-00", 
        is_done=True, 
        user=None,
        recurring_task=None
        ):
            return Task.objects.create(
                title=title, 
                description=description, 
                begin_date=begin_date, 
                end_date=end_date, 
                is_done=is_done, 
                user=user,
                recurring_task=recurring_task
            )
    return make_task

@pytest.fixture
def create_recurring_task(db):
    """"
    Factory to create recurring tasks for tests.
    Usage:
        recurring_task = create_recurring_task(title="work", description="coding", begin_date="0000-00-00", is_done=True, user=1)
    """
    def make_recurring_task(
        title="Recurring",
        project=None,
        category=None,
        frequency="weekly",     # 'daily' | 'weekly' | 'monthly'
        day_of_week=None,       # required for weekly
        start_date=None,        # required by your model
        is_active=True,
        last_generated_at=None,
        user=None,
    ):
        if start_date is None:
            start_date = date.today()

        # Enforce weekly rules so tests fail loudly if misconfigured
        if frequency == "weekly" and day_of_week is None:
            raise ValueError("day_of_week is required when frequency='weekly'")

        if frequency != "weekly":
            day_of_week = None

        return RecurringTask.objects.create(
            title=title,
            project=project,
            category=category,
            frequency=frequency,
            day_of_week=day_of_week,
            start_date=start_date,
            is_active=is_active,
            last_generated_at=last_generated_at,
            user=user,  # only include if your model has user FK
        )
    return make_recurring_task

@pytest.fixture
def create_project(db):
    """
    Factory to create projects easily in tests.
    Usage:
        project = create_project(name="work", user=1)
    """
    def make_project(name="work", user=None):
        return Project.objects.create(name=name, user=user)
    return make_project

@pytest.fixture
def create_file():
    def make_file(content=None):
        file_content = content or """
        Week of: 2024-03-11
        Dev:
        - [ ] Auto-generated task
        """
        file = io.BytesIO(file_content.encode("utf-8"))
        file.name = "tasks.txt"
        return file
    return make_file
