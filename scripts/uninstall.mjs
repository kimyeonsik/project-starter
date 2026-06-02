#!/usr/bin/env node
// project-starter uninstaller (manifest-based, cross-platform)
//
// Reads the manifest written at install time and removes exactly what the
// installer created. The user's pre-existing content is preserved:
//   - If CLAUDE.md existed before install → only the managed block is stripped
//   - If CLAUDE.md was created by install → the file is removed when empty
//   - Files not listed in the manifest are NEVER touched
//
// Scopes:
//   project (default) — <PROJECT_ROOT>/.claude/  and  <PROJECT_ROOT>/CLAUDE.md
//   global            — ~/.claude/  and  ~/.agents/skills/
//
// Env vars:
//   SCOPE           "project" or "global"; prompts if unset
//   PROJECT_ROOT    For SCOPE=project, the install root (default: cwd)
//   PURGE_BACKUPS   Set "1" to delete *.backup-* files in install dirs
//   REMOVE_EXTERNAL Set "1" to also remove external skills via npx skills

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  info,
  ok,
  warn,
  err,
  which,
  runOk,
  exists,
  stripManagedBlock,
  hasManagedBlock,
  prompt,
  confirm,
} from './lib/util.mjs';

const env = process.env;

function fail(msg) {
  err(msg);
  process.exit(1);
}

