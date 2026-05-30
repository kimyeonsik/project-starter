---
name: new-project-bootstrap
description: Bootstrap a new Next.js + TypeScript + pnpm project with Sentry, Amplitude, Supabase Auth, Vitest, and Playwright pre-configured. Use when the user wants to start a new web/mobile project from scratch and needs standardized infrastructure (analytics, crash reporting, testing). Triggers after `superpowers:brainstorming` confirms project scope.
---

# New Project Bootstrap

새 프로젝트의 표준 인프라를 결정론적으로 셋업한다. `superpowers:brainstorming` 결과로 앱 컨셉이 명확해진 후 호출된다.

## When to Use

- 빈 디렉토리 또는 신규 디렉토리에서 사용자가 "프로젝트 시작", "처음 만들" 등 표현
- 인프라 표준화가 필요한 새 Next.js 프로젝트
- 분석/크래시/테스트가 처음부터 포함된 환경 필요

## When NOT to Use

- 기존 프로젝트에 일부만 추가 (개별 통합은 직접 진행)
- Next.js가 아닌 스택 (Vite SPA, Remix 등)
- 메인 세션에서 사용자가 "스킬 쓰지 마" 명시

## Required Decisions (인터뷰)

스킬 시작 시 사용자에게 다음을 확인. 디폴트 답이 있으면 그대로 진행.

| 항목 | 디폴트 | 확인 필요 |
|---|---|---|
| 프로젝트 이름 (디렉토리명) | 현재 디렉토리명 | 변경 원하면 사용자 입력 |
| 앱 설명 (1~2줄) | — | **필수 입력** |
| GitHub 레포 생성 | yes (private) | 거절 시 로컬만 |
| Supabase 프로젝트 생성 | yes (MCP로 자동) | 기존 프로젝트 연결 가능 |
| Sentry 프로젝트 생성 | yes | 거절 시 SDK만 설치 |
| Amplitude API key | 사용자 입력 또는 placeholder | 나중 주입 가능 |

## Bootstrap 단계 (순서 엄수)

### Step 1: 환경 확인

```bash
node --version  # >= 20
pnpm --version  # 없으면 corepack enable 또는 npm i -g pnpm
gh --version    # GitHub 레포 생성 시 필요
pwd             # 현재 디렉토리 확인
ls -la          # 빈 디렉토리인지 확인 (.git 외 파일 있으면 사용자 확인)
```

빈 디렉토리가 아니면 **중단하고 사용자 확인**.

### Step 2: Next.js 스캐폴드

```bash
pnpm create next-app@latest . \
  --typescript --tailwind --eslint \
  --app --src-dir --import-alias "@/*" \
  --use-pnpm --skip-install
pnpm install
```

`--skip-install` 후 명시적 `pnpm install`로 잠금 파일 안정화.

### Step 3: Vitest (유닛 테스트)

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

`package.json` scripts 추가:
```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

샘플 테스트 `src/lib/utils.test.ts` 작성 후 `pnpm test:run` 통과 확인.

### Step 4: Playwright (E2E, Chromium만)

```bash
pnpm dlx playwright install chromium
pnpm add -D @playwright/test
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

`e2e/smoke.spec.ts` 샘플 작성 + `pnpm exec playwright test` 통과 확인.

`package.json`:
```json
{
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui"
}
```

### Step 5: Sentry (Crash Reporting)

```bash
pnpm dlx @sentry/wizard@latest -i nextjs --skip-connect
```

`--skip-connect`로 인터랙티브 단계 회피. 사용자가 Sentry 대시보드에서 프로젝트 생성 후 DSN을 `.env.local`에 주입:
```
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` 자동 생성됨. 확인 후 커밋.

### Step 6: Amplitude (Analytics)

```bash
pnpm add @amplitude/analytics-browser
```

`src/lib/analytics.ts`:
```ts
import * as amplitude from '@amplitude/analytics-browser';

const KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

export function initAnalytics() {
  if (!KEY || typeof window === 'undefined') return;
  amplitude.init(KEY, { autocapture: true });
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!KEY) return;
  amplitude.track(event, props);
}
```

