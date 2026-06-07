// scripts/lib/consistency.test.mjs
// SSOT 드리프트 가드: registry.mjs / 파일시스템을 단일 원천으로 두고,
// 마크다운·템플릿 사본이 거기서 벗어나면 실패한다. (방금의 README.ko 버그·stale 템플릿 류 방지)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_RULES, CAPABILITIES, ALL_SKILLS, VERSION } from './registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const mdNames = (dir) =>
  fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
const sorted = (a) => [...a].sort();

test('CAPABILITIES === claude-rules/capabilities/*.md filenames', () => {
  assert.deepEqual(sorted(CAPABILITIES), sorted(mdNames('claude-rules/capabilities')));
});

test('CORE_RULES files exist in claude-rules/en and ko', () => {
  for (const lang of ['en', 'ko']) {
    for (const f of CORE_RULES) {
      assert.ok(fs.existsSync(path.join(ROOT, 'claude-rules', lang, f)), `missing claude-rules/${lang}/${f}`);
    }
  }
});

test('CLAUDE.md.template core imports === CORE_RULES', () => {
  const tpl = read('CLAUDE.md.template');
  // top-level core imports only (exclude stacks/ and capabilities/ which contain a slash)
  const imported = [...tpl.matchAll(/@~\/\.claude\/rules\/([a-z-]+\.md)/g)].map((m) => m[1]);
  assert.deepEqual(sorted(imported), sorted(CORE_RULES));
});

test('CLAUDE.md.template "Available:" stacks === claude-rules/stacks/*.md', () => {
  const tpl = read('CLAUDE.md.template');
  const line = tpl.split('\n').find((l) => l.startsWith('Available:'));
  assert.ok(line, 'no "Available:" line in CLAUDE.md.template');
  const listed = [...line.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]);
  assert.deepEqual(sorted(listed), sorted(mdNames('claude-rules/stacks')));
});

test('skill IDs in docs use the registry owner/repo (no drift)', () => {
  const docs = ['README.md', 'README.ko.md', 'claude-rules/en/skill-activation.md', 'claude-rules/ko/skill-activation.md'];
  const texts = docs.map((d) => [d, read(d)]);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const spec of ALL_SKILLS) {
    const at = spec.lastIndexOf('@');
    const ownerRepo = spec.slice(0, at);
    const name = spec.slice(at + 1);
    const re = new RegExp(`([\\w.-]+\\/[\\w.-]+)@${esc(name)}\\b`, 'g');
    for (const [doc, text] of texts) {
      for (const m of text.matchAll(re)) {
        assert.equal(m[1], ownerRepo, `${doc}: "${m[0]}" should use "${ownerRepo}" (registry)`);
      }
    }
  }
});

test('registry VERSION === package.json version', () => {
  assert.equal(VERSION, JSON.parse(read('package.json')).version);
});

test('CHANGELOG.md latest version === package.json version', () => {
  const m = read('CHANGELOG.md').match(/^## \[(\d+\.\d+\.\d+)\]/m);
  assert.ok(m, 'no version heading in CHANGELOG.md');
  assert.equal(m[1], VERSION);
});
