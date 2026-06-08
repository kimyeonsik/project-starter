# Risk-Gated Stack Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교체 후보의 위험을 결정론으로 등급화하고, `low`일 때만 `install-stack`의 `replace` 모드로 가이드 실행한다 (medium+ 는 리포트만). 스펙 §1~§14.

**Architecture:** 신규 `migration-readiness.mjs`(상태위험맵·준비도신호·`migrationRisk` 등급)가 결정론 게이트를 제공한다. `stack-assess`가 교체 판정 시 등급을 산출해 분기: low→install-stack(replace), medium+→위험/준비도 리포트. 교체 실행은 install-stack의 3번째 모드(add 재사용 + 호출부 codemod + 구스택 제거 + 테스트 패리티). 별도 migrate-stack 스킬 없음.

**Tech Stack:** Node `node:test`(순수 TDD), 결정론 lib, Markdown 스킬/커맨드/README.

> **구현 대상 레포:** `~/projects/project-starter`. 모든 경로 그 레포 기준.
> **선행 스펙:** [`../specs/2026-06-08-stack-replacement-risk-gated-design.md`](../specs/2026-06-08-stack-replacement-risk-gated-design.md)

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `scripts/lib/migration-readiness.mjs` (+test) | 상태위험맵·준비도신호·`migrationRisk` 등급 (순수+fs) | 생성 |
| `scripts/lib/gap-analysis.mjs` (+test) | `analyzeGaps.readiness` + 리포트 "준비도" 한 줄 | 수정 |
| `scripts/lib/bundle-engine.mjs` | `ENGINE_LIB`에 migration-readiness.mjs 등록 | 수정 |
| `skills/install-stack/SKILL.md` | `replace` 모드(low 전용) 추가 | 수정 |
| `skills/stack-assess/SKILL.md` | 교체 판정 → 등급 게이트 분기 | 수정 |
| `commands/install.md` | replace 반영 + stale upgrade 정정 | 수정 |
| `commands/assess.md` | 교체=등급 분기 정정 | 수정 |
| `skills/adopt-existing-project/SKILL.md` | Step 4.6 교체 분기 정정 | 수정 |
| `README.md` / `README.ko.md` | 계위/흐름 다이어그램 기록 | 수정 |
| `package.json` / `CHANGELOG.md` | 0.8.0 → 0.9.0 | 수정 |

---

## Task 1: `migration-readiness` — 상태위험맵 + 등급 (순수)

**Files:**
- Create: `scripts/lib/migration-readiness.mjs`
- Create: `scripts/lib/migration-readiness.test.mjs`

- [ ] **Step 1: 실패 테스트 작성**

