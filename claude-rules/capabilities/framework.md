# Capability: Framework (스택-독립)

named 규칙이 없는 프레임워크에 적용되는 generic 규칙.

## 핵심 규율

- **설치된 버전의 자체 문서를 먼저 읽어라.** 학습 데이터의 API가 아니라 repo에 설치된 실제 버전을 신뢰한다 (`node_modules/<pkg>/`의 docs/README, 또는 공식 문서를 Context7 MCP로 조회).
- 라우팅/렌더링/빌드 관습은 프레임워크 고유다 — 추측 금지, 확인 후 작성.
- 기능 추가는 `superpowers:test-driven-development`로 시작.

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| 라이브러리/SDK/CLI 문서 질문 | `claude.ai Context7` MCP 우선 |
| 신규 기능 구현 시작 | `superpowers:test-driven-development` |
