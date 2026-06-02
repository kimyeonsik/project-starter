#!/usr/bin/env bash
# project-starter installer — thin shim.
#
# The real installer is scripts/install.mjs (cross-platform Node, single source
# of truth). This shim exists so existing docs / muscle memory that run
# `bash scripts/install.sh` keep working on macOS / Linux / WSL / Git Bash.
# On native Windows (PowerShell / cmd) run `node scripts/install.mjs` directly.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "✗ node is required but not found in PATH. See docs/prereq.md." >&2
  exit 1
fi

exec node "$DIR/install.mjs" "$@"
