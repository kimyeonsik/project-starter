// scripts/lib/update.test.mjs
// runUpdate 가 규칙을 새로고침하고 매니페스트 버전을 올리며 CLAUDE.md 관리 블록을
// (사용자 내용 보존하며) 갱신하는지 검증한다.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runUpdate } from '../update.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const created = [];
after(() => { for (const d of created) fs.rmSync(d, { recursive: true, force: true }); });

test('runUpdate refreshes stale rules, merges CLAUDE.md, bumps manifest version', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-update-'));
  created.push(dir);
  const claudeDir = path.join(dir, '.claude');
  const rulesDir = path.join(claudeDir, 'rules');
  fs.mkdirSync(path.join(rulesDir, 'stacks'), { recursive: true });
  fs.writeFileSync(path.join(rulesDir, 'language.md'), 'STALE CONTENT'); // outdated
  const manifestPath = path.join(claudeDir, '.project-starter-manifest');
  fs.writeFileSync(manifestPath, 'version=1\nproject_starter_version=0.0.1\nscope=project\nlang=en\n');
  const claudeMd = path.join(dir, 'CLAUDE.md');
  fs.writeFileSync(claudeMd, '# My Project\n\nUser notes.\n'); // existing, no managed block

  const res = runUpdate({
    rulesDir, skillsDir: null, claudeMd, manifestPath, lang: 'en', projectScope: true,
  });

  // language.md refreshed to the repo's current content
  const repoLang = fs.readFileSync(path.join(ROOT, 'claude-rules', 'en', 'language.md'), 'utf8');
  assert.equal(fs.readFileSync(path.join(rulesDir, 'language.md'), 'utf8'), repoLang);

  // manifest version bumped to current package.json version
  const pkgVer = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  const m = fs.readFileSync(manifestPath, 'utf8');
  assert.ok(m.includes(`project_starter_version=${pkgVer}`), 'manifest version not bumped');

  // CLAUDE.md gained the managed block and kept user content
  const md = fs.readFileSync(claudeMd, 'utf8');
  assert.match(md, /User notes\./);
  assert.match(md, /BEGIN project-starter/);

  assert.ok(res.changed >= 2);
});

test('runUpdate is idempotent on a fresh-from-repo install (0 changes)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-update2-'));
  created.push(dir);
  const claudeDir = path.join(dir, '.claude');
  const rulesDir = path.join(claudeDir, 'rules');
  const manifestPath = path.join(claudeDir, '.project-starter-manifest');
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(manifestPath, 'version=1\nproject_starter_version=0.0.1\nscope=project\nlang=en\n');
  const inst = { rulesDir, skillsDir: null, claudeMd: null, manifestPath, lang: 'en', projectScope: true };
  runUpdate(inst);                 // first pass copies everything
  const r2 = runUpdate(inst);      // second pass: nothing changed
  assert.equal(r2.changed, 0);
});
