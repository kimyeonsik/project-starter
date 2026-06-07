#!/usr/bin/env bash
# project-starter updater — thin shim.
#
# The real updater is scripts/update.mjs (cross-platform Node, single source of
# truth). This shim lets `bash scripts/update.sh` work on macOS / Linux / WSL /
# Git Bash. On native Windows (PowerShell / cmd) run `node scripts/update.mjs`.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "✗ node is required but not found in PATH. See docs/prereq.md." >&2
  exit 1
fi

exec node "$DIR/update.mjs" "$@"
