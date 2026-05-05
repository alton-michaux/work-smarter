import io
import json
import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.contrib.auth.models import User

from api.models import Resume, ResumeAnalysis


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_FAKE_ANALYSIS = {
    "score": 7.5,
    "summary": "A solid resume with room for improvement.",
    "suggestions": ["Add metrics to your bullets.", "Include a summary section."],
    "accomplishments": ["Led a migration to microservices that was not on the resume."],
    "bullet_rewrites": {"Worked on backend systems": "Engineered scalable backend systems serving 10k+ daily users"},
}


def _make_pdf(name="resume.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 fake content", content_type="application/pdf")


def _make_docx(name="resume.docx"):
    return SimpleUploadedFile(
        name, b"PK\x03\x04fake docx content", content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


def _mock_groq_response(content: str):
    msg = MagicMock()
    msg.choices = [MagicMock(message=MagicMock(content=content))]
    return msg


# ---------------------------------------------------------------------------
# extract_resume_text
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestExtractResumeText:
    def test_extracts_pdf_text(self, get_user):
        resume = Resume.objects.create(user=get_user, file=_make_pdf(), title="CV")
        with patch("api.services.resume_analysis.pdfplumber") as mock_pl:
            page = MagicMock()
            page.extract_text.return_value = "Hello from PDF"
            mock_pl.open.return_value.__enter__.return_value.pages = [page]
            from api.services.resume_analysis import extract_resume_text
            result = extract_resume_text(resume)
        assert "Hello from PDF" in result

    def test_extracts_docx_text(self, get_user):
        resume = Resume.objects.create(user=get_user, file=_make_docx(), title="CV")
        with patch("api.services.resume_analysis.docx") as mock_docx:
            para = MagicMock()
            para.text = "Hello from DOCX"
            mock_docx.Document.return_value.paragraphs = [para]
            from api.services.resume_analysis import extract_resume_text
            result = extract_resume_text(resume)
        assert "Hello from DOCX" in result

    def test_doc_raises_value_error(self, get_user):
        doc_file = SimpleUploadedFile("old.doc", b"binary", content_type="application/msword")
        resume = Resume.objects.create(user=get_user, file=doc_file, title="Old CV")
        from api.services.resume_analysis import extract_resume_text
        with pytest.raises(ValueError, match=".doc"):
            extract_resume_text(resume)

    def test_text_capped_at_6000_chars(self, get_user):
        resume = Resume.objects.create(user=get_user, file=_make_pdf(), title="CV")
        long_text = "x" * 10000
        with patch("api.services.resume_analysis.pdfplumber") as mock_pl:
            page = MagicMock()
            page.extract_text.return_value = long_text
            mock_pl.open.return_value.__enter__.return_value.pages = [page]
            from api.services.resume_analysis import extract_resume_text
            result = extract_resume_text(resume)
        assert len(result) <= 6000


# ---------------------------------------------------------------------------
# _build_task_context
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestBuildTaskContext:
    def test_includes_only_done_tasks(self, get_user, create_task):
        done = create_task(title="Done task", is_done=True, user=get_user, category='task')
        create_task(title="Pending task", is_done=False, user=get_user, category='task')
        from api.services.resume_analysis import _build_task_context
        ctx = _build_task_context(get_user)
        assert "Done task" in ctx
        assert "Pending task" not in ctx

    def test_groups_tasks_by_project(self, get_user, create_task, create_project):
        project = create_project(name="Alpha", user=get_user)
        create_task(title="Task A", is_done=True, user=get_user, project=project, category='task')
        create_task(title="Standalone", is_done=True, user=get_user, category='task')
        from api.services.resume_analysis import _build_task_context
        ctx = _build_task_context(get_user)
        assert "Alpha" in ctx
        assert "Standalone Tasks" in ctx

    def test_empty_when_no_tasks(self, get_user):
        from api.services.resume_analysis import _build_task_context
        ctx = _build_task_context(get_user)
        assert isinstance(ctx, str)


# ---------------------------------------------------------------------------
# analyze_resume (unit)
# ---------------------------------------------------------------------------

class TestAnalyzeResumeUnit:
    def test_returns_parsed_dict(self):
        with patch("api.services.resume_analysis.openai.ChatCompletion.create",
                   return_value=_mock_groq_response(json.dumps(_FAKE_ANALYSIS))):
            from api.services.resume_analysis import analyze_resume
            result = analyze_resume("resume text", "task context")
        assert result["score"] == 7.5
        assert "suggestions" in result
        assert "accomplishments" in result
        assert "bullet_rewrites" in result

    def test_strips_markdown_fences(self):
        fenced = f"```json\n{json.dumps(_FAKE_ANALYSIS)}\n```"
        with patch("api.services.resume_analysis.openai.ChatCompletion.create",
                   return_value=_mock_groq_response(fenced)):
            from api.services.resume_analysis import analyze_resume
            result = analyze_resume("resume text", "task context")
        assert result["score"] == 7.5

    def test_raises_on_invalid_json(self):
        with patch("api.services.resume_analysis.openai.ChatCompletion.create",
                   return_value=_mock_groq_response("not json at all")):
            from api.services.resume_analysis import analyze_resume
            with pytest.raises(ValueError):
                analyze_resume("resume text", "task context")


# ---------------------------------------------------------------------------
# POST /api/resumes/{id}/analyze/ endpoint
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestResumeAnalyzeEndpoint:
    def _url(self, resume_id):
        return reverse("resume-analyze", args=[resume_id])

    def _mock_analysis(self):
        return (
            patch("api.views.views.extract_resume_text", return_value="resume text here"),
            patch("api.views.views._build_task_context", return_value="task context here"),
            patch("api.views.views.analyze_resume", return_value=_FAKE_ANALYSIS),
        )

    def test_returns_200_with_fresh_analysis(self, auth_client, get_user):
        resume = Resume.objects.create(user=get_user, file=_make_pdf(), title="My CV")
        with (
            patch("api.services.resume_analysis.extract_resume_text", return_value="some text"),
            patch("api.services.resume_analysis._build_task_context", return_value="tasks"),
            patch("api.services.resume_analysis.analyze_resume", return_value=_FAKE_ANALYSIS),
        ):
            res = auth_client.post(self._url(resume.id))
        assert res.status_code == 200
        data = res.json()
        assert data["score"] == 7.5
        assert data["is_cached"] is False
        assert "suggestions" in data
        assert "accomplishments" in data
        assert "bullet_rewrites" in data
        assert "analyzed_at" in data

    def test_returns_cached_result(self, auth_client, get_user):
        import hashlib
        resume = Resume.objects.create(user=get_user, file=_make_pdf(), title="My CV")
        fingerprint = hashlib.md5(str(resume.uploaded_at).encode()).hexdigest()
        ResumeAnalysis.objects.create(
            resume=resume,
            score=8.0,
            summary="Cached summary",
            suggestions=["Cached suggestion"],
            accomplishments=[],
            bullet_rewrites={},
            resume_fingerprint=fingerprint,
        )
        analyze_mock = MagicMock()
        with patch("api.services.resume_analysis.analyze_resume", analyze_mock):
            res = auth_client.post(self._url(resume.id))
        assert res.status_code == 200
        data = res.json()
        assert data["is_cached"] is True
        assert data["score"] == 8.0
        analyze_mock.assert_not_called()

    def test_force_refresh_bypasses_cache(self, auth_client, get_user):
        import hashlib
        resume = Resume.objects.create(user=get_user, file=_make_pdf(), title="My CV")
        fingerprint = hashlib.md5(str(resume.uploaded_at).encode()).hexdigest()
        ResumeAnalysis.objects.create(
            resume=resume,
            score=8.0,
            summary="Cached",
            suggestions=[],
            accomplishments=[],
            bullet_rewrites={},
            resume_fingerprint=fingerprint,
        )
        analyze_mock = MagicMock(return_value=_FAKE_ANALYSIS)
        with (
            patch("api.services.resume_analysis.extract_resume_text", return_value="text"),
            patch("api.services.resume_analysis._build_task_context", return_value="ctx"),
            patch("api.services.resume_analysis.analyze_resume", analyze_mock),
        ):
            res = auth_client.post(self._url(resume.id) + "?refresh=1")
        assert res.status_code == 200
        assert res.json()["is_cached"] is False
        analyze_mock.assert_called_once()

    def test_wrong_user_returns_404(self, auth_client):
        other = User.objects.create_user(username="eve", password="pass")
        resume = Resume.objects.create(user=other, file=_make_pdf(), title="Eve CV")
        res = auth_client.post(self._url(resume.id))
        assert res.status_code == 404

    def test_unauthenticated_returns_401(self, api_client, get_user):
        resume = Resume.objects.create(user=get_user, file=_make_pdf(), title="My CV")
        res = api_client.post(self._url(resume.id))
        assert res.status_code == 401

    def test_empty_resume_returns_400(self, auth_client, get_user):
        resume = Resume.objects.create(user=get_user, file=_make_pdf(), title="My CV")
        with patch("api.services.resume_analysis.extract_resume_text", return_value="   "):
            res = auth_client.post(self._url(resume.id))
        assert res.status_code == 400

    def test_anthropic_failure_returns_502(self, auth_client, get_user):
        resume = Resume.objects.create(user=get_user, file=_make_pdf(), title="My CV")
        with (
            patch("api.services.resume_analysis.extract_resume_text", return_value="some text"),
            patch("api.services.resume_analysis._build_task_context", return_value="ctx"),
            patch("api.services.resume_analysis.analyze_resume", side_effect=Exception("timeout")),
        ):
            res = auth_client.post(self._url(resume.id))
        assert res.status_code == 502

    def test_doc_file_returns_400(self, auth_client, get_user):
        doc_file = SimpleUploadedFile("old.doc", b"binary", content_type="application/msword")
        resume = Resume.objects.create(user=get_user, file=doc_file, title="Old CV")
        with patch("api.services.resume_analysis.extract_resume_text", side_effect=ValueError("Binary .doc not supported")):
            res = auth_client.post(self._url(resume.id))
        assert res.status_code == 400
        assert ".doc" in res.json()["error"].lower() or "not supported" in res.json()["error"].lower()
