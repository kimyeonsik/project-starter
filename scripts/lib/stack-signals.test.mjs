import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  matchesPkg, pickVersion, STACK_PACKAGES,
  fileImportsStack, countUsage, blastRadius, inUseSignals,
} from './stack-signals.mjs';

test('matchesPkg: exact and scope-prefix', () => {
  assert.equal(matchesPkg('next', ['next']), true);
  assert.equal(matchesPkg('next', ['drizzle-orm']), false);
  assert.equal(matchesPkg('@sentry/nextjs', ['@sentry/']), true);
  assert.equal(matchesPkg('@sentryx/x', ['@sentry/']), false);
});

test('pickVersion returns the version of the first matching dep', () => {
  const deps = { next: '15.0.0', react: '19.0.0', '@sentry/nextjs': '8.1.0' };
  assert.equal(pickVersion(deps, 'nextjs'), '15.0.0');
  assert.equal(pickVersion(deps, 'sentry'), '8.1.0');
  assert.equal(pickVersion(deps, 'drizzle'), null);
});

test('pickVersion returns null for file-only stacks (no packages)', () => {
  assert.equal(pickVersion({ anything: '1.0.0' }, 'd1'), null);
});

test('pickVersion matches stripe scope packages (@stripe/)', () => {
  assert.equal(pickVersion({ 'stripe': '14.0.0' }, 'stripe'), '14.0.0');
  assert.equal(pickVersion({ '@stripe/elements': '1.0.0' }, 'stripe'), '1.0.0');
  assert.equal(pickVersion({ '@paddle/paddle-js': '1.2.0' }, 'paddle'), '1.2.0');
});

test('STACK_PACKAGES covers the common named stacks', () => {
  for (const s of ['nextjs','drizzle','vitest','playwright','sentry','amplitude','tailwind','vercel','resend','claude-api']) {
    assert.ok(s in STACK_PACKAGES, `missing STACK_PACKAGES entry: ${s}`);
  }
});

test('fileImportsStack: ESM import, subpath, require', () => {
  assert.equal(fileImportsStack(`import x from 'next'`, 'nextjs'), true);
  assert.equal(fileImportsStack(`import {a} from "next/navigation"`, 'nextjs'), true);
  assert.equal(fileImportsStack(`const x = require('next')`, 'nextjs'), true);
  assert.equal(fileImportsStack(`import x from '@sentry/nextjs'`, 'sentry'), true);
  assert.equal(fileImportsStack(`import x from 'nextjs-extra'`, 'nextjs'), false);
  assert.equal(fileImportsStack(`// just a comment about next`, 'nextjs'), false);
});

test('countUsage counts distinct files importing the stack', () => {
  const files = [
    { path: 'a.ts', content: `import {NextResponse} from 'next/server'` },
    { path: 'b.tsx', content: `import Link from 'next/link'` },
    { path: 'c.ts', content: `import {drizzle} from 'drizzle-orm'` },
  ];
  assert.equal(countUsage(files, 'nextjs'), 2);
  assert.equal(countUsage(files, 'drizzle'), 1);
  assert.equal(countUsage(files, 'sentry'), 0);
});

test('blastRadius buckets by count', () => {
  assert.equal(blastRadius(0), 'low');
  assert.equal(blastRadius(2), 'low');
  assert.equal(blastRadius(3), 'medium');
  assert.equal(blastRadius(10), 'medium');
  assert.equal(blastRadius(11), 'high');
});

function mkFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigfix-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    dependencies: { next: '15.0.0', 'drizzle-orm': '0.30.0' },
  }));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'page.tsx'), `import Link from 'next/link'`);
  fs.writeFileSync(path.join(dir, 'src', 'db.ts'), `import {drizzle} from 'drizzle-orm'`);
  fs.mkdirSync(path.join(dir, 'node_modules', 'junk'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'node_modules', 'junk', 'x.js'), `import 'next/server'`);
  // .next 빌드 산출물도 스킵되어야 함 (with-binding import 이라 매칭 자체는 가능)
  fs.mkdirSync(path.join(dir, '.next', 'server'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.next', 'server', 'chunk.js'), `import x from 'next/server'`);
  return dir;
}

test('inUseSignals: version + usage + blast, skips node_modules and .next', () => {
  const dir = mkFixture();
  const detected = [
    { stack: 'nextjs', capability: 'framework', ruleStatus: 'named' },
    { stack: 'drizzle', capability: 'database', ruleStatus: 'named' },
  ];
  const sig = inUseSignals(dir, detected);
  const next = sig.find((s) => s.stack === 'nextjs');
  const drz = sig.find((s) => s.stack === 'drizzle');
  assert.equal(next.installedVersion, '15.0.0');
  assert.equal(next.usageCount, 1);
  assert.equal(next.blastRadius, 'low');
  assert.equal(drz.installedVersion, '0.30.0');
  assert.equal(drz.capability, 'database');
  fs.rmSync(dir, { recursive: true, force: true });
});
