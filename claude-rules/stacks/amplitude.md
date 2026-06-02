# Stack: Amplitude (Product Analytics)

Import this file only in projects using Amplitude. Installed by `new-project-bootstrap`.

## Domain Signals → Auto-Activate / Tool Use

| Signal | Auto-activated |
|---|---|
| `@amplitude/*` imports, `amplitude.track`, `init(API_KEY)` | Treat as analytics instrumentation work |
| "track this", "log an event", "funnel", "conversion", "retention" | Define event + properties first, then instrument |
| "what are users doing?", "how many signups?", "which feature is used?" | Amplitude MCP query first (don't fabricate numbers) |
| New user-facing feature added | Suggest the events worth tracking before shipping |

## Instrumentation Principles

- Agree on an **event taxonomy** before scattering `track()` calls: consistent `Noun Verb` event names (e.g. `Project Created`), snake/camel-consistent property keys. Ad-hoc events rot analytics fast.
- Track meaningful user intent, not every click. One good `Signup Completed` beats ten noisy DOM events.
- Amplitude API key is publishable (client-side). Any server-side secret key still goes through `setup-secrets`.
- For Next.js, init the browser SDK in a client boundary; never block render on the analytics call.

## MCP Usage Principles

- The Amplitude MCP requires `authenticate` → `complete_authentication` before chart/query tools load. If analytics tools aren't available, walk the user through connecting first.
- When asked about real product metrics, query Amplitude — never invent counts or rates.

## Documentation Lookup

For Amplitude SDK/config questions, use `claude.ai Context7` MCP first.
