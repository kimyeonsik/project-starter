# Credential & Auth Strategy (Proposal)

**Status:** Accepted (design decided — implementation pending)
**Scope:** local dev + production + CI
**Supersedes:** the ad-hoc "everything goes in `.env.local`" behaviour of `setup-secrets`

---

## 1. Problem

Today every credential is funnelled into `.env.local` by `setup-secrets`, while a
few tools (GitHub `gh`) use their own native login. This is inconsistent and
conflates two genuinely different things:

- `SUPABASE_ACCESS_TOKEN` (a **CLI/MCP** token) ends up in `.env.local` **and**
  in MCP `settings.json` — duplicated, and living next to real app secrets.
- `VERCEL_TOKEN` / `CLOUDFLARE_API_TOKEN` are pasted into `.env.local` even
  though the **app** never uses them — only deploy tooling does.
- `gh` uses `gh auth login` (native), but the equivalent for Vercel/Supabase/
  Cloudflare (which all have native logins too) is done with long-lived tokens.

The root cause: we organise by **service** when the real axis is **who consumes
the credential and why**.

## 2. The organizing principle (one decision rule)

> **Does the deployed app need this value at runtime?**
>
> - **Yes →** it is an **app credential** → `.env.local` (local) + platform env / secret manager (prod). Never read by the agent (hard-blocked via deny rules).
> - **No (only a CLI / MCP server / deploy / the agent needs it) →** it is a **tooling credential** → **native login first** (`gh/supabase/vercel/wrangler login`); fall back to a token **only** where native login is impossible (MCP servers, CI), and store that token in the tool's own store / keychain / CI secret — **not** in the app's `.env`.

This single question determines both *where* a credential lives and *whether* it
should be a token or a native login.

## 3. Taxonomy

### 3.1 Categories (by sensitivity / consumer)

| Category | Examples | Consumer | Secret? |
|---|---|---|---|
| **Public app config** | `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`, `NEXT_PUBLIC_AMPLITUDE_API_KEY`, `NEXT_PUBLIC_SENTRY_DSN` | App (browser) | No (rate-limited) |
| **App secret** | `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` | App (server runtime) | Yes |
| **Build secret** | `SENTRY_AUTH_TOKEN` (+ `SENTRY_ORG`/`PROJECT`) | Build step (source-map upload) | Yes |
| **Tooling credential** | GitHub, Vercel deploy, Supabase CLI/MCP, Cloudflare wrangler | CLI / MCP / deploy / agent | Yes |

### 3.2 Auth method preference (for tooling credentials)

1. **Native login** (OAuth / device code) — `gh auth login`, `supabase login`,
   `vercel login`, `wrangler login`. Tokens are short-lived/refreshable, scoped,
   revocable from a dashboard, and never sit in a readable dotfile.
2. **Platform Git integration** — e.g. Vercel auto-deploys on `git push` with
   **zero** local token. Prefer this over the Vercel CLI+token where possible.
3. **Token** — only when 1 and 2 are impossible:
   - **MCP servers** can't do interactive login → need a token in `settings.json`.
   - **CI** is non-interactive → needs a secret (or OIDC, see §5).

### 3.3 Storage targets

| Target | Used for |
|---|---|
| `.env.local` (+ prod platform env) | public app config, app secrets, build secrets |
| Tool's own store (`~/.config/gh`, `supabase`, `wrangler`, `vercel`) | tooling creds via native login |
| OS keychain / secret manager | tokens that *must* exist (MCP, CI) — sourced at use time, not hardcoded |
| MCP `settings.json` `env` | the one token an MCP server needs (e.g. `SUPABASE_ACCESS_TOKEN`) |
| Platform secrets (Vercel/CF env, GitHub Actions secrets, OIDC) | prod + CI |

## 4. Per-service mapping (target state)

