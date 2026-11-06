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
| AC1 | Existing npm gates remain required. PR6 adds the Rust workspace and the `rust` gates; CI's `checks` job requires them with `STARSHOT_REQUIRE_RUST=1`, and locally they skip without cargo, counted as skips. |
| AC2 | PR6 adds the locked fmt, clippy and test commands (`rust-fmt`, `rust-clippy` and `rust-test` in `scripts/gates.mjs:68-74`), run by the rust gates and CI's `checks` job with `STARSHOT_REQUIRE_RUST=1`. |
| AC3 | TypeScript Horizons fixtures exist in `packages/ephemeris/test/ephemeris.test.ts`. Rust comparisons remain PR9/10. |
| AC4 | PR8's pack in `data/ephem/de440s-100km` is validated against the DE440 kernel every 5 days from 1950 to 2150, decade edges and the end included: every body is within 150 km (largest Mars 86.606 km, Moon 56.810 km; `VALIDATION.md` there). The tighter lunar probes stay with the knot rail and are not relaxed; G5 in the [supplement](09-rust-supplement.md#open-gaps) is open for the owner. D38 conformance remains an additional requirement. |
| AC5 | Pending Rust dense Table 1 test over 1950 to 2050. |
| AC6 | Native x86_64 and native arm64 now agree on all 7,916 maths golden cases (PR6, CI job `rust-arm64`). V8 and JavaScriptCore remain for PR15. Lunar captured states join the corpus. |
| AC7 | Existing TypeScript energy/timing tests remain the oracle. Rust closure, switching and preview timing remain PR11/12. |
| AC8 | Current known solutions are in `apps/game/src/levels.test.ts`. Rust catalogue, deterministic search and later content remain pending. |
| AC9 | Pending measured wasm, JavaScript and texture gates. Existing Three.js does not establish any size budget. |
| AC10 | PR16 supplies browser and offline evidence for the current game. Repeat where changes affect it; full chapter proof remains pending. Human trials and physical-phone timing are optional under D39. |
| AC11 | Existing copy gate remains required at every publication. No new copy exemptions. |
| AC12 | File licensing exists. PR5 adds the `dependency-licences`, `assets` and `credits` gates: 79 locked packages pass, 12 by exact exception (deviation 53); `apps/game/assets/manifest.json` lists every file under `apps/game/public/`, and the observatory files the game ships stay checked against their own manifest; the game assets block of `CREDITS.md` is generated. PR6 adds the Cargo part as the `rust-licences` gate. |
| AC13 | Existing file scan remains required. PR4 adds the `commits` gate, which scans every commit's author, committer and message in the branch range; PR text is still scanned by hand with `--stdin` before posting. |
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
| PR6 | Built in two parts (#100, #101): the workspace, `starshot-math` with 7,916 golden cases, the clippy fence and the `rust` gates. V8 and JavaScriptCore bits remain for PR15. |
| PR7, PR8 | Built (#102): `tools/ephem`, the refreshed Horizons fixture and the validated DE440 pack. The interim Moon rail stays until a replacement passes its probes (G5 in the [Rust core supplement](09-rust-supplement.md)). |
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
into twelve declared parts under #33. The rows below retain the PR0 baseline evidence;
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
The [Rust core supplement](09-rust-supplement.md) holds these mappings, golden cases and readiness lists.

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
| Stack tip | `codex/v1-pr12-records` (#114), the PR11 group's records part, on its five declared parts (00-plan.md:246-250): `codex/v1-pr11-physics-crate` (#109), `codex/v1-pr11-lambert-parking` (#110), `codex/v1-pr12-simulate` (#111), `codex/v1-pr12-simulate-conformance` (#112) and `codex/v1-pr12-lunar-flight` (#113), all draft. Below them: the PR9 group #104 to #108, the Band B planning checkpoint #103 and the rest of the linear stack down to PR0 #78 |
| Done | PR0 #78 through the PR9 group #108 as recorded before. The PR11 group in five parts, #109 to #113, each with a D41 lite review (adversary and `physics-auditor`) and its fixes, and one physics delta pass on the last fixes; its records in #114 (deviation rows 103 to 114, findings rows 63 to 71) and issues #44 and #45 mirrored as ready. CI passed on #104 to #108 |
| Next | The PR13 group (PR13, PR14) on `codex/v1-pr12-records`, with D43's lunar replay; then PR15, and PR16 with PR17, which moves the rail to `packages/core-wasm/data/`. The owner answered G2 to G5 in D43; Band C's plan builds its 8-day Moon tier with PR18 (deviation row 115). The work-in-progress branches `codex/v1-pr11-review-notes-wip`, `codex/v1-pr09-wip` and `codex/v1-pr09-review-fixes-wip` are public and not for merge; their content is in the records, and deleting them is the owner's call |
| Not run here | Physical-phone timing (optional under D39); WebKit and Firefox; compressed transfer on the real host; the `/starshot/` repeats and Canvas 2D passes that D42 defers to the master review |
| Context at close | Lead before last: handed over at 688,712 measured, early on a projected cost (deviation row 111); its telemetry read automatic compaction enforced at 901,600 with `enabled: false`. This lead: automatic compaction enforced at 784,000 (the model default), so its handover window is 776,000 to 784,000; under 250,000 measured when the PR11 group's records were written |

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
| 5 | Search transport result (#87) | The Moon search yields with a zero-delay timer, about 4.4 ms per flight; a `MessageChannel` yield measured faster | PR3b chooses the yield. Fixed by PR3b: a `MessageChannel` yield with a timer fallback (`apps/game/src/sim/worker-handler.ts:19`); a 236-flight search takes 1,401 to 1,782 ms instead of 2,667 to 3,099 |
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
| 20 | PR3a lazy result | While the reason row shows, the deck grows about 19 px and in short landscape Guide and Launch sit at the left of their row; while loading, the disabled ring handle sits at the top-left corner | PR3b's layout work owns these. PR3a evidence browser also found the flight deck covering Apply guide and the result card's Next mission at 844x390 (`scripts/verify-steps/lunar-evidence.mjs:36` logs them). Fixed by PR3b: the reason no longer grows the deck, the waiting ring sits in the free room, Launch ends its row, and in short landscape the card and drawer sit beside the deck; `lunar-evidence.mjs:51` now asserts the covers |
| 21 | PR3a lazy result | Whether `page.route` sees requests the service worker serves, and retry in WebKit and Firefox, are unmeasured | PR3a evidence measures them. The Chromium half stays with PR3a evidence browser; WebKit and Firefox are not installed here. Chromium half answered by PR3a evidence browser: `page.route` sees none of the worker-served responses |
| 22 | PR3a evidence bundle review | A `modulepreload` of the Moon chunk passes `scripts/verify-lunar-loading.mjs`, by design, since a preload only fetches | PR3a evidence browser measures it as a transfer cost. Measured by PR3a evidence browser: no module preload exists in this build |
| 23 | PR3a evidence bundle review | The Lazy changelog line gives the entry as 90,860 bytes smaller and the bundle verifier measures 88,969, from different bases and methods | The master review settles one figure for the release notes |
| 24 | D42 checkpoint review | `.claude/README.md` labels D30, D40 and D41 advisory but not D42's two-builder cap, per-part proof scope and map skip, which no hook enforces | Add the advisory line with the next harness change |
| 25 | PR3a evidence browser | Compressed transfer on the real host is unmeasured (the harness serves no compression); the replay check proves an early restart, not the exact launch time; the owner-switch case runs in the phone context only; the cost probe waits a fixed 1.5 s rather than for a quiet network (`scripts/verify-steps/lunar-offline.mjs:61`); the sub-day check tests that the UTC hour is not 0, which a 00:30 departure would fail (`lunar-evidence.mjs:66`) | The master review measures on the hosted build and decides whether either check needs tightening |
| 26 | PR3b review | A failure reply after a pilot change still clears busy and shows a notice (`apps/game/src/campaign/use-hints.ts:96` to `:101`); a test asserts it. Production is safe because a pilot change always starts a new visit (`campaign/use-restore.ts:91` and `:106`) | Guard failures by pilot too, or keep the visit as the one guard and say so |
| 27 | PR3b review | At 360x780 on First Light, Launch overhangs the deck by 7 px and the body popup overlaps the map tools; both occur at the base too | Fix with the master review's layout sweep |
| 28 | PR3b result | Orbit view with Fine aim leaves 122 to 211 px of free room, since the Moon cue sits above the deck; at 360x640 in reduced motion the ring's travel is 33.3 px | The master review decides whether Orbit view owes the 160 px room and 45 px travel |
| 29 | PR3b review | Two body hit targets overlap at system scale on Big Game and Grand Tour (Inspect Sol and Inspect Earth) | Measure the overlap and separate the targets if a press can select the wrong body |
| 30 | PR3c review | `.js` files are outside the size gate and its long-line warning (`scripts/check-file-size.mjs:41`); 13 hand-written files under `apps/prototype/public/observatory/` have lines over 160 characters, one a single 4,281-character line. The gate also prints 77 long-line warnings that no hook reports | The owner decides whether D28's list gains `.js`; the master review decides on a ratchet for the warnings |
| 31 | PR4 review | The PR that lands the collapsed stack on `main` exceeds its groups row's cap, so its `pr-size` result will fail the required `gates` check (`.claude/README.md` accepted gaps) | The master review decides the landing: a chain-aware member count, or an owner override recorded with the merge |
| 32 | PR4 review | The `work` gate checks only `v1-starshot` (`scripts/gates.mjs`), `sync-work.mjs --self-test` runs in no gate, a deleted lock passes as never synced, and a nested plans folder is not read | Decide whether the gate runs `--check` over every program and the self-test |
| 33 | PR5 review | Generated credit lines omit the source URL and the modifications, which CC BY 4.0 asks for (`scripts/gen-credits.mjs`); the copyleft backstop misses some licence ids | Settle both before PR26 and PR37 add sourced assets |
| 34 | PR4 review | `check-pr-size.mjs` still excludes a text file made binary by its content, and a collaborator with push access still chooses the head branch name, though only a row with a matching Base counts | Measure whether either needs closing |
| 35 | PR4 result | `scripts/sync-work.mjs` is 329 code lines, over the 300-line warning, after PR4's every-program check | Split its check path from its apply path in a later harness change |
| 36 | PR6 review | `release.yml` runs `npm run gates` without the Rust setup or `STARSHOT_REQUIRE_RUST`, so its Rust gates may skip; the setup action needs a no-cache input first, since that workflow restores no cache from another | PR15, where Rust joins the build |
| 37 | PR6 review | The `unicode-ident` exception says "never built", which PR15's `wasm-bindgen` macros will make false, and each of its bumps fails Dependabot's Cargo pull requests | Decide at PR15 whether Unicode-3.0 joins `allowed` (an owner call) |
| 38 | PR6 review | `starshot-math` has no three-argument `hypot`, while `vec.ts` and `simulate.ts` use `Math.hypot(x, y, z)`; nesting the two-argument form will not reproduce V8's bits | PR9 and PR11 choose the `norm` formula and extend the golden set (supplement gap G10) |
| 39 | PR6 review | A cargo that exists but cannot start reads as "cargo not found" and skips locally | CI requires Rust; decide whether a local start failure should fail instead |
| 40 | PR6 result | The D16 fence check cannot see `RUSTFLAGS` or `CLIPPY_CONF_DIR` set in a workflow, or cargo configuration outside the repository; deleting the size scan's call to the fence check passes on a clean tree, as for its other scan hooks | Decide whether CI asserts an empty `RUSTFLAGS`, and whether each scan hook gets a self-test through the scan path |
| 41 | PR8 physics audit | The pack's Moon (32-day segments, degree 15) misses the lunar probes by 1.412 to 44.126 km and 8.15e-5 to 8.68e-4 km/s, against budgets of 0.1 km and 1.1e-5 km/s (`packages/physics/test/lunar.test.ts:17-18`). Over 2026 to 2028 a 16-day degree-15 tier gives 0.028 km and 7.7e-6 km/s, an 8-day degree-12 tier 0.017 km and 2.2e-7 km/s | The owner rules before PR10 or PR18 (supplement gap G5): D33 says the rails replace the knot rail and keep its probes as a cross-check (docs/decisions.md:842-843) |
| 42 | PR8 physics audit | Segment boundaries jump by up to 96.8 km (Jupiter) and 36.7 km (Moon); the reports set no velocity budget, and differentiated fit errors reach 6.36e-3 km/s for the Moon. Sampled maxima are not bounds: the Moon reaches 60.24 km on a 1-minute grid against 56.81 km reported | PR10 and PR12 decide whether the integrator stops at segment edges, and set a velocity budget |
| 43 | PR7 review | The Horizons client retries only HTTP 429 and 503, and neither retries nor wraps a `URLError` or a non-JSON 200 answer (`tools/ephem/src/ephem/horizons.py:69-78`). The cache-mismatch, retry-exhaustion and short-row paths and the CLI's exit codes are untested; `KernelSource` has no offline test; the `regenerate` job validates only against the same kernel source | Add the tests, and a Horizons cross-check to the `regenerate` job |
| 44 | PR7 review | `pack.read` accepts a manifest file entry outside the pack directory (`tools/ephem/src/ephem/pack.py:212`) and NaN coefficients, and raises an error other than `PackError` on a subnormal segment or a manifest without bodies (`:162`) | Harden the reader before PR10's Rust reader relies on the format |
| 45 | PR7 review | `npm run gates` runs neither the `tools/ephem` nor the `python/astlo` tests, and no gate reads Python dependency licences | Decide whether a required check runs them |
| 46 | PR6 records | PR6 added `fixtures/math/golden.json` with no `physics-auditor` pass (deviation 76), though D41 gives a fixture change that lens | The master review runs the physics lens on `starshot-math` and its golden set, or the owner rules it unneeded |
| 47 | PR9 time and bodies review | `unix_ms_from_et` and `dateFromEt` take one fixed-point step, so a UTC time taken to ET and back returns 1000 ms early in the last 42.184 to 68.184 s before each of the 27 leap seconds from 1972-07-01 to 2017-01-01. That is 1,489,968 ms in all, measured at every millisecond in both languages; `table1.json`'s 27 leap rows record it (`crates/starshot-ephemeris/src/time.rs:81-85`, `packages/ephemeris/src/time.ts:44-48`) | Take a second step in both languages that looks TT - UTC up at the first estimate rounded to the millisecond, then regenerate `table1.json`. Without the rounding, a second step returns 14 leap-second midnights 1000 ms late. With it, a TypeScript trial returned every millisecond within 70 s of the 28 table dates, every daily midnight from 1800 to 2050 and 2 million random times unchanged |
| 48 | PR9 time and bodies review | Earth's GM in `bodies.ts` and `bodies.rs`, 403503.235502 km^3/s^2, is the DE430 and DE431 Earth plus Moon (BODY3_GM of `gm_de431.tpc`), while the other eight GMs are DE440's. DE440's Earth plus Moon is 403503.235625 (`gm_de440.tpc`), larger by 3.06e-10 of itself (`crates/starshot-ephemeris/src/bodies.rs:51-55`) | The owner decides whether both languages take DE440's digits. The change reaches Earth's sphere of influence and the gravity of every flight near Earth, so the physics and level tests run again |
| 49 | PR9 time and bodies rules review | `scripts/check-guard-scan-coverage.mjs:52-54` names only `crates/starshot-math` as the Rust gates' inputs. The cargo commands run on the whole workspace, so nothing goes unchecked today. `AGENTS.md:38` names only the TypeScript accuracy tests, though `crates/starshot-ephemeris/tests/horizons.rs` holds Table 1 to the same fixture from the PR9 Table 1 part on | With the next harness change, add `crates/starshot-ephemeris` and the fixtures its tests embed to the table, and name both languages' tests at `AGENTS.md:38` |
| 50 | PR9 Table 1 review | Table 1's velocity is not the time derivative of its position: the mean motion takes L's and varpi's rates, and the velocity ignores the precession of varpi and the node (`crates/starshot-ephemeris/src/table1.rs:94-95`, `src/kepler.rs:76-78`, as `packages/ephemeris/src/ephemeris.ts:28`). Against a central difference at the five fixture epochs: Neptune 8.18 m/s (1.49e-3 of its speed), Uranus 6.68, Saturn 3.76 and Earth 0.27 m/s, inside the 1% speed budget | Say so on `planet_state`; anything that interpolates Table 1 states with Hermite or compares them with rail velocities allows for it |
| 51 | PR9 Table 1 review | `solve_kepler` is elliptic only (`src/kepler.rs:24-43`): e of 1 or more returns a silent value or NaN. Table 1 has no range or NaN guard (`src/table1.rs:79-104`): a NaN ET gives a NaN state where `RailEphemeris` panics, and nothing reads `APPROX_VALID_JD` (`:73`) in either language | Guard e before PR11 reuses the solver for hyperbolic arcs; decide whether `Table1Ephemeris` panics on a non-finite ET as `RailEphemeris` does |
| 52 | PR9 Table 1 review | TypeScript bit parity covers `planet_state` only: `table1.json` has no rows for the e >= 0.8 start, `orbit_path`, `orbital_period_seconds`, `soi_km` or flattening. The supplement's lunar Bodies and departure cases reuse the 1 m and 1 mm/s bounds, though the Bodies rows are bit-identical | Add the rows when drawing moves to the core (G13); hold the lunar rows to bit-equal counts or to 1e-6 km and 1e-12 km/s |
| 53 | PR10 rails reader review | Nothing pins rail velocity bits: `df * 2.0 / span` in place of `df * (2.0 / span)` survives, since `rails.json` holds positions only | PR15's four-runtime check includes `state().v`, or `rails.json` gains velocities |
| 54 | PR10 rails reader review | Segment ends jump in velocity as well as position (row 42): through the Rust reader the Moon jumps 9.951e-3 km/s at 2100-11-17, Mercury 5.409e-3 at 2120-05-08, Venus 1.133e-3, Mars 8.533e-4, the EMB 3.700e-4 and each outer planet about 1.62e-4 at the 2080 decade edge. The per-body budgets (deviation row 96) hold at the five Horizons epochs only; the dense worsts are a review's scratch measurement against `de440s.bsp`. The Moon's 1e-2 budget passes velocity scale errors from -0.46% to +0.93%, the slack of its 100 km fit | `tools/ephem` validate reports each body's largest velocity error against the kernel, segment ends included, and `tools/ephem/tests/test_committed_pack.py` holds it |
| 55 | PR10 rails reader review | The reader checks structure, not content: a flipped coefficient bit, or a segment length that still tiles, loads and misplaces a body (Mercury by 2.6e7 km in one probe). `pack.json`'s SHA-256 catches both; the FNV-1a build covers the data sections only. A decade file with no bodies loads and `is_loaded` reads true, so `None` from `position` has four causes | PR18's loader checks each decade's SHA-256 before `load_decade`; `parse` requires all nine bodies, or the reader exposes `has(body, et)` |
| 56 | PR10 rails reader review | Reloading a decade replaces it, and another build replacing the only loaded decade is refused with `MixedBuilds`; neither is tested. Little-endian reads are checked by reading only, since both CI hosts are little-endian | Test both reload cases when PR18's loader uses them |
| 57 | PR10 rail ephemeris review | `RailEphemeris::bodies()` lists the Moon, but `soi_km(Moon)` and `BodyId::Moon.info()` panic. `packages/physics/src/simulate.ts:105` and `:127` default the attractors to `eph.bodies` and call `soiKm` on each, so a straight PR12 port flown on `RailEphemeris` panics | PR12 or PR20 filters the attractors to the planets or gives the Moon a sphere of influence |
| 58 | PR10 rail ephemeris review | Leaving the pack's coverage switches the planets to Table 1 with a jump: the EMB moves 8,862.8 km at 2150 and 4,432.8 km at 1950 | PR12 and PR18 decide whether a flight may cross a coverage edge |
| 59 | PR10 rail ephemeris review | `tools/ephem/src/ephem/conformance.py` raises `StopIteration` for a pack without `2020.bin`, its `< to_et` filter changes nothing, and the command prints a traceback for a missing pack. `REUSE.toml` gives `table1.json` Apache-2.0 and `rails.json` LicenseRef-NASA-JPL-Data, though both evaluate JPL inputs | Harden the command when it next changes; the owner decides one rule for evaluated JPL data |
| 60 | PR10 rail ephemeris audit | The four giants share one velocity error against Horizons: about 1.6e-4 km/s at segment starts and 5e-6 mid-segment. Their 512-day degree-8 segments do not follow the Sun's reflex about the barycentre, driven by Venus and the EMB; a fit of that reflex alone reproduces the error within 8.5e-7 km/s | None for Band B; PR18 decides whether the giants need shorter segments |
| 61 | PR10 lunar model review | `et_from_iso("2026-11-02T01:00:00Z")` is 846853269.1839867, 112 ulp (13.3 microseconds) from the `LAUNCH_ET` literal in both languages, since both go through a Julian date | PR13's saves and PR15's ABI carry the frame ET as bits, never rebuilt from ISO text |
| 62 | PR10 lunar model review | Three of the five probes test interpolation: probe 4 sits on knot 1, and probe 5 is 8.0e-5 of the way into the final 1 s segment. The interior three measure 0.039, 0.056 and 0.023 km and 7.4e-6, 5.9e-6 and 9.65e-6 km/s against 0.1 km and 1.1e-5 km/s. `basis` takes a non-finite phase and returns NaN vectors, as the TypeScript does | Weigh with G5; refuse a non-finite phase in `basis`, or say so in its doc |
| 63 | PR11 integrator audit | `starshot_math::pow` is libm, which differs from V8's `Math.pow` by 1 ulp in 2 to 5 percent of inputs, so no path through `pow` can match the TypeScript bit for bit (deviation row 103). Lambert's `pow(y / C, 1.5)` takes inputs of about 1e8 to 1e9, above the golden set's range (to 1e6), so no golden case pins those bits (`crates/starshot-physics/src/lambert.rs`) | Extend the golden set to Lambert's range with PR15's four-runtime check; keep every pow path held to a bound, never to bit equality |
| 64 | PR11 integrator review | `AGENTS.md:24` still says "`starshot-math` now; ephemeris, physics ... to come", stale since PR9 | Update it with the next harness change |
| 65 | PR11 Lambert and parking audit and review | Lambert mutants pass every test: the step-back loop is never entered, `cz >= 0.0` for `cz > 0.0` (`crates/starshot-physics/src/lambert.rs:46`; a retrograde polar transfer would pin it), the tie rule, and the S series at 121 terms within 1e-9. The lower-bound loop is equivalent, since y(0) >= 0. `lambert` returns velocities for a time of flight of 0 or less, as the TypeScript does | Add a polar retrograde case, and decide on a time-of-flight guard when PR14's hint search moves to Rust |
| 66 | PR11 Lambert and parking review | `departure` is public and does not check the burn: a NaN burn gives a NaN state and -1 km/s is accepted, while `simulate_lunar` checks the fuel budget first. The parking mutants P3 (`burn_angle_deg / 180.0 * PI`) and P6 survive the 1e-14 km/s bounds, inside the `norm` noise of deviation row 79 | Decide at PR15's ABI whether `departure` stays public |
| 67 | PR12 simulate audit and review | Mutants survive where no flight reaches: the step cap's speed guard `max(speed, 1e-3)` binds only below 1 m/s within 21,600 km of a planet, and a rate turn of `>= 0` for `> 0` differs only at exactly 0. An impact and a sphere-of-influence stop on the same step take the TypeScript's precedence by reading, untested. `crates/starshot-physics/src/simulate.rs` has 355 code lines and `src/lunar/flight.rs` 337, over the 300-line warning | Add a same-step case with PR13's shot tests; split either file when it next grows |
| 68 | PR12 lunar flight audit and review | Mutants survive on margins no flight reaches (graze window 1.01, graze search of 20 or 10 iterations, closest search of 24), deleting the check that an impact earlier in the same step wins over a stop at entry (`crates/starshot-physics/src/lunar/flight.rs:354`; a 1737.4 km zone with a stop at entry would catch it and `entry <= et` too, since both engines put that entry exactly at the impact time), ties in seven comparisons, the speed floor 0.01 and five times the attempts. `sample_flight` panics on an empty slice where the TypeScript throws a TypeError. Neither language has an energy test for the lunar flight; the evidence is the tighter-settings test (201 positions within 2.34e-3 km, entry within 8.4e-5 s) | The master review decides whether a lunar energy check is owed |
| 69 | PR12 lunar flight audit | A closest approach is rough, not flat: Table 1's Earth jitters the Moon distance by 1e-6 to 5e-6 km every 10 ms, so either engine's closest time is uncertain by about 1 s. The TypeScript moves its own `closestEt` by 0.62 s for a 2.3e-13 km/s change in departure speed | PR13's replays compare closest distances, never closest times (gap G2) |
| 70 | PR12 simulate audit | `apps/game/src/sim/simulate-fixture.test.ts:81-82` ties only `rtol`, `atolKm`, `maxStep` and `maxSteps`; a game request with a 3e7 km Sun-dive radius passes all 18 checks | PR13's shot model ties every `SimulationConfig` field it sets |
| 71 | PR11 group records | No delta pass is recorded for the integrator part's fixes (8cf5358 regenerated `fixtures/conformance/physics.json` with six probes beyond 1,000 au) or for the conformance part's tightening from 1 km to 1 m (4d025f5) | The master review runs the physics lens on both |

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
