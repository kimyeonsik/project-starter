# Stack: Resend (Transactional Email)

Import this file only in projects sending email via Resend.

## Domain Signals → Auto-Activate / Tool Use

| Signal | Auto-activated |
|---|---|
| `resend` import, `new Resend(...)`, `resend.emails.send` | Treat as transactional-email work |
| `@react-email/*`, `emails/` directory, email templates | Build templates with React Email components |
| "send a welcome/reset/receipt email", verification flow | Server-side send only (never from the client) |
| Email "not arriving", deliverability, SPF/DKIM | Check domain verification + Resend logs before code changes |

## Principles

- `RESEND_API_KEY` is a **secret** — server-side only, routed through `setup-secrets`. Never ship it to the client or call Resend from browser code.
- Send from a **verified domain** (SPF/DKIM/DMARC set), not the shared onboarding sender, for anything user-facing — otherwise it lands in spam.
- Author emails with React Email (`@react-email/components`) for consistent rendering across clients; preview before shipping.
- Sends are side effects: trigger from route handlers / server actions / queue workers, and make them idempotent where a retry could double-send.
- Don't block the user-facing request on email delivery when it isn't required for the response — fire it after the critical path.

## Documentation Lookup

For Resend / React Email API questions, use `claude.ai Context7` MCP first.
