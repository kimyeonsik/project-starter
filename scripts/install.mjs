#!/usr/bin/env node
// project-starter installer (cross-platform: macOS / Linux / Windows)
//
// Idempotent: safe to re-run. Backs up existing files before modification.
// This is the single source of truth; scripts/install.sh is a thin shim that
// execs `node` on this file.
//
// Scopes:
//   project (default) — installs into <cwd>/.claude/ and <cwd>/CLAUDE.md
//   global            — installs into ~/.claude/ and ~/.agents/skills/

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  info,
  ok,
  warn,
  err,
  timestamp,
  isoUtc,
  which,
  runOk,
  capture,
  exists,
  copyRecursive,
  backupIfExists,
  chmodSecret,
  chmodExecAll,
  stripManagedBlock,
  hasManagedBlock,
  wrapManagedBlock,
  prompt,
  dirOf,
  IS_WIN,
} from './lib/util.mjs';
import {
  CORE_RULES, ESSENTIAL_SKILLS, WEB_SKILLS, SUPABASE_SKILLS, VERSION,
} from './lib/registry.mjs';
import { bundleAdoptEngine } from './lib/bundle-engine.mjs';

const REPO_DIR = path.resolve(dirOf(import.meta.url), '..');
const TS = timestamp();
const env = process.env;

// --version: print and exit before doing anything else.
if (process.argv.includes('--version')) {
  console.log(VERSION);
  process.exit(0);
}
info(`project-starter v${VERSION}`);

// CORE_RULES (always-on core rules) is the SSOT in ./lib/registry.mjs.

function fail(msg) {
  err(msg);
  process.exit(1);
}

// ---------- Prereq check ----------
if (env.SKIP_PREREQ === '1') {
  warn('SKIP_PREREQ=1 set; skipping prerequisite checks');
} else {
  info('Checking prerequisites...');
  const missing = ['node', 'git'].filter((c) => !which(c));
  if (missing.length) {
    err(`Missing required commands: ${missing.join(' ')}`);
    console.log('See docs/prereq.md for installation guidance.');
    console.log('To bypass (not recommended): SKIP_PREREQ=1 node scripts/install.mjs');
    process.exit(1);
  }

  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeMajor < 20) {
    warn(`Node ${nodeMajor} detected. Bootstrap skill requires Node 20+.`);
  }

  // pnpm: auto-provision if absent (Corepack first, npm fallback).
  if (!which('pnpm')) {
    warn('pnpm not found — attempting to provision it...');
    if (which('corepack')) {
      info('  Enabling pnpm via Corepack...');
      runOk('corepack', ['enable', 'pnpm']) || runOk('corepack', ['enable']);
      runOk('corepack', ['prepare', 'pnpm@latest', '--activate']);
    }
    if (!which('pnpm')) {
      info("  Corepack unavailable or blocked; trying 'npm i -g pnpm'...");
      runOk('npm', ['i', '-g', 'pnpm']);
    }
    if (which('pnpm')) {
      ok(`pnpm provisioned (${capture('pnpm', ['--version']) || 'version unknown'})`);
    } else {
      err('Could not install pnpm automatically.');
      err('Install it manually with either:');
      err('  corepack enable && corepack prepare pnpm@latest --activate');
      err('  npm i -g pnpm');
      err('(may require admin/sudo depending on your Node install). See docs/prereq.md.');
      err('To bypass (not recommended): SKIP_PREREQ=1 node scripts/install.mjs');
      process.exit(1);
    }
  }

  ok('Prerequisites OK');
}

// ---------- Scope selection ----------
let scope = env.SCOPE || '';
if (!scope) {
  console.log('');
  console.log('Install scope:');
  console.log("  1) Project (default) — install into current directory's ./.claude/ and ./CLAUDE.md");
  console.log('  2) Global            — install into ~/.claude/ and ~/.agents/skills/ (affects all projects)');
  const choice = await prompt('Choice [1]: ', '1');
  scope = choice === '2' ? 'global' : 'project';
}
if (scope !== 'project' && scope !== 'global') {
  fail(`Invalid SCOPE: ${scope} (must be 'project' or 'global')`);
}
ok(`Scope: ${scope}`);

// ---------- Path resolution per scope ----------
const HOME = os.homedir();
let CLAUDE_DIR, RULES_DIR, SKILLS_DIR, CLAUDE_MD;
let projectScopeRewrite = false;
if (scope === 'global') {
  CLAUDE_DIR = env.CLAUDE_DIR || path.join(HOME, '.claude');
  RULES_DIR = path.join(CLAUDE_DIR, 'rules');
  SKILLS_DIR = path.join(env.AGENTS_DIR || path.join(HOME, '.agents'), 'skills');
  CLAUDE_MD = path.join(CLAUDE_DIR, 'CLAUDE.md');
} else {
  const PROJECT_ROOT = env.PROJECT_ROOT || process.cwd();
  CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');
  RULES_DIR = path.join(CLAUDE_DIR, 'rules');
  SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
  CLAUDE_MD = path.join(PROJECT_ROOT, 'CLAUDE.md');
  projectScopeRewrite = true;
}

