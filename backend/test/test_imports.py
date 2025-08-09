import io
import pytest

def make_txt(content: str, name: str = "tasks.txt"):
    """Helper to create an in-memory file object for upload."""
    f = io.BytesIO(content.encode("utf-8"))
    f.name = name
    return f


# --------------------------
# 1. SUCCESSFUL IMPORT
# --------------------------
@pytest.mark.django_db
def test_import_tasks_success(auth_client):
    file_content = """Week of: 3/11/2024

Meetings:
-[x] Standup
-[ ] Retro

Admin:
-[ ] Do admin stuff
"""
    resp = auth_client.post(
        "/api/import/",
        {"file": make_txt(file_content)},
        format="multipart"
    )
    assert resp.status_code == 201
    assert "imported" in resp.data
    assert resp.data["imported"] > 0


# --------------------------
# 2–4. BAD FORMAT CASES
# --------------------------
@pytest.mark.django_db
@pytest.mark.parametrize(
    "file_content, expected_error_substr",
    [
        # Missing Week of
        (
            """Meetings:
-[x] Standup
-[ ] Retro
""",
            "Missing 'Week of' date"
        ),
        # Unparseable Week of
        (
            """Week of: not-a-date

Admin:
-[ ] Do admin stuff
""",
            "Unrecognized 'Week of' date format"
        )
    ],
)
def test_import_tasks_bad_format(auth_client, file_content, expected_error_substr):
    resp = auth_client.post(
        "/api/import/",
        {"file": make_txt(file_content)},
        format="multipart",
    )
    assert resp.status_code == 400
    assert "error" in resp.data
    assert expected_error_substr in resp.data["error"]


# --------------------------
# 5. NON-TXT FILE
# --------------------------
@pytest.mark.django_db
def test_import_tasks_rejects_non_txt(auth_client):
    bad_file = make_txt("Week of: 3/11/2024\n-[ ] Task", name="tasks.md")
    resp = auth_client.post("/api/import/", {"file": bad_file}, format="multipart")
    assert resp.status_code == 400
    assert "Only .txt files are supported" in resp.data.get("error", "")
