# project-starter 범용화 & 기존 프로젝트 입양 — 구현 플랜 (P1+P2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** project-starter를 (1) 임의 스택을 capability 단위로 수용하도록 범용화하고(P1), (2) 운영중 프로젝트를 비파괴적으로 입양하는 `adopt-existing-project` 능력을 추가한다(P2).

**Architecture:** 순수 함수 감지 라이브러리(`stack-detect`)가 repo를 읽어 `{stack, capability, ruleStatus}`를 산출한다. 입양 오케스트레이터(`adopt.mjs`)가 감지 결과로 *필요한 규칙만* `./.claude/rules/`에 vendoring하고, 감지된 스택/capability opt-in을 CLAUDE.md managed block에 합성하며, 코드는 건드리지 않고 갭 리포트를 쓴다. 모든 plumbing은 기존 `scripts/lib/util.mjs`를 재사용한다.

**Tech Stack:** Node 20+ ESM, 외부 의존성 0, 테스트는 내장 `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-06-04-project-starter-adopt-existing-design.md`

**Branch:** `feat/project-adopt` (base: origin/main `ea1f777`)

---

## 파일 구조

| 파일 | 책임 | Phase |
|---|---|---|
| `package.json` (생성) | `node --test` 스크립트, name/private/type | P1 |
| `claude-rules/capabilities/*.md` (생성, 11개) | capability generic 규칙: framework·test-runner·database·error-tracking·analytics·styling·auth·payments·hosting·email·ai | P1 |
| `claude-rules/stacks/drizzle.md` (생성) | Drizzle named 규칙 | P1 |
| `claude-rules/stacks/d1.md` (생성) | Cloudflare D1 named 규칙 | P1 |
| `scripts/lib/stack-detect.mjs` (생성) | 감지: `classify`, `gatherSignals`, `detectStacks` | P1 |
| `scripts/lib/stack-detect.test.mjs` (생성) | 감지 단위 테스트 | P1 |
| `scripts/lib/gap-analysis.mjs` (생성) | 거버넌스 갭 진단 | P2 |
| `scripts/lib/gap-analysis.test.mjs` (생성) | 갭 진단 테스트 | P2 |
| `scripts/lib/vendor.mjs` (생성) | 규칙 vendoring + managed block 합성 (util.mjs 재사용) | P2 |
| `scripts/adopt.mjs` (생성) | 입양 오케스트레이터 (apply/dry-run/verify 모드) | P2 |
| `scripts/lib/adopt.test.mjs` (생성) | 입양 통합 테스트 (코드 0-diff, idempotent, 모드) | P2 |
| `skills/adopt-existing-project/SKILL.md` (생성) | 입양 스킬 문서 | P2 |
| `skills/inspect-project/SKILL.md` (생성) | read-only 점검/검증 스킬 (dry-run/verify) | P2 |
| `README.md` (수정) | adopt 사용법 한 단락 추가 | P2 |

핵심 데이터 타입 (모든 태스크 공통):

```js
// DetectedStack
// { stack: string, capability: string, ruleStatus: 'named'|'generic'|'unclassified' }
//
// capability ∈ 'framework'|'test-runner'|'database'|'error-tracking'|'analytics'|'styling'|'hosting'|'email'|'ai'
```

---

# Phase 1 — 스택 범용화

## Task 1: 테스트 하니스 (package.json)

**Files:**
- Create: `package.json`

- [ ] **Step 1: package.json 작성**

project-starter는 현재 package.json이 없다. 외부 의존성을 들이지 않고 내장 `node:test`만 쓴다.

```json
{
  "name": "project-starter",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test scripts/lib/"
  }
}
```

- [ ] **Step 2: 빈 테스트로 하니스 동작 확인**

