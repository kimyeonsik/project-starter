#!/usr/bin/env bash
# project-starter uninstaller (manifest-based)
#
# Reads the manifest file written at install time and removes exactly what
# the installer created. The user's pre-existing content is preserved:
#
#   - If CLAUDE.md existed before install → only the managed block is stripped
#   - If CLAUDE.md was created by install → the file is removed when empty
#   - Files not listed in the manifest are NEVER touched
#
# Scopes (auto-detected from the manifest, or set explicitly):
#   project (default) — $PROJECT_ROOT/.claude/  and  $PROJECT_ROOT/CLAUDE.md
#   global            — ~/.claude/  and  ~/.agents/skills/
#
# Env vars:
#   SCOPE           "project" or "global"; prompts if unset
#   PROJECT_ROOT    For SCOPE=project, the install root (default: $PWD)
#   PURGE_BACKUPS   Set "1" to delete *.backup-* files in install dirs after uninstall

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

MANIFEST="$CLAUDE_DIR/.project-starter-manifest"
PURGE_BACKUPS="${PURGE_BACKUPS:-0}"

# ---------- Strip managed block helper (used in both manifest and fallback paths) ----------
strip_managed_block() {
  local file="$1" pre_existing="$2"
  if [[ ! -f "$file" ]]; then return; fi
  if ! grep -q "BEGIN project-starter" "$file"; then return; fi
  awk '
    /<!-- BEGIN project-starter -->/ { skip=1; next }
    /<!-- END project-starter -->/   { skip=0; next }
    !skip { print }
  ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  ok "Stripped managed block(s) from $file"
  # Remove if the installer created it and it's now empty/whitespace
  if [[ "$pre_existing" == "false" ]] && [[ -z "$(grep -v '^[[:space:]]*$' "$file" 2>/dev/null)" ]]; then
    rm "$file"
    ok "Removed $file (created by installer, now empty)"
  fi
}

# ---------- Purge backups helper ----------
purge_backups() {
  info "Purging timestamped backups (*.backup-*)..."
  local parents=(
    "$CLAUDE_DIR" "$RULES_DIR" "$RULES_DIR/stacks" "$SKILLS_DIR"
  )
  if [[ "$SCOPE" == "project" ]]; then parents+=("$PROJECT_ROOT"); fi
  for parent in "${parents[@]}"; do
    [[ -d "$parent" ]] || continue
    while IFS= read -r -d '' bak; do
      rm -rf "$bak"
      ok "Purged: $bak"
    done < <(find "$parent" -maxdepth 1 -name '*.backup-*' -print0 2>/dev/null)
  done
}

# ---------- Main: manifest-based uninstall ----------
if [[ -f "$MANIFEST" ]]; then
  # Read key fields from manifest
  PRE_EXISTING="$(grep '^claude_md_existed_before=' "$MANIFEST" | head -1 | cut -d= -f2)"
  : "${PRE_EXISTING:=true}"

  info "Scope: $SCOPE (mode: manifest-based)"
  info "Manifest: $MANIFEST"
  info "CLAUDE.md existed before install: $PRE_EXISTING"

  # Count what's in the manifest
  file_count="$(grep -c '^file:' "$MANIFEST" 2>/dev/null || true)"
  dir_count="$(grep -c '^dir:' "$MANIFEST" 2>/dev/null || true)"
  : "${file_count:=0}"
  : "${dir_count:=0}"
  info "Manifest contents: $file_count file(s), $dir_count dir(s)"
  if [[ "$PURGE_BACKUPS" == "1" ]]; then
    warn "Will also purge *.backup-* files"
  fi
  echo ""

  confirm "Proceed?" || { echo "Cancelled."; exit 0; }

  # Remove files
  while IFS= read -r line; do
    case "$line" in
      file:*)
        path="${line#file:}"
        if [[ -f "$path" ]]; then
          rm -f "$path"
          ok "Removed file: $path"
        fi
        ;;
      dir:*)
        path="${line#dir:}"
        if [[ -d "$path" ]]; then
          rm -rf "$path"
          ok "Removed dir:  $path"
        fi
        ;;
    esac
  done < "$MANIFEST"

  # Clean empty dirs we created
  for d in "$RULES_DIR/stacks" "$RULES_DIR" "$SKILLS_DIR"; do
    [[ -d "$d" ]] && [[ -z "$(ls -A "$d" 2>/dev/null)" ]] && rmdir "$d" && ok "Removed empty $d"
  done

  # CLAUDE.md handling
  strip_managed_block "$CLAUDE_MD" "$PRE_EXISTING"

  # Remove manifest itself
  rm -f "$MANIFEST"
  ok "Removed manifest"

  # Project scope: clean empty .claude/
  if [[ "$SCOPE" == "project" ]] && [[ -d "$CLAUDE_DIR" ]] && [[ -z "$(ls -A "$CLAUDE_DIR" 2>/dev/null)" ]]; then
    rmdir "$CLAUDE_DIR"
    ok "Removed empty $CLAUDE_DIR"
  fi

else
  # ---------- Fallback for installs that predate the manifest ----------
  warn "No manifest at $MANIFEST"
  warn "Falling back to known-paths cleanup (legacy install). The installer's"
  warn "earlier versions did not record what they created, so this path can only"
  warn "remove known file names — anything custom under those paths is preserved."
  echo ""
  confirm "Proceed with fallback cleanup?" || { echo "Cancelled."; exit 0; }

  for f in language.md agent-teams.md skill-activation.md; do
    [[ -f "$RULES_DIR/$f" ]] && rm -f "$RULES_DIR/$f" && ok "Removed $RULES_DIR/$f"
  done
  [[ -d "$RULES_DIR/stacks" ]] && rm -rf "$RULES_DIR/stacks" && ok "Removed $RULES_DIR/stacks/"
  for sk in new-project-bootstrap setup-secrets; do
    [[ -d "$SKILLS_DIR/$sk" ]] && rm -rf "$SKILLS_DIR/$sk" && ok "Removed skill: $sk"
  done
  for d in "$RULES_DIR" "$SKILLS_DIR"; do
    [[ -d "$d" ]] && [[ -z "$(ls -A "$d" 2>/dev/null)" ]] && rmdir "$d"
  done
  # Without a manifest we can't know if CLAUDE.md pre-existed; safest: strip block, keep file
  strip_managed_block "$CLAUDE_MD" "true"
  if [[ "$SCOPE" == "project" ]] && [[ -d "$CLAUDE_DIR" ]] && [[ -z "$(ls -A "$CLAUDE_DIR" 2>/dev/null)" ]]; then
    rmdir "$CLAUDE_DIR"
  fi
fi

# ---------- Optional: purge backups ----------
if [[ "$PURGE_BACKUPS" == "1" ]]; then
  purge_backups
else
  warn "Backups preserved. To also delete them: PURGE_BACKUPS=1 SCOPE=$SCOPE bash scripts/uninstall.sh"
fi

ok "Uninstall complete (scope: $SCOPE)"