| Service | Credential | Category | Local | Production | CI |
|---|---|---|---|---|---|
| **GitHub** | repo/PR auth | tooling | `gh auth login` | — | `GITHUB_TOKEN` (auto) / OIDC |
| **Supabase** | URL + anon | public | `.env.local` | platform env | preview branch / secret |
| | service_role | app secret | `.env.local` | platform env / secret mgr | Actions secret (if needed) |
| | access token | tooling | `supabase login`; **token only for MCP** → keychain→`settings.json` | — | `SUPABASE_ACCESS_TOKEN` secret (migrations) |
| **Vercel** | deploy | tooling | `vercel login` **or** Git integration (no token) | (is the platform) | `VERCEL_TOKEN` secret, or Git integration |
| **Sentry** | DSN | public | `.env.local` | platform env | — |
| | auth token | build secret | `.env.local` (build reads it) or `sentry-cli login` | build env | `SENTRY_AUTH_TOKEN` secret |
| **Amplitude** | api key | public | `.env.local` | platform env | — |
| **Cloudflare** | wrangler/deploy | tooling | `wrangler login` | (platform) | `CLOUDFLARE_API_TOKEN` secret |
| | api token (if app calls CF at runtime) | app secret | `.env.local` | platform env | secret |
| **Anthropic** | api key | app secret | `.env.local` | platform env / secret mgr | mock in tests; secret if needed |

Key shift from today: **tooling credentials move out of `.env.local`** into
native logins (or keychain/MCP for the unavoidable-token cases).

## 5. Production & CI layer

- **Production app env:** set app/build secrets in the platform (Vercel `vercel env` / dashboard, Cloudflare `wrangler secret put`). `.env.local` is **local only** and git-ignored; it is never the prod source.
- **CI secrets:** GitHub Actions repository/environment secrets. Prefer **OIDC**
  where the provider supports it (Vercel, Cloudflare, AWS) so no long-lived token
  is stored at all. Use static tokens only as a fallback.
- **How `setup-secrets` helps (decided — checklist only):** it emits a
  per-environment **checklist + copy-paste commands that reference each value by
  KEY** — e.g. `vercel env add KEY production` (prompts for the value),
  `gh secret set KEY` (reads stdin). It **never embeds secret values in
  arguments** and **does not execute** the commands; the user runs them.
  Auto-injection is a future option (§10), not in scope.
- **Parity check:** a small "what each environment needs" matrix (the table in
  §4) should be derivable from the registry (§6) so local/prod/CI never drift
  (a `doctor` mode, §6).

## 6. Extensible design: a declarative credential registry

`setup-secrets` becomes **data-driven**. Each credential is one registry entry;
adding a stack = adding an entry, no control-flow changes. Routing (env vs
native-login vs MCP vs keychain) is derived from the entry.

```js
// credentials.registry.mjs  (illustrative shape)
export const CREDENTIALS = [
  {
    service: 'supabase',
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    category: 'app-secret',           // public | app-secret | build-secret | tooling
    validate: /^(eyJ|sbs_)/,
    provenance: 'https://supabase.com/dashboard/project/_/settings/api',
    local: { method: 'env' },         // env | native-login | mcp-settings | keychain
    prod:  { method: 'platform-env' },
    ci:    { method: 'actions-secret', optional: true },
  },
  {
    service: 'supabase',
    key: 'SUPABASE_ACCESS_TOKEN',
    category: 'tooling',
    local: { method: 'native-login', command: 'supabase login',
             fallback: { method: 'mcp-settings' } },   // MCP can't login interactively
    prod:  { method: 'n/a' },
    ci:    { method: 'actions-secret', name: 'SUPABASE_ACCESS_TOKEN' },
  },
  {
    service: 'vercel',
    key: null,                        // no app value — pure tooling
    category: 'tooling',
    local: { method: 'native-login', command: 'vercel login',
             note: 'or use Vercel Git integration (no token at all)' },
    ci:    { method: 'oidc', fallback: { method: 'actions-secret', name: 'VERCEL_TOKEN' } },
  },
  // ...gh, sentry, amplitude, cloudflare, anthropic
];
```