`src/app/layout.tsx`에 `<AnalyticsProvider>` 컴포넌트로 `initAnalytics()` 호출.

`.env.local`:
```
NEXT_PUBLIC_AMPLITUDE_API_KEY=
```

### Step 7: Supabase Auth + DB

Supabase MCP가 연결되어 있으면 자동:
```
1. list_organizations → org 선택
2. create_project (사용자 확인 후)
3. get_project_url + get_publishable_keys → .env.local 주입
```

수동 셋업:
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts` 표준 SSR 패턴 작성. (`supabase` 스킬의 SSR 가이드 참조)

### Step 8: 디렉토리 구조

```bash
mkdir -p _team/specs _team/designs _team/reviews docs/adr
touch CONTEXT.md docs/adr/0001-initial-stack.md
```

`CONTEXT.md` 템플릿:
```markdown
# <Project> Context

## Domain Language
(도메인 핵심 개념 정의)

## Core Modules
(주요 모듈/책임)

## Constraints
(기술/사업 제약)
```

`docs/adr/0001-initial-stack.md`:
```markdown
# ADR 0001: Initial Stack

## Status
Accepted

## Decision
- Framework: Next.js 15 (App Router)
- Lang: TypeScript
- PM: pnpm
- DB/Auth: Supabase
- Analytics: Amplitude
- Crash: Sentry
- Unit: Vitest
- E2E: Playwright (Chromium)

## Rationale
사용자 표준 부트스트랩 스킬에 의해 결정. 변경 시 새 ADR 발행.
```

### Step 9: 프로젝트 CLAUDE.md

```markdown
# <Project Name> Rules

<1-line description>

@~/.claude/rules/stacks/nextjs.md
@~/.claude/rules/stacks/supabase.md
@~/.claude/rules/stacks/vercel.md
@~/.claude/rules/stacks/playwright.md

## Project-Specific

- 기능 추가는 항상 `superpowers:test-driven-development`로 시작
- E2E는 새 페이지/플로우 추가 시마다 작성
- Sentry: 프로덕션 에러는 자동 캡처, 핵심 로직은 명시 `Sentry.captureException`
- Amplitude: 핵심 이벤트는 `src/lib/analytics.ts`의 `track()`으로
```

### Step 10: Git + GitHub

```bash
git init
git add .
git commit -m "chore: initial bootstrap (Next.js + Supabase + Sentry + Amplitude + Vitest + Playwright)"

# 사용자 동의 시:
gh repo create <name> --private --source=. --push
```

### Step 11: 최종 검증

```bash
pnpm install
pnpm lint
pnpm test:run
pnpm build
pnpm exec playwright test
```

전부 green이면 부트스트랩 완료. 하나라도 실패하면 **사용자에게 보고 + 원인 분석**.

## 완료 후 안내

```
✅ Bootstrap 완료

다음 단계:
1. .env.local 에 실제 키 주입 (Sentry DSN, Amplitude key, Supabase URL/anon)
2. 첫 기능 개발: `superpowers:test-driven-development` 활성화 후 시작
3. E2E는 e2e/smoke.spec.ts 패턴 따라 작성

기능 개발 루프 (자동 활성화됨):
- brainstorming → writing-plans → TDD → webapp-testing → verification-before-completion
- 자동 반복은 omc:ralph 또는 omc:ultraqa
```

## 검증 체크리스트

스킬 종료 전 모두 확인:
- [ ] `pnpm test:run` 통과
- [ ] `pnpm build` 성공
- [ ] `pnpm exec playwright test` 통과
- [ ] `.env.local` 존재 (값은 placeholder OK)
- [ ] `CLAUDE.md` 프로젝트별 생성
- [ ] `_team/`, `docs/adr/` 디렉토리 존재
- [ ] git 초기 커밋 완료

## 실패 시 복구

각 Step 실패 시:
1. 어떤 단계에서 멈췄는지 사용자에게 명시
2. 부분 결과 보존 (`git status`로 확인 가능)
3. 재시도는 실패 단계부터, 그 이전 단계는 idempotent로 안전

전체 롤백 필요 시:
```bash
cd .. && rm -rf <project-name> && mkdir <project-name>
```
