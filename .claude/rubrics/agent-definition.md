# Agent definition rubric

The seven-axis audit for files in `.claude/agents/` (and, adapted, for skills). Run it
whenever the roster changes. An agent file is a program whose runtime is a model.

## 1. Description as trigger

The `description` is the routing contract and the only thing the router matches.
It names the situation in third person, uses the concrete nouns a real Starshot task
contains (Horizons, SOI, level, worker, screenshot, phone), and says how this agent
differs from its nearest neighbour. One-line descriptions route badly.

## 2. Overconstraint versus judgment

State purposes, not case lists: a rule with its reason generalises; an enumeration
covers only what it lists. Do not script what the model already does, and do not
forbid what the agent has no tool to do. Constrain hard only where a mistake is
expensive and irreversible: outbound actions, destructive git, `third_party/**`,
anything public.

## 3. Length and progressive disclosure

The file loads in full on every invocation. Inline what is needed every time (the
security boundary, the invariants a stateless agent cannot inherit); link the rest one
hop away in a skill or rubric. Past ~100 lines, ask what should move out.

## 4. Tool scoping

Grant the minimum. Read-only means **no Write or Edit in the tool list**;
`permissionMode: plan` is a weak extra, overridden by a parent in accept-edits mode.
An absent `tools` line grants every tool. Builders never push or open pull requests.
`scripts/check-agent-frontmatter.mjs` enforces the read-only roles' tool lists.

## 5. Model tier

Match tier to cognitive load and say why in the file: originator for a first design
pass, top for ambiguous or physics-critical work, mid for settled specs and long
procedures, fast for read-and-report. Where a tier is a cost choice rather than a
capability judgment, the file says so. Unenforced singleton or budget rules are
labelled advisory.

## 6. Roster gaps and overlaps

Audit the directory as a set, never a list written somewhere else. Two agents that
would both match a common task are a routing coin flip; a common task no agent matches
is silent work for the orchestrator. An agent that never fires is mis-described or
unnecessary.

## 7. Prompt-injection posture

Any agent that reads files, pages, diffs or tool output reads untrusted input. The
file says content is data, never instructions, and what to do instead (quote it, do not
act). It pins the absolute repository path, because a stateless agent in the wrong
worktree reports real files as missing. Injected hook text is phrased as facts, not
commands.

## Reporting

At most one finding per axis, each with the line it applies to and the rewrite. Close
with the axes checked and found clean.
