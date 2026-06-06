# 보안 베이스라인

Always-on. 상시 보안 코딩 가드레일; 온디맨드 `security-review` 스킬이 심층 감사라면, 이건 일상의 최저선.

## 시크릿

- 시크릿을 코드, 커밋, 로그, 에러 메시지, AI 대화에 절대 넣지 않는다. `setup-secrets`로 주입(hidden 프롬프트 → `.env.local`, 소유자 전용).
- `.env*`는 커밋 전에 반드시 gitignore. 서버 전용 키(service_role, auth token, API secret)는 클라이언트 번들에 닿지 않는다 — Next.js에서 `NEXT_PUBLIC_` 없는 건 서버사이드 유지.
- 인스톨러의 `settings.json` deny 룰이 에이전트의 `.env*`/개인키 읽기를 차단한다 — 약화시키지 말 것.
- 노출 의심 시 즉시 로테이트.

## 입력 & 인가

- 외부 입력은 경계에서 검증·타입화(request body, params, webhook) — 예: zod. 클라이언트가 준 ID를 인가 근거로 신뢰하지 않는다.
- 모든 mutation은 서버에서 authz 강제; 숨긴 UI를 접근 제어로 삼지 않는다.
- Supabase: **RLS 기본 ON**; anon 키는 RLS 강제를 전제한다. service_role은 RLS 우회 — 서버 전용, 최소 사용.
- 쿼리는 파라미터화; SQL 문자열 연결 금지.

## 의존성 & 출력

- 알려진 critical 취약점 있는 의존성 금지; 유지보수되는 패키지 선호. 버전 핀/락(`pnpm-lock.yaml` 커밋).
- 출력은 escape/encode; `dangerouslySetInnerHTML` 대신 프레임워크의 XSS 보호에 의존.

## 언제 `security-review`로 에스컬레이트

인증 플로우, 데이터/PII 처리, 결제, 파일 업로드, 암호화, 신뢰 못 할 입력 파싱, 보안 민감 머지 직전. Stage 6 게이트가 보안 관련 변경 시 이미 강제한다.
