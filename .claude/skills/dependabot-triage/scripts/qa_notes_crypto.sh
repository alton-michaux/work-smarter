#!/usr/bin/env bash
# Cross-version check for encrypted notes: seed notes with the base image's `cryptography`,
# then decrypt them with the PR image against the same database, and the reverse
# (notes the PR image encrypts must still decrypt on the base image, for rollbacks).
# Needs both images already built by qa_backend.sh (ws-qa-be:<base> and ws-qa-be:pr<N>).
# Usage: qa_notes_crypto.sh <pr-number> [base-label, default dev]
source "$(dirname "$(readlink -f "$0")")/_common.sh"
PR=$1; BASE=${2:-dev}; NET=ws-qa-net
OLD=ws-qa-be:$BASE; NEW=ws-qa-be:pr$PR
for i in "$OLD" "$NEW"; do docker image inspect "$i" >/dev/null 2>&1 || { echo "missing image $i; run qa_backend.sh first"; exit 1; }; done
cleanup() { docker rm -f ws-qa-db >/dev/null 2>&1; docker network rm $NET >/dev/null 2>&1; }
trap cleanup EXIT; cleanup
docker network create $NET >/dev/null
docker run -d --name ws-qa-db --network $NET -e POSTGRES_DB=qa -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres "postgres:${PG_VERSION:-13}" >/dev/null
for _ in $(seq 1 30); do docker exec ws-qa-db pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done; sleep 2
ENV=(-e DATABASE_URL=postgres://postgres:postgres@ws-qa-db:5432/qa -e SECRET_KEY=qa-secret-key-not-for-production-0123456789 -e DEBUG=1 -e DJANGO_SETTINGS_MODULE=backend.settings)
run() { docker run --rm --network $NET "${ENV[@]}" --entrypoint bash "$1" -c "$2" 2>&1 | grep -vE 'W001|System check|^$|UserWarning|allauth_account_settings|^WARNINGS:'; }
CHECK='python manage.py shell -c "
import cryptography
from api.models import Task
from api.services.note_encryption import decrypt_text, encrypt_text, InvalidToken
notes = Task.objects.filter(is_encrypted=True)
ok = sum(1 for n in notes if decrypt_text(n.encrypted_description, n.encryption_salt, \"demo-passphrase\"))
bad = 0
sample = list(notes[:3])
for n in sample:
    try: decrypt_text(n.encrypted_description, n.encryption_salt, \"wrong\")
    except InvalidToken: bad += 1
print(f\"cryptography {cryptography.__version__}: decrypted {ok}/{notes.count()} notes, wrong passphrase rejected {bad}/{len(sample)}\")
"'
REENCRYPT='python manage.py shell -c "
import cryptography
from api.models import Task
from api.services.note_encryption import encrypt_text
n = 0
for t in Task.objects.filter(is_encrypted=True):
    t.encrypted_description, t.encryption_salt = encrypt_text(\"re-encrypted by \" + cryptography.__version__, \"demo-passphrase\"); t.save(); n += 1
print(f\"cryptography {cryptography.__version__}: re-encrypted {n} notes\")
"'
echo "== migrate + seed with $OLD"; run "$OLD" "python manage.py migrate -v0 && python manage.py seed_demo_account | grep -E 'projects, .* tasks'"
echo "== notes written by $BASE, read by PR"; run "$NEW" "$CHECK"
echo "== notes written by PR, read by $BASE (rollback safety)"; run "$NEW" "$REENCRYPT"; run "$OLD" "$CHECK"
