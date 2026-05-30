#!/usr/bin/env bash
# project-starter: interactive secret setup
#
# Why this exists: keep API keys / tokens out of AI conversations.
# You paste secrets directly into this script's hidden prompt; the value
# is written to .env.local with 600 perms and never echoed to stdout
# (only a masked preview is shown).
#
# Usage:
#   bash setup-secrets.sh                        # interactive menu
#   SERVICE=supabase bash setup-secrets.sh       # single service
#   ENV_FILE=./.env.production bash ...          # custom target
#   DRY_RUN=1 bash ...                           # preview without writing
#
# Targets: project root's .env.local by default. The script verifies that
# .gitignore covers it before exiting.

set -euo pipefail

ENV_FILE="${ENV_FILE:-./.env.local}"
DRY_RUN="${DRY_RUN:-0}"
BACKUP_DONE=""

# ---------- ui helpers ----------
color() { printf '\033[%sm%s\033[0m' "$1" "$2"; }
info()  { echo "$(color '1;34' '▸') $*"; }
ok()    { echo "$(color '1;32' '✓') $*"; }
warn()  { echo "$(color '1;33' '!') $*"; }
err()   { echo "$(color '1;31' '✗') $*" >&2; }
hr()    { echo "────────────────────────────────────────────────────────"; }

# zsh/bash 3.2 safe lowercase
lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

# ---------- secret read & mask ----------
read_secret() {
  # $1 = prompt; echoes the entered value (caller captures with $())
  local prompt="$1" var=""
  printf '%s' "$prompt" >&2
  # -s: silent. Some environments lack -s; fall back to plain read.
  if ! IFS= read -rs var 2>/dev/null; then
    IFS= read -r var
  fi
  printf '\n' >&2
  printf '%s' "$var"
}

mask() {
  local val="$1" len=${#1}
  if [[ $len -le 8 ]]; then printf '••••'; return; fi
  printf '%s••••%s' "${val:0:4}" "${val: -4}"
}

# ---------- env file ops ----------
ensure_env_file() {
  if [[ "$DRY_RUN" == "1" ]]; then return; fi
  mkdir -p "$(dirname "$ENV_FILE")"
  if [[ ! -f "$ENV_FILE" ]]; then
    touch "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    return
  fi
  # Snapshot once per script run
  if [[ -z "$BACKUP_DONE" ]]; then
    local bak="${ENV_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
    cp "$ENV_FILE" "$bak"
    chmod 600 "$bak"
    ok "Backed up to $bak"
    BACKUP_DONE=1
  fi
  chmod 600 "$ENV_FILE"
}

# In-place upsert (idempotent): replace existing KEY= line or append.
upsert_env() {
  local key="$1" val="$2"
  if [[ "$DRY_RUN" == "1" ]]; then
    info "[dry-run] would set $key=$(mask "$val")"
    return
  fi
  ensure_env_file
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    awk -v k="$key" -v v="$val" '
      BEGIN { updated = 0 }
      {
        if (index($0, k "=") == 1) { print k "=" v; updated = 1 }
        else { print }
      }
      END { if (!updated) print k "=" v }
    ' "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
  chmod 600 "$ENV_FILE"
  ok "Set $key = $(mask "$val")"
}

confirm() {
  local prompt="${1:-Continue?}" ans
  printf '%s [y/N]: ' "$prompt" >&2
  IFS= read -r ans
  case "$(lower "$ans")" in y|yes) return 0 ;; *) return 1 ;; esac
}

# Prompt + validate (regex). Empty input skips. Up to 3 retries on bad format.
prompt_validated() {
  local label="$1" key="$2" regex="$3" attempt=0 val
  while :; do
    val="$(read_secret "  $label: ")"
    if [[ -z "$val" ]]; then warn "(skipped)"; return 1; fi
    if [[ -n "$regex" ]] && ! [[ "$val" =~ $regex ]]; then
      attempt=$((attempt + 1))
      warn "Format unexpected for $key (pattern: $regex)"
      if [[ $attempt -ge 3 ]]; then err "Skipped after 3 invalid attempts."; return 1; fi
      continue
    fi
    upsert_env "$key" "$val"
    return 0
  done
}

# ============================================================
# Service handlers — each prints provenance, required scopes,
# security notes, then prompts for the relevant variables.
# ============================================================

