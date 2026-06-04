# Capability: Hosting / Deploy (스택-독립)

named 규칙이 없는 호스팅/배포 플랫폼에 적용되는 generic 규칙.

## 핵심 규율

- 시크릿/환경변수는 **플랫폼 시크릿 매니저**에 — repo 커밋 금지.
- preview/staging/prod 환경을 분리하고 환경별 변수 매트릭스를 문서화.
- 빌드/배포 설정은 코드로 관리(IaC), 콘솔 수동 변경 최소화.

## Signals → Auto-Activate

| Signal | 규율 |
|---|---|
| 배포/환경변수/빌드 설정 변경 | 환경 분리·시크릿 위치 확인 |
