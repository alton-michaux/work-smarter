import pytest
from api.models import Task

@pytest.mark.django_db
def test_import_csv_dry_run_does_not_create_tasks(auth_client, import_tasks_csv_url, create_csv_file):
    csv_content = """row_id,title,begin_date,is_done,project,category,priority,description,carry_over,parent_row_id
1,Parent,2026-02-10,false,Vamos,Task,high,,true,
2,Child,2026-02-10,false,Vamos,Task,medium,,true,1
"""
    resp = auth_client.post(f"{import_tasks_csv_url}?dry_run=true", {"file": create_csv_file(csv_content)}, format="multipart")
    assert resp.status_code == 200

    data = resp.json()

    assert data["dry_run"] is True
    assert data["created"] == 2        # would be created
    assert data["total_rows"] == 2
    assert data["processed_rows"] == 2
    assert data["errors"] == []
    assert Task.objects.count() == 0   # actually created: zero

@pytest.mark.django_db
def test_import_csv_spec_returns_metadata(auth_client, import_tasks_csv_spec_url):
    resp = auth_client.get(import_tasks_csv_spec_url)
    assert resp.status_code == 200

    data = resp.json()

    # core keys the UI needs
    for k in ("headers", "required", "optional", "valid_priorities", "valid_categories", "supports_dry_run", "example_row"):
        assert k in data

    # sanity checks
    assert "title" in data["headers"]
    assert data["required"] == ["title"]
    assert data["supports_dry_run"] is True
    assert isinstance(data["valid_priorities"], list)
    assert isinstance(data["valid_categories"], list)

    # example row should be import-shaped
    ex = data["example_row"]
    assert ex["title"]
    assert "priority" in ex
    assert "category" in ex
