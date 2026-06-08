// scripts/lib/stack-signals.mjs
// in-use 스택의 결정론 신호 (설치버전·사용처수·blast radius).
// 순수 함수 우선 + 얇은 fs 래퍼. stack-detect 의 gatherSignals/classify 패턴을 따른다.
// 외부 의존 0.

import fs from 'node:fs';
import path from 'node:path';

// stack → npm 패키지 패턴. '/'로 끝나면 스코프 prefix 매칭, 아니면 정확 일치.
// 파일 기반(패키지 없음) 스택은 빈 배열 → 버전/사용처 N/A.
export const STACK_PACKAGES = {
  nextjs: ['next'],
  remix: ['@remix-run/'],
  astro: ['astro'],
  sveltekit: ['@sveltejs/kit'],
  vite: ['vite'],
  expo: ['expo'],
  'react-native': ['react-native'],
  drizzle: ['drizzle-orm'],
  prisma: ['@prisma/client', 'prisma'],
  supabase: ['@supabase/supabase-js', '@supabase/ssr'],
  d1: [],
  vitest: ['vitest'],
  playwright: ['@playwright/test'],
  jest: ['jest'],
  sentry: ['@sentry/'],
  amplitude: ['@amplitude/'],
  posthog: ['posthog-js', 'posthog-node'],
  tailwind: ['tailwindcss'],
  cloudflare: ['@opennextjs/cloudflare', 'wrangler'],
  vercel: ['@vercel/'],
  resend: ['resend'],
  'claude-api': ['@anthropic-ai/sdk'],
  'next-auth': ['next-auth', '@auth/'],
  clerk: ['@clerk/'],
  lucia: ['lucia'],
  auth0: ['@auth0/'],
  stripe: ['stripe'],
  toss: ['@tosspayments/'],
  'github-actions': [],
};

export function matchesPkg(name, patterns) {
  return patterns.some((p) => (p.endsWith('/') ? name.startsWith(p) : name === p));
}

// deps(객체: name→version) 에서 stack 의 첫 매칭 패키지 버전. 없으면 null.
export function pickVersion(deps, stack) {
  const patterns = STACK_PACKAGES[stack] || [];
  if (!patterns.length) return null;
  for (const [name, ver] of Object.entries(deps)) {
    if (matchesPkg(name, patterns)) return ver;
  }
  return null;
}

// 텍스트가 stack 의 패키지를 import/require 하는가 (정규식, 정확/서브패스/스코프prefix).
export function fileImportsStack(text, stack) {
  const patterns = STACK_PACKAGES[stack] || [];
  if (!patterns.length) return false;
  return patterns.some((p) => {
    const base = p.endsWith('/') ? p.slice(0, -1) : p;
    const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // from '<base>' | from '<base>/...' | require('<base>') | require('<base>/...')
    const re = new RegExp(`(from\\s+['"]|require\\(\\s*['"])${esc}(/[^'"]*)?['"]`);
    return re.test(text);
  });
}

// files: [{path, content}] 중 stack 을 import 하는 distinct 파일 수.
export function countUsage(files, stack) {
  let n = 0;
  for (const f of files) if (fileImportsStack(f.content, stack)) n += 1;
  return n;
}

// 사용처 수 → 영향범위 버킷.
export function blastRadius(count) {
  if (count <= 2) return 'low';
  if (count <= 10) return 'medium';
  return 'high';
}

// ---- fs 래퍼 (부수효과는 여기에 격리) ----
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.astro']);
const SKIP_DIR = new Set(['node_modules', '.git', '.claude', 'dist', 'build', '.next', '.turbo', 'coverage']);

function readDeps(repoDir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
    return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  } catch {
    return {};
  }
}

function walkCodeFiles(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIR.has(e.name)) walkCodeFiles(path.join(dir, e.name), acc);
    } else if (CODE_EXT.has(path.extname(e.name))) {
      acc.push(path.join(dir, e.name));
    }
  }
  return acc;
}

function readCodeFiles(repoDir) {
  return walkCodeFiles(repoDir).map((p) => {
    try {
      return { path: p, content: fs.readFileSync(p, 'utf8') };
    } catch {
      return { path: p, content: '' };
    }
  });
}

// 대상 repo + detected 스택들 → in-use 결정론 신호 배열.
export function inUseSignals(repoDir, detected) {
  const deps = readDeps(repoDir);
  const files = readCodeFiles(repoDir);
  return detected.map((d) => {
    const usage = countUsage(files, d.stack);
    return {
      stack: d.stack,
      capability: d.capability,
      installedVersion: pickVersion(deps, d.stack),
      usageCount: usage,
      blastRadius: blastRadius(usage),
    };
  });
}
