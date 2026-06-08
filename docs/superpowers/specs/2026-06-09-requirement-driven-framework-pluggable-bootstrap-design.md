# 요구사항 기반·프레임워크 가변 신규 프로젝트 — 설계 문서

- **작성일**: 2026-06-09
- **상태**: 승인됨 (brainstorming 완료, writing-plans 진입 직전)
- **대상 레포**: [`kimyeonsik/project-starter`](https://github.com/kimyeonsik/project-starter) (authoring SSOT), 소비처 `scaffold-at`
- **드라이버**: scaffold-at 메인 세션 (remote-control)
- **선행 문서**: `2026-06-08-stack-lifecycle-recommend-install-design.md`(add/upgrade/assess), `2026-06-08-stack-replacement-risk-gated-design.md`(replace)

---

## 1. 배경 & 문제

`new-project-bootstrap`은 **Next.js + Supabase + Sentry + Amplitude + Vitest/Playwright + GitHub Actions** 를 결정론적으로 까는 **고정 스택 스캐폴더**다. 두 한계:

1. **DB/인증이 Supabase 고정** — 사용자가 요구사항에 맞게 고를 수 없다. recommend-stack은 *기존 프로젝트의 빈 capability* 전용이라 부트스트랩엔 관여하지 않는다.
2. **framework가 Next.js 고정** — 반면 `adopt`은 stack-detect로 remix/astro/sveltekit/vite/expo/react-native까지 감지하고 named 없으면 `framework` generic으로 커버하므로 **이미 프레임워크 무관**이다. 신규만 Next에 묶일 이유가 약하다. (비대칭: adopt=읽기/거버넌스라 무관이 공짜, bootstrap=스캐폴드라 프레임워크별).

## 2. 목표 & 비목표

### 목표
- **G1.** 신규 프로젝트 스택을 **요구사항 기반으로 추천**한다(고정 아님). framework 포함.
- **G2.** new와 existing을 **단일 파이프라인**으로 수렴: *추천 → 공식 도구로 스캐폴드 → adopt(거버넌스) → install(capability)*.
- **G3.** 추천을 **의존순서·호환성 가중**으로 한다 — 외부신호 → 궁합 → 평판 → default 타이브레이커.
- **G4.** Next.js는 기존의 풍부한 통합을 **프리셋**으로 유지, 타 프레임워크는 generic 경로로 수용.

### 비목표 (이번 사이클)
- Next 외 프레임워크별 **bespoke 프리셋**(전용 결정론 레시피). 타 프레임워크는 generic(install-stack add) 경로.
- 데이터 마이그레이션(신규는 빈 프로젝트라 무관).
- 비대화(CI) 자동 부트스트랩.
- `stack-assess`→`assess-stack` 리네임(보류).

### 정정 사항
- recommend-stack의 "framework/styling은 추천 제외(구조적)" 원칙을 **greenfield 한정으로 완화**: 신규는 framework가 비어있으므로 추천 대상. *existing 모드에선 framework는 in-use라 여전히 추천 안 함*.
- "고정 default 무조건 추천"이 아니라 **요구사항·호환성 기반 추천**, default는 최후 타이브레이커.

## 3. 아키텍처 결정 — 단일 파이프라인 + greenfield 추천

### 3.1 통합 파이프라인 (new = existing 수렴)
```
[신규: 빈 디렉터리]                          [기존 repo]
  요구사항 인터뷰                                 (코드 존재)
  → recommend-stack(greenfield):                  → adopt(detect+거버넌스)
      framework + 전체 capability 추천                → 빈 capability: recommend(existing)
  → 공식 create 도구로 스캐폴드                       → 쓰는 스택: stack-assess
  → adopt(거버넌스, 프레임워크 무관)                  ↘
  → install: capability 설치                          (공통) install-stack add / upgrade / replace
```
양쪽이 **"거버넌스 적용 프로젝트 → capability 라이프사이클"** 로 만난다.

### 3.2 recommend-stack: greenfield 모드 + framework
- **두 모드**:
  - `existing`(현행): `adopt --dry-run`으로 빈 capability + 프로필 + in-use 스택을 inspect. **framework는 in-use라 추천 안 함.** 변경 없음.
  - `greenfield`(신규): repo가 없으므로 inspect 대신 **인터뷰 입력**(앱 설명·플랫폼·지역·예산·제약)과 **채울 capability 목록**을 받는다. **framework 포함** 전체 스택을 추천.
- **호환성 가중 의존순서 해소** (greenfield 핵심): capability를 독립적으로가 아니라 **의존 순서**로 결정하고, 각 단계는 *지금까지 확정된 스택*을 입력으로 궁합을 본다.
  ```
  framework  (플랫폼/요구사항 → 후보; web→Next/SvelteKit/Astro/Remix, native→Expo/RN, edge→…)
    → hosting · database   (커플링: CF→D1+Drizzle, Vercel→Supabase/Neon …)
    → auth                 (framework·db 궁합: Supabase db→Supabase Auth, SvelteKit→Lucia, Next→next-auth/Clerk)
    → analytics · error-tracking · email · payments · ai  (요구사항·평판; payments는 지역 신호 강함)
    → test-runner · ci     (표준 기본: Vitest+Playwright / GitHub Actions)
  ```
- **신호 우선순위** (각 capability):
  1. **외부 신호** — 사용자 요구사항(지역·예산·플랫폼·앱설명). 최우선.
  2. **내부 신호 = 호환성** — 이미 확정된 framework·capability와의 궁합.
  3. **평판/성숙도** — 생태계, 유지보수.
  4. **author default** — 위 셋이 못 가릴 때만 타이브레이커.
- **속도**: 외부신호도 호환성 신호도 없는 capability는 무거운 비교 리서치 없이 가볍게(최신/deprecation 확인) default 적용. 신호 있는 capability만 깊은 비교 리서치.
- **출력**: 추천 스택 한 벌(capability별 pick + 한 줄 근거[신호 종류] + 출처). 사용자는 **전체 수락**(빠름) 또는 **항목별 조정**(그 capability만 대안 리서치).

### 3.3 bootstrap: 프레임워크 가변 흐름
- **공식 스캐폴더 맵** (프레임워크별 베이스 생성은 재발명하지 않고 공식 도구 호출):
  | framework | 스캐폴드 명령 |
  |---|---|
  | nextjs | `pnpm create next-app@latest .` |
  | vite | `pnpm create vite@latest .` |
  | sveltekit | `pnpm create svelte@latest .` |
  | remix | `pnpm create remix@latest .` |
  | astro | `pnpm create astro@latest .` |
  | expo | `pnpm create expo-app@latest .` |
- **Next.js = 프리셋**: 현행 결정론 레시피(Sentry/Amplitude/Supabase SSR/Vitest/Playwright/CI 스텝)를 그대로 사용(빠름·고품질). 단 db/auth 등은 §3.2 추천 결과 반영(동적).
- **타 프레임워크 = generic**: 공식 스캐폴드 후 capability를 **install-stack add**(리서치 가이드 설치)로. test-runner·error·analytics·db·auth·ci 등 **표준 기본 capability셋은 모든 프레임워크에 공통 적용**(설치 방식만 다름) — "표준 인프라" 정체성 유지.

### 3.4 동적 산출물
ADR 0001·프로젝트 CLAUDE.md를 **resolved stack 기반** 생성. 예: SvelteKit+Drizzle+D1 → ADR에 그대로, CLAUDE.md는 `@.claude/rules/stacks/drizzle.md`·`d1.md`(named) + sveltekit은 named 없으면 `capabilities/framework.md` + "stacks/sveltekit.md 추가 권장". (adopt 재실행이 vendoring 담당)

## 4. 데이터 흐름 (신규)
```
빈 디렉터리
  인터뷰 → { appDesc, platform, region, budget, constraints, 채울 capability 집합 }
     ▼
  recommend-stack(greenfield): 의존순서 해소
     framework→hosting/db→auth→(analytics/error/email/payments/ai)→test/ci
     각 단계: 외부신호 → 호환성(확정분) → 평판 → default
     ▼ resolved = { framework, capability→stack[] }  (사용자 수락/조정)
  공식 create 도구(resolved.framework) → 베이스 스캐폴드
     ▼
  adopt(detect+거버넌스 vendoring; 프레임워크 무관)
     ▼
  capability 설치:
     Next+default → bootstrap 프리셋 레시피
     그 외 → install-stack add (각 resolved stack)
     ▼
  동적 ADR/CLAUDE.md + git/CI/검증
```

## 5. 컴포넌트 & 인터페이스
| 단위 | 책임 | 작업 |
|---|---|---|
| `skills/recommend-stack/SKILL.md` | greenfield 모드(인터뷰 입력) + framework 추천(greenfield) + 의존순서·호환성 가중 명문화 | 수정(핵심) |
| `skills/new-project-bootstrap/SKILL.md` | 흐름 재구성(추천→스캐폴드→adopt→install), 공식 스캐폴더 맵, Next 프리셋/타 generic 분기, 동적 ADR/CLAUDE.md, 인터뷰 확장 | 수정(핵심) |
| `skills/install-stack/SKILL.md` | bootstrap이 capability 설치에 add 재사용 명시(greenfield) | 소폭 |
| `skills/adopt-existing-project` | 변경 없음(이미 프레임워크 무관) | — |
| `README.md`/`README.ko.md` + 다이어그램 | 신규 흐름·framework 가변·공식 스캐폴더 반영. **전체 흐름상 섹션 순서/추가 여부도 점검** | 수정 |
| `package.json`/`CHANGELOG.md` | 0.9.0 → 0.10.0 | 수정 |

각 단위 좁은 인터페이스 유지. recommend-stack은 모드 분기(existing/greenfield)를 명확히, 나머지 추천 로직은 공유.

## 6. 에러 / 엣지
- greenfield 추천 리서치 실패 → 해당 capability는 default 타이브레이커로 폴백(부트스트랩 안 막음).
- 공식 create 도구 실패/대화형 막힘 → 중단·안내(baseline 롤백).
- 비-Next named 규칙 없는 framework → `framework` generic + "stacks/<fw>.md 추가 권장".
- 호환성 충돌(예: 사용자가 외부신호로 CF hosting + 외부신호로 Supabase 강제) → 외부신호 우선하되 **궁합 경고** 표기(차단 아님).
- "기본 추천 수락" + framework=Next → 현행 동작과 사실상 동일(회귀 안전).

## 7. 검증 / 테스트
- **단위(결정론 가능 부분)**: greenfield 입력 파싱/capability 의존순서 유틸이 코드로 분리되면 그 부분. (대부분은 스킬 프롬프트라 도그푸딩 중심)
- **도그푸딩**:
  - Next + 기본 추천 수락 → 현행 부트스트랩과 동등(회귀).
  - "web/한국/저가" → payments=Toss(외부신호), 그 외 궁합/ default 반영 확인.
  - SvelteKit 선택 → 공식 create svelte 스캐폴드 + adopt가 sveltekit generic 커버 + auth가 궁합(예: Lucia) 추천 + ADR/CLAUDE.md 반영.
  - hosting=CF 먼저 → db가 D1+Drizzle로(궁합) 떨어지는지.
- **회귀**: consistency 가드(버전/CHANGELOG), 기존 add/upgrade/replace 무영향.

## 8. 리스크 & 완화
| 리스크 | 완화 |
|---|---|
| greenfield 추천이 느림 | 신호 없는 capability는 가벼운 default, 신호 있는 것만 깊은 리서치 + "전체 수락" 빠른 경로 |
| 프레임워크별 generic 설치 품질 편차 | install-stack add의 단계 승인·검증 게이트; named 규칙 없으면 generic + 권장 메모 |
| recommend 모드 분기 복잡 | existing/greenfield 인터페이스 명확 분리, 추천 코어 로직 공유 |
| 동적 ADR/CLAUDE.md 누락 | 도그푸딩에서 resolved 반영 검증 |
| Next 회귀 | "기본 수락+Next"=현행 경로 보존 |

## 9. 향후 (이번 범위 밖)
- 프레임워크별 bespoke 프리셋(Next 수준의 통합) 점진 추가.
- recommend-stack에 framework 추천을 existing에도(교체 맥락) — 위험 커서 보류.
- 데이터 마이그레이션·비대화 자동.

## 10. 작업 후 (이 사이클 마무리 작업)
- **크로스 리뷰**: 구현 후 별도 크로스 리뷰 1회.
- **README 전체 점검**: 신규 흐름을 반영해 **섹션 순서 변경·추가·수정**까지 검토하고 갱신(단순 문구 패치 아님).

## 11. 결정 로그
| # | 결정 | 근거 |
|---|---|---|
| D1 | 신규 스택 **요구사항 기반 추천**(고정 아님), framework 포함 | "요구사항 듣고 추천" |
| D2 | new=existing **단일 파이프라인**(추천→공식스캐폴드→adopt→install) | adopt 프레임워크 무관 재사용, 중복 제거 |
| D3 | recommend-stack **greenfield 모드 + framework(greenfield 한정)** | 신규는 repo 없음·framework 비어있음 |
| D4 | 추천 = **외부신호 → 호환성 → 평판 → default** 의존순서 해소 | 무신호도 궁합으로 적절히, default는 최후 |
| D5 | Next=**프리셋**, 타 프레임워크=**generic(install-stack add)**, 공통 기본 capability셋 | 속도/품질 균형, 모든 프레임워크 수용 |
| D6 | 프레임워크별 bespoke 프리셋·데이터 마이그레이션 **비목표** | 범위 관리 |
| D7 | ADR/CLAUDE.md **동적 생성** | 고정 Supabase 제거 |
