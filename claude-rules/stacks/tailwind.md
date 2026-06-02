# Stack: Tailwind CSS + shadcn/ui (Styling / UI)

Import this file only in projects styling with Tailwind and/or shadcn/ui.

Design *quality* lives in the `frontend-design` skill (`stacks/nextjs.md` triggers it). This file covers the **styling system mechanics**.

## Domain Signals → Auto-Activate

| Signal | Auto-activated |
|---|---|
| `tailwind.config.*`, `@tailwind`/`@import "tailwindcss"`, utility classes in JSX | `frontend-design` |
| `components/ui/`, shadcn primitives, `npx shadcn add`, Radix imports | `frontend-design` |
| "style this", "make it look good", landing/dashboard/component UI | `frontend-design` + `vercel-react-best-practices` |

## Principles

- **Tailwind v4**: config is CSS-first via `@import "tailwindcss"` + `@theme`; there's no required `tailwind.config.js`. Check which major version the project is on before editing config — v3 and v4 setups differ.
- Design tokens belong in the theme (CSS vars / `@theme`), not as scattered magic values. Reuse semantic tokens (`bg-background`, `text-muted-foreground`) over raw colors.
- shadcn/ui components are **copied into the repo, not a dependency** — edit them directly in `components/ui/`. Don't reach for a wrapper lib to override what you can edit.
- Compose with `cn()` (clsx + tailwind-merge) so conditional + overriding classes merge correctly instead of fighting.
- Don't hand-roll an accessible primitive (dialog, dropdown, combobox) when shadcn/Radix already ships one — they handle focus trap, ARIA, keyboard nav.

## Quality Cross-Check

UI work → run `accessibility` (a11y audit) before calling it done: contrast, focus-visible, keyboard nav, semantic roles.

## Documentation Lookup

For Tailwind/shadcn API questions, use `claude.ai Context7` MCP first (config syntax shifts between major versions).
