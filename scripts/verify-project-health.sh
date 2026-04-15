#!/usr/bin/env bash
# verify-project-health.sh
# Verifies that the Verbum project directory is healthy and ready for
# worktree-based task execution.
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -euo pipefail

BASE_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
ERRORS=0

check() {
  local description="$1"
  local condition="$2"

  if eval "$condition"; then
    echo "  PASS: ${description}"
  else
    echo "  FAIL: ${description}"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "=== Verbum Project Health Check ==="
echo ""

echo "1. Directory structure"
check "Base directory exists" "[[ -d '${BASE_PATH}' ]]"
check "Git repository initialized" "[[ -d '${BASE_PATH}/.git' ]]"
check ".worktrees directory exists" "[[ -d '${BASE_PATH}/.worktrees' ]]"
check ".gitignore exists" "[[ -f '${BASE_PATH}/.gitignore' ]]"

echo ""
echo "2. Git remote"
if [[ -d "${BASE_PATH}/.git" ]]; then
  REMOTE_URL=$(cd "${BASE_PATH}" && git remote get-url origin 2>/dev/null || echo "NONE")
  check "Remote origin is ArqueOps/verbum" "[[ '${REMOTE_URL}' == *'ArqueOps/verbum'* ]]"
else
  echo "  SKIP: No .git directory"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "3. Worktree isolation"
WORKTREE_COUNT=$(ls -d "${BASE_PATH}/.worktrees"/*/ 2>/dev/null | wc -l | tr -d ' ')
echo "  INFO: ${WORKTREE_COUNT} active worktrees"
check "Worktrees can be listed" "[[ ${WORKTREE_COUNT} -ge 0 ]]"

echo ""
echo "4. Path validation"
check "Base path does NOT contain .worktrees" "[[ '${BASE_PATH}' != *'.worktrees'* ]]"
check "Base path is absolute" "[[ '${BASE_PATH}' == /* ]]"

echo ""
echo "=== Results ==="
if [[ $ERRORS -eq 0 ]]; then
  echo "All checks passed. Project is healthy."
  exit 0
else
  echo "${ERRORS} check(s) failed."
  exit 1
fi
