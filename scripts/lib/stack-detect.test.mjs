import { test } from 'node:test';
import assert from 'node:assert/strict';
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
