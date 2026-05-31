# project-starter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Personal Claude Code development infrastructure: global rules, stack opt-ins, and a deterministic Next.js bootstrap skill.

Designed to replicate a consistent dev environment across machines in one command.

## What It Sets Up

- **Global rules** (`~/.claude/rules/`): language policy, Agent Teams workflow, skill auto-activation matrix
- **Stack opt-in rules** (`~/.claude/rules/stacks/`): Next.js, Supabase, Vercel, Playwright, Claude API
- **Bootstrap skill** (`~/.agents/skills/new-project-bootstrap/`): one-prompt new project setup with Next.js 15 + TypeScript + pnpm + Supabase + Sentry + Amplitude + Vitest + Playwright

## Install

### Scope: project (default) vs global

Two install scopes are supported:

- **`project`** (default): installs into the **current directory** — creates `./.claude/rules/`, `./.claude/skills/`, and `./CLAUDE.md`. Does not touch `~/.claude/`. Use this to try the toolkit in a single project, or to keep different rule sets per project.
- **`global`**: installs into `~/.claude/rules/`, `~/.agents/skills/`, and merges into `~/.claude/CLAUDE.md`. Applies to every Claude session everywhere on your machine.

You'll be prompted to choose, or you can preset `SCOPE=project` / `SCOPE=global`.

### One-liner (project scope, default)

Run from the directory you want to install into:

```bash
cd ~/projects/my-app
bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

Wherever you are when you run this, the install lands in **that** directory.

### One-liner (global scope, explicit)

```bash
SCOPE=global bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

### Common options

```bash
# Clone the source repo to a different location
TARGET=~/dev/starter bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)

# Pre-select language (skips the language prompt)
LANG_CHOICE=ko bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)

# Fully non-interactive, project scope into a specific directory
SCOPE=project PROJECT_ROOT=~/projects/my-app LANG_CHOICE=en \
  bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

### Manual (clone first)

```bash
git clone https://github.com/kimyeonsik/project-starter ~/projects/project-starter
cd ~/path/to/your-project
SCOPE=project bash ~/projects/project-starter/scripts/install.sh
```

### What the installer does

- Backs up any existing target files (CLAUDE.md, rules, skill dir) with a timestamped suffix
- Prompts for **scope** (project / global) and **language** (en / ko) unless preset via env vars
- Copies the rule set and bootstrap skill into the chosen scope
- Wraps a managed block (`<!-- BEGIN project-starter --> ... <!-- END project-starter -->`) into the target `CLAUDE.md`
- Self-heals on re-runs: any prior managed block(s) are stripped before the fresh block is written, so duplicate appends won't accumulate

Re-running is safe and idempotent.

## Verify Installation

### One-line health check (global scope)

Works in both bash and zsh (uses `find` instead of unsafe globs):

```bash
sh -c '
M=$(grep -c "BEGIN project-starter" "$HOME/.claude/CLAUDE.md" 2>/dev/null || echo 0)
R=$(ls "$HOME/.claude/rules/language.md" "$HOME/.claude/rules/agent-teams.md" "$HOME/.claude/rules/skill-activation.md" 2>/dev/null | wc -l | tr -d " ")
S=$(find "$HOME/.claude/rules/stacks" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d " ")
K=$([ -f "$HOME/.agents/skills/new-project-bootstrap/SKILL.md" ] && echo OK || echo MISSING)
echo "Marker: $M"; echo "Rules: $R/3"; echo "Stacks: $S/6"; echo "Skill: $K"
'
```

Expected output:
```
Marker: 1
Rules: 3/3
Stacks: 6/6
Skill: OK
```

Diagnosis:
- `Marker: 0` → managed block missing; re-run `install.sh`
- `Marker: 2` or higher → duplicate (older install bug); re-run `install.sh` to self-heal
- `Rules: 0/3` or `Stacks: 0/6` or `Skill: MISSING` → installer didn't finish; re-run

### One-line health check (project scope)

Run from the project root:

```bash
sh -c '
M=$(grep -c "BEGIN project-starter" ./CLAUDE.md 2>/dev/null || echo 0)
R=$(ls ./.claude/rules/language.md ./.claude/rules/agent-teams.md ./.claude/rules/skill-activation.md 2>/dev/null | wc -l | tr -d " ")
S=$(find ./.claude/rules/stacks -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d " ")
K=$([ -f ./.claude/skills/new-project-bootstrap/SKILL.md ] && echo OK || echo MISSING)
echo "Marker: $M"; echo "Rules: $R/3"; echo "Stacks: $S/6"; echo "Skill: $K"
'
```

### Verify import paths match scope

```bash
# Global install should show @~/.claude/rules/...
grep "^@" ~/.claude/CLAUDE.md

