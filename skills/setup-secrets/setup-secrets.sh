#!/usr/bin/env bash
# project-starter secret setup — thin shim.
#
# The real script is setup-secrets.mjs (cross-platform Node, single source of
# truth). This shim keeps `bash setup-secrets.sh` working on macOS / Linux /
# WSL / Git Bash. On native Windows run `node setup-secrets.mjs` directly.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "✗ node is required but not found in PATH. See docs/prereq.md." >&2
  exit 1
fi

exec node "$DIR/setup-secrets.mjs" "$@"
