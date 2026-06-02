# MCP Server Setup

MCP servers extend Claude Code with direct access to external services. The bootstrap skill works without them but is much faster with them connected.

## Supabase MCP

Auto-creates projects, manages migrations, runs SQL, and reads logs from Claude.

Setup: https://supabase.com/docs/guides/getting-started/mcp

Required env: `SUPABASE_ACCESS_TOKEN` (Personal Access Token from dashboard).

When connected, the bootstrap skill (Step 7) can:
- List organizations and let you pick one
- Create the new Supabase project programmatically
- Inject URL + publishable key into `.env.local`
- Apply initial migrations

Without it: skill prints manual setup instructions and pauses for you to fill in `.env.local`.

## Vercel MCP

Manages deployments, domains, logs.

Setup: https://vercel.com/docs/mcp

When connected, project CLAUDE.md's `stacks/vercel.md` enables Claude to:
- Check deployment status before triggering new deploys
- Pull build/runtime logs for debugging
- Verify domain availability

## Context7 MCP

Fetches up-to-date library/framework documentation. Already triggered by `stacks/skill-activation.md`'s default rules.

Setup: https://context7.com/

## Sentry MCP

Reads production issues, stack traces, and performance data directly from Claude.

Setup: https://docs.sentry.io/product/sentry-mcp/

When connected, project CLAUDE.md's `stacks/sentry.md` enables Claude to:
- Pull the actual error (frequency, affected users, breadcrumbs) before debugging — not guess from code
- Cross-check Sentry issues against Vercel runtime logs for the full picture

Without it: paste the stack trace / issue manually.

## Amplitude MCP

Queries product analytics (events, funnels, retention) from Claude.

Setup: connect via Claude's MCP directory, then run `authenticate` → `complete_authentication` in a session (chart/query tools load only after auth).

When connected, project CLAUDE.md's `stacks/amplitude.md` enables Claude to:
- Answer real product-metric questions from data instead of fabricating numbers
- Suggest an event taxonomy grounded in what's already tracked

Without it: Claude helps define/instrument events but can't read live metrics.

## Configuring MCP Servers in Claude Code

Edit `~/.claude/settings.json` or use the IDE plugin's MCP settings.

Example excerpt:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": { "SUPABASE_ACCESS_TOKEN": "..." }
    }
  }
}
```

Restart Claude Code after changes.

## Verifying

In a Claude session:
```
> list my supabase projects
```

If MCP is connected, Claude calls `list_projects` directly. If not, it asks you to do it manually.
