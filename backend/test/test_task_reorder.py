"""POST /api/tasks/reorder/ persists a manual order for one parent's subtasks.

The daily log lets users drag subtasks into the order they want to work them,
which the priority sort alone can't express.
"""
import pytest
from django.contrib.auth import get_user_model

from api.models import Task


@pytest.fixture
def reorder_url():
    return "/api/tasks/reorder/"


@pytest.fixture
def family(create_task, get_user):
    """A parent with three subtasks at positions 0, 1, 2."""
    parent = create_task(title="Parent", user=get_user)
    children = [
        create_task(title=f"Child {i}", user=get_user, parent=parent)
        for i in range(3)
    ]
    for position, child in enumerate(children):
        Task.objects.filter(pk=child.pk).update(position=position)
    return parent, children


@pytest.mark.django_db
def test_reorder_writes_positions_in_the_given_order(
    auth_client, reorder_url, family
):
    parent, (a, b, c) = family

    resp = auth_client.post(
        reorder_url,
        {"parent": parent.id, "order": [c.id, a.id, b.id]},
        format="json",
    )

    assert resp.status_code == 200, resp.data
    assert [row["id"] for row in resp.data] == [c.id, a.id, b.id]
    assert [row["position"] for row in resp.data] == [0, 1, 2]

    for task, expected in ((c, 0), (a, 1), (b, 2)):
        task.refresh_from_db()
        assert task.position == expected


@pytest.mark.django_db
def test_reorder_rejects_a_partial_sibling_list(auth_client, reorder_url, family):
    """A stale client must not be able to scramble rows it never saw."""
    parent, (a, b, _c) = family

    resp = auth_client.post(
        reorder_url, {"parent": parent.id, "order": [b.id, a.id]}, format="json"
    )

    assert resp.status_code == 400
    a.refresh_from_db()
    assert a.position == 0


@pytest.mark.django_db
def test_reorder_rejects_ids_from_another_parent(
    auth_client, reorder_url, family, create_task, get_user
):
    parent, (a, b, c) = family
    stranger = create_task(title="Elsewhere", user=get_user)
    outsider = create_task(title="Outside child", user=get_user, parent=stranger)

    resp = auth_client.post(
        reorder_url,
        {"parent": parent.id, "order": [a.id, b.id, c.id, outsider.id]},
        format="json",
    )

    assert resp.status_code == 400
    outsider.refresh_from_db()
    assert outsider.position == 0


@pytest.mark.django_db
def test_reorder_rejects_duplicate_ids(auth_client, reorder_url, family):
    parent, (a, b, _c) = family

    resp = auth_client.post(
        reorder_url,
        {"parent": parent.id, "order": [a.id, a.id, b.id]},
        format="json",
    )

    assert resp.status_code == 400


@pytest.mark.django_db
def test_reorder_refuses_another_users_parent(
    auth_client, reorder_url, create_user, create_task
):
    other = create_user(username="mallory", email="mallory@example.com")
    their_parent = create_task(title="Theirs", user=other)
    their_child = create_task(title="Their child", user=other, parent=their_parent)

    resp = auth_client.post(
        reorder_url,
        {"parent": their_parent.id, "order": [their_child.id]},
        format="json",
    )

    assert resp.status_code == 404


@pytest.mark.django_db
def test_reorder_validates_its_input(auth_client, reorder_url, family):
    parent, _children = family

    assert auth_client.post(reorder_url, {"order": [1]}, format="json").status_code == 400
    assert (
        auth_client.post(
            reorder_url, {"parent": parent.id, "order": []}, format="json"
        ).status_code
        == 400
    )
    assert (
        auth_client.post(
            reorder_url, {"parent": parent.id, "order": "nope"}, format="json"
        ).status_code
        == 400
    )


@pytest.mark.django_db
def test_new_subtasks_serialize_with_a_position(auth_client, tasks_list_url, get_user, create_task):
    parent = create_task(title="Parent", user=get_user)

    resp = auth_client.post(
        tasks_list_url,
        {"title": "Fresh", "parent": parent.id, "recurring_task": None},
        format="json",
    )

    assert resp.status_code == 201, resp.data
    assert resp.data["position"] == 0
