# Guided Stack Install (add path) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** project-starter가 빈 capability에 대해 추천(`recommend-stack`)을 **가이드 설치**로 잇고, 그 흐름을 `adopt`에 대화형으로 통합한다 (스펙 §1~§8, add 경로).

**Architecture:** 신규 `install-stack` 스킬(add 모드)이 "가이드 실행"(안전 게이트 → 리서치 런북 → 단계별 승인 → 검증 → 거버넌스 후속)을 담당한다. `recommend-stack`은 선택 후 `install-stack`으로 핸드오프하고, `adopt-existing-project`는 거버넌스 리포트 후 빈 capability가 있으면 대화형 게이트로 이 흐름을 제안한다. 설치 후 규칙 vendoring은 **기존 adopt 엔진 재실행으로 재사용**(새 코드 없음).

**Tech Stack:** Markdown 스킬/커맨드 저작(한국어), Node `node:test`(consistency 가드), 번들된 `engine/scripts/adopt.mjs` 재사용.

> **구현 대상 레포:** `~/projects/project-starter` (authoring SSOT). 아래 모든 경로는 그 레포 기준.
> **선행 스펙:** [`../specs/2026-06-08-stack-lifecycle-recommend-install-design.md`](../specs/2026-06-08-stack-lifecycle-recommend-install-design.md)

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `skills/install-stack/SKILL.md` | 가이드 설치(add) 엔진 — 안전/리서치/런북/승인/검증/거버넌스 후속 | 생성 |
| `commands/install.md` | `/install <stack>` 직접 진입점 | 생성 |
| `skills/recommend-stack/SKILL.md` | 추천 후 install-stack 핸드오프 (step 5 교체) | 수정 |
| `skills/adopt-existing-project/SKILL.md` | 거버넌스 후 대화형 게이트(빈 capability → 추천/설치) | 수정 |
| `package.json` / `CHANGELOG.md` | 0.6.0 → 0.7.0 + 변경 기록 | 수정 |

신규 스킬 디렉터리는 `install.mjs`가 `skills/` 를 읽어 자동 설치하므로 registry 변경 불필요(내부 스킬). 설치 후 규칙 vendoring은 새 코드 없이 `adopt.mjs` 재실행으로 처리.

---

## Task 1: `install-stack` 스킬 생성

**Files:**
- Create: `~/projects/project-starter/skills/install-stack/SKILL.md`

- [ ] **Step 1: 스킬 파일 작성**

아래 내용을 그대로 작성한다 (이 파일이 이 플랜의 핵심 산출물):

````markdown
---
name: install-stack
description: Guided installation of a NEW stack into an existing project for an empty capability (analytics, error-tracking, auth, payments, email, database, test-runner, ai, hosting). Researches the official setup for THIS project's framework, synthesizes an install runbook, and executes it step-by-step with approval — then vendors the matching governance rule. Use after recommend-stack picks a tool, or when the user says "install X", "set up X", "add X to the project". This DOES modify code (deps/config/env) under strict gates. Do NOT use to replace or upgrade a stack already in use (that is out of scope this cycle).
---

# Install Stack (guided, add)

빈 capability에 **새 스택을 실제로 도입(설치)** 한다. recommend-stack이 "어떤 걸"을 정했다면, 이 스킬이 "어떻게"를 가이드 실행으로 수행한다.

이건 거버넌스(adopt)와 **계약이 다르다**: 코드(의존성·설정·env)를 **바꾼다.** 그래서 아래 게이트를 모두 통과해야 한다.

## When to Use
- recommend-stack 추천에서 사용자가 스택을 고른 직후 (핸드오프)
- "X 설치해줘 / 셋업해줘 / 프로젝트에 X 붙여줘"
- adopt의 대화형 게이트에서 "설치 진행" 동의 시

## When NOT to Use
- **이미 쓰는 스택의 교체/업그레이드** → 이번 사이클 범위 밖 (제안만). 사용자에게 안내하고 중단.
- 빈 디렉토리 신규 프로젝트 → `new-project-bootstrap`
- 사용자가 "코드 건드리지 마" 명시

