# 스킬 자동 활성화 규칙 (사용자 여정 기반)

명시적 호출 없이도 맥락에 따라 자동으로 스킬을 트리거한다. **사용자가 "스킬 쓰지 마" 같은 명시 차단을 하지 않는 한, 아래 매트릭스를 결정론적으로 적용한다.**

목적: 아이디어 → 설계 → 구현 → 검증 → 배포의 사용자 여정을 통해 **품질 높은 완성된 서비스**까지 연결.

## 사용자 여정 6단계

### Stage 1 — Discovery (요구사항/아이디어 탐색)

**트리거 키워드**: "아이디어 있는데", "뭘 만들지", "프로젝트 시작", "사용자가 원하는 게", "from scratch"

**스킬 체인** (순차):
1. `mattpocock/skills@grill-me` — 요구사항 grill (집요한 인터뷰)
2. `obra/superpowers@brainstorming` — 창의 탐색, 의도/타겟/제약
3. `vercel-labs/skills@find-skills` — 도메인에 필요한 추가 스킬 검색

산출물: 컨셉 메모 / `CONTEXT.md` 초안

### Stage 2 — Setup (프로젝트 인프라)

**트리거**: Stage 1 완료 + 빈 디렉토리에서 시작했을 때

**스킬 체인**:
1. `new-project-bootstrap` (project-starter 자체) — Next.js 15 + TypeScript + pnpm + Sentry + Amplitude + Supabase + Vitest + Playwright 11단계 셋업
2. `setup-secrets` (project-starter 자체) — Step 5/6/7에서 키 주입 (AI에 키 노출 금지)

산출물: 동작하는 스캐폴드 + `_team/`, `docs/adr/`, `CLAUDE.md`

### Stage 3 — Design (UI/UX + 아키텍처 설계)

**트리거 키워드**: "UI 만들", "디자인", "컴포넌트", "랜딩", "대시보드", "스타일", "아키텍처", "구조"

**스킬 체인**:
- `anthropics/skills@frontend-design` — 디자인 품질 (generic AI UI 회피)
- `mattpocock/skills@improve-codebase-architecture` — 구조 진단, deepening 기회

**스택별 추가** (프로젝트 CLAUDE.md import 시 자동 누적):
- Next.js → `nextjs-app-router-patterns` + `vercel-react-best-practices`

### Stage 4 — Implementation (TDD 사이클)

**트리거 키워드**: "이 기능 만들자", "구현하자", "코드 짜자", "build it"

**스킬 체인**:
1. `obra/superpowers@writing-plans` — 단계화된 구현 계획
2. `obra/superpowers@test-driven-development` — Red → Green → Refactor
3. (필요 시) 반복 자동화: `omc:ralph` 또는 `omc:ultraqa`로 green light까지 루프

**스택별 추가**:
- TypeScript 복잡 타입 → `wshobson/agents@typescript-advanced-types`
- Supabase 작업 → `supabase` + `supabase-postgres-best-practices`
- Cloudflare Workers → Cloudflare MCP tools
- Anthropic SDK → `claude-api`

### Stage 5 — Quality (검증/디버깅/리팩토링)

**트리거 키워드**:
- "테스트", "E2E" → testing
- "왜 안 돼", "버그", "에러", 스택트레이스 → debugging
- "리뷰", "리팩토링", "이 코드 정리", "rename" → quality
- "접근성", "a11y" → accessibility

**스킬 체인**:
| 의도 | 활성화 |
|---|---|
| 체계적 디버깅 | `obra/superpowers@systematic-debugging` |
| E2E 자동화 | `anthropics/skills@webapp-testing` (Playwright) |
| 접근성 점검 | `addyosmani/web-quality-skills@accessibility` |
| Surgical 리팩토링 | `github/awesome-copilot@refactor` |
| 리팩토링 RFC + 이슈 | `mattpocock/skills@request-refactor-plan` |
| 변경분 점검 | `simplify` |
| AI 슬롭 정리 | `omc:ai-slop-cleaner` |

### Stage 6 — Pre-deploy (게이트)

**트리거 키워드**: "완료", "끝났어", "다 됐어", "PR 만들자", "머지", "배포 전"

**강제 게이트** (이 단계는 우회 불가):
1. `obra/superpowers@verification-before-completion` — 실제 동작 검증 후에만 "완료" 선언 허용
2. `obra/superpowers@requesting-code-review` — PR 전 자체 리뷰
3. (보안 영향 시) `security-review`

## 스택별 시그널 → 자동 활성화

코드/대화에서 시그널이 보이면 해당 스킬을 누적 활성화. (스택은 프로젝트 CLAUDE.md에 import해야 활성화됨)

| 시그널 | 자동 활성화 |
|---|---|
| TDD, 신규 기능 구현 시작 | `obra/superpowers@test-driven-development` |
| 라이브러리/SDK/CLI 문서 질문 | `claude.ai Context7` MCP 우선 |

## 정기 점검 (운영)

| 사용자 의도 | 자동 체인 |
|---|---|
| "헬스체크", "주간 점검", "코드 상태" | `improve-codebase-architecture` (진단) |
| "정기적으로", "매주", "스케줄링" | `schedule` 제안 |
| "리팩토링 계획", "RFC" | `request-refactor-plan` |
| "변경분만 점검" | `simplify` |

## 자동 활성화 차단 (boundary)

다음 경우엔 보류:
- 사용자가 "스킬 쓰지 마", "간단히만", "그냥 답만" 명시
- 단순 질문/답변 ("이 함수 뭐 해?", "X가 뭐야?")
- 1줄 수정 같은 trivial 작업

## 우선순위

여러 단계가 동시 매칭될 때:
1. **Stage 6 게이트 (verification)** — 완료 선언 직전 무조건 강제
2. **Stage 5 디버깅** — 버그 시그널은 다른 단계보다 우선
3. **Stage 1 Discovery** — 명확화 부족 시 먼저
4. **나머지 단계** — 도메인 / 시점 매칭

## 사용 보고 형식

자동 활성화한 스킬은 응답 시작에 **한 줄로** 알림.

예시:
- `(Stage 1 — Discovery: grill-me + brainstorming 활성화)`
- `(Stage 4 — Implementation: TDD + supabase 활성화)`
- `(Stage 6 — Pre-deploy: verification-before-completion 강제 게이트)`

장황한 설명 금지.

## 인벤토리 점검 (Self-check)

부트스트랩 시작 직전 또는 사용자 요청 시:
```bash
npx skills list -g
```

핵심 스킬 누락 확인:
```bash
npx skills list -g | grep -E "brainstorm|writing-plans|test-driven|systematic-debug|verification|requesting-code-review|grill-me|find-skills|frontend-design|improve-codebase|refactor"
```

12개 일치하면 essential 번들 정상 (`refactor` 패턴이 `refactor`와 `request-refactor-plan` 둘 다 매칭). 누락이 있으면 `project-starter/scripts/install.sh`를 essential 또는 full 번들로 재실행 권장.
