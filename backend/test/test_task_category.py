"""Task.category is normalized on every write path.

Before this, `Task.category` was nullable and the importers stored whatever the
source file said, so `?category=task` matched only the rows that happened to be
spelled exactly right.
"""
from datetime import date

import pytest

from api.categories import normalize_category
from api.models import Task
from api.services.recurring_tasks import ensure_recurring_tasks_in_range
from backend.management.utils.txt_parser import DevParser


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("task", "task"),
        ("Task", "task"),
        ("  MEETING  ", "meeting"),
        ("Meetings", "meeting"),
        ("Notes", "note"),
        ("", "task"),
        (None, "task"),
        ("Dev", "task"),
    ],
)
def test_normalize_category(raw, expected):
    assert normalize_category(raw) == expected


@pytest.mark.django_db
def test_api_accepts_null_category_and_stores_the_default(auth_client, tasks_list_url):
    resp = auth_client.post(
        tasks_list_url,
        {"title": "No category", "category": None, "recurring_task": None},
        format="json",
    )

    assert resp.status_code == 201, resp.data
    assert resp.data["category"] == "task"
    assert Task.objects.get(title="No category").category == "task"


@pytest.mark.django_db
def test_category_filter_finds_tasks_created_without_one(
    auth_client, tasks_list_url, create_task, get_user
):
    create_task(title="Implicit", user=get_user, begin_date="2026-02-10")

    resp = auth_client.get(tasks_list_url, {"category": "task"})

    assert resp.status_code == 200
    assert "Implicit" in [t["title"] for t in resp.data["results"]]


@pytest.mark.django_db
def test_recurring_task_without_a_category_generates_tasks(get_user, create_recurring_task):
    rt = create_recurring_task(
        title="standup",
        frequency="daily",
        category=None,
        start_date=date(2026, 2, 9),
        user=get_user,
    )

    ensure_recurring_tasks_in_range(date(2026, 2, 9), date(2026, 2, 11), user=get_user)

    generated = Task.objects.filter(recurring_task=rt)
    assert generated.count() == 3
    assert set(generated.values_list("category", flat=True)) == {"task"}


def test_txt_parser_folds_section_headers_to_categories():
    parser = DevParser(
        "Week of: 2024-03-11\n"
        "Meetings:\n"
        "- [ ] Standup\n"
        "Dev:\n"
        "- [ ] Write the parser test\n"
    )
    parser.parse()

    assert [t["category"] for t in parser.tasks] == ["meeting", "task"]
