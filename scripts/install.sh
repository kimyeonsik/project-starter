#!/usr/bin/env bash
# project-starter installer
# Idempotent: safe to re-run. Backs up existing files before modification.
#
# Scopes:
#   project (default) — installs into $PWD/.claude/ and $PWD/CLAUDE.md
#   global            — installs into ~/.claude/ and ~/.agents/skills/

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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

# ---------- Scope selection ----------
SCOPE="${SCOPE:-}"
if [[ -z "$SCOPE" ]]; then
  echo ""
  echo "Install scope:"
  echo "  1) Project (default) — install into current directory's ./.claude/ and ./CLAUDE.md"
  echo "  2) Global            — install into ~/.claude/ and ~/.agents/skills/ (affects all projects)"
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
ok "Scope: $SCOPE"

# ---------- Path resolution per scope ----------
if [[ "$SCOPE" == "global" ]]; then
  CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
  RULES_DIR="$CLAUDE_DIR/rules"
  SKILLS_DIR="${AGENTS_DIR:-$HOME/.agents}/skills"
  CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
  IMPORT_PREFIX="~/.claude/rules"
else
  PROJECT_ROOT="${PROJECT_ROOT:-$PWD}"
  CLAUDE_DIR="$PROJECT_ROOT/.claude"
  RULES_DIR="$CLAUDE_DIR/rules"
  SKILLS_DIR="$CLAUDE_DIR/skills"
  CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"
  IMPORT_PREFIX=".claude/rules"
fi

MANIFEST="$CLAUDE_DIR/.project-starter-manifest"

# Capture original CLAUDE.md existence — only on the very first install.
# Subsequent re-installs preserve the value from the existing manifest, so a
# user who started with no CLAUDE.md keeps that fact recorded forever.
if [[ -f "$MANIFEST" ]] && grep -q '^claude_md_existed_before=' "$MANIFEST" 2>/dev/null; then
  PRE_EXISTING_CLAUDE_MD="$(grep '^claude_md_existed_before=' "$MANIFEST" | head -1 | cut -d= -f2)"
elif [[ -f "$CLAUDE_MD" ]]; then
  PRE_EXISTING_CLAUDE_MD=true
else
  PRE_EXISTING_CLAUDE_MD=false
fi

info "Target paths:"
echo "    Rules:     $RULES_DIR"
echo "    Skills:    $SKILLS_DIR"
echo "    CLAUDE.md: $CLAUDE_MD"
echo "    Manifest:  $MANIFEST"

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

# ---------- Skill bundle selection ----------
# Bundles (kept here so users can audit before install):
ESSENTIAL_SKILLS=(
  "obra/superpowers@brainstorming"
  "obra/superpowers@writing-plans"
  "obra/superpowers@test-driven-development"
  "obra/superpowers@systematic-debugging"
  "obra/superpowers@verification-before-completion"
  "obra/superpowers@requesting-code-review"
  "mattpocock/skills@grill-me"
  "vercel-labs/agent-skills@find-skills"
  "anthropics/skills@frontend-design"
  "mattpocock/skills@improve-codebase-architecture"
  "mattpocock/skills@refactor"
)
WEB_SKILLS=(
  "vercel-labs/agent-skills@vercel-react-best-practices"
  "wshobson/agents@nextjs-app-router-patterns"
  "wshobson/agents@typescript-advanced-types"
  "anthropics/skills@webapp-testing"
  "addyosmani/web-quality-skills@accessibility"
)
SUPABASE_SKILLS=(
  "supabase/agent-skills@supabase"
  "supabase/agent-skills@supabase-postgres-best-practices"
)

SKILL_BUNDLE="${SKILL_BUNDLE:-}"
if [[ -z "$SKILL_BUNDLE" ]]; then
  echo ""
  echo "Skill bundle (external skills installed via npx skills):"
  echo "  1) Essential (default)  — discovery + design + quality (${#ESSENTIAL_SKILLS[@]} skills)"
  echo "  2) Full                 — Essential + web dev + Supabase ($((${#ESSENTIAL_SKILLS[@]} + ${#WEB_SKILLS[@]} + ${#SUPABASE_SKILLS[@]})) skills)"
  echo "  3) Minimal              — only project-starter's own (skip external)"
  read -r -p "Choice [1]: " choice
  case "${choice:-1}" in
    1) SKILL_BUNDLE="essential" ;;
    2) SKILL_BUNDLE="full" ;;
    3) SKILL_BUNDLE="minimal" ;;
    *) SKILL_BUNDLE="essential" ;;
  esac