임시 파일 `scripts/lib/_smoke.test.mjs` 작성:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('harness works', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 3: 테스트 실행해서 통과 확인**

Run: `npm test`
Expected: `tests 1 / pass 1 / fail 0`

- [ ] **Step 4: 스모크 테스트 삭제**

`scripts/lib/_smoke.test.mjs` 삭제.

- [ ] **Step 5: 커밋**

```bash
git add package.json
git commit -m "chore(test): add node:test harness (zero-dep) via package.json"
```

---

## Task 2: capability generic 규칙 (11개)

**Files:**
- Create: `claude-rules/capabilities/framework.md`
- Create: `claude-rules/capabilities/test-runner.md`
- Create: `claude-rules/capabilities/database.md`
- Create: `claude-rules/capabilities/error-tracking.md`
- Create: `claude-rules/capabilities/analytics.md`
- Create: `claude-rules/capabilities/styling.md`
- Create: `claude-rules/capabilities/auth.md`
- Create: `claude-rules/capabilities/payments.md`
- Create: `claude-rules/capabilities/hosting.md`
- Create: `claude-rules/capabilities/email.md`
- Create: `claude-rules/capabilities/ai.md`

이름이 매칭되는 named 규칙이 없을 때 적용되는 스택-독립적 generic 규칙. 기존 `stacks/*.md` 포맷(제목 + 시그널 표)을 따른다. auth/payments는 보안 크리티컬, hosting/email/ai는 감지 테이블의 모든 capability가 generic 바닥을 갖도록 메우는 것.

- [ ] **Step 1: `framework.md` 작성**

```markdown
# Capability: Framework (스택-독립)

named 규칙이 없는 프레임워크에 적용되는 generic 규칙.

## 핵심 규율

- **설치된 버전의 자체 문서를 먼저 읽어라.** 학습 데이터의 API가 아니라 repo에 설치된 실제 버전을 신뢰한다 (`node_modules/<pkg>/`의 docs/README, 또는 공식 문서를 Context7 MCP로 조회).
- 라우팅/렌더링/빌드 관습은 프레임워크 고유다 — 추측 금지, 확인 후 작성.
- 기능 추가는 `superpowers:test-driven-development`로 시작.

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| 라이브러리/SDK/CLI 문서 질문 | `claude.ai Context7` MCP 우선 |
| 신규 기능 구현 시작 | `superpowers:test-driven-development` |
```

- [ ] **Step 2: `test-runner.md` 작성**

```markdown
# Capability: Test Runner (스택-독립)

named 규칙이 없는 테스트 러너에 적용되는 generic 규칙.

## 핵심 규율

- 신규 로직/버그픽스는 **Red → Green → Refactor** (`superpowers:test-driven-development`).
- 테스트는 동작(behavior)을 검증한다 — 구현 세부가 아니라 관측 가능한 결과.
- 실패하는 테스트를 먼저 보고, 그 다음 최소 구현.

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| 신규 테스트 파일, 기능 구현 시작 | `superpowers:test-driven-development` |
| E2E/브라우저 자동화 | `anthropics/skills@webapp-testing` |
```

- [ ] **Step 3: `database.md` 작성**

```markdown
# Capability: Database / ORM (스택-독립)

named 규칙이 없는 DB/ORM에 적용되는 generic 규칙.

## 핵심 규율

- **스키마 우선.** 스키마/모델 정의를 변경하고 마이그레이션을 생성한다 — 운영 DB에 손으로 SQL 치지 않는다.
- 마이그레이션은 forward-only, 되돌릴 땐 새 마이그레이션.
- 스키마 변경 후 타입/클라이언트 생성기를 재실행한다.
- 파괴적 변경(drop/rename)은 데이터 마이그레이션 경로를 먼저 확인.

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| 쿼리/스키마 최적화 | `supabase-postgres-best-practices` (Postgres 계열인 경우) |
```

- [ ] **Step 4: `error-tracking.md` 작성**

```markdown
# Capability: Error Tracking (스택-독립)

named 규칙이 없는 에러 트래킹 도구에 적용되는 generic 규칙.

## 핵심 규율

- 프로덕션 에러는 **대시보드/이슈를 먼저 조회**한다 — 코드만 보고 원인을 지어내지 않는다.
- 핵심 비즈니스 로직은 명시적으로 예외를 캡처한다.
- 디버깅은 `superpowers:systematic-debugging`.

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| 프로덕션 에러 / 스택트레이스 | 트래킹 도구 이슈 조회 먼저 → `superpowers:systematic-debugging` |
```

- [ ] **Step 5: `analytics.md` 작성**

```markdown
# Capability: Analytics (스택-독립)

named 규칙이 없는 분석 도구에 적용되는 generic 규칙.

## 핵심 규율

- 이벤트를 심기 전에 **이벤트 택소노미를 먼저 합의**한다 (이름/속성 규약).
- 실측 지표는 분석 도구의 실제 데이터로 — 숫자를 지어내지 않는다.
- 시크릿/API 키는 `setup-secrets` 경유.

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| 퍼널/리텐션/이벤트 추적 질문 | 이벤트 택소노미 먼저; 실측은 도구 MCP/대시보드 |
```

- [ ] **Step 6: `styling.md` 작성**

```markdown
# Capability: Styling (스택-독립)

named 규칙이 없는 스타일링 방식에 적용되는 generic 규칙.

## 핵심 규율

- UI 작업은 `anthropics/skills@frontend-design` (generic AI UI 회피).
- 완료 전 접근성 점검 (`addyosmani/web-quality-skills@accessibility`).

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| UI/디자인/랜딩/대시보드/스타일 | `frontend-design` (+ 완료 전 `accessibility`) |
```

- [ ] **Step 7: `auth.md` 작성**

```markdown
# Capability: Auth (스택-독립)

named 규칙이 없는 인증/인가 라이브러리에 적용되는 generic 규칙.

## 핵심 규율 (보안 크리티컬)

- **자체 crypto/세션을 구현하지 않는다.** 검증된 라이브러리/서비스에 위임한다.
- 세션/토큰은 **httpOnly·Secure 쿠키**, 만료·갱신은 서버에서 검증.
- 인가(authorization)는 **항상 서버에서** 확인한다 — 클라이언트 판단 신뢰 금지.
- 권한 경계(소유자/역할/RLS)를 명시하고 기본은 deny.
- 시크릿(클라이언트 시크릿, JWT 서명키)은 `setup-secrets` 경유.

## Signals → Auto-Activate

| Signal | 규율 |
|---|---|
| 로그인/세션/토큰/권한 변경 | 서버 검증 경로 먼저 확인, 보안 영향 시 `security-review` |
```

- [ ] **Step 8: `payments.md` 작성**

```markdown
# Capability: Payments (스택-독립)

named 규칙이 없는 결제 연동에 적용되는 generic 규칙.

## 핵심 규율 (보안 크리티컬)

- **금액·가격은 서버에서 결정**한다 — 클라이언트가 보낸 금액을 신뢰하지 않는다.
- **웹훅 서명 검증 필수.** 검증 없는 상태 변경 금지.
- **멱등성 키**로 중복 결제/중복 처리 방지.
- 카드정보 직접 저장 금지(PCI) — 토큰화/PG 위임.
- 결제 상태의 SSOT는 **웹훅/서버 기록**이지 클라이언트 리다이렉트가 아니다.
- 키/시크릿은 `setup-secrets` 경유.

## Signals → Auto-Activate

| Signal | 규율 |
|---|---|
| 결제/구독/체크아웃/웹훅 변경 | 서명검증·멱등성 확인, 보안 영향 시 `security-review` |
```

- [ ] **Step 9: `hosting.md` 작성**

```markdown
# Capability: Hosting / Deploy (스택-독립)

named 규칙이 없는 호스팅/배포 플랫폼에 적용되는 generic 규칙.

## 핵심 규율

- 시크릿/환경변수는 **플랫폼 시크릿 매니저**에 — repo 커밋 금지.
- preview/staging/prod 환경을 분리하고 환경별 변수 매트릭스를 문서화.
- 빌드/배포 설정은 코드로 관리(IaC), 콘솔 수동 변경 최소화.

## Signals → Auto-Activate

| Signal | 규율 |
|---|---|
| 배포/환경변수/빌드 설정 변경 | 환경 분리·시크릿 위치 확인 |
```

- [ ] **Step 10: `email.md` 작성**

```markdown
# Capability: Email (스택-독립)

named 규칙이 없는 이메일 전송 도구에 적용되는 generic 규칙.

## 핵심 규율

- **서버사이드 전송만.** API 키를 클라이언트에 노출하지 않는다 (`setup-secrets` 경유).
- 발신 도메인 인증(SPF/DKIM/DMARC) 확인.
- 바운스/스팸/수신거부 처리 경로 확보.

## Signals → Auto-Activate

| Signal | 규율 |
|---|---|
| 이메일 전송 코드 추가 | 서버사이드 전송, 시크릿은 `setup-secrets` |
```

- [ ] **Step 11: `ai.md` 작성**

```markdown
# Capability: AI / LLM (스택-독립)

named 규칙이 없는 LLM/AI SDK에 적용되는 generic 규칙. (Anthropic SDK는 `stacks/claude-api.md` named 규칙 우선)

## 핵심 규율

- API 키는 **서버사이드만**, 클라이언트 노출 금지 (`setup-secrets` 경유).
- **비용 인지**: 토큰/요청량 모니터링, 가능한 캐싱(프롬프트 캐시) 적용.
- 스트리밍·타임아웃·레이트리밋·재시도 처리.
- 출력 신뢰 경계: 사용자/모델 출력은 검증 후 사용.

## Signals → Auto-Activate

| Signal | 규율 |
|---|---|
| LLM 호출 코드, 프롬프트 작성 | 키 서버사이드·비용/캐싱 확인; Anthropic이면 `claude-api` |
```

- [ ] **Step 12: 커밋**

```bash
git add claude-rules/capabilities/
git commit -m "feat(rules): add 11 capability generic rules (incl. auth/payments/hosting/email/ai)"
```

---

## Task 3: 신규 named 스택 규칙 (drizzle, d1)

**Files:**
- Create: `claude-rules/stacks/drizzle.md`
- Create: `claude-rules/stacks/d1.md`

- [ ] **Step 1: `drizzle.md` 작성**

```markdown
# Stack: Drizzle ORM

Import this file only in projects using Drizzle ORM.

## Domain Signals → Auto-Activate

| Signal (keyword / import / file) | Auto-activated / 규율 |
|---|---|
| `drizzle-orm`, `drizzle.config.*`, `schema.ts` | 스키마 우선 + 마이그레이션 규율 |
| 스키마 변경 | `drizzle-kit generate` 재실행 후 마이그레이션 검토 |
| 쿼리 작성 | 타입 추론 활용, raw SQL은 최후수단 |

## 규율

- 스키마(`schema.ts`)가 SSOT. 변경 → `drizzle-kit generate`로 마이그레이션 산출 → 검토 후 적용.
- 운영 DB에 수동 DDL 금지. 모든 변경은 마이그레이션 파일로.
- forward-only 마이그레이션. 되돌릴 땐 새 마이그레이션.
```

- [ ] **Step 2: `d1.md` 작성**

```markdown
# Stack: Cloudflare D1

Import this file only in projects using Cloudflare D1 (SQLite on Workers).

## Domain Signals → Auto-Activate

| Signal | 규율 |
|---|---|
| `wrangler.{toml,jsonc}`에 `d1_databases`, `@cloudflare/workers-types` | D1 마이그레이션 규율 |
| 마이그레이션 적용 | `wrangler d1 migrations apply <db> --local` 먼저, 그 다음 `--remote` |
| 스키마 변경 | SQLite 제약 인지 (ALTER 제한 → 테이블 재생성 패턴) |

## 규율

- D1은 SQLite다. `DROP NOT NULL`/복잡한 `ALTER` 미지원 → **테이블 재생성(rebuild)** 패턴 사용.
- 마이그레이션은 `migrations/`에 번호순. local 적용 → remote 적용 순서 엄수.
- 외래키 일시 해제가 필요하면 `PRAGMA foreign_keys = OFF;`를 마이그레이션 내에서 명시.
```

- [ ] **Step 3: 커밋**

```bash
git add claude-rules/stacks/drizzle.md claude-rules/stacks/d1.md
git commit -m "feat(stacks): add drizzle and cloudflare d1 named rules"
```

---

## Task 4: `classify` 순수 함수 (TDD)

**Files:**
- Create: `scripts/lib/stack-detect.mjs`
- Test: `scripts/lib/stack-detect.test.mjs`

`classify`는 부수효과 없는 순수 함수다: gather된 `Signals`와 사용 가능한 named 규칙 집합을 받아 `DetectedStack[]`를 반환.

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/lib/stack-detect.test.mjs`:

```js
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
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node --test scripts/lib/stack-detect.test.mjs`
Expected: FAIL — `Cannot find module './stack-detect.mjs'` 또는 `classify is not a function`

- [ ] **Step 3: `stack-detect.mjs` 구현 (classify + makeSignals)**

```js
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

// ---- 시그널 모델 ----
// Signals: { deps: Set<string>, hasFile(prefix): bool, wranglerHasD1: bool, hasWrangler: bool }
export function makeSignals({ deps = [], files = [], wranglerHasD1 = false } = {}) {
  const depSet = new Set(deps);
  const fileList = files;
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

// capability별 generic 규칙 존재 여부 (claude-rules/capabilities/*.md 와 일치해야 함)
const CAPABILITIES_WITH_GENERIC = new Set([
  'framework', 'test-runner', 'database', 'error-tracking', 'analytics', 'styling',
  'auth', 'payments', 'hosting', 'email', 'ai',
]);

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
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node --test scripts/lib/stack-detect.test.mjs`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add scripts/lib/stack-detect.mjs scripts/lib/stack-detect.test.mjs
git commit -m "feat(detect): classify() pure stack/capability/ruleStatus mapping (TDD)"
```

---

## Task 5: `gatherSignals` + `detectStacks` (파일시스템, 픽스처 TDD)

**Files:**
- Modify: `scripts/lib/stack-detect.mjs` (함수 추가)
- Modify: `scripts/lib/stack-detect.test.mjs` (테스트 추가)
- Test fixtures: 테스트 내에서 임시 디렉토리 생성

- [ ] **Step 1: 실패하는 픽스처 테스트 추가**

`scripts/lib/stack-detect.test.mjs` 하단에 추가:

```js
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
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node --test scripts/lib/stack-detect.test.mjs`
Expected: FAIL — `gatherSignals is not a function`

- [ ] **Step 3: `gatherSignals` + `detectStacks` 구현 (stack-detect.mjs에 추가)**

```js
// ---- 파일시스템 감지 ----

const CONFIG_PREFIXES = [
  'next.config', 'drizzle.config', 'vercel.json', 'playwright.config',
  'vitest.config', 'svelte.config', 'astro.config', 'tailwind.config',
];

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
```

> 주: `CONFIG_PREFIXES`는 `makeSignals`의 `hasFile`이 prefix 매칭하므로 별도 필터 없이 top-level 파일명을 그대로 넘긴다. (예: `next.config.ts`가 `hasFile('next.config')`에 매칭)

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node --test scripts/lib/stack-detect.test.mjs`
Expected: PASS (전체 11 tests)

- [ ] **Step 5: 실제 scaffold-at으로 스모크 확인 (수동, 선택)**

Run: `node -e "import('./scripts/lib/stack-detect.mjs').then(m => console.log(m.detectStacks('/Users/y30n51k/projects/scaffold-at')))"`
Expected: nextjs/drizzle/d1/cloudflare/sentry/amplitude/vitest 등이 `named`로, 미보유 스택은 `generic`으로 출력.

- [ ] **Step 6: 커밋**

```bash
git add scripts/lib/stack-detect.mjs scripts/lib/stack-detect.test.mjs
git commit -m "feat(detect): gatherSignals + detectStacks with fixture tests"
```

---

# Phase 2 — 기존 프로젝트 입양 (`adopt-existing-project`)

## Task 6: 갭 진단 모듈 (TDD)

**Files:**
- Create: `scripts/lib/gap-analysis.mjs`
- Test: `scripts/lib/gap-analysis.test.mjs`

거버넌스 갭을 진단한다: 대상 repo에 표준 거버넌스 산출물이 있는지, 감지된 스택 중 named 규칙이 없는 것(⚠️)을 리포트로 만든다. **읽기 전용 — 아무 파일도 안 고친다.**

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/lib/gap-analysis.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeGaps, renderReport } from './gap-analysis.mjs';

function mkDir(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-gap-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

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
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node --test scripts/lib/gap-analysis.test.mjs`
Expected: FAIL — `Cannot find module './gap-analysis.mjs'`

- [ ] **Step 3: `gap-analysis.mjs` 구현**

```js
// scripts/lib/gap-analysis.mjs
// 거버넌스 갭 진단 — 읽기 전용. 대상 repo를 절대 수정하지 않는다.

import fs from 'node:fs';
import path from 'node:path';

// 표준 거버넌스 산출물 체크리스트.
const GOVERNANCE = [
  { key: '_team/', kind: 'dir' },
  { key: 'docs/adr/', kind: 'dir' },
  { key: 'CLAUDE.md', kind: 'file' },
  { key: 'CONTEXT.md', kind: 'file' },
];

function existsRel(repoDir, rel) {
  try {
    fs.lstatSync(path.join(repoDir, rel.replace(/\/$/, '')));
    return true;
  } catch {
    return false;
  }
}

export function analyzeGaps(repoDir, detected) {
  const missing = GOVERNANCE.filter((g) => !existsRel(repoDir, g.key)).map((g) => g.key);
  const unsupportedStacks = detected
    .filter((d) => d.ruleStatus === 'generic' || d.ruleStatus === 'unclassified')
    .map((d) => d.stack);
  return { missing, unsupportedStacks };
}

export function renderReport(gaps, detected) {
  const lines = [];
  lines.push('# project-starter 입양 리포트');
  lines.push('');
  lines.push('> 이 리포트는 진단 결과다. **코드는 변경되지 않았다.** 아래 제안은 사용자 승인 후 별도로 진행한다.');
  lines.push('');
  lines.push('## 감지된 스택');
  lines.push('');
  lines.push('| 스택 | capability | 규칙 |');
  lines.push('|---|---|---|');
  for (const d of detected) {
    const mark = d.ruleStatus === 'named' ? '✅ named' : d.ruleStatus === 'generic' ? '⚠️ generic' : '❓ unclassified';
    lines.push(`| ${d.stack} | ${d.capability} | ${mark} |`);
  }
  lines.push('');
  if (gaps.unsupportedStacks.length) {
    lines.push('## ⚠️ 전용 규칙 없는 스택 (generic으로 커버 중)');
    lines.push('');
    for (const s of gaps.unsupportedStacks) {
      lines.push(`- **${s}** — capability generic 규칙으로 동작 중. 정교화하려면 \`claude-rules/stacks/${s}.md\` 추가 권장.`);
    }
    lines.push('');
  }
  if (gaps.missing.length) {
    lines.push('## 누락된 거버넌스 산출물 (제안)');
    lines.push('');
    for (const m of gaps.missing) {
      lines.push(`- \`${m}\` 없음 — 추가 권장 (적용은 승인 후 별건).`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node --test scripts/lib/gap-analysis.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add scripts/lib/gap-analysis.mjs scripts/lib/gap-analysis.test.mjs
git commit -m "feat(adopt): read-only governance gap analysis + report renderer (TDD)"
```

---

## Task 7: vendoring 유틸 (managed block 합성, util.mjs 재사용)

**Files:**
- Create: `scripts/lib/vendor.mjs`

감지된 규칙만 `./.claude/rules/`에 복사하고, 감지된 core+capability+named opt-in을 import하는 CLAUDE.md managed block을 합성한다. `util.mjs`의 managed-block 헬퍼를 재사용한다.

- [ ] **Step 1: `vendor.mjs` 구현**

```js
// scripts/lib/vendor.mjs
// 감지 기반 selective vendoring. install.mjs 와 동일한 util 헬퍼를 재사용한다.

import fs from 'node:fs';
import path from 'node:path';
import {
  exists, backupIfExists, stripManagedBlock, hasManagedBlock, wrapManagedBlock, timestamp,
} from './util.mjs';

// generic 규칙이 존재하는 capability (capabilities/*.md 와 일치해야 함)
const GENERIC_CAPS = new Set([
  'framework', 'test-runner', 'database', 'error-tracking', 'analytics', 'styling',
  'auth', 'payments', 'hosting', 'email', 'ai',
]);

// generic capability 규칙은 "해당 capability에 named 없는(=generic/unclassified) 스택이
// 하나라도 있을 때만" 설치한다 (Tier1 fallback floor). named로 완전히 덮인 capability는 생략.
// 예: database에 drizzle(named)+prisma(generic) → database.md 설치(prisma 바닥); hosting에 cloudflare(named)뿐 → 생략.
function capabilityFiles(detected) {
  const caps = new Set();
  for (const d of detected) {
    if ((d.ruleStatus === 'generic' || d.ruleStatus === 'unclassified') && GENERIC_CAPS.has(d.capability)) {
      caps.add(d.capability);
    }
  }
  return [...caps].map((c) => `${c}.md`);
}

// 감지된 named 스택 → 설치할 stacks 규칙 파일명
function namedStackFiles(detected) {
  return detected.filter((d) => d.ruleStatus === 'named').map((d) => `${d.stack}.md`);
}

// CLAUDE.md managed block 본문 생성 (project scope 상대경로 @.claude/rules/...)
export function buildManagedBody(detected) {
  const lines = [];
  lines.push('# Global Rules (managed by project-starter)');
  lines.push('');
  lines.push('@.claude/rules/language.md');
  lines.push('@.claude/rules/agent-teams.md');
  lines.push('@.claude/rules/skill-activation.md');
  lines.push('');
  const caps = capabilityFiles(detected);
  if (caps.length) {
    lines.push('## Capabilities (generic fallback)');
    lines.push('');
    for (const f of caps) lines.push(`@.claude/rules/capabilities/${f}`);
    lines.push('');
  }
  const named = namedStackFiles(detected);
  if (named.length) {
    lines.push('## Stacks (detected)');
    lines.push('');
    for (const f of named) lines.push(`@.claude/rules/stacks/${f}`);
    lines.push('');
  }
  return lines.join('\n');
}

// 규칙 파일을 대상 repo의 ./.claude/rules/ 로 복사 (selective).
// repoDir: 대상, sourceRoot: project-starter 레포 루트, lang: 'en'|'ko'
export function vendorRules(repoDir, sourceRoot, detected, lang = 'en') {
  const TS = timestamp();
  const rulesDir = path.join(repoDir, '.claude', 'rules');
  fs.mkdirSync(path.join(rulesDir, 'stacks'), { recursive: true });
  fs.mkdirSync(path.join(rulesDir, 'capabilities'), { recursive: true });

  // core 3종 (언어별)
  for (const f of ['language.md', 'agent-teams.md', 'skill-activation.md']) {
    const src = path.join(sourceRoot, 'claude-rules', lang, f);
    const dest = path.join(rulesDir, f);
    backupIfExists(dest, TS);
    fs.copyFileSync(src, dest);
  }
  // capability generic 규칙 (감지된 것만)
  for (const f of capabilityFiles(detected)) {
    const src = path.join(sourceRoot, 'claude-rules', 'capabilities', f);
    const dest = path.join(rulesDir, 'capabilities', f);
    backupIfExists(dest, TS);
    fs.copyFileSync(src, dest);
  }
  // named 스택 규칙 (감지된 것만)
  for (const f of namedStackFiles(detected)) {
    const src = path.join(sourceRoot, 'claude-rules', 'stacks', f);
    const dest = path.join(rulesDir, 'stacks', f);
    backupIfExists(dest, TS);
    fs.copyFileSync(src, dest);
  }
  return { rulesDir };
}

// 이 detected에 대해 vendorRules가 설치할 규칙 파일들의 상대경로(.claude/ 기준).
// verify 모드가 "설치돼 있어야 할 파일"을 동일 로직으로 재사용하기 위해 export.
export function plannedRuleFiles(detected) {
  const files = ['rules/language.md', 'rules/agent-teams.md', 'rules/skill-activation.md'];
  for (const f of capabilityFiles(detected)) files.push(`rules/capabilities/${f}`);
  for (const f of namedStackFiles(detected)) files.push(`rules/stacks/${f}`);
  return files;
}

// CLAUDE.md 에 managed block 합성/갱신 (idempotent). 기존 사용자 내용 보존.
export function mergeClaudeMd(repoDir, detected) {
  const TS = timestamp();
  const claudeMd = path.join(repoDir, 'CLAUDE.md');
  const block = wrapManagedBlock(buildManagedBody(detected));
  if (exists(claudeMd)) {
    backupIfExists(claudeMd, TS);
    let content = fs.readFileSync(claudeMd, 'utf8');
    if (hasManagedBlock(content)) content = stripManagedBlock(content);
    content = content.replace(/\n+$/, '');
    fs.writeFileSync(claudeMd, content.length ? `${content}\n\n${block}` : block);
  } else {
    fs.writeFileSync(claudeMd, block);
  }
  return { claudeMd };
}
```

- [ ] **Step 2: 커밋**

```bash
git add scripts/lib/vendor.mjs
git commit -m "feat(adopt): selective rule vendoring + managed-block synthesis (reuses util.mjs)"
```

---

## Task 8: `adopt.mjs` 오케스트레이터 (apply/dry-run/verify) + 통합 테스트

**Files:**
- Create: `scripts/adopt.mjs`
- Test: `scripts/lib/adopt.test.mjs`

감지 → selective vendor → CLAUDE.md 합성 → 갭 리포트(`.claude/adopt-report.md`). **소스 코드 무변경.** 세 모드: `apply`(기본), `dry-run`(read-only 점검), `verify`(설치 상태 검증).

- [ ] **Step 1: 실패하는 통합 테스트 작성**

`scripts/lib/adopt.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAdopt } from '../adopt.mjs';

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function mkRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-adopt-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

function snapshot(dir) {
  // 소스 코드 파일들의 (경로→내용) 맵. .claude/ 와 CLAUDE.md 는 제외(우리가 만드는 것).
  const out = {};
  const walk = (d, base = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = path.join(base, e.name);
      if (rel.startsWith('.claude') || rel === 'CLAUDE.md') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full, rel);
      else out[rel] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(dir);
  return out;
}

test('runAdopt: does not modify source code (0-diff)', () => {
  const dir = mkRepo({
    'package.json': { dependencies: { next: '15', '@prisma/client': '5' } },
    'src/index.ts': 'export const x = 1;\n',
  });
  const before = snapshot(dir);
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  const after = snapshot(dir);
  assert.deepEqual(after, before);
});

test('runAdopt: vendors rules self-contained (no @~/ imports)', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { next: '15' } } });
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'rules', 'language.md')));
  const claudeMd = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.doesNotMatch(claudeMd, /@~\/\.claude/);
  assert.match(claudeMd, /@\.claude\/rules\/language\.md/);
});

