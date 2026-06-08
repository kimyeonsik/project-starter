---
name: install-stack
description: Guided installation of a NEW stack into an existing project for an empty capability (analytics, error-tracking, auth, payments, email, database, test-runner, ai, hosting). Researches the official setup for THIS project's framework, synthesizes an install runbook, and executes it step-by-step with approval — then vendors the matching governance rule. Use after recommend-stack picks a tool, or when the user says "install X", "set up X", "add X to the project". This DOES modify code (deps/config/env) under strict gates. Three modes: `add` (new stack), `upgrade` (same stack, newer version), `replace` (swap to a different stack — LOW-RISK ONLY, entered solely via stack-assess's risk gate). Stateful (db/auth/payments) or higher-risk replacements are never executed here — stack-assess reports them instead.
---

# Install Stack (guided, add)

빈 capability에 **새 스택을 실제로 도입(설치)** 한다. recommend-stack이 "어떤 걸"을 정했다면, 이 스킬이 "어떻게"를 가이드 실행으로 수행한다.

이건 거버넌스(adopt)와 **계약이 다르다**: 코드(의존성·설정·env)를 **바꾼다.** 그래서 아래 게이트를 모두 통과해야 한다.

## When to Use
- recommend-stack 추천에서 사용자가 스택을 고른 직후 (핸드오프)
- "X 설치해줘 / 셋업해줘 / 프로젝트에 X 붙여줘"
- adopt의 대화형 게이트에서 "설치 진행" 동의 시
- stack-assess가 **upgrade** 판정을 내고 사용자가 동의했을 때 (모드 `upgrade`)
- stack-assess가 **교체를 risk=low 로 판정**하고 사용자가 동의했을 때 (모드 `replace`)

## When NOT to Use
- **상태 있는(db/auth/결제) 교체, 또는 stack-assess가 risk≥medium 으로 판정한 교체** → 실행 금지. stack-assess가 리포트한다.
- (업그레이드=같은 스택 버전업은 `upgrade`, 다른 스택으로의 교체는 `replace`[low 전용] 모드로 지원.)
- 빈 디렉토리 신규 프로젝트 → `new-project-bootstrap`
- 사용자가 "코드 건드리지 마" 명시

## 불변 원칙 (계약 B — 절대 위반 금지)
1. **명시적 동의 후에만** 코드 변경 시작.
2. **깨끗한 git 위에서만**: 시작 전 `git status --porcelain` 확인. 더러우면 사용자가 **먼저 커밋/스태시**하도록 안내하고, 정리된 뒤에 진행한다. (전용 브랜치를 쓰더라도 더러운 변경분을 데려가지 않는다 — 모든 변경을 diff로 리뷰·롤백 가능하게)
3. **단계별 승인**: 런북 각 단계마다 명령/diff를 보여주고 승인받은 뒤 실행.
4. **검증 후 성공 주장**: 빌드/테스트가 통과해야 "완료"라고 말한다. 실패는 그대로 보고.
5. **대상 스택에만 한정**: 무관한 코드/파일은 건드리지 않는다.
6. **시크릿 비노출**: 실제 키를 대화에 받지 않는다. `.env.local`엔 **자리표시자만**, 진짜 키는 `setup-secrets`/`/secrets`로 유도.

## 절차

### Step 1: 입력 확정
- **모드**(`add` | `upgrade` | `replace`), 대상 스택, capability, 대상 repo 경로(기본 cwd)를 확정한다. upgrade면 목표 버전, replace면 **from(구스택)·to(신스택)**.
- `replace` **진입 가드**: 반드시 stack-assess가 **risk=low**(상태없음+낮은blast+테스트)로 넘긴 경우에만. 상태 있는 capability이거나 risk≥medium이면 **거부**(여기로 오면 안 됨).
- `add`인데 이미 그 capability를 쓰고 있으면 → **중단**. 다른 스택으로의 교체는 stack-assess가 위험 등급으로 판정(low만 실행)함을 안내.
- `upgrade`는 이미 쓰는 그 스택을 같은 계열 상위 버전으로 올리는 경우에만.

### Step 2: 안전 전제 (git)
```bash
cd "<대상 repo>" && git rev-parse --is-inside-work-tree && git status --porcelain
```
- git repo가 아니면 → `git init` 제안 또는 중단(롤백 불가 경고). `git init` 직후엔 베이스라인 커밋을 먼저 만들어 롤백 기준점을 확보한다.
- 출력이 비어있지 않으면(더러움) → **중단**하고 사용자에게 커밋/스태시를 요청한다. 워킹트리가 깨끗해진 뒤 진행.
- 깨끗하면(권장) 전용 브랜치를 만들어 작업: `git checkout -b chore/install-<stack>` (변경을 격리·롤백 쉽게).

