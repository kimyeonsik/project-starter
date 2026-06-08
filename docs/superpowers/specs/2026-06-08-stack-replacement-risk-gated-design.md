# 스택 교체 — 위험등급 게이트 실행 + 준비도 진단 — 설계 문서

- **작성일**: 2026-06-08
- **상태**: 승인됨 (brainstorming 완료, writing-plans 진입 직전)
- **대상 레포**: [`kimyeonsik/project-starter`](https://github.com/kimyeonsik/project-starter) (authoring SSOT), 소비처 `scaffold-at`
- **드라이버**: scaffold-at 메인 세션 (remote-control)
- **선행 문서**: [`2026-06-08-stack-lifecycle-recommend-install-design.md`](./2026-06-08-stack-lifecycle-recommend-install-design.md) (P1/P2 + add/upgrade/assess)

---

## 1. 배경 & 문제

0.8.0까지 스택 라이프사이클이 갖춰졌다: `recommend-stack`(빈 capability에 무엇을 add), `install-stack`(add|upgrade 실행), `stack-assess`(쓰는 스택 점수→ok/upgrade/replace 판정). 그러나 **교체(replace)는 "제안만"** 이고 실행 경로가 없다(선행 §9에서 보류).

두 가지를 이번에 해결한다:

1. **교체 위험의 진단 부재.** 교체가 얼마나 위험한지(상태성·영향범위·안전망)를 등급화해 알려주지 않는다. DB·auth·결제 교체는 dev/staging/prod 분리·백업·테스트 없이는 비가역적 사고로 이어진다 — 도구는 그 전제를 보장 못 하므로 **함부로 실행하면 안 된다**.
2. **명백히 안전한 교체조차 못 한다.** 반대로 상태 없는 스택(test-runner·analytics·error-tracking·styling)을, 호출부가 적고 테스트가 있는 repo에서 바꾸는 건 git 롤백·테스트 패리티로 **안전하게 자동화 가능**한데 현재는 손도 못 댄다.

핵심 통찰: **위험 등급이 행동을 가르는 게이트가 되어야 한다.** 낮으면 실행, 높으면 진단·보고 후 멈춤.

## 2. 목표 & 비목표

### 목표
- **G1.** 교체 후보의 **위험·준비도를 결정론으로 진단**하고 등급화한다(low/medium/high/critical).
- **G2.** 위험이 **low일 때만** 교체를 **가이드 실행**한다(빅뱅 on 브랜치 + 테스트 패리티 게이트).
- **G3.** medium 이상이면 **실행하지 않고** 위험·전제조건을 리포트한다.
- **G4.** 스킬 계위를 깨끗하게 유지한다(어드바이저 2 / 실행기 1).

### 비목표 (이번 사이클)
- **상태 있는(DB·auth·결제) 교체 실행.** 항상 risk ≥ medium → 게이트에서 차단(리포트만).
- **데이터/스키마 마이그레이션 실행.** 절대 안 함(비가역·환경의존).
- **테스트 없는 repo의 교체 실행.** 패리티 검증 불가 → 차단.
- 비대화(CI) 자동 실행. 대화형·단계 승인 전용.
- `stack-assess` → `assess-stack` 리네임(0.8.0 배포분이라 비용, 보류).

### 정정 사항
선행 0.8.0은 "교체=제안만(실행 안 함)"을 여러 스킬에 박았다. 이번 설계는 그걸 **"위험=low면 실행, 그 외 제안만"** 으로 바꾼다 → §9 reconciliation에서 기존 문구를 일괄 갱신한다.

## 3. 아키텍처 결정 — 위험등급 게이트 + 실행기 단일화

### 3.1 위험 등급이 게이트
`stack-assess`가 교체 판정 시 **종합 위험 등급**을 낸다. 등급이 곧 게이트:
- `low` → 실행 허용 (install-stack `replace` 모드)
- `medium | high | critical` → **실행 금지**, 위험/준비도 리포트만

`low`의 정의를 못박는다(단일 게이트):
> **risk == low ⟺ ① 상태 없는 capability ② 낮은 blast radius ③ hasTests(패리티 검증 가능)** — 셋 다.
> 테스트가 없으면 교체가 동작을 깼는지 검증할 수 없으므로 최소 `medium`으로 올린다.

### 3.2 실행기 단일화 — `migrate-stack` 별도 스킬 대신 `install-stack`의 `replace` 모드
교체 실행 = `install-stack(add)`(신스택 설치) + **호출부 codemod** + **구스택 제거** + 패리티. 새 기계가 아니라 install-stack의 add를 재사용 + 단계 추가. 따라서 별도 스킬을 만들지 않고 **install-stack에 3번째 모드 `replace`(low 전용)** 를 추가한다.

근거:
- 스킬 계위가 **어드바이저 2(recommend-stack·stack-assess) / 실행기 1(install-stack)** 로 단순해진다. "4번째 비슷한 스택 스킬"·recommend-stack과의 인접 혼동 제거.
- add|upgrade|replace가 **공통 게이트**(clean git·단계 승인·검증·시크릿·대상 한정)를 공유.

## 4. 계위 & 흐름 (다이어그램)

```
계위 (2층)
  T1  어드바이저 (read-only · 리서치)        "무엇을/할지 말지 결정"
      ├─ recommend-stack : 빈 capability   → 무엇을 ADD
      └─ stack-assess    : 쓰는 스택        → 점수 → 판정 {유지 · 업그레이드 · 교체}
  T2  실행기 (코드 변경 · 게이트)
      └─ install-stack : add │ upgrade │ replace(low만)
  보조: adopt(거버넌스+라우팅) · inspect(미리보기) · new-project-bootstrap · setup-secrets
```

```
                          ┌──────────────┐
   대상 repo  ───읽기──▶   │  adopt.mjs   │  감지 + 거버넌스(비파괴)
                          │ (AI 없음)     │  + 결정론 신호: 빈 cap / 쓰는 스택
                          └──────┬───────┘    (버전·blast·준비도)
                  ┌──────────────┴───────────────┐
                  ▼                               ▼
          [빈 capability]                    [쓰는 스택]
                  ▼ T1                            ▼ T1
        ┌───────────────────┐          ┌────────────────────────┐
        │  recommend-stack  │          │     stack-assess       │
        │  리서치→후보 추천   │          │  4차원 점수 → 위험등급   │
        └─────────┬─────────┘          └───────────┬────────────┘
                  │ 선택                ┌───────────┼───────────────┐
                  │                     ▼           ▼               ▼
                  │                  [유지]      [업그레이드]      [교체]
                  │                  변경없음        │          risk=low?
                  │                                │         ┌────┴────┐
                  │                                │        YES        NO
                  │                                │         │         ▼
                  │                                │         │  ┌──────────────┐
                  │                                │         │  │위험/준비도리포트│
                  │                                │         │  │+전제조건체크   │
                  │                                │         │  │"실행 안 함"   │
                  │                                │         │  └──────────────┘
                  ▼ T2                             ▼ T2      ▼ T2
        ┌──────────────────────────────────────────────────────┐
        │                    install-stack                       │
        │   add        │   upgrade      │   replace(low만)        │
        │   신규설치     │   버전업        │   add+호출부codemod+제거 │
        │  [공통 게이트] clean git/브랜치·단계승인·빌드/테스트 패리티  │
        │              ·시크릿 비노출·대상 한정                      │
        └───────────────────────────┬──────────────────────────┘
                                     ▼
                         설치 후: adopt 재실행 → 규칙 vendoring
```

이 다이어그램은 스펙뿐 아니라 **README(또는 docs 개요)에도 기록**한다(§7 컴포넌트의 문서 산출물).

## 5. 결정론 신호 (Node, 테스트 가능) — 신규 `scripts/lib/migration-readiness.mjs`

- **`CAPABILITY_STATE_RISK`** (capability→상태위험): `high`=database·auth·payments / `medium`=hosting·email / `low`=analytics·error-tracking·test-runner·styling·framework·ai.
- **`readinessSignals(repoDir)`** (repo 안전망 탐지, 결정론):
  - `hasTests`: 테스트러너 감지(vitest/jest/playwright) **AND** 테스트 파일 존재(`*.test.*`/`*.spec.*`/`__tests__`).
  - `hasCI`: `.github/workflows/`에 `*.yml`/`*.yaml` 존재.
  - `envSeparation`: 복수 환경 파일 힌트(`.env.staging`/`.env.production`/`.env.development`).
- **`migrationRisk({ stateRisk, blast, readiness })`** 순수함수 → `low|medium|high|critical`:
  - 기준 = stateRisk. blast `high`면 한 단계 가중. 안전망 약하면(`!hasTests`) 가중, 강하면(hasTests+hasCI) 완화.
  - **하드룰**: `!readiness.hasTests` → 최소 `medium`(절대 low 아님). stateRisk `low` + blast `low` + hasTests → `low`.
  - 신호 불명확 → 보수적으로 위험 가중(안전 편향).

`migrationRisk == 'low'` 이 곧 §3.1 실행 게이트.

## 6. 데이터 흐름

```
adopt.mjs → report {
  absentCapabilities, profile,
  inUse: [{stack, capability, installedVersion, usageCount, blastRadius}],   // 0.8.0
  readiness: {hasTests, hasCI, envSeparation},                              // 신규(한 줄)
}
   stack-assess (교체 판정 시):
     stateRisk = CAPABILITY_STATE_RISK[capability]
     blast     = inUse[stack].blastRadius
     risk      = migrationRisk({stateRisk, blast, readiness})
       ├ low      → recommend-stack(대안 리서치) → install-stack(replace, from→to)
       └ medium+  → 위험/준비도 리포트(전제조건 체크 + "실행 안 함")
```

## 7. 컴포넌트 & 인터페이스

| 단위 | 책임 | 의존 | 작업 |
|---|---|---|---|
| `scripts/lib/migration-readiness.mjs` (+test) | 상태위험맵·준비도신호·`migrationRisk` 등급 (순수+fs) | 파일 읽기만 | 생성 |
| `scripts/lib/gap-analysis.mjs` | 리포트에 `readiness` + "준비도" 한 줄 | migration-readiness | 수정 |
| `scripts/lib/bundle-engine.mjs` | `ENGINE_LIB`에 migration-readiness.mjs 등록 | — | 수정 |
| `skills/install-stack/SKILL.md` | `replace` 모드 추가 (add+codemod+제거+패리티, low 전용) | install-stack add | 수정 |
| `skills/stack-assess/SKILL.md` | 교체 판정 → 등급 분기(low→install replace / medium+→리포트) | migration-readiness | 수정 |
| `commands/install.md` | replace 모드 반영 + **stale upgrade 문구 정정** | — | 수정 |
| `commands/assess.md` | 교체=등급 분기로 정정 | — | 수정 |
| `skills/adopt-existing-project/SKILL.md` | Step 4.6 교체 분기 정정(실행 안 함→등급 분기) | — | 수정 |
| `README.md` / `README.ko.md` (또는 docs 개요) | **계위/흐름 다이어그램 기록** | — | 수정 |
| `package.json` / `CHANGELOG.md` | 0.8.0 → 0.9.0 | — | 수정 |

## 8. install-stack `replace` 모드 (low 전용) 절차

1. **진입 가드**: 호출자가 stack-assess이고 risk==low임을 전제. 입력 `from`(구스택)·`to`(신스택)·capability·목표. 상태 있는 capability거나 risk≥medium이면 **거부**(여기로 오면 안 됨).
2. **안전**: clean git → 전용 브랜치(`chore/replace-<from>-to-<to>`). 더러우면 중단.
3. **신스택 설치**: install-stack `add` 로직 재사용.
4. **호출부 codemod**: blast radius 파일들을 구→신 API로 **단계별 승인** 재작성(리서치 기반). 대상 스택 외 무관 코드 안 건드림.
5. **구스택 제거**: 의존성·설정 제거.
6. **패리티 게이트**: 테스트 실행 → **통과해야 완료**. 실패 시 `git`/브랜치 폐기로 롤백.
7. **거버넌스 후속**: adopt 재실행 → 규칙 vendoring.

## 9. 기존 스킬 reconciliation (충돌 문구 일괄 갱신)

선행 0.8.0이 "교체=실행 안 함/제안만"으로 박은 곳을 "위험=low면 실행, 그 외 제안만"으로 갱신:

| 파일 | 현재(모순) | 갱신 |
|---|---|---|
| `stack-assess` desc/L8/L44/L49 | "does not execute replacement", "교체(제안만)", "실행하지 않는다" | 등급 분기(low 실행/medium+ 제안) |
| `adopt` Step 4.6 | "replace-propose → 실행 안 함" | low→install replace / medium+ 리포트 |
| `install-stack` desc/When/Step1 | "replacement is propose-only / 교체 범위 밖" | 교체=replace 모드(low 전용)로 지원 |
| `commands/install.md` | "교체/업그레이드 범위 밖(제안만)" — **upgrade는 0.8.0에서 이미 지원(stale 버그)** | "업그레이드 지원 / 교체 low만 실행" |
| `commands/assess.md` | "교체(제안만)" | 등급 분기 |

충돌 없음(유지): `recommend-stack`(빈 cap 전용, in-use 교체 추천 안 함) · `setup-secrets`(키 교체, 무관).

## 10. 에러 / 엣지

- 준비도 신호 불명확 → 위험 가중(안전 편향).
- 리서치 불충분(codemod 불확실) → 추측 금지, 사용자 확인/중단.
- codemod 단계 실패 → 중단·롤백(git).
- 패리티(테스트) 실패 → 완료 주장 금지, 롤백 제안.
- stateRisk high가 low 게이트로 새는 일 없도록: migrationRisk가 stateRisk high를 절대 low로 낮추지 않음(상한 규칙) + install-stack replace 진입 가드 이중 차단.

## 11. 검증 / 테스트

- **단위**: `CAPABILITY_STATE_RISK` 매핑, `readinessSignals`(픽스처: 테스트/CI/env 유무), `migrationRisk` 등급 경계(특히 `!hasTests→≥medium`, `state high→never low`, `low ⟺ stateless+lowblast+hasTests`).
- **통합**: scratch repo → adopt 리포트에 "준비도" 한 줄 렌더. 상태없는 스택+테스트있음 → low 산출. 상태있는 스택 → ≥medium.
- **회귀**: 기존 add/upgrade 게이트·consistency 가드 유지(0.9.0 버전/CHANGELOG 일치).

## 12. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| 위험한 교체가 실행됨 | 단일 게이트 risk==low(상태없음+낮은blast+테스트) + install-stack 진입 가드 이중 차단 + 상태high 상한 규칙 |
| codemod 오작동 | 단계별 승인 + 테스트 패리티 + git 롤백 |
| 테스트 없는데 low로 오판 | 하드룰 `!hasTests→≥medium` |
| 스킬 계위 혼동 | 실행기 단일화(install-stack 모드), 어드바이저/실행기 2층 + README 다이어그램 |
| 기존 문구와 모순 | §9 reconciliation 일괄 갱신 |

## 13. 향후 (이번 범위 밖)
- 상태 있는 교체/데이터 마이그레이션: dev/staging/prod 분리·백업·전용 도구 전제. 환경 안전망이 갖춰진 뒤 별도 사이클.
- 비대화(CI) 교체. `stack-assess`→`assess-stack` 네이밍 통일.

## 14. 결정 로그

| # | 결정 | 근거 |
|---|---|---|
| D1 | **위험 등급이 실행 게이트** | 위험한 건 자동 안 함 + 사소히 안전한 건 해줌 |
| D2 | `low ⟺ 상태없음+낮은blast+hasTests`, 단일 게이트 | 패리티 검증 가능성이 핵심; 테스트 없으면 실행 불가 |
| D3 | **교체=install-stack의 replace 모드** (별도 migrate-stack 스킬 안 만듦) | 계위 단순화(어드바이저2/실행기1), add 재사용, recommend 인접 혼동 제거 |
| D4 | 상태 있는 교체·데이터 마이그레이션 **실행 안 함** | 비가역·환경의존, 안전망 보장 불가 |
| D5 | 기존 "교체=제안만" 문구 §9에서 일괄 갱신 | 0.8.0과의 모순 제거 |
| D6 | 계위/흐름 **다이어그램을 README에 기록** | 발견성·유지보수자 온보딩 |
| D7 | `stack-assess` 리네임 보류 | 0.8.0 배포분, 비용 대비 가치 낮음 |
