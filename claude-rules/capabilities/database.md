# Capability: Database / ORM (스택-독립)

named 규칙이 없는 DB/ORM에 적용되는 generic 규칙.

## 핵심 규율

- **스키마 우선.** 스키마/모델 정의를 변경하고 마이그레이션을 생성한다 — 운영 DB에 손으로 SQL 치지 않는다.
- 마이그레이션은 forward-only, 되돌릴 땐 새 마이그레이션.
- 스키마 변경 후 타입/클라이언트 생성기를 재실행한다.
- 파괴적 변경(drop/rename)은 데이터 마이그레이션 경로를 먼저 확인.

## Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| 쿼리/스키마 최적화 | `supabase-postgres-best-practices` (Postgres 계열인 경우) |