`scripts/lib/migration-readiness.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPABILITY_STATE_RISK, stateRiskOf, migrationRisk } from './migration-readiness.mjs';

test('CAPABILITY_STATE_RISK: stateful=high, infra=medium, stateless=low', () => {
  assert.equal(CAPABILITY_STATE_RISK.database, 'high');
  assert.equal(CAPABILITY_STATE_RISK.auth, 'high');
  assert.equal(CAPABILITY_STATE_RISK.payments, 'high');
  assert.equal(CAPABILITY_STATE_RISK.hosting, 'medium');
  assert.equal(CAPABILITY_STATE_RISK.email, 'medium');
  assert.equal(CAPABILITY_STATE_RISK.analytics, 'low');
  assert.equal(CAPABILITY_STATE_RISK['error-tracking'], 'low');
  assert.equal(CAPABILITY_STATE_RISK['test-runner'], 'low');
});

test('stateRiskOf: known → mapped, unknown → high (conservative)', () => {
  assert.equal(stateRiskOf('analytics'), 'low');
  assert.equal(stateRiskOf('database'), 'high');
  assert.equal(stateRiskOf('something-unknown'), 'high');
});

test('migrationRisk: low ONLY for stateless + low blast + hasTests', () => {
  const tests = { hasTests: true, hasCI: true };
  assert.equal(migrationRisk({ stateRisk: 'low', blast: 'low', readiness: tests }), 'low');
  // no tests → never low
  assert.equal(migrationRisk({ stateRisk: 'low', blast: 'low', readiness: { hasTests: false } }), 'medium');
  // medium blast → not low
  assert.equal(migrationRisk({ stateRisk: 'low', blast: 'medium', readiness: tests }), 'medium');
  // high blast → bumped
  assert.equal(migrationRisk({ stateRisk: 'low', blast: 'high', readiness: tests }), 'medium');
});

test('migrationRisk: stateful never low; stateful + no tests → critical', () => {
  const tests = { hasTests: true };
  assert.equal(migrationRisk({ stateRisk: 'high', blast: 'low', readiness: tests }), 'high');
  assert.equal(migrationRisk({ stateRisk: 'high', blast: 'high', readiness: tests }), 'critical');
  assert.equal(migrationRisk({ stateRisk: 'high', blast: 'low', readiness: { hasTests: false } }), 'critical');
  assert.equal(migrationRisk({ stateRisk: 'medium', blast: 'low', readiness: tests }), 'medium');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/migration-readiness.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: 최소 구현**

`scripts/lib/migration-readiness.mjs`:
```javascript
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
  if (blast === 'high') level = bump(level, 1);          // 영향 크면 가중
  if (!hasTests) level = atLeast(level, 'medium');        // 패리티 검증 불가
  if (stateRisk === 'high' && !hasTests) level = 'critical'; // 상태있음 + 안전망 없음
  // low 게이트: 진짜 안전할 때만 low 허용
  if (level === 'low' && !(stateRisk === 'low' && blast === 'low' && hasTests)) {
    level = 'medium';
  }
  return level;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/migration-readiness.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: 커밋**

```bash
cd ~/projects/project-starter
git add scripts/lib/migration-readiness.mjs scripts/lib/migration-readiness.test.mjs
git commit -m "feat(migration-readiness): state-risk map + migrationRisk grade (pure)"
```

---

## Task 2: `migration-readiness` — readinessSignals (fs)

**Files:**
- Modify: `scripts/lib/migration-readiness.mjs`
- Modify: `scripts/lib/migration-readiness.test.mjs`

- [ ] **Step 1: 실패 테스트 추가 (tmp 픽스처)**

`scripts/lib/migration-readiness.test.mjs` 끝에 추가:
```javascript
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readinessSignals } from './migration-readiness.mjs';

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
  assert.equal(r.hasTests, false); // 러너만 있고 테스트 파일 없음
  assert.equal(r.hasCI, false);
  assert.equal(r.envSeparation, false);
  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/migration-readiness.test.mjs`
Expected: FAIL — `readinessSignals` not exported.

- [ ] **Step 3: fs 래퍼 구현 추가**

`scripts/lib/migration-readiness.mjs` 끝에 추가:
```javascript
// ---- fs 래퍼 ----
const TEST_RUNNERS = ['vitest', 'jest', '@playwright/test'];
const SKIP_DIR = new Set(['node_modules', '.git', '.claude', 'dist', 'build', '.next', '.turbo', 'coverage']);
const TEST_FILE = /(\.test\.|\.spec\.)[a-z]+$|(^|\/)__tests__\//;

function readAllDeps(repoDir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/migration-readiness.test.mjs`
Expected: PASS (6 tests total).

- [ ] **Step 5: 커밋**

```bash
cd ~/projects/project-starter
git add scripts/lib/migration-readiness.mjs scripts/lib/migration-readiness.test.mjs
git commit -m "feat(migration-readiness): readinessSignals fs detector"
```

---

## Task 3: 리포트 "준비도" 한 줄 + 번들 등록

**Files:**
- Modify: `scripts/lib/gap-analysis.mjs`
- Modify: `scripts/lib/gap-analysis.test.mjs`
- Modify: `scripts/lib/bundle-engine.mjs`

- [ ] **Step 1: 실패 테스트 추가**

`scripts/lib/gap-analysis.test.mjs` 끝에 추가:
```javascript
import os from 'node:os';

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
```
(파일 상단에 `fs`,`path` import 가 이미 있다 — 없으면 추가. `os` 는 위에서 import.)

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ~/projects/project-starter && node --test scripts/lib/gap-analysis.test.mjs`
Expected: FAIL — `gaps.readiness` undefined / 준비도 줄 없음.

- [ ] **Step 3: gap-analysis.mjs 수정**

상단 import 에 추가:
```javascript
import { readinessSignals } from './migration-readiness.mjs';
```
`analyzeGaps` return 객체에 추가 (기존 필드 유지):
```javascript
    readiness: readinessSignals(repoDir),
