# Stack Assess + Upgrade (existing-stack path) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존(in-use) 스택을 점수화 평가하고, 점수 미달 시 영향범위(blast radius)를 고려해 **업그레이드(실행)** 또는 **교체(제안만)** 를 제시한다 (스펙 §5.2, §6, §10, §5.3 upgrade — "assess/upgrade 경로").

**Architecture:** `adopt.mjs`(AI-free)가 in-use 스택별 **결정론 신호**(설치버전·사용처수·blast radius)를 리포트에 싣는다. 신규 `stack-assess` 스킬(AI)이 그 신호 + 리서치(보안·유지보수·최신버전·프로필적합)로 0–100 점수와 판정(ok/upgrade/replace)을 낸다. upgrade는 기존 `install-stack` 스킬에 `upgrade` 모드를 더해 실행하고, replace는 제안(대안 리서치 + 마이그레이션 개요)만 한다. `adopt`은 거버넌스 후 in-use 미달 스택이 있으면 대화형 게이트로 이 흐름을 제안한다.

**Tech Stack:** Node `node:test`(순수함수 TDD), 결정론 라이브러리(`scripts/lib/*.mjs`), Markdown 스킬/커맨드.

> **구현 대상 레포:** `~/projects/project-starter`. 모든 경로 그 레포 기준.
> **선행 스펙:** [`../specs/2026-06-08-stack-lifecycle-recommend-install-design.md`](../specs/2026-06-08-stack-lifecycle-recommend-install-design.md)
> **선행 플랜(완료·머지):** [`./2026-06-08-guided-stack-install-add.md`](./2026-06-08-guided-stack-install-add.md) — install-stack(add), adopt 게이트(빈 capability)는 이미 존재.

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `scripts/lib/stack-signals.mjs` | in-use 스택 결정론 신호: 패키지 매핑, 설치버전, 사용처수, blast radius (순수함수 + fs 래퍼) | 생성 |
| `scripts/lib/stack-signals.test.mjs` | 위 순수함수 단위 테스트 | 생성 |
| `scripts/lib/gap-analysis.mjs` | 리포트에 "기존 스택 (적절성 점검 후보)" 섹션 + gaps.inUse 추가 | 수정 |
| `scripts/lib/gap-analysis.test.mjs` | 리포트 렌더/inUse 단위 테스트 | 생성(없으면) |
| `skills/stack-assess/SKILL.md` | 점수화 평가(보안·유지보수·버전노후·프로필적합) + 판정 + 교체 제안 | 생성 |
| `commands/assess.md` | `/assess` read-only 점검 진입 | 생성 |
| `skills/install-stack/SKILL.md` | `upgrade` 모드 추가 (add\|upgrade 공용 엔진) | 수정 |
| `skills/adopt-existing-project/SKILL.md` | Step 4.6: in-use 미달 스택 → 평가/업그레이드 게이트 | 수정 |
| `package.json` / `CHANGELOG.md` | 0.7.0 → 0.8.0 | 수정 |

**설계 메모(스펙 대비 단순화):** 스펙 §6 데이터흐름의 per-stack `profileFitHint` 필드는 만들지 않는다 — 결정론으로 "적합성"을 정직하게 계산하기 어렵다. 대신 리포트에 이미 있는 **프로필(platform/hosting)** + per-stack **설치버전·blast radius** 를 신호로 주고, 프로필 적합성 점수는 `stack-assess` 스킬이 리서치로 채운다. (YAGNI, 가짜 결정론 회피)

---

## Task 1: `stack-signals` — 패키지 매핑 + 설치버전 (순수)

**Files:**
- Create: `scripts/lib/stack-signals.mjs`
- Create: `scripts/lib/stack-signals.test.mjs`

- [ ] **Step 1: 실패 테스트 작성**

