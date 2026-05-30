#!/usr/bin/env bash
# claude-dev-infra uninstaller
# Removes managed files but keeps backups created during install.

set -euo pipefail

CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
AGENTS_DIR="${AGENTS_DIR:-$HOME/.agents}"
RULES_DIR="$CLAUDE_DIR/rules"
SKILLS_DIR="$AGENTS_DIR/skills"

color() { printf '\033[%sm%s\033[0m' "$1" "$2"; }
info()  { echo "$(color '1;34' '▸') $*"; }
ok()    { echo "$(color '1;32' '✓') $*"; }
warn()  { echo "$(color '1;33' '!') $*"; }

confirm() {
  read -r -p "$1 [y/N]: " ans
  ans_lower="$(printf '%s' "$ans" | tr '[:upper:]' '[:lower:]')"
  [[ "$ans_lower" == "y" || "$ans_lower" == "yes" ]]
}

info "This will remove rules and skills installed by claude-dev-infra."
info "Backups (*.backup-*) will be preserved for manual recovery."
confirm "Proceed?" || { echo "Cancelled."; exit 0; }

# Remove rules
for f in language.md agent-teams.md skill-activation.md; do
  [[ -f "$RULES_DIR/$f" ]] && rm "$RULES_DIR/$f" && ok "Removed $RULES_DIR/$f"
done
if [[ -d "$RULES_DIR/stacks" ]]; then
  rm -rf "$RULES_DIR/stacks"
  ok "Removed $RULES_DIR/stacks/"
fi
if [[ -d "$RULES_DIR" ]] && [[ -z "$(ls -A "$RULES_DIR")" ]]; then
  rmdir "$RULES_DIR"
fi

# Remove skills
for skill_name in new-project-bootstrap; do
  if [[ -d "$SKILLS_DIR/$skill_name" ]]; then
    rm -rf "$SKILLS_DIR/$skill_name"
    ok "Removed skill: $skill_name"
  fi
done

# Strip managed block from CLAUDE.md
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
if [[ -f "$CLAUDE_MD" ]] && grep -q "BEGIN claude-dev-infra" "$CLAUDE_MD"; then
  # macOS sed needs '' after -i; use temp file approach for portability
  awk '
    /<!-- BEGIN claude-dev-infra -->/ { skip=1; next }
    /<!-- END claude-dev-infra -->/   { skip=0; next }
    !skip { print }
  ' "$CLAUDE_MD" > "${CLAUDE_MD}.tmp" && mv "${CLAUDE_MD}.tmp" "$CLAUDE_MD"
  ok "Stripped managed block from CLAUDE.md"
fi

warn "Backups remain in place. Inspect with: ls -la $CLAUDE_DIR/*.backup-* $RULES_DIR/*.backup-* 2>/dev/null"
ok "Uninstall complete"
