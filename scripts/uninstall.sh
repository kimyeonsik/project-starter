#!/usr/bin/env bash
# project-starter uninstaller
# Removes managed files but keeps backups created during install (unless PURGE_BACKUPS=1).
#
# Scopes (same semantics as install.sh):
#   project (default) — operates on $PROJECT_ROOT/.claude/ and $PROJECT_ROOT/CLAUDE.md
#   global            — operates on ~/.claude/ and ~/.agents/skills/
#
# Env vars:
#   SCOPE           "project" or "global"; prompts if unset
#   PROJECT_ROOT    For SCOPE=project, the directory to uninstall from (default: $PWD)
#   PURGE_BACKUPS   Set "1" to also delete timestamped *.backup-* files

set -euo pipefail

color() { printf '\033[%sm%s\033[0m' "$1" "$2"; }
info()  { echo "$(color '1;34' '▸') $*"; }
ok()    { echo "$(color '1;32' '✓') $*"; }
warn()  { echo "$(color '1;33' '!') $*"; }
err()   { echo "$(color '1;31' '✗') $*" >&2; }

confirm() {
  read -r -p "$1 [y/N]: " ans
  ans_lower="$(printf '%s' "$ans" | tr '[:upper:]' '[:lower:]')"
  [[ "$ans_lower" == "y" || "$ans_lower" == "yes" ]]
}

# ---------- Scope ----------
SCOPE="${SCOPE:-}"
if [[ -z "$SCOPE" ]]; then
  echo "Uninstall scope:"
  echo "  1) Project (default) — remove from current directory"
  echo "  2) Global            — remove from ~/.claude and ~/.agents"
  read -r -p "Choice [1]: " choice
  case "${choice:-1}" in
    1) SCOPE="project" ;;
    2) SCOPE="global" ;;
    *) SCOPE="project" ;;
  esac
fi

case "$SCOPE" in
  project|global) ;;
  *) err "Invalid SCOPE: $SCOPE (must be 'project' or 'global')"; exit 1 ;;
esac

if [[ "$SCOPE" == "global" ]]; then
  CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
  RULES_DIR="$CLAUDE_DIR/rules"
  SKILLS_DIR="${AGENTS_DIR:-$HOME/.agents}/skills"
  CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
else
  PROJECT_ROOT="${PROJECT_ROOT:-$PWD}"
  CLAUDE_DIR="$PROJECT_ROOT/.claude"
  RULES_DIR="$CLAUDE_DIR/rules"
  SKILLS_DIR="$CLAUDE_DIR/skills"
  CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"
fi

info "Scope: $SCOPE"
info "Will remove from:"
echo "    Rules:     $RULES_DIR"
echo "    Skills:    $SKILLS_DIR/new-project-bootstrap"
echo "    CLAUDE.md managed block: $CLAUDE_MD"
if [[ "${PURGE_BACKUPS:-0}" == "1" ]]; then
  echo "    Backups:   ALL *.backup-* under the above paths"
fi
echo ""
confirm "Proceed?" || { echo "Cancelled."; exit 0; }

# ---------- Remove rules ----------
for f in language.md agent-teams.md skill-activation.md; do
  [[ -f "$RULES_DIR/$f" ]] && rm "$RULES_DIR/$f" && ok "Removed $RULES_DIR/$f"
done
if [[ -d "$RULES_DIR/stacks" ]]; then
  rm -rf "$RULES_DIR/stacks"
  ok "Removed $RULES_DIR/stacks/"
fi
[[ -d "$RULES_DIR" ]] && [[ -z "$(ls -A "$RULES_DIR")" ]] && rmdir "$RULES_DIR"

# ---------- Remove skill ----------
for skill_name in new-project-bootstrap; do
  if [[ -d "$SKILLS_DIR/$skill_name" ]]; then
    rm -rf "$SKILLS_DIR/$skill_name"
    ok "Removed skill: $skill_name"
  fi
done

# ---------- Strip managed block from CLAUDE.md ----------
if [[ -f "$CLAUDE_MD" ]] && grep -q "BEGIN project-starter" "$CLAUDE_MD"; then
  awk '
    /<!-- BEGIN project-starter -->/ { skip=1; next }
    /<!-- END project-starter -->/   { skip=0; next }
    !skip { print }
  ' "$CLAUDE_MD" > "${CLAUDE_MD}.tmp" && mv "${CLAUDE_MD}.tmp" "$CLAUDE_MD"
  ok "Stripped managed block(s) from $CLAUDE_MD"

  # If project-scope file is now whitespace-only, remove it
  if [[ "$SCOPE" == "project" ]] && [[ -z "$(grep -v '^[[:space:]]*$' "$CLAUDE_MD" 2>/dev/null)" ]]; then
    rm "$CLAUDE_MD"
    ok "Removed empty $CLAUDE_MD"
  fi
fi

# ---------- Project scope: clean up empty .claude dir ----------
if [[ "$SCOPE" == "project" ]] && [[ -d "$CLAUDE_DIR" ]] && [[ -z "$(ls -A "$CLAUDE_DIR" 2>/dev/null)" ]]; then
  rmdir "$CLAUDE_DIR"
  ok "Removed empty $CLAUDE_DIR"
fi

# ---------- Optional: purge timestamped backups ----------
PURGE_BACKUPS="${PURGE_BACKUPS:-0}"
if [[ "$PURGE_BACKUPS" == "1" ]]; then
  info "Purging timestamped backups (*.backup-*)..."
  BACKUP_PARENTS=(
    "$CLAUDE_DIR"
    "$RULES_DIR"
    "$RULES_DIR/stacks"
    "$SKILLS_DIR"
  )
  if [[ "$SCOPE" == "project" ]]; then
    BACKUP_PARENTS+=("$PROJECT_ROOT")
  fi
  for parent in "${BACKUP_PARENTS[@]}"; do
    [[ -d "$parent" ]] || continue
    for bak in "$parent"/*.backup-*; do
      [[ -e "$bak" ]] || continue
      rm -rf "$bak"
      ok "Purged: $bak"
    done
  done
else
  warn "Backups preserved. To also delete them: PURGE_BACKUPS=1 SCOPE=$SCOPE bash scripts/uninstall.sh"
fi

ok "Uninstall complete (scope: $SCOPE)"
