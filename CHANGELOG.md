# Changelog

All notable changes to project-starter are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/); the project
adheres to [Semantic Versioning](https://semver.org/). The canonical version
lives in `package.json` (exported as `VERSION` from `scripts/lib/registry.mjs`);
`consistency.test.mjs` asserts the latest entry below matches it.

## [0.10.0] - 2026-06-09

### Added
- **Requirement-driven, framework-pluggable new projects.** `new-project-bootstrap`
  no longer hardcodes Next.js + Supabase. It now: gathers requirements → calls
  `recommend-stack` (new **greenfield mode**) to recommend the whole stack incl.
  **framework**, resolved in dependency order weighted by external signals →
  compatibility with the chosen stack → reputation → default → scaffolds with the
  framework's **official create tool** (Next/Vite/SvelteKit/Remix/Astro/Expo) →
  applies governance via `adopt` → installs capabilities (Next.js preset recipes,
  or `install-stack add` for other frameworks / non-default picks).
- **recommend-stack greenfield mode**: requirement-driven, recommends framework
  (greenfield only), compatibility-ordered. Existing mode unchanged.
- **Dynamic ADR/CLAUDE.md** reflecting the resolved stack (via adopt), replacing the
  fixed Supabase block.

### Added
- **Self-healing external skill installs.** When a skill's pinned repo has moved
  or been renamed, the installer now queries `npx skills find <skill>` for the
  canonical new home (exact name match, ranked by installs) and prints a
  copy-paste retry command instead of just failing. Opt into automatic
  application with `SKILL_AUTOHEAL=1` (off by default — installing top-ranked
  third-party code is deliberately opt-in). Pure resolver in
  `scripts/lib/skill-resolver.mjs`, unit-tested.

### Fixed
- **`vercel-react-best-practices` install path.** The skill moved from
  `vercel-labs/skills` to `vercel-labs/agent-skills` (the old repo now hosts only
  `find-skills`), which broke `WEB_SKILLS` install during bootstrap. Updated the
  registry SSOT and the README skill tables to the new `owner/repo`.

### Notes
- Framework choice applies to new projects; existing projects were already
  framework-agnostic via adopt's generic capability rules. Non-Next frameworks use
  the generic install path (no bespoke preset yet). Data migration / non-interactive
  bootstrap remain out of scope.

## [0.9.0] - 2026-06-08

### Added
- **Risk-gated stack replacement.** `stack-assess` now grades migration risk
  (state-risk × blast radius × readiness) into low/medium/high/critical. A
  replacement runs **only when risk is low** (stateless capability + low blast +
  tests present) via a new `install-stack` **`replace` mode** (add + call-site
  codemod + remove old + test-parity gate, on a dedicated branch). Medium+ risk
  is reported only — stateful (db/auth/payments) replacements and data migrations
  are never executed.
- **Deterministic readiness signals** (`scripts/lib/migration-readiness.mjs`):
  capability state-risk map, `readinessSignals` (tests / CI / env separation),
  and the `migrationRisk` grade. Surfaced as a "마이그레이션 준비도" line in the
  adopt/inspect report.
- **README**: stack lifecycle tiers (advisors / executor) + flow diagram.

### Changed
- Reconciled "replacement = propose-only" wording across stack-assess, install-stack,
  adopt, and the install/assess commands to the new risk-gated policy. Fixed a stale
  note in `/install` that still called upgrade out of scope.

### Notes
- Stateful replacement, data migration, and `stack-assess`→`assess-stack` rename remain out of scope.

## [0.8.0] - 2026-06-08

### Added
- **Existing-stack assessment (`stack-assess` skill + `/assess`).** Scores the
  in-use stacks (security, maintenance, version staleness, profile fit) via
  research, weighted, threshold-flagged (<60). For below-threshold stacks it
  recommends an UPGRADE (same stack, newer version — executable via install-stack)
  or proposes a REPLACEMENT (different stack — propose-only: alternative +
  blast-radius + migration outline, never executed this cycle).
- **Deterministic in-use signals** (`scripts/lib/stack-signals.mjs`, token-free):
  installed version, usage count, and blast radius (low/medium/high) per detected
  stack — surfaced in the adopt/inspect report's new "기존 스택" section. Feeds
  stack-assess.
- **install-stack gains an `upgrade` mode** (add | upgrade share one guided engine).
- **adopt now offers an in-use assessment gate** (Step 4.6) after the empty-capability gate.

### Notes
- Replacing an in-use stack with a different one remains propose-only (execution is a separate cycle).

## [0.7.0] - 2026-06-08

### Added
- **Guided stack install (`install-stack` skill + `/install`).** Installs a NEW
  stack for an empty capability by researching the official setup for the
  project's framework, synthesizing a runbook, and executing it step-by-step
  with approval — then vendoring the matching rule via the adopt engine. Modifies
  code under strict gates (explicit consent, clean git / dedicated branch,
  per-step approval, build/test verification, scoped to the target stack). Secrets
  stay out of the conversation (`.env.local` placeholders → `setup-secrets`).
- **recommend-stack now hands off to install-stack** after the user picks a tool.
- **adopt now offers an interactive gate**: after non-destructive governance, if
  empty capabilities exist, it offers recommend → guided install (contract B).

### Notes
- Replacing/upgrading an in-use stack remains out of scope (separate cycle).

## [0.6.0] - 2026-06-08

### Added
- **Stack recommender** — `recommend-stack` skill + `/recommend` slash command.
  For a project's EMPTY capabilities (analytics / auth / payments / …), it
  recommends what to **add**, weighted by the project profile (web/native/edge,
  hosting) + region/budget, **always researching current options** (reputation,
  pricing) before suggesting. Only recommends for *absent* capabilities — never
  proposes replacing what is already in use.
- **Deterministic recommender inputs** (token-free) surfaced in `inspect` /
  `adopt --dry-run`: the report now shows the project **profile** (platform,
  hosting) and the **empty capabilities** that are recommendation candidates.
  Added `expo` / `react-native` detection (→ platform=native).

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