test('runAdopt: writes gap report flagging prisma as generic', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { '@prisma/client': '5' } } });
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  const report = fs.readFileSync(path.join(dir, '.claude', 'adopt-report.md'), 'utf8');
  assert.match(report, /prisma/);
});

test('runAdopt: idempotent (second run adds no new diff)', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { next: '15' } } });
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  const md1 = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  const md2 = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.equal(md2, md1);
});

test('runAdopt: preserves existing CLAUDE.md user content', () => {
  const dir = mkRepo({
    'package.json': { dependencies: { next: '15' } },
    'CLAUDE.md': '# My Project\n\nCustom user notes.\n',
  });
  runAdopt(dir, { sourceRoot: SOURCE_ROOT });
  const md = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /Custom user notes\./);
  assert.match(md, /BEGIN project-starter/);
});

test('runAdopt dry-run: read-only, writes nothing', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { next: '15' } } });
  const res = runAdopt(dir, { sourceRoot: SOURCE_ROOT, mode: 'dry-run' });
  assert.equal(res.mode, 'dry-run');
  assert.ok(res.report.length > 0);
  assert.ok(!fs.existsSync(path.join(dir, '.claude')));
  assert.ok(!fs.existsSync(path.join(dir, 'CLAUDE.md')));
});