setup_supabase() {
  hr; info "Supabase"; hr
  cat <<'EOF'
Variables this writes:
  NEXT_PUBLIC_SUPABASE_URL        public — exposed to browser
  NEXT_PUBLIC_SUPABASE_ANON_KEY   public — anon role (RLS applies)
  SUPABASE_SERVICE_ROLE_KEY       SECRET — bypasses RLS, server-only
  SUPABASE_ACCESS_TOKEN           CLI/MCP token (outside the app)

Where to get them:
  • URL + anon + service_role:
      https://supabase.com/dashboard/project/_/settings/api
  • Access token (for CLI / MCP server):
      https://supabase.com/dashboard/account/tokens
      → "Generate new token" → scope: All projects (or specific)

Security:
  • SERVICE_ROLE_KEY must NEVER appear in client bundles
  • Rotate at the same URLs if exposed
EOF
  echo; confirm "Paste keys now?" || return 0
  prompt_validated "NEXT_PUBLIC_SUPABASE_URL"      "NEXT_PUBLIC_SUPABASE_URL"      '^https://[a-z0-9-]+\.supabase\.(co|in)$' || true
  prompt_validated "NEXT_PUBLIC_SUPABASE_ANON_KEY" "NEXT_PUBLIC_SUPABASE_ANON_KEY" '^(eyJ|sbp_)' || true
  prompt_validated "SUPABASE_SERVICE_ROLE_KEY"     "SUPABASE_SERVICE_ROLE_KEY"     '^(eyJ|sbs_)' || true
  prompt_validated "SUPABASE_ACCESS_TOKEN (sbp_)"  "SUPABASE_ACCESS_TOKEN"         '^sbp_[A-Za-z0-9]+$' || true
}

setup_vercel() {
  hr; info "Vercel"; hr
  cat <<'EOF'
Variables this writes:
  VERCEL_TOKEN   SECRET — account access

Where to get it:
  • https://vercel.com/account/tokens
  → "Create Token"
  → Scope: "Full Account" (or a specific team for less blast radius)
  → Expiration: set a date, do not pick "No Expiration" for shared machines

Security:
  • Token can deploy/delete every project you own
  • Rotate at the same URL if leaked
EOF
  echo; confirm "Paste token now?" || return 0
  prompt_validated "VERCEL_TOKEN" "VERCEL_TOKEN" '^[A-Za-z0-9]{24,}$' || true
}

setup_sentry() {
  hr; info "Sentry"; hr
  cat <<'EOF'
Variables this writes:
  NEXT_PUBLIC_SENTRY_DSN   semi-public — OK in browser (rate-limited)
  SENTRY_ORG               org slug (e.g. "yk-projects")
  SENTRY_PROJECT           project slug (e.g. "class-vietnamu")
  SENTRY_AUTH_TOKEN        SECRET — used for source map upload at build time

Where to get them:
  • DSN: <project>/settings/keys (Client Keys → DSN)
      Format: https://<key>@<org>.ingest.<region>.sentry.io/<id>
  • Org slug: visible in the URL after sentry.io/
  • Project slug: project settings → general
  • Auth token: https://sentry.io/settings/account/api/auth-tokens/
      → "Create New Token"
      → Required scope (minimum): project:releases
      → Add org:read if releases include multiple projects

Security:
  • Auth token must be server-only
  • DSN is intentionally semi-public; Sentry enforces rate limits
EOF
  echo; confirm "Paste values now?" || return 0
  prompt_validated "NEXT_PUBLIC_SENTRY_DSN" "NEXT_PUBLIC_SENTRY_DSN" '^https://[^@/]+@[^/]+\.ingest\.[^/]*sentry\.io/[0-9]+$' || true
  prompt_validated "SENTRY_ORG (slug)"      "SENTRY_ORG"             '^[a-z0-9-]+$' || true
  prompt_validated "SENTRY_PROJECT (slug)"  "SENTRY_PROJECT"         '^[a-z0-9-]+$' || true
  prompt_validated "SENTRY_AUTH_TOKEN"      "SENTRY_AUTH_TOKEN"      '^(sntrys_|sntryu_)' || true
}

