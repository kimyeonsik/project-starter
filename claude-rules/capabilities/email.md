# Capability: Email (스택-독립)

named 규칙이 없는 이메일 전송 도구에 적용되는 generic 규칙.

## 핵심 규율

- **서버사이드 전송만.** API 키를 클라이언트에 노출하지 않는다 (`setup-secrets` 경유).
- 발신 도메인 인증(SPF/DKIM/DMARC) 확인.
- 바운스/스팸/수신거부 처리 경로 확보.

## Signals → Auto-Activate

| Signal | 규율 |
|---|---|
| 이메일 전송 코드 추가 | 서버사이드 전송, 시크릿은 `setup-secrets` |
