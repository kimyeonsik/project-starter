import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { classify, makeSignals } from './stack-detect.mjs';

// availableNamed: 툴킷이 보유한 stacks/<name>.md 파일명(확장자 제외) 집합
const NAMED = new Set([
  'nextjs', 'supabase', 'vercel', 'cloudflare', 'playwright', 'vitest',
  'claude-api', 'sentry', 'amplitude', 'tailwind', 'resend', 'drizzle', 'd1',
]);

test('classify: nextjs dep → framework, named', () => {
  const sig = makeSignals({ deps: ['next'], files: [] });
  const got = classify(sig, NAMED);
  assert.deepEqual(
    got.find((d) => d.stack === 'nextjs'),
    { stack: 'nextjs', capability: 'framework', ruleStatus: 'named' }
  );
});

test('classify: prisma dep → database, generic (no named rule)', () => {
  const sig = makeSignals({ deps: ['@prisma/client'], files: [] });
  const got = classify(sig, NAMED);
  assert.deepEqual(
    got.find((d) => d.stack === 'prisma'),
    { stack: 'prisma', capability: 'database', ruleStatus: 'generic' }
  );
});

test('classify: sveltekit dep → framework, generic', () => {
  const sig = makeSignals({ deps: ['@sveltejs/kit'], files: [] });
  const got = classify(sig, NAMED);
  assert.equal(got.find((d) => d.stack === 'sveltekit')?.ruleStatus, 'generic');
});

test('classify: drizzle config file → database, named', () => {
  const sig = makeSignals({ deps: [], files: ['drizzle.config.ts'] });
  const got = classify(sig, NAMED);
  assert.equal(got.find((d) => d.stack === 'drizzle')?.ruleStatus, 'named');
});

test('classify: d1 via wrangler d1_databases → database, named', () => {
  const sig = makeSignals({ deps: [], files: ['wrangler.toml'], wranglerHasD1: true });
  const got = classify(sig, NAMED);
  assert.equal(got.find((d) => d.stack === 'd1')?.ruleStatus, 'named');
});

test('classify: empty repo → []', () => {
  assert.deepEqual(classify(makeSignals({ deps: [], files: [] }), NAMED), []);
});

test('classify: scoped-prefix match (@sentry/nextjs) → sentry', () => {
  const sig = makeSignals({ deps: ['@sentry/nextjs'], files: [] });
  const got = classify(sig, NAMED);
  assert.equal(got.find((d) => d.stack === 'sentry')?.capability, 'error-tracking');
});

test('classify: clerk dep → auth, generic (no named auth rule)', () => {
  const sig = makeSignals({ deps: ['@clerk/nextjs'], files: [] });
  const got = classify(sig, NAMED);
  assert.deepEqual(
    got.find((d) => d.stack === 'clerk'),
    { stack: 'clerk', capability: 'auth', ruleStatus: 'generic' }
  );
});

test('classify: stripe dep → payments, generic', () => {
  const sig = makeSignals({ deps: ['stripe'], files: [] });
  const got = classify(sig, NAMED);
  assert.equal(got.find((d) => d.stack === 'stripe')?.capability, 'payments');
  assert.equal(got.find((d) => d.stack === 'stripe')?.ruleStatus, 'generic');
});

import fs from 'node:fs';
import os from 'node:os';
import { gatherSignals, detectStacks } from './stack-detect.mjs';

function mkRepo(files) {
  // files: { 'package.json': {...obj}, 'wrangler.toml': 'text', ... }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-detect-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

test('gatherSignals: reads deps + devDeps + config files', () => {
  const dir = mkRepo({
    'package.json': { dependencies: { next: '15.0.0' }, devDependencies: { vitest: '2.0.0' } },
    'drizzle.config.ts': 'export default {}',
  });
  const sig = gatherSignals(dir);
  assert.ok(sig.hasDep('next'));
  assert.ok(sig.hasDep('vitest'));
  assert.ok(sig.hasFile('drizzle.config'));
});

test('gatherSignals: wrangler with d1_databases sets wranglerHasD1', () => {
  const dir = mkRepo({
    'package.json': {},
    'wrangler.toml': '[[d1_databases]]\nbinding = "DB"\n',
  });
  const sig = gatherSignals(dir);
  assert.equal(sig.wranglerHasD1, true);
});

test('detectStacks: scaffold-at-like repo → expected named stacks', () => {
  const dir = mkRepo({
    'package.json': {
      dependencies: {
        next: '15', 'drizzle-orm': '0.3', '@opennextjs/cloudflare': '1',
        '@sentry/nextjs': '8', '@amplitude/analytics-browser': '2',
      },
      devDependencies: { vitest: '2', '@playwright/test': '1' },
    },
    'wrangler.toml': '[[d1_databases]]\nbinding="DB"\n',
    'vercel.json': '{}',
  });
  const got = detectStacks(dir);
  const byStack = Object.fromEntries(got.map((d) => [d.stack, d]));
  assert.equal(byStack.nextjs.ruleStatus, 'named');
  assert.equal(byStack.drizzle.ruleStatus, 'named');
  assert.equal(byStack.d1.ruleStatus, 'named');
  assert.equal(byStack.cloudflare.ruleStatus, 'named');
  assert.equal(byStack.sentry.ruleStatus, 'named');
  assert.equal(byStack.vitest.ruleStatus, 'named');
});

test('detectStacks: prisma repo → generic database (in-use but unsupported)', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { '@prisma/client': '5' } } });
  const got = detectStacks(dir);
  assert.equal(got.find((d) => d.stack === 'prisma')?.ruleStatus, 'generic');
});
