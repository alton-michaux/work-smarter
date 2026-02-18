import pytest
from api.models import Task, Project

@pytest.mark.django_db
def test_import_csv_creates_tasks(auth_client, import_tasks_csv_url, create_csv_file):
    csv_content = """row_id,title,begin_date,is_done,project,category,priority,description,carry_over,parent_row_id
1,Parent,2026-02-10,false,Vamos,Dev,high,,true,
2,Child,2026-02-10,false,Vamos,Dev,medium,,true,1
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
