# project-starter 범용화 & 기존 프로젝트 입양 — 설계 문서

- **작성일**: 2026-06-04
- **상태**: 승인됨 (brainstorming 완료, writing-plans 진입 직전)
- **대상 레포**: 주로 [`kimyeonsik/project-starter`](https://github.com/kimyeonsik/project-starter), 소비처 `scaffold-at`
- **드라이버**: scaffold-at 메인 세션 (remote-control)

---

## 1. 배경 & 문제

`project-starter`는 개인 Claude Code 개발 인프라 툴킷이다:

- **글로벌 규칙** (`~/.claude/rules/`): language, agent-teams, skill-activation
- **스택 opt-in 규칙** (`stacks/*.md`): nextjs, supabase, vercel, cloudflare, playwright, vitest, claude-api, sentry, amplitude, tailwind, resend (손으로 쓴 고정 목록)
- **부트스트랩 스킬** (`new-project-bootstrap`): **빈 디렉터리**에 Next.js 15 + Supabase + Sentry + Amplitude + Vitest + Playwright를 까는 11단계 결정론적 셋업
- **`setup-secrets`**: AI에 키 노출 없이 시크릿 주입

두 가지 구조적 한계가 목표를 막는다:

1. **신규 전용**: `new-project-bootstrap`은 빈 폴더만 가정한다. 스킬 Step 1에 *"빈 디렉토리가 아니면 중단"* 로직이 있어 **운영중 프로젝트엔 적용 불가**. `create-next-app .`이 기존 코드를 덮어쓸 위험을 막는 안전장치지만, "기존 프로젝트 적용"이라는 목표와 정면으로 충돌한다.
2. **스택 고정**: 부트스트랩이 Supabase/Vercel/pnpm에 절차적으로 하드코딩돼 있고, `stacks/*.md`는 손으로 쓴 유한 목록이다. 고객 repo의 롱테일 스택(Remix, SvelteKit, Prisma, Astro, tRPC ...)을 수용 못 한다.

## 2. 목표 & 비목표

### 목표
- **G1.** project-starter가 **임의 스택**을 (최소 baseline 수준에서) 수용하도록 범용화한다.
- **G2.** project-starter가 **운영중 프로젝트를 입양(adopt)** 할 수 있게 한다 — 기존 스택을 분석·수용하고 거버넌스를 비파괴적으로 입힌다.
- **G3.** 강화된 툴킷을 **scaffold-at에 실제 적용**한다 (도그푸딩, P3).

### 비목표 (지금은)
- scaffold.at 제품에서 고객 repo에 자동 주입하는 워커 통합 (= P4, 별도 사이클).
- 미지원 스택 규칙의 **자동 생성**(Tier 3). 이번엔 보류.
- 기존 11단계 부트스트랩의 전면 재작성. 감지+규칙선택만 범용화한다.

### 정정 사항
- **scaffold-at은 project-starter 기반이 아니다.** repo에 보이는 `<!-- BEGIN:nextjs-agent-rules -->` 관리 블록과 `_team/` 구조는 사용자가 project-starter를 테스트하면서 들어간 **잔여물**이다. L1(P3)은 "부분 적용 완성"이 아니라 **깨끗한 신규 적용**으로 다룬다.

## 3. 아키텍처 결정 — "project-scope vendored 단일 모드"

규칙 파일이 **어디 살고 어떻게 대상 repo까지 가느냐**가 핵심 축이다. project-starter의 `CLAUDE.md`는 `@~/.claude/rules/...`처럼 **내 홈 디렉터리**를 임포트하는데, 고객/이식 repo엔 *내 홈이 없어* 이 방식이 깨진다.

**결정: 모든 대상(내 프로젝트·운영중·고객 repo)에 동일하게 project-scope vendored를 적용한다. 글로벌(`~/.claude/`) 런타임 설치 경로는 채택하지 않는다.**

- **authoring SSOT**: 규칙의 정본은 `project-starter` 레포 **한 곳**에 둔다.
- **consumption**: 각 대상 repo로 규칙을 self-contained **복사(vendoring)** → `./.claude/rules/*`. 생성되는 CLAUDE.md는 `@~/`가 아니라 **repo 상대경로 `@.claude/rules/...`** 를 참조한다.

> **메커니즘은 신규가 아니다.** 이 "vendoring"은 기존 `install.mjs`의 **project scope 설치가 이미 하는 동작**이다: `./.claude/rules/`로 규칙 복사, `@~/.claude/rules`→`@.claude/rules` 경로 자동 치환, 기존 CLAUDE.md엔 managed block만 idempotent 머지. 또한 "빈 폴더면 중단"은 `install.mjs`가 아니라 *코드를 스캐폴딩하는* `new-project-bootstrap` **스킬**에만 있는 안전장치다 — 규칙 설치기는 운영중 repo에서도 그대로 동작한다. 따라서 P1/P2는 **새 복사 메커니즘을 만드는 게 아니라**, 이 install plumbing을 재사용하고 그 앞단에 *감지·선택적 opt-in·갭 진단*이라는 지능을 추가하는 일이다. 바뀌는 정책은 "기본 스코프를 project로 통일(글로벌 미사용)" 한 줄뿐이다.

근거:
- **단일 전달 메커니즘** → 글로벌↔vendored 드리프트 없음, 빌드·테스트·유지보수 단순.
- 모든 repo가 **self-contained** → 이식성·재현성, 머신 숨은 의존 0 (clone하면 규칙이 그 안에 있음).
- P2(입양)가 이미 project-scope vendoring을 하므로 내 프로젝트도 같은 경로를 쓴다 → **P2가 보편 진입점**, 별도 글로벌 설치 플로우 불필요.

수용한 트레이드오프:
- **규칙 갱신 전파**: 글로벌 1벌이면 한 번 수정으로 전 프로젝트 반영되지만, vendored는 각 repo에 복사본이 있어 **대상마다 `adopt` 재실행(idempotent sync)** 으로 전파한다. managed block 마커로 안전 갱신.
- repo에 `.claude/rules/`가 커밋되어 추적 파일이 늘어남 — self-contained의 대가로 수용.

대안: A(글로벌 단일 SSOT 런타임)는 고객 repo 홈 의존으로 깨지고, C(버전드 패키지 추출)는 마크다운 패키징으로는 조급한 과잉 엔지니어링이라 보류(후일 진화형). authoring SSOT + vendored consumption이 지금 최적.

## 4. 로드맵 개요

| 단계 | 이름 | 내용 | 범위 |
|---|---|---|---|
| **P1** | 스택 범용화 | 감지 기반 규칙 선택 + capability 레이어 + drizzle/d1 보강 | 이번 |
| **P2** | 기존 프로젝트 입양 | `adopt-existing-project` 신규 스킬 | 이번 |
| **P3** | scaffold-at 적용 | 강화된 툴킷을 scaffold-at(D1/Drizzle/OpenNext→Vercel)에 실행 | 다음 |
| **P4** | 고객 repo 제품화 | scaffold.at 워커가 P2를 고객 repo에 자동 실행 | 이후 |

본 문서의 상세 설계 대상은 **P1 + P2**.

## 5. P1 — 스택 범용화 (가볍게)

### 통찰: 입양은 스택을 새로 깔지 않는다
운영중 프로젝트엔 Next.js·DB·테스트가 이미 있다. 따라서 입양 경로(P2)는 부트스트랩 Step 2~7(설치 절차)을 **실행하지 않는다**. P1이 범용화해야 할 것은 11단계 전체가 아니라 **"스택 감지 + 그에 맞는 규칙 선택"** 부분뿐이다.

### 5.1 `stack-detect` (공통 감지 라이브러리)
repo를 읽어 스택을 추론하는 작은 모듈. 신규(P4)·입양(P2) 양쪽이 공유.

- **입력**: `package.json`(deps/devDeps), lockfile(`bun.lock`/`pnpm-lock.yaml`/`package-lock.json`), 설정 파일(`next.config.*`, `drizzle.config.*`, `wrangler.*`, `vercel.json`, `playwright.config.*`, `vitest.config.*`, `prisma/schema.prisma`, `svelte.config.*` ...)
- **출력**: 감지 결과 배열 — `{ stack, capability, confidence, ruleStatus: 'named' | 'generic' | 'unclassified' }`
- **scaffold-at 기대 출력 예**: `nextjs(named)`, `cloudflare(named)`, `vercel(named)`, `drizzle/d1(named, 신규)`, `playwright(named)`, `vitest(named)`, `sentry(named)`, `amplitude(named)`

### 5.2 capability 레이어 (범용화의 핵심)
스택을 **이름**이 아니라 **능력(capability)** 으로 분류한다. 각 능력엔 스택-독립적 generic 규칙이 1개 있다.

| capability | 감지 시그널(예) | generic 규칙 요지 |
|---|---|---|
| framework | next/remix/astro/svelte/nuxt | "설치된 버전의 **자체 문서를 먼저 읽어라**" (scaffold-at AGENTS.md 철학) |
| test-runner | vitest/jest/playwright | TDD 사이클 활성화 |
| database/ORM | drizzle/prisma/typeorm/mongoose | 스키마 우선, 수동 SQL 금지, 마이그레이션 규율 |
| error-tracking | sentry/bugsnag | 프로덕션 에러는 대시보드 조회 우선(추측 금지) |
| analytics | amplitude/posthog/ga | 이벤트 택소노미 먼저 |
| styling | tailwind/css-modules/styled | frontend-design + a11y |

generic 규칙은 `claude-rules/capabilities/<cap>.md`로 신설.

### 5.3 규칙 적용 Tier 모델
```
Tier 0  stack-agnostic 코어 (language/agent-teams/skill-activation)  ← 항상 적용, 절대 안 막힘
Tier 1  capability generic 규칙                                       ← 미지원 스택도 여기까지 보장
Tier 2  named stacks/<name>.md                                        ← 있으면 generic을 정교화/override
Tier 3  (보류) 미지원 중요 스택 → 문서 크롤링→초안 생성→리뷰→라이브러리 추가
```
이번 구현 범위: **Tier 0+1+2.**

### 5.4 신규 스택 규칙
- `stacks/drizzle.md`, `stacks/d1.md` 추가 (현재 `supabase.md`만 있어 D1 미대응 — scaffold-at 도그푸딩에 필수).

### 5.5 부트스트랩 분기 (신규 경로에만 영향)
`new-project-bootstrap`의 Supabase 고정 선택을 `stack-detect`/사용자 선택 기반 분기로 교체. (입양 경로엔 무관) 또한 신규 프로젝트도 글로벌이 아니라 **project-scope vendoring**으로 규칙을 설치하고, 생성 CLAUDE.md는 `@.claude/rules/...` 임포트를 참조한다.

## 6. P2 — `adopt-existing-project` (신규 스킬)

bootstrap과 트리거가 정반대라 **별도 스킬**로 신설한다. bootstrap의 "Step 1 중단" 자리를 대체하는 역할.

### 6.1 흐름
```
1. 감지   stack-detect로 기존 스택/능력 파악
2. 진단   표준 거버넌스 vs 현재 갭 분석
          (_team/ 존재? CLAUDE.md 스택 opt-in? 테스트 셋업? skill-activation 규칙?)
3. 입양   규칙을 repo 안에 vendoring → ./.claude/rules/*  (self-contained, @~/ 안 씀)
          + 프로젝트 CLAUDE.md에 감지된 스택/capability opt-in 자동 작성 (managed block)
4. 제안   코드는 절대 안 건드림. 갭 개선안만 리포트로 제시 (적용은 사용자 승인 후 별건)
```

### 6.2 불변 원칙 (invariants)
- **코드 비파괴**: 소스/설정 덮어쓰기 금지. 거버넌스 파일 *추가* 와 *제안* 만.
- **self-contained vendoring**: 대상 repo는 내 홈에 의존 못 함 → 규칙을 repo 내부에 복사. (B 아키텍처의 실체)
- **idempotent**: 두 번 돌려도 안전. managed block 마커(`<!-- BEGIN/END -->`)로 갱신.

### 6.3 스택 분류별 처리 (미지원 스택 대응)
감지된 각 스택은 셋 중 하나로 분류되고, **어느 경우에도 멈추거나 비워두지 않는다**:

| 분류 | 의미 | 처리 |
|---|---|---|
| ✅ named | `stacks/<name>.md` 존재 | 전용 규칙 적용 |
| ⚠️ generic | 쓰고 있지만 전용 규칙 없음 (예: Prisma, SvelteKit) | capability generic 적용 + 리포트에 '갭'으로 명시 + 전용 규칙 추가 권장 |
| ❓ unclassified | 능력도 못 맞춤 | 코어만 적용 + 리포트에 "수동 확인" 플래그 |

**예 — 고객이 Prisma 사용, 우리는 `drizzle.md`만 보유:**
```
감지: prisma (database/ORM capability) → stacks/prisma.md 없음 ⚠️
  → database generic 규칙 적용 (스키마 우선, 마이그레이션 규율, 설치 버전 문서 먼저)
  → 갭 리포트: "⚠ prisma 감지 — 전용 규칙 없음. database generic으로 커버 중.
                정교화 원하면 stacks/prisma.md 추가 권장 (지금은 보류)."
```
전용 규칙을 나중에 추가하면 다음 실행부터 그 repo는 ⚠️→✅로 **승격**된다. 라이브러리가 점진적으로 자란다.

## 7. 컴포넌트 & 인터페이스

| 단위 | 책임 | 의존 |
|---|---|---|
| `stack-detect` (lib) | repo → 스택/능력/신뢰도/ruleStatus | 파일 읽기만 |
| `capabilities/*.md` (신규 규칙) | 능력별 generic 규칙 | — |
| `stacks/drizzle.md`, `stacks/d1.md` (신규) | named 정교화 규칙 | — |
| `adopt-existing-project` (신규 스킬) | 감지→진단→vendoring→제안 | stack-detect, vendoring util |
| vendoring util | 규칙을 대상 repo `./.claude/rules/`에 self-contained 복사 (idempotent) | install.mjs 로직 재사용 |
| bootstrap 분기 (수정) | 신규 경로의 스택 선택을 감지 기반으로 | stack-detect |

각 단위는 독립 테스트 가능하도록 인터페이스를 좁게 유지한다. `stack-detect`는 순수 함수(파일 입력 → 구조화 출력)로, 부수효과 없음.

## 8. 데이터 흐름

```
대상 repo
  └─(read: package.json/lock/configs)─▶ stack-detect
                                          └─▶ [{stack, capability, confidence, ruleStatus}]
                                                 ├─▶ 규칙 선택 (Tier 0+1+2 머지)
                                                 │      ├ Tier0 코어
                                                 │      ├ Tier1 capability generic
                                                 │      └ Tier2 named (있으면 override)
                                                 ├─▶ vendoring → ./.claude/rules/* + CLAUDE.md managed block
                                                 └─▶ 갭 진단 → 리포트(.md) [코드 비파괴]
```

## 9. 검증 / 테스트

- **`stack-detect` 단위 테스트**: 픽스처 repo들로 감지 정확도
  - scaffold-at(next+cloudflare+drizzle/d1+vitest+playwright+sentry+amplitude)
  - 가짜 Supabase repo (named hit)
  - 가짜 Prisma/SvelteKit repo (generic ⚠️ 경로)
  - 빈/불명 repo (unclassified ❓ 경로)
- **`adopt-existing-project` 통합 테스트**: scaffold-at 복제본에 실행하여
  - (a) 소스/설정 코드 **무변경** (git diff에 코드 0줄)
  - (b) `./.claude/rules/` self-contained 생성 (`@~/` 미포함)
  - (c) CLAUDE.md managed block 정확
  - (d) 갭 리포트 생성, ⚠️/❓ 항목 명시
  - (e) **idempotent**: 2회 실행 시 추가 diff 없음

## 10. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| 입양 스킬이 실수로 코드 덮어씀 | invariant + 통합 테스트로 "코드 0줄 diff" 강제 |
| 감지 오탐/미탐 | confidence 출력 + 리포트에 근거 명시, 사용자 확인 게이트 |
| authoring SSOT(project-starter)와 vendored 복사본 드리프트 | managed block 마커 + idempotent re-run으로 sync; 향후 C(버전드 패키지)로 SSOT화 여지 |
| 미지원 스택을 named인 척 처리 | ruleStatus를 1급 필드로, 리포트에 분류 명시 |

## 11. 향후 (이번 범위 밖)

- **P3**: scaffold-at에 `adopt-existing-project` 실제 실행 → 별도 스펙.
- **P4**: scaffold.at 워커가 고객 repo 체크아웃에 P2 자동 실행 → work-roadmap/work-request 파이프라인과 통합. 별도 스펙.
- **Tier 3**: 미지원 스택 규칙 자동 생성 (문서 크롤링→초안→리뷰→PR). vendored→버전드 패키지(C) 진화와 함께 검토.

## 12. 결정 로그

| # | 결정 | 근거 |
|---|---|---|
| D1 | **project-scope vendored 단일 모드** (글로벌 런타임 미채택) | 단일 메커니즘·self-contained·P2가 보편 진입점; authoring SSOT는 project-starter 레포; 갱신 전파는 idempotent re-run |
| D2 | P2는 **별도 신규 스킬** | bootstrap과 트리거 정반대, 혼합 시 코드 파괴 위험 |
| D3 | vendoring은 **self-contained 복사** (`@~/` 아님) | 고객/이식 repo 필수 |
| D4 | P2는 **분석+입양+제안만, 코드 비파괴** | 운영중 프로젝트 안전 |
| D5 | P1은 **감지+규칙선택만 범용화** | 입양 경로는 설치 절차 미실행 → 11단계 재작성 불필요 |
| D6 | 미지원 스택 = **Tier 0+1+2 (degrade-to-generic)** | 멈추지 않고 baseline 보장 + 점진 승격 |
| D7 | `drizzle.md`/`d1.md` 신규 추가 | scaffold-at 도그푸딩(P3)에 필요 |
| D8 | Tier 3 자동생성 **보류** | 품질 편차·리뷰 게이트 부담, 조급한 투자 |