### Step 3: 리서치 (필수, 추측 금지)
이 프로젝트 맥락에 맞는 **공식 설치/셋업**(upgrade면 **업그레이드·마이그레이션 가이드/브레이킹 체인지**)을 확인한다 — 프레임워크/런타임/패키지매니저를 먼저 파악(package.json, lockfile):
- `claude.ai Context7` MCP 또는 WebSearch로 **현행 공식 문서**의 설치 명령·설정 파일·init 코드·필요한 env·검증 방법을 수집.
- 버전·API는 모델 지식이 아니라 **리서치 결과**를 신뢰한다(바뀜).
- 불확실하면 추측하지 말고 사용자에게 문서/버전을 확인.

### Step 4: 런북 합성 → 프리뷰
수집한 정보로 순서 있는 런북을 만든다:
1. 의존성 설치(`add`) 또는 버전 범프(`upgrade`) — 해당 repo의 패키지매니저로
2. `.env.local`에 필요한 env **자리표시자** 추가 (예: `RESEND_API_KEY=__SET_ME__`)
3. 설정/provider/init 코드 (공식 문서 기준)
4. 앱에 배선 (프레임워크 관례 따라)
5. 검증 단계 (빌드/테스트/스모크)

런북 **전체를 먼저 사용자에게 보여주고** 동의를 받는다.

### Step 5: 단계별 실행
각 단계마다: 실행할 명령 또는 적용할 diff를 보여줌 → 승인 → 실행 → 결과 확인. 한 단계 실패 시 중단하고 재시도/건너뛰기/롤백(git) 중 선택. (건너뛰기는 선택적·비차단 단계에 한함 — 의존성 설치 등 필수 단계 실패 시엔 중단/롤백한다.)

### Step 6: 검증
빌드/테스트를 실행한다(예: `<pm> run build`, 테스트 러너가 있으면 테스트). 통과해야 완료. 실패하면 표면화하고 수정 또는 `git restore`/브랜치 폐기로 롤백 제안. **검증 전 성공 주장 금지.**

### Step 7: 거버넌스 후속 (규칙 vendoring — 재사용)
새 스택이 깔렸으니 adopt 엔진을 재실행해 그 스택의 규칙을 vendor + CLAUDE.md 갱신한다(코드 비파괴, idempotent):
```bash
PROJECT_ROOT="<대상 repo 절대경로>" node "<adopt-existing-project 스킬 디렉터리>/engine/scripts/adopt.mjs" --lang ko
```
- 전용 규칙(`stacks/<name>.md`)이 있으면 적용됨. 없으면 capability generic으로 커버되고 리포트에 "전용 규칙 권장"으로 뜸 → 사용자에게 안내.

### Step 8: 시크릿 마무리
실제 키가 필요하면 `setup-secrets`/`/secrets`로 안내한다. **키를 대화에 받지 않는다.**

## replace 모드 (low 전용)
교체 = add 재사용 + 호출부 이전 + 구스택 제거. 위 공통 게이트(clean git/브랜치·단계 승인·검증·시크릿·대상 한정)를 그대로 따르되 순서가 다르다:
1. 진입 가드 확인(risk=low, from·to). 아니면 중단.
2. 전용 브랜치 `chore/replace-<from>-to-<to>`.
3. 신스택 설치 = `add` 절차 재사용.
4. **호출부 codemod**: blast radius 파일들을 from→to API로 **단계별 승인** 재작성(리서치 기반). 대상 외 무관 코드 금지.
5. 구스택 제거(의존성·설정).
6. **패리티 게이트**: 테스트 실행 → 통과해야 완료. 실패 시 `git`/브랜치 폐기로 롤백.
7. 거버넌스 후속(adopt 재실행).

## 검증 체크리스트
- [ ] 시작 전 워킹트리 clean(더러우면 커밋/스태시 후), 변경은 전용 브랜치에 격리
- [ ] `.env.local`에 자리표시자만(실키 없음)
- [ ] 빌드/테스트 검증 통과 후에만 완료 보고
- [ ] 대상 스택 외 무관 변경 없음
- [ ] 규칙 vendor + CLAUDE.md 갱신됨 (adopt 재실행)