## 불변 원칙 (계약 B — 절대 위반 금지)
1. **명시적 동의 후에만** 코드 변경 시작.
2. **깨끗한 git 위에서만**: 시작 전 `git status --porcelain` 확인. 더러우면 전용 브랜치 생성(`chore/install-<stack>`) 또는 중단. (모든 변경을 diff로 리뷰·롤백 가능하게)
3. **단계별 승인**: 런북 각 단계마다 명령/diff를 보여주고 승인받은 뒤 실행.
4. **검증 후 성공 주장**: 빌드/테스트가 통과해야 "완료"라고 말한다. 실패는 그대로 보고.
5. **대상 스택에만 한정**: 무관한 코드/파일은 건드리지 않는다.
6. **시크릿 비노출**: 실제 키를 대화에 받지 않는다. `.env.local`엔 **자리표시자만**, 진짜 키는 `setup-secrets`/`/secrets`로 유도.

## 절차

### Step 1: 입력 확정
- 대상 스택(이름), capability, 대상 repo 경로(기본 cwd)를 확정한다.
- 이미 그 capability를 쓰고 있으면 (교체/업그레이드) → **중단**하고 "이번 범위 밖(제안만)"임을 안내.

### Step 2: 안전 전제 (git)
```bash
cd "<대상 repo>" && git rev-parse --is-inside-work-tree && git status --porcelain
```
- git repo가 아니면 → `git init` 제안 또는 중단(롤백 불가 경고).
- 출력이 비어있지 않으면(더러움) → 둘 중 하나:
  - 전용 브랜치 생성: `git checkout -b chore/install-<stack>`
  - 또는 사용자가 커밋/스태시할 때까지 중단.

### Step 3: 리서치 (필수, 추측 금지)
이 프로젝트 맥락에 맞는 **공식 설치/셋업**을 확인한다 — 프레임워크/런타임/패키지매니저를 먼저 파악(package.json, lockfile):
- `claude.ai Context7` MCP 또는 WebSearch로 **현행 공식 문서**의 설치 명령·설정 파일·init 코드·필요한 env·검증 방법을 수집.
- 버전·API는 모델 지식이 아니라 **리서치 결과**를 신뢰한다(바뀜).
- 불확실하면 추측하지 말고 사용자에게 문서/버전을 확인.

### Step 4: 런북 합성 → 프리뷰
수집한 정보로 순서 있는 런북을 만든다:
1. 의존성 설치 (해당 repo의 패키지매니저로)
2. `.env.local`에 필요한 env **자리표시자** 추가 (예: `RESEND_API_KEY=__SET_ME__`)
3. 설정/provider/init 코드 (공식 문서 기준)
4. 앱에 배선 (프레임워크 관례 따라)
5. 검증 단계 (빌드/테스트/스모크)

런북 **전체를 먼저 사용자에게 보여주고** 동의를 받는다.

### Step 5: 단계별 실행
각 단계마다: 실행할 명령 또는 적용할 diff를 보여줌 → 승인 → 실행 → 결과 확인. 한 단계 실패 시 중단하고 재시도/건너뛰기/롤백(git) 중 선택.

### Step 6: 검증
빌드/테스트를 실행한다(예: `<pm> run build`, 테스트 러너가 있으면 테스트). 통과해야 완료. 실패하면 표면화하고 수정 또는 `git restore`/브랜치 폐기로 롤백 제안. **검증 전 성공 주장 금지.**

### Step 7: 거버넌스 후속 (규칙 vendoring — 재사용)
새 스택이 깔렸으니 adopt 엔진을 재실행해 그 스택의 규칙을 vendor + CLAUDE.md 갱신한다(코드 비파괴, idempotent):
```bash
PROJECT_ROOT="<대상 repo 절대경로>" node "<adopt-existing-project SKILL_DIR>/engine/scripts/adopt.mjs" --lang ko
```
- 전용 규칙(`stacks/<name>.md`)이 있으면 적용됨. 없으면 capability generic으로 커버되고 리포트에 "전용 규칙 권장"으로 뜸 → 사용자에게 안내.

