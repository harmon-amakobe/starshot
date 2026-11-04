---
name: handoff-prompt
description: Use when a Starshot session is closing with work left in the plan, when the context budget is running low, or when a task mentions a handoff, session close, a copy-paste prompt for the next session, continuing in a fresh session, or starting and verifying a successor session (D40).
---

# The handoff block

Assemble it from facts that already exist; do not compose it from memory. You are at
the session's most degraded point, which is why you are handing off.

## Fields, in order, and where each comes from

| Field | Copy it from |
|---|---|
| Absolute repo path | `git rev-parse --show-toplevel`, run now |
| Stack tip branch and sha | `git fetch origin <branch>`, then `git rev-parse --short HEAD` and `git rev-parse --short origin/<branch>`, which must match (if they differ, push first or record a blocked handover); the open-gate line shows no unpushed commits |
| Base of the stack | the plan's stack section, checked against `gh pr list` |
| Plan path, decision log, deviation section | `docs/plans/<program>/...`, `docs/decisions.md`: paths, never pasted contents |
| "Decisions D1..Dn are resolved; do not re-litigate" | n read from `docs/decisions.md` |
| Done: PR0 and each finished group, one line each | the ledger's session handover section in V1 (`06-resumption.md`), else the plan's group table; either way checked against `gh pr list` |
| Next: one PR group (D30): its members and titles, each spec's path with heading anchor, each issue | the plan, headings copied exactly |
| Unpushed work, stashes, snapshot refs | the open-gate line (`sh scripts/agent/open-gate.sh`) |
| Routing | "would anything be lost with the cheaper tier?"; roster in `.claude/agents/` |
| Definition of Done | `npm run gates` plus the conditional verifiers |
| Context at close | the runtime's own telemetry, or unknown; any forced compaction (D40) |
| Opening move and stop condition | the audit commands; in the V1 cloud run, hand over from 776,000 to 792,000 tokens of measured context and never earlier on a projected cost, at a band close, or earlier when compaction or a hard limit would come first (D40); in any other session, at about 70% of the context after the current group's publish step (D30) |

## Template

```
Repo: <abs path>. Stack tip: <branch> @ <sha>. Base: <branch>.
Plan: <path>. Decisions: docs/decisions.md (D1..Dn resolved; do not re-litigate).
Deviations: <path#section>. Open-gate at close: <the line>.
Done: <PR0 ..., group PR2 ...>. Next: group PR<m> (<members>) <titles>.
Specs: <path#anchor>, ... Issues: #<a>, #<b>.
You are the orchestrator (top tier). Route by "would anything be lost with the cheaper
tier?". Up to two builders on independent parts (D42); one lite review per PR (D41): one adversary, plus
physics-auditor or rules-reviewer only when physics or the harness changes (a docs-only
checkpoint gets rules-reviewer alone); blockers and small own-code fixes land in the
PR, the rest go to
06-resumption.md#findings-for-the-master-review-d41. DoD: npm run gates (+ verify-physics,
verify-game, public-hygiene as the diff requires). Executors never push.
Context at close: <measured tokens, or unknown>; compaction: <none, or forced and disclosed>.
Context (V1 cloud run, D40): keep automatic and idle compaction off; never run
/compact; hand over earlier if compaction or a hard limit would come first, after each
published group when telemetry is unknown, and after any forced compaction. No
pull-request subscriptions; read each PR's checks yourself.
Stop: V1 cloud run from 776,000 to 792,000 tokens of measured context, at a band close,
or earlier as above, never on a projected cost: finish bounded stabilization, emit this
block again and start one verified successor (D40). Other sessions at about 70%: finish
the current group's publish step, then emit this block again (D30).
```

## Start the successor (D40)

Only the lead starts a successor; a builder near its limit reports to the lead instead.
Start exactly one, because two successors would both build on one stack, and building
is sequential (AGENTS.md). Measure occupancy with the runtime's own telemetry, not a
configured threshold. Bounded stabilization is as D40 defines it.

Update and push the ledger's session handover section, then create the successor with
the platform's supported session tool, from the final
published tip, with this block as its complete kickoff. Then confirm that it started,
received the kickoff and runs the requested model and mode; a returned id proves none
of that. Check for an existing successor before retrying an uncertain create. If
creation is refused or unavailable, give the owner the block and name the limit: that
is a blocked handover, not completion. Run the block through
`node scripts/check-secrets.mjs --stdin` while its Repo line still holds the
`<abs path>` placeholder, then fill in the path (`public-hygiene`).

## Check before sending

A sha read earlier is stale; a spec path without an anchor sends the next session into
a long file; two next groups lose the ordering you were carrying. Not a summary, not a
narrative: constraints and pointers only.