setup_amplitude() {
  hr; info "Amplitude"; hr
  cat <<'EOF'
Variables this writes:
  NEXT_PUBLIC_AMPLITUDE_API_KEY   public — 32-char hex

Where to get it:
  • https://app.amplitude.com/settings/projects
  → Select project → General → API Key
  → Consider separate Amplitude projects for dev / staging / prod

Security:
  • Public key is rate-limited by Amplitude
  • Secret key (for server-side ingest) is rarely needed
EOF
  echo; confirm "Paste key now?" || return 0
  prompt_validated "NEXT_PUBLIC_AMPLITUDE_API_KEY" "NEXT_PUBLIC_AMPLITUDE_API_KEY" '^[a-f0-9]{32}$' || true
}

setup_cloudflare() {
  hr; info "Cloudflare"; hr
  cat <<'EOF'
Variables this writes:
  CLOUDFLARE_ACCOUNT_ID   32 hex chars, visible in dashboard sidebar
  CLOUDFLARE_API_TOKEN    SECRET — scoped permissions

Where to get them:
  • Account ID:
      https://dash.cloudflare.com → right sidebar shows "Account ID"
  • API Token:
      https://dash.cloudflare.com/profile/api-tokens
      → "Create Token" → "Custom token" with:

         Account → Workers Scripts        → Edit
         Account → Account Settings       → Read
         Zone    → Workers Routes         → Edit  (if using custom routes)
         Account → D1                     → Edit  (if using D1)
         Account → R2                     → Edit  (if using R2)
         Account → Workers KV Storage     → Edit  (if using KV)

      Account Resources: Include → All accounts (or specific)
      Zone Resources:    Include → All zones (or specific)
      Client IP Filter:  leave blank
      TTL:               set an expiration

Security:
  • Token bypasses 2FA — treat as a password
  • Use the minimum scopes needed; rotate at the same URL
EOF
  echo; confirm "Paste values now?" || return 0
  prompt_validated "CLOUDFLARE_ACCOUNT_ID" "CLOUDFLARE_ACCOUNT_ID" '^[a-f0-9]{32}$' || true
  prompt_validated "CLOUDFLARE_API_TOKEN"  "CLOUDFLARE_API_TOKEN"  '^[A-Za-z0-9_-]{40,}$' || true
}

setup_anthropic() {
  hr; info "Anthropic"; hr
  cat <<'EOF'
Variables this writes:
  ANTHROPIC_API_KEY   SECRET — server-only

Where to get it:
  • https://console.anthropic.com/settings/keys
  → "Create Key" → name it (e.g. "class-vietnamu-dev")
  → Workspace: pick the right one
  → Copy IMMEDIATELY — the key is shown only once

Security:
  • Never expose in client bundles
  • Set spend limits at https://console.anthropic.com/settings/limits
  • Rotate immediately if leaked
EOF
  echo; confirm "Paste key now?" || return 0
  prompt_validated "ANTHROPIC_API_KEY (sk-ant-)" "ANTHROPIC_API_KEY" '^sk-ant-[A-Za-z0-9_-]+$' || true
}

