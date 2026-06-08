// Tests for backup placement + identical-tree detection.
// Regression guard for the duplicate-skill bug: backups must NOT land as
// siblings inside a scanned dir (the skill loader would rediscover them), and
// re-installing identical content must not churn new backups.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathsIdentical, destHasIdenticalSources, backupIfExists } from './util.mjs';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ps-util-'));
}

test('pathsIdentical: byte-identical files → true, differing → false', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'a'), 'hello');
  fs.writeFileSync(path.join(d, 'b'), 'hello');
  fs.writeFileSync(path.join(d, 'c'), 'world');
  assert.equal(pathsIdentical(path.join(d, 'a'), path.join(d, 'b')), true);
  assert.equal(pathsIdentical(path.join(d, 'a'), path.join(d, 'c')), false);
});

test('pathsIdentical: identical dir trees → true, differing → false', () => {
  const d = tmp();
  const mk = (root, body) => {
    fs.mkdirSync(path.join(root, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(root, 'SKILL.md'), 'name: foo');
    fs.writeFileSync(path.join(root, 'sub', 'x.txt'), body);
  };
  const a = path.join(d, 'a'); const b = path.join(d, 'b'); const c = path.join(d, 'c');
  mk(a, 'same'); mk(b, 'same'); mk(c, 'different');
  assert.equal(pathsIdentical(a, b), true);
  assert.equal(pathsIdentical(a, c), false);
});

test('pathsIdentical: extra entry on one side → false', () => {
  const d = tmp();
  const a = path.join(d, 'a'); const b = path.join(d, 'b');
  fs.mkdirSync(a); fs.mkdirSync(b);
  fs.writeFileSync(path.join(a, 'x'), '1');
  fs.writeFileSync(path.join(b, 'x'), '1');
  fs.writeFileSync(path.join(b, 'y'), '2');
  assert.equal(pathsIdentical(a, b), false);
});

test('pathsIdentical: missing path → false', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'a'), 'x');
  assert.equal(pathsIdentical(path.join(d, 'a'), path.join(d, 'nope')), false);
});

test('destHasIdenticalSources: dest may have EXTRA files (bundled engine) and still match', () => {
  const d = tmp();
  const src = path.join(d, 'src');
  const dest = path.join(d, 'dest');
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(path.join(src, 'SKILL.md'), 'name: adopt');
  // dest = copy of src PLUS a bundled engine/ dir (added post-copy by the installer)
  fs.mkdirSync(path.join(dest, 'engine', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'SKILL.md'), 'name: adopt');
  fs.writeFileSync(path.join(dest, 'engine', 'scripts', 'adopt.mjs'), '// bundled');
  // every src path is present + identical in dest → up to date, skip re-copy
  assert.equal(destHasIdenticalSources(src, dest), true);
});

test('destHasIdenticalSources: a changed src file → false (must re-copy)', () => {
  const d = tmp();
  const src = path.join(d, 'src'); const dest = path.join(d, 'dest');
  fs.mkdirSync(src); fs.mkdirSync(dest);
  fs.writeFileSync(path.join(src, 'SKILL.md'), 'name: adopt v2');
  fs.writeFileSync(path.join(dest, 'SKILL.md'), 'name: adopt v1');
  assert.equal(destHasIdenticalSources(src, dest), false);
});

test('destHasIdenticalSources: dest missing a src file → false', () => {
  const d = tmp();
  const src = path.join(d, 'src'); const dest = path.join(d, 'dest');
  fs.mkdirSync(src); fs.mkdirSync(dest);
  fs.writeFileSync(path.join(src, 'SKILL.md'), 'x');
  fs.writeFileSync(path.join(src, 'helper.mjs'), 'y');
  fs.writeFileSync(path.join(dest, 'SKILL.md'), 'x');
  assert.equal(destHasIdenticalSources(src, dest), false);
});

test('backupIfExists(backupRoot, baseDir): places copy OUTSIDE the scanned dir', () => {
  const base = tmp();
  const skillsDir = path.join(base, '.claude', 'skills');
  const skill = path.join(skillsDir, 'foo');
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, 'SKILL.md'), 'name: foo');
  const backupRoot = path.join(base, '.claude', '.project-starter-backups');

  const bak = backupIfExists(skill, '20260609-120000', backupRoot, base);

  // backup lives under backupRoot/<ts>/<relpath>, NOT as a sibling of `foo`
  assert.equal(
    bak,
    path.join(backupRoot, '20260609-120000', '.claude', 'skills', 'foo'),
  );
  assert.equal(fs.existsSync(path.join(bak, 'SKILL.md')), true);
  // crucially: no `foo.backup-*` sibling inside the scanned skills dir
  assert.deepEqual(
    fs.readdirSync(skillsDir).filter((n) => n.includes('.backup-')),
    [],
  );
  // original untouched (it's a copy, the caller overwrites it next)
  assert.equal(fs.existsSync(path.join(skill, 'SKILL.md')), true);
});

test('backupIfExists: legacy in-place when no backupRoot given', () => {
  const d = tmp();
  const f = path.join(d, 'CLAUDE.md');
  fs.writeFileSync(f, 'body');
  const bak = backupIfExists(f, '20260609-120000');
  assert.equal(bak, `${f}.backup-20260609-120000`);
  assert.equal(fs.existsSync(bak), true);
});

test('backupIfExists: missing target → null, no copy', () => {
  const d = tmp();
  assert.equal(backupIfExists(path.join(d, 'nope'), '20260609-120000'), null);
});
