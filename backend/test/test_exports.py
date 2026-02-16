import csv
import io
import pytest
from django.urls import reverse


def _get_csv_text(response) -> str:
    """
    Supports both normal HttpResponse (.content) and StreamingHttpResponse (.streaming_content).
    """
    if hasattr(response, "streaming_content") and response.streaming:
        raw = b"".join(response.streaming_content)
    else:
        raw = response.content
    return raw.decode("utf-8")


def _read_csv_rows(response):
    text = _get_csv_text(response)
    return list(csv.reader(io.StringIO(text)))


@pytest.fixture
def export_tasks_csv_url():
    # Change this name to your actual urlpattern name
    return reverse("export-tasks-csv")


@pytest.mark.django_db
def test_export_csv_requires_auth(api_client, export_tasks_csv_url):
    resp = api_client.get(export_tasks_csv_url)
    assert resp.status_code in (401, 403)  # depending on your auth config


@pytest.mark.django_db
def test_export_csv_returns_csv_headers(auth_client, export_tasks_csv_url):
    resp = auth_client.get(export_tasks_csv_url)

    assert resp.status_code == 200
    assert "text/csv" in resp.get("Content-Type", "")

    # If you set Content-Disposition in the view, this checks it.
    # If you don't set it yet, either remove this assert or add it to the view.
    cd = resp.get("Content-Disposition", "")
    assert "attachment" in cd
    assert "tasks" in cd  # loose check, avoids brittle exact filename matching

    rows = _read_csv_rows(resp)
    assert len(rows) >= 1

    header = rows[0]
    # Keep this in sync with whatever your export view writes.
    # If your view exports different columns, update expected_header.
    expected_header = [
      "id",
      "begin_date",
      "project",
      "category",
      "title",
      "status",
      "is_done",
      "priority",
      "parent_id",
      "recurring_task_id",
      "created_at",
      "completed_at",
      "notes",
    ]
    assert header == expected_header


@pytest.mark.django_db
def test_export_csv_only_includes_requesting_users_tasks(
    auth_client,
    export_tasks_csv_url,
    create_user,
    create_task,
    create_project,
):
    # Create another user and tasks for them
    other = create_user(username="other", email="other@email.com", password="madhatter")

    # Create tasks for "other" user
    other_project = create_project(name="OtherProject", user=other)
    create_task(title="NOT YOURS", user=other, project=other_project, category="Dev")

    # Create tasks for the authed user (the one logged in via get_token/auth_client)
    # We need the actual authed user object. Easiest: create one and login as them,
    # but your auth_client is already logged in as "alice" from get_token fixture.
    # So we’ll fetch alice by username.
    #
    # Note: If your auth uses email-only users, adjust lookup accordingly.
    from django.contrib.auth import get_user_model
    User = get_user_model()
    alice = User.objects.get(username="alice")

    alice_project = create_project(name="AliceProject", user=alice)
    create_task(title="Task A", user=alice, project=alice_project, category="Meetings")
    create_task(title="Task B", user=alice, project=alice_project, category="Dev")

    resp = auth_client.get(export_tasks_csv_url)
    assert resp.status_code == 200

    rows = _read_csv_rows(resp)
    assert len(rows) >= 2  # header + at least one row

    # Find the column index for title (more robust than hardcoding indexes)
    header = rows[0]
    title_idx = header.index("title")

    titles = [r[title_idx] for r in rows[1:] if len(r) > title_idx]

    assert "Task A" in titles
    assert "Task B" in titles
    assert "NOT YOURS" not in titles


@pytest.mark.django_db
def test_export_csv_includes_subtask_parent_when_present(
    auth_client,
    export_tasks_csv_url,
    create_task,
):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    alice = User.objects.get(username="alice")

    parent = create_task(title="Parent", user=alice, category="Dev")
    child = create_task(title="Child", user=alice, parent=parent, category="Dev")

    resp = auth_client.get(export_tasks_csv_url)
    assert resp.status_code == 200

    rows = _read_csv_rows(resp)
    header = rows[0]
    title_idx = header.index("title")
    parent_idx = header.index("parent_id")

    # Find the exported row for "Child"
    child_rows = [r for r in rows[1:] if len(r) > title_idx and r[title_idx] == "Child"]
    assert child_rows, "Expected Child task to be in CSV export"

    # parent_id should match the parent's id (as a string in CSV)
    assert child_rows[0][parent_idx] == str(parent.id)