fi

case "$SKILL_BUNDLE" in
  essential|full|minimal) ;;
  *) err "Invalid SKILL_BUNDLE: $SKILL_BUNDLE (essential|full|minimal)"; exit 1 ;;
esac
ok "Skill bundle: $SKILL_BUNDLE"

# Compose the list to install based on bundle
EXTERNAL_SKILLS=()
if [[ "$SKILL_BUNDLE" != "minimal" ]]; then
  EXTERNAL_SKILLS+=("${ESSENTIAL_SKILLS[@]}")
fi
if [[ "$SKILL_BUNDLE" == "full" ]]; then
  EXTERNAL_SKILLS+=("${WEB_SKILLS[@]}")
  EXTERNAL_SKILLS+=("${SUPABASE_SKILLS[@]}")
fi

# Helpers for external-skill phase
check_network() {
  if curl -fsSL -o /dev/null --max-time 5 https://skills.sh 2>/dev/null; then
    return 0
  fi
  return 1
}

# Try to install one external skill. Echoes "ok" or "fail" via return code.
# On failure, prints up to 3 alternative suggestions from skills.sh.
install_one_external() {
  local pkg="$1" search_key
  if npx --yes skills add "$pkg" -g -y >/dev/null 2>&1; then
    ok "  $pkg"
    return 0
  fi
  warn "  $pkg — install failed (may be removed/renamed)"
  # Try suggesting alternatives by searching the skill name
  search_key="${pkg##*@}"
  local suggestions
  if suggestions="$(npx --yes skills find "$search_key" 2>/dev/null | grep -E '^[a-zA-Z]' | head -3)"; then
    if [[ -n "$suggestions" ]]; then
      echo "    Possible alternatives (manual review):"
      echo "$suggestions" | sed 's/^/      /'
    fi
  fi
  return 1
}

INSTALLED_EXTERNAL=()
FAILED_EXTERNAL=()

