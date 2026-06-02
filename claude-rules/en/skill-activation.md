# Skill Auto-Activation Rules (User-Journey Based)

Trigger skills automatically based on context, without explicit invocation. **Unless the user explicitly blocks ("don't use skills"), apply this matrix deterministically.**

Goal: connect idea → design → implementation → verification → deploy so the user lands at a high-quality finished service.

## The 6-Stage User Journey

### Stage 1 — Discovery (requirements & idea exploration)

**Trigger keywords**: "I have an idea", "what should I build", "start a project", "from scratch", "user needs"

**Skill chain** (sequential):
1. `mattpocock/skills@grill-me` — relentlessly grill requirements
2. `obra/superpowers@brainstorming` — creative exploration: intent, target, constraints
3. `vercel-labs/skills@find-skills` — find additional skills needed for the domain

Output: concept memo / draft `CONTEXT.md`.

### Stage 2 — Setup (project infrastructure)

**Trigger**: Stage 1 complete + starting in an empty directory.

**Skill chain**:
1. `new-project-bootstrap` (project-starter's own) — Next.js 15 + TypeScript + pnpm + Sentry + Amplitude + Supabase + Vitest + Playwright in 11 steps
2. `setup-secrets` (project-starter's own) — called from Step 5/6/7 to inject keys safely (AI never sees them)

Output: working scaffold + `_team/`, `docs/adr/`, `CLAUDE.md`.

### Stage 3 — Design (UI/UX + architecture)

**Trigger keywords**: "design", "UI", "component", "landing", "dashboard", "style", "architecture", "structure"

**Skill chain**:
- `anthropics/skills@frontend-design` — design quality (avoid generic AI UI)
- `mattpocock/skills@improve-codebase-architecture` — surface architectural friction, find deepening opportunities

**Stack-specific add-ons** (cumulative when imported in project CLAUDE.md):
- Next.js → `nextjs-app-router-patterns` + `vercel-react-best-practices`
- Tailwind / shadcn/ui (`components/ui/`, utility classes) → `frontend-design` (run `accessibility` before done)

### Stage 4 — Implementation (TDD cycle)

**Trigger keywords**: "let's build X", "implement this", "write the code", "make it work"

**Skill chain**:
1. `obra/superpowers@writing-plans` — staged implementation plan
2. `obra/superpowers@test-driven-development` — Red → Green → Refactor
3. (loop if needed) `omc:ralph` or `omc:ultraqa` until green light

**Stack-specific add-ons**:
- Complex TS types → `wshobson/agents@typescript-advanced-types`
- Supabase work → `supabase` + `supabase-postgres-best-practices`
- Cloudflare Workers → Cloudflare MCP tools
- Anthropic SDK → `claude-api`
- Vitest (`*.test.ts`, new logic) → `test-driven-development` (Red → Green → Refactor)
- Amplitude instrumentation → agree on event taxonomy first, then `track()`; secret keys via `setup-secrets`
- Resend email → server-side send only, `RESEND_API_KEY` via `setup-secrets`

### Stage 5 — Quality (verification, debugging, refactoring)

**Trigger keywords**:
- "test", "E2E" → testing
- "why doesn't this work", "bug", "error", stack trace → debugging
- "review", "refactor", "clean this up", "rename" → quality
- "accessibility", "a11y" → accessibility

**Skill chain**:
| Intent | Activate |
|---|---|
| Systematic debugging | `obra/superpowers@systematic-debugging` |
| Production error / stack trace | Sentry MCP issue lookup first → `systematic-debugging` |
| Unit / integration testing | `obra/superpowers@test-driven-development` (Vitest) |
| E2E automation | `anthropics/skills@webapp-testing` (Playwright) |
| Accessibility audit | `addyosmani/web-quality-skills@accessibility` |
| Surgical refactor | `github/awesome-copilot@refactor` |
| Refactor RFC + issue | `mattpocock/skills@request-refactor-plan` |
| Review of changed code | `simplify` |
| Clean AI slop | `omc:ai-slop-cleaner` |

### Stage 6 — Pre-deploy (gate)

**Trigger keywords**: "done", "finished", "complete", "PR", "merge", "before deploying"

**Forced gate** (cannot be bypassed):
1. `obra/superpowers@verification-before-completion` — real execution check before "done" is allowed
2. `obra/superpowers@requesting-code-review` — self-review before PR
3. (when security-relevant) `security-review`

## Stack Signals → Auto-Activate

When the project's CLAUDE.md imports a stack rule, that stack's signals cumulatively activate its skills.

| Signal | Auto-activate |
|---|---|
| TDD, starting a new feature | `obra/superpowers@test-driven-development` |
| Library/SDK/CLI doc question | `claude.ai Context7` MCP first |
| `@sentry/*`, prod error, deployed stack trace | Sentry MCP issue lookup first (don't guess from code) |
| `@amplitude/*`, "track event", funnel/retention question | event taxonomy first; Amplitude MCP for live metrics (never fabricate) |
| Vitest, `*.test.ts` (non-Playwright) | `obra/superpowers@test-driven-development` |
| Tailwind / shadcn, `components/ui/`, utility classes | `frontend-design` (+ `accessibility` before done) |
| Resend, `resend.emails.send`, `@react-email/*` | server-side send, secret via `setup-secrets` |

## Maintenance / Operations

| User intent | Auto chain |
|---|---|
| "health check", "weekly review", "code state" | `improve-codebase-architecture` (diagnose) |
| "regularly", "every week", "scheduling" | propose `schedule` |
| "refactor plan", "RFC" | `request-refactor-plan` |
| "review only changed code" | `simplify` |

## Auto-Activation Blocking

Hold off when:
- User says "don't use skills", "keep it simple", "just answer"
- Simple Q&A ("what does this function do?", "what is X?")
- Trivial changes like 1-line edits

## Priority

When multiple stages match simultaneously:
1. **Stage 6 gate (verification)** — forced before any "done" claim
2. **Stage 5 debugging** — bug signals override other stages
3. **Stage 1 Discovery** — ambiguity wins (clarify first)
4. **Other stages** — domain / timing match

## Usage Report

Announce auto-activated skills in **one line** at response start.

Examples:
- `(Stage 1 — Discovery: grill-me + brainstorming activated)`
- `(Stage 4 — Implementation: TDD + supabase activated)`
- `(Stage 6 — Pre-deploy: verification-before-completion forced gate)`

No verbose explanations.

## Inventory Self-Check

Run before bootstrap or when the user requests it:
```bash
npx skills list -g
```

Quick check for the essential bundle — run `npx skills list -g` (all OS) and confirm these names appear in the output: `brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `grill-me`, `find-skills`, `frontend-design`, `improve-codebase-architecture`, `refactor`, `request-refactor-plan`.

```bash
# Optional bash/WSL/Git Bash shortcut (Windows has no grep — read the list instead):
npx skills list -g | grep -E "brainstorm|writing-plans|test-driven|systematic-debug|verification|requesting-code-review|grill-me|find-skills|frontend-design|improve-codebase|refactor"
```

12 matches = essential bundle is complete (`refactor` matches both `refactor` and `request-refactor-plan`). Missing entries → re-run the installer with `SKILL_BUNDLE=essential` (or `full`): `node project-starter/scripts/install.mjs` (PowerShell: `$env:SKILL_BUNDLE="essential"; node project-starter/scripts/install.mjs`).
