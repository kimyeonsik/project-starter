import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeGaps, renderReport, profile, absentCapabilities } from './gap-analysis.mjs';

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

test('profile: web platform from a framework, hosting unknown', () => {
  const p = profile(DETECTED);
  assert.equal(p.platform, 'web');
  assert.equal(p.hosting, 'unknown');
});

test('profile: native platform when expo present', () => {
  const p = profile([{ stack: 'expo', capability: 'framework', ruleStatus: 'generic' }]);
  assert.equal(p.platform, 'native');
});

test('absentCapabilities: excludes present, includes empty recommendable', () => {
  const absent = absentCapabilities(DETECTED);
  assert.ok(!absent.includes('database'), 'database present → not a candidate');
  assert.ok(absent.includes('analytics'), 'analytics empty → candidate');
  assert.ok(absent.includes('payments'));
});

test('renderReport: shows profile + empty-capability candidates section', () => {
  const dir = mkDir({});
  const md = renderReport(analyzeGaps(dir, DETECTED), DETECTED);
  assert.match(md, /프로필.*platform=web/);
  assert.match(md, /빈 capability/);
  assert.match(md, /\/recommend/);
});

// ---- Plan B Task 4: in-use stack signals ----

function fixtureNext() {
  return mkDir({
    'package.json': JSON.stringify({ dependencies: { next: '15.0.0' } }),
    'app.tsx': `import 'next/link'`,
  });
}

test('analyzeGaps includes inUse signals', () => {
  const dir = fixtureNext();
  const detected = [{ stack: 'nextjs', capability: 'framework', ruleStatus: 'named' }];
  const gaps = analyzeGaps(dir, detected);
  assert.ok(Array.isArray(gaps.inUse));
  const next = gaps.inUse.find((s) => s.stack === 'nextjs');
  assert.equal(next.installedVersion, '15.0.0');
  assert.equal(next.blastRadius, 'low');
});

test('renderReport shows the in-use stack section with version + blast', () => {
  const dir = fixtureNext();
  const detected = [{ stack: 'nextjs', capability: 'framework', ruleStatus: 'named' }];
  const gaps = analyzeGaps(dir, detected);
  const md = renderReport(gaps, detected);
  assert.match(md, /기존 스택 \(적절성 점검 후보\)/);
  assert.match(md, /nextjs/);
  assert.match(md, /15\.0\.0/);
  assert.match(md, /영향범위|blast/i);
});

// ---- migration readiness ----

test('analyzeGaps includes readiness; renderReport shows 준비도 line', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'readygap-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { vitest: '2.0.0' } }));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.test.ts'), 'test("x",()=>{})');
  const detected = [{ stack: 'vitest', capability: 'test-runner', ruleStatus: 'named' }];
  const gaps = analyzeGaps(dir, detected);
  assert.ok(gaps.readiness);
  assert.equal(gaps.readiness.hasTests, true);
  const md = renderReport(gaps, detected);
  assert.match(md, /마이그레이션 준비도/);
  assert.match(md, /테스트/);
  fs.rmSync(dir, { recursive: true, force: true });
});
