# V1 program resumption

This is the acceptance ledger for the new program PR0. Read it with
[the plan](00-plan.md), whose stable spec identities remain unchanged.
The owner authorized PR0 publication and continued implementation on 2026-11-03.
PR0 is a checkpoint, not the full-program deliverable. D30 still governs reviews;
D40 governs when a cloud session hands over.

## Verified starting point

- Base: `main` at `7f325a61b77a43c98d95a7644d7d03834829b1a1`, refreshed from origin.
  [PR16](https://github.com/harmon-amakobe/starshot/pull/16) merged the accepted gameplay.
  [PR17](https://github.com/harmon-amakobe/starshot/pull/17) prepared 0.2.0 inside that branch.
  Preparing a version does not establish its production deployment.
- New PR0 and program trunk: `codex/v1-program-pr0`. It is the only PR targeting `main`.
  Each implementation group targets the preceding branch in the plan's group table.
  The owner reviews PR0 before its merge. Implementation may continue above it.
- The prior bootstrap [PR1](https://github.com/harmon-amakobe/starshot/pull/1) is historical.
  Its `v1-pr0-plan` identity stays closed; `v1-program-pr0` tracks this new reconciliation.
- Saved cleanup source: `611a9d81cbfecfbdfa5549d4962e472e492eed5a`, on
  `starshot/v1-pr02-screen-split`. Its four unique commits remain preserved.
  The common ancestor is `7b5dfb46e13b13add177a0f7162fdf89725530db`.
  Adapt its extractions by symbol. Do not replace current campaign files with old copies.
- The opening audit found a clean checkout, two worktrees, no stashes or snapshot refs,
  and no open PRs. The other checkout remains on the old bootstrap branch.
- The opening work check found 56 valid entries but no lock. This proved schema validity,
  not GitHub issue parity. The new map restores the three saved specs and adds this PR0.

## Global acceptance ledger

Statuses describe the base above, before new implementation. A source citation establishes
what exists; only a recorded command and exit code establish verification.
Historical evidence in PR16 is retained but must be repeated where later changes affect it.

| Criterion | Base disposition and remaining proof |
|---|---|
| AC1 | Existing npm gates remain required. Rust-required gates start at PR6; no Rust workspace exists yet. |
| AC2 | Pending PR6. Run locked fmt, clippy and workspace tests. |
| AC3 | TypeScript Horizons fixtures exist in `packages/ephemeris/test/ephemeris.test.ts`. Rust comparisons remain PR9/10. |
| AC4 | Pending DE440 pack, 1950 to 2150, five-day validation, 150 km budget for every body including the geocentric Moon. Tighter lunar probes and D38 conformance remain additional requirements. |
| AC5 | Pending Rust dense Table 1 test over 1950 to 2050. |
| AC6 | Pending native x86_64/arm64, V8 and JavaScriptCore golden bit comparisons. Lunar captured states join the corpus. |
| AC7 | Existing TypeScript energy/timing tests remain the oracle. Rust closure, switching and preview timing remain PR11/12. |
| AC8 | Current known solutions are in `apps/game/src/levels.test.ts`. Rust catalogue, deterministic search and later content remain pending. |
| AC9 | Pending measured wasm, JavaScript and texture gates. Existing Three.js does not establish any size budget. |
| AC10 | PR16 supplies browser and offline evidence for the current game. Repeat where changes affect it; full chapter proof remains pending. Human trials and physical-phone timing are optional under D39. |
| AC11 | Existing copy gate remains required at every publication. No new copy exemptions. |
| AC12 | File licensing exists. Dependency licence gate, assets manifest and generated credits remain PR5; inspect current credits before replacing them. |
| AC13 | Existing file scan remains required. Scan commit and PR text separately until PR4 adds its gate. |
| AC14 | Pending PR17. Keep TypeScript until both apps and the game worker pass measured conformance. |
| AC15 | Pending backend source and emulator Rules tests in PR30/31. No cloud administration is implied. |
| AC16 | Pending replay-verifying function and exact wasm digest proof in PR32. |
| AC17 | Pages is superseded by D34. Verify Firebase production and beta metadata and immutable asset headers; preserve exact-artifact promotion. |
| AC18 | Restore and sync the real issue map and lock in this PR0. `--check` alone is offline and does not prove live parity. |
| AC19 | Preserve existing workflow lint. PR1's original Pages and skipped-job sketches are historical; current CI and deviations 12/19 govern. |

## Every implementation spec

These rows retain all 42 implementation identities. A partial row is not closed by PR0.
Each listed group's spec still supplies its detailed acceptance commands.

| Specs | Disposition |
|---|---|
| PR2, PR3 | Saved refactor unmerged. [07-screen-split.md](07-screen-split.md) supplies current files, symbols and proof. Preserve accepted D38 state ownership and delete only proven dead callers. |
| PR3a | Shared lunar flight exists. Complete the specific physics and search gaps below. |
| PR3b | Moon-first campaign and v2 migration exist. Complete browser coverage and short-phone refinements below. |
| PR3c | Separate maintenance group. Recount compressed CSS, split without changing cascade, compare computed styles and screenshots. |
| PR4 | PR size, commit and work gates remain. Preserve current release tools and CI protections. |
| PR5 | Manifest, dependency licence checking and generated credits remain. Existing media notices are input evidence. |
| PR6 | Rust workspace, software maths, deterministic build flags and mandatory Rust gates remain. |
| PR7, PR8 | Ephemeris tooling, Horizons refresh and validated DE440 pack remain. Interim Moon rail is retained until replacement passes. |
| PR9, PR10 | Rust Table 1, time scales and rail reader remain, including dense comparisons. |
| PR11, PR12 | Rust integrator, Lambert and simulation remain. Include lunar success/miss/impact and captured departure states. |
| PR13, PR14 | Rust requests, replay format, level catalogue, scoring and hints remain, including the lunar variant. |
| PR15 | Wasm package, byte-level conformance and bundle measurement remain. |
| PR16, PR17 | Worker cutover and TypeScript retirement remain. Update active campaign imports, both apps and offline data caching. |
| PR18, PR19 | DE440 flight source, craft mass and impulse fuel economy remain. |
| PR20, PR21 | SOI rewards, periapsis capture and multi-channel lock cues remain. Current lunar entry is not capture. |
| PR22, PR23, PR24 | Time map, window search and full economy/saves remain. Preserve D38 date/phase controls and v2 pilots. |
| PR25 | WebGL and Canvas already exist in `campaign/scene.ts` and `campaign/three-scene.ts`. Audit remaining imperative renderer and performance criteria before building. |
| PR26, PR27 | Existing textures/sky need asset and tier audit. Required budgets, catalogue provenance and load behavior remain unproven. |
| PR28, PR29 | Current settings are in `campaign/session.ts` and `profiles.ts`. Audio/haptics and complete persistent settings remain; preserve release action. |
| PR30, PR31 | Hosting foundation exists. Auth, Rules, accounts and leaderboard source/emulator work remain; cloud activation needs separate review. |
| PR32, PR33 | Replay verification remains. Hosting work is reconciliation of D34 to D37, not domain or trust recreation. |
| PR34, PR35, PR36 | Later Earth lessons, lunar capture, inner/outer planets and Sun content remain. Moonshot is already mission one. |
| PR37, PR38, PR39 | Credits need full asset audit. CI release proposals and exact promotion exist; extend them for new workspaces. Store preparation remains. |
| PR40 | Upstream kit remains. Only the owner contacts Mark or submits the prepared upstream topics. |

Bands C to F remain outlines. Before assigning builders, write file/symbol ownership,
edge cases, migration/error behavior and exact commands for each spec. Confirm dependencies
and grouping then. An `agent-ready` label must reflect that bar, not the old band title.

## Lunar acceptance ledger

The post-cleanup [delivery supplement](08-moon-flight.md) turns the remaining work
into eleven declared parts under #33. The rows below retain the PR0 baseline evidence;
part publication records new proof without claiming that all lunar work is complete.

The original PR3a/b specifications are restored in the plan for traceability. This ledger
and D38 govern their current work. Existing behavior is preserved rather than rebuilt.
Paths beginning `campaign/` or `sim/` below are under `apps/game/src/`; code references
identify the verified starting commit and must be re-located after the split.

| Criterion | Existing implementation and remaining proof |
|---|---|
| Shared rail and engine | `packages/ephemeris/data/moon-rail.json` and `packages/physics/src/lunar/` own the data/physics. Both apps consume the same rail blob. Preserve provenance and reject out-of-range dates. |
| Plane and time | D38 refines plane-at-launch to the fixed 2026-11-02 01:00 UTC basis (`packages/physics/src/lunar/model.ts:13,43`). `packages/physics/test/lunar.test.ts` tests date edits holding both relative position and velocity; its independent probes retain position below 0.1 km and velocity below 1.1e-5 km/s at lines 14-18. |
| Departure and forces | Circular 200 km parking is an initial-condition approximation. Released flight uses Sun, Earth and Moon. Preserve the study's Earth GM digits independently of planetary constants. |
| Requests | Explicit lunar/planetary variants, frozen settings and canonical keys exist in `sim/flight-request.ts:7`, `sim/lunar.ts`, `sim/preview.ts` and `campaign/contracts.ts:8-13`. Preserve the captured/planned request through scene, preview, hint, launch and replay. Request deep-freezing is unproved; no request-mutation bug was established. Test the ownership contract before choosing a change. |
| Initial bundle | `sim/sim.worker.ts:19,26` dynamically imports lunar simulation, but `campaign/contracts.ts:5` and scene modules import `sim/lunar.ts` statically, which imports the rail at line 2. Measure emitted chunks and planetary first-load requests before claiming the rail is deferred; add a bundle/load regression if acceptance requires a change. |
| SOI entry | Current analysis terminates at real Moon SOI entry. Add a regression that proves a grazing real-SOI crossing between two outside accepted knots. The prototype's 65,000 km study case is insufficient by itself. |
| Guide and par | `sim/lunar.ts:34-36` re-flies one curated guide. The 3.240 km/s value is a labelled reference par (`apps/game/src/missions.ts:18`), not an optimum. |
| Search | The saved day/burn/angle search and 240-simulation budget are not delivered. PR3a must implement and measure a deterministic bounded search, record grid/precision and retain the reference guide. Do not change reference par without evidence. |
| Moon drawing | The primary lunar path shares the rail. The focused satellite overlay in `campaign/three-scene.ts:124` omits the parent's z coordinate when combining positions. PR3a must fix that frame mismatch and add a regression for both primary and focused Moon coordinates against physics, within 1 km at launch-window dates. Sharing a source does not establish this proof. |
| Mission order | `moonshot`, `first-light`, `morning-star`, `big-game`, `grand-tour` remain stable (`apps/game/src/missions.ts:19-20`). Keep explicit order and next-mission lookup. |
| Saves | `campaign/profiles.ts:18-57` preserves valid pilots, stars, sessions and access in v2; legacy/v1 storage stays untouched. Keep per-pilot invalid-data notices and playtest scoring separation. |
| Interaction | Preserve Plan and launch default, YOLO compatibility, pause/resume, cancellation, stale-response guards, and post-pull date/phase/aim edits before Launch. |
| Browser proof | Repeat hit/miss/Earth impact, retry/replay/next, pilot switch during pending work, all mission scenes, both renderers and root/subpath. Cover phone portrait, short landscape, desktop and reduced motion. |
| Short phone | At 390x664, expanded Fine aim plus System crowds the map, Hangar and arrival labels. PR3b owns a layout fix with at least 160 px pull space and 44 px labelled targets. |

Use `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts`, both
app builds, and criterion-specific `scripts/verify-game.mjs --steps <probe>` runs.
Store private browser artifacts outside the repository. Record portable commands and
results in PR bodies; do not publish private artifact paths.

## Rust and later proof boundaries

PR6 introduces locked builds, fmt/clippy and `STARSHOT_REQUIRE_RUST=1` gates. No unsafe
logic, fast-math, fused operations, CPU-specific arithmetic, relaxed SIMD or threads may
break deterministic results. Transcendentals use `starshot-math`; preserve operation order.
Native x86_64/arm64, V8 and JavaScriptCore/Bun must agree before TypeScript retirement.

PR11 to PR15 add lunar golden cases for fixed `frameEt`, changed `epochEt`, unchanged
relative position/velocity, explicit departure vectors, sub-day launch, hit, miss and
Earth impact. The 150 km planetary rail budget does not relax the interim Moon probes.
Keep their position and velocity assertions and fixed-frame behavior through replacement.

Before each Band B builder, update its historical TypeScript-only request examples and
file mappings with these lunar cases and the current campaign owners. PR9/10 preserve
the fixed 2026-11-02 01:00 UTC basis and Earth/Moon derivation; PR11/12 port the lunar
departure and Sun/Earth/Moon force model; PR13/14 include typed lunar requests, scoring,
the measured guide and bounded search. PR15 compares captured states and replays across
all four runtimes. PR16/17 update both apps and their worker/offline loaders before any
TypeScript deletion. Record a concrete readiness check in each issue; if a file, type
or proof is still unspecified, keep `agent-ready` off until that supplement is complete.
PR9 to PR17 are marked blocked for this planning work; the orchestrator resolves it before assignment.

Under D39, these former player criteria are optional release-feedback questions:

- Aim within 0.1 km/s in five seconds for 8/10 testers.
- Understandable Moon/Mars/Saturn pacing.
- Capture within two attempts for 9/10 testers.
- A Saturn assist in two minutes.
- A window within 5% of optimum in 20 seconds.

Physical-phone 60 fps and 100 ms preview remain unmeasured design targets, with no
mandatory device session. Missing optional human or device feedback blocks neither
band planning nor implementation, master review or release readiness. Browser
automation is still not a measurement of player success or physical-phone performance.
Prototype 5's scripted 15 to 25-run economy with no body needing over three attempts
and PR22's automated 4 to 8 s pacing checks remain required.

## Session handover (D40)

The lead updates this section after each reviewed group and each material decision.
It holds only public facts (D40, non-negotiable 4).

| Field | Current value, updated after each reviewed group and material decision |
|---|---|
| Stack tip | `codex/v1-pr03a-lazy` (PR3a lazy), above PR3a readiness #92, PR3a loader #91, the D41 review checkpoint #90, PR3a model #89, the D40 window checkpoint #88, search transport #87, search core #86, ownership edits #85, ownership guard #84 and the D40 checkpoint #83 |
| Done | PR0 #78, PR2 #79, PR3a plan #80, PR3a precision #81, D39 checkpoint #82, D40 checkpoint #83, PR3a ownership guard #84, ownership edits #85, search core #86, search transport #87, D40 window checkpoint #88, PR3a model #89, D41 review checkpoint #90, PR3a loader #91, PR3a readiness #92, and PR3a lazy on `codex/v1-pr03a-lazy`; each PR's CI passed at its head. Issue #33's body was mirrored by hand through the GitHub connector after the Loading split, since `sync-work.mjs --apply` needs a token this environment lacks |
| Next | PR3a evidence, issue #33, [browser and bundle evidence](08-moon-flight.md#browser-and-bundle-evidence), branch `codex/v1-pr03a-evidence`, base `codex/v1-pr03a-lazy`. Budget 350 lines and 8 files: one `codebase-map` pass, one builder, one lite review (D41). It owns `scripts/verify-lunar-loading.mjs`, the sub-day flight and result restore browser case and findings rows 6, 7 and 21. Then PR3b |
| Not run here | Physical-phone timing (optional under D39); WebKit and Firefox worker and retry behaviour; every criterion from PR3a evidence onward |
| Context at close | Previous lead: about 570,000 of 1,000,000 tokens measured at the Search transport publication and about 590,000 when it began handover on a projected cost, which the owner judged too early (D40 note); compaction none. This session: about 625,000 measured at the Lazy publication. The runtime's session telemetry (autocompact_state) has read automatic compaction off since the Readiness publication, so the 776,000 to 792,000 window applies in full |

## Findings for the master review (D41)

Lite reviews fix blockers and small should-fixes in a PR's own code. Every other finding
waits here for the master review, which confirms or refutes each one and closes the
confirmed ones in its fix group. A later PR that fixes one adds its number to the row;
rows are never deleted. Line numbers are at the PR named in the source column.

| # | Source | Finding | Proposed fix |
|---|---|---|---|
| 1 | Search transport review (#87), not verified here | The preview key is taken when a preview is queued (`apps/game/src/sim/useSimulation.ts:121` to `:124`) and answered later (`:86`), so a live reference can change in between | Derive the answered key from the posted request. Fixed by PR3a readiness: the queue posts a clone of the shot it keyed (`apps/game/src/sim/preview.test.ts:79`) |
| 2 | Search transport review (#87), not verified here | Planetary requests share the level's unfrozen `attractors` array (`apps/game/src/levels.ts:79`) | Copy or freeze the array in the request |
| 3 | Search transport review (#87), not verified here | `requestPreview` skips a repeated key after a failed preview (`apps/game/src/sim/useSimulation.ts:122`) | Clear the last key when a preview fails. Fixed by PR3a readiness, also on a worker error (`apps/game/src/sim/preview.test.ts:93` and `:108`) |
| 4 | Ownership guard review (#84) | The gate-pair mutant is killed only by a test timeout | Add a direct assertion that fails fast |
| 5 | Search transport result (#87) | The Moon search yields with a zero-delay timer, about 4.4 ms per flight; a `MessageChannel` yield measured faster | PR3b chooses the yield |
| 6 | Search transport result (#87) | Worker ordering is measured in Chromium only; WebKit and Firefox are unmeasured | PR3a evidence or the master review measures them |
| 7 | Search transport result (#87) | CI's `verify-game` job passes no `--steps` (`.github/workflows/ci.yml:109` and `:110`), so the browser steps run only by hand | PR3a evidence or PR4 adds them to CI |
| 8 | PR3a model review (#89) | The literal `86400` stays in `apps/game/src/sim/lunar.ts:19` and `apps/game/src/campaign/scene-geometry.ts:14` and `:17` | Use `DAY` from `@starshot/physics/lunar`; the value is identical. Closed by PR3a loader for these three lines; `apps/game/src/campaign/scene.ts:52` keeps one |
| 9 | PR3a model build (#89) | The guard's scan counts `*.test-support.ts` files and type-only imports as importers (`apps/game/src/sim/lunar-request.test.ts:22` and `:73`) | PR3a loader kept counting them: an extra importer can only fail the guard |
| 10 | PR3a model build (#89) | `apps/game/README.md` and `docs/architecture.md` do not name `sim/lunar-request.ts` or `sim/lunar-model.ts` | Add one line each |
| 11 | D40 window review (#88) | `gh pr list` returns 403 in cloud sessions, yet the handoff skill (`.claude/skills/handoff-prompt/SKILL.md:17` and `:20`) and the plan's first commands use it | Name the GitHub connector or the REST call instead |
| 12 | PR3a model review (#89) | The secrets gate runs without its private-name list in cloud sessions | The owner supplies the list, or the gap stays recorded |
| 13 | PR3a loader review | Retry after a failed load is proven with an injected importer (`apps/game/src/sim/load-lunar-model.test.ts:56`), not with a browser's real `import()` | PR3a lazy fails the chunk request once, then succeeds, and checks for a second request. Closed by PR3a lazy: probe case 4 records the chunk and then `chunk?retry=1`, since Chromium caches a failed dynamic import for the page |
| 14 | PR3a loader review | A Moon focus on a planetary level throws without the model (`apps/game/src/campaign/world.ts:20`); `inspectBody` can set any body id (`apps/game/src/campaign/use-camera-views.ts:56`) | PR3a readiness or lazy keeps a saved planetary pilot from waiting on the rail. Closed by PR3a lazy: a Moon focus is refused on a planetary level (`apps/game/src/campaign/use-camera-views.ts:61`) |
| 15 | PR3a readiness review | The "Loading the Moon." reason line has never rendered in a browser; it is absolute inside the deck's `overflow: hidden` (`apps/game/src/campaign/campaign.css:42` and `:5`), so it may be clipped or cover controls | PR3a lazy screenshots it at 360 and 390 px collapsed and expanded, short landscape and 200% zoom, and asserts its box is inside the deck and overlaps no button. Closed by PR3a lazy: the reason line takes its own row in the deck, and probe case 3 checks it at 390x844, 360x780, 844x390, 1440x900 and 720x450 |
| 16 | PR3a readiness review | While loading is eager, the readiness ref write (`apps/game/src/campaign/CampaignApp.tsx:83`) is untested, `ownedCallback` has no production caller, the reason line is not a live region and a disabled handle can lose focus | PR3a lazy calls `ownedCallback` with the real disposal flag and its loading probe tries a pull, Enter, Launch and Guide while loading. Closed by PR3a lazy: `ownedCallback` settles the real load with a per-run disposal flag, and probe case 2 checks pull, Enter, Launch, Guide, focus and the live region while loading |
| 17 | PR3a readiness review | Apply guide and the fine-aim inputs are not gated (`apps/game/src/campaign/MissionDeck.tsx:8`) | PR3a lazy confirms no hint reaches a Moon level whose model has not loaded. Closed by PR3a lazy: Apply guide and both fine-aim inputs gate on the model |
| 18 | PR3a readiness review | The hook's calls into `PreviewQueue` have no React test (`apps/game/src/sim/useSimulation.ts:103` to `:153`), and the extra `structuredClone` per preview is unmeasured | The master review decides whether a hook-level test or a measurement is owed |
| 19 | PR3a lazy result | In development a retry cannot refetch, since the chunk meta tag exists only in the build; the paint after a switch to Moonshot is not timed by any probe | The master review decides whether either needs proof |
| 20 | PR3a lazy result | While the reason row shows, the deck grows about 19 px and in short landscape Guide and Launch sit at the left of their row; while loading, the disabled ring handle sits at the top-left corner | PR3b's layout work owns these |
| 21 | PR3a lazy result | Whether `page.route` sees requests the service worker serves, and retry in WebKit and Firefox, are unmeasured | PR3a evidence measures them |

## Publication and account boundaries

Keep Firebase only, immutable candidates, downgrade protection and live metadata checks.
Main merges do not deploy production. Production promotion needs explicit owner direction
and the D37 environment approval. The new trunk uses the existing reviewed-ref manual
beta path; do not extend automatic branch trust. Version fields remain CI-owned.

Backend source and emulator work are authorized. Billing, paid services and permission
expansion require concrete owner review before activation. Existing Hosting roles do not
authorize Auth, Firestore or Functions administration. DCO, the project board, address
forwarding and owner contact with Mark remain unverified unless their own evidence says
otherwise. See the reconciled [ops checklist](04-ops-checklist.md).
