---
name: verify-all
description: Use when a Starshot change needs its full verification sweep before review, handoff or merge, or when someone asks what else should be verified, covering the gates first and then one verifier per area the diff touched (physics, game in the browser, hygiene, harness).
---

# The verification chain

## Gates first, always

Run `verify-gates` (`npm run gates`). Nothing downstream is trustworthy on a red gate:
driving a build that does not compile observes the last build that did.

## Then dispatch on the diff

```bash
git diff --name-only <base>...HEAD     # three dots: compare against the merge base
```

| The diff touches | Also run |
|---|---|
| `packages/**`, `tools/horizons/**`, fixtures, `apps/game/src/sim/**` | `verify-physics`, then the `physics-auditor` agent for non-trivial changes |
| `apps/game/src/levels*` | `add-level` checklist and `verify-physics` |
| anything a player sees (`apps/**` UI, styles, assets) | `verify-game` through the `verification-driver` agent |
| `third_party/**` | `astlo-upstream` (and expect `third-party` to fail unless it is a sync) |
| `.claude/**`, `scripts/**`, `AGENTS.md`, `CLAUDE.md`, `.github/**` | the `rules-reviewer` agent; `hook-fixtures` must be green |
| release workflows, `scripts/release/**`, version proposals or changelog release policy | `release-ready`, including provenance and retry negative cases |
| anything about to be pushed | `public-hygiene` |

Rows add up; none substitutes for another. A diff touching the worker and the HUD owes
both physics and game verification.

## The chain reports; it does not decide

Each link returns its result and evidence; the orchestrator rules on the set. A red link
is fixed, not annotated as a known issue. This sweep is deliberately not a Stop hook: it
costs a build and a browser, so it runs at boundaries that matter (before review,
handoff, merge).
