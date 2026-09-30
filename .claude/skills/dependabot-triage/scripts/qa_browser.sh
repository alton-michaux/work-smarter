#!/usr/bin/env bash
# End-to-end browser check for frontend framework changes: runs a backend (from an image
# built by qa_backend.sh) on :8000 with the demo account seeded, the frontend image (built
# by qa_frontend.sh) on :3000, then drives headless Chrome through login and every main
# page, reporting console errors, page errors and failed requests per page.
# Usage: qa_browser.sh <frontend-label> [backend-label, default dev]
#   labels as the other scripts tag images: "dev", or "pr<N>" for a PR.
source "$(dirname "$(readlink -f "$0")")/_common.sh"
FE=ws-qa-fe:$1; BE=ws-qa-be:${2:-dev}; NET=ws-qa-e2e
for i in "$FE" "$BE"; do docker image inspect "$i" >/dev/null 2>&1 || { echo "missing image $i (run qa_frontend.sh / qa_backend.sh first)"; exit 1; }; done
cleanup() { docker rm -f ws-qa-e2e-fe ws-qa-e2e-be ws-qa-e2e-db >/dev/null 2>&1; docker network rm $NET >/dev/null 2>&1; }
trap cleanup EXIT; cleanup
docker network create $NET >/dev/null
docker run -d --name ws-qa-e2e-db --network $NET -e POSTGRES_DB=qa -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres "postgres:${PG_VERSION:-18}" >/dev/null || exit 1
for _ in $(seq 1 30); do docker exec ws-qa-e2e-db pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done; sleep 2
docker run -d --name ws-qa-e2e-be --network $NET -p 8000:8000 -e DATABASE_URL=postgres://postgres:postgres@ws-qa-e2e-db:5432/qa \
  -e SECRET_KEY=qa-secret-key-not-for-production-0123456789 -e DEBUG=1 -e ALLOWED_HOSTS=localhost,127.0.0.1 -e DJANGO_SETTINGS_MODULE=backend.settings "$BE" >/dev/null || exit 1
for _ in $(seq 1 90); do curl -s -o /dev/null http://127.0.0.1:8000/api/auth/csrf/ && break; sleep 2; done
docker exec ws-qa-e2e-be python manage.py seed_demo_account 2>&1 | grep -E 'projects, .* tasks'
docker run -d --name ws-qa-e2e-fe -p 3000:3000 "$FE" >/dev/null || exit 1
for _ in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:3000/login && break; sleep 1; done
# puppeteer-core 20.x is the newest that drives the system Chrome 114 on this machine.
P=$QA_TMP/pptr; [ -d "$P/node_modules/puppeteer-core" ] || (mkdir -p "$P" && cd "$P" && npm init -y >/dev/null && npm i -s puppeteer-core@20.5.0 >/dev/null 2>&1)
CH=$(mktemp -d); google-chrome --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --remote-debugging-port=9333 --user-data-dir="$CH" >/dev/null 2>&1 &
CPID=$!; for _ in $(seq 1 20); do curl -s http://127.0.0.1:9333/json/version >/dev/null && break; sleep 0.5; done
WS=$(curl -s http://127.0.0.1:9333/json/version | python3 -c "import json,sys; print(json.load(sys.stdin)['webSocketDebuggerUrl'])")
cat > "$P/run.js" <<'JS'
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserWSEndpoint: process.argv[2] });
  const page = await browser.newPage();
  let bucket = [];
  page.on('console', m => { if (m.type() === 'error') bucket.push('console: ' + m.text().slice(0, 160)); });
  page.on('pageerror', e => bucket.push('pageerror: ' + String(e.message || e).slice(0, 160)));
  // ERR_ABORTED is an in-flight fetch cancelled by navigating away, not a failure.
  page.on('requestfailed', r => { const e = (r.failure() || {}).errorText; if (e !== 'net::ERR_ABORTED') bucket.push('requestfailed: ' + r.url().slice(0, 100) + ' ' + e); });
  page.on('response', r => { if (r.status() >= 500) bucket.push(`http ${r.status()}: ${r.url().slice(0, 100)}`); });
  const report = (name, extra = '') => { console.log(`${bucket.length ? 'ISSUES' : 'ok    '} ${name}${extra}`); bucket.forEach(b => console.log('       ' + b)); bucket = []; };
  const B = 'http://localhost:3000';
  await page.goto(B + '/login', { waitUntil: 'networkidle2' });
  bucket = [];  // the pre-login 401 from the session probe is expected
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.type('input[name="email"]', 'demo@worksmarter.test');
  await page.type('input[name="password"]', 'demo-pass-1234');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}), page.keyboard.press('Enter')]);
  await new Promise(r => setTimeout(r, 1500));
  report('login', ` -> ${new URL(page.url()).pathname}`);
  for (const p of ['/dashboard', '/tasks', '/tasks/timeline', '/tasks/tracker', '/tasks/create', '/projects', '/projects/create', '/notes', '/resume', '/settings', '/import']) {
    // Some pages poll, so networkidle may never come; a timeout is noted, not fatal.
    await page.goto(B + p, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => bucket.push('note: no network idle within 20s'));
    await new Promise(r => setTimeout(r, 1000));
    const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
    report(p, ` (${new URL(page.url()).pathname}, ${text.length} chars) ${text.slice(0, 110)}`);
  }
  await page.close(); await browser.disconnect();
})().catch(e => { console.log('DRIVER ERROR', e.message); process.exit(1); });
JS
(cd "$P" && node run.js "$WS"); RC=$?
kill $CPID 2>/dev/null; wait $CPID 2>/dev/null; rm -rf "$CH" 2>/dev/null
exit $RC
