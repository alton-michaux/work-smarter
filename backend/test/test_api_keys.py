"""Tests for personal API keys and the read-only v1 API."""

import pytest
from datetime import date, timedelta
from urllib.parse import parse_qs, urlparse
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import PersonalAPIToken, Task
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
    """An APIClient authenticated as `alice` with a personal API key."""
    _, raw_key = PersonalAPIToken.generate(get_user, name="scripts")
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Api-Key {raw_key}")
    return client


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

def test_v1_tasks_are_read_only(key_client, v1_tasks_url, get_user, create_task):
    task = create_task(title="immutable", user=get_user)
    detail_url = reverse("v1-task-detail", args=[task.id])

    assert key_client.post(v1_tasks_url, {"title": "new"}, format="json").status_code == 405
    assert key_client.patch(detail_url, {"title": "edited"}, format="json").status_code == 405
    assert key_client.put(detail_url, {"title": "edited"}, format="json").status_code == 405
    assert key_client.delete(detail_url).status_code == 405

    task.refresh_from_db()
    assert task.title == "immutable"


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
