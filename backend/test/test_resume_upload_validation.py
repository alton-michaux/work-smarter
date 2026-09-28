import zipfile
from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from api.validators import MAX_RESUME_UPLOAD_BYTES


def _make_pdf(name="resume.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 fake content", content_type="application/pdf")


def _make_real_docx(name="resume.docx"):
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", "<document/>")
    return SimpleUploadedFile(
        name,
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


def _make_fake_docx(name="resume.docx"):
    """Real PDF/DOCX content-type header, but plain-text bytes — simulates a
    spoofed Content-Type."""
    return SimpleUploadedFile(
        name,
        b"this is not actually a word document",
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


def _make_renamed_zip(name="resume.docx"):
    """A real zip archive that isn't a Word document (no [Content_Types].xml)."""
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w") as archive:
        archive.writestr("notes.txt", "just a regular zip")
    return SimpleUploadedFile(
        name,
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


def _make_oversized_pdf(name="resume.pdf"):
    content = b"%PDF-1.4 " + b"x" * (MAX_RESUME_UPLOAD_BYTES + 1)
    return SimpleUploadedFile(name, content, content_type="application/pdf")


@pytest.mark.django_db
class TestResumeUploadMagicByteValidation:
    def test_valid_pdf_accepted(self, auth_client):
        url = reverse("resume-list")
        res = auth_client.post(url, {"file": _make_pdf(), "title": "CV"}, format="multipart")
        assert res.status_code == 201

    def test_valid_docx_accepted(self, auth_client):
        url = reverse("resume-list")
        res = auth_client.post(url, {"file": _make_real_docx(), "title": "CV"}, format="multipart")
        assert res.status_code == 201

    def test_spoofed_content_type_rejected(self, auth_client):
        url = reverse("resume-list")
        res = auth_client.post(url, {"file": _make_fake_docx(), "title": "CV"}, format="multipart")
        assert res.status_code == 400

    def test_renamed_zip_rejected(self, auth_client):
        url = reverse("resume-list")
        res = auth_client.post(url, {"file": _make_renamed_zip(), "title": "CV"}, format="multipart")
        assert res.status_code == 400

    def test_oversized_file_rejected(self, auth_client):
        url = reverse("resume-list")
        res = auth_client.post(
            url, {"file": _make_oversized_pdf(), "title": "CV"}, format="multipart"
        )
        assert res.status_code == 400
