# Stack: Cloudflare (Workers / Pages / D1 / R2 / KV / Hyperdrive)

Import this file only in projects deploying to or using Cloudflare services.

## Domain Signals → Auto-Activate / Tool Use

| Signal | Auto-activated |
|---|---|
| `wrangler.toml`, `wrangler.jsonc`, `wrangler.json` edits | Cloudflare MCP `workers_get_worker` / `workers_list` first |
| `@cloudflare/workers-types`, `cloudflare:workers` imports | Cloudflare Developer Platform MCP tools |
| D1 queries, `env.DB`, `c.env.DB` | `d1_database_query` / `d1_databases_list` |
| R2 storage, `env.<BUCKET>`, `r2.put`/`r2.get` | `r2_buckets_list` / `r2_bucket_get` |
| KV namespace, `env.<KV>`, `KVNamespace` type | `kv_namespaces_list` / `kv_namespace_get` |
| Hyperdrive (Postgres acceleration) | `hyperdrive_configs_list` / `hyperdrive_config_get` |
| Cloudflare Pages, `_routes.json`, `_headers`, `functions/` | Workers MCP tools (see `migrate_pages_to_workers_guide`) |

## MCP Usage Principles

- Before any deploy: `workers_list` to check existing workers (avoid name collisions)
- Multi-account users: run `set_active_account` first
- Schema/DB changes on D1: inspect existing tables before `d1_database_query` writes
- Production-impacting actions (worker delete, bucket delete, DB delete): require explicit user confirmation
- For Workers + Next.js, prefer `@opennextjs/cloudflare` over legacy `@cloudflare/next-on-pages`

## Documentation Lookup

For Cloudflare feature/API questions, use `search_cloudflare_documentation` first (faster than Context7).

## Migration Note

Cloudflare Pages is being migrated to Workers. For new projects, prefer Workers from the start.
