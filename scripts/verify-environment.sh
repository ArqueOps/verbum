#!/usr/bin/env bash
# Verify Verbum project environment is ready for orchestrator task execution.
# Run this AFTER applying fix-verbum-project-path.sql to confirm everything works.

set -euo pipefail

PASS=0
FAIL=0
BASE_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"

check() {
  local desc="$1"
  local result="$2"
  if [ "$result" = "0" ]; then
    echo "  PASS: ${desc}"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: ${desc}"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Verbum Environment Verification ==="
echo ""

echo "[1/5] Base repository directory"
test -d "${BASE_PATH}"; check "Directory exists at ${BASE_PATH}" $?
test -d "${BASE_PATH}/.git"; check ".git directory present" $?

echo ""
echo "[2/5] Git remote access"
git -C "${BASE_PATH}" ls-remote origin HEAD >/dev/null 2>&1; check "Can reach origin (git@github.com:ArqueOps/verbum.git)" $?

echo ""
echo "[3/5] Worktree directory"
test -d "${BASE_PATH}/.worktrees"; check ".worktrees directory exists" $?

echo ""
echo "[4/5] Worktree creation test"
TEST_WT="${BASE_PATH}/.worktrees/__env-verify-test__"
git -C "${BASE_PATH}" worktree add "${TEST_WT}" -b __env-verify-test__ origin/main --no-track >/dev/null 2>&1
check "Can create worktree" $?
if [ -d "${TEST_WT}" ]; then
  git -C "${BASE_PATH}" worktree remove "${TEST_WT}" --force >/dev/null 2>&1
  git -C "${BASE_PATH}" branch -D __env-verify-test__ >/dev/null 2>&1 || true
  check "Worktree cleanup succeeded" 0
fi

echo ""
echo "[5/5] GitHub API access"
if [ -n "${CRED_GITHUB_ACCESS_TOKEN:-}" ]; then
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: token ${CRED_GITHUB_ACCESS_TOKEN}" \
    "https://api.github.com/repos/ArqueOps/verbum")
  [ "$HTTP" = "200" ]; check "GitHub API returns 200 for ArqueOps/verbum" $?
else
  echo "  SKIP: CRED_GITHUB_ACCESS_TOKEN not set"
fi

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
[ "$FAIL" -eq 0 ] && echo "Environment is READY." || echo "Environment has issues — see failures above."
exit "$FAIL"
