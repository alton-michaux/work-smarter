import pytest
from django.urls import reverse

from api.models import Task


@pytest.mark.django_db
class TestEncryptedNoteCreate:
    def test_create_encrypted_note_stores_ciphertext_not_plaintext(self, auth_client, get_user):
        url = reverse("task-list")
        res = auth_client.post(
            url,
            {
                "title": "Secret note",
                "category": "note",
                "is_encrypted": True,
                "description": "the launch codes are 1234",
                "passphrase": "correct horse battery staple",
            },
            format="json",
        )
        assert res.status_code == 201, res.data

        task = Task.objects.get(id=res.data["id"], user=get_user)
        assert task.description == ""
        assert task.is_encrypted is True
        assert bytes(task.encrypted_description)
        assert b"launch codes" not in bytes(task.encrypted_description)

    def test_create_encrypted_note_without_passphrase_rejected(self, auth_client):
        url = reverse("task-list")
        res = auth_client.post(
            url,
            {
                "title": "Secret note",
                "category": "note",
                "is_encrypted": True,
                "description": "no passphrase provided",
            },
            format="json",
        )
        assert res.status_code == 400

    def test_encrypted_flag_rejected_for_non_note_category(self, auth_client):
        url = reverse("task-list")
        res = auth_client.post(
            url,
            {
                "title": "Not a note",
                "category": "task",
                "is_encrypted": True,
                "description": "should not encrypt",
                "passphrase": "whatever",
            },
            format="json",
        )
        assert res.status_code == 400


@pytest.mark.django_db
class TestEncryptedNoteDecrypt:
    def _create_encrypted_note(self, auth_client, description="the real content", passphrase="hunter2"):
        url = reverse("task-list")
        res = auth_client.post(
            url,
            {
                "title": "Secret note",
                "category": "note",
                "is_encrypted": True,
                "description": description,
                "passphrase": passphrase,
            },
            format="json",
        )
        assert res.status_code == 201, res.data
        return res.data["id"]

    def test_decrypt_with_correct_passphrase_returns_plaintext(self, auth_client):
        note_id = self._create_encrypted_note(auth_client, description="the real content", passphrase="hunter2")
        url = reverse("task-decrypt", args=[note_id])
        res = auth_client.post(url, {"passphrase": "hunter2"}, format="json")
        assert res.status_code == 200
        assert res.data["description"] == "the real content"

    def test_decrypt_with_wrong_passphrase_rejected(self, auth_client):
        note_id = self._create_encrypted_note(auth_client, passphrase="hunter2")
        url = reverse("task-decrypt", args=[note_id])
        res = auth_client.post(url, {"passphrase": "wrong guess"}, format="json")
        assert res.status_code == 400
        assert "description" not in res.data

    def test_decrypt_non_encrypted_note_rejected(self, auth_client):
        url = reverse("task-list")
        create_res = auth_client.post(
            url,
            {"title": "Plain note", "category": "note", "description": "not encrypted"},
            format="json",
        )
        note_id = create_res.data["id"]
        res = auth_client.post(reverse("task-decrypt", args=[note_id]), {"passphrase": "x"}, format="json")
        assert res.status_code == 400


