# Agent Teams Workflow

Multi-role work runs in Agent Teams mode.

## Pipeline

```
PO (spec) → Architect (design, plan_approval)
              ├→ Designer (UI/UX, only if UI exists)
              └→ Developer (implementation, isolation: worktree)
                    └→ QA ↔ Reviewer (parallel cross-review)
                          └→ merge
```

| Stage | Role | Output Location |
|---|---|---|
| PO | Requirements → AC | `_team/specs/` |
| Architect | Design doc + plan_approval gate | `_team/designs/` |
| Designer | Component tree, state (if UI) | `_team/designs/ui/` (.pen included) |
| Developer | Isolated impl in `isolation: worktree` | source code |
| QA | Functional verification (parallel) | `_team/reviews/` |
| Reviewer | Code quality review (parallel) | `_team/reviews/` |

## Review Gate

- Developer done → **both QA + Reviewer approval required**
- One-sided approval: merge blocked
- Rejection returns to Developer with feedback (max 3 cycles)
- Beyond 3 cycles: escalate to team lead

## File Ownership

- `in_progress` task files have exclusive write ownership
- Other members must not modify owned files
- Coordinate via `SendMessage` when needed
- `isolation: worktree` agents work in separate worktree → conflict check only at merge

## Task Dependencies

Use `TaskUpdate`'s `addBlockedBy` for explicit dependencies.

```
1. PO spec           blockedBy: []
2. Architect design  blockedBy: [1]
3. Designer UI       blockedBy: [2]
4. Developer impl    blockedBy: [2, 3]
5. QA review         blockedBy: [4]
6. Reviewer review   blockedBy: [4]
7. Merge             blockedBy: [5, 6]
```

## Communication

| Tool | Used for |
|---|---|
| `SendMessage` | Design/review requests, conflict resolution, urgent issues (broadcast `*` allowed) |
| `TaskUpdate` | Progress, blocking reasons, completion |

**Broadcast prohibited**: individual feedback, progress logs

## Workspace

```
<project>/
├── _team/
│   ├── specs/     # PO
│   ├── designs/   # Architect + Designer(ui/)
│   └── reviews/   # QA / Reviewer
└── .claude/agents/  # Project-specific custom agents (optional)
```

## Team Lead (Main Session) Guide

1. **Determine pipeline necessity**
   - Simple question/fix → process directly without pipeline
   - New feature / refactor / multi-component → activate Agent Teams
2. Spawn only needed members (not every role always required)
3. Set task dependencies, then let members run autonomously
4. Intervene only at key gates (approval, conflict resolution)
5. After completion: `TeamDelete`

## Cost Management

| Item | Guideline |
|---|---|
| Member count | Default 3-4, max 5 |
| Models | Sonnet primary, Opus only for Architect/QA |
| Termination | Auto on `maxTurns` exceed |
| Near Max 5-hour window | Save only `_team/specs` and stop |
