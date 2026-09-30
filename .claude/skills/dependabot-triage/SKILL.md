---
name: dependabot-triage
description: Triage and merge Dependabot PRs for work-smarter - map each PR to its security alerts, comment and label it, then work a one-at-a-time merge queue with real QA (CI test counts, a live API smoke test, a production frontend build) before each squash-merge. Use when asked to triage, review, clean up or merge Dependabot or dependency-bump PRs.
---

# Dependabot triage and merge queue

Two phases: **triage** (read-only analysis, then a comment and labels on every open
Dependabot PR) and the **merge queue** (sync, QA and merge the ready PRs one at a time).
Triage needs no approval. Merging does: present the triage summary and proposed merge
order, and only start the queue once the user says so.

**Stop and ask before any code change.** If a PR can only land with an edit (a paired
version bump, a lockfile fix, a CI or config change, a code fix), do not make it: label
the PR `blocked`, explain on the PR what is needed, and raise it with the user. Commenting
`@dependabot rebase` / `@dependabot recreate` and using `gh pr update-branch` are not code
changes. Never close a PR, retarget its base, or force-merge without the user's say-so.

Helper scripts live in `scripts/` next to this file. Run them from anywhere in the repo.
Worktrees, build logs and cookie jars go to `$WS_QA_TMP` (default `/tmp/ws-dependabot-qa`).
Each script cleans up its own containers and worktree on exit.

## Prerequisites

- `gh` authenticated with `repo` scope (`gh auth status`). On this Ubuntu 20.04 WSL box apt
  has no `gh` package; it was installed from the release tarball into `~/.local/bin`.
- Docker running for QA (`docker version`). Docker Desktop's WSL integration drops after
  reboots; if `docker` is missing, start it with
  `(cd /mnt/c && nohup "/mnt/c/Program Files/Docker/Docker/Docker Desktop.exe" >/dev/null 2>&1 &)`
  and poll `docker version` for a minute or two.

## Phase 1: triage

1. Inventory:
   - `gh pr list --author "app/dependabot" --state open --json number,title,baseRefName,labels,mergeStateStatus,statusCheckRollup`
   - open alerts: `gh api "repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100"`
     (severity, package, manifest, first patched version, GHSA id)
   - for each PR: `gh pr diff`, commits (who authored them), how far behind the base it is,
     and the failing-check logs.
2. Check what the lockfile actually resolves, not the title. Example: a "Bump sharp and
   next" PR only widened Next's optional `sharp` range and left `node_modules/sharp` on the
   vulnerable version. `qa_frontend.sh` prints the resolved versions.
3. Classify every red check as caused by the change or not. Seen so far:
   - apt `Release file ... is expired` or other Docker build errors on a frontend-only PR:
     infrastructure, so a rebase re-runs CI.
   - pip `ResolutionImpossible`: a pinned sibling caps the version (e.g. `pyOpenSSL` caps
     `cryptography`). Needs a paired bump, which is a code change, so the PR is blocked.
     The same goes for `requests` 2.33+ and the old `certifi==2019.11.28` pin (fixed 2026-09-30).
     `requirements.txt` is an old full `pip freeze`, so expect more stale pins like these.
   - `PostgreSQL 14 or later is required (found 13.x)`: Django 5.x. CI (`.github/workflows/ci.yaml`)
     and `docker-compose.yml` pin `postgres:13`. Blocked.
   - Vercel deploy failure: investigate with `npx vercel inspect <deployment> --logs`.
     Preview URLs sit behind Vercel SSO and cannot be smoke-tested with curl.
4. Label with the triage labels (already created in the repo): `security` (fixes an open
   alert), `critical` (fixes a critical advisory; merge first), `ready to merge`, `blocked`,
   `major upgrade`, `superseded` (another open PR covers it). Leave `render-preview` alone.
5. Comment on every PR, headed `**Triage: <verdict>.**`, then bullets for: what changes (with
   versions), which advisories it fixes (GHSA ids and severity), why checks are red if
   they are, what blocks it and the concrete fix, and overlaps with other PRs. Count
   advisories from the alerts API, not from the PR body.
6. Report back with a table (PR, change, verdict) and a proposed merge order:
   critical first, then high-severity, then medium or low, then superseded. A PR that must
   land before a blocked one goes first (e.g. DRF before Django 5.2).

## Phase 2: merge queue (one PR at a time)