### Step 8: 시크릿 마무리
실제 키가 필요하면 `setup-secrets`/`/secrets`로 안내한다. **키를 대화에 받지 않는다.**

## 검증 체크리스트
- [ ] 시작 전 git clean 또는 전용 브랜치
- [ ] `.env.local`에 자리표시자만(실키 없음)
- [ ] 빌드/테스트 검증 통과 후에만 완료 보고
- [ ] 대상 스택 외 무관 변경 없음
- [ ] 규칙 vendor + CLAUDE.md 갱신됨 (adopt 재실행)
````

- [ ] **Step 2: 파일 존재·프론트매터 확인**

Run: `cd ~/projects/project-starter && head -3 skills/install-stack/SKILL.md`
Expected: 첫 줄 `---`, 둘째 줄 `name: install-stack`.

- [ ] **Step 3: 커밋**

```bash
cd ~/projects/project-starter
git add skills/install-stack/SKILL.md
git commit -m "feat(install-stack): guided add-stack skill (contract B)"
```

---

## Task 2: `/install` 슬래시 커맨드 생성

**Files:**
- Create: `~/projects/project-starter/commands/install.md`

- [ ] **Step 1: 커맨드 파일 작성**

```markdown
---
description: 빈 capability에 새 스택을 가이드 설치(코드 변경 — 단계별 승인)
---
`install-stack` 스킬로 선택된 스택을 현재 프로젝트에 **실제 설치**한다 (의존성·설정·env 변경).

시작 전 git이 깨끗해야 하며(더러우면 전용 브랜치), 공식 문서를 **리서치**해 설치 런북을 만들고 **단계별 승인**으로 실행한 뒤 **빌드/테스트로 검증**한다. 실제 키는 받지 않는다 — `.env.local` 자리표시자만, 진짜 키는 `/secrets`로. 설치 후 해당 스택의 규칙을 자동 vendoring한다.

이미 쓰는 스택의 교체/업그레이드는 이번 범위 밖(제안만)이다.

$ARGUMENTS
```

- [ ] **Step 2: install.mjs가 커맨드를 집는지 확인 (코드 경로 점검)**

Run: `cd ~/projects/project-starter && grep -n "commandsSrc\|readdirSync(commandsSrc)" scripts/install.mjs`
Expected: `commands/*.md`를 읽어 설치하는 로직이 존재(0.5.0에서 추가됨) → 새 파일 자동 포함.

- [ ] **Step 3: 커밋**

```bash
cd ~/projects/project-starter
git add commands/install.md
git commit -m "feat(commands): /install slash command"
```

---

## Task 3: `recommend-stack` → `install-stack` 핸드오프

**Files:**
- Modify: `~/projects/project-starter/skills/recommend-stack/SKILL.md` (Step 5 섹션)

- [ ] **Step 1: 기존 Step 5 문구 교체**

찾을 기존 텍스트:
```markdown
### Step 5: (선택) 도입 연결
사용자가 고르면 설치/연동은 별도 작업으로. 도입 후 전용 규칙(`stacks/<name>.md`)이 없으면 추가를 제안(adopt가 generic으로 커버 중일 것).
```

다음으로 교체:
```markdown
### Step 5: 설치로 핸드오프
사용자가 스택을 고르면 **`install-stack` 스킬로 넘긴다** (가이드 설치 — 코드 변경은 단계별 승인·검증 게이트 하에). 도입 후 규칙 vendoring은 install-stack이 adopt 엔진 재실행으로 처리한다.
- 사용자가 "추천만, 설치는 나중에"라고 하면 핸드오프하지 않고 추천만 남긴다.
- **이미 쓰는 capability는 추천 대상이 아니다**(빈 capability만).
```

- [ ] **Step 2: 교체 확인**

Run: `cd ~/projects/project-starter && grep -n "install-stack" skills/recommend-stack/SKILL.md`
Expected: Step 5에서 install-stack 핸드오프 언급이 나옴.

- [ ] **Step 3: 커밋**

```bash
cd ~/projects/project-starter
git add skills/recommend-stack/SKILL.md
git commit -m "feat(recommend-stack): hand off to install-stack after selection"
```

