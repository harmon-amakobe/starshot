---
name: plan-pr0
description: Use when Starshot research or a scout report needs turning into an implementation plan, when writing or grading per-PR specs, acceptance criteria, a disagreement register or a refuted list, or when a task mentions plan mode, planning a program, a multi-PR stack, or PR0.
---

# Planning a program, and stopping at PR0

## 1. Falsify the research first

Treat the report as a strong prior, not ground truth. Re-check its claims against the
tree (`file:line`) and primary sources (resolvable URLs; for physics, JPL documentation
and Horizons). Every contradiction gets a row in a **disagreement register** with an
explicit ruling. An owner decision outranks a general best practice, and the ruling says
so; a decision resting on a factual error is the one kind that gets reopened, by the
owner.

## 2. The turnkey bar

Hand any single PR spec to a stateless mid-tier agent with nothing else. If it would
have to decide scope, file location, naming or acceptance, the spec is not finished.
Check those four words per spec.

## 3. What the plan contains

| Section | Why |
|---|---|
| Summary and acceptance criteria, each with its proof command | a criterion with no command is an opinion at merge time |
| Disagreement register | evidence the research was tested |
| Stacked PR breakdown within the size cap (`.claude/README.md`) | reviewable merges |
| Per-PR specs: files, symbols, before/after sketches, edge cases, verification recipe | what the bar grades |
| Decision references (D#) | later sessions cite instead of reopen |
| Refuted list with the losing reason | nobody re-derives a dead end |
| Disposition table for anything deleted | nothing removed without a destination |
| Ops checklist: Pages, Actions on the fork, branch protection, Variables | non-code steps have no gate |
| Session protocol and the handoff template | the next session reads the plan |

Line numbers in specs are anchors; tell executors to re-locate by symbol. Physics specs
name the test that will prove the number (Horizons fixture, energy, known solution).

Plans live in `docs/plans/<program>/`; new binding decisions are appended to
`docs/decisions.md` with the owner's ruling.

## 4. The hard stop

On approval: commit the plan and decision entries as PR0, push, open that one PR, emit
one handoff block (`handoff-prompt`), and **stop**. Planning consumes the context the
build needs.

Interview the owner one question at a time, starting with the questions whose answers
change the architecture.
