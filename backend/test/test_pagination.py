"""Cursor pagination must terminate.

DRF derives the cursor position from `ordering[0]` only. When that field is not
unique, a page can contain no distinct positions, and DRF falls back to an
offset that `decode_cursor` clamps at `offset_cutoff` (1000). Past that point
the cursor stops advancing and serves the same page forever, so any client that
follows `next` until it is null loops indefinitely.
"""
from datetime import date

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from api.models import PersonalAPIToken, Project, Task


@pytest.fixture
def v1_tasks_url():
    return reverse("v1-task-list")


@pytest.fixture
def v1_projects_url():
    return reverse("v1-project-list")


@pytest.fixture
def key_client(get_user):
    """An APIClient authenticated as `alice` with a read-scoped API key."""
    _, raw_key = PersonalAPIToken.generate(get_user, name="scripts")
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Api-Key {raw_key}")
    return client

# Comfortably past CursorPagination.offset_cutoff (1000).
ROWS = 1200
PAGE_LIMIT = 200


def _bulk_tasks(user, **kwargs):
    Task.objects.bulk_create([
        Task(user=user, title=f"t{i}", category="task", priority="medium",
             description="", **kwargs)
        for i in range(ROWS)
    ])


def _walk(client, url):
    """Follow `next` to exhaustion, returning (distinct ids, rows fetched)."""
    seen, fetched, pages = set(), 0, 0
    while url:
        pages += 1
        assert pages <= PAGE_LIMIT, (
            f"cursor did not terminate after {pages} pages "
            f"({fetched} rows fetched, {len(seen)} distinct ids)"
        )
        resp = client.get(url)
        assert resp.status_code == 200, resp.data
        body = resp.json()
        for row in body["results"]:
            seen.add(row["id"])
            fetched += 1
        url = body["next"]
    return seen, fetched


@pytest.mark.django_db
def test_internal_tasks_pagination_terminates(auth_client, tasks_list_url, get_user):
    """Every task shares a begin_date — the old `-begin_date` cursor cycled."""
    _bulk_tasks(get_user, begin_date=date(2026, 2, 10))

    seen, fetched = _walk(auth_client, tasks_list_url)

    assert len(seen) == ROWS
    assert fetched == ROWS  # no page is served twice


@pytest.mark.django_db
def test_internal_tasks_pagination_terminates_with_null_begin_dates(
    auth_client, tasks_list_url, get_user
):
    _bulk_tasks(get_user, begin_date=None)

    seen, fetched = _walk(auth_client, tasks_list_url)

    assert len(seen) == ROWS
    assert fetched == ROWS


@pytest.mark.django_db
def test_v1_tasks_pagination_terminates(key_client, v1_tasks_url, get_user):
    """created_at is a DateField, so a single import shares one position."""
    _bulk_tasks(get_user, begin_date=date(2026, 2, 10))

    seen, fetched = _walk(key_client, v1_tasks_url)

    assert len(seen) == ROWS
    assert fetched == ROWS


@pytest.mark.django_db
def test_v1_projects_pagination_terminates(key_client, v1_projects_url, get_user):
    Project.objects.bulk_create([
        Project(user=get_user, name=f"p{i}") for i in range(ROWS)
    ])

    seen, fetched = _walk(key_client, v1_projects_url)

    assert len(seen) == ROWS
    assert fetched == ROWS
