# Capability: Analytics (스택-독립)

named 규칙이 없는 분석 도구에 적용되는 generic 규칙.

## 핵심 규율

- 이벤트를 심기 전에 **이벤트 택소노미를 먼저 합의**한다 (이름/속성 규약).
- 실측 지표는 분석 도구의 실제 데이터로 — 숫자를 지어내지 않는다.
- 시크릿/API 키는 `setup-secrets` 경유.

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| 퍼널/리텐션/이벤트 추적 질문 | 이벤트 택소노미 먼저; 실측은 도구 MCP/대시보드 |
