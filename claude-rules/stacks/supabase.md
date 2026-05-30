# Stack: Supabase (+ Postgres)

Import this file only in projects using Supabase as backend.

## Domain Signals → Auto-Activate

| Signal | Auto-activated skills |
|---|---|
| Supabase, `@supabase/*` imports, RLS, Auth, Edge Functions, Realtime, Storage | `supabase` |
| Postgres queries/schema/migrations, indexes, EXPLAIN | `supabase-postgres-best-practices` |

## MCP Integration

When Supabase MCP is connected:
- Before schema changes: `list_tables` to understand current structure
- Debugging: start with `get_logs` + `get_advisors`
- Client configuration: `get_project_url` + `get_publishable_keys`