---

## Task 4: `adopt-existing-project`에 대화형 게이트 추가

**Files:**
- Modify: `~/projects/project-starter/skills/adopt-existing-project/SKILL.md` (Step 4 뒤에 Step 4.5 삽입)

- [ ] **Step 1: Step 4 다음에 게이트 단계 삽입**

찾을 기존 텍스트 (Step 4 블록 전체):
```markdown
### Step 4: 개선 제안은 승인 후 별건
리포트의 제안(테스트 셋업 보강, ADR 작성 등)은 **사용자 승인 후 별도 작업**으로 진행한다. 입양 스킬 자체는 코드에 손대지 않는다.
```

그 **뒤에** 다음을 삽입(Step 4는 그대로 두고 아래를 추가):
```markdown

### Step 4.5: 빈 capability 발견 시 대화형 게이트
리포트의 **"빈 capability (스택 추천 후보)"** 가 비어있지 않으면, 거버넌스(계약 A)는 끝났음을 알린 뒤 **물어본다**:

> "빈 capability [analytics, …]가 있습니다. 적절한 스택을 추천하고 설치까지 진행할까요?"

- **동의** → `recommend-stack` 스킬로 추천 → 사용자 선택 → `install-stack` 스킬로 가이드 설치(계약 B: clean git/브랜치·단계별 승인·검증). 이 단계는 **코드를 바꾼다** — adopt 자체의 비파괴(계약 A)와 별개의, 명시적 동의 하에 들어가는 단계임을 분명히 한다.
- **거절** → 추천/설치 없이 종료. 거버넌스만 적용된 상태로 남는다.

> 계약 분리: Step 1~4(거버넌스)는 코드 비파괴. Step 4.5의 설치는 동의 후에만, install-stack의 게이트 하에서만.
```

- [ ] **Step 2: 삽입 확인**

Run: `cd ~/projects/project-starter && grep -n "Step 4.5\|대화형 게이트\|install-stack" skills/adopt-existing-project/SKILL.md`
Expected: Step 4.5 게이트와 install-stack 핸드오프가 나옴.

- [ ] **Step 3: 커밋**

```bash
cd ~/projects/project-starter
git add skills/adopt-existing-project/SKILL.md
git commit -m "feat(adopt): interactive gate to recommend+install on empty capabilities"
```

---

## Task 5: 버전 범프 + CHANGELOG

**Files:**
- Modify: `~/projects/project-starter/package.json` (version)
- Modify: `~/projects/project-starter/CHANGELOG.md` (최상단 항목 추가)

- [ ] **Step 1: package.json version 변경**

`"version": "0.6.0",` → `"version": "0.7.0",`

- [ ] **Step 2: CHANGELOG 최상단에 항목 추가**

`# Changelog` 머리말 블록 바로 다음, `## [0.6.0]` 위에 삽입:
```markdown
## [0.7.0] - 2026-06-08

### Added
- **Guided stack install (`install-stack` skill + `/install`).** Installs a NEW
  stack for an empty capability by researching the official setup for the
  project's framework, synthesizing a runbook, and executing it step-by-step
  with approval — then vendoring the matching rule via the adopt engine. Modifies
  code under strict gates (explicit consent, clean git / dedicated branch,
  per-step approval, build/test verification, scoped to the target stack). Secrets
  stay out of the conversation (`.env.local` placeholders → `setup-secrets`).
- **recommend-stack now hands off to install-stack** after the user picks a tool.
- **adopt now offers an interactive gate**: after non-destructive governance, if
  empty capabilities exist, it offers recommend → guided install (contract B).

### Notes
- Replacing/upgrading an in-use stack remains out of scope (separate cycle).
```

- [ ] **Step 3: consistency 테스트 실행 (CHANGELOG===version 가드)**

Run: `cd ~/projects/project-starter && node --test scripts/lib/consistency.test.mjs`
Expected: 모든 테스트 PASS — 특히 `CHANGELOG.md latest version === package.json version`, `registry VERSION === package.json version`.

- [ ] **Step 4: 커밋**

