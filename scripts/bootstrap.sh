#!/usr/bin/env bash
# project-starter remote bootstrap
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
#
# Env vars (passed through to install.sh):
#   TARGET       Where to clone this repo (default: $HOME/projects/project-starter)
#   BRANCH       Git branch to clone (default: main)
#   SCOPE        "project" (default) or "global" — install target scope
#   PROJECT_ROOT For SCOPE=project, the directory to install into (default: $PWD at clone time)
#   LANG_CHOICE  Pre-select language ("en" or "ko"); skips installer prompt
#   SKIP_PREREQ  Set "1" to bypass prerequisite checks
#
# Note: For project-scope installs you typically want PROJECT_ROOT to be the
# directory you ran this from — not where the repo gets cloned. Set it explicitly:
#   SCOPE=project PROJECT_ROOT="$PWD" bash <(curl -fsSL ...)

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/kimyeonsik/project-starter.git}"
TARGET="${TARGET:-$HOME/projects/project-starter}"
BRANCH="${BRANCH:-main}"

# Capture caller's working directory before we cd into the clone.
# This is the natural default for project-scoped installs.
INVOCATION_CWD="$PWD"

color() { printf '\033[%sm%s\033[0m' "$1" "$2"; }
info() { echo "$(color '1;34' '▸') $*"; }
ok()   { echo "$(color '1;32' '✓') $*"; }
err()  { echo "$(color '1;31' '✗') $*" >&2; }

if ! command -v git >/dev/null 2>&1; then
  err "git is required but not found in PATH."
  exit 1
fi

mkdir -p "$(dirname "$TARGET")"

if [[ -d "$TARGET/.git" ]]; then
  info "Existing checkout found at $TARGET; pulling latest..."
  git -C "$TARGET" fetch --quiet origin "$BRANCH"
  git -C "$TARGET" checkout --quiet "$BRANCH"
  git -C "$TARGET" pull --ff-only --quiet
else
  info "Cloning $REPO_URL → $TARGET"
  if ! git clone --quiet --branch "$BRANCH" "$REPO_URL" "$TARGET" 2>/dev/null; then
    if command -v gh >/dev/null 2>&1; then
      info "Direct clone failed; retrying via gh..."
      gh repo clone "${REPO_URL#https://github.com/}" "$TARGET" -- --branch "$BRANCH" --quiet
    else
      err "Clone failed. For private repos: install gh CLI and run 'gh auth login' first."
      exit 1
    fi
  fi
fi
ok "Source ready at $TARGET"

# Default SCOPE=project here so installer doesn't prompt twice.
# PROJECT_ROOT defaults to the caller's cwd, not the clone dir.
SCOPE="${SCOPE:-project}"
if [[ "$SCOPE" == "project" ]]; then
  export PROJECT_ROOT="${PROJECT_ROOT:-$INVOCATION_CWD}"
fi
export SCOPE

info "Running installer (scope: $SCOPE${PROJECT_ROOT:+, project root: $PROJECT_ROOT})..."
cd "$TARGET"
# The installer is cross-platform Node (scripts/install.mjs). Prefer node so the
# bash<->node boundary stays the same on macOS / Linux / WSL / Git Bash.
if command -v node >/dev/null 2>&1; then
  exec node scripts/install.mjs
else
  exec bash scripts/install.sh
fi