```
`renderReport` 에서 in-use 섹션(`## 기존 스택 (적절성 점검 후보)`) 블록 **다음**, "빈 capability" 블록 **앞**에 삽입:
```javascript
  if (gaps.readiness) {
    const yn = (b) => (b ? '✓' : '✗');
    lines.push(`**마이그레이션 준비도**: 테스트 ${yn(gaps.readiness.hasTests)} · CI ${yn(gaps.readiness.hasCI)} · 환경분리 ${yn(gaps.readiness.envSeparation)} — 교체 위험 등급의 입력(테스트 없으면 교체 실행 불가).`);
    lines.push('');
  }
```

- [ ] **Step 4: bundle-engine 등록**

`scripts/lib/bundle-engine.mjs` 의 `ENGINE_LIB` 배열에 `'migration-readiness.mjs'` 추가. 예:
```javascript
const ENGINE_LIB = ['stack-detect.mjs', 'gap-analysis.mjs', 'stack-signals.mjs', 'migration-readiness.mjs', 'vendor.mjs', 'util.mjs', 'registry.mjs'];
```

- [ ] **Step 5: 테스트 통과 + 전체 회귀**

Run: `cd ~/projects/project-starter && node --test`
Expected: gap-analysis 신규 PASS + 번들 테스트 PASS(새 lib 포함) + 전체 fail 0.

- [ ] **Step 6: 커밋**

```bash
cd ~/projects/project-starter
git add scripts/lib/gap-analysis.mjs scripts/lib/gap-analysis.test.mjs scripts/lib/bundle-engine.mjs
git commit -m "feat(report): migration readiness line + bundle the lib"
```

---

## Task 4: `install-stack`에 `replace` 모드(low 전용) 추가

**Files:**
- Modify: `skills/install-stack/SKILL.md`

- [ ] **Step 1: frontmatter description 갱신**

FIND:
`This DOES modify code (deps/config/env) under strict gates. Supports two modes: \`add\` (new stack) and \`upgrade\` (same stack, newer version). Do NOT use to REPLACE a stack with a different one (replacement is propose-only — see stack-assess).`
REPLACE:
`This DOES modify code (deps/config/env) under strict gates. Three modes: \`add\` (new stack), \`upgrade\` (same stack, newer version), \`replace\` (swap to a different stack — LOW-RISK ONLY, entered solely via stack-assess's risk gate). Stateful (db/auth/payments) or higher-risk replacements are never executed here — stack-assess reports them instead.`

- [ ] **Step 2: When NOT to Use 갱신**

FIND:
`- **이미 쓰는 스택의 교체(다른 스택으로 전환)** → 이번 사이클 범위 밖 (제안만, \`stack-assess\` 참고). 안내하고 중단.
- (업그레이드 = 같은 스택 버전업은 이 스킬의 \`upgrade\` 모드로 지원한다.)`
REPLACE:
`- **상태 있는(db/auth/결제) 교체, 또는 stack-assess가 risk≥medium 으로 판정한 교체** → 실행 금지. stack-assess가 리포트한다.
- (업그레이드=같은 스택 버전업은 \`upgrade\`, 다른 스택으로의 교체는 \`replace\`[low 전용] 모드로 지원.)`

- [ ] **Step 3: When to Use에 replace 진입 추가**

FIND:
`- stack-assess가 **upgrade** 판정을 내고 사용자가 동의했을 때 (모드 \`upgrade\`)`
REPLACE:
`- stack-assess가 **upgrade** 판정을 내고 사용자가 동의했을 때 (모드 \`upgrade\`)
- stack-assess가 **교체를 risk=low 로 판정**하고 사용자가 동의했을 때 (모드 \`replace\`)`

- [ ] **Step 4: Step 1(입력 확정) 갱신**

