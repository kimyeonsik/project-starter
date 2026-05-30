# Agent Teams 워크플로우

복수 역할이 필요한 작업은 Agent Teams 모드로 동작한다.

## 파이프라인

```
PO (스펙) → Architect (설계, plan_approval)
              ├→ Designer (UI/UX, UI 있는 경우만)
              └→ Developer (구현, isolation: worktree)
                    └→ QA ↔ Reviewer (병렬 크로스 리뷰)
                          └→ 병합
```

| 단계 | 역할 | 산출물 위치 |
|---|---|---|
| PO | 요구사항 → AC 전환 | `_team/specs/` |
| Architect | 설계 문서 + plan_approval 게이트 | `_team/designs/` |
| Designer | 컴포넌트 트리, 상태 정의 (UI 있을 때만) | `_team/designs/ui/` (.pen 포함) |
| Developer | `isolation: worktree`에서 격리 구현 | 코드 |
| QA | 기능 검증 (병렬) | `_team/reviews/` |
| Reviewer | 코드 품질 리뷰 (병렬) | `_team/reviews/` |

## 리뷰 게이트

- Developer 완료 → **QA + Reviewer 둘 다 승인 필수**
- 한쪽만 승인: 병합 차단
- 거절 시 피드백과 함께 Developer 반환 (최대 3회)
- 3회 초과 시 팀 리드 에스컬레이션

## 파일 소유권

- `in_progress` 태스크의 파일에 대해 점유자가 쓰기 권한 독점
- 다른 팀원은 점유 중 파일 수정 금지
- 필요 시 `SendMessage`로 조율
- `isolation: worktree` 에이전트는 독립 worktree에서 작업 → 병합 단계에서만 충돌 확인

## 태스크 의존성

`TaskUpdate`의 `addBlockedBy`로 명시적 설정.

```
1. PO 스펙          blockedBy: []
2. Architect 설계    blockedBy: [1]
3. Designer UI       blockedBy: [2]
4. Developer 구현    blockedBy: [2, 3]
5. QA 리뷰          blockedBy: [4]
6. Reviewer 리뷰     blockedBy: [4]
7. 병합             blockedBy: [5, 6]
```

## 커뮤니케이션

| 도구 | 사용처 |
|---|---|
| `SendMessage` | 설계/리뷰 요청, 충돌 조율, 긴급 이슈 (브로드캐스트 `*` 허용) |
| `TaskUpdate` | 진행률, 차단 사유, 완료 처리 |

**브로드캐스트 금지**: 개인 피드백, 진행 상황 로그

## 작업 공간

```
<project>/
├── _team/
│   ├── specs/     # PO
│   ├── designs/   # Architect + Designer(ui/)
│   └── reviews/   # QA / Reviewer
└── .claude/agents/  # 프로젝트별 커스텀 에이전트 (선택)
```

## 팀 리드 (메인 세션) 가이드

1. **파이프라인 필요성 판단**
   - 단순 질문/수정 → 파이프라인 없이 직접 처리
   - 신규 기능 / 리팩토링 / 멀티 컴포넌트 → Agent Teams 활성화
2. 필요한 팀원만 스폰 (모든 역할 항상 필요한 건 아님)
3. 태스크 의존성 설정 후 팀원 자율 실행
4. 주요 게이트에서만 개입 (승인, 충돌 중재)
5. 완료 후 `TeamDelete`

## 비용 관리

| 항목 | 가이드 |
|---|---|
| 팀원 수 | 기본 3~4명, 최대 5명 |
| 모델 | Sonnet 우선, Opus는 Architect/QA만 |
| 종료 | `maxTurns` 초과 시 자동 |
| Max 5시간 윈도우 근접 시 | `_team/specs`만 저장하고 중단 |
