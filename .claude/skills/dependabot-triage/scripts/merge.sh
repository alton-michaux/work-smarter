#!/usr/bin/env bash
# Post a QA note and squash-merge a PR, pinned to the exact commit that was QA'd.
# Refuses unless GitHub reports the PR as CLEAN (checks green, level with base).
# Usage: merge.sh <pr-number> <full-head-sha> <qa-note-file> [squash|rebase]
#   squash (default) for a lone Dependabot commit; rebase keeps approved follow-up
#   commits (paired bumps, config changes) as separate commits on dev.
source "$(dirname "$(readlink -f "$0")")/_common.sh"
PR=$1; SHA=$2; NOTE=$3; METHOD=${4:-squash}
[[ "$METHOD" =~ ^(squash|rebase)$ ]] || { echo "method must be squash or rebase"; exit 1; }
STATE=$(gh pr view "$PR" --json mergeStateStatus --jq .mergeStateStatus)
[ "$STATE" = CLEAN ] || { echo "PR #$PR is $STATE, not CLEAN; not merging"; exit 1; }
[ "$(gh pr view "$PR" --json headRefOid --jq .headRefOid)" = "$SHA" ] || { echo "head moved since QA; not merging"; exit 1; }
gh pr comment "$PR" --body-file "$NOTE" >/dev/null || { echo "could not post the QA note; not merging"; exit 1; }
gh pr merge "$PR" "--$METHOD" --match-head-commit "$SHA" || exit 1
sleep 3
gh pr view "$PR" --json number,state,mergeCommit --jq '"#\(.number) \(.state) \(.mergeCommit.oid[0:7])"'
