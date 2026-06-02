#!/usr/bin/env bash
# project-starter uninstaller — thin shim.
#
# The real uninstaller is scripts/uninstall.mjs (cross-platform Node, single
# source of truth). This shim keeps `bash scripts/uninstall.sh` working on
# macOS / Linux / WSL / Git Bash. On native Windows run
# `node scripts/uninstall.mjs` directly.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "✗ node is required but not found in PATH. See docs/prereq.md." >&2
  exit 1
fi

exec node "$DIR/uninstall.mjs" "$@"
