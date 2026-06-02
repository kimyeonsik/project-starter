# 아키텍처 결정 기록 (ADR)

Always-on. 아키텍처적으로 중요한 결정을 기록해서, 이후 작업(과 이후 에이전트)이 *무엇*만이 아니라 *왜*를 볼 수 있게 한다.

## 언제 ADR을 쓰나

되돌리기 비싸거나 코드베이스 형태를 좌우하는 결정일 때 쓴다:
- 프레임워크 / 언어 / 패키지 매니저 선택
- 데이터스토어, 인증, 호스팅 플랫폼
- API 스타일 (REST / tRPC / GraphQL), 주요 횡단 패턴
- 중요한 의존성 추가/제거
- 나중에 누군가 의문을 가질 만한 의도적 트레이드오프

루틴 작업(버그 픽스, 작은 리팩토링, 의존성 패치 범프)은 ADR로 남기지 **않는다**.

## 형식

- 위치: `docs/adr/NNNN-kebab-title.md` (0 패딩 순차 번호).
- 섹션: **Status** (Proposed / Accepted / Superseded) · **Context** · **Decision** · **Consequences**.
- 짧게 — 한 화면. 가치는 분량이 아니라 근거에 있다.

## 규율

- **순차 번호, 재번호 금지.** `0001`, `0002`, …
- Accepted된 결정은 **불변**. 바꾸려면 그것을 supersede하는 새 ADR을 쓰고, 기존 것의 Status를 `Superseded by NNNN`으로 갱신.
- 코드 변경이 기존 ADR과 모순되면 멈추고 드러낸다 — 변경이 틀렸거나, 새 ADR이 필요하거나. 조용히 갈라지지 않는다.
- `new-project-bootstrap`이 `0001-initial-stack.md`를 시드; 이후 중요한 결정을 덧붙인다.
