# Changelog

All notable changes to project-starter are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/); the project
adheres to [Semantic Versioning](https://semver.org/). The canonical version
lives in `package.json` (exported as `VERSION` from `scripts/lib/registry.mjs`);
`consistency.test.mjs` asserts the latest entry below matches it.

## [0.5.0] - 2026-06-08

### Added
- **Slash commands** (`commands/*.md` → `<scope>/.claude/commands/`): `/adopt`
  (dry-run → confirm → apply), `/inspect` (read-only), `/bootstrap`, `/secrets` —
  explicit, discoverable invocation of the skills inside Claude Code. `install.mjs`
  installs them (manifest-tracked for uninstall); `update.mjs` refreshes them.
- **Unified shell CLI** (`scripts/cli.mjs`, exposed as the `project-starter` bin):
  `install | update | adopt | inspect | verify | secrets | version | help`. Routes
  to the existing engines — pure Node, no AI tokens or Claude subscription needed
  (new-project bootstrap is skill-only and intentionally absent). `npm link` to get
  a global `project-starter` command.

## [0.4.0] - 2026-06-07

### Added
- **`update` command** (`scripts/update.mjs` + `update.sh`): refresh an existing
  install to the current checkout — content-aware (no backup churn), manifest-driven
  (no prompts). Reports `installed vX → current vY` with the CHANGELOG delta,
  refreshes rules + project-starter skills + the bundled adopt engine + the
  `CLAUDE.md` managed block, and bumps the manifest version. `--skills` also runs
  `npx skills update`.
- `scripts/lib/bundle-engine.mjs`: shared adopt-engine bundling used by both
  `install.mjs` and `update.mjs` (single source for the bundle's file list).

### Changed
- `install.mjs` now bundles the adopt engine via the shared `bundle-engine.mjs` helper.

## [0.3.0] - 2026-06-07

### Added
- **Skill-driven adopt.** `install.mjs` bundles a self-contained adopt engine
  into the `adopt-existing-project` skill (`engine/scripts` + `engine/claude-rules`),
  so applying project-starter to an *existing* repo is just "ask Claude" —
  symmetric with the new-project flow, no clone path or raw command to type.
  `inspect-project` uses the same bundled engine.
- The install manifest now records `lang=`.

### Changed
- README (en + ko): the existing-project path leads with the skill-driven flow;
  the raw `node scripts/adopt.mjs` command is demoted to a "Scripted / CI" subsection.

### Fixed
- `adopt.mjs` `isMain` detection resolves symlinks (`fs.realpathSync`) so the
  bundled engine runs correctly under symlinked install paths (e.g. macOS
  `/var` → `/private/var`).

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
