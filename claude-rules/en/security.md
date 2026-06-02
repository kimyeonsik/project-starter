# Security Baseline

Always-on. Continuous secure-coding guardrails; the on-demand `security-review` skill is the deep audit, this is the day-to-day floor.

## Secrets

- Never put secrets in code, commits, logs, error messages, or the AI conversation. Inject via `setup-secrets` (hidden prompt → `.env.local`, owner-only).
- `.env*` must be gitignored before any commit. Server-only keys (service_role, auth tokens, API secrets) never reach client bundles — in Next.js, anything without `NEXT_PUBLIC_` stays server-side.
- The installer's `settings.json` deny rules block agent reads of `.env*` / private keys — do not weaken them.
- Rotate immediately on suspected exposure.

## Input & Authorization

- Validate and type external input at the boundary (request bodies, params, webhooks) — e.g. zod. Never trust client-supplied IDs for authorization.
- Enforce authz on the server for every mutation; never rely on hidden UI as access control.
- Supabase: **RLS on by default**; the anon key assumes RLS is enforced. service_role bypasses RLS — server-only, sparingly.
- Parameterize queries; never string-concatenate SQL.

## Dependencies & Output

- No dependencies with known criticals; prefer maintained packages. Pin/lock versions (`pnpm-lock.yaml` committed).
- Escape/encode output; rely on the framework's XSS protections rather than `dangerouslySetInnerHTML`.

## When to escalate to `security-review`

Auth flows, data handling/PII, payment, file upload, crypto, anything parsing untrusted input, or before a security-sensitive merge. The Stage 6 gate already forces it when changes are security-relevant.
