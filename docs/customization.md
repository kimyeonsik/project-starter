# Customization

## Editing Rules

The intended workflow:

1. Edit files in this repo (`claude-rules/<lang>/*.md` or `claude-rules/stacks/*.md`)
2. Re-run `bash scripts/install.sh`
3. Installer backs up the previous version and copies the new one

This keeps your customizations versioned in git.

## Stack Additions

To add a new stack (e.g., `prisma`):

1. Create `claude-rules/stacks/prisma.md` following the existing pattern (signal → skill table)
2. Re-run installer
3. In project CLAUDE.md: `@~/.claude/rules/stacks/prisma.md`

## Changing Bootstrap Defaults

Edit `skills/new-project-bootstrap/SKILL.md`. Common adjustments:

- **Different package manager**: replace `pnpm` with `bun` or `npm` (also update the install command)
- **Different analytics**: replace Amplitude step with PostHog/GA4
- **Different crash tool**: replace Sentry with Highlight.io/Datadog
- **Different auth**: replace Supabase Auth with Clerk/Auth.js

Keep the verification step (Step 11) intact — it's the safety net.

## Language Override

The installer asks once; to switch later:

```bash
LANG_CHOICE=ko bash scripts/install.sh
# or
LANG_CHOICE=en bash scripts/install.sh
```

## Skipping Auto-Activation Per Session

Tell Claude at session start:
```
> Don't use skills automatically this session.
```

The `skill-activation.md` rules respect this explicit block.

## Per-Project Overrides

Project `CLAUDE.md` overrides global rules. To disable a specific auto-activation just for one project:

```markdown
# project rules

## Skill Overrides

- Do not auto-activate `vercel-react-best-practices` (this project uses Remix, not Next.js)
```

Claude follows the project file because it loads after global per Claude Code's precedence.
