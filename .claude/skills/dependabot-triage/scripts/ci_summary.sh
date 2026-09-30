#!/usr/bin/env bash
# Print the pytest summary and migration-check lines from a PR's (or branch's) backend-tests job.
# `gh run view --log` mis-attributes steps and can drop the test step, so this reads the raw job log.
# Usage: ci_summary.sh <pr-number|branch>
source "$(dirname "$(readlink -f "$0")")/_common.sh"
if [[ "$1" =~ ^[0-9]+$ ]]; then
  JOB=$(gh pr checks "$1" --json name,link --jq '.[] | select(.name=="backend-tests") | .link' | sed -E 's#.*/job/([0-9]+).*#\1#')
else
  # `gh run list --branch` returns stale runs on this repo; filter the unfiltered list instead.
  RUN=$(gh run list --limit 40 --json databaseId,event,headBranch,status --jq "[.[] | select(.event==\"push\" and .headBranch==\"$1\" and .status==\"completed\")][0].databaseId")
  JOB=$(gh api "repos/$SLUG/actions/runs/$RUN/jobs" --jq '.jobs[] | select(.name=="backend-tests") | .id')
fi
for _ in 1 2 3 4 5 6; do
  OUT=$(gh api "repos/$SLUG/actions/jobs/$JOB/logs" --allow-escape-sequences 2>/dev/null | grep -aE ' passed| failed| error|No changes detected' | grep -aE '^[0-9T:.\-]+Z (=+ |No changes)' | sed -E 's/\x1b\[[0-9;]*m//g; s/^[0-9T:.\-]+Z ?//' | tail -3)
  [ -n "$OUT" ] && break; sleep 15
done
echo "backend-tests job $JOB: ${OUT:-NO PYTEST SUMMARY FOUND}"
