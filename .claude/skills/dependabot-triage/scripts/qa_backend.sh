#!/usr/bin/env bash
# Build the backend image from a PR head or branch, run it under gunicorn against a
# throwaway Postgres, seed the demo account and exercise the API. Prints one line per
# request so the output can be diffed against a baseline run on the base branch.
# Usage: qa_backend.sh <pr-number|branch> [package ...]   (extra args: versions to print)
#        PG_VERSION=16 qa_backend.sh ...                  (default Postgres is 13, as in CI)
#        QA_EXTRA_GETS="/calendar/oauth/init/" qa_backend.sh ...  (extra authenticated GETs)
source "$(dirname "$(readlink -f "$0")")/_common.sh"
TARGET=$1; shift; PKGS=${*:-Django djangorestframework}
resolve_target "$TARGET"; echo "target $TARGET head $SHA"
WT=$QA_TMP/wt-be-$LABEL; PORT=${QA_BE_PORT:-8999}; NET=ws-qa-net; IMG=ws-qa-be:$LABEL
B=http://127.0.0.1:$PORT/api; JAR=$QA_TMP/jar-$LABEL.txt; RESP=$QA_TMP/resp-$LABEL.json
cleanup() { docker rm -f ws-qa-be ws-qa-db >/dev/null 2>&1; docker network rm $NET >/dev/null 2>&1; git worktree remove --force "$WT" 2>/dev/null; rm -f "$JAR"; }
trap cleanup EXIT; cleanup
git worktree add --detach "$WT" "$SHA" >/dev/null 2>&1 || { echo "worktree failed"; exit 1; }
build() { docker build --progress=plain -t "$IMG" "$WT/backend" >"$QA_TMP/build-be-$LABEL.log" 2>&1; }
echo "== docker build"
# pip downloads fail transiently on this machine; retry once before calling it a real failure.
build || { echo "build failed once, retrying"; build; } || { echo "BUILD FAILED"; grep -aE 'ERROR|conflict|depends on|No matching' "$QA_TMP/build-be-$LABEL.log" | cut -c1-250 | head -20; exit 1; }
docker network create $NET >/dev/null
# Pull explicitly: on WSL the Docker credential helper sometimes times out, so retry once.
docker image inspect "postgres:${PG_VERSION:-13}" >/dev/null 2>&1 || docker pull -q "postgres:${PG_VERSION:-13}" >/dev/null 2>&1 || docker pull -q "postgres:${PG_VERSION:-13}" >/dev/null
docker run -d --name ws-qa-db --network $NET -e POSTGRES_DB=qa -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres "postgres:${PG_VERSION:-13}" >/dev/null || { echo "DB CONTAINER FAILED TO START"; exit 1; }
READY=0; for _ in $(seq 1 30); do docker exec ws-qa-db pg_isready -U postgres >/dev/null 2>&1 && { READY=1; break; }; sleep 1; done
[ $READY = 1 ] || { echo "DB NOT READY"; exit 1; }; sleep 2
echo "== postgres $(docker exec ws-qa-db psql -U postgres -tAc 'show server_version' | cut -d' ' -f1)"
docker run -d --name ws-qa-be --network $NET -p "$PORT:8000" \
  -e DATABASE_URL=postgres://postgres:postgres@ws-qa-db:5432/qa -e SECRET_KEY=qa-secret-key-not-for-production-0123456789 \
  -e DEBUG=1 -e ALLOWED_HOSTS=localhost,127.0.0.1 -e DJANGO_SETTINGS_MODULE=backend.settings "$IMG" >/dev/null
for _ in $(seq 1 90); do curl -s -o /dev/null "$B/auth/csrf/" && break; sleep 2; done
echo "== versions"; docker exec ws-qa-be pip list 2>/dev/null | grep -iE "^($(echo "$PKGS" | tr ' ' '|')) "
echo "== manage.py check"; docker exec ws-qa-be python manage.py check 2>&1 | tail -3
echo "== pip check"; docker exec ws-qa-be pip check 2>&1 | head -8
echo "== seed demo account"; docker exec ws-qa-be python manage.py seed_demo_account 2>&1 | grep -E 'projects, .* tasks|Traceback|Error' | tail -3
req() { # method path [json-body]
  local csrf; csrf=$(awk '$6=="csrftoken"{print $7}' "$JAR" 2>/dev/null | tail -1)
  local args=(-s -o "$RESP" -w '%{http_code}' -X "$1" -b "$JAR" -c "$JAR" -H "Origin: http://localhost:3000" -H "Referer: http://localhost:3000/" -H "X-CSRFToken: ${csrf:-}")
  [ -n "${3:-}" ] && args+=(-H 'Content-Type: application/json' -d "$3")
  echo "  $1 $2 -> $(curl "${args[@]}" "$B$2")"
}
echo "== api smoke"
req GET /tasks/
req GET /auth/csrf/
req POST /auth/login/ '{"email":"demo@worksmarter.test","password":"wrong"}'
req POST /auth/login/ '{"email":"demo@worksmarter.test","password":"demo-pass-1234"}'
for p in /tasks/ /projects/ /recurring-tasks/ /user/ /resumes/ /resume-profile/ /work-experiences/ /educations/ /skills/ /keys/ /calendar/status/ /import/csv/spec/ /export/csv/ ${QA_EXTRA_GETS:-}; do req GET $p; done
NEXT=$(curl -s -b "$JAR" "$B/tasks/" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('results',[])), d.get('next') or '')")
echo "  tasks page 1: ${NEXT%% *} results; page 2 -> $(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$(echo "${NEXT#* }" | sed -E "s#^https?://[^/]+#http://127.0.0.1:$PORT#")")"
req POST /tasks/ '{"title":""}'
req POST /tasks/ '{"title":"QA smoke task","begin_date":"2026-01-05","end_date":"2026-01-05","priority":"medium","category":"task"}'
TID=$(python3 -c "import json; print(json.load(open('$RESP')).get('id',''))" 2>/dev/null)
if [ -n "$TID" ]; then req PATCH "/tasks/$TID/" '{"is_done":true}' | sed "s#/$TID/#/<id>/#"; req DELETE "/tasks/$TID/" | sed "s#/$TID/#/<id>/#"; fi
req POST /auth/refresh/ '{}'
echo "== server log (500s and exceptions)"; docker logs ws-qa-be 2>&1 | grep -E '^Internal Server Error|^[A-Za-z_.]+(Error|Exception): ' | grep -v '^BrokenPipeError' | cut -c1-120 | sort | uniq -c | head -12
echo "BACKEND SMOKE DONE (compare the lines above with a run on the base branch)"
