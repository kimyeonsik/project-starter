# Git 워크플로우 (브랜칭 / 커밋 / PR)

Always-on. 프로젝트 CLAUDE.md에서 특정 규칙을 덮어쓰지 않는 한 모든 프로젝트에 적용.

## 브랜칭

- **Trunk-based**: `main`에서 짧게 사는 브랜치를 파서 작업; `main`에 직접 커밋하지 않는다.
- 브랜치명: `<type>/<short-kebab-desc>` — `feat/user-auth`, `fix/login-redirect`, `chore/bump-deps`, `docs/readme-ko`.
- PR 열기 전에 `main`을 rebase/merge로 반영; 드리프트 방지 위해 브랜치는 짧게 유지.
- 머지 후 브랜치 삭제.

## 커밋

- **Conventional Commits**: `<type>(<scope>): <subject>` — `feat(auth): add magic-link login`.
- 타입: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`.
- subject: 명령형 현재시제("add", "added"/"adds" 아님), 마침표 없음, ~72자 이내.
- 커밋 하나에 논리적 변경 하나. 리팩토링 + 기능 + 포매팅을 한 커밋에 섞지 않는다.
- 시크릿, `.env*`, 생성 산출물은 절대 커밋하지 않는다 (`security.md` 참조).
- **커밋/푸시는 사용자가 요청할 때만.** `main`에 있으면 먼저 브랜치를 판다.

## Pull Request

- 작고 집중되게 — PR 하나당 관심사 하나. 큰 작업은 stacked PR로 쪼갠다.
- 설명에는 **무엇을** 바꿨고 **왜** 바꿨는지 (diff를 파일별로 재서술하지 말 것).
- 닫는 이슈/티켓 링크.
- **머지 전 CI green 필수** (GitHub Actions 사용 시 `stacks/github-actions.md` 참조).
- 머지 전 리뷰 스레드 해소; "완료" 선언 전에 Stage 6 게이트(`verification-before-completion` + `requesting-code-review`)가 돈다.
- 피처 브랜치는 **squash merge** 권장(`main`에 깔끔한 단일 커밋); 개별 커밋이 가치 있을 때만 히스토리 보존.

## PR 전 체크리스트

PR 열기 전, 워킹 트리가 CI가 돌릴 것을 로컬에서 통과해야 한다: lint, typecheck, 유닛 테스트, build. 첫 실패 발견을 CI에 떠넘기지 않는다.