setup_custom() {
  hr; info "Custom secret"; hr
  echo "Use this when the service is not in the menu."
  echo "Variable name must be UPPER_SNAKE_CASE (e.g. MY_API_KEY)."
  echo
  local key val
  printf 'Variable name: ' >&2
  IFS= read -r key
  if ! [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
    err "Invalid name. Skipped."
    return 1
  fi
  val="$(read_secret "  Value (hidden): ")"
  if [[ -z "$val" ]]; then warn "(skipped: empty)"; return 0; fi
  upsert_env "$key" "$val"
}

# ---------- validate ----------
validate_env() {
  hr; info "Validating $ENV_FILE"; hr
  if [[ ! -f "$ENV_FILE" ]]; then err "$ENV_FILE not found"; return 1; fi
  local count=0 line key val
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    case "$line" in \#*) continue ;; esac
    key="${line%%=*}"; val="${line#*=}"
    count=$((count + 1))
    case "$key" in
      NEXT_PUBLIC_SUPABASE_URL)
        [[ "$val" =~ ^https://[a-z0-9-]+\.supabase\.(co|in)$ ]] && ok "$key OK" || warn "$key format unexpected" ;;
      NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)
        [[ "$val" =~ ^eyJ ]] && ok "$key OK" || warn "$key format unexpected" ;;
      SUPABASE_ACCESS_TOKEN)
        [[ "$val" =~ ^sbp_ ]] && ok "$key OK" || warn "$key format unexpected" ;;
      VERCEL_TOKEN)
        [[ "$val" =~ ^[A-Za-z0-9]{24,}$ ]] && ok "$key OK" || warn "$key format unexpected" ;;
      NEXT_PUBLIC_SENTRY_DSN)
        [[ "$val" =~ ^https://[^@/]+@[^/]+\.ingest\..*sentry\.io/[0-9]+$ ]] && ok "$key OK" || warn "$key format unexpected" ;;
      SENTRY_AUTH_TOKEN)
        [[ "$val" =~ ^(sntrys_|sntryu_) ]] && ok "$key OK" || warn "$key format unexpected" ;;
      NEXT_PUBLIC_AMPLITUDE_API_KEY|CLOUDFLARE_ACCOUNT_ID)
        [[ "$val" =~ ^[a-f0-9]{32}$ ]] && ok "$key OK" || warn "$key format unexpected" ;;
      CLOUDFLARE_API_TOKEN)
        [[ "$val" =~ ^[A-Za-z0-9_-]{40,}$ ]] && ok "$key OK" || warn "$key format unexpected" ;;
      ANTHROPIC_API_KEY)
        [[ "$val" =~ ^sk-ant- ]] && ok "$key OK" || warn "$key format unexpected" ;;
      *) ok "$key set ($(mask "$val"))" ;;
    esac
  done < "$ENV_FILE"
  echo
  info "Total: $count variable(s)"
}

# ---------- gitignore check ----------
check_gitignore() {
  local gi="./.gitignore" base
  base="$(basename "$ENV_FILE")"
  if [[ -f "$gi" ]] && grep -qE "(^|/)$(printf '%s' "$base" | sed 's/\./\\./g')(\$|/|[[:space:]])" "$gi"; then
    ok "$base is gitignored"
  elif [[ -f "$gi" ]] && grep -qE '^\.env\.\*?$|^\.env\.local$|^\*\.env' "$gi"; then
    ok "Env files are gitignored (pattern match)"
  else
    warn "$base is NOT clearly gitignored. Add this line to .gitignore before committing:"
    echo "    $base"
  fi
}

# ---------- menu ----------
show_menu() {
  echo
  hr
  echo "project-starter: secret setup"
  hr
  echo "Target env file: $ENV_FILE"
  [[ "$DRY_RUN" == "1" ]] && warn "Mode: DRY RUN (no writes)"
  echo
  echo "  1) Supabase"
  echo "  2) Vercel"
  echo "  3) Sentry"
  echo "  4) Amplitude"
  echo "  5) Cloudflare"
  echo "  6) Anthropic"
  echo "  7) Custom secret"
  echo "  v) Validate $ENV_FILE"
  echo "  q) Quit"
  echo
}

main() {
  if [[ -n "${SERVICE:-}" ]]; then
    case "$(lower "$SERVICE")" in
      supabase)   setup_supabase ;;
      vercel)     setup_vercel ;;
      sentry)     setup_sentry ;;
      amplitude)  setup_amplitude ;;
      cloudflare) setup_cloudflare ;;
      anthropic)  setup_anthropic ;;
      custom)     setup_custom ;;
      validate)   validate_env ;;
      *) err "Unknown SERVICE: $SERVICE"; exit 1 ;;
    esac
    check_gitignore
    return
  fi
  while :; do
    show_menu
    printf 'Choice: ' >&2
    IFS= read -r choice
    case "$(lower "$choice")" in
      1) setup_supabase ;;
      2) setup_vercel ;;
      3) setup_sentry ;;
      4) setup_amplitude ;;
      5) setup_cloudflare ;;
      6) setup_anthropic ;;
      7) setup_custom ;;
      v) validate_env ;;
      q|quit|exit) break ;;
      "") continue ;;
      *) warn "Unknown choice: $choice" ;;
    esac
    echo
    printf 'Press Enter to return, or q to quit: ' >&2
    IFS= read -r next
    case "$(lower "$next")" in q|quit|exit) break ;; esac
  done
  echo
  check_gitignore
  ok "Done."
}

main "$@"
