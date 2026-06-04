# Capability: Test Runner (스택-독립)

named 규칙이 없는 테스트 러너에 적용되는 generic 규칙.

## 핵심 규율

- 신규 로직/버그픽스는 **Red → Green → Refactor** (`superpowers:test-driven-development`).
- 테스트는 동작(behavior)을 검증한다 — 구현 세부가 아니라 관측 가능한 결과.
- 실패하는 테스트를 먼저 보고, 그 다음 최소 구현.

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| 신규 테스트 파일, 기능 구현 시작 | `superpowers:test-driven-development` |
| E2E/브라우저 자동화 | `anthropics/skills@webapp-testing` |
