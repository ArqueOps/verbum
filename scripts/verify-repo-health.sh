#!/usr/bin/env bash
# verify-repo-health.sh
# Verifies the Verbum repository is healthy and ready for task execution.

set -euo pipefail

BASE_REPO="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
PASS=0
FAIL=0

check() {
  local desc="$1"
  local result="$2"
  if [ "$result" = "true" ]; then
    echo "  PASS: ${desc}"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: ${desc}"
    FAIL=$((FAIL + 1))
  fi
}

echo "==> Verbum Repository Health Check"
echo ""

# 1. Base repo exists
check "Base repo directory exists" "$([ -d "${BASE_REPO}" ] && echo true || echo false)"

# 2. .git exists
check ".git directory exists" "$([ -d "${BASE_REPO}/.git" ] && echo true || echo false)"

# 3. Remote is correct
REMOTE=$(git -C "${BASE_REPO}" remote get-url origin 2>/dev/null || echo "NONE")
check "Remote origin is ArqueOps/verbum" "$([ "${REMOTE}" = "git@github.com:ArqueOps/verbum.git" ] && echo true || echo false)"

# 4. Default branch exists
HAS_MAIN=$(git -C "${BASE_REPO}" branch -a 2>/dev/null | grep -q "main" && echo true || echo false)
check "Branch 'main' exists" "${HAS_MAIN}"

# 5. .worktrees directory exists
check ".worktrees directory exists" "$([ -d "${BASE_REPO}/.worktrees" ] && echo true || echo false)"

# 6. Can create worktrees
check "Worktree mechanism functional" "$(git -C "${BASE_REPO}" worktree list >/dev/null 2>&1 && echo true || echo false)"

echo ""
echo "==> Results: ${PASS} passed, ${FAIL} failed"

if [ "${FAIL}" -gt 0 ]; then
  echo "==> UNHEALTHY — fix issues above before dispatching tasks"
  exit 1
else
  echo "==> HEALTHY — ready for task execution"
  exit 0
fi