# Project install should show @.claude/rules/... (relative)
grep "^@" ./CLAUDE.md
```

### Live verification (most reliable)

```bash
mkdir /tmp/ps-verify && cd /tmp/ps-verify
claude
```

In the Claude session:
1. Confirm `new-project-bootstrap` appears in the available-skills list
2. Send: `> start a new project, a test app` (or in Korean: `> 새 프로젝트 시작하자. 테스트용 앱`)
3. Verify `brainstorming` skill activates automatically

When done:
```bash
rm -rf /tmp/ps-verify
```

## Secrets Setup (API keys / tokens)

Use the `setup-secrets` skill (`skills/setup-secrets/setup-secrets.sh`) to inject keys into `.env.local` interactively. Why a separate script:

- Secrets never get pasted into an AI chat (avoids leakage to logs / transcripts)
- The script reads with `read -s` (hidden input) and writes the file with `chmod 600`
- Each service is preceded by **where to get the key**, **what scopes/permissions to choose**, and **what's secret vs public**
- The script is idempotent — re-running updates existing keys in place, never appends duplicates
- A timestamped backup of `.env.local` is created on the first write of each run

Installed as a skill at `~/.agents/skills/setup-secrets/` (global scope) or `./.claude/skills/setup-secrets/` (project scope).

### Interactive menu

```bash
cd ~/projects/<your-project>

# Global scope install:
bash ~/.agents/skills/setup-secrets/setup-secrets.sh

# Project scope install:
bash ./.claude/skills/setup-secrets/setup-secrets.sh
```

You'll see a menu with: Supabase / Vercel / Sentry / Amplitude / Cloudflare / Anthropic / Custom / Validate.

### One service only (non-interactive entry)

```bash
SERVICE=supabase   bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=vercel     bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=sentry     bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=amplitude  bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=cloudflare bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=anthropic  bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=custom     bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=validate   bash ~/.agents/skills/setup-secrets/setup-secrets.sh   # verify current .env.local
```

### Other env vars

```bash
ENV_FILE=./.env.production bash ...   # target a different env file
DRY_RUN=1 bash ...                    # preview without writing
```

### Remote one-liner (no install needed)

```bash
cd ~/projects/<your-project>
bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/skills/setup-secrets/setup-secrets.sh)
```

### What gets written (per service)

| Service | Variables |
|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret), `SUPABASE_ACCESS_TOKEN` (CLI) |
| Vercel | `VERCEL_TOKEN` |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (secret) |
| Amplitude | `NEXT_PUBLIC_AMPLITUDE_API_KEY` |
| Cloudflare | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (secret) |
| Anthropic | `ANTHROPIC_API_KEY` (secret) |

### Safety checks built in

- After every session the script reports whether `.env.local` is covered by `.gitignore`. If not, you get a warning before you can accidentally commit
- Each entered value is format-validated (Supabase JWT must start with `eyJ`, Anthropic with `sk-ant-`, etc.). Bad format → up to 3 retries → skipped
- After 3 invalid retries the key is skipped (not partially written)
- Displayed values are masked (`abcd••••wxyz`) — full secret never appears on screen

### Verifying after setup

```bash
SERVICE=validate bash ~/.agents/skills/setup-secrets/setup-secrets.sh
# project scope: bash ./.claude/skills/setup-secrets/setup-secrets.sh
```

Prints each var with format-check result (OK / format unexpected).

## Uninstall

### Quick (interactive — choose scope at prompt)

```bash
bash ~/projects/project-starter/scripts/uninstall.sh
```

### Non-interactive

```bash
# Project scope (run from the project directory)
SCOPE=project bash ~/projects/project-starter/scripts/uninstall.sh

# Global scope
SCOPE=global bash ~/projects/project-starter/scripts/uninstall.sh
```

### Remote one-liner (no clone needed)

```bash
SCOPE=global bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/uninstall.sh)
```

### Default behavior: restore (revert to pre-install state)

By default, `uninstall.sh` **restores files from the oldest backup** taken at install time. The idea is "undo = put it back the way it was."

For each target:
- **Has a backup** → restore from the oldest `*.backup-*` (= state before the very first install)
- **No backup** → simply remove (the installer created it from scratch)

Any manual edits you made to managed files after install will be overwritten by the restored backup.

### What gets touched

| Item | Scope=project | Scope=global |
|---|---|---|
| Rules | `./.claude/rules/{language,agent-teams,skill-activation}.md` | `~/.claude/rules/{language,agent-teams,skill-activation}.md` |
| Stack rules | `./.claude/rules/stacks/` | `~/.claude/rules/stacks/` |
| Bootstrap skill | `./.claude/skills/new-project-bootstrap/` | `~/.agents/skills/new-project-bootstrap/` |
| `CLAUDE.md` | `./CLAUDE.md` (restored from oldest backup, or removed if empty after stripping managed block) | `~/.claude/CLAUDE.md` (restored from oldest backup, or managed block stripped if no backup) |

### What's preserved

- All `*.backup-<timestamp>` files (still on disk after restore, in case you want them — use `PURGE_BACKUPS=1` to delete)
- Any unrelated content in target directories
- Shell config, MCP server configs, other Claude Code settings

### Legacy mode: NO_RESTORE (just remove the managed pieces)

If you want the old behavior — just delete the installer's files and strip the managed block, without touching backups for restore:

```bash
NO_RESTORE=1 SCOPE=global bash ~/projects/project-starter/scripts/uninstall.sh
```

### Complete teardown (everything including backups + cloned source)

```bash
# 1. Uninstall (restores from backups) AND purge those backups afterward
PURGE_BACKUPS=1 SCOPE=project bash ~/projects/project-starter/scripts/uninstall.sh
PURGE_BACKUPS=1 SCOPE=global bash ~/projects/project-starter/scripts/uninstall.sh

