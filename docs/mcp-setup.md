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