```bash
cd ~/projects/project-starter
git add package.json CHANGELOG.md
git commit -m "chore: 0.6.0 → 0.7.0 (guided stack install, add path)"
```

---

## Task 6: 통합 도그푸딩 검증 (수동)

**목적:** AI-가이드 흐름이라 자동 단위테스트가 안 되므로, scratch repo에 실제로 한 번 흘려본다.

**Files:** (코드 변경 없음 — 검증만)

- [ ] **Step 1: scratch repo 준비 (analytics 빠진 Next.js 가짜 repo)**

```bash
mkdir -p /tmp/install-stack-dogfood && cd /tmp/install-stack-dogfood
git init -q
printf '{\n  "name": "dogfood",\n  "dependencies": { "next": "15.0.0", "react": "19.0.0" }\n}\n' > package.json
git add -A && git commit -q -m "init scratch"
```

- [ ] **Step 2: dry-run으로 빈 capability 확인 (analytics가 후보로 떠야)**

Run:
```bash
PROJECT_ROOT=/tmp/install-stack-dogfood node ~/projects/project-starter/scripts/adopt.mjs --dry-run --lang ko
```
Expected: 리포트의 "빈 capability" 목록에 `analytics`(및 다른 빈 것들) 포함. 코드 변경 0.

- [ ] **Step 3: install-stack 흐름 수동 점검 (스킬 절차대로)**

`install-stack` SKILL.md 절차를 따라 analytics용 스택(예: posthog) 설치를 *직접* 수행하며 확인:
- 시작 전 `git status --porcelain` 비어있음(clean) 확인 → 통과
- 일부러 더미 파일 만들어 더러운 상태 → 스킬이 전용 브랜치/중단을 요구하는지 확인 후 원복
- 런북 프리뷰 → 단계별 승인 동작
- `.env.local`에 키가 아니라 자리표시자만 들어가는지
- 설치 후 `adopt.mjs` 재실행 → posthog가 감지되어 규칙 vendor + CLAUDE.md 갱신(전용 규칙 없으면 analytics generic + "권장" 표시)

- [ ] **Step 4: 정리**

```bash
rm -rf /tmp/install-stack-dogfood
```

- [ ] **Step 5: 검증 결과를 PR 본문/리포트에 요약**

(a) clean git 게이트 작동 (b) env 자리표시자만 (c) 빌드/검증 게이트 (d) 규칙 vendor 됨 — 4가지를 확인했다고 기록.

---

## Self-Review

**Spec coverage (add 경로 = §1~§8):**
- §3 계약 B 게이트 → Task 1 불변원칙 1~6 ✅
- §4 AI/Node 경계(설치=스킬 전용) → install-stack은 스킬, vendoring은 adopt 엔진 재사용 ✅
- §5.1 recommend 핸드오프 → Task 3 ✅
- §5.3 install-stack add 절차 → Task 1 Step 1~8 ✅
- §5.4 시크릿 경계 → Task 1 불변원칙 6 + Step 8 ✅
- §5.5 순수 리서치 범용 → Task 1 Step 3(리서치, 레시피 없음) ✅
- §11 대화형 게이트 통합 → Task 4 ✅
- §7 테스트(add 경로) → Task 5(consistency) + Task 6(도그푸딩) ✅
- (Plan B 영역: stack-assess/upgrade/replace는 의도적으로 제외)

**Placeholder scan:** 모든 마크다운 산출물은 완전한 본문 포함. `<대상 repo>`·`<SKILL_DIR>` 등은 실행 시점 치환 토큰으로, 스킬 본문이 명시적으로 "치환하라"고 지시 → 플레이스홀더 아님.

**Type/이름 일관성:** 스킬명 `install-stack`, 브랜치 패턴 `chore/install-<stack>`, env 자리표시자 `__SET_ME__`, 모드 `add` — 전 태스크 일관.

---

## Execution Handoff

이 플랜(Plan A, add 경로)만 다룬다. **Plan B**(stack-assess 점수화 + upgrade 실행 + 교체 제안)는 별도 플랜 문서로 후속.
