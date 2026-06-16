---
name: inspect-project
description: Read-only inspection of a project's stack and governance gaps WITHOUT modifying anything. Detects in-use stacks, classifies each as named/generic, and reports missing governance — a dry-run of adopt-existing-project. Use when the user wants to check current state, audit governance, or preview what adoption would do before applying. Also covers post-adoption verification.
---

# Inspect Project (read-only)

현재 프로젝트의 스택과 거버넌스 갭을 **아무것도 바꾸지 않고** 진단한다. (`adopt-existing-project`의 dry-run)

## When to Use
- "지금 상태 점검", "뭐가 빠졌나", "적용하면 뭐가 바뀌나 미리 보기"
- 입양(adopt) 적용 전 영향 미리 확인, 또는 적용 후 설치 검증

엔진은 형제 스킬 `adopt-existing-project` 에 번들돼 있다(클론 경로 불필요). 같은 skills 폴더의 그 스킬 디렉터리를 `<ADOPT_SKILL_DIR>` 이라 할 때 — `<ADOPT_SKILL_DIR>` 은 네가 `adopt-existing-project/SKILL.md` 를 읽어온 실제 절대경로로 치환한다.

> 이 `--dry-run`은 **`new-project-bootstrap`(Step 7.9)이 초기화 때 돌리는 바로 그 adopt 엔진**의 read-only 모드다. init과 상태점검이 하나의 detect→gap→vendor 체인을 공유하므로, 부트스트랩 직후/정기 점검에서 동일 엔진으로 셋업이 최신인지 확인한다.

## 점검 (적용 전, read-only)
```bash
PROJECT_ROOT="<대상 repo 절대경로>" node "<ADOPT_SKILL_DIR>/engine/scripts/adopt.mjs" --dry-run
```
출력: 감지된 스택(✅ named / ⚠️ generic) + 누락 거버넌스. **파일을 전혀 쓰지 않는다.**

## 검증 (적용 후)
```bash
PROJECT_ROOT="<대상 repo 절대경로>" node "<ADOPT_SKILL_DIR>/engine/scripts/adopt.mjs" --verify
```
예상 규칙 파일·CLAUDE.md 관리블록이 모두 있으면 통과, 없으면 누락 목록 출력. (read-only)

## 불변 원칙
- `--dry-run`·`--verify`는 **read-only** — 어떤 파일도 수정하지 않는다.
