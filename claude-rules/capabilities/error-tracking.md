# Capability: Error Tracking (스택-독립)

named 규칙이 없는 에러 트래킹 도구에 적용되는 generic 규칙.

## 핵심 규율

- 프로덕션 에러는 **대시보드/이슈를 먼저 조회**한다 — 코드만 보고 원인을 지어내지 않는다.
- 핵심 비즈니스 로직은 명시적으로 예외를 캡처한다.
- 디버깅은 `superpowers:systematic-debugging`.

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| 프로덕션 에러 / 스택트레이스 | 트래킹 도구 이슈 조회 먼저 → `superpowers:systematic-debugging` |
