"""Tests for personal API keys and the read-only v1 API."""

import pytest
from datetime import date, timedelta
from urllib.parse import parse_qs, urlparse
from urllib.parse import parse_qs, urlparse
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import PersonalAPIToken, RecurringTask, RecurringTaskException, Task
from api.views.views_api_tokens import PersonalAPITokenViewSet


@pytest.fixture
def keys_url():
    return reverse("api-key-list")


@pytest.fixture
def v1_tasks_url():
    return reverse("v1-task-list")


@pytest.fixture
def v1_projects_url():
    return reverse("v1-project-list")


@pytest.fixture
def other_user(create_user):
    return create_user(username="bob", email="bob@builder.com", password="canwefixit")


@pytest.fixture
def key_client(get_user):
    """An APIClient authenticated as `alice` with a read-scoped API key."""
    _, raw_key = PersonalAPIToken.generate(get_user, name="scripts")
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Api-Key {raw_key}")
    return client


@pytest.fixture
def write_client(get_user):
    """An APIClient authenticated as `alice` with a read/write API key."""
    _, raw_key = PersonalAPIToken.generate(
        get_user, name="automation", scope=PersonalAPIToken.SCOPE_READ_WRITE
    )
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Api-Key {raw_key}")
    return client


def task_detail(task):
    return reverse("v1-task-detail", args=[task.id])


# --- Key management ---------------------------------------------------------

def test_create_key_returns_raw_key_once(auth_client, keys_url):
    response = auth_client.post(keys_url, {"name": "laptop"}, format="json")

    assert response.status_code == 201
    assert response.data["name"] == "laptop"
    assert response.data["key"].startswith(PersonalAPIToken.PREFIX)
    assert response.data["key"].startswith(response.data["prefix"])
    assert response.data["last_used_at"] is None


def test_created_key_secret_is_not_stored_in_plaintext(auth_client, keys_url):
    raw_key = auth_client.post(keys_url, {"name": "laptop"}, format="json").data["key"]
    secret = raw_key.split(".", 1)[1]

    token = PersonalAPIToken.objects.get()
    assert secret not in token.hashed_secret
    assert token.hashed_secret == PersonalAPIToken.hash_secret(secret)
    assert token.secret_matches(secret)


def test_key_list_never_exposes_the_secret(auth_client, keys_url):
    auth_client.post(keys_url, {"name": "laptop"}, format="json")

    response = auth_client.get(keys_url)

    assert response.status_code == 200
    assert len(response.data) == 1
    assert "key" not in response.data[0]
    assert "hashed_secret" not in response.data[0]


def test_key_list_is_scoped_to_the_requesting_user(auth_client, keys_url, other_user):
    PersonalAPIToken.generate(other_user, name="not yours")
    auth_client.post(keys_url, {"name": "mine"}, format="json")

    response = auth_client.get(keys_url)

    assert [k["name"] for k in response.data] == ["mine"]


def test_key_management_requires_authentication(api_client, keys_url):
    assert api_client.get(keys_url).status_code == 401
    assert api_client.post(keys_url, {}, format="json").status_code == 401


def test_key_creation_is_capped(auth_client, keys_url):
    limit = PersonalAPITokenViewSet.MAX_TOKENS_PER_USER
    for i in range(limit):
        assert auth_client.post(keys_url, {"name": f"key{i}"}, format="json").status_code == 201

    response = auth_client.post(keys_url, {"name": "one too many"}, format="json")

    assert response.status_code == 400
    assert f"Limit of {limit}" in response.data["error"]


def test_key_can_be_revoked(auth_client, keys_url, get_user):
    token, raw_key = PersonalAPIToken.generate(get_user)

    response = auth_client.delete(reverse("api-key-detail", args=[token.id]))

    assert response.status_code == 204
    assert not PersonalAPIToken.objects.filter(id=token.id).exists()


def test_cannot_revoke_another_users_key(auth_client, other_user):
    token, _ = PersonalAPIToken.generate(other_user)

    response = auth_client.delete(reverse("api-key-detail", args=[token.id]))

    assert response.status_code == 404
    assert PersonalAPIToken.objects.filter(id=token.id).exists()