const MANIFEST = path.join(CLAUDE_DIR, '.project-starter-manifest');

// Capture original CLAUDE.md existence — only on the very first install.
// Subsequent re-installs preserve the value from the existing manifest.
let preExistingClaudeMd;
if (exists(MANIFEST)) {
  const m = fs.readFileSync(MANIFEST, 'utf8');
  const line = m.split('\n').find((l) => l.startsWith('claude_md_existed_before='));
  preExistingClaudeMd = line ? line.split('=')[1] : exists(CLAUDE_MD) ? 'true' : 'false';
} else {
  preExistingClaudeMd = exists(CLAUDE_MD) ? 'true' : 'false';
}

info('Target paths:');
console.log(`    Rules:     ${RULES_DIR}`);
console.log(`    Skills:    ${SKILLS_DIR}`);
console.log(`    CLAUDE.md: ${CLAUDE_MD}`);
console.log(`    Manifest:  ${MANIFEST}`);

// ---------- Language selection ----------
let lang = env.LANG_CHOICE || '';
if (!lang) {
  console.log('');
  console.log('Select language for Claude session rules:');
  console.log('  1) English (default)');
  console.log('  2) 한국어 (Korean)');
  const choice = await prompt('Choice [1]: ', '1');
  lang = choice === '2' ? 'ko' : 'en';
}
ok(`Language: ${lang}`);

// ---------- Skill bundle selection ----------
// ESSENTIAL_SKILLS / WEB_SKILLS / SUPABASE_SKILLS are the SSOT in ./lib/registry.mjs.

let bundle = env.SKILL_BUNDLE || '';
if (!bundle) {
  const fullCount = ESSENTIAL_SKILLS.length + WEB_SKILLS.length + SUPABASE_SKILLS.length;
  console.log('');
  console.log('Skill bundle (external skills installed via npx skills):');
  console.log(`  1) Essential (default)  — discovery + design + quality (${ESSENTIAL_SKILLS.length} skills)`);
  console.log(`  2) Full                 — Essential + web dev + Supabase (${fullCount} skills)`);
  console.log('  3) Minimal              — only project-starter\'s own (skip external)');
  const choice = await prompt('Choice [1]: ', '1');
  bundle = choice === '2' ? 'full' : choice === '3' ? 'minimal' : 'essential';
}
if (!['essential', 'full', 'minimal'].includes(bundle)) {
  fail(`Invalid SKILL_BUNDLE: ${bundle} (essential|full|minimal)`);
}
ok(`Skill bundle: ${bundle}`);

let externalSkills = [];
if (bundle !== 'minimal') externalSkills.push(...ESSENTIAL_SKILLS);
if (bundle === 'full') externalSkills.push(...WEB_SKILLS, ...SUPABASE_SKILLS);

// ---------- External skills via npx skills ----------
async function checkNetwork() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('https://skills.sh', {
      method: 'HEAD',
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok || res.status > 0;
  } catch {
    return false;
  }
}

// Bundle entries use "owner/repo@skill"; split on the last '@'.
function installOneExternal(spec) {
  const at = spec.lastIndexOf('@');
  const source = spec.slice(0, at);
  const skill = spec.slice(at + 1);
  if (runOk('npx', ['--yes', 'skills', 'add', source, '--skill', skill, '-g', '-y'])) {
    ok(`  ${spec}`);
    return true;
  }
  warn(`  ${spec} — install failed (skill may be removed/renamed, or wrong repo)`);
  // List what the repo actually offers so the user can correct the mapping.
  const raw = capture('npx', ['--yes', 'skills', 'add', source, '-l', '-y']);
  if (raw) {
    const available = raw
      .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '') // strip ANSI
      .split('\n')
      .filter((l) => /^│\s+[a-z]/.test(l))
      .map((l) => l.replace(/^│\s+/, '      '))
      .slice(0, 8);
    if (available.length) {
      console.log(`    Available skills in ${source}:`);
      console.log(available.join('\n'));
    }
  }
  return false;
}

const installedExternal = [];
const failedExternal = [];

if (externalSkills.length) {
  info(`Installing ${externalSkills.length} external skill(s) from skills.sh...`);
  if (!(await checkNetwork())) {
    err('Cannot reach skills.sh (network unavailable)');
    err('External skill install aborted. Re-run with SKILL_BUNDLE=minimal to skip,');
    err('or fix network and re-run installer (it\'s idempotent).');
    process.exit(1);
  }
  ok('Network: reachable');
  if (!which('npx')) fail('npx not found — Node.js install is incomplete');
  for (const sk of externalSkills) {
    if (installOneExternal(sk)) installedExternal.push(sk);
    else failedExternal.push(sk);
  }
  if (failedExternal.length) {
    warn(`${failedExternal.length} skill(s) failed. The installer continues so you don't lose`);
    warn('the rest of the install. Review suggestions above and run manually if needed.');
  }
}

