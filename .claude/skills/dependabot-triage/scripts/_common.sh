# Shared setup for the dependabot-triage scripts. Source this, do not run it.
set -uo pipefail
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
SLUG=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
# Scratch space for worktrees, build logs and cookie jars. Override with WS_QA_TMP.
QA_TMP=${WS_QA_TMP:-${TMPDIR:-/tmp}/ws-dependabot-qa}
mkdir -p "$QA_TMP"

# resolve_target <pr-number|branch> -> sets SHA and LABEL. A branch name (e.g. dev) gives a baseline.
resolve_target() {
  if [[ "$1" =~ ^[0-9]+$ ]]; then git fetch origin --quiet "pull/$1/head"; LABEL="pr$1"; else git fetch origin --quiet "$1"; LABEL=$(echo "$1" | tr '/' '-'); fi
  SHA=$(git rev-parse FETCH_HEAD)
}