def test_api_key_cannot_manage_keys(key_client, keys_url):
    """A leaked key must not be able to mint or enumerate further keys."""
    assert key_client.get(keys_url).status_code == 401
    assert key_client.post(keys_url, {"name": "escalation"}, format="json").status_code == 401


# --- Key authentication -----------------------------------------------------

def test_valid_key_authenticates_v1(key_client, v1_tasks_url, get_user, create_task):
    create_task(title="write docs", user=get_user)

    response = key_client.get(v1_tasks_url)

    assert response.status_code == 200
    assert [t["title"] for t in response.data["results"]] == ["write docs"]


@pytest.mark.parametrize(
    "header",
    [
        "Api-Key",                      # missing the key
        "Api-Key not-a-key",            # missing prefix
        "Api-Key ws_live_deadbeef",     # missing separator and secret
        "Api-Key ws_live_deadbeef.",    # empty secret
        "Api-Key ws_live_deadbeef.wrongsecret",
    ],
)
def test_malformed_or_unknown_keys_are_rejected(db, api_client, v1_tasks_url, header):
    api_client.credentials(HTTP_AUTHORIZATION=header)

    assert api_client.get(v1_tasks_url).status_code == 401


def test_key_with_wrong_secret_is_rejected(api_client, v1_tasks_url, get_user):
    token, _ = PersonalAPIToken.generate(get_user)
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Api-Key {PersonalAPIToken.PREFIX}{token.public_id}.wrong"
    )

    assert api_client.get(v1_tasks_url).status_code == 401


