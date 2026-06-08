---
name: recommend-stack
description: Recommend which stacks/tools to ADD for empty capabilities, weighted by requirements (platform, region, budget) AND compatibility with the already-chosen stack. Two modes — existing (inspect a repo's empty capabilities) and greenfield (new project: take requirements from an interview, recommend the WHOLE stack including framework, resolved in dependency order). Use for "what should I use for X", new-project stack selection, or missing-infra suggestions. Only recommends for ABSENT capabilities — never replaces what is already in use. (Framework is recommended only in greenfield; in existing mode the framework is in-use and untouched.)
---

# Recommend Stack

비어 있는 capability에 **무엇을 도입할지** 추천한다. 이미 쓰는 건 절대 교체 추천하지 않는다(리스크).

## 모드
- **existing** (기존 repo): `adopt --dry-run`(inspect)으로 **빈 capability + 프로필 + in-use 스택**을 얻어 추천. framework는 in-use라 추천 안 함. (기존 동작)
- **greenfield** (신규 프로젝트, repo 없음): inspect 대신 **인터뷰 입력**(앱설명·플랫폼·지역·예산·제약 + 채울 capability 집합)을 받아 **framework 포함 전체 스택**을 추천. new-project-bootstrap이 스캐폴드 전에 호출한다.

두 모드의 추천 코어(항상 리서치 + 신호 가중)는 공유한다. 아래 Step은 **existing 기준**이며, greenfield 차이는 각 Step에 표기.

## 절차

### Step 1: 결정론 입력 받기 (토큰 0)
먼저 `inspect`(read-only)를 돌려 **빈 capability + 프로필**을 얻는다 — `adopt-existing-project` 스킬의 번들 엔진을 `--dry-run`으로:
```bash
PROJECT_ROOT="<repo 절대경로>" node "<adopt-existing-project 스킬 디렉터리>/engine/scripts/adopt.mjs" --dry-run
```
리포트의 **"빈 capability (스택 추천 후보)"** 목록과 **프로필**(platform=web/native/edge · hosting)을 입력으로 쓴다. 빈 게 없으면 "추천할 빈 capability 없음" 안내 후 종료.

**greenfield**: inspect 대상이 없다. 대신 호출자(bootstrap)가 넘긴 **인터뷰 입력**을 쓴다 — `{ appDesc, platform(web|native|edge), region, budget, constraints }` + **채울 capability 집합**(framework 포함, 신규는 보통 전부). 프로필은 인터뷰에서 직접 온다(platform 등).

### Step 2: 사용자 맥락 확보
프로필로 추론 안 되는 가중치는 짧게 묻는다(없으면 합리적 기본):
- 서비스 **지역**(예: 한국 중심 / 글로벌) — 지역 성능·결제·법규에 영향
- **예산** 성향(무료/저가 우선 vs 성능 우선)
- 특별 제약(데이터 거주·규제 등)

### Step 3: 항상 최신 리서치 (필수)
각 빈 capability마다 **반드시 웹/문서 리서치로 현재 정보를 확인**한다 — 모델 지식만으로 추천 금지(가격·신규 도구가 바뀜):
- `claude.ai Context7` MCP 또는 웹검색으로 후보별 **평판·가격·지역 성능·유지보수 상태** 확인
- 프로필 가중치 적용: platform(web/native/edge) 호환 · hosting 궁합(예: 이미 Cloudflare면 CF-native 우대) · 지역 · 예산 · **기존 스택과의 호환**

### Step 3.5: greenfield — 의존순서·호환성 해소
신규는 capability를 독립적으로가 아니라 **의존 순서**로 해소하고, 각 단계는 *지금까지 확정된 스택*을 입력으로 궁합을 본다.

해소 순서:
```
framework  (플랫폼/요구사항 → 후보: web→Next/SvelteKit/Astro/Remix, native→Expo/RN, edge→…)
  → hosting · database   (커플링: CF→D1+Drizzle, Vercel→Supabase/Neon …)
  → auth                 (framework·db 궁합: Supabase db→Supabase Auth, SvelteKit→Lucia, Next→next-auth/Clerk)
  → analytics · error-tracking · email · payments · ai  (요구사항·평판; payments는 지역 신호 강함)
  → test-runner · ci     (표준 기본: Vitest+Playwright / GitHub Actions)
```

각 capability의 **신호 우선순위**:
1. **외부 신호** — 사용자 요구사항(지역·예산·플랫폼·앱설명). 최우선.
2. **내부 신호 = 호환성** — 이미 확정된 framework·capability와의 궁합.
3. **평판/성숙도** — 생태계·유지보수.
4. **author default** — 위 셋이 못 가릴 때만 타이브레이커.

**속도**: 외부·호환성 신호가 둘 다 없는 capability는 무거운 비교 리서치 없이 default를 가볍게(최신/deprecation만 확인) 적용. 신호 있는 것만 깊은 비교 리서치.

**default prior(타이브레이커용, web 기준)**: framework=Next.js, db/auth=Supabase, analytics=Amplitude, error-tracking=Sentry, hosting=Vercel, email=Resend, ai=claude-api, test=Vitest+Playwright, ci=GitHub Actions. (요구사항·궁합이 가리키면 이걸 덮어쓴다)

### Step 4: 순위·근거로 추천
capability별 후보 2~3개를 **순위 + 한 줄 근거 + 가격대 + 출처 링크**로 제시. 1순위 + 대안. 결정은 사용자에게 맡긴다.
- **greenfield**: 해소된 **전체 스택 한 벌**(capability별 pick + 근거[외부신호/궁합/평판/default] + 출처)을 제시하고, 사용자가 **전체 수락**(빠름) 또는 **항목별 조정**(그 capability만 대안 리서치)하게 한다.

### Step 5: 설치로 핸드오프
사용자가 스택을 고르면 **`install-stack` 스킬로 넘긴다** (가이드 설치 — 코드 변경은 단계별 승인·검증 게이트 하에). 도입 후 규칙 vendoring은 install-stack이 adopt 엔진 재실행으로 처리한다.
- 사용자가 "추천만, 설치는 나중에"라고 하면 핸드오프하지 않고 추천만 남긴다.
- **이미 쓰는 capability는 추천 대상이 아니다**(빈 capability만).

## 원칙
- **빈 capability만** 추천. 이미 쓰는 건 안 건드림. (greenfield는 전부 비어있어 framework 포함 전체 추천; existing은 framework 제외.)
- **항상 리서치.** 추측 금지 — 평판/가격/지역 최신 확인.
- **호환성 우선.** 무신호 capability는 default가 아니라 **확정된 스택과의 궁합**으로 고르고, 정말 못 가릴 때만 default.
- **결정은 사용자.** 우리는 근거 있는 선택지를 줄 뿐.
