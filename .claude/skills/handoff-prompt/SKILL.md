---
name: handoff-prompt
description: Use when a Starshot session is closing with work left in the plan, when the context budget is running low, or when a task mentions a handoff, session close, a copy-paste prompt for the next session, or continuing in a fresh session.
---

# The handoff block

Assemble it from facts that already exist; do not compose it from memory. You are at
the session's most degraded point, which is why you are handing off.

## Fields, in order, and where each comes from

| Field | Copy it from |
|---|---|
| Absolute repo path | `git rev-parse --show-toplevel`, run now |
| Stack tip branch and sha | `git branch --show-current`, `git rev-parse --short HEAD`, run now |
| Base of the stack | the plan's stack section, checked against `gh pr list` |
| Plan path, decision log, deviation section | `docs/plans/<program>/...`, `docs/decisions.md`: paths, never pasted contents |
| "Decisions D1..Dn are resolved; do not re-litigate" | n read from `docs/decisions.md` |
| Done: PR0..PRk, one line each | the plan's status column |
| Next: one PR, title, spec path with heading anchor | the plan, heading copied exactly |
| Unpushed work, stashes, snapshot refs | the open-gate line (`sh scripts/agent/open-gate.sh`) |
| Routing | "would anything be lost with the cheaper tier?"; roster in `.claude/agents/` |
| Definition of Done | `npm run gates` plus the conditional verifiers |
| Opening move and stop condition | the audit commands; stop when the budget runs low, then hand off in this format |

## Template

```
Repo: <abs path>. Stack tip: <branch> @ <sha>. Base: <branch>.
Plan: <path>. Decisions: docs/decisions.md (D1..Dn resolved; do not re-litigate).
Deviations: <path#section>. Open-gate at close: <the line>.
Done: <PR0 ..., PR1 ...>. Next: PR<k+1> <title>. Spec: <path#anchor>.
You are the orchestrator (top tier). Route by "would anything be lost with the cheaper
tier?". One builder at a time; adversary per PR against .claude/rubrics/; physics-auditor
for packages; verification-driver for the game. DoD: npm run gates (+ verify-physics,
verify-game, public-hygiene as the diff requires). Executors never push.
Stop when the budget runs low: close, then emit this block again.
```

## Check before sending

A sha read earlier is stale; a spec path without an anchor sends the next session into
a long file; two "next" items lose the ordering you were carrying. Not a summary, not a
narrative: constraints and pointers only.