# Or skip restore entirely and just nuke everything:
NO_RESTORE=1 PURGE_BACKUPS=1 SCOPE=global bash ~/projects/project-starter/scripts/uninstall.sh

# 2. Remove the cloned source repo
rm -rf ~/projects/project-starter
```

`PURGE_BACKUPS=1` deletes timestamped `*.backup-*` files only in install target directories — it never touches anything else.

### Verify clean removal

```bash
# Global scope check — all of these should print nothing
ls ~/.claude/rules/language.md ~/.claude/rules/skill-activation.md 2>/dev/null
ls ~/.agents/skills/new-project-bootstrap 2>/dev/null
grep -c "BEGIN project-starter" ~/.claude/CLAUDE.md 2>/dev/null  # → 0 or "No such file"

# Project scope check — run from the project directory
ls ./.claude/rules 2>/dev/null
grep -c "BEGIN project-starter" ./CLAUDE.md 2>/dev/null  # → 0 or "No such file"
```

## Prerequisites

- Node 20+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- git
- (optional, recommended) `gh` for the bootstrap skill's GitHub repo creation
- Claude Code CLI ([install](https://claude.com/claude-code))

See `docs/prereq.md` for installation guidance.

## Usage After Install

In any empty directory, start a Claude session and trigger the bootstrap:

```bash
mkdir ~/projects/my-app && cd ~/projects/my-app
claude
```

Then in the session:
```
I want to start a new project — a mobile web app for ...
```

The `new-project-bootstrap` skill activates after `brainstorming` confirms scope. It runs 11 deterministic steps and verifies with lint + tests + build + E2E.

To force-trigger if auto-activation misses:
```
Run the new-project-bootstrap skill.
```

## Per-Project CLAUDE.md (Opt-in Stacks)

The bootstrap skill auto-generates a project `CLAUDE.md` like:

```markdown
# my-app Rules

@~/.claude/rules/stacks/nextjs.md
@~/.claude/rules/stacks/supabase.md
@~/.claude/rules/stacks/vercel.md
@~/.claude/rules/stacks/playwright.md
```

Add or remove stack imports based on what the project actually uses.

## MCP Servers (Optional but Recommended)

Some skills work best with MCP servers connected (Supabase, Vercel). See `docs/mcp-setup.md`.

## Repository Layout

```
project-starter/
├── CLAUDE.md.template           # Managed block appended to ~/.claude/CLAUDE.md
├── claude-rules/
│   ├── en/                      # English language rule set
│   ├── ko/                      # Korean language rule set
│   └── stacks/                  # Common (English) stack rules
├── skills/
│   └── new-project-bootstrap/   # The bootstrap skill (SKILL.md)
├── scripts/
│   ├── bootstrap.sh             # Remote one-liner entry (clone + install)
│   ├── install.sh               # Local installer
│   └── uninstall.sh
└── docs/
    ├── prereq.md
    ├── mcp-setup.md
    └── customization.md
```

## Customization

Modify rules in `claude-rules/` then re-run `bash scripts/install.sh` (or the one-liner) to apply changes. The installer backs up the previous version before overwriting.

For permanent local edits without re-install overwrite, edit `~/.claude/rules/*` directly — but those changes will be lost on next install. Use this repo as source of truth.

See `docs/customization.md`.

## Troubleshooting

| Symptom | Action |
|---|---|
| `install.sh: Permission denied` | `chmod +x scripts/install.sh scripts/uninstall.sh scripts/bootstrap.sh` |
| `Node 20+` warning | `brew install node@20` (or use nvm) |
| Bootstrap skill not auto-activating | Start a new Claude session after install; check `ls ~/.agents/skills/new-project-bootstrap/SKILL.md` |
| `gh: command not found` | `brew install gh && gh auth login` (only needed for repo creation, not for cloning this project) |
| Bootstrap mid-run failure | Check `git status` for partial state; re-run from failed step (steps are idempotent) |
| Full rollback of a new project | `cd .. && rm -rf <project-name> && mkdir <project-name>` |

## Contributing

Issues and PRs welcome. This is a personal infra toolkit so the maintainer may iterate on opinions quickly — fork and customize freely.

## License

[MIT](LICENSE) © 2026 kimyeonsik
