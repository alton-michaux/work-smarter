from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from api.models import Resume

_FAKE_ANALYSIS = {
    "score": 7.5,
    "summary": "fine",
    "suggestions": [],
    "accomplishments": [],
    "bullet_rewrites": {},
}


def _make_pdf(name="resume.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 fake content", content_type="application/pdf")


@pytest.mark.django_db
def test_login_throttle_returns_429_past_limit(api_client, create_user):
    user = create_user(username="alice", email="alice@wonderland.com", password="madhatter")
    payload = {"email": user.email, "password": "madhatter"}

    responses = [api_client.post("/api/auth/login/", payload, format="json") for _ in range(11)]

    assert all(r.status_code == 200 for r in responses[:10])
    assert responses[10].status_code == 429


@pytest.mark.django_db
def test_registration_throttle_returns_429_past_limit(api_client):
    payload = {
        "username": "spammer",
        "email": "spammer@example.com",
        "password1": "strongpassword123",
        "password2": "strongpassword123",
    }

    responses = [
        api_client.post("/api/auth/registration/", payload, format="json") for _ in range(6)
    ]

    # The first attempt may succeed or fail validation (duplicate email on
    # retries) — what matters is that the throttle, not app logic, produces
    # the 6th response.
    assert responses[5].status_code == 429


@pytest.mark.django_db
def test_ai_resume_throttle_returns_429_past_limit(auth_client, get_user):
    resume = Resume.objects.create(user=get_user, file=_make_pdf(), title="CV")
    url = reverse("resume-analyze", args=[resume.id])

    with (
        patch("api.services.resume_analysis.extract_resume_text", return_value="some text"),
        patch("api.services.resume_analysis._build_task_context", return_value="tasks"),
        patch("api.services.resume_analysis.analyze_resume", return_value=_FAKE_ANALYSIS),
    ):
        responses = [auth_client.post(f"{url}?refresh=1") for _ in range(21)]

    assert responses[20].status_code == 429
