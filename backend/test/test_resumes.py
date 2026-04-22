import io
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from api.models import Resume
from django.contrib.auth.models import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_pdf(name="resume.pdf"):
    """Return a SimpleUploadedFile that mimics a PDF upload."""
    return SimpleUploadedFile(name, b"%PDF-1.4 fake content", content_type="application/pdf")


def _make_txt(name="resume.txt"):
    return SimpleUploadedFile(name, b"plain text content", content_type="text/plain")


def _make_multipart_pdf(name="resume.pdf"):
    """Return a fresh SimpleUploadedFile for multipart POST requests."""
    return SimpleUploadedFile(name, b"%PDF-1.4 fake content", content_type="application/pdf")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestResumeList:
    def test_list_returns_only_own_resumes(self, auth_client, get_user):
        # Create a resume for the authenticated user
        Resume.objects.create(user=get_user, title="My Resume", file=_make_pdf())

        # Create another user's resume
        other = User.objects.create_user(username="bob", password="pass")
        Resume.objects.create(user=other, title="Bob Resume", file=_make_pdf())

        url = reverse("resume-list")
        res = auth_client.get(url)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["title"] == "My Resume"

    def test_list_unauthenticated_returns_401(self, api_client):
        url = reverse("resume-list")
        res = api_client.get(url)
        assert res.status_code == 401


@pytest.mark.django_db
class TestResumeUpload:
    def test_upload_pdf_success(self, auth_client):
        url = reverse("resume-list")
        pdf = _make_pdf()
        res = auth_client.post(url, {"file": pdf, "title": "Test Resume"}, format="multipart")
        assert res.status_code == 201
        data = res.json()
        assert data["title"] == "Test Resume"
        assert "id" in data
        assert "uploaded_at" in data

    def test_upload_uses_filename_when_no_title(self, auth_client):
        url = reverse("resume-list")
        pdf = _make_pdf(name="cv_2026.pdf")
        res = auth_client.post(url, {"file": pdf}, format="multipart")
        assert res.status_code == 201
        assert res.json()["title"] == "cv_2026.pdf"

    def test_upload_invalid_type_returns_400(self, auth_client):
        url = reverse("resume-list")
        txt = _make_txt()
        res = auth_client.post(url, {"file": txt, "title": "Bad File"}, format="multipart")
        assert res.status_code == 400
        assert "error" in res.json()

    def test_upload_no_file_returns_400(self, auth_client):
        url = reverse("resume-list")
        res = auth_client.post(url, {"title": "No file"}, format="multipart")
        assert res.status_code == 400


@pytest.mark.django_db
class TestResumeRetrieve:
    def test_retrieve_own_resume(self, auth_client, get_user):
        resume = Resume.objects.create(user=get_user, title="Fetchable", file=_make_pdf())
        url = reverse("resume-detail", args=[resume.id])
        res = auth_client.get(url)
        assert res.status_code == 200
        assert res.json()["title"] == "Fetchable"

    def test_cannot_retrieve_other_users_resume(self, auth_client):
        other = User.objects.create_user(username="eve", password="pass")
        resume = Resume.objects.create(user=other, title="Eve's Resume", file=_make_pdf())
        url = reverse("resume-detail", args=[resume.id])
        res = auth_client.get(url)
        assert res.status_code == 404


@pytest.mark.django_db
class TestResumeDelete:
    def test_delete_own_resume(self, auth_client, get_user):
        resume = Resume.objects.create(user=get_user, title="Deletable", file=_make_pdf())
        url = reverse("resume-detail", args=[resume.id])
        res = auth_client.delete(url)
        assert res.status_code == 204
        assert not Resume.objects.filter(id=resume.id).exists()

    def test_cannot_delete_other_users_resume(self, auth_client):
        other = User.objects.create_user(username="mallory", password="pass")
        resume = Resume.objects.create(user=other, title="Not Mine", file=_make_pdf())
        url = reverse("resume-detail", args=[resume.id])
        res = auth_client.delete(url)
        assert res.status_code == 404
        assert Resume.objects.filter(id=resume.id).exists()


@pytest.mark.django_db
class TestResumeDownload:
    def test_download_returns_file(self, auth_client, get_user):
        resume = Resume.objects.create(user=get_user, title="Downloadable", file=_make_pdf())
        url = reverse("resume-download", args=[resume.id])
        res = auth_client.get(url)
        assert res.status_code == 200
        assert "attachment" in res.get("Content-Disposition", "")

    def test_cannot_download_other_users_resume(self, auth_client):
        other = User.objects.create_user(username="carol", password="pass")
        resume = Resume.objects.create(user=other, title="Carol's CV", file=_make_pdf())
        url = reverse("resume-download", args=[resume.id])
        res = auth_client.get(url)
        assert res.status_code == 404