FIND:
`- **모드**(\`add\` | \`upgrade\`), 대상 스택(이름), capability, 대상 repo 경로(기본 cwd)를 확정한다. upgrade면 **목표 버전**도.`
REPLACE:
`- **모드**(\`add\` | \`upgrade\` | \`replace\`), 대상 스택, capability, 대상 repo 경로(기본 cwd)를 확정한다. upgrade면 목표 버전, replace면 **from(구스택)·to(신스택)**.
- \`replace\` **진입 가드**: 반드시 stack-assess가 **risk=low**(상태없음+낮은blast+테스트)로 넘긴 경우에만. 상태 있는 capability이거나 risk≥medium이면 **거부**(여기로 오면 안 됨).`

- [ ] **Step 5: replace 모드 절차 섹션 추가**

찾기 — `## 검증 체크리스트` 줄 **앞**에 다음 섹션을 삽입:
```markdown
## replace 모드 (low 전용)
교체 = add 재사용 + 호출부 이전 + 구스택 제거. 위 공통 게이트(clean git/브랜치·단계 승인·검증·시크릿·대상 한정)를 그대로 따르되 순서가 다르다:
1. 진입 가드 확인(risk=low, from·to). 아니면 중단.
2. 전용 브랜치 `chore/replace-<from>-to-<to>`.
3. 신스택 설치 = `add` 절차 재사용.
4. **호출부 codemod**: blast radius 파일들을 from→to API로 **단계별 승인** 재작성(리서치 기반). 대상 외 무관 코드 금지.
5. 구스택 제거(의존성·설정).
6. **패리티 게이트**: 테스트 실행 → 통과해야 완료. 실패 시 `git`/브랜치 폐기로 롤백.
7. 거버넌스 후속(adopt 재실행).

```

- [ ] **Step 6: 확인 + 커밋**

Run: `cd ~/projects/project-starter && grep -nE "replace|진입 가드|패리티" skills/install-stack/SKILL.md | head` and `grep -c "^### Step" skills/install-stack/SKILL.md`
Expected: replace 모드 반영, 기존 8 Step 유지.
```bash
cd ~/projects/project-starter
git add skills/install-stack/SKILL.md
git commit -m "feat(install-stack): add replace mode (low-risk only)"
```

---

## Task 5: `stack-assess` 교체 판정 → 등급 게이트

**Files:**
- Modify: `skills/stack-assess/SKILL.md`

- [ ] **Step 1: Step 3 판정 문구 보강 (교체에 등급 부여)**

FIND:
`- \`< 60\` & 스택 자체 부적합(deprecated/방치/궁합 나쁨) → **replace-propose**`
REPLACE:
`- \`< 60\` & 스택 자체 부적합(deprecated/방치/궁합 나쁨) → **replace**. 이때 **교체 위험 등급**을 함께 산출한다: 상태위험(capability) · blast radius · 준비도(테스트/CI/env) → \`migrationRisk\` = low|medium|high|critical. (리포트의 "마이그레이션 준비도" 줄과 in-use 표가 입력)`

- [ ] **Step 2: Step 4 replace 동작을 등급 분기로 교체**

FIND:
`- **replace-propose** → **실행하지 않는다.** \`recommend-stack\`으로 대안 후보를 리서치하고, **영향범위(blast radius) + 마이그레이션 개요(호출부 이전·데이터·계약 변경)** 를 리포트로 제시. 실제 교체는 사용자 결정(별도 사이클).`
REPLACE:
`- **replace** → 위험 등급이 행동을 가른다:
  - **risk == low** (상태없음+낮은blast+테스트有): \`recommend-stack\`으로 대안(to)을 정한 뒤, 사용자 동의 시 \`install-stack\`을 **\`replace\` 모드**(from→to)로 호출해 가이드 실행(clean git/브랜치·codemod 단계승인·테스트 패리티 게이트). 
  - **risk ≥ medium** (상태있음 or blast 큼 or 테스트無): **실행하지 않는다.** 대안 + 위험 등급 + 영향범위 + **착수 전 전제조건 체크리스트**(dev/staging/prod 분리·백업·테스트 커버리지) + 마이그레이션 개요를 리포트로 제시. 실제 교체는 안전망을 갖춘 뒤 사람이(별도 사이클).`

