#!/usr/bin/env node
// project-starter — cross-platform verification harness (macOS / Linux / Windows)
//
// Runs the install / re-install / uninstall lifecycle (project + global scope)
// against sandboxed temp directories and asserts parity with the documented
// behaviour, then prints the checks that cannot be automated.
//
// Usage (from anywhere — the repo just needs to be on disk):
//   node scripts/verify.mjs
//
// OS-specific assertions branch on process.platform: owner-only file perms are
// checked via `icacls` on Windows and the mode bits (0600) on POSIX.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IS_WIN = process.platform === 'win32';

const USE_COLOR = !process.env.NO_COLOR && process.stdout.isTTY;
const c = (code, s) => (USE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);

let total = 0;
let passed = 0;
let failed = 0;

function section(t) {
  console.log('');
  console.log(c('1;36', `== ${t} ==`));
}
function assert(name, cond, detail = '') {
  total += 1;
  if (cond) {
    console.log(`  ${c('1;32', 'PASS')}  ${name}`);
    passed += 1;
  } else {
    console.log(`  ${c('1;31', 'FAIL')}  ${name}${detail ? `  — ${detail}` : ''}`);
    failed += 1;
  }
}

// Run a Node script as a child with extra env vars (and optional stdin / cwd).
function runNode(envVars, scriptRel, { stdin, cwd } = {}) {
  const res = spawnSync(process.execPath, [path.join(REPO_ROOT, scriptRel)], {
    env: { ...process.env, ...envVars },
    input: stdin,
    cwd,
    encoding: 'utf8',
  });
  return { code: res.status, output: `${res.stdout || ''}${res.stderr || ''}` };
}

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ps-verify-'));
}
function rmTmp(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}
function countMatches(file, needle) {
  const content = read(file);
  if (!content) return -1;
  return content.split(needle).length - 1;
}

// Owner-only permission check, per platform.
function ownerOnly(file) {
  if (IS_WIN) {
    const r = spawnSync('icacls', [file], { encoding: 'utf8' });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    return { ok: out.includes(os.userInfo().username), detail: out.split('\n')[0]?.trim() };
  }
  const mode = fs.statSync(file).mode & 0o777;
  return { ok: mode === 0o600, detail: `0${mode.toString(8)}` };
}

console.log(c('1;37', 'project-starter cross-platform verification'));
console.log(`Repo root: ${REPO_ROOT}`);
console.log(`Platform:  ${process.platform} (node ${process.version})`);

// ---------------------------------------------------------------------------
section('Pre-flight');
assert(`node >= 20 (found ${process.version})`, parseInt(process.versions.node, 10) >= 20);
const hasGit = spawnSync(IS_WIN ? 'where' : 'which', ['git'], { stdio: 'ignore' }).status === 0;
assert('git on PATH (needed for bootstrap, not for this test)', hasGit);

// ---------------------------------------------------------------------------
section('Static checks');
for (const rel of [
  'scripts/lib/util.mjs',
  'scripts/install.mjs',
  'scripts/uninstall.mjs',
  'skills/setup-secrets/setup-secrets.mjs',
]) {
  const r = spawnSync(process.execPath, ['--check', path.join(REPO_ROOT, rel)], { encoding: 'utf8' });
  assert(`node --check ${rel}`, r.status === 0, (r.stderr || '').split('\n')[0]);
}
// bootstrap.ps1 syntax can only be parsed by PowerShell — attempt on Windows.
if (IS_WIN) {
  const ps = path.join(REPO_ROOT, 'scripts', 'bootstrap.ps1');
  const cmd = `$null=[System.Management.Automation.Language.Parser]::ParseFile('${ps}',[ref]$null,[ref]$null)`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', cmd], { encoding: 'utf8' });
  assert('bootstrap.ps1 parses', r.status === 0, (r.stderr || '').split('\n')[0]);
} else {
  assert('bootstrap.ps1 present (syntax check skipped — no PowerShell)', fs.existsSync(path.join(REPO_ROOT, 'scripts', 'bootstrap.ps1')));
}

