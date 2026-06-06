import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeGaps, renderReport } from './gap-analysis.mjs';

const created = [];

function mkDir(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-gap-'));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

after(() => {
  for (const d of created) fs.rmSync(d, { recursive: true, force: true });
});

const DETECTED = [
  { stack: 'nextjs', capability: 'framework', ruleStatus: 'named' },
  { stack: 'prisma', capability: 'database', ruleStatus: 'generic' },
];

test('analyzeGaps: missing _team and CLAUDE.md flagged', () => {
  const dir = mkDir({}); // 빈 repo
  const gaps = analyzeGaps(dir, DETECTED);
  assert.ok(gaps.missing.includes('_team/'));
  assert.ok(gaps.missing.includes('CLAUDE.md'));
});

test('analyzeGaps: existing CLAUDE.md not flagged', () => {
  const dir = mkDir({ 'CLAUDE.md': '# x' });
  const gaps = analyzeGaps(dir, DETECTED);
  assert.ok(!gaps.missing.includes('CLAUDE.md'));
});

test('analyzeGaps: generic-rule stacks surfaced as unsupported', () => {
  const dir = mkDir({});
  const gaps = analyzeGaps(dir, DETECTED);
  assert.deepEqual(gaps.unsupportedStacks, ['prisma']);
});

test('renderReport: includes unsupported stack line', () => {
  const dir = mkDir({});
  const md = renderReport(analyzeGaps(dir, DETECTED), DETECTED);
  assert.match(md, /prisma/);
  assert.match(md, /generic/);
});

test('renderReport: missing-governance section renders for empty repo', () => {
  const dir = mkDir({});
  const md = renderReport(analyzeGaps(dir, DETECTED), DETECTED);
  assert.match(md, /누락된 거버넌스/);
  assert.match(md, /CLAUDE\.md/);
});

test('renderReport: named stack shows checkmark', () => {
  const dir = mkDir({});
  const md = renderReport(analyzeGaps(dir, DETECTED), DETECTED);
  assert.match(md, /✅/);
});
