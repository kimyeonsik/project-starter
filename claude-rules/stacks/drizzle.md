# Stack: Drizzle ORM

Import this file only in projects using Drizzle ORM.

## Domain Signals → Auto-Activate

| Signal (keyword / import / file) | Auto-activated / 규율 |
|---|---|
| `drizzle-orm`, `drizzle.config.*`, `schema.ts` | 스키마 우선 + 마이그레이션 규율 |
| 스키마 변경 | `drizzle-kit generate` 재실행 후 마이그레이션 검토 |
| 쿼리 작성 | 타입 추론 활용, raw SQL은 최후수단 |

## 규율

- 스키마(`schema.ts`)가 SSOT. 변경 → `drizzle-kit generate`로 마이그레이션 산출 → 검토 후 적용.
- 운영 DB에 수동 DDL 금지. 모든 변경은 마이그레이션 파일로.
- forward-only 마이그레이션. 되돌릴 땐 새 마이그레이션.
