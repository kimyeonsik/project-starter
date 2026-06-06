---
name: adopt-existing-project
description: Apply project-starter governance to an EXISTING, running project without scaffolding new code. Detects the in-use stack, vendors only the matching rules into ./.claude/rules/, synthesizes a CLAUDE.md managed block, and writes a non-destructive gap report. Use when the user wants to bring project-starter conventions into a repo that already has code. Do NOT use for empty directories (use new-project-bootstrap instead).
---

# Adopt Existing Project

운영중 프로젝트에 project-starter 거버넌스를 **비파괴적으로** 입힌다. 코드를 새로 깔지 않는다.

## When to Use
- 이미 코드가 있는 repo에 규칙/거버넌스를 적용하고 싶을 때
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

### Step 2: 입양 실행
```bash
# 한국어 규칙으로 입양 (project-starter 레포에서 대상 경로를 PROJECT_ROOT로):
PROJECT_ROOT=/path/to/target node /path/to/project-starter/scripts/adopt.mjs --lang ko
```
이 스크립트가 수행: 스택 감지 → 필요한 규칙만 `./.claude/rules/` 복사 → CLAUDE.md managed block 합성 → `./.claude/adopt-report.md` 생성.

### Step 3: 리포트 함께 검토
`./.claude/adopt-report.md`를 사용자와 함께 본다:
- ✅ named: 전용 규칙 적용됨
- ⚠️ generic: 쓰고 있지만 전용 규칙 없음 → capability generic으로 커버. 원하면 `stacks/<name>.md` 추가 권장.
- 누락된 거버넌스 산출물(`_team/`, `docs/adr/`, `CONTEXT.md` 등) 제안.

### Step 4: 개선 제안은 승인 후 별건
리포트의 제안(테스트 셋업 보강, ADR 작성 등)은 **사용자 승인 후 별도 작업**으로 진행한다. 입양 스킬 자체는 코드에 손대지 않는다.

## 검증 체크리스트
- [ ] 소스 코드 `git diff` 0줄 (`.claude/`·`CLAUDE.md` 외 변경 없음)
- [ ] `./.claude/rules/` 에 규칙 존재, `@~/` 미포함
- [ ] `./.claude/adopt-report.md` 생성
- [ ] 재실행 시 추가 diff 없음 (idempotent)