// ---------- Install rules ----------
info('Installing rules...');
fs.mkdirSync(path.join(RULES_DIR, 'stacks'), { recursive: true });

for (const f of CORE_RULES) {
  const src = path.join(REPO_DIR, 'claude-rules', lang, f);
  const dest = path.join(RULES_DIR, f);
  backupIfExists(dest, TS);
  fs.copyFileSync(src, dest);
}

const stacksDir = path.join(REPO_DIR, 'claude-rules', 'stacks');
const stackFiles = fs.readdirSync(stacksDir).filter((f) => f.endsWith('.md'));
for (const fname of stackFiles) {
  const dest = path.join(RULES_DIR, 'stacks', fname);
  backupIfExists(dest, TS);
  fs.copyFileSync(path.join(stacksDir, fname), dest);
}
ok('Rules installed');

// ---------- Install/merge CLAUDE.md ----------
info('Setting up CLAUDE.md...');
let templateBody = fs.readFileSync(path.join(REPO_DIR, 'CLAUDE.md.template'), 'utf8');
if (projectScopeRewrite) {
  // Rewrite import paths for project scope (~/.claude/rules → .claude/rules).
  templateBody = templateBody.replaceAll('@~/.claude/rules', '@.claude/rules');
}
const block = wrapManagedBlock(templateBody);

if (exists(CLAUDE_MD)) {
  backupIfExists(CLAUDE_MD, TS);
  let content = fs.readFileSync(CLAUDE_MD, 'utf8');
  if (hasManagedBlock(content)) {
    content = stripManagedBlock(content);
    info('Removed previous managed block(s) for clean re-install');
  }
  content = content.replace(/\n+$/, '');
  const merged = content.length ? `${content}\n\n${block}` : block;
  fs.writeFileSync(CLAUDE_MD, merged);
  ok('Managed block written to existing CLAUDE.md');
} else {
  fs.mkdirSync(path.dirname(CLAUDE_MD), { recursive: true });
  fs.writeFileSync(CLAUDE_MD, block);
  ok(`Created ${CLAUDE_MD}`);
}

// ---------- Install skills ----------
info(`Installing skills to ${SKILLS_DIR}...`);
fs.mkdirSync(SKILLS_DIR, { recursive: true });

const installedSkillDirs = [];
const skillsSrc = path.join(REPO_DIR, 'skills');
for (const entry of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const skillName = entry.name;
  const dest = path.join(SKILLS_DIR, skillName);
  backupIfExists(dest, TS);
  copyRecursive(path.join(skillsSrc, skillName), dest);
  chmodExecAll(dest); // make any shipped .sh executable (POSIX only)
  installedSkillDirs.push(dest);
  ok(`Skill installed: ${skillName}`);
}

// Bundle a self-contained adopt engine into the adopt-existing-project skill so
// it can run without knowing the clone path (shared logic with update.mjs).
if (bundleAdoptEngine(SKILLS_DIR, REPO_DIR)) {
  ok('Bundled self-contained adopt engine into adopt-existing-project skill');
}

// ---------- Harden: block agents from reading secret files ----------
// setup-secrets keeps API keys out of the AI conversation — but that only holds
// if the agent never reads the secret file afterwards. Advisory text in a skill
// is not enough (it can be ignored), so we install a HARD guard: permission
// deny-rules that stop Claude Code's Read/Bash tools from opening .env files and
// private keys. The setup-secrets script itself keeps working — it reads the
// file in its own Node process, not through a tool call the rules apply to.
const SECRET_DENY = [
  'Read(./.env)',
  'Read(./.env.*)',
  'Read(**/.env)',
  'Read(**/.env.*)',
  'Read(**/*.pem)',
  'Read(**/id_rsa)',
  'Read(**/id_ed25519)',
  'Bash(printenv:*)',
];
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
const settingsOnDisk = exists(SETTINGS);
// Read the prior manifest once (not yet overwritten at this point) to carry two
// facts across re-installs:
//   - settings_existed_before: a re-run would otherwise see the file WE created
//     and flip this to true, making uninstall keep a file we own.
//   - prior-owned deny rules: on a re-run nothing is "newly added" (already
//     present), so without carry-forward the manifest would lose track of which
//     rules are ours and uninstall would leave them behind.
let priorManifest = '';
if (exists(MANIFEST)) priorManifest = fs.readFileSync(MANIFEST, 'utf8');
const priorLine = (key) => {
  const l = priorManifest.split('\n').find((x) => x.startsWith(`${key}=`));
  return l ? l.slice(key.length + 1) : undefined;
};
const settingsExistedBefore = priorManifest
  ? priorLine('settings_existed_before') === 'true'
  : settingsOnDisk;
