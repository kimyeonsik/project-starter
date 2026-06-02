# Stack: Vitest (Unit / Integration Testing)

Import this file only in projects using Vitest. Installed by `new-project-bootstrap`.

Vitest covers **unit + integration**; Playwright (`stacks/playwright.md`) covers **E2E**. Don't drive a browser flow through Vitest, and don't unit-test pure functions through Playwright.

## Domain Signals → Auto-Activate

| Signal | Auto-activated skills |
|---|---|
| `vitest` imports, `*.test.ts`, `*.spec.ts` (non-Playwright), `vitest.config.*` | `test-driven-development` |
| "add a test", "write a test", new function/module with no coverage | `test-driven-development` (Red → Green → Refactor) |
| Bug report with a reproducible case | Write a failing test first (`systematic-debugging` + TDD) |

## Principles

- TDD by default for new logic: failing test first, minimal pass, then refactor.
- Test behavior and contracts, not implementation details — avoid asserting on internals that refactors will churn.
- Reproduce bugs as a failing test before fixing, so the fix is provably correct and stays fixed.
- Co-locate `*.test.ts` next to source unless the project already uses a `__tests__/` convention — match what exists.
- React component tests: prefer Testing Library (`@testing-library/react`) querying by role/text, not by test-id soup.

## Verification Gate

Before any "done"/"fixed"/"passing" claim, actually run the suite (`pnpm test` / `pnpm vitest run`) and report the real output — this feeds Stage 6's `verification-before-completion` gate.
