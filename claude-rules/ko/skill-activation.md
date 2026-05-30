# 스킬 자동 활성화 규칙

명시적 호출 없이도 맥락에 따라 자동으로 스킬을 트리거한다. **사용자가 "스킬 쓰지 마" 같은 명시 차단을 하지 않는 한, 아래 매트릭스를 결정론적으로 적용한다.**

## 프로젝트 시작 인터뷰 프로토콜

**트리거 키워드**: "새 프로젝트", "처음 만들", "from scratch", "초기 구성", "앱 만들거야", "사이트 만들", "서비스 시작"

**실행 순서**:
1. `superpowers:brainstorming` 즉시 호출 — 타겟 유저, 핵심 가치, 기능 범위
2. 스택 모호 시 `omc:deep-interview` 또는 `grill-me`로 추가 인터뷰
3. **빈 디렉토리에서 시작했으면 `new-project-bootstrap` 스킬로 표준 인프라 셋업** (Next.js + Supabase + Sentry + Amplitude + Vitest + Playwright)
4. 부트스트랩 완료 후 `superpowers:writing-plans`로 첫 기능 단계화
5. 기능 구현은 `superpowers:test-driven-development` 사이클 (Red → Green → Refactor)
6. 자동 반복 필요 시 `omc:ralph` 또는 `omc:ultraqa`로 green light까지 루프
7. E2E 추가는 `webapp-testing` 스킬 + `playwright.config.ts` 패턴 따름

## 스택 무관 자동 활성화

| 시그널 | 자동 활성화 |
|---|---|
| TDD, 신규 기능 구현 시작 | `superpowers:test-driven-development` |
| 라이브러리/SDK/CLI 문서 질문 | `claude.ai Context7` MCP 우선 |

## 스택별 매핑 (옵트인)

스택별 시그널 → 스킬 매핑은 `~/.claude/rules/stacks/<stack>.md`에 정의되어 있고, **프로젝트 CLAUDE.md에서 명시적으로 import 한 경우에만** 적용된다. 글로벌은 어떤 스택도 전제하지 않는다.

사용 가능한 스택 룰:

| 파일 | 대상 |
|---|---|
| `stacks/nextjs.md` | Next.js + React + frontend-design |
| `stacks/supabase.md` | Supabase + Postgres |
| `stacks/vercel.md` | Vercel 배포/운영 (MCP 활용) |
| `stacks/playwright.md` | Playwright E2E |
| `stacks/claude-api.md` | Anthropic SDK / Claude API |

프로젝트 CLAUDE.md 예:
```markdown
@~/.claude/rules/stacks/nextjs.md
@~/.claude/rules/stacks/supabase.md
```

## 정기 점검 / 리팩토링

| 사용자 의도 | 자동 체인 |
|---|---|
| "헬스체크", "주간 점검", "코드 상태" | `improve-codebase-architecture` (진단) |
| "정기적으로", "매주", "스케줄링", "cron" | `schedule` 제안 |
| "리팩토링 계획", "RFC", "어떻게 고칠지" | `request-refactor-plan` |
| "이 코드 정리", "리네이밍", "함수 쪼개" | `refactor` |
| "AI 슬롭 제거", "deletion-first" | `omc:ai-slop-cleaner` |
| "변경분만 점검", "방금 짠 코드 리뷰" | `simplify` |

## 코드 변경 자동 게이트

| 시점 | 강제 스킬 |
|---|---|
| "완료", "끝났어", "다 됐어" 직전 | `superpowers:verification-before-completion` |
| PR 생성/머지 직전 | `simplify` + `review` (필요 시 `security-review`) |
| `isolation: worktree` 작업 마무리 | `superpowers:finishing-a-development-branch` |
| 버그/실패/예상치 못한 동작 | `superpowers:systematic-debugging` |

## 디버깅 / 탐색

| 시그널 | 자동 스킬 |
|---|---|
| "왜 안 돼", "버그", "에러", 스택트레이스 | `superpowers:systematic-debugging` |
| 코드베이스 광범위 탐색 (3쿼리 이상) | `Explore` 서브에이전트 |
| 라이브러리/SDK/CLI 문서 질문 | `claude.ai Context7` MCP 우선 |

## 우선순위

여러 스킬 동시 매칭 시:
1. **프로세스** (brainstorming, systematic-debugging, writing-plans) — HOW 결정
2. **도메인** (nextjs-*, supabase, frontend-design) — WHAT 구현
3. **검증** (verification-before-completion, simplify) — 마무리

## 자동 활성화 차단

다음 경우엔 보류:
- 사용자가 "스킬 쓰지 마", "간단히만", "그냥 답만" 명시
- 단순 질문/답변 ("이 함수 뭐 해?", "X가 뭐야?")
- 1줄 수정 같은 trivial 작업

## 사용 보고

자동 활성화한 스킬은 응답 시작에 **한 줄로** 알림.

예: `(brainstorming + nextjs-app-router-patterns 활성화)`

장황한 설명 금지.