const priorOwned = priorManifest
  .split('\n')
  .filter((l) => l.startsWith('settings_deny_added:'))
  .map((l) => l.slice('settings_deny_added:'.length));

let settingsDenyOwned = []; // the full set of deny rules WE are responsible for
let settingsTouched = false;
{
  info('Hardening secret access (settings.json deny rules)...');
  let settings = {};
  let parseOk = true;
  if (settingsOnDisk) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
      if (typeof settings !== 'object' || settings === null) throw new Error('not an object');
    } catch {
      parseOk = false;
      warn(`Could not parse ${SETTINGS}; leaving it untouched (skipping deny rules).`);
    }
  }
  if (parseOk) {
    if (settingsOnDisk) backupIfExists(SETTINGS, TS);
    if (typeof settings.permissions !== 'object' || settings.permissions === null) {
      settings.permissions = {};
    }
    if (!Array.isArray(settings.permissions.deny)) settings.permissions.deny = [];
    const newlyAdded = [];
    for (const rule of SECRET_DENY) {
      if (!settings.permissions.deny.includes(rule)) {
        settings.permissions.deny.push(rule);
        newlyAdded.push(rule);
      }
    }
    // We own a rule if we added it now OR on a prior run (carried via priorOwned).
    // Rules the user had before our first install are never in priorOwned and are
    // never newly-added, so uninstall will not strip a user's own rule.
    settingsDenyOwned = Array.from(new Set([...priorOwned, ...newlyAdded])).filter((r) =>
      SECRET_DENY.includes(r)
    );
    fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
    fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');
    settingsTouched = true;
    if (newlyAdded.length) ok(`Added ${newlyAdded.length} secret-file deny rule(s) to settings.json`);
    else ok('Secret-file deny rules already present');
  }
}

// ---------- Write manifest ----------
info('Writing manifest...');
const manifestLines = [
  '# project-starter install manifest (do not edit by hand)',
  'version=1',
  `project_starter_version=${VERSION}`,
  `scope=${scope}`,
  `lang=${lang}`,
  `installed_at=${isoUtc()}`,
  `claude_md_existed_before=${preExistingClaudeMd}`,
  `claude_md_path=${CLAUDE_MD}`,
  `rules_dir=${RULES_DIR}`,
  `skills_dir=${SKILLS_DIR}`,
];
for (const f of CORE_RULES) {
  manifestLines.push(`file:${path.join(RULES_DIR, f)}`);
}
for (const fname of stackFiles) {
  manifestLines.push(`file:${path.join(RULES_DIR, 'stacks', fname)}`);
}
for (const d of installedSkillDirs) {
  manifestLines.push(`dir:${d}`);
}
if (settingsTouched) {
  manifestLines.push(`settings_path=${SETTINGS}`);
  manifestLines.push(`settings_existed_before=${settingsExistedBefore}`);
  for (const r of settingsDenyOwned) manifestLines.push(`settings_deny_added:${r}`);
}
manifestLines.push(`skill_bundle=${bundle}`);
for (const sk of installedExternal) manifestLines.push(`external_skill:${sk}`);
for (const sk of failedExternal) manifestLines.push(`external_skill_failed:${sk}`);
fs.writeFileSync(MANIFEST, manifestLines.join('\n') + '\n');
chmodSecret(MANIFEST);
ok('Manifest written');

// ---------- Done ----------
console.log('');
ok(`project-starter installation complete (scope: ${scope})`);
console.log('');
console.log('Next steps:');
console.log(`  1. Review ${CLAUDE_MD}`);
if (scope === 'project') {
  console.log("  2. From this directory, run 'claude' — rules and skill load automatically");
  console.log('  3. Project-scoped install does NOT affect ~/.claude/ or ~/.agents/');
} else {
  console.log("  2. From any directory, run 'claude' — rules and skill load globally");
}
console.log('');
if (installedExternal.length) {
  console.log(`  4. External skills installed: ${installedExternal.length} (run 'npx skills list -g' to see)`);
}
if (failedExternal.length) {
  warn(`  ! ${failedExternal.length} external skill(s) failed — see warnings above`);
}
console.log('');
console.log('To uninstall:');
if (IS_WIN) {
  console.log(`  PowerShell:  $env:SCOPE="${scope}"; node scripts/uninstall.mjs`);
  console.log(`  cmd.exe:     set SCOPE=${scope} && node scripts/uninstall.mjs`);
} else {
  console.log(`  SCOPE=${scope} node scripts/uninstall.mjs`);
}
console.log('    (add REMOVE_EXTERNAL=1 to also remove external skills via npx skills)');
