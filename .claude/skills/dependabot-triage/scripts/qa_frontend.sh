#!/usr/bin/env bash
# Build the production frontend image (npm ci + next build) from a PR head or branch and
# smoke-test it with `next start`. CI has no frontend job and Vercel previews sit behind
# SSO, so this is the only check that the frontend still builds from a clean lockfile and serves.
# Usage: qa_frontend.sh <pr-number|branch>
source "$(dirname "$(readlink -f "$0")")/_common.sh"
resolve_target "$1"; echo "target $1 head $SHA"
WT=$QA_TMP/wt-fe-$LABEL; PORT=${QA_FE_PORT:-3999}; IMG=ws-qa-fe:$LABEL
cleanup() { docker rm -f ws-qa-fe >/dev/null 2>&1; git worktree remove --force "$WT" 2>/dev/null; }
trap cleanup EXIT; cleanup
git worktree add --detach "$WT" "$SHA" >/dev/null 2>&1 || { echo "worktree failed"; exit 1; }
build() { docker build --progress=plain -t "$IMG" --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000/api "$WT/frontend" >"$QA_TMP/build-fe-$LABEL.log" 2>&1; }
echo "== docker build"
# Downloads fail transiently on this machine; retry once before calling it a real failure.
build || { echo "build failed once, retrying"; build; } || { echo "BUILD FAILED"; grep -aE 'npm error|ERR!|Error:|Failed to compile|Type error' "$QA_TMP/build-fe-$LABEL.log" | cut -c1-250 | head -25; exit 1; }
echo "build ok"
docker run -d --name ws-qa-fe -p "$PORT:3000" "$IMG" >/dev/null
for _ in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$PORT/login" && break; sleep 1; done
echo "== resolved versions (package-lock.json)"
python3 - "$WT/frontend/package-lock.json" ${QA_PKGS:-next react sharp postcss nanoid browserslist baseline-browser-mapping brace-expansion} <<'PY'
import json, sys
pk = json.load(open(sys.argv[1]))["packages"]
for name in sys.argv[2:]:
    hits = sorted((p, v["version"]) for p, v in pk.items() if p.endswith("node_modules/" + name))
    print(" ", name, ", ".join(f"{v} ({p})" if p.count("node_modules") > 1 else v for p, v in hits) or "not present")
PY
echo "== smoke"
FAIL=0
for p in / /login /register /dashboard /tasks /projects /notes /resume /settings /definitely-not-a-page; do
  code=$(curl -s -o "$QA_TMP/page.html" -w '%{http_code}' --max-time 20 "http://127.0.0.1:$PORT$p")
  want=200; [ "$p" = /definitely-not-a-page ] && want=404
  [ "$code" = "$want" ] || FAIL=1
  echo "  $p -> $code $(wc -c <"$QA_TMP/page.html")b next_data=$(grep -c '__NEXT_DATA__' "$QA_TMP/page.html")"
done
echo "== runtime: node $(docker exec ws-qa-fe node --version)"
# Optional extra check run inside the running container, e.g. QA_NODE_CHECK="require('sharp')".
if [ -n "${QA_NODE_CHECK:-}" ]; then
  docker exec ws-qa-fe node -e "$QA_NODE_CHECK" 2>&1 | tail -5 && echo "  QA_NODE_CHECK ok" || { echo "  QA_NODE_CHECK FAILED"; FAIL=1; }
fi
echo "== server log (errors)"; docker logs ws-qa-fe 2>&1 | grep -iE 'error|unhandled' | head -10
[ $FAIL = 0 ] && echo "FRONTEND SMOKE OK" || { echo "FRONTEND SMOKE FAILED"; exit 1; }
