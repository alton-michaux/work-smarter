import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User


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
