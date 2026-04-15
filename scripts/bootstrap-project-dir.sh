#!/usr/bin/env bash
# bootstrap-project-dir.sh
# Ensures the Verbum project working directory exists on disk.
# Idempotent — safe to run multiple times.
#
# Usage: ./scripts/bootstrap-project-dir.sh

set -euo pipefail

PROJECT_DIR="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
WORKTREES_DIR="${PROJECT_DIR}/.worktrees"

# Ensure base project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
  echo "Creating project directory: $PROJECT_DIR"
  mkdir -p "$PROJECT_DIR"
else
  echo "Project directory already exists: $PROJECT_DIR"
fi

# Ensure .worktrees directory exists (used by orchestrator for git worktree isolation)
if [ ! -d "$WORKTREES_DIR" ]; then
  echo "Creating worktrees directory: $WORKTREES_DIR"
  mkdir -p "$WORKTREES_DIR"
else
  echo "Worktrees directory already exists: $WORKTREES_DIR"
fi

echo "Bootstrap complete."
