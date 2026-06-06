# Architecture Decision Records (ADR)

Always-on. Record architecturally significant decisions so future work (and future agents) can see *why*, not just *what*.

## When to write an ADR

Write one when a decision is costly to reverse or shapes the codebase:
- Framework / language / package manager choice
- Datastore, auth, or hosting platform
- API style (REST / tRPC / GraphQL), major cross-cutting pattern
- Adding/removing a significant dependency
- A deliberate trade-off someone would otherwise question later

Do **not** ADR routine work (bug fixes, small refactors, dependency patch bumps).

## Format

- Location: `docs/adr/NNNN-kebab-title.md` (zero-padded sequential number).
- Sections: **Status** (Proposed / Accepted / Superseded) · **Context** · **Decision** · **Consequences**.
- Keep it short — one screen. The value is the reasoning, not length.

## Discipline

- **Sequential numbering, never renumber.** `0001`, `0002`, …
- Decisions are **immutable once Accepted**. To change one, write a new ADR that supersedes it and update the old one's Status to `Superseded by NNNN`.
- When a code change contradicts an existing ADR, stop and surface it — either the change is wrong, or a new ADR is needed. Don't silently diverge.
- `new-project-bootstrap` seeds `0001-initial-stack.md`; subsequent significant decisions append.
