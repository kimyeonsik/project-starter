# Stack: Sentry (Error Monitoring / Observability)

Import this file only in projects using Sentry. Installed by `new-project-bootstrap`.

## Domain Signals → Auto-Activate / Tool Use

| Signal | Auto-activated |
|---|---|
| `@sentry/*` imports, `Sentry.init`, `sentry.*.config.*`, `instrumentation.ts` | Treat as error-monitoring work |
| Production error, unhandled exception, "what's breaking in prod?" | Sentry MCP `get_issues` / issue lookup first (don't guess from code alone) |
| Stack trace from a deployed build, source-map question | Verify release + source maps are uploaded before debugging |
| Performance/tracing, slow transaction, Web Vitals regression | Check Sentry performance data before optimizing blindly |

## MCP Usage Principles

- When Sentry MCP is connected, start prod debugging from the **actual issue** (frequency, affected users, breadcrumbs) — not from a hypothesis.
- Cross-check with `stacks/vercel.md` `get_runtime_logs`: Sentry gives the grouped issue + stack trace, Vercel gives the raw request log. Use both.
- Resolving/ignoring issues or changing alert rules is a production action → require explicit user confirmation.

## Next.js Integration Notes

- Use `@sentry/nextjs` with `instrumentation.ts` (+ `instrumentation-client.ts`) — the legacy `sentry.client/server.config.ts` split is deprecated.
- `DSN` is publishable (client-safe). `SENTRY_AUTH_TOKEN` is a **secret** (source-map upload only) — never inline it; it goes through `setup-secrets`.
- Confirm source maps upload in CI/build, otherwise prod stack traces are minified and useless.

## Documentation Lookup

For Sentry SDK/config questions, use `claude.ai Context7` MCP (`@sentry/nextjs`) first.
