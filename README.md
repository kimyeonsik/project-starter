# project-starter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Personal Claude Code development infrastructure: global rules, stack opt-ins, and a deterministic Next.js bootstrap skill.

Designed to replicate a consistent dev environment across machines in one command.

## What It Sets Up

- **Global rules** (`~/.claude/rules/`): language policy, Agent Teams workflow, skill auto-activation matrix
- **Stack opt-in rules** (`~/.claude/rules/stacks/`): Next.js, Supabase, Vercel, Playwright, Claude API
- **Bootstrap skill** (`~/.agents/skills/new-project-bootstrap/`): one-prompt new project setup with Next.js 15 + TypeScript + pnpm + Supabase + Sentry + Amplitude + Vitest + Playwright

## Install

### One-liner (recommended)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

The bootstrap script clones (or updates) this repo at `~/projects/project-starter`, then runs `scripts/install.sh`.

**Override target directory**:
```bash
TARGET=~/dev/starter bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

**Pre-select language (non-interactive)**:
```bash
LANG_CHOICE=ko bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

### Manual (clone first)

```bash
git clone https://github.com/kimyeonsik/project-starter ~/projects/project-starter
cd ~/projects/project-starter
bash scripts/install.sh
```

### What the installer does

- Backs up any existing `~/.claude/CLAUDE.md`, `~/.claude/rules/*`, `~/.agents/skills/new-project-bootstrap/*` (timestamped)
- Prompts for language (English / 한국어) unless `LANG_CHOICE` is set
- Copies rules and the bootstrap skill
- Appends a managed block (`<!-- BEGIN project-starter --> ... <!-- END project-starter -->`) to `~/.claude/CLAUDE.md`

Re-running is safe — backups are timestamped per run.

## Uninstall

```bash
cd ~/projects/project-starter
bash scripts/uninstall.sh
```

Backups are preserved. The script removes only files this installer added (between the managed-block markers).

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
