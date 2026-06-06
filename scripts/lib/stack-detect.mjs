// scripts/lib/stack-detect.mjs
// Repo의 스택을 감지하는 순수-우선 라이브러리. 외부 의존성 0.
//
// 두 단계:
//   gatherSignals(repoDir) → Signals   (파일시스템 읽기)
//   classify(signals, availableNamed) → DetectedStack[]   (순수 함수)
// detectStacks(repoDir) = gatherSignals + classify (named는 stacks/ 디렉토리에서 파생)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPABILITIES } from './registry.mjs';

// ---- 시그널 모델 ----
// Signals: { deps: Set<string>, hasFile(prefix): bool, wranglerHasD1: bool, hasWrangler: bool }
export function makeSignals({ deps = [], files = [], wranglerHasD1 = false } = {}) {
  const depSet = new Set(deps);
  const fileList = files;
  // PREFIX matching: hasFile('vercel.json') matches 'vercel.json' AND 'vercel.json.bak', etc.
  const hasFile = (prefix) => fileList.some((f) => f === prefix || f.startsWith(prefix));
  const hasWrangler = fileList.some((f) => f.startsWith('wrangler.'));
  return {
    deps: depSet,
    hasFile,
    hasWrangler,
    wranglerHasD1,
    hasDep: (name) => depSet.has(name),
    hasDepPrefix: (pfx) => [...depSet].some((d) => d.startsWith(pfx)),
  };
}

// ---- 감지 룰 테이블 ----
// 각 항목: stack, capability, when(signals) → bool
const RULES = [
  { stack: 'nextjs',    capability: 'framework',      when: (s) => s.hasDep('next') || s.hasFile('next.config') },
  { stack: 'remix',     capability: 'framework',      when: (s) => s.hasDepPrefix('@remix-run/') },
  { stack: 'astro',     capability: 'framework',      when: (s) => s.hasDep('astro') || s.hasFile('astro.config') },
  { stack: 'sveltekit', capability: 'framework',      when: (s) => s.hasDep('@sveltejs/kit') || s.hasFile('svelte.config') },
  { stack: 'vite',      capability: 'framework',      when: (s) => s.hasDep('vite') && !s.hasDep('next') },
  { stack: 'drizzle',   capability: 'database',       when: (s) => s.hasDep('drizzle-orm') || s.hasFile('drizzle.config') },
  { stack: 'prisma',    capability: 'database',       when: (s) => s.hasDep('@prisma/client') || s.hasDep('prisma') || s.hasFile('prisma/schema.prisma') },
  { stack: 'd1',        capability: 'database',       when: (s) => s.wranglerHasD1 },
  { stack: 'supabase',  capability: 'database',       when: (s) => s.hasDep('@supabase/supabase-js') || s.hasDep('@supabase/ssr') },
  { stack: 'vitest',    capability: 'test-runner',    when: (s) => s.hasDep('vitest') || s.hasFile('vitest.config') },
  { stack: 'playwright',capability: 'test-runner',    when: (s) => s.hasDep('@playwright/test') || s.hasFile('playwright.config') },
  { stack: 'jest',      capability: 'test-runner',    when: (s) => s.hasDep('jest') },
  { stack: 'sentry',    capability: 'error-tracking', when: (s) => s.hasDepPrefix('@sentry/') },
  { stack: 'amplitude', capability: 'analytics',      when: (s) => s.hasDepPrefix('@amplitude/') },
  { stack: 'posthog',   capability: 'analytics',      when: (s) => s.hasDep('posthog-js') || s.hasDep('posthog-node') },
  { stack: 'tailwind',  capability: 'styling',        when: (s) => s.hasDep('tailwindcss') || s.hasFile('tailwind.config') },
  { stack: 'cloudflare',capability: 'hosting',        when: (s) => s.hasDep('@opennextjs/cloudflare') || s.hasWrangler },
  { stack: 'vercel',    capability: 'hosting',        when: (s) => s.hasFile('vercel.json') || s.hasDepPrefix('@vercel/') },
  { stack: 'resend',    capability: 'email',          when: (s) => s.hasDep('resend') },
  { stack: 'claude-api',capability: 'ai',             when: (s) => s.hasDep('@anthropic-ai/sdk') },
  { stack: 'next-auth', capability: 'auth',           when: (s) => s.hasDep('next-auth') || s.hasDepPrefix('@auth/') },
  { stack: 'clerk',     capability: 'auth',           when: (s) => s.hasDepPrefix('@clerk/') },
  { stack: 'lucia',     capability: 'auth',           when: (s) => s.hasDep('lucia') },
  { stack: 'auth0',     capability: 'auth',           when: (s) => s.hasDepPrefix('@auth0/') },
  { stack: 'stripe',    capability: 'payments',       when: (s) => s.hasDep('stripe') || s.hasDepPrefix('@stripe/') },
  { stack: 'toss',      capability: 'payments',       when: (s) => s.hasDepPrefix('@tosspayments/') },
  { stack: 'paddle',    capability: 'payments',       when: (s) => s.hasDepPrefix('@paddle/') },
];

// capability별 generic 규칙 존재 여부. claude-rules/capabilities/*.md 목록과 동기화 유지 필요.
const CAPABILITIES_WITH_GENERIC = new Set(CAPABILITIES); // registry SSOT

export function classify(signals, availableNamed) {
  const out = [];
  for (const rule of RULES) {
    if (!rule.when(signals)) continue;
    let ruleStatus;
    if (availableNamed.has(rule.stack)) ruleStatus = 'named';
    else if (CAPABILITIES_WITH_GENERIC.has(rule.capability)) ruleStatus = 'generic';
    else ruleStatus = 'unclassified';
    out.push({ stack: rule.stack, capability: rule.capability, ruleStatus });
  }
  return out;
}

// ---- 파일시스템 감지 ----

function readPackageJson(repoDir) {
  try {
    const raw = fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw);
    return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  } catch {
    return {};
  }
}

function listTopLevelFiles(repoDir) {
  try {
    return fs.readdirSync(repoDir);
  } catch {
    return [];
  }
}

function detectWranglerD1(repoDir, files) {
  const wf = files.find((f) => f.startsWith('wrangler.'));
  if (!wf) return false;
  try {
    return fs.readFileSync(path.join(repoDir, wf), 'utf8').includes('d1_databases');
  } catch {
    return false;
  }
}

export function gatherSignals(repoDir) {
  const deps = Object.keys(readPackageJson(repoDir));
  const topFiles = listTopLevelFiles(repoDir);
  // config 파일은 top-level 매칭 + prisma/schema.prisma 특수 케이스
  const files = [...topFiles];
  if (fs.existsSync(path.join(repoDir, 'prisma', 'schema.prisma'))) {
    files.push('prisma/schema.prisma');
  }
  const wranglerHasD1 = detectWranglerD1(repoDir, topFiles);
  return makeSignals({ deps, files, wranglerHasD1 });
}

// 툴킷이 보유한 named 규칙 목록을 stacks/ 디렉토리에서 파생.
function availableNamedFrom(rulesStacksDir) {
  try {
    return new Set(
      fs.readdirSync(rulesStacksDir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''))
    );
  } catch {
    return new Set();
  }
}

export function detectStacks(repoDir, opts = {}) {
  const signals = gatherSignals(repoDir);
  // 기본: 이 레포(project-starter)의 claude-rules/stacks 를 named 소스로 사용.
  const stacksDir = opts.stacksDir
    || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'claude-rules', 'stacks');
  const availableNamed = opts.availableNamed || availableNamedFrom(stacksDir);
  return classify(signals, availableNamed);
}