test('runAdopt verify: false before apply, true after', () => {
  const dir = mkRepo({ 'package.json': { dependencies: { next: '15', '@clerk/nextjs': '5' } } });
  const before = runAdopt(dir, { sourceRoot: SOURCE_ROOT, mode: 'verify' });
  assert.equal(before.verification.ok, false);
  runAdopt(dir, { sourceRoot: SOURCE_ROOT, mode: 'apply' });
  const after = runAdopt(dir, { sourceRoot: SOURCE_ROOT, mode: 'verify' });
  assert.equal(after.verification.ok, true);
  assert.deepEqual(after.verification.missing, []);
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node --test scripts/lib/adopt.test.mjs`
Expected: FAIL — `Cannot find module '../adopt.mjs'`

- [ ] **Step 3: `adopt.mjs` 구현**

```js
#!/usr/bin/env node
// scripts/adopt.mjs
// 운영중 프로젝트 입양: 감지 → (모드별) vendor/검증 → 갭 리포트.
// 소스 코드를 절대 수정하지 않는다. Idempotent.
//
// 모드:
//   apply   (기본) 규칙 vendoring + CLAUDE.md 합성 + adopt-report.md 작성
//   dry-run        감지+갭만, 아무것도 안 씀 (read-only 점검)
//   verify         설치 상태 검증(예상 규칙 파일/관리블록 존재), 안 씀
//
// CLI: node scripts/adopt.mjs [--lang ko|en] [--dry-run] [--verify]
//      (대상 = cwd 또는 PROJECT_ROOT)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { info, ok, warn, hasManagedBlock } from './lib/util.mjs';
import { detectStacks } from './lib/stack-detect.mjs';
import { analyzeGaps, renderReport } from './lib/gap-analysis.mjs';
import { vendorRules, mergeClaudeMd, plannedRuleFiles } from './lib/vendor.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE_ROOT = path.resolve(SCRIPT_DIR, '..');

// 설치 상태 검증 (read-only): 예상 규칙 파일 + CLAUDE.md 관리블록 존재 확인.
function verifyInstalled(repoDir, detected) {
  const claudeDir = path.join(repoDir, '.claude');
  const missing = [];
  for (const rel of plannedRuleFiles(detected)) {
    if (!fs.existsSync(path.join(claudeDir, rel))) missing.push(rel);
  }
  const claudeMd = path.join(repoDir, 'CLAUDE.md');
  const mdOk = fs.existsSync(claudeMd) && hasManagedBlock(fs.readFileSync(claudeMd, 'utf8'));
  if (!mdOk) missing.push('CLAUDE.md (managed block)');
  return { ok: missing.length === 0, missing };
}

export function runAdopt(repoDir, opts = {}) {
  const sourceRoot = opts.sourceRoot || DEFAULT_SOURCE_ROOT;
  const lang = opts.lang || 'en';
  const mode = opts.mode || 'apply';
  const stacksDir = path.join(sourceRoot, 'claude-rules', 'stacks');

  const detected = detectStacks(repoDir, { stacksDir });
  const gaps = analyzeGaps(repoDir, detected);
  const report = renderReport(gaps, detected);

  if (mode === 'dry-run') {
    return { mode, detected, gaps, report }; // read-only: 아무 파일도 안 씀
  }
  if (mode === 'verify') {
    return { mode, detected, gaps, report, verification: verifyInstalled(repoDir, detected) };
  }

  // apply (코드 비파괴 — .claude/ 와 CLAUDE.md 만 건드림)
  vendorRules(repoDir, sourceRoot, detected, lang);
  mergeClaudeMd(repoDir, detected);
  const reportPath = path.join(repoDir, '.claude', 'adopt-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  return { mode, detected, gaps, report, reportPath };
}

// ---- CLI ----
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(SCRIPT_DIR, 'adopt.mjs');
if (isMain) {
  const argv = process.argv.slice(2);
  const langIdx = argv.indexOf('--lang');
  const lang = langIdx >= 0 ? argv[langIdx + 1] : 'en';
  const mode = argv.includes('--dry-run') ? 'dry-run' : argv.includes('--verify') ? 'verify' : 'apply';
  const repoDir = process.env.PROJECT_ROOT || process.cwd();
  info(`Adopt (${mode}): ${repoDir}`);
  const res = runAdopt(repoDir, { lang, mode });
  if (mode === 'dry-run') {
    console.log('\n' + res.report);
    ok('Dry-run 완료 — 아무 파일도 변경하지 않았습니다.');
  } else if (mode === 'verify') {
    if (res.verification.ok) ok('Verify 통과 — 예상 규칙/관리블록 모두 존재.');
    else warn(`Verify 누락: ${res.verification.missing.join(', ')}`);
  } else {
    ok(`Detected ${res.detected.length} stack(s); rules vendored to ./.claude/rules/`);
    if (res.gaps.unsupportedStacks.length) {
      warn(`Generic-only stacks (no dedicated rule): ${res.gaps.unsupportedStacks.join(', ')}`);
    }
    ok(`Gap report: ${res.reportPath}`);
    console.log('\n소스 코드는 변경되지 않았습니다. 리포트의 제안은 승인 후 별도 진행하세요.');
  }
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node --test scripts/lib/adopt.test.mjs`
Expected: PASS (7 tests)

- [ ] **Step 5: 전체 테스트 스위트 통과 확인**

Run: `npm test`
Expected: 전체 PASS (stack-detect 13 + gap 4 + adopt 7 = 24 tests)

- [ ] **Step 6: 커밋**

```bash
git add scripts/adopt.mjs scripts/lib/adopt.test.mjs
git commit -m "feat(adopt): adopt.mjs orchestrator with apply/dry-run/verify modes (code-nondestructive, idempotent)"
```

---

## Task 9: `adopt-existing-project` 스킬 문서

**Files:**
- Create: `skills/adopt-existing-project/SKILL.md`

`new-project-bootstrap`과 트리거가 정반대인 별도 스킬. Claude가 운영중 repo에서 입양을 수행할 때의 절차서.

- [ ] **Step 1: `SKILL.md` 작성**

```markdown
---
name: adopt-existing-project
description: Apply project-starter governance to an EXISTING, running project without scaffolding new code. Detects the in-use stack, vendors only the matching rules into ./.claude/rules/, synthesizes a CLAUDE.md managed block, and writes a non-destructive gap report. Use when the user wants to bring project-starter conventions into a repo that already has code. Do NOT use for empty directories (use new-project-bootstrap instead).
---

# Adopt Existing Project

운영중 프로젝트에 project-starter 거버넌스를 **비파괴적으로** 입힌다. 코드를 새로 깔지 않는다.

## When to Use
- 이미 코드가 있는 repo에 규칙/거버넌스를 적용하고 싶을 때
- 고객/외부 repo를 표준 기판 위로 올릴 때

## When NOT to Use
- 빈 디렉토리 → `new-project-bootstrap`
- 사용자가 "스킬 쓰지 마" 명시

## 불변 원칙 (절대 위반 금지)
1. **코드 비파괴**: 소스/설정 파일을 수정/덮어쓰지 않는다. `.claude/` 와 `CLAUDE.md` 만 건드린다.
2. **self-contained vendoring**: 규칙을 repo 안 `./.claude/rules/` 로 복사한다 (`@~/` 글로벌 임포트 금지).
3. **idempotent**: 두 번 돌려도 추가 변경 없음 (managed block 마커로 갱신).

## 절차

### Step 1: 대상 확인
대상 repo 경로 확인 (기본 cwd). `.git` 외 파일이 있어야 한다 (빈 디렉토리면 중단 → bootstrap 안내).

### Step 2: 입양 실행
```bash
# 한국어 규칙으로 입양 (project-starter 레포에서 대상 경로를 PROJECT_ROOT로):
PROJECT_ROOT=/path/to/target node /path/to/project-starter/scripts/adopt.mjs --lang ko
```
이 스크립트가 수행: 스택 감지 → 필요한 규칙만 `./.claude/rules/` 복사 → CLAUDE.md managed block 합성 → `./.claude/adopt-report.md` 생성.

### Step 3: 리포트 함께 검토
`./.claude/adopt-report.md`를 사용자와 함께 본다:
- ✅ named: 전용 규칙 적용됨
- ⚠️ generic: 쓰고 있지만 전용 규칙 없음 → capability generic으로 커버. 원하면 `stacks/<name>.md` 추가 권장.
- 누락된 거버넌스 산출물(`_team/`, `docs/adr/`, `CONTEXT.md` 등) 제안.

### Step 4: 개선 제안은 승인 후 별건
리포트의 제안(테스트 셋업 보강, ADR 작성 등)은 **사용자 승인 후 별도 작업**으로 진행한다. 입양 스킬 자체는 코드에 손대지 않는다.

## 검증 체크리스트
- [ ] 소스 코드 `git diff` 0줄 (`.claude/`·`CLAUDE.md` 외 변경 없음)
- [ ] `./.claude/rules/` 에 규칙 존재, `@~/` 미포함
- [ ] `./.claude/adopt-report.md` 생성
- [ ] 재실행 시 추가 diff 없음 (idempotent)
```

- [ ] **Step 2: 커밋**

```bash
git add skills/adopt-existing-project/SKILL.md
git commit -m "feat(skill): add adopt-existing-project skill doc"
```

---

## Task 10: README 한 단락 + 최종 검증

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README에 adopt 단락 추가**

`README.md`의 "What It Sets Up" 또는 "Install" 섹션 근처에 추가 (정확한 위치는 기존 헤딩 구조에 맞춰, "Bootstrap skill" 설명 다음 줄):

```markdown
### Adopt an existing project

For a repo that already has code, use the adopt flow instead of bootstrap — it
detects the in-use stack, vendors only the matching rules into `./.claude/rules/`,
synthesizes a `CLAUDE.md` managed block, and writes a non-destructive
`./.claude/adopt-report.md`. It never modifies your source code.

```bash
PROJECT_ROOT=/path/to/your/repo node scripts/adopt.mjs --lang en
```

Unsupported-but-in-use stacks fall back to capability-generic rules and are
flagged in the report for optional dedicated-rule authoring later.

Preview without changing anything (`--dry-run`), or verify an applied install
(`--verify`):

```bash
PROJECT_ROOT=/path/to/your/repo node scripts/adopt.mjs --dry-run
PROJECT_ROOT=/path/to/your/repo node scripts/adopt.mjs --verify
```
```

- [ ] **Step 2: 전체 테스트 + lint-free 확인**

Run: `npm test`
Expected: 20 tests PASS, 0 fail.

- [ ] **Step 3: scaffold-at 실측 드라이런 (수동 검증)**

scaffold-at 복제본에 입양을 돌려 코드 무변경 + 규칙 vendoring 확인:

```bash
cp -R /Users/y30n51k/projects/scaffold-at /tmp/scaffold-at-adopt-test
cd /Users/y30n51k/projects/project-starter
PROJECT_ROOT=/tmp/scaffold-at-adopt-test node scripts/adopt.mjs --lang ko
cd /tmp/scaffold-at-adopt-test && git status --short
```
Expected: `git status`에 `.claude/`, `CLAUDE.md` 변경만 보이고 **소스 코드 변경 0**. `.claude/adopt-report.md`에 nextjs/drizzle/d1=named, 미보유 스택=generic 표기.

```bash
rm -rf /tmp/scaffold-at-adopt-test
```

- [ ] **Step 4: 커밋**

```bash
git add README.md
git commit -m "docs(readme): document adopt-existing flow"
```

---

## Task 11: `inspect-project` 스킬 (read-only 점검)

**Files:**
- Create: `skills/inspect-project/SKILL.md`

adopt를 적용하지 않고 현재 상태만 진단하는 read-only 스킬. `adopt.mjs --dry-run`(점검)과 `--verify`(적용후 검증)를 감싼다.

- [ ] **Step 1: `SKILL.md` 작성**

```markdown
---
name: inspect-project
description: Read-only inspection of a project's stack and governance gaps WITHOUT modifying anything. Detects in-use stacks, classifies each as named/generic, and reports missing governance — a dry-run of adopt-existing-project. Use when the user wants to check current state, audit governance, or preview what adoption would do before applying. Also covers post-adoption verification.
---

# Inspect Project (read-only)

현재 프로젝트의 스택과 거버넌스 갭을 **아무것도 바꾸지 않고** 진단한다. (`adopt-existing-project`의 dry-run)

## When to Use
- "지금 상태 점검", "뭐가 빠졌나", "적용하면 뭐가 바뀌나 미리 보기"
- 입양(adopt) 적용 전 영향 미리 확인, 또는 적용 후 설치 검증

## 점검 (적용 전, read-only)
```bash
PROJECT_ROOT=/path/to/target node /path/to/project-starter/scripts/adopt.mjs --dry-run
```
출력: 감지된 스택(✅ named / ⚠️ generic) + 누락 거버넌스. **파일을 전혀 쓰지 않는다.**

## 검증 (적용 후)
```bash
PROJECT_ROOT=/path/to/target node /path/to/project-starter/scripts/adopt.mjs --verify
```
예상 규칙 파일·CLAUDE.md 관리블록이 모두 있으면 통과, 없으면 누락 목록 출력. (read-only)

## 불변 원칙
- `--dry-run`·`--verify`는 **read-only** — 어떤 파일도 수정하지 않는다.
```

- [ ] **Step 2: 커밋**

```bash
git add skills/inspect-project/SKILL.md
git commit -m "feat(skill): add inspect-project read-only skill (dry-run/verify wrapper)"
```

---

## 완료 기준 (Definition of Done)

- [ ] `npm test` 전부 통과 (~24 tests)
- [ ] `claude-rules/capabilities/` 11개 (auth/payments/hosting/email/ai 포함) + `stacks/drizzle.md`,`stacks/d1.md` 존재
- [ ] `scripts/lib/stack-detect.mjs` — scaffold-at에서 named/generic 정확 분류 (auth/payments 포함)
- [ ] `scripts/adopt.mjs` — apply/dry-run/verify 3모드; 코드 0-diff, self-contained vendoring, idempotent (통합 테스트로 강제)
- [ ] `skills/adopt-existing-project/SKILL.md` + `skills/inspect-project/SKILL.md` 존재
- [ ] scaffold-at 드라이런(`--dry-run`)에서 소스 변경 0 확인

## 의도적 보류 (이 플랜 밖)
- **스펙 §5.5 — bootstrap 감지 분기**: `new-project-bootstrap`의 Supabase 고정 선택을 `stack-detect` 기반으로 바꾸는 작업은 **신규 프로젝트 경로에만** 영향을 준다. 이번 목표(운영중 프로젝트 입양)와 무관하므로 보류한다. `stack-detect`가 이 플랜에서 완성되므로 후속 플랜에서 bootstrap에 끼우기만 하면 된다.
- **P3**: scaffold-at에 입양 실제 적용 (별도 플랜)
- **P4**: scaffold.at 워커가 고객 repo에 자동 입양 (별도 플랜)
- **Tier 3**: 미지원 스택 규칙 자동 생성
