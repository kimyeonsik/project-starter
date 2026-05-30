# Stack: Vercel (Deployment / Operations)

Import this file only in projects deploying/operating on Vercel.

Performance optimization (`vercel-react-best-practices`) is already included in `stacks/nextjs.md`. This file covers **deployment / operations / observability**.

## Domain Signals → Auto-Activate / Tool Use

| Signal | Auto-activated |
|---|---|
| "Vercel deploy", "production deploy", "preview URL" mentioned | Vercel MCP `deploy_to_vercel` / `list_deployments` first |
| `vercel.json`, `.vercel/` file edits | Check current state with Vercel MCP `get_project` first |
| Deploy failure, build error, "why isn't it up?" | `get_deployment_build_logs` → root cause |
| Runtime errors, 500/404 debugging | Check logs with `get_runtime_logs` first |
| Domain setup, custom domain | `check_domain_availability_and_price` |
| Vercel Toolbar comments / feedback | `list_toolbar_threads` → `reply_to_toolbar_thread` |

## MCP Usage Principles

- Before deployment: `list_deployments` to check recent state (avoid duplicate deploys)
- Production-impacting actions (deploy, domain change, env var modify): require explicit user confirmation
- `web_fetch_vercel_url` to verify deployment URLs directly

## Documentation Lookup

For Vercel feature/API questions, use `search_vercel_documentation` first (faster than Context7).