`scripts/lib/stack-signals.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesPkg, pickVersion, STACK_PACKAGES } from './stack-signals.mjs';

test('matchesPkg: exact and scope-prefix', () => {
  assert.equal(matchesPkg('next', ['next']), true);
  assert.equal(matchesPkg('next', ['drizzle-orm']), false);
  assert.equal(matchesPkg('@sentry/nextjs', ['@sentry/']), true); // prefix
  assert.equal(matchesPkg('@sentryx/x', ['@sentry/']), false);
});

test('pickVersion returns the version of the first matching dep', () => {
  const deps = { next: '15.0.0', react: '19.0.0', '@sentry/nextjs': '8.1.0' };
  assert.equal(pickVersion(deps, 'nextjs'), '15.0.0');
  assert.equal(pickVersion(deps, 'sentry'), '8.1.0');
  assert.equal(pickVersion(deps, 'drizzle'), null); // not present
});

test('pickVersion returns null for file-only stacks (no packages)', () => {
  assert.equal(pickVersion({ anything: '1.0.0' }, 'd1'), null);
});

test('STACK_PACKAGES covers the common named stacks', () => {
  for (const s of ['nextjs','drizzle','vitest','playwright','sentry','amplitude','tailwind','vercel','resend','claude-api']) {
    assert.ok(s in STACK_PACKAGES, `missing STACK_PACKAGES entry: ${s}`);
  }
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/stack-signals.test.mjs`
Expected: FAIL — `Cannot find module './stack-signals.mjs'`.

- [ ] **Step 3: 최소 구현**

`scripts/lib/stack-signals.mjs`:
```javascript
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/stack-signals.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: 커밋**

```bash
cd ~/projects/project-starter
git add scripts/lib/stack-signals.mjs scripts/lib/stack-signals.test.mjs
git commit -m "feat(stack-signals): package map + installed-version (pure)"
```

---

## Task 2: `stack-signals` — 사용처수(blast radius) (순수)

**Files:**
- Modify: `scripts/lib/stack-signals.mjs`
- Modify: `scripts/lib/stack-signals.test.mjs`

- [ ] **Step 1: 실패 테스트 추가**

`scripts/lib/stack-signals.test.mjs` 끝에 추가:
```javascript
import { fileImportsStack, countUsage, blastRadius } from './stack-signals.mjs';

test('fileImportsStack: ESM import, subpath, require', () => {
  assert.equal(fileImportsStack(`import x from 'next'`, 'nextjs'), true);
  assert.equal(fileImportsStack(`import {a} from "next/navigation"`, 'nextjs'), true);
  assert.equal(fileImportsStack(`const x = require('next')`, 'nextjs'), true);
  assert.equal(fileImportsStack(`import x from '@sentry/nextjs'`, 'sentry'), true); // prefix
  assert.equal(fileImportsStack(`import x from 'nextjs-extra'`, 'nextjs'), false); // not a prefix match
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/stack-signals.test.mjs`
Expected: FAIL — `fileImportsStack`/`countUsage`/`blastRadius` not exported.

- [ ] **Step 3: 최소 구현 추가**

`scripts/lib/stack-signals.mjs`의 `pickVersion` 다음에 추가:
```javascript
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/stack-signals.test.mjs`
Expected: PASS (7 tests total).

- [ ] **Step 5: 커밋**

```bash
cd ~/projects/project-starter
git add scripts/lib/stack-signals.mjs scripts/lib/stack-signals.test.mjs
git commit -m "feat(stack-signals): usage count + blast radius (pure)"
```

---

## Task 3: `stack-signals` — fs 래퍼 + `inUseSignals` 집계

**Files:**
- Modify: `scripts/lib/stack-signals.mjs`
- Modify: `scripts/lib/stack-signals.test.mjs`

- [ ] **Step 1: 실패 테스트 추가 (tmp 픽스처)**

`scripts/lib/stack-signals.test.mjs` 끝에 추가:
```javascript
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inUseSignals } from './stack-signals.mjs';

function mkFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigfix-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    dependencies: { next: '15.0.0', 'drizzle-orm': '0.30.0' },
  }));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'page.tsx'), `import Link from 'next/link'`);
  fs.writeFileSync(path.join(dir, 'src', 'db.ts'), `import {drizzle} from 'drizzle-orm'`);
  fs.mkdirSync(path.join(dir, 'node_modules', 'junk'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'node_modules', 'junk', 'x.js'), `import 'next/server'`); // must be ignored
  return dir;
}

