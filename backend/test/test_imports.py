import pytest
from api.models import Task, Project

@pytest.mark.django_db
def test_import_csv_creates_tasks(auth_client, import_tasks_csv_url, create_csv_file):
    csv_content = """row_id,title,begin_date,is_done,project,category,priority,description,carry_over,parent_row_id
1,Parent,2026-02-10,false,Vamos,Task,high,,true,
2,Child,2026-02-10,false,Vamos,Task,medium,,true,1
"""
    f = create_csv_file(csv_content)
    resp = auth_client.post(import_tasks_csv_url, {"file": f}, format="multipart")

    assert resp.status_code == 201
    assert resp.data["created"] == 2
    assert resp.data["errors"] == []

    tasks = Task.objects.all().order_by("id")
    assert tasks.count() == 2
    assert tasks[0].title == "Parent"
    assert tasks[1].title == "Child"
    assert tasks[1].parent_id == tasks[0].id
    assert tasks[1].is_subtask is True


@pytest.mark.django_db
def test_import_csv_creates_project_by_name(auth_client, import_tasks_csv_url, create_csv_file, get_user):
    csv_content = """row_id,title,project
1,Task A,Vamos
"""
    f = create_csv_file(csv_content)
    resp = auth_client.post(import_tasks_csv_url, {"file": f}, format="multipart")

    assert resp.status_code == 201
    assert Project.objects.filter(user=get_user, name="Vamos").exists()

    t = Task.objects.get(title="Task A")
    assert t.project.name == "Vamos"
    assert t.user == get_user


@pytest.mark.django_db
def test_import_csv_rejects_missing_title(auth_client, import_tasks_csv_url, create_csv_file):
    csv_content = """row_id,title,project
1,,Vamos
"""
    f = create_csv_file(csv_content)
    resp = auth_client.post(import_tasks_csv_url, {"file": f}, format="multipart")

    assert resp.status_code == 400
    assert resp.data["created"] == 0
    assert resp.data["errors"]
    assert Task.objects.count() == 0


@pytest.mark.django_db
def test_import_csv_rejects_unknown_parent_row_id(auth_client, import_tasks_csv_url, create_csv_file):
    csv_content = """row_id,title,parent_row_id
2,Child,999
"""
    f = create_csv_file(csv_content)
    resp = auth_client.post(import_tasks_csv_url, {"file": f}, format="multipart")

    assert resp.status_code == 400
    assert resp.data["created"] == 0
    # assert Task.objects.count() == 0
    
@pytest.mark.django_db
def test_import_csv_skips_existing_row(import_tasks_csv_url, auth_client, create_task, get_user, create_csv_file):
    # existing task
    alice = get_user
    create_task(
        title="Same Task",
        begin_date="2026-02-03",
        user=alice,
        category="Task",
    )

    csv = """title,begin_date,category,description,is_done
Same Task,2026-02-03,Task,hello,false
"""
    url = import_tasks_csv_url
    resp = auth_client.post(url, {"file": create_csv_file(csv)}, format="multipart")

    assert resp.status_code in (200, 207)
    data = resp.json()
    assert data["created"] == 0
    assert data["skipped"] == 1

    assert Task.objects.filter(user=alice, title="Same Task", begin_date="2026-02-03").count() == 1


@pytest.mark.django_db
def test_import_csv_skips_duplicate_rows_within_same_file(import_tasks_csv_url, auth_client, get_user, create_csv_file):
    alice = get_user

    csv = """title,begin_date,category
Dup Task,2026-02-03,Task
Dup Task,2026-02-03,Task
"""
    url = import_tasks_csv_url
    resp = auth_client.post(url, {"file": create_csv_file(csv)}, format="multipart")

    assert resp.status_code in (200, 207)
    data = resp.json()
    assert data["created"] == 1
    assert data["skipped"] == 1

    assert Task.objects.filter(user=alice, title="Dup Task", begin_date="2026-02-03").count() == 1

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

