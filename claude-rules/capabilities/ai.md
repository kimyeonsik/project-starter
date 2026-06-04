# Capability: AI / LLM (스택-독립)

named 규칙이 없는 LLM/AI SDK에 적용되는 generic 규칙. (Anthropic SDK는 `stacks/claude-api.md` named 규칙 우선)

## 핵심 규율

- API 키는 **서버사이드만**, 클라이언트 노출 금지 (`setup-secrets` 경유).
- **비용 인지**: 토큰/요청량 모니터링, 가능한 캐싱(프롬프트 캐시) 적용.
- 스트리밍·타임아웃·레이트리밋·재시도 처리.
- 출력 신뢰 경계: 사용자/모델 출력은 검증 후 사용.

## Signals → Auto-Activate

| Signal | 규율 |
|---|---|
| LLM 호출 코드, 프롬프트 작성 | 키 서버사이드·비용/캐싱 확인; Anthropic이면 `claude-api` |
