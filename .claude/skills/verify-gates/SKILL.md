---
name: verify-gates
description: Use when a Starshot change is believed finished, before opening or updating a pull request, or when a task mentions the Definition of Done, npm run gates, gates.mjs, typecheck, vitest, the build, a failing check, or adding a new gate or guard script.
---

# The gates, and what each one proves

## Run them

```bash
npm ci                   # once per clone; typecheck, test and build need node_modules
npm run gates            # everything CI runs; exit 0 is the bar
npm run gates:fast       # the Stop hook's static subset, not a shorter DoD
node scripts/gates.mjs --list                # ids, groups, why each exists
node scripts/gates.mjs --only test --verbose # one gate with full output while fixing
```

Report the final table and the `gates: n/n passed` line. A gate you did not run is a
gate you did not run; say so.

## What passing proves, and what it does not

| Gate | Proves | Does not prove |
|---|---|---|
| `secrets` | no credential, email, personal path or hashed private name in any file | that commit messages or PR text are clean (pipe them through `--stdin`) |
| `third-party` | `third_party/astlo` matches its manifest byte for byte (D2) | that nothing was copied out of it into our code (review) |
| `instruction-dedup` | adapters share no 12-word run with `AGENTS.md` | that they do not paraphrase it |
| `agent-frontmatter` | agents and skills load; read-only roles hold no writing tool; index complete | that descriptions trigger well |
| `guard-scan-coverage` | every gate's inputs exist; every check is registered; hooks resolve; CI runs the registry | that the checks are correct |
| `hook-fixtures` | each hook denies its planted cases and allows the ordinary ones | coverage of commands nobody planted |
| `typecheck` | types agree across packages and the game | runtime behaviour |
| `test` | physics vs Horizons, integrator accuracy, levels' known solutions, game logic | anything without a test |
| `build` | the static site compiles | that it runs: drive it (`verify-game`) |

## Adding a gate

A regression that slipped through review earns a small check script. All in one PR:

1. `scripts/check-<thing>.mjs`: node, no dependencies, exits non-zero with a message
   naming the fix, and fails when it scanned nothing.
2. One entry in `GATES` in `scripts/gates.mjs`; `fast: true` only if it is static and
   well under a second.
3. A `COVERAGE` row in `scripts/check-guard-scan-coverage.mjs` naming its inputs.
4. Break the invariant on a copy and watch the check fail before calling it done.

Never raise a threshold or exempt a file to get green; fix the code or, if the check is
wrong about the world, fix the check and say why in the PR.
