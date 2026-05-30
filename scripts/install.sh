#!/usr/bin/env bash
# project-starter installer
# Idempotent: safe to re-run. Backs up existing files before modification.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
AGENTS_DIR="${AGENTS_DIR:-$HOME/.agents}"
RULES_DIR="$CLAUDE_DIR/rules"
SKILLS_DIR="$AGENTS_DIR/skills"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

# ---------- Helpers ----------
color() { printf '\033[%sm%s\033[0m' "$1" "$2"; }
info()  { echo "$(color '1;34' '▸') $*"; }
ok()    { echo "$(color '1;32' '✓') $*"; }
warn()  { echo "$(color '1;33' '!') $*"; }
err()   { echo "$(color '1;31' '✗') $*" >&2; }

backup_if_exists() {
  local target="$1"
  if [[ -e "$target" ]]; then
    local bak="${target}.backup-${TIMESTAMP}"
    cp -R "$target" "$bak"
    warn "Backed up: $target → $bak"
  fi
}

# ---------- Prereq check ----------
if [[ "${SKIP_PREREQ:-0}" == "1" ]]; then
  warn "SKIP_PREREQ=1 set; skipping prerequisite checks"
else
  info "Checking prerequisites..."
  MISSING=()
  for cmd in node pnpm git; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      MISSING+=("$cmd")
    fi
  done

  if [[ ${#MISSING[@]} -gt 0 ]]; then
    err "Missing required commands: ${MISSING[*]}"
    echo "See docs/prereq.md for installation guidance."
    echo "To bypass (not recommended): SKIP_PREREQ=1 bash scripts/install.sh"
    exit 1
  fi

  NODE_MAJOR="$(node -v | sed 's/v\([0-9]*\).*/\1/')"
  if [[ "$NODE_MAJOR" -lt 20 ]]; then
    warn "Node $NODE_MAJOR detected. Bootstrap skill requires Node 20+."
  fi
  ok "Prerequisites OK"
fi

# ---------- Language selection ----------
LANG_CHOICE="${LANG_CHOICE:-}"
if [[ -z "$LANG_CHOICE" ]]; then
  echo ""
  echo "Select language for Claude session rules:"
  echo "  1) English (default)"
  echo "  2) 한국어 (Korean)"
  read -r -p "Choice [1]: " choice
  case "${choice:-1}" in
    1) LANG_CHOICE="en" ;;
    2) LANG_CHOICE="ko" ;;
    *) LANG_CHOICE="en" ;;
  esac
fi
ok "Language: $LANG_CHOICE"

# ---------- Install rules ----------
info "Installing rules to $RULES_DIR..."
mkdir -p "$RULES_DIR/stacks"

for f in language.md agent-teams.md skill-activation.md; do
  src="$REPO_DIR/claude-rules/$LANG_CHOICE/$f"
  dest="$RULES_DIR/$f"
  backup_if_exists "$dest"
  cp "$src" "$dest"
done

for f in "$REPO_DIR/claude-rules/stacks/"*.md; do
  fname="$(basename "$f")"
  dest="$RULES_DIR/stacks/$fname"
  backup_if_exists "$dest"
  cp "$f" "$dest"
done
ok "Rules installed"

# ---------- Install/merge CLAUDE.md ----------
info "Setting up $CLAUDE_DIR/CLAUDE.md..."
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
TEMPLATE="$REPO_DIR/CLAUDE.md.template"

if [[ -f "$CLAUDE_MD" ]]; then
  backup_if_exists "$CLAUDE_MD"
  # Append managed block if not present
  if ! grep -q "# project-starter managed (do not edit between markers)" "$CLAUDE_MD"; then
    {
      echo ""
      echo "<!-- BEGIN project-starter -->"
      cat "$TEMPLATE"
      echo "<!-- END project-starter -->"
    } >> "$CLAUDE_MD"
    ok "Appended managed block to existing CLAUDE.md"
  else
    warn "Managed block already present; manual review recommended"
  fi
else
  cat "$TEMPLATE" > "$CLAUDE_MD"
  ok "Created $CLAUDE_MD"
fi

# ---------- Install skills ----------
info "Installing skills to $SKILLS_DIR..."
mkdir -p "$SKILLS_DIR"

for skill_dir in "$REPO_DIR/skills/"*/; do
  skill_name="$(basename "$skill_dir")"
  dest="$SKILLS_DIR/$skill_name"
  backup_if_exists "$dest"
  cp -R "$skill_dir" "$dest"
  ok "Skill installed: $skill_name"
done

# ---------- Done ----------
echo ""
ok "project-starter installation complete"
echo ""
echo "Next steps:"
echo "  1. Review $CLAUDE_MD"
echo "  2. Check MCP setup: docs/mcp-setup.md (Supabase, Vercel optional)"
echo "  3. Start a new project: in an empty directory, run 'claude' and say:"
echo "       \"I want to start a new project\""
echo "     The bootstrap skill will activate automatically."
echo ""
echo "To uninstall: bash scripts/uninstall.sh"
