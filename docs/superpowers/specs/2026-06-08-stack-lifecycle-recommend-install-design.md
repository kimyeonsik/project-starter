# 스택 라이프사이클: 빠진 스택 추천·설치 + 기존 스택 평가·업그레이드 — 설계 문서

- **작성일**: 2026-06-08
- **상태**: 승인됨 (brainstorming 완료, writing-plans 진입 직전)
- **대상 레포**: [`kimyeonsik/project-starter`](https://github.com/kimyeonsik/project-starter) (authoring SSOT), 소비처 `scaffold-at`
- **드라이버**: scaffold-at 메인 세션 (remote-control)
- **선행 문서**: [`2026-06-04-project-starter-adopt-existing-design.md`](./2026-06-04-project-starter-adopt-existing-design.md) (P1/P2: 감지·거버넌스·recommender 메모)

---

## 1. 배경 & 문제

선행 사이클로 project-starter는 0.6.0까지 왔다: `stack-detect`(감지), `adopt`/`inspect`(거버넌스 vendoring, **코드 비파괴**), `recommend-stack`(빈 capability에 *어떤* 스택을 도입할지 리서치 기반 추천)까지 구현됐다.

그러나 사용자가 기대한 "프로젝트에 **부족한 스택을 확인 → 적절한 대안 제안 → 실제 설치**까지 흘러가는" 경험은 두 군데서 끊긴다:

1. **추천이 설치로 이어지지 않는다.** `recommend-stack`은 "어떤 걸(which)"까지만 하고 step 5에서 *"도입(설치)은 별도 작업으로"* 하고 끝낸다. "어떻게(how) 설치하느냐"가 비어 있다.
2. **기존 스택의 적절성을 평가하지 않는다.** 선행 설계는 *"운영중 프로젝트는 이미 쓰는 capability를 교체 추천하지 않는다(리스크)"* 를 일부러 못박았다. 빈 capability만 본다. 노후·방치·부적합한 *기존* 스택은 사각지대다.

또한 `adopt`은 발견을 만났을 때 진입점도 아니다 — 사용자는 `adopt`(거버넌스)만 겪고 `recommend`를 본 적이 없어, 감지→추천이 이미 있다는 사실조차 드러나지 않았다.

## 2. 목표 & 비목표

### 목표
- **G1.** 추천을 **실제 설치**로 잇는다 — 선택된 스택을 *가이드 실행*(리서치 런북 + 단계별 승인)으로 도입.
- **G2.** 이 흐름을 `adopt`에 **대화형으로 통합**한다 — 거버넌스 후 발견(빈 capability)을 만나면 자연스럽게 추천·설치로.
- **G3.** **기존 스택을 점수화 평가**하고, 미달 시 **영향범위를 고려해** 업그레이드(실행) 또는 교체(제안)를 제시한다.

### 비목표 (이번 사이클)
- **교체(replacement) 실행.** 다른 스택으로의 전환은 *제안 + 영향범위 + 마이그레이션 개요*까지만. 실행은 별도 사이클(`migrate-stack` 여지).
- **비대화(CI/headless) 자동 설치.** 설치/업그레이드는 대화형 + 단계별 승인 전용.
- **레시피 라이브러리 / 자동 승격.** v1은 순수 리서치 범용. (§5.4, §10)
- 모든 breaking change의 자동 수정.

### 정정 사항
- 선행 설계의 *"기존 capability 교체 추천 금지"* 원칙을 **부분 완화**한다: 빈 capability뿐 아니라 *기존 스택의 적절성*도 평가하되, 교체는 **제안만**(실행 안 함)으로 리스크를 봉인한다. 업그레이드(같은 스택 버전업)는 위험 등급이 달라 실행을 허용한다.

## 3. 아키텍처 결정 — 2-계약 adopt + 가이드 설치 엔진

`adopt`이 **두 가지 계약**을 갖도록 확장한다:

- **계약 A (거버넌스, 기존 스택)** — 코드 비파괴. *현행 그대로.* 소스/설정 미변경, `.claude/` + `CLAUDE.md`만.
- **계약 B (설치/업그레이드, 신규 또는 미달 스택)** — 코드 변경 **허용**. 단 다음 게이트를 **모두** 통과해야 한다:
  - ▸ 명시적 동의(대화형 게이트)
  - ▸ 깨끗한 git working tree (더러우면 전용 브랜치 생성 또는 중단)
  - ▸ 단계별 승인(런북 각 단계: 명령/diff 표시 → 승인 → 실행 → 결과)
  - ▸ 검증(빌드/테스트) — 실패 시 성공 주장 금지, 롤백/수정
  - ▸ *대상 스택에만* 한정 — 무관한 코드 절대 안 건드림

근거:
- 사용자가 명시한 원칙: *"기존 스택엔 비파괴가 맞지만, 없는 걸 새로 추가하는 경우엔 파괴(코드 변경)가 맞다."* 계약 분리가 이를 그대로 표현한다.
- 가이드 실행(리서치 런북)은 하드코딩 설치기 없이 **롱테일 스택을 수용**한다(AI 강점). 선행 설계가 보류한 Tier 3의 부담(품질 편차·라이브러리 유지보수)을 지지 않으면서 실용 가치를 얻는다.

수용한 트레이드오프:
- 런북 품질이 **리서치에 의존**한다 → 단계별 승인 + 검증 게이트로 완충. 불확실하면 추측 대신 사용자 확인.
- adopt이 더 이상 "항상 안전"하지 않다 → 계약 B를 **대화형 + git 게이트**로 명확히 격리.

## 4. AI / 순수-Node 경계 (관통 제약)

`adopt.mjs`는 **AI-free 순수 Node**라 셸 CLI(`cli.mjs adopt`)로도 돈다. 반면 추천·평가·가이드 설치는 **리서치(AI)가 필수**다. 따라서:

- **`adopt.mjs` (순수 Node)**: 감지 + 거버넌스 vendoring + 갭 리포트 + **결정론 신호**(빈 capability, 프로필, 기존 스택의 *설치버전·사용처 수·프로필힌트*)까지. AI 호출 없음.
- **스킬 레이어 (AI)**: 리서치가 필요한 모든 것 — 추천(which), 점수화(평가), 가이드 설치/업그레이드 실행.
- **셸 CLI**: 결정론 부분까지만 노출. 설치/업그레이드/추천은 **스킬 전용**(new-project-bootstrap이 스킬 전용인 것과 동일 패턴).

## 5. 컴포넌트 & 인터페이스

| 단위 | 책임 | 의존 | 변경 |
|---|---|---|---|
| `adopt.mjs` (순수 Node) | 감지 + 거버넌스 + 갭/결정론 신호 리포트 | stack-detect, gap-analysis | **확장**(기존-스택 결정론 신호 추가), AI-free 유지 |
| `adopt-existing-project` 스킬 | 오케스트레이터: 거버넌스 → 대화형 게이트 → recommend/assess/install 핸드오프 | adopt.mjs, recommend-stack, stack-assess, install-stack | 게이트/핸드오프 추가 |
| `recommend-stack` 스킬 | "어떤 걸(which)" 리서치·추천 (빈 capability 도입 + 교체 대안) | inspect 신호 | step 5를 "별도 작업" → **install-stack 핸드오프**로 |
| **`stack-assess` 스킬 (신규)** | 기존 스택 점수화(0–100) + 영향범위 + 판정(ok/upgrade/replace-propose) | adopt.mjs 결정론 신호 + 리서치 | 신규 |
| **`install-stack` 스킬 (신규)** | 가이드 설치/업그레이드 실행(`add`\|`upgrade`) + 설치 후 규칙 vendoring | recommend 결과, vendor.mjs | 신규 |
| `/install <stack>` 커맨드 (신규) | 설치만 직접 진입 | install-stack | 신규 |

각 단위는 좁은 인터페이스로 독립 테스트 가능하게 유지한다. `adopt.mjs`의 추가 출력은 **순수 함수(파일 입력 → 구조화 신호)** 로 부수효과 없음.

### 5.1 `recommend-stack` 핸드오프
step 4(순위 추천)에서 사용자가 고르면, step 5는 더 이상 "별도 작업"이 아니라 **`install-stack`(add 모드)으로 핸드오프**한다. 교체 대안 리서치(§6 replace-propose)에도 재사용된다.

### 5.2 `stack-assess` (신규, read-only 평가)
기존 스택마다 **0–100 종합점수** + 판정을 낸다. 4개 가중 차원:

| 차원 | 산출 | 가중 |
|---|---|---|
| 보안 (알려진 CVE/심각도) | 리서치 | 높음 |
| 유지보수 (마지막 릴리스/커밋, deprecated/archived, 이슈 상태) | 리서치 | 높음 |
| 버전 노후도 (설치버전 vs 최신, major 뒤처짐) | 설치버전=결정론(package.json) + 최신=리서치 | 중간 |
| 프로필 적합성 (platform/hosting 궁합·지역; 평판/생태계 포함) | 결정론 힌트(`profile()`) + 리서치 | 중간 |

**영향범위(blast radius)**: 토큰0 결정론 — repo 내 해당 패키지 import/require·설정 참조 **사용처 카운트** → 낮음/중간/높음.

**판정 로직** (기본 임계 `< 60`, 설정 가능):
- `≥ 60` → **ok**
- `< 60` & 같은 스택 버전업으로 주요 감점 해소 가능 → **upgrade**
- `< 60` & 스택 자체 부적합(deprecated/방치/궁합 나쁨, 업글로 해결 안 됨) → **replace-propose**

출력(스택별): `{ stack, score, dimensionScores, blastRadius, verdict, evidence[] }`. 점수는 근거(출처 링크)와 함께 제시.

### 5.3 `install-stack` (신규, 가이드 실행 엔진 — `add` | `upgrade`)
입력: 대상 스택, 모드(add|upgrade), capability, 프로필/맥락, (upgrade면) 목표 버전.

1. **안전 전제** — git working tree clean 확인. 더러우면 전용 브랜치(`chore/install-<stack>` 또는 `chore/upgrade-<stack>`) 생성 제안 또는 중단.
2. **리서치** — 이 프로젝트(프레임워크/런타임/패키지매니저)에 맞는 공식 설치/셋업(또는 업그레이드/마이그레이션) 문서: 명령·설정파일·init 코드·env·문서링크. (add든 upgrade든 동일 엔진)
3. **런북 합성** — 순서: ① deps 설치/버전 범프 → ② `.env.local` **자리표시자** 추가 → ③ 설정/provider/init 코드 → ④ 앱 배선(또는 codemod/마이그레이션) → ⑤ 검증.
4. **프리뷰 → 단계별 실행** — 런북 전체를 먼저 보여주고, 각 단계마다 명령/diff 표시 → 승인 → 실행 → 결과.
5. **검증** — 빌드/테스트 실행. 실패 시 표면화 + 재시도/건너뛰기/롤백(git). 성공 주장은 검증 통과 후에만.
6. **거버넌스 후속** — `stacks/<name>.md` 있으면 vendor + `CLAUDE.md` managed block 추가; 없으면 capability generic 적용 + 리포트에 "전용 규칙 권장"(adopt의 degrade-to-generic 재사용).

### 5.4 시크릿 경계
가이드 설치는 **실제 키를 대화에 절대 안 받는다** — `.env.local`엔 **자리표시자만** 쓰고, 진짜 키는 `setup-secrets`/`/secrets`로 유도. install이 깐 `Read(./.env*)` deny 규칙과 일관.

### 5.5 엔진 정책 (v1)
**순수 리서치 범용** — 레시피 라이브러리 없음. capability 불문(analytics·error-tracking·auth·payments·email·database·test-runner·ai·hosting) 동일 메커니즘. 특정 스택이 리서치로 불안정하면 그때 `recipes/<stack>.md`를 *손으로* 추가(= `stacks/*.md` 규칙이 자라는 방식). **자동 승격은 채택하지 않는다**(레포 분리 구조상 신기루).

## 6. 데이터 흐름

```
대상 repo
  └─(read)─▶ adopt.mjs (순수 Node)
                └─▶ report {
                      absentCapabilities, profile,
                      inUse: [{ stack, capability, installedVersion, usageCount, profileFitHint }]
                    }
                      │  (발견 없음 → 종료, 현행)
                      ▼  (발견 있음)
              [대화형 게이트] — 두 갈래
                ├─(a) 빈 capability
                │      └▶ recommend-stack(리서치) → 사용자 선택 → install-stack(add)
                │             → 가이드 실행(안전·런북·승인·검증) → 규칙 vendor + CLAUDE.md
                └─(b) 기존 스택
                       └▶ stack-assess(결정론 신호 + 리서치) → 점수·blast·판정
                            ├ upgrade   → install-stack(upgrade) → 가이드 실행
                            └ replace   → recommend-stack(대안 리서치) + 마이그레이션 개요
                                          → 리포트(제안만, 실행 X)
  결과: 코드 변경은 깨끗한 git/전용 브랜치 위, 단계별 승인·검증 완료분만.
```

## 7. 검증 / 테스트

### 단위 (비-AI, 결정론)
- `adopt.mjs` 기존-스택 신호: 설치버전 추출, **blast-radius 카운터**(import/require·설정 참조 사용처), 프로필힌트.
- `stack-assess` **판정 로직**: 차원점수 → verdict(ok/upgrade/replace), 임계 경계.
- 설치-후 vendor 로직(adopt `vendor.mjs` 재사용).

### 통합 (픽스처 repo)
- **add 경로**: analytics 빠진 가짜 repo → 스택 선택 시뮬 → 검증: (a) clean git/브랜치에서만 시작 (b) env는 **자리표시자**(실키 아님) (c) `stacks` 규칙 vendor 또는 generic 명시 (d) `CLAUDE.md` 갱신 (e) 빌드/테스트 검증 호출.
- **assess/upgrade 경로**: 낡은/deprecated 스택 픽스처 → 점수 `< 임계`, verdict 정확(upgrade vs replace-propose), **교체 미실행**(diff에 제거/전환 0줄) 검증.
- **idempotent / 비파괴 회귀**: 계약 A(거버넌스)는 여전히 코드 0줄 diff.

### 도그푸딩
- scratch repo에 실제 스택 하나 `add`로 설치, 기존 스택 하나 `upgrade` 시연.

## 8. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| 가이드 설치가 무관 코드 손상 | 계약 B 게이트(동의·clean git/브랜치·단계별 승인·대상 한정) + 검증 후 성공 주장 |
| 리서치 런북 부정확 | 프리뷰 + 단계별 승인 + 빌드/테스트 검증; 불확실 시 추측 금지·사용자 확인 |
| 교체의 큰 blast radius | 설계상 **제안만**(실행 비목표) + 영향범위·마이그레이션 개요 명시 |
| 점수 오판(리서치 실패) | "점수 미완" 표시 + 결정론 신호만 제시, 근거 링크 동반 |
| 시크릿 노출 | 자리표시자만, 실키는 setup-secrets; .env deny 일관 |
| adopt이 더 이상 무조건 안전 아님 | 계약 A/B 명확 분리, 셸 CLI는 계약 A까지만 |

## 9. 향후 (이번 범위 밖)
- **교체 실행** `migrate-stack`: 구스택 제거 + 신규 설치 + 호출부 이전 + 데이터/계약 마이그레이션. 별도 사이클.
- **레시피 라이브러리/반자동 저장**: 리서치 런북이 특정 스택에서 반복 불안정하면 수작성 `recipes/<stack>.md` 도입.
- **비대화(CI) 설치**: 사전승인된 plan 파일 기반 headless 실행.
- **P4 고객 repo 제품화**: scaffold.at 워커가 이 흐름을 고객 repo에 자동 적용.

## 10. 결정 로그

| # | 결정 | 근거 |
|---|---|---|
| D1 | **2-계약 adopt** (A 비파괴 / B 설치-파괴) | 사용자 원칙: 기존=비파괴, 신규 추가=파괴가 맞음 |
| D2 | 설치는 **가이드 실행**(리서치 런북 + 단계별 승인) | AI 강점·롱테일 수용, Tier3 하드코딩 부담 회피 |
| D3 | **신규 `install-stack` 스킬 + adopt 통합** (대화형 게이트) | 관심사 분리(which/how) + 연속 UX; 1+3 결합 |
| D4 | 설치/평가 = **스킬 전용**, `adopt.mjs`는 결정론 신호까지 | AI/순수-Node 경계, 셸 CLI 유지 |
| D5 | 안전 전제 = **clean git / 전용 브랜치** | 모든 변경 리뷰·롤백 가능; 단계별 승인과 이중 안전 |
| D6 | **기존 스택 점수화 평가** (보안·유지보수·버전노후·프로필적합) + blast radius | 노후/방치/부적합 사각지대 해소 |
| D7 | **업그레이드 실행, 교체 제안만** | 위험 등급 차이 — 교체는 마이그레이션 프로젝트급 |
| D8 | v1 **순수 리서치 범용**, 레시피/자동승격 보류 | YAGNI; 자동 승격은 레포 분리상 신기루 |