function rmFile(p) {
  try {
    fs.rmSync(p, { force: true });
  } catch {
    /* ignore */
  }
}
function rmDir(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
function isEmptyDir(p) {
  try {
    return fs.readdirSync(p).length === 0;
  } catch {
    return false;
  }
}
function rmdirIfEmpty(p) {
  if (exists(p) && isEmptyDir(p)) {
    try {
      fs.rmdirSync(p);
      return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

// ---------- Scope ----------
let scope = env.SCOPE || '';
if (!scope) {
  console.log('Uninstall scope:');
  console.log('  1) Project (default) — remove from current directory');
  console.log('  2) Global            — remove from ~/.claude and ~/.agents');
  const choice = await prompt('Choice [1]: ', '1');
  scope = choice === '2' ? 'global' : 'project';
}
if (scope !== 'project' && scope !== 'global') {
  fail(`Invalid SCOPE: ${scope} (must be 'project' or 'global')`);
}

const HOME = os.homedir();
let CLAUDE_DIR, RULES_DIR, SKILLS_DIR, CLAUDE_MD, PROJECT_ROOT;
if (scope === 'global') {
  CLAUDE_DIR = env.CLAUDE_DIR || path.join(HOME, '.claude');
  RULES_DIR = path.join(CLAUDE_DIR, 'rules');
  SKILLS_DIR = path.join(env.AGENTS_DIR || path.join(HOME, '.agents'), 'skills');
  CLAUDE_MD = path.join(CLAUDE_DIR, 'CLAUDE.md');
} else {
  PROJECT_ROOT = env.PROJECT_ROOT || process.cwd();
  CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');
  RULES_DIR = path.join(CLAUDE_DIR, 'rules');
  SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
  CLAUDE_MD = path.join(PROJECT_ROOT, 'CLAUDE.md');
}

const MANIFEST = path.join(CLAUDE_DIR, '.project-starter-manifest');
const PURGE_BACKUPS = env.PURGE_BACKUPS === '1';
const REMOVE_EXTERNAL = env.REMOVE_EXTERNAL === '1';

// ---------- Strip managed block helper ----------
function stripManagedBlockFile(file, preExisting) {
  if (!exists(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  if (!hasManagedBlock(content)) return;
  content = stripManagedBlock(content);
  fs.writeFileSync(file, content);
  ok(`Stripped managed block(s) from ${file}`);
  // Remove if the installer created it and it's now empty/whitespace.
  if (preExisting === 'false' && content.replace(/\s/g, '').length === 0) {
    rmFile(file);
    ok(`Removed ${file} (created by installer, now empty)`);
  }
}

// ---------- Purge backups helper ----------
function purgeBackups() {
  info('Purging timestamped backups (*.backup-*)...');
  const parents = [CLAUDE_DIR, RULES_DIR, path.join(RULES_DIR, 'stacks'), SKILLS_DIR];
  if (scope === 'project') parents.push(PROJECT_ROOT);
  for (const parent of parents) {
    if (!exists(parent)) continue;
    let entries;
    try {
      entries = fs.readdirSync(parent);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name.includes('.backup-')) {
        const full = path.join(parent, name);
        rmDir(full);
        ok(`Purged: ${full}`);
      }
    }
  }
}

// ---------- Main ----------
if (exists(MANIFEST)) {
  const manifest = fs.readFileSync(MANIFEST, 'utf8');
  const lines = manifest.split('\n');
  const get = (key) => {
    const l = lines.find((x) => x.startsWith(`${key}=`));
    return l ? l.slice(key.length + 1) : '';
  };
  const preExisting = get('claude_md_existed_before') || 'true';

  info(`Scope: ${scope} (mode: manifest-based)`);
  info(`Manifest: ${MANIFEST}`);
  info(`CLAUDE.md existed before install: ${preExisting}`);

  const fileCount = lines.filter((l) => l.startsWith('file:')).length;
  const dirCount = lines.filter((l) => l.startsWith('dir:')).length;
  info(`Manifest contents: ${fileCount} file(s), ${dirCount} dir(s)`);
  if (PURGE_BACKUPS) warn('Will also purge *.backup-* files');
  console.log('');

  if (!(await confirm('Proceed?'))) {
    console.log('Cancelled.');
    process.exit(0);
  }

  // Remove files and dirs listed in the manifest.
  for (const line of lines) {
    if (line.startsWith('file:')) {
      const p = line.slice('file:'.length);
      if (exists(p)) {
        rmFile(p);
        ok(`Removed file: ${p}`);
      }
    } else if (line.startsWith('dir:')) {
      const p = line.slice('dir:'.length);
      if (exists(p)) {
        rmDir(p);
        ok(`Removed dir:  ${p}`);
      }
    }
  }

  // Clean empty dirs we created.
  for (const d of [path.join(RULES_DIR, 'stacks'), RULES_DIR, SKILLS_DIR]) {
    if (rmdirIfEmpty(d)) ok(`Removed empty ${d}`);
  }

  // CLAUDE.md handling.
  stripManagedBlockFile(CLAUDE_MD, preExisting);

  // External skills — only touched when REMOVE_EXTERNAL=1.
  const externalSkills = lines
    .filter((l) => l.startsWith('external_skill:'))
    .map((l) => l.slice('external_skill:'.length));
  if (REMOVE_EXTERNAL) {
    if (which('npx')) {
      for (const sk of externalSkills) {
        info(`Removing external skill: ${sk}`);
        if (runOk('npx', ['--yes', 'skills', 'remove', sk, '-g', '-y'])) {
          ok(`  removed: ${sk}`);
        } else {
          warn(`  failed to remove: ${sk} (may already be gone)`);
        }
      }
    } else {
      warn('REMOVE_EXTERNAL=1 set but npx not available; skipped external skill removal');
    }
  } else if (externalSkills.length) {
    info(
      `External skills preserved (${externalSkills.length}). Add REMOVE_EXTERNAL=1 to remove via npx skills.`
    );
  }

  // Remove the secret-file deny rules we added to settings.json (and nothing else).
  const settingsPath = get('settings_path');
  if (settingsPath && exists(settingsPath)) {
    const denyAdded = lines
      .filter((l) => l.startsWith('settings_deny_added:'))
      .map((l) => l.slice('settings_deny_added:'.length));
    const settingsExistedBefore = get('settings_existed_before');
    try {
      const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (s && s.permissions && Array.isArray(s.permissions.deny)) {
        s.permissions.deny = s.permissions.deny.filter((r) => !denyAdded.includes(r));
        if (s.permissions.deny.length === 0) delete s.permissions.deny;
        if (Object.keys(s.permissions).length === 0) delete s.permissions;
      }
      if (settingsExistedBefore === 'false' && Object.keys(s).length === 0) {
        rmFile(settingsPath);
        ok(`Removed ${settingsPath} (created by installer, now empty)`);
      } else {
        fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');
        ok(`Removed secret-file deny rules from ${settingsPath}`);
      }
    } catch {
      warn(`Could not update ${settingsPath}; left as-is.`);
    }
  }

  // Remove manifest itself.
  rmFile(MANIFEST);
  ok('Removed manifest');

  // Project scope: clean empty .claude/.
  if (scope === 'project' && rmdirIfEmpty(CLAUDE_DIR)) {
    ok(`Removed empty ${CLAUDE_DIR}`);
  }
} else {
  // ---------- Fallback for installs that predate the manifest ----------
  warn(`No manifest at ${MANIFEST}`);
  warn("Falling back to known-paths cleanup (legacy install). The installer's");
  warn('earlier versions did not record what they created, so this path can only');
  warn('remove known file names — anything custom under those paths is preserved.');
  console.log('');
  if (!(await confirm('Proceed with fallback cleanup?'))) {
    console.log('Cancelled.');
    process.exit(0);
  }

  for (const f of ['language.md', 'agent-teams.md', 'skill-activation.md']) {
    const p = path.join(RULES_DIR, f);
    if (exists(p)) {
      rmFile(p);
      ok(`Removed ${p}`);
    }
  }
  const stacks = path.join(RULES_DIR, 'stacks');
  if (exists(stacks)) {
    rmDir(stacks);
    ok(`Removed ${stacks}/`);
  }
  for (const sk of ['new-project-bootstrap', 'setup-secrets']) {
    const p = path.join(SKILLS_DIR, sk);
    if (exists(p)) {
      rmDir(p);
      ok(`Removed skill: ${sk}`);
    }
  }
  for (const d of [RULES_DIR, SKILLS_DIR]) rmdirIfEmpty(d);
  // Without a manifest we can't know if CLAUDE.md pre-existed; safest: keep file.
  stripManagedBlockFile(CLAUDE_MD, 'true');
  if (scope === 'project') rmdirIfEmpty(CLAUDE_DIR);
}

// ---------- Optional: purge backups ----------
if (PURGE_BACKUPS) {
  purgeBackups();
} else {
  warn('Backups preserved. To also delete them: set PURGE_BACKUPS=1 and re-run uninstall.');
}

ok(`Uninstall complete (scope: ${scope})`);