- [ ] **Step 3: 원칙 문구 갱신**

FIND:
`- **업그레이드는 실행, 교체는 제안만.** 위험 등급 차이.`
REPLACE:
`- **업그레이드는 실행. 교체는 risk=low만 실행, 그 외 제안만.** 위험 등급이 게이트.`

- [ ] **Step 4: description 갱신 (does not execute replacement 정정)**

FIND:
`Read-only assessment — proposes, does not execute replacement.`
REPLACE:
`Read-only assessment that grades migration risk; a LOW-risk replacement may be executed via install-stack's replace mode, while medium+ risk is reported only (never executed).`

- [ ] **Step 5: 확인 + 커밋**

Run: `cd ~/projects/project-starter && grep -nE "risk == low|risk ≥ medium|replace 모드|migrationRisk" skills/stack-assess/SKILL.md`
Expected: 등급 분기 반영.
```bash
cd ~/projects/project-starter
git add skills/stack-assess/SKILL.md
git commit -m "feat(stack-assess): risk-gated replace (low→execute, medium+→report)"
```

---

## Task 6: 커맨드 & adopt reconciliation

**Files:**
- Modify: `commands/install.md`
- Modify: `commands/assess.md`
- Modify: `skills/adopt-existing-project/SKILL.md`

- [ ] **Step 1: commands/install.md — stale upgrade + 교체 정정**

FIND:
`이미 쓰는 스택의 교체/업그레이드는 이번 범위 밖(제안만)이다.`
REPLACE:
`업그레이드(같은 스택 버전업)는 \`upgrade\` 모드로 지원한다. 교체(다른 스택)는 stack-assess가 위험을 등급화해 **low일 때만** \`replace\` 모드로 실행하고, 그 외엔 리포트만 한다.`

- [ ] **Step 2: commands/assess.md — 교체 등급 분기 정정**

FIND:
`임계 미달이면 같은 스택 **업그레이드**(install-stack upgrade로 실행 가능) 또는 다른 스택 **교체**(제안만 — 영향범위·마이그레이션 개요)를 제시한다. 평가는 read-only다.`
REPLACE:
`임계 미달이면 같은 스택 **업그레이드**(install-stack upgrade로 실행) 또는 다른 스택 **교체**를 제시한다. 교체는 위험 등급으로 게이트: **risk=low**(상태없음+낮은blast+테스트)면 install-stack replace로 실행, **medium+**면 위험·전제조건 리포트만(실행 안 함). 평가 자체는 read-only다.`

- [ ] **Step 3: adopt Step 4.6 — replace 분기 정정**

FIND:
`  - **replace-propose** → **실행 안 함.** 대안 + 영향범위 + 마이그레이션 개요만 리포트.`
REPLACE:
`  - **replace** → 위험 등급 분기: risk=low면 동의 시 \`install-stack\`(\`replace\` 모드)으로 실행, medium+면 위험·전제조건 리포트만(실행 안 함).`

- [ ] **Step 4: 확인 + 커밋**

Run: `cd ~/projects/project-starter && grep -nE "replace|risk=low|범위 밖" commands/install.md commands/assess.md skills/adopt-existing-project/SKILL.md`
Expected: 세 곳 모두 등급 분기로 정정, "범위 밖" 잔재 없음.
```bash
cd ~/projects/project-starter
git add commands/install.md commands/assess.md skills/adopt-existing-project/SKILL.md
git commit -m "docs: reconcile replace wording (risk-gated) across commands + adopt"
```

---

## Task 7: README에 계위/흐름 다이어그램 기록

**Files:**
- Modify: `README.md`
- Modify: `README.ko.md`

- [ ] **Step 1: README.ko.md에 섹션 추가**

`README.ko.md` 끝(마지막 줄 다음)에 추가:
````markdown

## 스택 라이프사이클 (계위 & 흐름)

```
T1  어드바이저 (read-only · 리서치)   "무엇을/할지 말지 결정"
    ├─ recommend-stack : 빈 capability → 무엇을 ADD
    └─ stack-assess    : 쓰는 스택      → 점수 → {유지 · 업그레이드 · 교체}
T2  실행기 (코드 변경 · 게이트)
    └─ install-stack : add │ upgrade │ replace(low만)
보조: adopt(거버넌스+라우팅) · inspect(미리보기) · new-project-bootstrap · setup-secrets
```