The `setup-secrets` engine then:
- **`category: env-bearing`** (public/app-secret/build-secret) → prompt (hidden) → write to `.env.local` (existing flow), validate, mask.
- **`method: native-login`** → **don't prompt for a token**; print/run the `command` and verify (`gh auth status`, `supabase projects list`, …).
- **`method: mcp-settings`** → write the token into `settings.json` `mcpServers.<x>.env` (sourced from keychain if available).
- **`prod`/`ci`** → emit a checklist + copy-paste commands referencing each value by KEY (e.g. `vercel env add KEY production`, `gh secret set KEY`); never embed values, never auto-run.

A `doctor` mode reads the registry and reports, per environment, what's present
vs missing (closing the local/prod/CI drift gap).

## 7. Migration from current state

1. Keep `.env.local` for public + app + build secrets (no change).
2. **Move tooling tokens out of `.env.local`:** stop writing `SUPABASE_ACCESS_TOKEN`/`VERCEL_TOKEN`/`CLOUDFLARE_*` there by default; route to native login (or MCP/keychain for the token-only cases).
3. Refactor `setup-secrets` service handlers → registry entries (behaviour-preserving for the env-bearing ones).
4. Add native-login guidance + verification per tooling service.
5. Add a prod/CI checklist generator + optional `doctor`.
6. Update `docs/mcp-setup.md` to source the MCP token from keychain, not `.env`.

## 8. Consequences

**Positive**
- One rule decides placement and method → consistency.
- Tooling tokens leave `.env.local` → smaller blast radius, fewer things the
  agent could leak, aligns with the deny-rule hardening already shipped.
- New stacks are a data entry, not a code change.
- Local/prod/CI derived from one source → no drift.

**Costs / risks**
- Native logins are interactive — slightly more setup steps the first time
  (but more secure and revocable).
- MCP + CI still require real tokens; we minimise but cannot eliminate them.
- Migration touches `setup-secrets` (registry refactor) — needs the existing
  verify harness extended.

## 9. Decisions

1. **Keychain — none required to start.** Native logins (each tool's own store) +
   MCP `settings.json` env + CI secrets cover virtually everything, so there is
   no general keychain dependency. We will **not** build an MCP for secrets (an
   anti-pattern — it would feed secret values straight into the model's context)
   and **not** a skill; credential I/O stays in a subprocess/library, never the
   agent context. A keychain adapter or secret-manager references may be added
   later (§10) only for token-only cases with nowhere good to live.
2. **Native login — guide + verify (hybrid).** `setup-secrets` does not run login
   flows by default; it prints the command and confirms with a **non-sensitive**
   status check (`gh auth status`, `supabase projects list`). When run in a
   human's interactive TTY it may offer to launch the login. The **agent never
   runs login flows.**
3. **CI — provider-neutral registry + GitHub Actions renderer first-class.**
   Registry entries declare CI needs abstractly (`needsSecret`, `oidc`); a GitHub
   Actions renderer turns them into concrete `gh secret set` / workflow guidance.
   Other CI providers = add a renderer later, registry unchanged.
4. **Production/CI injection — checklist + copy-paste commands only (no auto-run).**
   `setup-secrets` emits per-environment commands that reference each value by KEY
   (e.g. `vercel env add KEY production`, which prompts for the value), **never
   embedding secret values in arguments**, and does **not** execute them. The
   user runs them deliberately. (Auto-`--sync` is recorded in §10 but is out of
   scope.)

## 10. Deferred / future options

- **Opt-in `--sync-prod` / `--sync-ci`:** the Node engine reads `.env.local` and
  injects each KEY's value to the platform CLI via `spawn`'s **stdin** — never
  argv/logs/agent-context — user-confirmed. Hard requirement if ever built:
  *value via stdin, never argv; subprocess, never the agent.*
- **Secret-manager references** (`op://…` 1Password, or SOPS + age) so
  `.env.local` holds references instead of plaintext — removes local plaintext
  entirely. Registry gains a `ref:` field.
- **Keychain adapter** for token-only cases: macOS `security` / Windows
  Credential Manager / Linux `secret-tool`, with a `0600`-file fallback (and a
  clear warning) on headless Linux / WSL where no keyring daemon runs.
- **Additional CI renderers** (GitLab CI, CircleCI, …) on top of the neutral
  registry.