The `dev` rulesets require the `backend-tests` check, a branch that is **up to date** with
`dev`, and **linear history**. So each merge makes every other PR stale again. Sync, QA and
merge one PR, then move to the next. Squash-merge single-commit bumps. When a PR also
carries approved follow-up commits, rebase-merge it (`merge.sh ... rebase`) so each
logical change stays its own commit on `dev`, matching the user's commit-style preference.

For each PR:

1. **Sync.** Run `scripts/sync.sh <pr>`. It picks the right mechanism:
   - only Dependabot commits → `@dependabot rebase`
   - a human commit on the branch (e.g. someone clicked "Update branch") → Dependabot
     refuses to rebase ("edited by someone other than Dependabot"), so it uses
     `gh pr update-branch`
   - a human commit plus a conflict with `dev` → `@dependabot recreate`

   Sync before QA, so QA runs on the commit that will be merged. If a QA run happened
   before a rebase, confirm what the rebase changed:
   `git diff <qa-sha> <new-sha> -- frontend` (or `backend`). If the only changes are
   other PRs already merged to `dev`, the QA still holds; say so in the note. Otherwise
   QA again.

   The script then waits for checks and prints the pytest summary. Rebases and recreates
   often move the target to a newer version (15.5.25 became 15.5.26, 4.28.8 became 4.29.3).
   QA whatever the branch now contains and say so in the QA note. Dependabot may also
   close a PR whose alert got fixed by another merge. That is expected; note it and move on.
2. **Baseline.** Get the `dev` numbers once per session and again after `dev` changes
   through something other than your own merges:
   - `scripts/ci_summary.sh dev` gives the test count (320 passed, 298 warnings as of 2026-09-30)
   - `scripts/qa_backend.sh dev > dev.out` gives the API smoke baseline
3. **QA.** Pick the checks by what the PR touches:
   - **Every PR:** the diff contains only the intended bump, and `scripts/ci_summary.sh <pr>`
     shows the same passed count as `dev`, no failures, and `No changes detected`.
   - **Backend (`backend/requirements.txt`):** `scripts/qa_backend.sh <pr> <packages> > pr.out`,
     then `diff` it against the `dev` output, ignoring the first line and the version lines.
     Any new non-2xx, new exception or `pip check` complaint blocks the merge. Most
     important for anything in the request path: Django, DRF, simplejwt/PyJWT, allauth,
     dj-rest-auth, cryptography. Add endpoints the package touches with
     `QA_EXTRA_GETS="/calendar/oauth/init/"` (OAuth and Google libraries), and use the same
     value for the baseline run so the outputs line up.
   - **`cryptography` (or anything under `api/services/note_encryption.py`):** after
     `qa_backend.sh` has built both images, run `scripts/qa_notes_crypto.sh <pr>`. It seeds
     encrypted notes with the `dev` image and decrypts them with the PR image, then the
     reverse, so a merge can't strand notes that are already stored and a rollback stays safe.
   - **`certifi`, `requests`, `urllib3`:** after `qa_backend.sh`, run `scripts/qa_tls.sh dev` and
     `scripts/qa_tls.sh <pr>`. They fetch the external services the app calls (Google,
     S3, Groq/OpenAI, LinkedIn) from inside each image; TLS must verify on the PR wherever it
     verifies on `dev`.
   - **Framework-level frontend changes (Next, React):** also run
     `scripts/qa_browser.sh dev` and `scripts/qa_browser.sh pr<N>` after both images are built.
     It logs in as the demo user through headless Chrome against a live backend and walks
     every main page. The two outputs must be identical.
   - **Frontend (`frontend/package*.json`):** `scripts/qa_frontend.sh <pr>`. It builds the
     production image (`npm ci` + `next build`, so it also proves the lockfile is in sync)
     and smoke-tests every top-level page with `next start`. CI has no frontend job, so
     this is the only build check besides Vercel.

   Image builds take 5–8 minutes, mostly `pip install`. Run QA scripts with
   `run_in_background` and a long timeout rather than in the foreground. A failed build
   is retried once automatically, because pip and npm downloads fail transiently here.
4. **Merge.** Write a short QA note (head sha, what was verified, any version drift, any
   pre-existing issue observed), then run `scripts/merge.sh <pr> <full-sha> <note-file>`.
   It refuses unless the PR is `CLEAN` and still at the QA'd sha, and it won't merge if the
   QA note fails to post (the GitHub API throws occasional GraphQL errors). It then
   squash-merges pinned to that commit.
