#!/usr/bin/env bash
# Bring a Dependabot PR level with its base branch and wait for its checks.
#   - branch has only Dependabot commits and no conflict -> "@dependabot rebase"
#   - branch carries a human commit (Dependabot refuses to rebase those) -> update-branch
#   - branch conflicts with base and carries a human commit -> "@dependabot recreate"
# Usage: sync.sh <pr-number>
source "$(dirname "$(readlink -f "$0")")/_common.sh"
PR=$1
field() { gh pr view "$PR" --json "$1" --jq ".$1"; }
behind() { gh api "repos/$SLUG/compare/$(field baseRefName)...$(field headRefOid)" --jq .behind_by; }
last_comment() { gh pr view "$PR" --json comments --jq '.comments[-1] | "\(.author.login): \(.body[0:300])"'; }
[ "$(field state)" = OPEN ] || { echo "PR #$PR is $(field state)"; exit 2; }
OLD=$(field headRefOid)
if [ "$(behind)" != 0 ]; then
  HUMAN=$(gh pr view "$PR" --json commits --jq '[.commits[] | select((.authors[0].login // "") != "dependabot[bot]")] | length')
  CONFLICT=$(field mergeable)
  if [ "$HUMAN" = 0 ]; then ACTION="@dependabot rebase"
  elif [ "$CONFLICT" = CONFLICTING ]; then ACTION="@dependabot recreate"
  else ACTION=update-branch; fi
  echo "was ${OLD:0:7}; action: $ACTION"
  if [ "$ACTION" = update-branch ]; then gh pr update-branch "$PR" >/dev/null; else gh pr comment "$PR" --body "$ACTION" >/dev/null; fi
  for _ in $(seq 1 ${SYNC_POLLS:-40}); do
    sleep 15
    [ "$(field state)" = OPEN ] || { echo "PR #$PR became $(field state) (Dependabot closes PRs that are no longer needed)"; last_comment; exit 2; }
    [ "$(field headRefOid)" != "$OLD" ] && [ "$(behind)" = 0 ] && break
  done
fi
[ "$(behind)" = 0 ] || { echo "STILL BEHIND after waiting. Last comment:"; last_comment; exit 3; }
echo "head $(field headRefOid) level with $(field baseRefName); title: $(field title)"
sleep 25
gh pr checks "$PR" --watch --interval 15 >/dev/null 2>&1 || true
gh pr checks "$PR" 2>&1 | cut -f1,2,3
"$(dirname "$(readlink -f "$0")")/ci_summary.sh" "$PR"
echo "merge state: $(field mergeStateStatus)"
