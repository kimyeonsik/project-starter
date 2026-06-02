# Git Workflow (Branching / Commits / PRs)

Always-on. Applies to every project unless its CLAUDE.md overrides a specific rule.

## Branching

- **Trunk-based**: short-lived branches off `main`; never commit directly to `main`.
- Branch name: `<type>/<short-kebab-desc>` — `feat/user-auth`, `fix/login-redirect`, `chore/bump-deps`, `docs/readme-ko`.
- Rebase or merge `main` in before opening a PR; keep branches short-lived to avoid drift.
- Delete the branch after merge.

## Commits

- **Conventional Commits**: `<type>(<scope>): <subject>` — `feat(auth): add magic-link login`.
- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`.
- Subject: imperative present ("add", not "added"/"adds"), no trailing period, ≤ ~72 chars.
- One logical change per commit. Don't mix refactor + feature + formatting in one commit.
- Never commit secrets, `.env*`, or generated artifacts (see `security.md`).
- **Only commit/push when the user asks.** If on `main`, branch first.

## Pull Requests

- Small and focused — one concern per PR. Split large work into stacked PRs.
- Description states **what** changed and **why** (not a file-by-file restatement of the diff).
- Link the issue/ticket it closes.
- **CI must be green before merge** (see `stacks/github-actions.md` when GitHub Actions is used).
- Resolve review threads before merge; the Stage 6 gate (`verification-before-completion` + `requesting-code-review`) runs before any "done" claim.
- Prefer **squash merge** for feature branches (one clean commit on `main`); preserve history only when the individual commits carry value.

## Pre-PR Checklist

Before opening a PR, the working tree must pass locally what CI will run: lint, typecheck, unit tests, build. Don't outsource first-failure discovery to CI.
