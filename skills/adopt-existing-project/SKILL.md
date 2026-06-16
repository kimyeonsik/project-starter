---
name: adopt-existing-project
description: Apply project-starter governance to an EXISTING, running project without scaffolding new code. Detects the in-use stack, vendors only the matching rules into ./.claude/rules/, synthesizes a CLAUDE.md managed block, and writes a non-destructive gap report. Use when the user wants to bring project-starter conventions into a repo that already has code. Do NOT use for empty directories (use new-project-bootstrap instead).
---

# Adopt Existing Project

운영중 프로젝트에 project-starter 거버넌스를 **비파괴적으로** 입힌다. 코드를 새로 깔지 않는다.

사용자가 "이 프로젝트에 project-starter 적용해줘", "기존 repo에 규칙 입혀줘" 처럼 말하면 이 스킬로 처리한다 — **사용자가 직접 명령을 칠 필요 없다.** 이 스킬에는 실행 엔진이 함께 번들돼 있다(이 SKILL.md 옆 `engine/`).

> **이 `engine/`이 공통 하네스다.** 세 경로가 같은 `adopt.mjs`를 모드만 달리해 쓴다 — `new-project-bootstrap`(Step 7.9)은 init 때 apply, 이 스킬은 기존 repo에 apply, `inspect-project`는 `--dry-run`/`--verify`(read-only). 즉 초기화와 상태점검이 하나의 detect→gap→vendor 엔진을 공유한다.

## When to Use
- 이미 코드가 있는 repo에 규칙/거버넌스를 적용하고 싶을 때 ("적용", "입혀줘", "adopt")
- 고객/외부 repo를 표준 기판 위로 올릴 때

## When NOT to Use
- 빈 디렉토리 → `new-project-bootstrap`
- 사용자가 "스킬 쓰지 마" 명시

## 불변 원칙 (절대 위반 금지)
1. **코드 비파괴**: 소스/설정 파일을 수정/덮어쓰지 않는다. `.claude/` 와 `CLAUDE.md` 만 건드린다.
2. **self-contained vendoring**: 규칙을 repo 안 `./.claude/rules/` 로 복사한다 (`@~/` 글로벌 임포트 금지).
3. **idempotent**: 두 번 돌려도 추가 변경 없음 (managed block 마커로 갱신).

## 절차

### Step 1: 대상 확인
대상 repo 경로 확인 (기본 cwd). `.git` 외 파일이 있어야 한다 (빈 디렉토리면 중단 → bootstrap 안내).

### Step 2: 입양 실행 (번들 엔진)

이 스킬에는 **자급자족 엔진**이 함께 설치돼 있다 — 이 `SKILL.md` 와 같은 디렉터리의 `engine/scripts/adopt.mjs`. 클론 경로를 알 필요가 없다. 이 SKILL.md를 읽어온 디렉터리를 `<SKILL_DIR>`(예: `~/.agents/skills/adopt-existing-project` 또는 `<project>/.claude/skills/adopt-existing-project`)이라 할 때:

```bash
# 대상 repo를 PROJECT_ROOT로, 세션 언어에 맞춰 --lang (한국어→ko, 영어→en)
PROJECT_ROOT="<대상 repo 절대경로>" node "<SKILL_DIR>/engine/scripts/adopt.mjs" --lang ko
```
- `<SKILL_DIR>` 은 **네가 이 스킬을 읽어온 실제 절대경로**로 치환한다.
- 먼저 `--dry-run` 으로 미리보기, 적용 뒤 `--verify` 로 검증 가능.

엔진이 수행: 스택 감지 → 필요한 규칙만 `./.claude/rules/` 복사 → CLAUDE.md 관리 블록 합성 → `./.claude/adopt-report.md` 생성.

### Step 3: 리포트 함께 검토
`./.claude/adopt-report.md`를 사용자와 함께 본다:
- ✅ named: 전용 규칙 적용됨
- ⚠️ generic: 쓰고 있지만 전용 규칙 없음 → capability generic으로 커버. 원하면 `stacks/<name>.md` 추가 권장.
- 누락된 거버넌스 산출물(`_team/`, `docs/adr/`, `CONTEXT.md` 등) 제안.

### Step 4: 개선 제안은 승인 후 별건
리포트의 제안(테스트 셋업 보강, ADR 작성 등)은 **사용자 승인 후 별도 작업**으로 진행한다. 입양 스킬 자체는 코드에 손대지 않는다.

### Step 4.5: 빈 capability 발견 시 대화형 게이트
리포트의 **"빈 capability (스택 추천 후보)"** 가 비어있지 않으면, 거버넌스(계약 A)는 끝났음을 알린 뒤 **물어본다**:

> "빈 capability [analytics, …]가 있습니다. 적절한 스택을 추천하고 설치까지 진행할까요?"

- **동의** → `recommend-stack` 스킬로 추천 → 사용자 선택 → `install-stack` 스킬로 가이드 설치(계약 B: clean git/브랜치·단계별 승인·검증). 이 단계는 **코드를 바꾼다** — adopt 자체의 비파괴(계약 A)와 별개의, 명시적 동의 하에 들어가는 단계임을 분명히 한다.
- **거절** → 추천/설치 없이 종료. 거버넌스만 적용된 상태로 남는다.

> 계약 분리: Step 1~4(거버넌스)는 코드 비파괴. Step 4.5의 설치는 동의 후에만, install-stack의 게이트 하에서만.

### Step 4.6: 기존 스택 적절성 게이트
리포트의 **"기존 스택 (적절성 점검 후보)"** 표가 있으면, 원하면 점수화 평가를 제안한다:

> "기존 스택을 점수화 평가(보안·유지보수·버전·적합성)해 업그레이드/교체 후보를 가려볼까요?"

- **동의** → `stack-assess` 스킬로 평가 → 판정별:
  - **upgrade** → 동의 시 `install-stack`(`upgrade` 모드)으로 실행(계약 B 게이트).
  - **replace** → 위험 등급 분기: risk=low면 동의 시 `install-stack`(`replace` 모드)으로 실행, medium+면 위험·전제조건 리포트만(실행 안 함).
- **거절** → 평가 없이 종료.

> 평가(stack-assess)는 read-only다. 코드 변경은 upgrade 동의 후 install-stack 게이트 하에서만.

## 검증 체크리스트
- [ ] 소스 코드 `git diff` 0줄 (`.claude/`·`CLAUDE.md` 외 변경 없음)
- [ ] `./.claude/rules/` 에 규칙 존재, `@~/` 미포함
- [ ] `./.claude/adopt-report.md` 생성
- [ ] 재실행 시 추가 diff 없음 (idempotent)
