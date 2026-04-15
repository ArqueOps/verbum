#!/usr/bin/env bash
# Verify Verbum repository health and readiness for worktree operations
set -euo pipefail

BASE_REPO="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CHECKS_PASSED=0
CHECKS_TOTAL=5

echo "=== Verbum Repository Health Check ==="
echo ""

# 1. Base repo exists
if [[ -d "$BASE_REPO/.git" ]]; then
  echo "[PASS] Base repo exists at $BASE_REPO"
  ((CHECKS_PASSED++))
else
  echo "[FAIL] Base repo NOT found at $BASE_REPO"
fi

# 2. Git remote is correct
REMOTE=$(git -C "$BASE_REPO" remote get-url origin 2>/dev/null || echo "NONE")
if [[ "$REMOTE" == "git@github.com:ArqueOps/verbum.git" ]] || [[ "$REMOTE" == "https://github.com/ArqueOps/verbum.git" ]]; then
  echo "[PASS] Remote origin: $REMOTE"
  ((CHECKS_PASSED++))
else
  echo "[FAIL] Unexpected remote: $REMOTE"
fi

# 3. .worktrees directory exists
if [[ -d "$BASE_REPO/.worktrees" ]]; then
  WORKTREE_COUNT=$(ls -d "$BASE_REPO/.worktrees"/*/ 2>/dev/null | wc -l | tr -d ' ')
  echo "[PASS] .worktrees/ exists ($WORKTREE_COUNT active worktrees)"
  ((CHECKS_PASSED++))
else
  echo "[WARN] .worktrees/ does not exist (will be created on first use)"
  ((CHECKS_PASSED++))
fi

# 4. Main branch exists
if git -C "$BASE_REPO" rev-parse --verify main &>/dev/null; then
  COMMIT=$(git -C "$BASE_REPO" rev-parse --short main)
  echo "[PASS] main branch exists (HEAD: $COMMIT)"
  ((CHECKS_PASSED++))
else
  echo "[FAIL] main branch not found"
fi

# 5. Can create worktree (dry run)
TEST_BRANCH="__health-check-test-$$"
if git -C "$BASE_REPO" worktree add --detach "$BASE_REPO/.worktrees/$TEST_BRANCH" HEAD &>/dev/null; then
  git -C "$BASE_REPO" worktree remove "$BASE_REPO/.worktrees/$TEST_BRANCH" &>/dev/null
  echo "[PASS] Worktree creation works"
  ((CHECKS_PASSED++))
else
  echo "[FAIL] Cannot create worktrees"
fi

echo ""
echo "Result: $CHECKS_PASSED/$CHECKS_TOTAL checks passed"

if [[ "$CHECKS_PASSED" -eq "$CHECKS_TOTAL" ]]; then
  echo "STATUS: HEALTHY — ready for task execution"
  exit 0
else
  echo "STATUS: UNHEALTHY — fix issues above before proceeding"
  exit 1
fi
