---
name: recommend-stack
description: Recommend which stacks/tools to ADD for a project's empty capabilities (analytics, error-tracking, auth, payments, email, database, ai, hosting), weighted by the project's profile (web/native/edge, hosting, region, budget). Use when the user asks "what should I use for X", "recommend an analytics/auth/payments tool", or wants suggestions for missing infrastructure. Only recommends for ABSENT capabilities — never proposes replacing what is already in use.
---

# Recommend Stack

비어 있는 capability에 **무엇을 도입할지** 추천한다. 이미 쓰는 건 절대 교체 추천하지 않는다(리스크).

## 절차

### Step 1: 결정론 입력 받기 (토큰 0)
먼저 `inspect`(read-only)를 돌려 **빈 capability + 프로필**을 얻는다 — `adopt-existing-project` 스킬의 번들 엔진을 `--dry-run`으로:
```bash
PROJECT_ROOT="<repo 절대경로>" node "<adopt-existing-project 스킬 디렉터리>/engine/scripts/adopt.mjs" --dry-run
```
리포트의 **"빈 capability (스택 추천 후보)"** 목록과 **프로필**(platform=web/native/edge · hosting)을 입력으로 쓴다. 빈 게 없으면 "추천할 빈 capability 없음" 안내 후 종료.

### Step 2: 사용자 맥락 확보
프로필로 추론 안 되는 가중치는 짧게 묻는다(없으면 합리적 기본):
- 서비스 **지역**(예: 한국 중심 / 글로벌) — 지역 성능·결제·법규에 영향
- **예산** 성향(무료/저가 우선 vs 성능 우선)
- 특별 제약(데이터 거주·규제 등)

### Step 3: 항상 최신 리서치 (필수)
각 빈 capability마다 **반드시 웹/문서 리서치로 현재 정보를 확인**한다 — 모델 지식만으로 추천 금지(가격·신규 도구가 바뀜):
- `claude.ai Context7` MCP 또는 웹검색으로 후보별 **평판·가격·지역 성능·유지보수 상태** 확인
- 프로필 가중치 적용: platform(web/native/edge) 호환 · hosting 궁합(예: 이미 Cloudflare면 CF-native 우대) · 지역 · 예산 · **기존 스택과의 호환**

### Step 4: 순위·근거로 추천
capability별 후보 2~3개를 **순위 + 한 줄 근거 + 가격대 + 출처 링크**로 제시. 1순위 + 대안. 결정은 사용자에게 맡긴다.

### Step 5: 설치로 핸드오프
사용자가 스택을 고르면 **`install-stack` 스킬로 넘긴다** (가이드 설치 — 코드 변경은 단계별 승인·검증 게이트 하에). 도입 후 규칙 vendoring은 install-stack이 adopt 엔진 재실행으로 처리한다.
- 사용자가 "추천만, 설치는 나중에"라고 하면 핸드오프하지 않고 추천만 남긴다.
- **이미 쓰는 capability는 추천 대상이 아니다**(빈 capability만).

## 원칙
- **빈 capability만** 추천. 이미 쓰는 건 안 건드림.
- **항상 리서치.** 추측 금지 — 평판/가격/지역 최신 확인.
- **결정은 사용자.** 우리는 근거 있는 선택지를 줄 뿐.
