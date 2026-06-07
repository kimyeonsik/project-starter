# Changelog

All notable changes to project-starter are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/); the project
adheres to [Semantic Versioning](https://semver.org/). The canonical version
lives in `package.json` (exported as `VERSION` from `scripts/lib/registry.mjs`);
`consistency.test.mjs` asserts the latest entry below matches it.

## [0.2.0] - 2026-06-07

### Added
- **Adopt flow** (`scripts/adopt.mjs`): apply project-starter to an *existing*
  repo non-destructively — detect the in-use stack, vendor only matching rules,
  synthesize the `CLAUDE.md` managed block, write a gap report. Modes:
  `apply` / `--dry-run` / `--verify`. Skills: `adopt-existing-project`, `inspect-project`.
- **Stack detection** (`scripts/lib/stack-detect.mjs`) + 11 capability generic
  rules + `drizzle` / `d1` named stack rules.
- **`registry.mjs`** single source of truth for shared lists (core rules,
  capabilities, skill bundles, version) + `consistency.test.mjs` drift guard.
- Core rules `git-workflow` / `adr` / `security` and a `github-actions` stack
  rule; GitHub Actions CI.
- `new-project-bootstrap` interrupt + rollback safety net.
- **Versioning**: version recorded in the install manifest
  (`project_starter_version=`) and adopt report footer; `--version` flag and a
  startup banner on `install.mjs` / `adopt.mjs`.

### Changed
- README restructured around the reader's journey and the new-vs-existing fork;
  Korean README brought to parity and polished.

## [0.1.0]

### Added
- Initial toolkit: global rules (language / agent-teams / skill-activation),
  stack opt-in rules, `new-project-bootstrap` + `setup-secrets` skills, and a
  cross-platform installer (`install.mjs` with project/global scope, manifest,
  secret-file hardening).