- **빈 capability** → `recommend-stack` → `install-stack add`
- **쓰는 스택** → `stack-assess`(점수) → 유지 / `install-stack upgrade` / 교체
- **교체**는 위험 등급 게이트: `risk=low`(상태없음+낮은blast+테스트)면 `install-stack replace` 실행, 그 외엔 위험·전제조건 리포트만(실행 안 함). 상태있는(db/auth/결제) 교체·데이터 마이그레이션은 실행하지 않는다.
````

- [ ] **Step 2: README.md(영문)에 동일 섹션 추가**

`README.md` 끝에 추가:
````markdown

## Stack lifecycle (tiers & flow)

```
T1  Advisors (read-only, research)   "decide what / whether"
    ├─ recommend-stack : empty capability → what to ADD
    └─ stack-assess    : in-use stack     → score → {keep · upgrade · replace}
T2  Executor (changes code, gated)
    └─ install-stack : add │ upgrade │ replace (low-risk only)
Support: adopt (governance + routing) · inspect (preview) · new-project-bootstrap · setup-secrets
```

- **Empty capability** → `recommend-stack` → `install-stack add`
- **In-use stack** → `stack-assess` (score) → keep / `install-stack upgrade` / replace
- **Replacement** is risk-gated: if `risk=low` (stateless + low blast + has tests) it runs via `install-stack replace`; otherwise it is reported only (never executed). Stateful (db/auth/payments) replacements and data migrations are never executed.
````

- [ ] **Step 3: 확인 + 커밋**

Run: `cd ~/projects/project-starter && grep -n "스택 라이프사이클\|Stack lifecycle" README.ko.md README.md`
Expected: 양쪽에 섹션 존재.
```bash
cd ~/projects/project-starter
git add README.md README.ko.md
git commit -m "docs(readme): stack lifecycle tiers + flow diagram"
```

---

## Task 8: 0.8.0 → 0.9.0 + CHANGELOG

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: package.json version**

`"version": "0.8.0",` → `"version": "0.9.0",`

- [ ] **Step 2: CHANGELOG 최상단(`## [0.8.0]` 위)에 삽입**

```markdown
## [0.9.0] - 2026-06-08

### Added
- **Risk-gated stack replacement.** `stack-assess` now grades migration risk
  (state-risk × blast radius × readiness) into low/medium/high/critical. A
  replacement runs **only when risk is low** (stateless capability + low blast +
  tests present) via a new `install-stack` **`replace` mode** (add + call-site
  codemod + remove old + test-parity gate, on a dedicated branch). Medium+ risk
  is reported only — stateful (db/auth/payments) replacements and data migrations
  are never executed.
- **Deterministic readiness signals** (`scripts/lib/migration-readiness.mjs`):
  capability state-risk map, `readinessSignals` (tests / CI / env separation),
  and the `migrationRisk` grade. Surfaced as a "마이그레이션 준비도" line in the
  adopt/inspect report.
- **README**: stack lifecycle tiers (advisors / executor) + flow diagram.

### Changed
- Reconciled "replacement = propose-only" wording across stack-assess, install-stack,
  adopt, and the install/assess commands to the new risk-gated policy. Fixed a stale
  note in `/install` that still called upgrade out of scope.

### Notes
- Stateful replacement, data migration, and `stack-assess`→`assess-stack` rename remain out of scope.
```

- [ ] **Step 3: 전체 테스트 (consistency 포함)**

Run: `cd ~/projects/project-starter && node --test`
Expected: ALL pass, fail 0 — 특히 CHANGELOG===package.json 버전, registry VERSION 일치.

- [ ] **Step 4: 커밋**

```bash
cd ~/projects/project-starter
git add package.json CHANGELOG.md
git commit -m "chore: 0.8.0 → 0.9.0 (risk-gated stack replacement)"
```

---

## Task 9: 통합 도그푸딩 검증 (결정론 + 수동)

**Files:** (검증만)

- [ ] **Step 1: scratch repo — 상태없는 스택 + 테스트 있음 (low 경로)**

