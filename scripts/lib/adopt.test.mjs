import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAdopt } from '../adopt.mjs';

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function mkRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-adopt-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

function snapshot(dir) {
  // 소스 코드 파일들의 (경로→내용) 맵. .claude/ 와 CLAUDE.md 는 제외(우리가 만드는 것).
  const out = {};
  const walk = (d, base = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = path.join(base, e.name);
      if (rel.startsWith('.claude') || rel === 'CLAUDE.md') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full, rel);
      else out[rel] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(dir);
  return out;
}

test('runAdopt: does not modify source code (0-diff)', () => {
  const dir = mkRepo({
    'package.json': { dependencies: { next: '15', '@prisma/client': '5' } },
    'src/index.ts': 'export const x = 1;\n',
  });
  const before = snapshot(dir);
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  const after = snapshot(dir);
  assert.deepEqual(after, before);
});

test('runAdopt: vendors rules self-contained (no @~/ imports)', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { next: '15' } } });
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'rules', 'language.md')));
  const claudeMd = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.doesNotMatch(claudeMd, /@~\/\.claude/);
  assert.match(claudeMd, /@\.claude\/rules\/language\.md/);
});

test('runAdopt: writes gap report flagging prisma as generic', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { '@prisma/client': '5' } } });
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  const report = fs.readFileSync(path.join(dir, '.claude', 'adopt-report.md'), 'utf8');
  assert.match(report, /prisma/);
});

test('runAdopt: idempotent (second run adds no new diff)', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { next: '15' } } });
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  const md1 = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  const md2 = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.equal(md2, md1);
});

test('runAdopt: preserves existing CLAUDE.md user content', () => {
  const dir = mkRepo({
    'package.json': { dependencies: { next: '15' } },
    'CLAUDE.md': '# My Project\n\nCustom user notes.\n',
  });
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  const md = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /Custom user notes\./);
  assert.match(md, /BEGIN project-starter/);
});

test('runAdopt dry-run: read-only, writes nothing', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { next: '15' } } });
  const res = runAdopt(dir, { sourceRoot: SOURCE_ROOT, mode: 'dry-run' });
  assert.equal(res.mode, 'dry-run');
  assert.ok(res.report.length > 0);
  assert.ok(!fs.existsSync(path.join(dir, '.claude')));
  assert.ok(!fs.existsSync(path.join(dir, 'CLAUDE.md')));
});

test('runAdopt verify: false before apply, true after', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { next: '15', '@clerk/nextjs': '5' } } });
  const before = runAdopt(dir, { sourceRoot: SOURCE_ROOT, mode: 'verify' });
  assert.equal(before.verification.ok, false);
  runAdopt(dir, { sourceRoot: SOURCE_ROOT, mode: 'apply' });
  const after = runAdopt(dir, { sourceRoot: SOURCE_ROOT, mode: 'verify' });
  assert.equal(after.verification.ok, true);
  assert.deepEqual(after.verification.missing, []);
});
