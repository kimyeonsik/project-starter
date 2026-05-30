#!/usr/bin/env bash
# project-starter remote bootstrap
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
#
# Env vars:
#   TARGET       Install location (default: $HOME/projects/project-starter)
#   BRANCH       Git branch to clone (default: main)
#   LANG_CHOICE  Pre-select language ("en" or "ko"); skips installer prompt
#   SKIP_PREREQ  Set "1" to bypass prerequisite checks
#
# Notes:
# - Requires git. For private repos, also requires gh CLI with auth.
# - If TARGET already exists, the script does git pull --ff-only instead of clone.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/kimyeonsik/project-starter.git}"
TARGET="${TARGET:-$HOME/projects/project-starter}"
BRANCH="${BRANCH:-main}"

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
    # Private repo fallback: try gh
    if command -v gh >/dev/null 2>&1; then
      info "Direct clone failed; retrying via gh (private repo support)..."
      gh repo clone "${REPO_URL#https://github.com/}" "$TARGET" -- --branch "$BRANCH" --quiet
    else
      err "Clone failed. If this is a private repo, install gh CLI and run 'gh auth login' first."
      exit 1
    fi
  fi
fi
ok "Source ready at $TARGET"

info "Running installer..."
cd "$TARGET"
bash scripts/install.sh
