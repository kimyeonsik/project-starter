# project-starter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**English** | [한국어](README.ko.md)

Personal Claude Code development infrastructure: global rules, stack opt-in rules, and skills for two entry points — **bootstrap a brand-new project** from scratch, or **adopt** the conventions into an existing repo (non-destructively).

Designed to replicate a consistent dev environment across machines in one command. New here? Start with [Which path? — New project vs Existing project](#which-path--new-project-vs-existing-project).

## What It Sets Up

- **Core rules** (`.claude/rules/`): language policy, Agent Teams workflow, skill auto-activation, git workflow (branching/commits/PR), ADR discipline, security baseline.
- **Stack rules**: **named** stacks (Next.js, Supabase, Drizzle, D1, Vercel, Cloudflare, Playwright, Vitest, Claude API, Sentry, Amplitude, Tailwind + shadcn/ui, Resend, GitHub Actions) **plus generic capability rules** (framework, database, auth, payments, hosting, email, ai, …) that cover any stack without a named rule.
- **Skills** (`.claude/skills/` or `~/.agents/skills/`):
  - `new-project-bootstrap` — requirement-driven new project: recommends framework + stack, scaffolds via the official create tool (Next/Vite/SvelteKit/Remix/Astro/Expo), then adopt + install
  - `adopt-existing-project` / `inspect-project` — apply governance to an existing repo (non-destructive) / read-only preview
  - `recommend-stack` / `stack-assess` — advise what to ADD for empty capabilities / score in-use stacks
  - `install-stack` — execute **add · upgrade · replace** (code changes, gated)
  - `setup-secrets` — inject API keys without exposing them to the AI
- **Slash commands + a plain-Node terminal CLI** for the non-AI parts (see **Commands**).

See **[Stack lifecycle](#stack-lifecycle)** for how these fit together.

## Which path? — New project vs Existing project

project-starter serves two entry points. Pick the one that matches your situation:

| You have... | Path | What happens |
|---|---|---|
| an **empty directory** (from scratch) | **New project — bootstrap** | `new-project-bootstrap` recommends a stack from your requirements (framework + db/auth/…), scaffolds with the framework's **official create tool**, then applies governance (adopt) + installs the stack |
| a **repo that already has code** | **Existing project — adopt** | the `adopt-existing-project` skill detects the in-use stack and vendors only the matching rules — **it never touches your source** |

Both paths first install project-starter's rules and skills (see **Install**). Then:

- **New** → start a Claude session in the empty dir and trigger the bootstrap; it interviews you, recommends a stack (framework included), and builds it (see *New project — bootstrap*).
- **Existing** → in the repo, ask Claude to adopt project-starter (the *adopt-existing-project* skill).

## Stack lifecycle

The full flow — install the toolkit, enter via **either path** (new project or existing repo), then run the capability lifecycle: **advisors** decide (read-only, research) and the **executor** changes code (gated). Replacement is risk-gated — only a provably-safe (low-risk) swap runs; anything stateful or unverifiable is reported, never executed.

```mermaid
flowchart TD
    install["install project-starter toolkit<br/>(install.mjs · bootstrap.sh · cli)"] --> start{"project state?"}

    start -->|empty dir| grec["recommend-stack (greenfield)<br/>requirements → framework + whole stack<br/>signals: external → compatibility → reputation"]
    grec --> scaffold["official create tool<br/>(next / vite / svelte / remix / astro / expo)"]
    scaffold --> govNew["adopt — governance vendoring"]

    start -->|existing repo| adopt["adopt.mjs — detect + governance (non-destructive)<br/>+ deterministic signals"]
    inspect["inspect = adopt --dry-run<br/>read-only preview"] -.-> adopt

    govNew --> governed["governed project<br/>(.claude/rules + CLAUDE.md)"]
    adopt --> governed

    governed --> empty{"empty<br/>capability?"}
    governed --> inuse{"in-use<br/>stack?"}

    subgraph t1["Tier 1 · Advisors — read-only, research"]
        rec["recommend-stack (existing)<br/>what to ADD"]
        assess["stack-assess<br/>score → verdict"]
    end
    empty -->|yes| rec
    inuse -->|yes| assess

    assess --> keep["keep (ok)"]
    assess --> upgrade["upgrade"]
    assess --> repl{"replace —<br/>migrationRisk?"}
    repl -->|"low<br/>stateless + low blast + tests"| m_replace
    repl -->|"medium+<br/>stateful / big blast / no tests"| report["report only<br/>risk + preconditions<br/>(never executed)"]
    rec -->|user picks| m_add
    upgrade --> m_upgrade

    subgraph t2["Tier 2 · Executor — changes code, gated"]
        m_add["install-stack: add"]
        m_upgrade["install-stack: upgrade"]
        m_replace["install-stack: replace<br/>add + codemod + remove old"]
    end
    m_add --> gates
    m_upgrade --> gates
    m_replace --> gates
    gates["gates: clean git/branch · step approval<br/>build/test parity · scoped"] --> vendor["adopt re-run → vendor rules"]
    gates --> secrets["setup-secrets<br/>inject API keys (never shown to AI)"]
```

- **New project (empty dir)** → `recommend-stack` (greenfield) recommends the **framework + whole stack** from your requirements (signals: external → compatibility with the chosen stack → reputation) → scaffold with the framework's **official create tool** → `adopt` governance → install the chosen capabilities (Next.js preset recipes, or `install-stack add` for other frameworks / non-default picks).
- **Existing repo** → `adopt` vendors matching rules (`inspect` previews read-only) → empty capabilities via `recommend-stack`, in-use stacks via `stack-assess`.
- **Replacement** runs via `install-stack replace` only when `risk=low` (stateless + low blast + tests); otherwise reported only. Stateful (db/auth/payments) replacements and data migrations are never executed.
- **Secrets** → `setup-secrets` injects keys without exposing them to the AI.

## Prerequisites

- Node 20+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- git
- (optional, recommended) `gh` for the bootstrap skill's GitHub repo creation
- Claude Code CLI ([install](https://claude.com/claude-code))

See `docs/prereq.md` for installation guidance.

## Install

Under the hood the installer is plain Node.js (`scripts/install.mjs`), so behaviour is identical everywhere — only the entry command differs per platform. Pick your platform below.

- [macOS / Linux / WSL / Git Bash](#macos--linux--wsl--git-bash)
- [Windows (PowerShell)](#windows-powershell)

### Install scope: project (default) vs global

This choice is the same on every platform:

- **`project`** (default): installs into the **current directory** — creates `./.claude/rules/`, `./.claude/skills/`, and `./CLAUDE.md`. Does not touch `~/.claude/`. Use this to try the toolkit in a single project, or to keep different rule sets per project.
- **`global`**: installs into `~/.claude/rules/`, `~/.agents/skills/`, and merges into `~/.claude/CLAUDE.md`. Applies to every Claude session everywhere on your machine.

You'll be prompted to choose, or you can preset `SCOPE=project` / `SCOPE=global` (see each platform's options below for the exact syntax).

---

<a name="macos--linux--wsl--git-bash"></a>
### macOS / Linux / WSL / Git Bash

#### One-liner (project scope, default)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

> **About the install path:** project scope installs into your **current working directory** — wherever your shell is when you run the command. So `cd` into the target project first (e.g. `cd ~/projects/my-app`), or skip the `cd` and pass an explicit directory with `PROJECT_ROOT=~/projects/my-app` (see options below). No `cd` is baked into the one-liner so you can copy-paste it as-is.

#### One-liner (global scope)

```bash
SCOPE=global bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

#### Common options

```bash
# Clone the source repo to a different location
TARGET=~/dev/starter bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)

# Pre-select language (skips the language prompt)
LANG_CHOICE=ko bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)

# Fully non-interactive, project scope into a specific directory
SCOPE=project PROJECT_ROOT=~/projects/my-app LANG_CHOICE=en \
  bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

#### Manual (clone first)

```bash
git clone https://github.com/kimyeonsik/project-starter ~/projects/project-starter
SCOPE=project PROJECT_ROOT=~/projects/my-app bash ~/projects/project-starter/scripts/install.sh
```

---

<a name="windows-powershell"></a>
### Windows (PowerShell)

Native Windows has no `bash`, so use the PowerShell bootstrap — it clones the repo and runs the same Node installer.

> **Prerequisites:** **Node 20+** and **git** on PATH (`winget install OpenJS.NodeJS.LTS` and `winget install Git.Git`). PowerShell env-var syntax is `$env:NAME="value"; <command>` — set them on the same line, before the command.
>
> If you have WSL2 or Git Bash, you can use the [macOS / Linux](#macos--linux--wsl--git-bash) commands instead.

#### One-liner (project scope, default)

```powershell
irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex
```

> **About the install path:** project scope installs into your **current working directory**. `cd` into the target project first, or pass `$env:PROJECT_ROOT` (see options below).

#### One-liner (global scope)

```powershell
$env:SCOPE="global"; irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex
```

#### Common options

```powershell
# Clone the source repo to a different location
$env:TARGET="$HOME\dev\starter"; irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex

# Pre-select language and skill bundle (skips those prompts)
$env:LANG_CHOICE="ko"; $env:SKILL_BUNDLE="essential"; irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex

# Fully non-interactive, project scope into a specific directory
$env:SCOPE="project"; $env:PROJECT_ROOT="$HOME\projects\my-app"; $env:LANG_CHOICE="en"; irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex
```

> If PowerShell blocks the script (`running scripts is disabled`), run it from a downloaded file instead, or see [Troubleshooting](#troubleshooting).

#### Manual (clone first)

```powershell
git clone https://github.com/kimyeonsik/project-starter $HOME\projects\project-starter
$env:SCOPE="project"; $env:PROJECT_ROOT="$HOME\projects\my-app"
node $HOME\projects\project-starter\scripts\install.mjs
```

---

### What the installer does

- Backs up any existing target files (CLAUDE.md, rules, skill dir) with a timestamped suffix
- Prompts for **scope** (project / global), **language** (en / ko), and **skill bundle** (essential / full / minimal) unless preset via env vars
- Copies the rule set and bootstrap skill into the chosen scope
- Installs external skills from skills.sh via `npx skills` (essential and full bundles)
- Writes `.project-starter-manifest` recording every file/dir/skill it touched
- Wraps a managed block (`<!-- BEGIN project-starter --> ... <!-- END project-starter -->`) into the target `CLAUDE.md`
- **Hardens secret access:** merges `permissions.deny` rules into the target `settings.json` so Claude's Read/Bash tools can't open `.env*` files or private keys — keeping `setup-secrets`-stored keys out of the AI context (see [Secrets Setup](#secrets-setup-api-keys--tokens))
- Self-heals on re-runs: any prior managed block(s) are stripped before the fresh block is written, so duplicate appends won't accumulate

Re-running is safe and idempotent.

## Skill Bundles

The installer can pull a curated set of external skills from [skills.sh](https://skills.sh) so a fresh machine gets the full user-journey toolkit out of the box.

### Bundle selection

```bash
# Pre-select non-interactively
SKILL_BUNDLE=essential bash ~/projects/project-starter/scripts/install.sh
SKILL_BUNDLE=full      bash ...
SKILL_BUNDLE=minimal   bash ...   # skip external skills entirely
```

Or pick at the install prompt.

### What each bundle installs

**Essential** (default — covers the user journey end to end):

| Stage | Skill |
|---|---|
| Discovery | `mattpocock/skills@grill-me`, `vercel-labs/skills@find-skills`, `obra/superpowers@brainstorming`, `obra/superpowers@writing-plans` |
| Implementation | `obra/superpowers@test-driven-development` |
| Quality | `obra/superpowers@systematic-debugging`, `mattpocock/skills@improve-codebase-architecture`, `github/awesome-copilot@refactor` (surgical), `mattpocock/skills@request-refactor-plan` (RFC/plan) |
| Pre-deploy | `obra/superpowers@verification-before-completion`, `obra/superpowers@requesting-code-review` |
| Design | `anthropics/skills@frontend-design` |

**Full** (Essential + web dev + Supabase deep skills):

| Stage | Extra skills |
|---|---|
| Web dev | `vercel-labs/agent-skills@vercel-react-best-practices`, `wshobson/agents@nextjs-app-router-patterns`, `wshobson/agents@typescript-advanced-types` |
| Web quality | `anthropics/skills@webapp-testing`, `addyosmani/web-quality-skills@accessibility` |
| Supabase deep | `supabase/agent-skills@supabase`, `supabase/agent-skills@supabase-postgres-best-practices` |

**Minimal** — installs project-starter's own skills only (new-project-bootstrap, adopt-existing-project, inspect-project, recommend-stack, stack-assess, install-stack, setup-secrets) and **no external skills**. No network call. Use for sandbox/CI installs or if you've already curated external skills.

### Failure handling

| Failure | Behavior |
|---|---|
| Network unreachable (`skills.sh` not pingable) | **Abort install** with clear message. Re-run with `SKILL_BUNDLE=minimal` to skip, or fix network. |
| `npx` not available | Abort (Node is missing — install Node 20+). |
| Individual skill removed/renamed on skills.sh | Warn, print up to 3 alternatives from `npx skills find`, continue with remaining skills. Failed skills are recorded as `external_skill_failed:` in the manifest for review. |

### After install — managing external skills

```bash
# What's actually installed globally?
npx skills list -g

# Update later
npx skills update

# The project-starter manifest tracks what IT installed:
grep '^external_skill' ~/.claude/.project-starter-manifest        # global scope
grep '^external_skill' ./.claude/.project-starter-manifest         # project scope
```

### Uninstall behavior

By default, `uninstall.sh` leaves external skills alone (they may serve other projects too). To also remove them:

```bash
REMOVE_EXTERNAL=1 SCOPE=global bash ~/projects/project-starter/scripts/uninstall.sh
```

## Verify Installation

### Automated lifecycle test (all platforms)

Run the bundled harness — it installs / re-installs / uninstalls into sandboxed temp dirs (project + global scope), asserts parity, checks owner-only file permissions (`chmod 600` on POSIX, `icacls` on Windows), then prints the two manual checks that can't be automated (hidden secret input + remote bootstrap):

```bash
node scripts/verify.mjs
```

Works identically on macOS, Linux, WSL, and native Windows (PowerShell / cmd) — same single Node harness as the engine.

### One-line health check (global scope)

Works in both bash and zsh (uses `find` instead of unsafe globs):

```bash
sh -c '
M=$(grep -c "BEGIN project-starter" "$HOME/.claude/CLAUDE.md" 2>/dev/null || echo 0)
R=$(ls "$HOME/.claude/rules/language.md" "$HOME/.claude/rules/agent-teams.md" "$HOME/.claude/rules/skill-activation.md" 2>/dev/null | wc -l | tr -d " ")
S=$(find "$HOME/.claude/rules/stacks" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d " ")
K=$([ -f "$HOME/.agents/skills/new-project-bootstrap/SKILL.md" ] && echo OK || echo MISSING)
echo "Marker: $M"; echo "Rules: $R/3"; echo "Stacks: $S/13"; echo "Skill: $K"
'
```

Expected output:
```
Marker: 1
Rules: 3/3
Stacks: 13/13
Skill: OK
```

Diagnosis:
- `Marker: 0` → managed block missing; re-run `install.sh`
- `Marker: 2` or higher → duplicate (older install bug); re-run `install.sh` to self-heal
- `Rules: 0/3` or `Stacks: 0/13` or `Skill: MISSING` → installer didn't finish; re-run

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

## New project — bootstrap

In any empty directory, start a Claude session and trigger the bootstrap:

```bash
mkdir ~/projects/my-app && cd ~/projects/my-app
claude
```

Then in the session:
```
I want to start a new project — a mobile web app for ...
```

The `new-project-bootstrap` skill activates after `brainstorming` confirms scope. It interviews you for requirements, calls `recommend-stack` (greenfield) to recommend the **framework + whole stack** (weighted by your requirements and inter-stack compatibility), scaffolds with the framework's official create tool, applies governance (adopt), installs the chosen capabilities, and verifies with lint + tests + build + E2E. Next.js gets a rich preset; other frameworks use the generic install path.

To force-trigger if auto-activation misses:
```
Run the new-project-bootstrap skill.
```

## New project: starting with existing materials (PRD, dummy site, design refs)

If you already have a PRD, a working dummy site, Figma file, or other reference material, the bootstrap can ingest them. You don't need to organize them in advance — paste the paths during the bootstrap interview and Claude sorts them into `_inputs/` for you.

### How it works

During Step 0.5 of `new-project-bootstrap`, Claude asks:

```
기존에 가지고 있는 자료가 있나요? 경로를 알려주시면 _inputs/에 정리합니다.

  PRD/스펙:             <path>
  더미 사이트/프로토타입:  <path or URL>
  디자인/와이어프레임:    <path>
  Figma:               <URL>
  리서치/경쟁사:        <path>
  사용자 인터뷰:        <path>
  데이터 샘플:          <path>

또는 'none':
```

Paste the entries you have. Claude classifies them by keyword and copies (or symlinks for large files) into the right slot.

### Auto-classification map

| Your wording | Lands in |
|---|---|
| `prd` / `spec` / `requirements` / 기획서 | `_inputs/prd/` |
| `dummy site` / `prototype` / 더미 / 시안 | `_inputs/dummy-site/` |
| `design` / `wireframe` / `screenshot` | `_inputs/design/` |
| `figma.com/...` URL | `_inputs/figma/` (+ Figma MCP fetches metadata) |
| Other `http(s)://...` URL | `_inputs/live-refs/` (+ Playwright captures screenshots) |
| `research` / `competitor` / 경쟁사 | `_inputs/research/` |
| `user interview` / `survey` | `_inputs/user-research/` |
| `data` / sample CSV/JSON | `_inputs/data/` |

### Dummy site gets extra treatment

When a dummy site lands in `_inputs/dummy-site/`, Claude additionally:
- captures per-page screenshots via Playwright → `_inputs/dummy-site/screenshots/`
- extracts HTML structure hints → `_inputs/dummy-site/structure.md`
- pulls CSS variables / color tokens → `_inputs/dummy-site/tokens-draft.md`

These then feed into Stage 3 (Design) so `frontend-design` builds the new UI with the same tone.

### Pre-organized inputs also work

If you already laid things out under `./_inputs/` before starting bootstrap, those are auto-detected — no need to re-paste.

### Post-bootstrap

By default `_inputs/` is added to `.gitignore` (reference only, not shipped). You can opt to commit it if the material is part of the spec.

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

## Existing project — adopt

For a repo that already has code, **just ask Claude** — same shape as the
new-project flow, nothing to type. After installing project-starter, open a
Claude session in the repo and say:

> "Adopt project-starter into this repo."

The `adopt-existing-project` skill runs a **self-contained engine bundled with
it** (no clone path needed): it detects the in-use stack, vendors only the
matching rules into `./.claude/rules/`, synthesizes the `CLAUDE.md` managed
block, and writes a non-destructive `./.claude/adopt-report.md`. **It never
modifies your source code.** To preview only, say "inspect this project" (the
read-only `inspect-project` skill).

Unsupported-but-in-use stacks fall back to capability-generic rules and are
flagged in the report for optional dedicated-rule authoring later.

### Scripted / CI (advanced)

The skill just calls an engine you can also run directly — handy for automation:

```bash
PROJECT_ROOT=/path/to/your/repo node scripts/adopt.mjs --lang en   # apply
PROJECT_ROOT=/path/to/your/repo node scripts/adopt.mjs --dry-run    # preview (read-only)
PROJECT_ROOT=/path/to/your/repo node scripts/adopt.mjs --verify     # check an applied install
```

## Commands

Beyond plain natural language, the skills/engines are invocable two ways:

**Inside Claude Code — slash commands** (installed to `<scope>/.claude/commands/`):

| Command | Does |
|---|---|
| `/adopt` | adopt into this repo (dry-run → confirm → apply) |
| `/inspect` | read-only stack + governance-gap inspection |
| `/recommend` | recommend stacks for empty capabilities (always-research, AI) |
| `/assess` | score in-use stacks (security/maintenance/version/fit) → upgrade or risk-gated replace |
| `/install` | install a chosen stack — add / upgrade / replace (low-risk); code changes under gates |
| `/bootstrap` | start a new project (the new-project-bootstrap skill) |
| `/secrets` | inject API keys via setup-secrets |

**In a terminal — the `project-starter` CLI** (after `npm link` in the clone, or `node scripts/cli.mjs`):

```bash
project-starter adopt --dry-run      # run from the target repo (or set PROJECT_ROOT)
project-starter inspect | verify | update | install | secrets | version | help
```

The CLI is plain Node — **no AI tokens or Claude subscription** — so it's handy for CI/automation. New-project bootstrap is AI-driven, so it has a `/bootstrap` slash command but no terminal command.

## Secrets Setup (API keys / tokens)

Use the `setup-secrets` skill (`skills/setup-secrets/setup-secrets.mjs`) to inject keys into `.env.local` interactively. It's cross-platform Node; `setup-secrets.sh` is a thin shim for bash shells. Why a separate script:

- Secrets never get pasted into an AI chat (avoids leakage to logs / transcripts)
- **The agent never reads the file either:** the installer adds `permissions.deny` rules to `settings.json` so Claude's Read/Bash tools can't open `.env*` or private keys. A pasted *or* agent-read key both end up in the model's context — both are leaks — so reading is hard-blocked, not just discouraged. The value is consumed by the runtime (`pnpm dev`, CLIs) and referenced in code as `process.env.X`; the agent never needs to see it.
- The script reads with hidden (no-echo) input and restricts the file to the owner — `chmod 600` on macOS/Linux, `icacls` on Windows
- Each service is preceded by **where to get the key**, **what scopes/permissions to choose**, and **what's secret vs public**
- The script is idempotent — re-running updates existing keys in place, never appends duplicates
- A timestamped backup of `.env.local` is created on the first write of each run

Installed as a skill at `~/.agents/skills/setup-secrets/` (global scope) or `./.claude/skills/setup-secrets/` (project scope).

> **About the path:** the script writes `.env.local` into your **current working directory**, so run it from the project root where the file should live (or point it elsewhere with `ENV_FILE=...`). The commands below have no `cd` baked in so you can copy-paste them as-is.

The interactive menu offers: **Supabase / Vercel / Sentry / Amplitude / Cloudflare / Anthropic / Custom / Validate**. Pick your platform below.

---

### macOS / Linux / WSL / Git Bash

#### Interactive menu

```bash
bash ~/.agents/skills/setup-secrets/setup-secrets.sh    # global scope install
bash ./.claude/skills/setup-secrets/setup-secrets.sh    # project scope install
```

#### One service only (non-interactive entry)

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

#### Other env vars

```bash
ENV_FILE=./.env.production bash ...   # target a different env file
DRY_RUN=1 bash ...                    # preview without writing
```

#### Remote one-liner (no install needed)

The script is interactive, so it must run from a real file (not piped to stdin, which prompts need). Download to a temp file, then run with Node:

```bash
f="$(mktemp)"; curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/skills/setup-secrets/setup-secrets.mjs -o "$f"; node "$f"; rm -f "$f"
```

---

### Windows (PowerShell)

The script is cross-platform Node — call `setup-secrets.mjs` directly. Set `SERVICE` / `ENV_FILE` / `DRY_RUN` the PowerShell way (`$env:NAME="..."`) on the same line, before the command.

#### Interactive menu

```powershell
node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs    # global scope install
node .\.claude\skills\setup-secrets\setup-secrets.mjs        # project scope install
```

#### One service only (non-interactive entry)

```powershell
$env:SERVICE="supabase";   node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="vercel";     node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="sentry";     node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="amplitude";  node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="cloudflare"; node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="anthropic";  node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="custom";     node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="validate";   node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs   # verify current .env.local
```

#### Other env vars

```powershell
$env:ENV_FILE=".\.env.production"; node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs   # target a different env file
$env:DRY_RUN="1"; node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs                    # preview without writing
```

#### Remote one-liner (no install needed)

```powershell
$f="$env:TEMP\setup-secrets.mjs"; irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/skills/setup-secrets/setup-secrets.mjs -OutFile $f; node $f; Remove-Item $f
```

---

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
- Run the **validate** entry above anytime to re-check `.env.local` (prints each var with OK / format-unexpected)

## MCP Servers (Optional but Recommended)

Some skills work best with MCP servers connected (Supabase, Vercel). See `docs/mcp-setup.md`.

## Repository Layout

```
project-starter/
├── CLAUDE.md.template            # Managed block merged into the target CLAUDE.md
├── claude-rules/
│   ├── en/ · ko/                 # language rule sets (core rules)
│   ├── stacks/                   # named stack rules (nextjs, supabase, drizzle, d1, …)
│   └── capabilities/             # generic capability rules (auth, payments, ai, …)
├── skills/
│   ├── new-project-bootstrap/    # new project scaffold
│   ├── adopt-existing-project/   # adopt governance into a repo (bundles engine/)
│   ├── inspect-project/          # read-only stack + gap inspection
│   ├── recommend-stack/          # advise: what to ADD for empty capabilities
│   ├── stack-assess/             # advise: score in-use stacks → verdict
│   ├── install-stack/            # execute: add | upgrade | replace
│   └── setup-secrets/            # safe API-key injection
├── commands/                     # slash commands: adopt, inspect, recommend, assess, install, bootstrap, secrets
├── scripts/
│   ├── lib/
│   │   ├── stack-detect.mjs        # detect stacks from a repo
│   │   ├── stack-signals.mjs       # in-use signals: version, usage, blast radius
│   │   ├── migration-readiness.mjs # state-risk, readiness, migrationRisk grade
│   │   ├── gap-analysis.mjs        # adopt/inspect report builder
│   │   ├── vendor.mjs              # selective rule vendoring
│   │   ├── bundle-engine.mjs       # bundles the adopt engine into the skill
│   │   ├── registry.mjs            # SSOT lists + VERSION
│   │   └── util.mjs                # shared helpers
│   ├── adopt.mjs                 # adopt engine (detect → vendor → report)
│   ├── cli.mjs                   # `project-starter` terminal CLI
│   ├── install.mjs · update.mjs · uninstall.mjs · verify.mjs
│   └── *.sh · bootstrap.ps1      # cross-platform entry shims
└── docs/
    ├── prereq.md · mcp-setup.md · customization.md · credential-strategy.md
    └── superpowers/              # specs/ + plans/ (design history)
```

## Customization

Modify rules in `claude-rules/` then re-run `bash scripts/install.sh` (or the one-liner) to apply changes. The installer backs up the previous version before overwriting.

For permanent local edits without re-install overwrite, edit `~/.claude/rules/*` directly — but those changes will be lost on next install. Use this repo as source of truth.

See `docs/customization.md`.

## Troubleshooting

| Symptom | Action |
|---|---|
| `install.sh: Permission denied` | `chmod +x scripts/install.sh scripts/uninstall.sh scripts/bootstrap.sh` (macOS/Linux) |
| Windows: `bash` not recognized | Use the [PowerShell one-liner](#windows-powershell), or run `node scripts/install.mjs` directly |
| Windows: `running scripts is disabled` (PowerShell) | One-off: `powershell -ExecutionPolicy Bypass -File scripts\bootstrap.ps1`, or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `Node 20+` warning | `brew install node@20` (or use nvm) |
| Bootstrap skill not auto-activating | Start a new Claude session after install; check `ls ~/.agents/skills/new-project-bootstrap/SKILL.md` |
| `gh: command not found` | `brew install gh && gh auth login` (only needed for repo creation, not for cloning this project) |
| Bootstrap mid-run failure | Check `git status` for partial state; re-run from failed step (steps are idempotent) |
| Full rollback of a new project | `cd .. && rm -rf <project-name> && mkdir <project-name>` |

## Updating

Pull the latest project-starter and refresh your install in place — no prompts, no churn:

```bash
cd /path/to/project-starter && git pull
node scripts/update.mjs            # or: SCOPE=global node scripts/update.mjs
```

It reads your install manifest (scope, language), reports `installed vX → current vY` with the CHANGELOG delta, and content-aware refreshes the rules, the project-starter skills (including the bundled adopt engine), and the `CLAUDE.md` managed block — then bumps the recorded version. Add `--skills` to also `npx skills update` the external skills.

**Adopted repos** update differently: just re-run the adopt skill (or `node scripts/adopt.mjs`) — it's content-aware and idempotent, so it picks up new rules with no churn.

## Uninstall

Removal reads the install manifest and deletes exactly what was created (see [How it works](#how-it-works-manifest-based-removal) below). Pick your platform.

---

### macOS / Linux / WSL / Git Bash

#### Quick (interactive — choose scope at prompt)

```bash
bash ~/projects/project-starter/scripts/uninstall.sh
```

#### Non-interactive

```bash
SCOPE=project bash ~/projects/project-starter/scripts/uninstall.sh   # run from the project directory
SCOPE=global  bash ~/projects/project-starter/scripts/uninstall.sh
```

#### Remote (no pre-existing clone)

The uninstaller is multi-file Node, so it can't run from a single piped script — clone to a temp dir, then run:

```bash
d="$(mktemp -d)"; git clone -q https://github.com/kimyeonsik/project-starter "$d"; SCOPE=global bash "$d/scripts/uninstall.sh"; rm -rf "$d"
```

#### Complete teardown (everything including backups + cloned source)

```bash
# Uninstall and purge timestamped backups in one go, for each scope you used
PURGE_BACKUPS=1 SCOPE=project bash ~/projects/project-starter/scripts/uninstall.sh
PURGE_BACKUPS=1 SCOPE=global  bash ~/projects/project-starter/scripts/uninstall.sh

# Then remove the cloned source repo
rm -rf ~/projects/project-starter
```

#### Verify clean removal

```bash
# Global scope check — all of these should print nothing
ls ~/.claude/rules/language.md ~/.claude/rules/skill-activation.md 2>/dev/null
ls ~/.agents/skills/new-project-bootstrap 2>/dev/null
grep -c "BEGIN project-starter" ~/.claude/CLAUDE.md 2>/dev/null  # → 0 or "No such file"

# Project scope check — run from the project directory
ls ./.claude/rules 2>/dev/null
grep -c "BEGIN project-starter" ./CLAUDE.md 2>/dev/null  # → 0 or "No such file"
```

---

### Windows (PowerShell)

Call the Node uninstaller directly; set `SCOPE` / `PURGE_BACKUPS` the PowerShell way before the command.

#### Quick (interactive — choose scope at prompt)

```powershell
node $HOME\projects\project-starter\scripts\uninstall.mjs
```

#### Non-interactive

```powershell
$env:SCOPE="project"; node $HOME\projects\project-starter\scripts\uninstall.mjs   # run from the project directory
$env:SCOPE="global";  node $HOME\projects\project-starter\scripts\uninstall.mjs
```

#### Remote (no pre-existing clone)

```powershell
$d=Join-Path $env:TEMP ([System.Guid]::NewGuid()); git clone -q https://github.com/kimyeonsik/project-starter $d; $env:SCOPE="global"; node "$d\scripts\uninstall.mjs"; Remove-Item -Recurse -Force $d
```

#### Complete teardown (everything including backups + cloned source)

```powershell
$env:PURGE_BACKUPS="1"; $env:SCOPE="project"; node $HOME\projects\project-starter\scripts\uninstall.mjs
$env:PURGE_BACKUPS="1"; $env:SCOPE="global";  node $HOME\projects\project-starter\scripts\uninstall.mjs
Remove-Item -Recurse -Force $HOME\projects\project-starter
```

#### Verify clean removal

```powershell
# Global scope — these should error / print nothing
Get-ChildItem $HOME\.claude\rules\language.md, $HOME\.agents\skills\new-project-bootstrap -ErrorAction SilentlyContinue
Select-String "BEGIN project-starter" $HOME\.claude\CLAUDE.md -ErrorAction SilentlyContinue

# Project scope — run from the project directory
Get-ChildItem .\.claude\rules -ErrorAction SilentlyContinue
Select-String "BEGIN project-starter" .\CLAUDE.md -ErrorAction SilentlyContinue
```

> `PURGE_BACKUPS=1` deletes `*.backup-*` files only in the install target directories — it never touches anything else.

---

### How it works: manifest-based removal

At install time, the installer writes a manifest at `<claude_dir>/.project-starter-manifest` listing every file and directory it created. `uninstall.sh` reads that manifest and removes **exactly** those paths — nothing else.

Result:
- Anything you put under those paths yourself is **untouched**
- Your pre-existing `CLAUDE.md` content stays; only the `<!-- BEGIN/END project-starter -->` block is stripped
- If `CLAUDE.md` didn't exist before install, it's removed when empty
- Multiple installs leave a clean state on uninstall (no stale files from earlier runs)

If the manifest is missing (e.g. an install from before this mechanism existed), `uninstall.sh` falls back to removing known file names and warns about it.

### What gets touched

| Item | Scope=project | Scope=global |
|---|---|---|
| Rules | `./.claude/rules/{language,agent-teams,skill-activation}.md` | `~/.claude/rules/{...}` |
| Stack rules | `./.claude/rules/stacks/*.md` | `~/.claude/rules/stacks/*.md` |
| Skills | `./.claude/skills/new-project-bootstrap/`, `./.claude/skills/setup-secrets/` | `~/.agents/skills/new-project-bootstrap/`, `~/.agents/skills/setup-secrets/` |
| Manifest | `./.claude/.project-starter-manifest` (removed last) | `~/.claude/.project-starter-manifest` |
| `CLAUDE.md` | managed block stripped; file removed if it didn't exist before install | managed block stripped; file preserved if other content remains |
| `settings.json` | only the secret-file deny rules we added are removed; your other settings stay; file removed if it didn't exist before install | same, at `~/.claude/settings.json` |

### What's preserved

- All `*.backup-<timestamp>` files (kept on disk as a safety net — use `PURGE_BACKUPS=1` to delete)
- Anything inside install dirs that the installer didn't create (custom files, your edits outside the managed block)
- Shell config, MCP server configs, other Claude Code settings

## Contributing

Issues and PRs welcome. This is a personal infra toolkit so the maintainer may iterate on opinions quickly — fork and customize freely.

## License

[MIT](LICENSE) © 2026 kimyeonsik
