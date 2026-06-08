// scripts/lib/migration-readiness.mjs
// 교체 위험 등급의 결정론 신호. 순수 함수 + 얇은 fs 래퍼. 외부 의존 0.
// stack-detect / stack-signals 의 패턴(pure + fs)을 따른다.

import fs from 'node:fs';
import path from 'node:path';

// capability → 상태위험(교체 시 데이터·계약이 얽히는 정도).
export const CAPABILITY_STATE_RISK = {
  database: 'high', auth: 'high', payments: 'high',
  hosting: 'medium', email: 'medium',
  analytics: 'low', 'error-tracking': 'low', 'test-runner': 'low',
  styling: 'low', framework: 'low', ai: 'low',
};

// 알 수 없는 capability 는 보수적으로 high.
export function stateRiskOf(capability) {
  return CAPABILITY_STATE_RISK[capability] || 'high';
}

const LEVELS = ['low', 'medium', 'high', 'critical'];
const idx = (l) => LEVELS.indexOf(l);
const atLeast = (l, floor) => (idx(l) < idx(floor) ? floor : l);
const bump = (l, n) => LEVELS[Math.min(idx(l) + n, LEVELS.length - 1)];

// 종합 위험 등급. low 는 "상태없음 + 낮은 blast + hasTests" 일 때만.
export function migrationRisk({ stateRisk, blast, readiness = {} }) {
  const hasTests = !!readiness.hasTests;
  let level = LEVELS.includes(stateRisk) ? stateRisk : 'high';
  // blast=medium 은 stateRisk 에 이미 반영된 것으로 간주(v1 단순화); high 만 추가 가중.
  if (blast === 'high') level = bump(level, 1);          // 영향 크면 가중
  if (!hasTests) level = atLeast(level, 'medium');        // 패리티 검증 불가
  if (stateRisk === 'high' && !hasTests) level = 'critical'; // 상태있음 + 안전망 없음
  // low 게이트: 진짜 안전할 때만 low 허용
  if (level === 'low' && !(stateRisk === 'low' && blast === 'low' && hasTests)) {
    level = 'medium';
  }
  return level;
}

// ---- fs 래퍼 ----
const TEST_RUNNERS = ['vitest', 'jest', '@playwright/test'];
const SKIP_DIR = new Set(['node_modules', '.git', '.claude', 'dist', 'build', '.next', '.turbo', 'coverage']);
const TEST_FILE = /(\.test\.|\.spec\.)[a-z]+$|(^|\/)__tests__\//;

function readAllDeps(repoDir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
    // deps + devDeps 만 본다 (peerDependencies 는 v1 제외).
    return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  } catch {
    return {};
  }
}

function hasTestFile(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIR.has(e.name) && hasTestFile(full)) return true;
    } else if (TEST_FILE.test(full)) {
      return true;
    }
  }
  return false;
}

function hasCIWorkflow(repoDir) {
  const wf = path.join(repoDir, '.github', 'workflows');
  try {
    return fs.readdirSync(wf).some((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  } catch {
    return false;
  }
}

function hasEnvSeparation(repoDir) {
  return ['.env.staging', '.env.production', '.env.development'].some(
    (f) => fs.existsSync(path.join(repoDir, f)),
  );
}

// 대상 repo 의 안전망 신호 (결정론).
export function readinessSignals(repoDir) {
  const deps = readAllDeps(repoDir);
  const hasRunner = TEST_RUNNERS.some((r) => r in deps);
  return {
    hasTests: hasRunner && hasTestFile(repoDir),
    hasCI: hasCIWorkflow(repoDir),
    envSeparation: hasEnvSeparation(repoDir),
  };
}
