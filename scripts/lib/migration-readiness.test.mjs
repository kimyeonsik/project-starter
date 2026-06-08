import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CAPABILITY_STATE_RISK, stateRiskOf, migrationRisk, readinessSignals,
} from './migration-readiness.mjs';

test('CAPABILITY_STATE_RISK: stateful=high, infra=medium, stateless=low', () => {
  assert.equal(CAPABILITY_STATE_RISK.database, 'high');
  assert.equal(CAPABILITY_STATE_RISK.auth, 'high');
  assert.equal(CAPABILITY_STATE_RISK.payments, 'high');
  assert.equal(CAPABILITY_STATE_RISK.hosting, 'medium');
  assert.equal(CAPABILITY_STATE_RISK.email, 'medium');
  assert.equal(CAPABILITY_STATE_RISK.analytics, 'low');
  assert.equal(CAPABILITY_STATE_RISK['error-tracking'], 'low');
  assert.equal(CAPABILITY_STATE_RISK['test-runner'], 'low');
  assert.equal(CAPABILITY_STATE_RISK.styling, 'low');
  assert.equal(CAPABILITY_STATE_RISK.framework, 'low');
  assert.equal(CAPABILITY_STATE_RISK.ai, 'low');
});

test('stateRiskOf: known → mapped, unknown → high (conservative)', () => {
  assert.equal(stateRiskOf('analytics'), 'low');
  assert.equal(stateRiskOf('database'), 'high');
  assert.equal(stateRiskOf('something-unknown'), 'high');
});

test('migrationRisk: low ONLY for stateless + low blast + hasTests', () => {
  const tests = { hasTests: true, hasCI: true };
  assert.equal(migrationRisk({ stateRisk: 'low', blast: 'low', readiness: tests }), 'low');
  assert.equal(migrationRisk({ stateRisk: 'low', blast: 'low', readiness: { hasTests: false } }), 'medium');
  assert.equal(migrationRisk({ stateRisk: 'low', blast: 'medium', readiness: tests }), 'medium');
  assert.equal(migrationRisk({ stateRisk: 'low', blast: 'high', readiness: tests }), 'medium');
});

test('migrationRisk: stateful never low; stateful + no tests → critical', () => {
  const tests = { hasTests: true };
  assert.equal(migrationRisk({ stateRisk: 'high', blast: 'low', readiness: tests }), 'high');
  assert.equal(migrationRisk({ stateRisk: 'high', blast: 'high', readiness: tests }), 'critical');
  assert.equal(migrationRisk({ stateRisk: 'high', blast: 'low', readiness: { hasTests: false } }), 'critical');
  assert.equal(migrationRisk({ stateRisk: 'high', blast: 'medium', readiness: tests }), 'high');
  assert.equal(migrationRisk({ stateRisk: 'medium', blast: 'low', readiness: tests }), 'medium');
});

function mkRepo({ tests = false, ci = false, env = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'readifix-'));
  const deps = tests ? { vitest: '2.0.0' } : {};
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: deps }));
  if (tests) {
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'a.test.ts'), 'test("x",()=>{})');
  }
  if (ci) {
    fs.mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.github', 'workflows', 'ci.yml'), 'name: ci');
  }
  if (env) fs.writeFileSync(path.join(dir, '.env.production'), 'X=1');
  return dir;
}

test('readinessSignals: detects tests (runner dep + test file), CI, env separation', () => {
  const dir = mkRepo({ tests: true, ci: true, env: true });
  const r = readinessSignals(dir);
  assert.equal(r.hasTests, true);
  assert.equal(r.hasCI, true);
  assert.equal(r.envSeparation, true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('readinessSignals: runner dep WITHOUT test files → hasTests false', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'readifix2-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { vitest: '2.0.0' } }));
  const r = readinessSignals(dir);
  assert.equal(r.hasTests, false);
  assert.equal(r.hasCI, false);
  assert.equal(r.envSeparation, false);
  fs.rmSync(dir, { recursive: true, force: true });
});
