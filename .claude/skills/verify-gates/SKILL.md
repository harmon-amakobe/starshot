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
gate you did not run; say so. A `skip` is not a pass: without cargo the line reads
`gates: p/n passed, s skipped`, and `STARSHOT_REQUIRE_RUST=1` makes the four Rust gates
fail instead.

## What passing proves, and what it does not

| Gate | Proves | Does not prove |
|---|---|---|
| `secrets` | no credential, email, personal path or hashed private name in any file | that PR text is clean (pipe it through `--stdin`); commit text is the `commits` gate's |
| `third-party` | `third_party/astlo` matches its manifest byte for byte (D2) | that nothing was copied out of it into our code (review) |
| `licence` | every file has a `REUSE.toml` record, `LICENSE` is Apache-2.0, every `package.json` says so (D12) | that a `REUSE.toml` label matches the asset manifest, or that an in-file SPDX header agrees (it warns) |
| `dependency-licences` | every package in `package-lock.json` has an allowed SPDX licence or an exact exception with a reason (D28) | crates (that is `rust-licences`), or that a declared licence matches the package's files |
| `assets` | every file under `apps/game/public/` is in the asset manifest once with its hash, an open licence and no AI generation; every shipped observatory file is in its own manifest and verified (D14, D15) | that a recorded source or attribution is true |
| `credits` | the game assets section of `CREDITS.md` matches the asset manifest (D15) | the hand-written observatory sections |
| `copy` | no fail rule of `docs/copy-standard.md` in Markdown, UI strings, forms, work plans and, in CI, the PR's commits (D27) | that the prose is good: warnings pass |
| `commits` | no secret, personal email, personal path or hashed private name in the author, committer or message of any commit since the base (D24) | a sign-off: a missing one only warns, and the DCO app enforces it |
| `work` | the v1-starshot `work.yaml` and `work.lock.json` agree (D23) | that GitHub matches them: only `sync-work.mjs --apply` makes it so |
| `pr-size` | the size check's cap, exclusions, member count and thresholds; CI's job measures the pull request (D30) | a pull request's size: that is the CI job, not the gate |
| `size` | no file over 500 code lines off the baseline; the baseline only shrinks; `packages/` never imports `apps/`; nothing imports `python/` or `third_party/` (D28) | that a component is well split (its shape warnings pass), or that a count is honest: a line over 160 characters warns and passes |
| `versions` | workspace and lock parity; release calculation, proposal, provenance and archive negative fixtures | that a candidate was tested on the hosted beta |
| `instruction-dedup` | adapters share no 12-word run with `AGENTS.md` | that they do not paraphrase it |
| `agent-frontmatter` | agents and skills load; read-only roles hold no writing tool; index complete | that descriptions trigger well |
| `guard-scan-coverage` | every gate's inputs exist; every check is registered; hooks resolve; CI runs the registry | that the checks are correct |
| `hook-fixtures` | each hook denies its planted cases and allows the ordinary ones | coverage of commands nobody planted |
| `typecheck` | types agree across packages and the game | runtime behaviour |
| `test` | physics vs Horizons, integrator accuracy, levels' known solutions, game logic | anything without a test |
| `build` | the static site compiles | that it runs: drive it (`verify-game`) |
| `rust-fmt` | `cargo fmt --all --check`: the workspace is formatted | anything, when it reports `skip` because cargo is missing |
| `rust-clippy` | no lint; no `f64` or `f32` `sin`, `pow`, `mul_add` and the like in any crate (D16) | a call inside another crate's macro |
| `rust-test` | the Rust tests, every golden maths output bit for bit on this machine | arm64 bits: the `rust-arm64` CI job runs them |
| `rust-licences` | every crate in `cargo metadata` has an allowed licence or an exact exception (D28) | the workspace's own crates, which it skips |

## Adding a gate

A regression that slipped through review earns a small check script. All in one PR:

1. `scripts/check-<thing>.mjs`: node, no dependencies, exits non-zero with a message
   naming the fix, and fails when it scanned nothing.
2. One entry in `GATES` in `scripts/gates.mjs`; `fast: true` only if it is static and
   well under a second. A gate that starts cargo takes `group: "rust"` and
   `needsCargo: true`, never `fast`.
3. A `COVERAGE` row in `scripts/check-guard-scan-coverage.mjs` naming its inputs.
4. Break the invariant on a copy and watch the check fail before calling it done.

Never raise a threshold or exempt a file to get green; fix the code or, if the check is
wrong about the world, fix the check and say why in the PR.