@pytest.mark.django_db
class TestEncryptedNoteReadAndSearch:
    def test_list_and_retrieve_never_include_plaintext(self, auth_client):
        note_id = self._create(auth_client, description="never leak this", passphrase="hunter2")

        list_res = auth_client.get(reverse("task-list"))
        assert list_res.status_code == 200
        assert "never leak this" not in str(list_res.data)

        detail_res = auth_client.get(reverse("task-detail", args=[note_id]))
        assert detail_res.status_code == 200
        assert detail_res.data["description"] == ""
        assert "never leak this" not in str(detail_res.data)

    def test_encrypted_content_is_not_searchable(self, auth_client):
        self._create(auth_client, description="findable only in ciphertext", passphrase="hunter2")
        # Equivalent plaintext note as a control — search should still work in general.
        auth_client.post(
            reverse("task-list"),
            {"title": "Plain note", "category": "note", "description": "findable only in ciphertext"},
            format="json",
        )

        res = auth_client.get(reverse("task-list"), {"search": "findable only in ciphertext"})
        assert res.status_code == 200
        titles = [t["title"] for t in res.data["results"]]
        assert "Plain note" in titles
        assert "Secret note" not in titles

    def _create(self, auth_client, description, passphrase):
        res = auth_client.post(
            reverse("task-list"),
            {
                "title": "Secret note",
                "category": "note",
                "is_encrypted": True,
                "description": description,
                "passphrase": passphrase,
            },
            format="json",
        )
        assert res.status_code == 201, res.data
        return res.data["id"]


@pytest.mark.django_db
class TestEncryptedNoteUpdate:
    def _create(self, auth_client, description="original content", passphrase="hunter2"):
        res = auth_client.post(
            reverse("task-list"),
            {
                "title": "Secret note",
                "category": "note",
                "is_encrypted": True,
                "description": description,
                "passphrase": passphrase,
            },
            format="json",
        )
        assert res.status_code == 201, res.data
        return res.data

    def test_full_update_with_blank_description_does_not_destroy_ciphertext(self, auth_client):
        """Regression test: the generic task-edit flow PUTs the whole task,
        including whatever `description` the client currently holds — for a
        locked encrypted note that's always "". This must not silently wipe
        the real ciphertext."""
        note = self._create(auth_client)
        note_id = note["id"]

        url = reverse("task-detail", args=[note_id])
        res = auth_client.put(
            url,
            {
                "title": "Renamed secret note",
                "category": "note",
                "is_encrypted": True,
                "description": "",  # locked placeholder value, not real content
                "priority": "high",
            },
            format="json",
        )
        assert res.status_code == 200, res.data

        decrypt_res = auth_client.post(
            reverse("task-decrypt", args=[note_id]), {"passphrase": "hunter2"}, format="json"
        )
        assert decrypt_res.status_code == 200
        assert decrypt_res.data["description"] == "original content"

    def test_rewriting_encrypted_content_requires_passphrase(self, auth_client):
        note = self._create(auth_client)
        note_id = note["id"]

        res = auth_client.put(
            reverse("task-detail", args=[note_id]),
            {
                "title": "Secret note",
                "category": "note",
                "is_encrypted": True,
                "description": "new content, no passphrase sent",
            },
            format="json",
        )
        assert res.status_code == 400

    def test_rewriting_encrypted_content_with_passphrase_succeeds(self, auth_client):
        note = self._create(auth_client)
        note_id = note["id"]

        res = auth_client.put(
            reverse("task-detail", args=[note_id]),
            {
                "title": "Secret note",
                "category": "note",
                "is_encrypted": True,
                "description": "updated content",
                "passphrase": "hunter2",
            },
            format="json",
        )
        assert res.status_code == 200, res.data

        decrypt_res = auth_client.post(
            reverse("task-decrypt", args=[note_id]), {"passphrase": "hunter2"}, format="json"
        )
        assert decrypt_res.data["description"] == "updated content"

    def test_turning_off_encryption_requires_correct_passphrase(self, auth_client):
        note = self._create(auth_client)
        note_id = note["id"]

        bad_res = auth_client.put(
            reverse("task-detail", args=[note_id]),
            {"title": "Secret note", "category": "note", "is_encrypted": False, "passphrase": "wrong"},
            format="json",
        )
        assert bad_res.status_code == 400

        res = auth_client.put(
            reverse("task-detail", args=[note_id]),
            {"title": "Secret note", "category": "note", "is_encrypted": False, "passphrase": "hunter2"},
            format="json",
        )
        assert res.status_code == 200, res.data
        assert res.data["description"] == "original content"
        assert res.data["is_encrypted"] is False
