# Stack: GitHub Actions (CI/CD)

Import this file only in projects with GitHub Actions workflows. Pairs with the always-on `git-workflow.md` (branching/PR conventions live there).

## Domain Signals → Auto-Activate / Tool Use

| Signal | Auto-activated |
|---|---|
| `.github/workflows/*.yml` edits | Treat as CI/CD work; keep the PR gate green |
| "CI failing", "the action broke", red check on a PR | Read the failed job log first, then fix root cause (don't blind-retry) |
| "add a workflow", "run tests on PR" | Scaffold lint + typecheck + unit + build gate |

## CI Gate Principles

- **PR gate runs**: `lint` → typecheck → unit tests (Vitest) → `build`. E2E (Playwright) optionally on a separate job (slower; can be label-gated).
- Branch protection: **require the CI check to pass before merge** (this is what makes `git-workflow.md`'s "CI must be green" enforceable, not advisory).
- pnpm: use `pnpm/action-setup` + `actions/setup-node` with `cache: pnpm`, and `pnpm install --frozen-lockfile` (fail on lockfile drift).
- First-failure discovery belongs locally (see `git-workflow.md` pre-PR checklist) — CI is the backstop, not the primary test runner.

## Security

- Secrets via GitHub Actions **encrypted secrets**, referenced as `${{ secrets.NAME }}` — never hard-coded, never `echo`ed into logs.
- Set least-privilege `permissions:` at the top of each workflow (default `contents: read`; widen only per-job as needed).
- **Pin actions to a tag** (e.g. `actions/checkout@v4`); for third-party actions prefer a commit SHA.
- `pull_request` from forks runs without secrets by design — don't work around it for untrusted PRs.

## Documentation Lookup

For workflow syntax / action inputs, use `claude.ai Context7` MCP or the GitHub Actions docs.
