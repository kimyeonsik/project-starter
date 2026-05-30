#!/usr/bin/env bash
# project-starter uninstaller
#
# Default behavior: RESTORE files to pre-install state from the oldest backups.
# Items without backups are removed. Any manual edits made after install will
# be overwritten by the restored backup.
#
# Scopes:
#   project (default) — operates on $PROJECT_ROOT/.claude/ and $PROJECT_ROOT/CLAUDE.md
#   global            — operates on ~/.claude/ and ~/.agents/skills/
#
# Env vars:
#   SCOPE           "project" or "global"; prompts if unset
#   PROJECT_ROOT    For SCOPE=project, directory to uninstall from (default: $PWD)
#   NO_RESTORE      Set "1" to skip backup restore; only strip managed files (legacy mode)
#   PURGE_BACKUPS   Set "1" to delete *.backup-* files after processing
#                   (mutually compatible with restore: restore copies the backup,
#                    then purge removes the original backup file)

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

NO_RESTORE="${NO_RESTORE:-0}"
PURGE_BACKUPS="${PURGE_BACKUPS:-0}"

# ---------- Helper: find oldest backup for a given target ----------
# Echoes the oldest backup path or empty string.
oldest_backup() {
  local target="$1"
  local parent base candidate
  parent="$(dirname "$target")"
  base="$(basename "$target")"
  [[ -d "$parent" ]] || return 0
  # Use find to avoid zsh glob errors when no matches exist
  candidate="$(find "$parent" -maxdepth 1 -name "${base}.backup-*" -print 2>/dev/null | sort | head -1)"
  printf '%s' "$candidate"
}

# Restore or remove a single file/dir
restore_or_remove() {
  local target="$1"
  local backup
  backup="$(oldest_backup "$target")"
  if [[ "$NO_RESTORE" != "1" && -n "$backup" && -e "$backup" ]]; then
    [[ -e "$target" ]] && rm -rf "$target"
    cp -R "$backup" "$target"
    ok "Restored: $target ← $(basename "$backup")"
  else
    if [[ -e "$target" ]]; then
      rm -rf "$target"
      if [[ "$NO_RESTORE" == "1" ]]; then
        ok "Removed: $target (NO_RESTORE=1)"
      else
        ok "Removed: $target (no backup found)"
      fi
    fi
  fi
}

# Restore CLAUDE.md from oldest backup, OR strip managed block only
restore_or_strip_claude_md() {
  local backup
  backup="$(oldest_backup "$CLAUDE_MD")"
  if [[ "$NO_RESTORE" != "1" && -n "$backup" && -f "$backup" ]]; then
    cp "$backup" "$CLAUDE_MD"
    ok "Restored CLAUDE.md ← $(basename "$backup")"
    return
  fi
  if [[ -f "$CLAUDE_MD" ]] && grep -q "BEGIN project-starter" "$CLAUDE_MD"; then
    awk '
      /<!-- BEGIN project-starter -->/ { skip=1; next }
      /<!-- END project-starter -->/   { skip=0; next }
      !skip { print }
    ' "$CLAUDE_MD" > "${CLAUDE_MD}.tmp" && mv "${CLAUDE_MD}.tmp" "$CLAUDE_MD"
    ok "Stripped managed block(s) from $CLAUDE_MD"
    if [[ "$SCOPE" == "project" ]] && [[ -z "$(grep -v '^[[:space:]]*$' "$CLAUDE_MD" 2>/dev/null)" ]]; then
      rm "$CLAUDE_MD"
      ok "Removed empty $CLAUDE_MD"
    fi
  fi
}

# ---------- Preview & confirm ----------
info "Scope: $SCOPE"
if [[ "$NO_RESTORE" == "1" ]]; then
  warn "Mode: NO_RESTORE — managed files will be REMOVED (legacy behavior)"
else
  info "Mode: RESTORE — files will be reverted to oldest backup (pre-install state)"
  warn "Any manual edits made after install will be overwritten by the restored backup"
fi

info "Targets:"
echo "    Rules:     $RULES_DIR"
echo "    Skills:    $SKILLS_DIR/new-project-bootstrap"
echo "    CLAUDE.md: $CLAUDE_MD"
if [[ "$PURGE_BACKUPS" == "1" ]]; then
  echo "    Backups:   ALL *.backup-* under the above paths (will be deleted after processing)"
fi

# Show what would be restored vs removed
if [[ "$NO_RESTORE" != "1" ]]; then
  echo ""
  info "Restore plan (oldest backup wins):"
  for f in language.md agent-teams.md skill-activation.md; do
    bk="$(oldest_backup "$RULES_DIR/$f")"
    if [[ -n "$bk" ]]; then echo "    ✓ $f ← $(basename "$bk")"; else echo "    ✗ $f (no backup → will be removed)"; fi
  done
  if [[ -d "$RULES_DIR/stacks" ]]; then
    bk="$(oldest_backup "$RULES_DIR/stacks")"
    if [[ -n "$bk" ]]; then echo "    ✓ stacks/ ← $(basename "$bk")"; else echo "    ✗ stacks/ (no backup → will be removed)"; fi
  fi
  bk="$(oldest_backup "$SKILLS_DIR/new-project-bootstrap")"
  if [[ -n "$bk" ]]; then echo "    ✓ new-project-bootstrap ← $(basename "$bk")"; else echo "    ✗ new-project-bootstrap (no backup → will be removed)"; fi
  bk="$(oldest_backup "$CLAUDE_MD")"
  if [[ -n "$bk" ]]; then echo "    ✓ CLAUDE.md ← $(basename "$bk")"; else echo "    ✗ CLAUDE.md (no backup → strip managed block only)"; fi
fi
echo ""

confirm "Proceed?" || { echo "Cancelled."; exit 0; }

# ---------- Execute ----------
for f in language.md agent-teams.md skill-activation.md; do
  restore_or_remove "$RULES_DIR/$f"
done

# stacks/ directory: restore wholesale or remove
restore_or_remove "$RULES_DIR/stacks"

# rules/ dir cleanup (only if empty after processing)
[[ -d "$RULES_DIR" ]] && [[ -z "$(ls -A "$RULES_DIR" 2>/dev/null)" ]] && rmdir "$RULES_DIR" && ok "Removed empty $RULES_DIR"

# Skill
restore_or_remove "$SKILLS_DIR/new-project-bootstrap"

# CLAUDE.md
restore_or_strip_claude_md

# Project scope: clean up empty .claude dir
if [[ "$SCOPE" == "project" ]] && [[ -d "$CLAUDE_DIR" ]] && [[ -z "$(ls -A "$CLAUDE_DIR" 2>/dev/null)" ]]; then
  rmdir "$CLAUDE_DIR"
  ok "Removed empty $CLAUDE_DIR"
fi

# ---------- Optional: purge timestamped backups ----------
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
    while IFS= read -r -d '' bak; do
      rm -rf "$bak"
      ok "Purged: $bak"
    done < <(find "$parent" -maxdepth 1 -name '*.backup-*' -print0 2>/dev/null)
  done
else
  warn "Backups preserved. To also delete them: PURGE_BACKUPS=1 SCOPE=$SCOPE bash scripts/uninstall.sh"
fi

ok "Uninstall complete (scope: $SCOPE, mode: $([[ "$NO_RESTORE" == "1" ]] && echo NO_RESTORE || echo RESTORE))"