5. After each merge, re-list open Dependabot PRs. Merges trigger fresh Dependabot runs
   that open new PRs, retitle existing ones, or close them as "Superseded by #N". Triage
   newcomers the same way before queueing them. If an open PR's change is already on
   `dev` (another PR brought the same version), comment `@dependabot rebase` so
   Dependabot notices and closes it. Don't close it yourself.
6. **Approved code changes** (e.g. a paired pin bump) go as a separate commit on the
   Dependabot branch, with the commit attribution line. Dependabot stops managing the
   branch after that, so later syncs use `update-branch`. git has no credential helper
   here; push with
   `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin <sha>:refs/heads/<branch>`.
   Pushing a change to `.github/workflows/*` also needs the `workflow` token scope. If the
   push is rejected with "without `workflow` scope", have the user run
   `! gh auth refresh -h github.com -s workflow` (the `-h` is required outside a TTY).
   Then run the full QA as for any other PR, and remove the `blocked` label once it merges.
   For a Postgres or Django major version, run `qa_backend.sh` with `PG_VERSION=<n>` for both
   `dev` and the PR, so the only difference in the diff is the change under test.
7. When only blocked PRs remain, confirm the `dev` push CI is green on the last merge
   (`scripts/ci_summary.sh dev`). Then stop and report: what merged, what is blocked and the
   change each one needs, and any pre-existing problems QA turned up. Wait for approval
   before touching the blocked ones.

## Known pre-existing issues (not caused by dependency bumps)

- `GET /api/recurring-tasks/`, `/api/work-experiences/`, `/api/educations/` and
  `/api/skills/` return 500 (`FieldError: Cannot resolve keyword 'created'`). CursorPagination
  falls back to `-created` on viewsets without an `ordering`. This shows up in every
  smoke baseline until it is fixed. Only a *new* failure counts against a PR.
- `manage.py check` warns `account.W001` (allauth settings).
- `axios` is listed in `frontend/package.json` but nothing imports it; the app uses
  `fetch`. Its bumps are safe, and removing it would stop its alerts (a code change, so
  ask first).

## Tooling gotchas

- `gh run list --branch <b>` returns stale runs on this repo. Filter the unfiltered
  list instead (`ci_summary.sh` does).
- `gh run view --log` mis-attributes steps and can drop the pytest step entirely. Read the
  raw job log with `gh api repos/{owner}/{repo}/actions/jobs/<id>/logs --allow-escape-sequences`.
- Logs of runs older than about 90 days are gone (HTTP 410).
- Docker Desktop can drop out mid-session (`docker` disappears, or SIGBUS from the CLI).
  Restart it as in Prerequisites and re-run the interrupted script; they are idempotent.
- The backend smoke log sometimes shows one `BrokenPipeError` from the readiness poll.
  `qa_backend.sh` filters it out; it is not a regression.
- A PR opened against a branch other than `dev` fixes nothing on `dev`. Retarget it only
  with approval, after checking `git log origin/dev..<pr-head>` shows just the bump commit.
- pip `No matching distribution found ... (from versions: none)` for a package that exists
  on PyPI is a network blip during the local build, not a real conflict.
- Transitive npm fixes Dependabot won't open a PR for: refresh the lockfile with
  `npm update <pkgs> --package-lock-only --ignore-scripts` in a `node:24` container (npm 11),
  mounted as your own uid. npm 10 (`node:18`) strips the lockfile's `libc` fields. Check the
  new versions' `engines`: sharp >= 0.35 and Next 16 need Node >= 20.9. The frontend runs on
  Node 22 since 2026-09-30.
- For a frontend package with a runtime part, pass `QA_NODE_CHECK="<js>"` to
  `qa_frontend.sh` to exercise it inside the production container (e.g. load sharp and
  render a PNG).
- When Dependabot's own PR can't build (e.g. #222, Next 16), fix it on a fresh branch from
  `dev` and open a replacement PR. Don't force-push over Dependabot's branch. Comment on
  the original that it is superseded; after the merge, `@dependabot rebase` makes Dependabot
  close it.
- `git stash` is shared by every worktree of the repo, and the user keeps many stashes.
  Commit in QA worktrees instead of stashing. If you must stash, only ever pop or drop the
  entry you just created.
- Dependabot comment commands must be the whole comment body. Post the triage text as a
  separate comment.