def test_revoked_key_stops_working(api_client, v1_tasks_url, get_user):
    token, raw_key = PersonalAPIToken.generate(get_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Api-Key {raw_key}")
    assert api_client.get(v1_tasks_url).status_code == 200

    token.delete()

    assert api_client.get(v1_tasks_url).status_code == 401


def test_v1_requires_authentication(api_client, v1_tasks_url, v1_projects_url):
    assert api_client.get(v1_tasks_url).status_code == 401
    assert api_client.get(v1_projects_url).status_code == 401


def test_key_use_stamps_last_used_at(key_client, v1_tasks_url):
    assert PersonalAPIToken.objects.get().last_used_at is None

    key_client.get(v1_tasks_url)

    assert PersonalAPIToken.objects.get().last_used_at is not None


def test_last_used_at_is_not_rewritten_on_every_request(key_client, v1_tasks_url):
    """Reads should not cost a write once the stamp is fresh."""
    key_client.get(v1_tasks_url)
    first = PersonalAPIToken.objects.get().last_used_at

    key_client.get(v1_tasks_url)

    assert PersonalAPIToken.objects.get().last_used_at == first


def test_stale_last_used_at_is_refreshed(key_client, v1_tasks_url):
    key_client.get(v1_tasks_url)
    stale = timezone.now() - timedelta(hours=1)
    PersonalAPIToken.objects.update(last_used_at=stale)

    key_client.get(v1_tasks_url)

    assert PersonalAPIToken.objects.get().last_used_at > stale


def test_api_key_cannot_reach_the_apps_own_task_endpoints(key_client, tasks_list_url):
    """The key is scoped to /api/v1/ only — it must not unlock write endpoints."""
    assert key_client.get(tasks_list_url).status_code == 401
    assert key_client.post(tasks_list_url, {"title": "sneaky"}, format="json").status_code == 401


# --- v1 tasks: read-only and user-scoped ------------------------------------

def test_read_scoped_key_cannot_write_tasks(key_client, v1_tasks_url, get_user, create_task):
    task = create_task(title="immutable", user=get_user)
    detail_url = reverse("v1-task-detail", args=[task.id])

    denied = key_client.post(v1_tasks_url, {"title": "new"}, format="json")
    assert denied.status_code == 403
    # The error has to say what to do about it, or the caller is left guessing.
    assert "read/write key" in str(denied.data["detail"])

    assert key_client.patch(detail_url, {"title": "edited"}, format="json").status_code == 403
    assert key_client.put(detail_url, {"title": "edited"}, format="json").status_code == 403
    assert key_client.delete(detail_url).status_code == 403

    task.refresh_from_db()
    assert task.title == "immutable"
    assert Task.objects.filter(id=task.id).exists()


def test_v1_tasks_exclude_other_users_tasks(key_client, v1_tasks_url, get_user, other_user, create_task):
    create_task(title="mine", user=get_user)
    create_task(title="theirs", user=other_user)

    response = key_client.get(v1_tasks_url)

    assert [t["title"] for t in response.data["results"]] == ["mine"]


def test_v1_task_detail_hides_other_users_task(key_client, other_user, create_task):
    task = create_task(title="theirs", user=other_user)

    response = key_client.get(reverse("v1-task-detail", args=[task.id]))

    assert response.status_code == 404


def test_v1_task_payload_shape(key_client, v1_tasks_url, get_user, create_task, create_project):
    project = create_project(name="Apollo", user=get_user)
    create_task(title="ship it", user=get_user, project=project, category="task")

    task = key_client.get(v1_tasks_url).data["results"][0]

    assert task["title"] == "ship it"
    assert task["project"] == project.id
    assert task["project_name"] == "Apollo"
    assert task["is_recurring"] is False
    assert task["recurring_frequency"] is None
    # Internal-only fields stay out of the external contract.
    assert "user" not in task
    assert "google_event_id" not in task


def test_v1_task_reports_recurrence(key_client, v1_tasks_url, get_user, create_task, create_recurring_task):
    recurring = create_recurring_task(title="standup", frequency="daily", user=get_user)
    create_task(title="standup", user=get_user, recurring_task=recurring)

    task = key_client.get(v1_tasks_url).data["results"][0]

    assert task["is_recurring"] is True
    assert task["recurring_frequency"] == "daily"


def test_v1_tasks_do_not_generate_recurring_occurrences(
    key_client, v1_tasks_url, get_user, create_recurring_task
):
    """Reading the v1 API must have no side effects on stored data."""
    create_recurring_task(
        title="standup", frequency="daily", start_date=date.today() - timedelta(days=7), user=get_user
    )
    assert Task.objects.count() == 0

    today = date.today()
    key_client.get(
        v1_tasks_url,
        {"begin_date": str(today - timedelta(days=7)), "end_date": str(today)},
    )

    assert Task.objects.count() == 0


# --- v1 tasks: filters ------------------------------------------------------

def test_v1_tasks_filter_by_category(key_client, v1_tasks_url, get_user, create_task):
    create_task(title="a task", user=get_user, category="task")
    create_task(title="a meeting", user=get_user, category="meeting")

    response = key_client.get(v1_tasks_url, {"category": "meeting"})

    assert [t["title"] for t in response.data["results"]] == ["a meeting"]


def test_v1_tasks_filter_by_is_done(key_client, v1_tasks_url, get_user, create_task):
    create_task(title="open", user=get_user, is_done=False)
    create_task(title="closed", user=get_user, is_done=True)

    assert [t["title"] for t in key_client.get(v1_tasks_url, {"is_done": "true"}).data["results"]] == ["closed"]
    assert [t["title"] for t in key_client.get(v1_tasks_url, {"is_done": "false"}).data["results"]] == ["open"]


def test_v1_tasks_filter_by_project(key_client, v1_tasks_url, get_user, create_task, create_project):
    project = create_project(name="Apollo", user=get_user)
    create_task(title="in project", user=get_user, project=project)
    create_task(title="loose", user=get_user)

    response = key_client.get(v1_tasks_url, {"project": project.id})

    assert [t["title"] for t in response.data["results"]] == ["in project"]


def test_v1_tasks_search_matches_title_and_description(key_client, v1_tasks_url, get_user, create_task):
    create_task(title="write the report", description="", user=get_user)
    create_task(title="unrelated", description="mentions the report", user=get_user)
    create_task(title="nothing here", description="", user=get_user)

    response = key_client.get(v1_tasks_url, {"search": "report"})

    assert {t["title"] for t in response.data["results"]} == {"write the report", "unrelated"}


def test_v1_tasks_date_window_selects_active_tasks(key_client, v1_tasks_url, get_user, create_task):
    create_task(title="finished before", begin_date="2026-08-01", end_date="2026-08-05", is_done=True, user=get_user)
    create_task(title="spans window", begin_date="2026-08-01", end_date=None, user=get_user)
    create_task(title="starts after", begin_date="2026-09-01", user=get_user)
    create_task(title="undated", begin_date=None, end_date=None, user=get_user)

    response = key_client.get(v1_tasks_url, {"begin_date": "2026-08-10", "end_date": "2026-08-20"})

    assert {t["title"] for t in response.data["results"]} == {"spans window", "undated"}


def test_v1_tasks_date_window_includes_tasks_completed_inside_it(key_client, v1_tasks_url, get_user, create_task):
    create_task(title="done in window", begin_date="2026-08-01", end_date="2026-08-15", is_done=True, user=get_user)

    response = key_client.get(v1_tasks_url, {"begin_date": "2026-08-10", "end_date": "2026-08-20"})

    assert [t["title"] for t in response.data["results"]] == ["done in window"]


@pytest.mark.parametrize("params", [
    {"begin_date": "not-a-date"},
    {"end_date": "08/31/2026"},
    {"is_done": "maybe"},
    {"project": "abc"},
])
def test_v1_tasks_reject_malformed_filters(key_client, v1_tasks_url, params):
    """A silently dropped filter would be worse than an error for API consumers."""
    assert key_client.get(v1_tasks_url, params).status_code == 400


def test_v1_tasks_are_paginated(key_client, v1_tasks_url, get_user, create_task):
    for i in range(3):
        create_task(title=f"task {i}", user=get_user)

    response = key_client.get(v1_tasks_url, {"page_size": 2})

    assert len(response.data["results"]) == 2
    assert response.data["next"] is not None


# --- v1 projects ------------------------------------------------------------

def test_v1_projects_are_read_only_and_scoped(key_client, v1_projects_url, get_user, other_user, create_project):
    create_project(name="mine", user=get_user)
    create_project(name="theirs", user=other_user)

    response = key_client.get(v1_projects_url)

    assert [p["name"] for p in response.data["results"]] == ["mine"]
    assert key_client.post(v1_projects_url, {"name": "new"}, format="json").status_code == 405


def test_v1_projects_include_task_count(key_client, v1_projects_url, get_user, create_project, create_task):
    project = create_project(name="Apollo", user=get_user)
    create_task(title="one", user=get_user, project=project)
    create_task(title="two", user=get_user, project=project)

    response = key_client.get(v1_projects_url)

    assert response.data["results"][0]["task_count"] == 2


def test_v1_projects_filter_by_status(key_client, v1_projects_url, get_user, create_project):
    active = create_project(name="active one", user=get_user)
    done = create_project(name="done one", user=get_user)
    done.status = "complete"
    done.save(update_fields=["status"])

    response = key_client.get(v1_projects_url, {"status": "complete"})

    assert [p["name"] for p in response.data["results"]] == ["done one"]


# --- v1: query parameter validation -----------------------------------------

@pytest.mark.parametrize("params", [
    {"done": "false"},              # plausible-but-wrong name for is_done
    {"completed": "true"},
    {"title": "report"},            # `search` covers this
    {"ordering": "-begin_date"},    # not offered; ordering is fixed
    {"project_id": "1"},            # the param is `project`
])
def test_v1_tasks_reject_unknown_params(key_client, v1_tasks_url, params):
    """A typo'd filter must not read as 'no filter' and return everything."""
    response = key_client.get(v1_tasks_url, params)

    assert response.status_code == 400
    name = next(iter(params))
    assert name in response.data
    assert "supported_parameters" in response.data


def test_v1_unknown_param_error_lists_what_is_accepted(key_client, v1_tasks_url):
    response = key_client.get(v1_tasks_url, {"nope": "1"})

    supported = response.data["supported_parameters"]
    assert set(supported) >= {"category", "priority", "project", "is_done", "search",
                              "begin_date", "end_date", "cursor", "page_size"}


@pytest.mark.parametrize("params", [
    {"category": "Meeting"},        # values are case-sensitive
    {"category": "errand"},
    {"priority": "URGENT"},
    {"priority": "critical"},
])
def test_v1_tasks_reject_invalid_choice_values(key_client, v1_tasks_url, get_user, create_task, params):
    """An unrecognised choice is a 400, not an empty page that looks like 'no matches'."""
    create_task(title="something", user=get_user)

    response = key_client.get(v1_tasks_url, params)

    assert response.status_code == 400
    assert next(iter(params)) in response.data


def test_v1_choice_error_names_the_valid_values(key_client, v1_tasks_url):
    response = key_client.get(v1_tasks_url, {"priority": "critical"})

    message = str(response.data["priority"])
    assert all(value in message for value in ["urgent", "high", "medium", "low"])


@pytest.mark.parametrize("params", [
    {"state": "active"},            # the param is `status`
    {"name": "Apollo"},             # `search` covers this
])
def test_v1_projects_reject_unknown_params(key_client, v1_projects_url, params):
    assert key_client.get(v1_projects_url, params).status_code == 400


def test_v1_projects_reject_invalid_status(key_client, v1_projects_url, get_user, create_project):
    create_project(name="mine", user=get_user)

    response = key_client.get(v1_projects_url, {"status": "archived"})

    assert response.status_code == 400
    assert "active" in str(response.data["status"])


def test_v1_pagination_params_are_not_treated_as_unknown(key_client, v1_tasks_url, get_user, create_task):
    """page_size and cursor are DRF's, not ours, but must still be accepted."""
    for i in range(3):
        create_task(title=f"task {i}", user=get_user)

    first = key_client.get(v1_tasks_url, {"page_size": 2})
    assert first.status_code == 200

    cursor = parse_qs(urlparse(first.data["next"]).query)["cursor"][0]
    second = key_client.get(v1_tasks_url, {"page_size": 2, "cursor": cursor})
    assert second.status_code == 200
    assert len(second.data["results"]) == 1


def test_v1_detail_route_also_rejects_unknown_params(key_client, get_user, create_task):
    task = create_task(title="a task", user=get_user)

    response = key_client.get(reverse("v1-task-detail", args=[task.id]), {"nope": "1"})

    assert response.status_code == 400


def test_unauthenticated_request_with_bad_params_is_401_not_400(api_client, v1_tasks_url):
    """Never disclose the parameter surface to an unauthenticated caller."""
    assert api_client.get(v1_tasks_url, {"nope": "1"}).status_code == 401


# --- Key scopes -------------------------------------------------------------

def test_keys_are_read_scoped_by_default(auth_client, keys_url):
    """Asking for a key without saying more must never hand out write access."""
    response = auth_client.post(keys_url, {"name": "laptop"}, format="json")

    assert response.data["scope"] == PersonalAPIToken.SCOPE_READ
    assert PersonalAPIToken.objects.get().can_write is False


def test_key_can_be_created_read_write(auth_client, keys_url):
    response = auth_client.post(
        keys_url, {"name": "automation", "scope": "read_write"}, format="json"
    )

    assert response.status_code == 201
    assert response.data["scope"] == "read_write"
    assert PersonalAPIToken.objects.get().can_write is True


def test_key_creation_rejects_unknown_scope(auth_client, keys_url):
    response = auth_client.post(keys_url, {"scope": "admin"}, format="json")

    assert response.status_code == 400
    assert "read_write" in response.data["scope"]
    assert not PersonalAPIToken.objects.exists()


def test_key_list_reports_scope(auth_client, keys_url):
    auth_client.post(keys_url, {"name": "rw", "scope": "read_write"}, format="json")

    assert auth_client.get(keys_url).data[0]["scope"] == "read_write"


def test_a_key_cannot_widen_its_own_scope(write_client, keys_url):
    """Even a read/write key is barred from key management."""
    assert write_client.post(keys_url, {"scope": "read_write"}, format="json").status_code == 401


# --- v1 tasks: create -------------------------------------------------------

def test_create_task_with_only_a_title(write_client, v1_tasks_url, get_user):
    response = write_client.post(v1_tasks_url, {"title": "write the docs"}, format="json")

    assert response.status_code == 201
    task = Task.objects.get()
    assert task.title == "write the docs"
    assert task.user == get_user
    assert task.is_done is False
    assert task.category == "task"
    assert task.priority == "medium"


def test_created_task_is_owned_by_the_key_holder(write_client, v1_tasks_url, get_user, other_user):
    """`user` is not writable — a payload claiming another owner is ignored."""
    response = write_client.post(
        v1_tasks_url, {"title": "not yours", "user": other_user.id}, format="json"
    )

    assert response.status_code == 201
    assert Task.objects.get().user == get_user


def test_create_task_with_full_payload(write_client, v1_tasks_url, get_user, create_project):
    project = create_project(name="Apollo", user=get_user)

    response = write_client.post(v1_tasks_url, {
        "title": "kickoff",
        "description": "with the team",
        "category": "meeting",
        "priority": "high",
        "begin_date": "2026-09-01",
        "deadline_date": "2026-09-02",
        "begin_time": "09:00:00",
        "end_time": "09:30:00",
        "project": project.id,
    }, format="json")

    assert response.status_code == 201
    assert response.data["project_name"] == "Apollo"
    task = Task.objects.get()
    assert task.category == "meeting"
    assert task.priority == "high"
    assert str(task.begin_date) == "2026-09-01"
    assert task.project == project


def test_create_task_requires_a_title(write_client, v1_tasks_url):
    assert write_client.post(v1_tasks_url, {}, format="json").status_code == 400
    assert write_client.post(v1_tasks_url, {"title": "   "}, format="json").status_code == 400
    assert not Task.objects.exists()


def test_create_task_rejects_invalid_choices(write_client, v1_tasks_url):
    assert write_client.post(
        v1_tasks_url, {"title": "x", "category": "errand"}, format="json"
    ).status_code == 400
    assert write_client.post(
        v1_tasks_url, {"title": "x", "priority": "critical"}, format="json"
    ).status_code == 400
    assert not Task.objects.exists()


def test_cannot_attach_a_task_to_another_users_project(
    write_client, v1_tasks_url, other_user, create_project
):
    """Guessing a project id must not file work into someone else's account."""
    theirs = create_project(name="theirs", user=other_user)

    response = write_client.post(
        v1_tasks_url, {"title": "trespass", "project": theirs.id}, format="json"
    )

    assert response.status_code == 400
    assert "project" in response.data
    assert not Task.objects.exists()


def test_cannot_parent_a_task_to_another_users_task(
    write_client, v1_tasks_url, other_user, create_task
):
    theirs = create_task(title="theirs", user=other_user)

    response = write_client.post(
        v1_tasks_url, {"title": "trespass", "parent": theirs.id}, format="json"
    )

    assert response.status_code == 400
    assert "parent" in response.data


def test_create_subtask_inherits_parent_begin_date(
    write_client, v1_tasks_url, get_user, create_task
):
    parent = create_task(title="parent", begin_date="2026-09-01", user=get_user)

    response = write_client.post(
        v1_tasks_url, {"title": "child", "parent": parent.id}, format="json"
    )

    assert response.status_code == 201
    child = Task.objects.get(title="child")
    assert child.begin_date == date(2026, 9, 1)
    assert child.is_subtask is True
    assert response.data["is_subtask"] is True


def test_subtask_begin_date_must_match_its_parent(
    write_client, v1_tasks_url, get_user, create_task
):
    parent = create_task(title="parent", begin_date="2026-09-01", user=get_user)

    response = write_client.post(
        v1_tasks_url,
        {"title": "child", "parent": parent.id, "begin_date": "2026-09-05"},
        format="json",
    )

    assert response.status_code == 400
    assert "begin_date" in response.data


def test_subtasks_cannot_nest(write_client, v1_tasks_url, get_user, create_task):
    """The app renders one level of subtasks; the API must not create deeper trees."""
    parent = create_task(title="parent", user=get_user)
    child = create_task(title="child", user=get_user, parent=parent)

    response = write_client.post(
        v1_tasks_url, {"title": "grandchild", "parent": child.id}, format="json"
    )

    assert response.status_code == 400
    assert "parent" in response.data


def test_recurrence_cannot_be_set_over_the_api(
    write_client, v1_tasks_url, get_user, create_recurring_task
):
    recurring = create_recurring_task(title="standup", frequency="daily", user=get_user)

    response = write_client.post(
        v1_tasks_url, {"title": "sneaky", "recurring_task": recurring.id}, format="json"
    )

    assert response.status_code == 201
    assert Task.objects.get(title="sneaky").recurring_task_id is None


# --- v1 tasks: update -------------------------------------------------------

def test_patch_task_fields(write_client, get_user, create_task):
    task = create_task(title="draft", user=get_user)

    response = write_client.patch(
        task_detail(task), {"title": "final", "priority": "urgent"}, format="json"
    )

    assert response.status_code == 200
    task.refresh_from_db()
    assert task.title == "final"
    assert task.priority == "urgent"


def test_patch_leaves_unmentioned_fields_alone(write_client, get_user, create_task):
    task = create_task(title="draft", description="keep me", user=get_user)

    write_client.patch(task_detail(task), {"title": "final"}, format="json")

    task.refresh_from_db()
    assert task.description == "keep me"


def test_completing_a_task_stamps_the_end_date(write_client, get_user, create_task):
    task = create_task(title="work", user=get_user, is_done=False)

    write_client.patch(task_detail(task), {"is_done": True}, format="json")

    task.refresh_from_db()
    assert task.is_done is True
    assert task.end_date == date.today()


def test_reopening_a_task_clears_the_end_date(write_client, get_user, create_task):
    task = create_task(title="work", user=get_user, is_done=True, end_date=str(date.today()))

    write_client.patch(task_detail(task), {"is_done": False}, format="json")

    task.refresh_from_db()
    assert task.is_done is False
    assert task.end_date is None


def test_completing_a_parent_completes_its_children(write_client, get_user, create_task):
    """Same rule the app enforces — v1 must not leave subtasks stranded open."""
    parent = create_task(title="parent", user=get_user)
    child = create_task(title="child", user=get_user, parent=parent)

    write_client.patch(task_detail(parent), {"is_done": True}, format="json")

    child.refresh_from_db()
    assert child.is_done is True
    assert child.end_date == date.today()


def test_put_replaces_rather_than_merges(write_client, get_user, create_task, create_project):
    """PUT that quietly behaved like PATCH would be the worst kind of surprise."""
    project = create_project(name="Apollo", user=get_user)
    task = create_task(
        title="old", description="old description", begin_date="2026-09-01",
        user=get_user, project=project,
    )
    task.priority = "urgent"
    task.save(update_fields=["priority"])

    response = write_client.put(task_detail(task), {"title": "new"}, format="json")

    assert response.status_code == 200
    task.refresh_from_db()
    assert task.title == "new"
    assert task.description == ""
    assert task.begin_date is None
    assert task.project is None
    assert task.priority == "medium"


def test_cannot_update_another_users_task(write_client, other_user, create_task):
    task = create_task(title="theirs", user=other_user)

    response = write_client.patch(task_detail(task), {"title": "hijacked"}, format="json")

    assert response.status_code == 404
    task.refresh_from_db()
    assert task.title == "theirs"


def test_cannot_move_a_task_into_another_users_project(
    write_client, get_user, other_user, create_task, create_project
):
    task = create_task(title="mine", user=get_user)
    theirs = create_project(name="theirs", user=other_user)

    response = write_client.patch(task_detail(task), {"project": theirs.id}, format="json")

    assert response.status_code == 400
    task.refresh_from_db()
    assert task.project is None


def test_a_task_cannot_become_its_own_parent(write_client, get_user, create_task):
    task = create_task(title="ouroboros", user=get_user)

    response = write_client.patch(task_detail(task), {"parent": task.id}, format="json")

    assert response.status_code == 400
    assert "parent" in response.data


def test_update_cannot_reassign_ownership(write_client, get_user, other_user, create_task):
    task = create_task(title="mine", user=get_user)

    write_client.patch(task_detail(task), {"user": other_user.id}, format="json")

    task.refresh_from_db()
    assert task.user == get_user


# --- v1 tasks: delete -------------------------------------------------------

def test_delete_task(write_client, get_user, create_task):
    task = create_task(title="gone", user=get_user)

    response = write_client.delete(task_detail(task))

    assert response.status_code == 204
    assert not Task.objects.filter(id=task.id).exists()


def test_delete_detaches_children_rather_than_deleting_them(
    write_client, get_user, create_task
):
    parent = create_task(title="parent", user=get_user)
    child = create_task(title="child", user=get_user, parent=parent)

    write_client.delete(task_detail(parent))

    child.refresh_from_db()
    assert child.parent is None
    assert child.is_subtask is False


def test_deleting_a_recurring_occurrence_records_a_skip(
    write_client, get_user, create_task, create_recurring_task
):
    """Without the skip, the app would regenerate it and the delete would look ignored."""
    recurring = create_recurring_task(title="standup", frequency="daily", user=get_user)
    occurrence = create_task(
        title="standup", begin_date=str(date.today()), user=get_user, recurring_task=recurring
    )

    response = write_client.delete(task_detail(occurrence))

    assert response.status_code == 204
    assert RecurringTaskException.objects.filter(
        user=get_user,
        recurring_task=recurring,
        date=date.today(),
        type=RecurringTaskException.TYPE_SKIP,
    ).exists()
    # The series itself survives; only this occurrence was skipped.
    assert RecurringTask.objects.filter(id=recurring.id).exists()


def test_cannot_delete_another_users_task(write_client, other_user, create_task):
    task = create_task(title="theirs", user=other_user)

    response = write_client.delete(task_detail(task))

    assert response.status_code == 404
    assert Task.objects.filter(id=task.id).exists()


# --- v1 write: boundaries ---------------------------------------------------

def test_projects_stay_read_only_even_for_a_write_key(
    write_client, v1_projects_url, get_user, create_project
):
    """Project lifecycle stays in the app, so this is 405 rather than a scope error."""
    project = create_project(name="Apollo", user=get_user)
    detail_url = reverse("v1-project-detail", args=[project.id])

    assert write_client.post(v1_projects_url, {"name": "new"}, format="json").status_code == 405
    assert write_client.patch(detail_url, {"name": "edited"}, format="json").status_code == 405
    assert write_client.delete(detail_url).status_code == 405

    project.refresh_from_db()
    assert project.name == "Apollo"


def test_read_key_gets_405_not_403_where_nobody_may_write(key_client, v1_projects_url):
    """A scope error would send the caller off to mint a key that changes nothing."""
    assert key_client.post(v1_projects_url, {"name": "new"}, format="json").status_code == 405


def test_write_key_still_cannot_reach_the_apps_own_endpoints(write_client, tasks_list_url):
    """Scope widens what the key may do in v1, not where it may go."""
    assert write_client.get(tasks_list_url).status_code == 401
    assert write_client.post(tasks_list_url, {"title": "x"}, format="json").status_code == 401


def test_unauthenticated_write_is_rejected(db, api_client, v1_tasks_url):
    assert api_client.post(v1_tasks_url, {"title": "x"}, format="json").status_code == 401
    assert not Task.objects.exists()


def test_write_requests_reject_unknown_query_params(write_client, v1_tasks_url):
    response = write_client.post(f"{v1_tasks_url}?nope=1", {"title": "x"}, format="json")

    assert response.status_code == 400
    assert not Task.objects.exists()


def test_writing_stamps_last_used_at(write_client, v1_tasks_url):
    write_client.post(v1_tasks_url, {"title": "x"}, format="json")

    assert PersonalAPIToken.objects.get().last_used_at is not None
