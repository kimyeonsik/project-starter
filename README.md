# claude-dev-infra

Personal Claude Code development infrastructure: global rules, stack opt-ins, and a deterministic Next.js bootstrap skill.

Designed to replicate a consistent dev environment across machines.

## What It Sets Up

- **Global rules** (`~/.claude/rules/`): language policy, Agent Teams workflow, skill auto-activation matrix
- **Stack opt-in rules** (`~/.claude/rules/stacks/`): Next.js, Supabase, Vercel, Playwright, Claude API
- **Bootstrap skill** (`~/.agents/skills/new-project-bootstrap/`): one-prompt new project setup with Next.js 15 + TypeScript + pnpm + Supabase + Sentry + Amplitude + Vitest + Playwright

## Install

```bash
git clone <this-repo-url> ~/projects/claude-dev-infra
cd ~/projects/claude-dev-infra
bash scripts/install.sh
```

The installer:
- Backs up any existing `~/.claude/CLAUDE.md`, `~/.claude/rules/*`, `~/.agents/skills/new-project-bootstrap/*`
- Prompts for language (English / 한국어)
- Copies rules and the bootstrap skill
- Appends a managed block to `~/.claude/CLAUDE.md` (or creates one)

Re-running is safe — backups are timestamped per run.

## Uninstall

```bash
bash scripts/uninstall.sh
```

Backups are preserved. The script removes only files this installer added.

## Prerequisites

- Node 20+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- git
- (optional) `gh` for GitHub repo creation in the bootstrap skill
- Claude Code CLI

See `docs/prereq.md` for installation guidance.

## Usage After Install

In any empty directory:

```bash
mkdir ~/projects/my-app && cd ~/projects/my-app
claude
# Prompt: "I want to start a new project — a mobile web app for..."
```

The `new-project-bootstrap` skill activates automatically after `brainstorming` confirms scope. It runs 11 deterministic steps and verifies with lint + tests + build + E2E.

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
claude-dev-infra/
├── CLAUDE.md.template           # Managed block appended to ~/.claude/CLAUDE.md
├── claude-rules/
│   ├── en/                      # English language rule set
│   ├── ko/                      # Korean language rule set
│   └── stacks/                  # Common (English) stack rules
├── skills/
│   └── new-project-bootstrap/   # The bootstrap skill (SKILL.md)
├── scripts/
│   ├── install.sh
│   └── uninstall.sh
└── docs/
    ├── prereq.md
    ├── mcp-setup.md
    └── customization.md
```

## Customization

Modify rules in `claude-rules/` then re-run `install.sh` to apply changes. The installer backs up the previous version before overwriting.

For permanent local edits (without re-install overwrite), edit `~/.claude/rules/*` directly — but be aware those changes will be lost on next install. Use this repo as source of truth.

See `docs/customization.md`.
