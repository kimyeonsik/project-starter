# Skill Auto-Activation Rules

Trigger skills automatically based on context, without explicit invocation. **Unless the user explicitly blocks ("don't use skills"), apply this matrix deterministically.**

## Project Start Interview Protocol

**Trigger keywords**: "new project", "start from scratch", "build an app", "create a site", "initial setup"

**Execution order**:
1. Invoke `superpowers:brainstorming` immediately — target users, core value, feature scope
2. If stack unclear, use `omc:deep-interview` or `grill-me` for additional interview
3. **If empty directory, run `new-project-bootstrap` skill to set up standard infrastructure** (Next.js + Supabase + Sentry + Amplitude + Vitest + Playwright)
4. After bootstrap, use `superpowers:writing-plans` to stage first feature
5. Feature implementation runs `superpowers:test-driven-development` cycle (Red → Green → Refactor)
6. For automated repetition, use `omc:ralph` or `omc:ultraqa` to loop until green light
7. E2E additions follow `webapp-testing` skill + `playwright.config.ts` pattern

## Stack-Agnostic Auto-Activation

| Signal | Auto-activate |
|---|---|
| TDD, new feature implementation start | `superpowers:test-driven-development` |
| Library/SDK/CLI documentation question | `claude.ai Context7` MCP first |

## Stack-Specific Mappings (opt-in)

Stack signal → skill mappings are defined in `~/.claude/rules/stacks/<stack>.md` and apply **only when the project CLAUDE.md explicitly imports them**. The global config assumes no specific stack.

Available stack rules:

| File | Target |
|---|---|
| `stacks/nextjs.md` | Next.js + React + frontend-design |
| `stacks/supabase.md` | Supabase + Postgres |
| `stacks/vercel.md` | Vercel deployment/operations |
| `stacks/playwright.md` | Playwright E2E |
| `stacks/claude-api.md` | Anthropic SDK / Claude API |

Project CLAUDE.md example:
```markdown
@~/.claude/rules/stacks/nextjs.md
@~/.claude/rules/stacks/supabase.md
```

## Regular Maintenance / Refactoring

| User intent | Auto chain |
|---|---|
| "health check", "weekly review", "code state" | `improve-codebase-architecture` (diagnosis) |
| "regularly", "every week", "scheduling", "cron" | propose `schedule` |
| "refactor plan", "RFC", "how to fix this" | `request-refactor-plan` |
| "clean up this code", "rename", "split function" | `refactor` |
| "remove AI slop", "deletion-first" | `omc:ai-slop-cleaner` |
| "review only changed code", "review what I just wrote" | `simplify` |

## Code Change Auto-Gates

| Timing | Forced skill |
|---|---|
| Just before "done", "finished", "complete" | `superpowers:verification-before-completion` |
| Just before PR creation/merge | `simplify` + `review` (+ `security-review` if needed) |
| `isolation: worktree` work wrap-up | `superpowers:finishing-a-development-branch` |
| Bug / failure / unexpected behavior | `superpowers:systematic-debugging` |

## Debugging / Exploration

| Signal | Auto skill |
|---|---|
| "why doesn't this work", "bug", "error", stack trace | `superpowers:systematic-debugging` |
| Broad codebase exploration (3+ queries expected) | `Explore` subagent |
| Library/SDK/CLI documentation question | `claude.ai Context7` MCP first |

## Priority

When multiple skills match simultaneously:
1. **Process skills first** (brainstorming, systematic-debugging, writing-plans) — determine HOW
2. **Domain skills next** (nextjs-*, supabase, frontend-design) — implement WHAT
3. **Verification skills last** (verification-before-completion, simplify) — wrap up

## Auto-Activation Blocking

Hold off when:
- User explicitly says "don't use skills", "keep it simple", "just answer"
- Simple Q&A ("what does this function do?", "what is X?")
- Trivial changes like 1-line edits

## Usage Report

Announce auto-activated skills in **one line** at response start.

Example: `(brainstorming + nextjs-app-router-patterns activated)`

No verbose explanations.