// ---------------------------------------------------------------------------
section('Project scope: install / re-install / uninstall');
{
  const T = mkTmp();
  try {
    const claudeMd = path.join(T, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, '# Existing Project Marker\n\nSome content.');
    fs.writeFileSync(path.join(T, '.gitignore'), '.env.local\n');

    const envP = {
      SKIP_PREREQ: '1',
      SCOPE: 'project',
      PROJECT_ROOT: T,
      LANG_CHOICE: 'en',
      SKILL_BUNDLE: 'minimal',
    };
    const r = runNode(envP, 'scripts/install.mjs');
    assert('install exits 0', r.code === 0, r.output.split('\n').slice(-3).join(' | '));

    const manifest = path.join(T, '.claude', '.project-starter-manifest');
    assert('rules/language.md created', fs.existsSync(path.join(T, '.claude', 'rules', 'language.md')));
    assert('rules/stacks populated', fs.existsSync(path.join(T, '.claude', 'rules', 'stacks')) &&
      fs.readdirSync(path.join(T, '.claude', 'rules', 'stacks')).some((f) => f.endsWith('.md')));
    assert('skills copied (setup-secrets)', fs.existsSync(path.join(T, '.claude', 'skills', 'setup-secrets', 'setup-secrets.mjs')));
    assert('manifest written', fs.existsSync(manifest));
    assert('original CLAUDE.md content preserved', read(claudeMd).includes('Existing Project Marker'));
    assert('managed block present once', countMatches(claudeMd, '<!-- BEGIN project-starter -->') === 1);
    assert('project-scope import rewrite (.claude/rules)', read(claudeMd).includes('@.claude/rules'));
    assert('no global (~) import path leaked', !read(claudeMd).includes('@~/.claude/rules'));

    const perm = ownerOnly(manifest);
    assert('manifest restricted to owner', perm.ok, perm.detail);

    const r2 = runNode(envP, 'scripts/install.mjs');
    assert('re-install exits 0', r2.code === 0);
    assert('still exactly one managed block after re-install', countMatches(claudeMd, '<!-- BEGIN project-starter -->') === 1);

    const r3 = runNode({ SCOPE: 'project', PROJECT_ROOT: T }, 'scripts/uninstall.mjs', { stdin: 'y\n' });
    assert('uninstall exits 0', r3.code === 0, r3.output.split('\n').slice(-3).join(' | '));
    assert('manifest removed', !fs.existsSync(manifest));
    assert('rules removed', !fs.existsSync(path.join(T, '.claude', 'rules', 'language.md')));
    assert('CLAUDE.md kept (pre-existed)', fs.existsSync(claudeMd));
    assert('managed block stripped on uninstall', countMatches(claudeMd, '<!-- BEGIN project-starter -->') === 0);
    assert('original content still intact', read(claudeMd).includes('Existing Project Marker'));
  } finally {
    rmTmp(T);
  }
}

// ---------------------------------------------------------------------------
section('Global scope: install / uninstall (sandboxed)');
{
  const G = mkTmp();
  try {
    const CLAUDE_DIR = path.join(G, '.claude');
    const AGENTS_DIR = path.join(G, '.agents');
    const envG = {
      SKIP_PREREQ: '1',
      SCOPE: 'global',
      CLAUDE_DIR,
      AGENTS_DIR,
      LANG_CHOICE: 'ko',
      SKILL_BUNDLE: 'minimal',
    };
    const r = runNode(envG, 'scripts/install.mjs');
    assert('global install exits 0', r.code === 0, r.output.split('\n').slice(-3).join(' | '));
    const gClaudeMd = path.join(CLAUDE_DIR, 'CLAUDE.md');
    assert('rules in CLAUDE_DIR', fs.existsSync(path.join(CLAUDE_DIR, 'rules', 'language.md')));
    assert('skills in AGENTS_DIR', fs.existsSync(path.join(AGENTS_DIR, 'skills', 'setup-secrets')));
    assert('global keeps ~/.claude/rules import (no rewrite)', read(gClaudeMd).includes('@~/.claude/rules'));

    const r2 = runNode({ SCOPE: 'global', CLAUDE_DIR, AGENTS_DIR }, 'scripts/uninstall.mjs', { stdin: 'y\n' });
    assert('global uninstall exits 0', r2.code === 0);
    assert('global manifest removed', !fs.existsSync(path.join(CLAUDE_DIR, '.project-starter-manifest')));
  } finally {
    rmTmp(G);
  }
}

// ---------------------------------------------------------------------------
section('setup-secrets: validate (non-interactive)');
{
  const S = mkTmp();
  try {
    fs.writeFileSync(path.join(S, '.gitignore'), '.env.local\n');
    fs.writeFileSync(path.join(S, '.env.local'), 'ANTHROPIC_API_KEY=sk-ant-abc123\nVERCEL_TOKEN=short\n');
    const r = runNode({ SERVICE: 'validate' }, 'skills/setup-secrets/setup-secrets.mjs', { cwd: S });
    assert('validate exits 0', r.code === 0, r.output.split('\n').slice(-3).join(' | '));
    assert('validate flags good key OK', /ANTHROPIC_API_KEY OK/.test(r.output));
    assert('validate flags bad key', /VERCEL_TOKEN format unexpected/.test(r.output));
  } finally {
    rmTmp(S);
  }
}

// ---------------------------------------------------------------------------
section('Summary');
console.log('');
console.log(c(failed === 0 ? '1;32' : '1;31', `  ${passed}/${total} checks passed, ${failed} failed`));
console.log('');
console.log(c('1;33', 'Manual checks still required (cannot be automated):'));
console.log('  1) Hidden secret input — run interactively in your real terminal:');
console.log(`       cd <a temp project with .env.local in .gitignore>`);
if (IS_WIN) {
  console.log(`       $env:SERVICE="custom"; node "${path.join(REPO_ROOT, 'skills', 'setup-secrets', 'setup-secrets.mjs')}"`);
} else {
  console.log(`       SERVICE=custom node "${path.join(REPO_ROOT, 'skills', 'setup-secrets', 'setup-secrets.mjs')}"`);
}
console.log('     Confirm the value is NOT echoed while typing, then masked on success,');
console.log('     and that the .env.local ends up owner-only.');
console.log('  2) Remote bootstrap (only after pushing changes to GitHub main):');
console.log('       bash:       bash <(curl -fsSL .../scripts/bootstrap.sh)');
console.log('       PowerShell: irm .../scripts/bootstrap.ps1 | iex');

process.exit(failed > 0 ? 1 : 0);