test('inUseSignals: version + usage + blast, skips node_modules', () => {
  const dir = mkFixture();
  const detected = [
    { stack: 'nextjs', capability: 'framework', ruleStatus: 'named' },
    { stack: 'drizzle', capability: 'database', ruleStatus: 'named' },
  ];
  const sig = inUseSignals(dir, detected);
  const next = sig.find((s) => s.stack === 'nextjs');
  const drz = sig.find((s) => s.stack === 'drizzle');
  assert.equal(next.installedVersion, '15.0.0');
  assert.equal(next.usageCount, 1); // node_modules ignored
  assert.equal(next.blastRadius, 'low');
  assert.equal(drz.installedVersion, '0.30.0');
  assert.equal(drz.capability, 'database');
  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/stack-signals.test.mjs`
Expected: FAIL — `inUseSignals` not exported.

- [ ] **Step 3: fs 래퍼 구현 추가**

`scripts/lib/stack-signals.mjs` 끝에 추가:
```javascript
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/stack-signals.test.mjs`
Expected: PASS (8 tests total).

- [ ] **Step 5: 커밋**

```bash
cd ~/projects/project-starter
git add scripts/lib/stack-signals.mjs scripts/lib/stack-signals.test.mjs
git commit -m "feat(stack-signals): inUseSignals fs aggregator"
```

---

## Task 4: 리포트에 in-use 신호 섹션 추가

**Files:**
- Modify: `scripts/lib/gap-analysis.mjs`
- Create: `scripts/lib/gap-analysis.test.mjs`

- [ ] **Step 1: 실패 테스트 작성**

`scripts/lib/gap-analysis.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeGaps, renderReport } from './gap-analysis.mjs';

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gapfix-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0' } }));
  fs.writeFileSync(path.join(dir, 'app.tsx'), `import 'next/link'`);
  return dir;
}

