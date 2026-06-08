---
name: stack-assess
description: Score the IN-USE stacks of a project (security, maintenance, version staleness, profile fit) and, for stacks below threshold, recommend an UPGRADE (same stack, newer version) or propose a REPLACEMENT (different stack) considering blast radius. Read-only assessment that grades migration risk; a LOW-risk replacement may be executed via install-stack's replace mode, while medium+ risk is reported only (never executed). Use when the user asks to evaluate/audit existing stacks, check if a dependency is outdated/abandoned, or wants upgrade/replacement guidance. Pairs with recommend-stack (empty capabilities) — this one judges what is already in use.
---

# Stack Assess

이미 쓰는 스택의 **적절성을 점수화**하고, 미달 스택에 대해 영향범위를 고려해 **업그레이드(실행 가능)** 또는 **교체(risk=low면 실행, 그 외 제안)** 를 제시한다. 평가 자체는 read-only다.

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
- `< 60` & 스택 자체 부적합(deprecated/방치/궁합 나쁨) → **replace**. 이때 **교체 위험 등급**을 함께 산출한다: 상태위험(capability) · blast radius · 준비도(테스트/CI/env) → `migrationRisk` = low|medium|high|critical. (리포트의 "마이그레이션 준비도" 줄과 in-use 표가 입력)

리서치가 불충분하면 "점수 미완"으로 표시하고 결정론 신호만 제시(추측 금지).

### Step 4: 행동
- **upgrade** → 사용자 동의 시 `install-stack` 스킬을 **`upgrade` 모드**로 호출(목표 버전 전달). 코드 변경은 install-stack 게이트(clean git·단계별 승인·검증) 하에서만.
- **replace** → 위험 등급이 행동을 가른다:
  - **risk == low** (상태없음+낮은blast+테스트有): `recommend-stack`으로 대안(to)을 정한 뒤, 사용자 동의 시 `install-stack`을 **`replace` 모드**(from→to)로 호출해 가이드 실행(clean git/브랜치·codemod 단계승인·테스트 패리티 게이트).
  - **risk ≥ medium** (상태있음 or blast 큼 or 테스트無): **실행하지 않는다.** 대안 + 위험 등급 + 영향범위 + **착수 전 전제조건 체크리스트**(dev/staging/prod 분리·백업·테스트 커버리지) + 마이그레이션 개요를 리포트로 제시. 실제 교체는 안전망을 갖춘 뒤 사람이(별도 사이클).

## 원칙
- **이미 쓰는 스택만** 평가. 빈 capability는 recommend-stack.
- **항상 리서치.** 점수 근거에 출처.
- **업그레이드는 실행. 교체는 risk=low만 실행, 그 외 제안만.** 위험 등급이 게이트.
- 결정은 사용자. 영향범위를 항상 함께 제시.