```bash
mkdir -p /tmp/replace-dogfood/src && cd /tmp/replace-dogfood
git init -q
printf '{\n "name":"d","devDependencies":{"jest":"29.0.0"},"dependencies":{"next":"15.0.0"}\n}\n' > package.json
printf "import 'jest'\n" > src/a.test.ts
git add -A && git commit -q -m i
```

- [ ] **Step 2: dry-run — 준비도 줄 + in-use 신호 확인**

Run:
```bash
PROJECT_ROOT=/tmp/replace-dogfood node ~/projects/project-starter/scripts/adopt.mjs --dry-run --lang ko 2>&1 | grep -A1 "마이그레이션 준비도"
```
Expected: "마이그레이션 준비도: 테스트 ✓ · CI ✗ · 환경분리 ✗" 류. (jest + a.test.ts → hasTests ✓)

- [ ] **Step 3: 등급 로직 스모크 (node 인라인)**

Run:
```bash
node --input-type=module -e "import {migrationRisk,stateRiskOf} from '/Users/y30n51k/projects/project-starter/scripts/lib/migration-readiness.mjs'; console.log('test-runner low blast +tests =', migrationRisk({stateRisk:stateRiskOf('test-runner'),blast:'low',readiness:{hasTests:true}})); console.log('database low blast +tests =', migrationRisk({stateRisk:stateRiskOf('database'),blast:'low',readiness:{hasTests:true}})); console.log('analytics low blast NO tests =', migrationRisk({stateRisk:stateRiskOf('analytics'),blast:'low',readiness:{hasTests:false}}));"
```
Expected: `test-runner ... = low`, `database ... = high`, `analytics ... NO tests = medium`.

- [ ] **Step 4: stack-assess 절차 수동 점검**

`stack-assess` SKILL.md대로 jest(test-runner) 교체 시나리오를 따라가며: risk=low 산출 → install-stack `replace` 모드 진입 가드 통과 → (실제 codemod는 수동/생략, clean git 게이트만 확인) 흐름이 문서대로인지. database 교체는 risk=high라 리포트만으로 빠지는지 확인.

- [ ] **Step 5: 정리 + 요약**

```bash
rm -rf /tmp/replace-dogfood
```
요약: (a) 준비도 줄 렌더 (b) 등급 로직(low/high/medium) 정확 (c) 상태있는 교체=리포트만 (d) 전체 테스트 green.

---

## Self-Review

**Spec coverage:**
- §3.1 위험 게이트 / low 정의 → Task 1 `migrationRisk` + 테스트(low⟺stateless+lowblast+hasTests) ✅
- §3.2 install-stack replace 모드 → Task 4 ✅
- §5 결정론 신호(상태위험·준비도·등급) → Task 1·2 ✅
- §6 데이터흐름(stack-assess 분기) → Task 5 ✅
- §4/§7/D6 README 다이어그램 → Task 7 ✅
- §7 컴포넌트(gap-analysis readiness line, bundle 등록) → Task 3 ✅
- §8 replace 절차 → Task 4 Step 5 ✅
- §9 reconciliation → Task 5(stack-assess) + Task 6(commands/adopt) ✅
- §11 테스트 → Task 1·2·3 단위 + Task 9 도그푸딩 ✅
- 비목표(상태있는 교체/데이터 실행 안 함) → Task 1 등급(high never low) + Task 4 진입 가드 ✅

**Placeholder scan:** Node 코드 완전. 스킬 find/replace 전부 구체 텍스트. 도그푸딩 명령 구체.

**Type/이름 일관성:** `CAPABILITY_STATE_RISK`·`stateRiskOf`·`migrationRisk({stateRisk,blast,readiness})`·`readinessSignals`·gaps 필드 `readiness`·모드 `add|upgrade|replace`·등급 `low|medium|high|critical` — 전 태스크 일관. low 게이트 조건이 Task1 구현·테스트·Task5 분기에서 동일(stateless+low blast+hasTests).

---

## Execution Handoff
교체 **실행은 risk=low 한정**. 상태있는 교체·데이터 마이그레이션은 비목표(향후 안전망 갖춘 사이클).