test('analyzeGaps includes inUse signals', () => {
  const dir = fixture();
  const detected = [{ stack: 'nextjs', capability: 'framework', ruleStatus: 'named' }];
  const gaps = analyzeGaps(dir, detected);
  assert.ok(Array.isArray(gaps.inUse));
  const next = gaps.inUse.find((s) => s.stack === 'nextjs');
  assert.equal(next.installedVersion, '15.0.0');
  assert.equal(next.blastRadius, 'low');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('renderReport shows the in-use stack section with version + blast', () => {
  const dir = fixture();
  const detected = [{ stack: 'nextjs', capability: 'framework', ruleStatus: 'named' }];
  const gaps = analyzeGaps(dir, detected);
  const md = renderReport(gaps, detected);
  assert.match(md, /기존 스택 \(적절성 점검 후보\)/);
  assert.match(md, /nextjs/);
  assert.match(md, /15\.0\.0/);
  assert.match(md, /영향범위|blast/i);
  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/gap-analysis.test.mjs`
Expected: FAIL — `gaps.inUse` undefined / 섹션 문구 없음.

- [ ] **Step 3: gap-analysis.mjs 수정**

상단 import에 추가:
```javascript
import { inUseSignals } from './stack-signals.mjs';
```

`analyzeGaps` 의 return 객체에 `inUse` 추가 (기존 필드 유지):
```javascript
export function analyzeGaps(repoDir, detected) {
  const missing = GOVERNANCE.filter((rel) => !existsRel(repoDir, rel));
  const unsupportedStacks = detected
    .filter((d) => d.ruleStatus === 'generic' || d.ruleStatus === 'unclassified')
    .map((d) => d.stack);
  return {
    missing,
    unsupportedStacks,
    profile: profile(detected),
    absentCapabilities: absentCapabilities(detected),
    inUse: inUseSignals(repoDir, detected),
  };
}
```

`renderReport` 에서, "빈 capability" 섹션을 렌더하는 블록 **앞에** in-use 섹션을 추가한다. `renderReport` 함수 안, `if (gaps.absentCapabilities && gaps.absentCapabilities.length) {` 줄 바로 위에 삽입:
```javascript
  if (gaps.inUse && gaps.inUse.length) {
    lines.push('## 기존 스택 (적절성 점검 후보)');
    lines.push('');
    lines.push('아래는 이미 쓰는 스택의 결정론 신호다 — `/assess` 로 점수화(보안·유지보수·버전노후·프로필적합)해 업그레이드/교체 후보를 가린다.');
    lines.push('');
    lines.push('| 스택 | capability | 설치버전 | 사용처 | 영향범위 |');
    lines.push('|---|---|---|---|---|');
    for (const s of gaps.inUse) {
      const ver = s.installedVersion || '—';
      lines.push(`| ${s.stack} | ${s.capability} | ${ver} | ${s.usageCount} | ${s.blastRadius} |`);
    }
    lines.push('');
  }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/gap-analysis.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: 전체 테스트로 회귀 확인**

Run: `cd ~/projects/project-starter && node --test`
Expected: 기존 테스트 전부 PASS + 신규 PASS, fail 0.

- [ ] **Step 6: 커밋**

```bash
cd ~/projects/project-starter
git add scripts/lib/gap-analysis.mjs scripts/lib/gap-analysis.test.mjs
git commit -m "feat(report): in-use stack signals section (version, usage, blast)"
```

---

## Task 5: `stack-assess` 스킬 + `/assess` 커맨드

**Files:**
- Create: `skills/stack-assess/SKILL.md`
- Create: `commands/assess.md`

- [ ] **Step 1: stack-assess 스킬 작성**

`skills/stack-assess/SKILL.md`:
````markdown
---
name: stack-assess
description: Score the IN-USE stacks of a project (security, maintenance, version staleness, profile fit) and, for stacks below threshold, recommend an UPGRADE (same stack, newer version) or propose a REPLACEMENT (different stack) considering blast radius. Read-only assessment — proposes, does not execute replacement. Use when the user asks to evaluate/audit existing stacks, check if a dependency is outdated/abandoned, or wants upgrade/replacement guidance. Pairs with recommend-stack (empty capabilities) — this one judges what is already in use.
---

# Stack Assess

이미 쓰는 스택의 **적절성을 점수화**하고, 미달 스택에 대해 영향범위를 고려해 **업그레이드(실행 가능)** 또는 **교체(제안만)** 를 제시한다. 평가 자체는 read-only다.

## When to Use
- "기존 스택 평가/감사해줘", "이 의존성 낡았어?", "업그레이드해야 해?", "이거 더 나은 대안 있어?"
- adopt의 in-use 게이트에서 "평가 진행" 동의 시

## When NOT to Use
- 빈 capability에 새 도구 도입 → `recommend-stack`
- 평가 없이 특정 스택을 바로 설치 → `install-stack`

## 절차

### Step 1: 결정론 신호 수집 (토큰 0)
`inspect`(= adopt `--dry-run`)를 돌려 리포트의 **"기존 스택 (적절성 점검 후보)"** 표(스택·capability·설치버전·사용처·영향범위)와 **프로필**(platform/hosting)을 입력으로 얻는다:
```bash
PROJECT_ROOT="<repo 절대경로>" node "<adopt-existing-project 스킬 디렉터리>/engine/scripts/adopt.mjs" --dry-run --lang ko
```

### Step 2: 차원별 리서치 (필수, 추측 금지)
각 in-use 스택마다 **현행 정보를 리서치**한다 (Context7 MCP/웹). 모델 지식만으로 점수 매기지 않는다:
- **보안**: 알려진 CVE/취약점 + 심각도
- **유지보수**: 마지막 릴리스/커밋, deprecated/archived, 이슈 상태
- **버전 노후도**: 설치버전(신호) vs 최신, major 뒤처짐
- **프로필 적합성**: platform(web/native/edge)·hosting 궁합, 지역/규제; 평판/생태계

### Step 3: 점수화 (0–100) + 판정
4차원 가중 합산(보안·유지보수 높음, 버전노후·프로필적합 중간). 기본 임계 **< 60** 플래그. 차원 점수와 **근거(출처 링크)** 를 함께 제시.
판정:
- `≥ 60` → **ok** (변경 제안 안 함)
- `< 60` & 같은 스택 버전업으로 주요 감점 해소 → **upgrade**
- `< 60` & 스택 자체 부적합(deprecated/방치/궁합 나쁨) → **replace-propose**

리서치가 불충분하면 "점수 미완"으로 표시하고 결정론 신호만 제시(추측 금지).

### Step 4: 행동
- **upgrade** → 사용자 동의 시 `install-stack` 스킬을 **`upgrade` 모드**로 호출(목표 버전 전달). 코드 변경은 install-stack 게이트(clean git·단계별 승인·검증) 하에서만.
- **replace-propose** → **실행하지 않는다.** `recommend-stack`으로 대안 후보를 리서치하고, **영향범위(blast radius) + 마이그레이션 개요(호출부 이전·데이터·계약 변경)** 를 리포트로 제시. 실제 교체는 사용자 결정(별도 사이클).

## 원칙
- **이미 쓰는 스택만** 평가. 빈 capability는 recommend-stack.
- **항상 리서치.** 점수 근거에 출처.
- **업그레이드는 실행, 교체는 제안만.** 위험 등급 차이.
- 결정은 사용자. 영향범위를 항상 함께 제시.
````

- [ ] **Step 2: /assess 커맨드 작성**

`commands/assess.md`:
```markdown
---
description: 이미 쓰는 스택을 점수화 평가(보안·유지보수·버전·적합성) + 업그레이드/교체 제안
---
`stack-assess` 스킬로 현재 프로젝트의 **기존(in-use) 스택**을 점수화한다.

먼저 `inspect`(read-only)로 스택별 설치버전·사용처·영향범위와 프로필을 얻고, 각 스택을 **리서치**해 보안·유지보수·버전 노후도·프로필 적합성을 0–100으로 평가한다. 임계 미달이면 같은 스택 **업그레이드**(install-stack upgrade로 실행 가능) 또는 다른 스택 **교체**(제안만 — 영향범위·마이그레이션 개요)를 제시한다. 평가는 read-only다.

$ARGUMENTS
```

- [ ] **Step 3: 확인 + 커밋**

Run: `cd ~/projects/project-starter && head -3 skills/stack-assess/SKILL.md && grep -c "Step" skills/stack-assess/SKILL.md`
Expected: frontmatter `name: stack-assess`, 4개 Step.
```bash
cd ~/projects/project-starter
git add skills/stack-assess/SKILL.md commands/assess.md
git commit -m "feat(stack-assess): scoring skill + /assess command"
```

---

## Task 6: `install-stack`에 `upgrade` 모드 추가

**Files:**
- Modify: `skills/install-stack/SKILL.md`

- [ ] **Step 1: frontmatter description에서 upgrade 제외 문구 갱신**

찾기:
```
This DOES modify code (deps/config/env) under strict gates. Do NOT use to replace or upgrade a stack already in use (that is out of scope this cycle).
```
교체:
```
This DOES modify code (deps/config/env) under strict gates. Supports two modes: `add` (new stack) and `upgrade` (same stack, newer version). Do NOT use to REPLACE a stack with a different one (replacement is propose-only — see stack-assess).
```

- [ ] **Step 2: "When NOT to Use"에서 업그레이드 항목 수정**

찾기:
```
- **이미 쓰는 스택의 교체/업그레이드** → 이번 사이클 범위 밖 (제안만). 사용자에게 안내하고 중단.
```
교체:
```
- **이미 쓰는 스택의 교체(다른 스택으로 전환)** → 이번 사이클 범위 밖 (제안만, `stack-assess` 참고). 안내하고 중단.
- (업그레이드 = 같은 스택 버전업은 이 스킬의 `upgrade` 모드로 지원한다.)
```

- [ ] **Step 3: "When to Use"에 upgrade 진입 추가**

찾기:
```
- adopt의 대화형 게이트에서 "설치 진행" 동의 시
```
그 줄 다음에 추가:
```
- stack-assess가 **upgrade** 판정을 내고 사용자가 동의했을 때 (모드 `upgrade`)
```

- [ ] **Step 4: Step 1(입력 확정)에 모드 분기 추가**

찾기:
```
### Step 1: 입력 확정
- 대상 스택(이름), capability, 대상 repo 경로(기본 cwd)를 확정한다.
- 이미 그 capability를 쓰고 있으면 (교체/업그레이드) → **중단**하고 "이번 범위 밖(제안만)"임을 안내.
```
교체:
```
### Step 1: 입력 확정
- **모드**(`add` | `upgrade`), 대상 스택(이름), capability, 대상 repo 경로(기본 cwd)를 확정한다. upgrade면 **목표 버전**도.
- `add`인데 이미 그 capability를 쓰고 있으면 → **중단**. 다른 스택으로의 교체는 범위 밖(제안만, stack-assess)임을 안내.
- `upgrade`는 이미 쓰는 그 스택을 같은 계열 상위 버전으로 올리는 경우에만.
```

- [ ] **Step 5: Step 3(리서치)에 upgrade 리서치 추가**

찾기 (Step 3 본문 첫 줄):
```
이 프로젝트 맥락에 맞는 **공식 설치/셋업**을 확인한다 — 프레임워크/런타임/패키지매니저를 먼저 파악(package.json, lockfile):
```
교체:
```
이 프로젝트 맥락에 맞는 **공식 설치/셋업**(upgrade면 **업그레이드·마이그레이션 가이드/브레이킹 체인지**)을 확인한다 — 프레임워크/런타임/패키지매니저를 먼저 파악(package.json, lockfile):
```

- [ ] **Step 6: Step 4(런북) 1번 항목을 모드별로**

찾기:
```
1. 의존성 설치 (해당 repo의 패키지매니저로)
```
교체:
```
1. 의존성 설치(`add`) 또는 버전 범프(`upgrade`) — 해당 repo의 패키지매니저로
```

- [ ] **Step 7: 확인 + 커밋**

Run: `cd ~/projects/project-starter && grep -nE "upgrade|add \| upgrade|모드" skills/install-stack/SKILL.md | head`
Expected: upgrade 모드 언급이 description/When/Step 1/3/4에 반영.
```bash
cd ~/projects/project-starter
git add skills/install-stack/SKILL.md
git commit -m "feat(install-stack): add upgrade mode (add|upgrade)"
```

---

## Task 7: `adopt`에 in-use 평가 게이트 추가

**Files:**
- Modify: `skills/adopt-existing-project/SKILL.md`

- [ ] **Step 1: Step 4.5(빈 capability 게이트) 다음에 Step 4.6 삽입**

찾기 (Step 4.5 블록의 마지막 줄 — 계약 분리 인용):
```
> 계약 분리: Step 1~4(거버넌스)는 코드 비파괴. Step 4.5의 설치는 동의 후에만, install-stack의 게이트 하에서만.
```
그 **뒤에** 추가:
```

### Step 4.6: 기존 스택 적절성 게이트
리포트의 **"기존 스택 (적절성 점검 후보)"** 표가 있으면, 원하면 점수화 평가를 제안한다:

> "기존 스택을 점수화 평가(보안·유지보수·버전·적합성)해 업그레이드/교체 후보를 가려볼까요?"

- **동의** → `stack-assess` 스킬로 평가 → 판정별:
  - **upgrade** → 동의 시 `install-stack`(`upgrade` 모드)으로 실행(계약 B 게이트).
  - **replace-propose** → **실행 안 함.** 대안 + 영향범위 + 마이그레이션 개요만 리포트.
- **거절** → 평가 없이 종료.

> 평가(stack-assess)는 read-only다. 코드 변경은 upgrade 동의 후 install-stack 게이트 하에서만.
```

- [ ] **Step 2: 확인 + 커밋**

Run: `cd ~/projects/project-starter && grep -n "Step 4.6\|stack-assess\|기존 스택 적절성" skills/adopt-existing-project/SKILL.md`
Expected: Step 4.6 게이트 + stack-assess 참조.
```bash
cd ~/projects/project-starter
git add skills/adopt-existing-project/SKILL.md
git commit -m "feat(adopt): in-use stack assessment gate (Step 4.6)"
```

---

## Task 8: 0.7.0 → 0.8.0 + CHANGELOG

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: package.json version**

`"version": "0.7.0",` → `"version": "0.8.0",`

- [ ] **Step 2: CHANGELOG 최상단(`## [0.7.0]` 위)에 삽입**

```markdown
## [0.8.0] - 2026-06-08

### Added
- **Existing-stack assessment (`stack-assess` skill + `/assess`).** Scores the
  in-use stacks (security, maintenance, version staleness, profile fit) via
  research, weighted, threshold-flagged (<60). For below-threshold stacks it
  recommends an UPGRADE (same stack, newer version — executable via install-stack)
  or proposes a REPLACEMENT (different stack — propose-only: alternative +
  blast-radius + migration outline, never executed this cycle).
- **Deterministic in-use signals** (`scripts/lib/stack-signals.mjs`, token-free):
  installed version, usage count, and blast radius (low/medium/high) per detected
  stack — surfaced in the adopt/inspect report's new "기존 스택" section. Feeds
  stack-assess.
- **install-stack gains an `upgrade` mode** (add | upgrade share one guided engine).
- **adopt now offers an in-use assessment gate** (Step 4.6) after the empty-capability gate.

### Notes
- Replacing an in-use stack with a different one remains propose-only (execution is a separate cycle).
```

- [ ] **Step 3: consistency + 전체 테스트**

Run: `cd ~/projects/project-starter && node --test`
Expected: ALL PASS, fail 0 — 특히 `CHANGELOG.md latest version === package.json version`, `registry VERSION === package.json version`.

- [ ] **Step 4: 커밋**

```bash
cd ~/projects/project-starter
git add package.json CHANGELOG.md
git commit -m "chore: 0.7.0 → 0.8.0 (stack assess + upgrade)"
```

---

## Task 9: 통합 도그푸딩 검증 (수동 + 결정론)

**Files:** (검증만)

- [ ] **Step 1: scratch repo (낡은 스택 포함)**

```bash
mkdir -p /tmp/assess-dogfood && cd /tmp/assess-dogfood
git init -q
printf '{\n  "name": "dogfood",\n  "dependencies": { "next": "13.0.0", "drizzle-orm": "0.20.0" }\n}\n' > package.json
mkdir -p src
printf "import Link from 'next/link'\nimport {a} from 'next/navigation'\n" > src/page.tsx
printf "import {drizzle} from 'drizzle-orm'\n" > src/db.ts
git add -A && git commit -q -m "init"
```

- [ ] **Step 2: dry-run에 in-use 신호 섹션이 뜨는지(결정론)**

Run:
```bash
PROJECT_ROOT=/tmp/assess-dogfood node ~/projects/project-starter/scripts/adopt.mjs --dry-run --lang ko
```
Expected: "## 기존 스택 (적절성 점검 후보)" 표에 `nextjs | framework | 13.0.0 | 1 | low`, `drizzle | database | 0.20.0 | 1 | low` 류가 보임. 코드 변경 0.

- [ ] **Step 3: stack-assess 절차 수동 점검**

`stack-assess` SKILL.md 절차대로 nextjs(13.0.0) 평가를 수동 수행: 리서치로 최신/보안/유지보수 확인 → 버전 노후도 감점 → upgrade 판정이 합리적인지, 그리고 upgrade 동의 시 install-stack(upgrade)로 넘어가는 흐름이 문서대로인지 확인. (실제 업그레이드 실행은 clean git 게이트 동작까지만 확인하고 롤백)

- [ ] **Step 4: 정리**

```bash
rm -rf /tmp/assess-dogfood
```

- [ ] **Step 5: 결과 요약**

(a) in-use 신호 섹션 결정론 출력 (b) 버전 노후 → upgrade 판정 (c) 교체는 제안만(실행 0) (d) 전체 테스트 green — 기록.

---

## Self-Review

**Spec coverage (assess/upgrade 경로):**
- §5.2 stack-assess 4차원 점수 + blast radius + 판정 → Task 5 (스킬) + Task 1~3 (blast radius 결정론) ✅
- §5.3 install-stack upgrade 모드 → Task 6 ✅
- §6 데이터흐름 (adopt 결정론 신호 → assess → upgrade/replace) → Task 4(신호 리포트) + Task 7(게이트) ✅
- §10 AI/Node 경계 (adopt.mjs 결정론 신호만, 점수=스킬) → Task 1~4 결정론(Node) vs Task 5 점수(스킬) ✅
- §7 테스트 (blast 카운터·판정·교체 미실행) → Task 1~4 단위 + Task 9 도그푸딩 ✅
- §D7 업그레이드 실행/교체 제안만 → Task 5 Step 4 + Task 6 (replace는 코드 없음) ✅
- (단순화: per-stack profileFitHint 미구현 — File Structure 메모에 근거 명시)

**Placeholder scan:** Node 코드는 전부 완전 본문. 스킬 `<repo 절대경로>`·`<adopt-existing-project 스킬 디렉터리>`는 실행시 치환 토큰(형제 스킬과 동일 규약).

**Type/이름 일관성:** `STACK_PACKAGES`, `matchesPkg`, `pickVersion`, `fileImportsStack`, `countUsage`, `blastRadius`, `inUseSignals`, gaps 필드 `inUse`, 모드 `add|upgrade`, 판정 `ok|upgrade|replace-propose` — 전 태스크 일관. blastRadius 버킷(≤2 low, ≤10 medium, >10 high)이 Task 2 테스트와 Task 3/4 일치.

---

## Execution Handoff
Plan B (assess/upgrade). 교체(replace) **실행**은 비목표 — 후속 `migrate-stack` 사이클.
