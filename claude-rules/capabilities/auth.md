# Capability: Auth (스택-독립)

named 규칙이 없는 인증/인가 라이브러리에 적용되는 generic 규칙.

## 핵심 규율 (보안 크리티컬)

- **자체 crypto/세션을 구현하지 않는다.** 검증된 라이브러리/서비스에 위임한다.
- 세션/토큰은 **httpOnly·Secure 쿠키**, 만료·갱신은 서버에서 검증.
- 인가(authorization)는 **항상 서버에서** 확인한다 — 클라이언트 판단 신뢰 금지.
- 권한 경계(소유자/역할/RLS)를 명시하고 기본은 deny.
- 시크릿(클라이언트 시크릿, JWT 서명키)은 `setup-secrets` 경유.

## Signals → Auto-Activate

| Signal | 규율 |
|---|---|
| 로그인/세션/토큰/권한 변경 | 서버 검증 경로 먼저 확인, 보안 영향 시 `security-review` |