if [[ ${#EXTERNAL_SKILLS[@]} -gt 0 ]]; then
  info "Installing ${#EXTERNAL_SKILLS[@]} external skill(s) from skills.sh..."

  # Network gate — fail fast rather than try every skill
  if ! check_network; then
    err "Cannot reach skills.sh (network unavailable)"
    err "External skill install aborted. Re-run with SKILL_BUNDLE=minimal to skip,"
    err "or fix network and re-run installer (it's idempotent)."
    exit 1
  fi
  ok "Network: reachable"

  # npx is required (Node 8.2+ ships npx). prereq check already ensured node.
  if ! command -v npx >/dev/null 2>&1; then
    err "npx not found — Node.js install is incomplete"
    exit 1
  fi

  for sk in "${EXTERNAL_SKILLS[@]}"; do
    if install_one_external "$sk"; then
      INSTALLED_EXTERNAL+=("$sk")
    else
      FAILED_EXTERNAL+=("$sk")
    fi
  done

  if [[ ${#FAILED_EXTERNAL[@]} -gt 0 ]]; then
    warn "${#FAILED_EXTERNAL[@]} skill(s) failed. The installer continues so you don't lose"
    warn "the rest of the install. Review suggestions above and run manually if needed."
  fi
fi

# ---------- Install rules ----------
info "Installing rules..."
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
info "Setting up CLAUDE.md..."
TEMPLATE="$REPO_DIR/CLAUDE.md.template"

# Build an effective template with import paths rewritten for the chosen scope
EFFECTIVE_TEMPLATE="$(mktemp)"
trap 'rm -f "$EFFECTIVE_TEMPLATE"' EXIT
if [[ "$SCOPE" == "global" ]]; then
  cp "$TEMPLATE" "$EFFECTIVE_TEMPLATE"
else
  sed 's|@~/.claude/rules|@.claude/rules|g' "$TEMPLATE" > "$EFFECTIVE_TEMPLATE"
fi

if [[ -f "$CLAUDE_MD" ]]; then
  backup_if_exists "$CLAUDE_MD"
  # Remove any existing managed block(s) — idempotent and self-healing for prior duplicates
  if grep -q "<!-- BEGIN project-starter -->" "$CLAUDE_MD"; then
    awk '
      /<!-- BEGIN project-starter -->/ { skip=1; next }
      /<!-- END project-starter -->/   { skip=0; next }
      !skip { print }
    ' "$CLAUDE_MD" > "${CLAUDE_MD}.tmp" && mv "${CLAUDE_MD}.tmp" "$CLAUDE_MD"
    info "Removed previous managed block(s) for clean re-install"
  fi
  {
    # Ensure exactly one blank line before block
    if [[ -s "$CLAUDE_MD" ]] && [[ "$(tail -c1 "$CLAUDE_MD")" != "" ]]; then echo ""; fi
    echo ""
    echo "<!-- BEGIN project-starter -->"
    cat "$EFFECTIVE_TEMPLATE"
    echo "<!-- END project-starter -->"
  } >> "$CLAUDE_MD"
  ok "Managed block written to existing CLAUDE.md"
else
  mkdir -p "$(dirname "$CLAUDE_MD")"
  {
    echo "<!-- BEGIN project-starter -->"
    cat "$EFFECTIVE_TEMPLATE"
    echo "<!-- END project-starter -->"
  } > "$CLAUDE_MD"
  ok "Created $CLAUDE_MD"
fi

# ---------- Install skills ----------
info "Installing skills to $SKILLS_DIR..."
mkdir -p "$SKILLS_DIR"

INSTALLED_SKILL_DIRS=()
for skill_dir in "$REPO_DIR/skills/"*/; do
  skill_name="$(basename "$skill_dir")"
  dest="$SKILLS_DIR/$skill_name"
  backup_if_exists "$dest"
  cp -R "$skill_dir" "$dest"
  # Ensure any shell scripts shipped inside the skill are executable
  find "$dest" -maxdepth 2 -type f -name "*.sh" -exec chmod +x {} \;
  INSTALLED_SKILL_DIRS+=("$dest")
  ok "Skill installed: $skill_name"
done

# ---------- Write manifest ----------
info "Writing manifest..."
{
  echo "# project-starter install manifest (do not edit by hand)"
  echo "version=1"
  echo "scope=$SCOPE"
  echo "installed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "claude_md_existed_before=$PRE_EXISTING_CLAUDE_MD"
  echo "claude_md_path=$CLAUDE_MD"
  echo "rules_dir=$RULES_DIR"
  echo "skills_dir=$SKILLS_DIR"
  # Files we own (rules root + each stack)
  for f in language.md agent-teams.md skill-activation.md; do
    echo "file:$RULES_DIR/$f"
  done
  for f in "$REPO_DIR/claude-rules/stacks/"*.md; do
    echo "file:$RULES_DIR/stacks/$(basename "$f")"
  done
  # Skill directories we own
  for d in "${INSTALLED_SKILL_DIRS[@]}"; do
    echo "dir:$d"
  done
  # External skills installed via npx skills (per bundle).
  # Uninstaller leaves these alone by default (user may share them with other
  # projects). Pass REMOVE_EXTERNAL=1 to uninstall.sh to remove them too.
  echo "skill_bundle=$SKILL_BUNDLE"
  for sk in "${INSTALLED_EXTERNAL[@]}"; do
    echo "external_skill:$sk"
  done
  for sk in "${FAILED_EXTERNAL[@]}"; do
    echo "external_skill_failed:$sk"
  done
} > "$MANIFEST"
chmod 600 "$MANIFEST"
ok "Manifest written"

# ---------- Done ----------
echo ""
ok "project-starter installation complete (scope: $SCOPE)"
echo ""
echo "Next steps:"
echo "  1. Review $CLAUDE_MD"
if [[ "$SCOPE" == "project" ]]; then
  echo "  2. From this directory, run 'claude' — rules and skill load automatically"
  echo "  3. Project-scoped install does NOT affect ~/.claude/ or ~/.agents/"
else
  echo "  2. From any directory, run 'claude' — rules and skill load globally"
fi
echo ""
if [[ ${#INSTALLED_EXTERNAL[@]} -gt 0 ]]; then
  echo "  4. External skills installed: ${#INSTALLED_EXTERNAL[@]} (run 'npx skills list -g' to see)"
fi
if [[ ${#FAILED_EXTERNAL[@]} -gt 0 ]]; then
  warn "  ! ${#FAILED_EXTERNAL[@]} external skill(s) failed — see warnings above"
fi
echo ""
echo "To uninstall: SCOPE=$SCOPE bash scripts/uninstall.sh"
echo "    (add REMOVE_EXTERNAL=1 to also remove external skills via npx skills)"
