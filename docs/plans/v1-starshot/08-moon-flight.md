# Remaining Moon flight delivery

This supplement governs PR3a after cleanup [PR79](https://github.com/harmon-amakobe/starshot/pull/79)
at `e523545bf6f409bb52e4592ca3f5b440a308249c`. Read it with the
[lunar ledger](06-resumption.md#lunar-acceptance-ledger), D33 and D38.
Existing gameplay stays accepted; each row below describes unfinished work.

## Parts and size accounting

PR3a remains one spec and issue #33. Its declared parts use separate linear PRs.
Each has one member, its own review and full DoD, and names `Part of #33`.
No part closes #33. PR3b bases on the final part. The plan's split rule applies;
the PR2/PR3 exception does not. No numbered decision or size threshold changes.

| Part | Added-line budget | Files | Reviewable result |
|---|---:|---:|---|
| Plan | 240 | 6 | Public scope, ownership, proof and linear delivery map |
| Precision | 320 | 10 | Real-SOI graze and focused Moon coordinates |
| Ownership guard | 400 | 10 | Captured-request guard and launch-commit boundary, with drift reset |
| Ownership edits | 260 | 8 | Edit, mode, pilot-switch and guide ownership through production actions |
| Search core | 280 | 10 | Bounded deterministic search with exact simulation counts |
| Search transport | 240 | 9 | Cooperative worker dispatch, protocol fields and browser proof |
| Model | 280 | 16 | Pure requests and explicit scene-model plumbing, still eagerly loaded |
| Loading | 360 | 14 | Lazy model, readiness controls, ownership and retry |
| Evidence | 350 | 8 | Built-module, network, offline and asynchronous browser regressions |

Budgets include tests and per-part plan, changelog and result additions. These are
planning targets below the ordinary 400-line/20-file warning; the failure threshold
remains twice the cap. Count actual contentful additions before each builder and
at review. Declare another real split before exceeding the budget; never compress
code or multiply member identities. Mechanical moves are identified separately.

## Precision

Paths under `campaign/` and `sim/` below start at `apps/game/src/`.
Keep all physics constants, settings, tolerances, reference par and planetary tests.

- Extend `packages/physics/test/lunar.test.ts` with a real `MOON_SOI_KM` graze:
  launch/frame/epoch ET 846853269.184, parking radius 6571 km, phase 225 degrees,
  burn 3.24 km/s and angle 17.33167459468716 degrees. Compare diagnostic
  `stopAtEntry: false` and canonical `true` runs with identical settings.
  Every diagnostic accepted knot must remain outside the SOI. Entry must lie
  strictly between outside knots; an interpolated interior sample must be inside,
  and a sample just before entry outside. Both runs must report identical entry ET.
  The stopped run ends at entry with radial error below 0.01 km and no later knot.
  Keep the prototype's separate 65,000 km study oracle. Add a game-builder case.
- Correct `ThreeScene.updateMoons` through a small production vector helper in
  `campaign/satellite-position.ts`. Add all parent coordinates, including z.
  `campaign/moon-coordinates.test.ts` compares the production primary and focused
  positions with the shared physical model at 649 hourly epochs through day 27.
  Use the actual satellite data, include hour 599 and nonzero parent z, and require
  error at most 1 km. Exercise `makeFrame` and the mesh-position boundary in System
  and tilted Free views, with physical and enlarged symbols. Convert projection
  differences to km. Both renderers share primary positions; focused extras remain
  WebGL-only. A duplicated corrected formula or screenshot is insufficient proof.
## Captured-request ownership

Extend `campaign/contracts.test.ts` and `lunar.test.ts` through `finalRequest`,
  `aimActions`, `ReleaseOwner` and the canonical key/gate. Mutating caller aim,
  parking or ET must not alter a captured request. Production launch captures the
  render ET between UI updates and sends that same request to preview and launch.
  Cancel, date/phase/aim edits, mode changes and identical-shot owner switches reject
  old success and failure. A mutated owned request fails its cached-key guard.
  Prove a real aliasing failure before adding any targeted snapshot/freeze or guard change.
  Reference results must not later rewrite applied sessions or captured shots.

## Bounded search

`sim/lunar-hint.ts` owns `findLunarHint`; `lunarHint()` and the 3.240 km/s reference
par stay unchanged. `FlightHintQuery` adds lunar strategies `reference` and `search`;
omission means reference. Search budgets are integers from 0 to 240, default 240.
Invalid budgets and unknown strategies use the existing worker error response.
`Hint.source` adds `lunar-grid`; `HintResponse` reports strategy, `moon-grid/1` and
actual simulation count even for no result. Planetary protocol behavior stays intact.

1. Evaluate reference day 0, burn 3240 milli-km/s, angle 0 centidegrees first.
2. Coarse grid: days 0 through 27, burns [3150,3240], angles [-2000,0,2000].
   Deduplicate integer tuples, including the reference: 168 unique candidates.
3. Sort hits by burn, day, absolute angle, then signed angle. Snapshot at most four
   cheapest distinct-day seeds before refining.
4. Each seed uses burn decreases [50,40,30,20,10,0] and angles [-500,0,500]
   relative to its angle. Deduplicate within this search. At most 72 further calls.
5. Guard and count before every simulation. Budget 0 returns null. Return the
   cheapest evaluated hit under the same ordering, with no hidden validation flight.

Convert integers once before canonical `lunarRequest`. Date is `LAUNCH_ET + day * DAY`;
frame remains `LAUNCH_ET`, epoch is that date, phase 225 and radius 6571 km.
This searches dates while retaining D38's Earth-relative departure convention.
The finite grid makes no global optimum claim and does not replace reference par.
Yield a worker macrotask after each flight; wall time never selects candidates.
Keep the same worker and request IDs. A queued preview must finish during search.
An extracted `sim/worker-handler.ts` is allowed only if the real worker uses it.

`sim/lunar-hint.test.ts` proves repeatable order/results, precision, selected-route
replay, reference preservation, fixed frame/date behavior, and budgets
[0,1,2,167,168,169,239,240]. Count real production simulations, including failed
searches; test invalid budgets and a controlled scheduler through actual dispatch.
Browser proof preloads reference, starts search, queues preview, records response
order/latency and compares canonical preview/launch samples and analysis exactly.
PR3b owns separate reference/search slots and explicit Apply searched route controls.
Search completion alone never changes aim; owner/visit guards and hint star caps remain.

## Lazy scene data and readiness

The Model part first preserves eager loading while removing implicit ownership.
Move request construction into pure `sim/lunar-request.ts`; `campaign/contracts.ts`
imports it directly. No rail import may enter through a barrel. `sim/lunar-model.ts`
owns the shared data-backed instance. Worker simulation stays in its dynamic graph.
The following Loading part adds `sim/load-lunar-model.ts` to memoize main-thread
dynamic loading with absent/loading/ready/failed states and retry after failure.

Pass the ready model through `CampaignScene`, `makeFrame`, `scene-geometry` and
`worldFor`. `use-view` or the scene owns loading, never request construction.
Keep renderer and worker mounted. While loading, never display an old planetary
frame as Moonshot or advance lunar time unseen. Show loading/error with explicit
retry; gate lunar pulling and Launch until scene and matching preview are ready.
Owner/mission changes and disposal reject late callbacks. A saved planetary pilot
does not wait for the rail. No approximate Moon fallback or clamped date is allowed.

`sim/load-lunar-model.test.ts` covers lazy initiation, shared pending promise,
ready reuse and failed-load retry. Production readiness tests cover disposal and
owner changes. Browser cases include direct Moonshot start, guide application,
sub-day flight/result restore, returning to planets during load and failure/retry.
Include readiness consumers in `CampaignApp`, `AimHandle`, `FlightDeck` and gesture
start. Recount their callers and existing/new tests before each builder.

## Browser and bundle evidence

Each implementation part supplies affected criterion proof before publication.
The final evidence part makes that proof reusable; it cannot defer earlier DoD.
Use existing browser helpers where they fit, with fresh isolated storage.
Add `scripts/verify-steps/lunar-flight.mjs`, `lunar-worker.mjs`, `lunar-loading.mjs`
and `scripts/verify-lunar-loading.mjs --dist apps/game/dist` as focused probes.
The checker is a verifier, not a new global gate; include a rules-reviewer.

Measure the real production build at the cleanup base and final tip separately:
critical execution JS (entry/static graph and planetary page requests), initial and
dynamic worker JS, and complete service-worker prefetch. Report raw/gzip built bytes
and observed initiator/transfer costs without double-counting cached responses.
Unavailable transfer metrics are unknown, not zero. Fail the checker on a static
entry rail, absent reported chunk or missing lunar release-inventory asset.
Full-release prefetch remains unchanged. Removing the static rail proves deferred
execution, not zero lunar network traffic on installation. Report both costs and
retain the original first-load criterion and all existing size/performance budgets.

Drive real guide hit, miss and Earth impact; preview/launch/replay identity; Plan
and YOLO; cancellation/owner switch; sub-day restore; loading/retry; and focused
Moon drawing. Run phone portrait, short landscape, desktop and reduced motion,
Canvas and WebGL as applicable, root and `/starshot/`, then offline restore.
Inspect screenshots per criterion; numerical position proof remains separate.
Human trials and physical-phone 60 fps/100 ms measurements are optional under D39.
Their absence does not leave lunar acceptance unfinished; automated proof remains required.

## Acceptance commands and record

Every part runs `npm run gates` and public hygiene. Runtime parts run
`npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts`,
`npm run build` and `npm run build:prototype`, plus applicable browser proof.
The three reusable steps run with `node scripts/verify-game.mjs --steps <path>`,
repeated with `--base /starshot/`. Run the loading checker on the built output and
`node scripts/verify-web-release.mjs` for offline/update ownership.
Record commands, exit codes, counts and build/source identity in each PR.
New tests/probes above are required work, not claimed results.
Retain graze, fixed-frame date edit, captured sub-day departure, reference and bounded
search input/results as the PR11 to PR15 conformance inventory before TS retirement.

## Precision result

Built from planning base `a3a258e1824888df2d3bdf70ceef8d35f9470221` plus the Precision diff.
The inspected development build is `aa8df9d947ad360fbd4cf40e`.
`campaign/moon-coordinates.test.ts:66` exercises 649 hourly epochs in four camera/size combinations,
through real frames and mesh transforms, with a 1 km ceiling for position and projection.
Temporarily omitting parent z makes all four cases fail at 8,402.2409 km; restoring it passes.
The graze remains a Rust conformance input in `packages/physics/test/lunar.test.ts:58`
and `campaign/lunar.test.ts:60`.

The correction exposed two visible Moon meshes at one centre. `campaign/three-scene.ts:129`
hides the primary while valid satellite data places its focused replacement.
Tests verify restoration when the overlay is off or its data is unavailable.

| Command | Exit and result |
|---|---|
| `npm run gates` | 0, 13/13 gates, 145 tests |
| `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts` | 0, 12 files, 124 tests |
| `npm run build` and `npm run build:prototype` | Both 0; existing large-chunk warnings remain |
| `node scripts/verify-game.mjs --steps scripts/verify-steps/lunar-flight.mjs` | 0, 3 contexts, 55 screenshots |
| Same browser command with `--base /starshot/` | 0, 3 contexts, 55 screenshots |

Final browser reports cover both renderers, graze launch identity, physical/enlarged symbols,
focused Moon drawing, tilted Free views, restoration, portrait, short landscape and reduced motion.
All listed screenshots were inspected. GPU readback warnings remain; browser errors and failed requests are zero.
Guide application starts in portrait; its existing short-landscape deck overlap remains PR3b work.
Later parts retain captured-request ownership and bounded search. They also retain loading and offline proof.

## Ownership guard result

Part 1 of Ownership: the guard and the commit boundary. Built from `73e1c64` on `codex/v1-session-policy`.
Paths start at `apps/game/src/campaign/`.
`contracts.test.ts:50` mutates an owned request in place: lunar `deltaVKmS`, nested `parking.phaseDeg` and planetary `vInf`.
On the unchanged tree every case still accepted the original worker echo, and the test exited 1.
`release.ts:19` adds `verdict`, which reads a stale generation before drift.
`accepts` now also fails when the owned request no longer has its captured key.
`use-launch-commit.ts` returns a drifted generation to aim with a notice at the gate, after success and after failure.
A stale generation, another pilot or another visit changes nothing, even when the owned request has drifted.
No production code writes a captured request today, so this reset is defensive.
A launch reply for another shot (`mismatch`) keeps the base behaviour: it is ignored and the release stays pending.

`commitLaunch`, `failPreview` and `releaseState` are hook bodies moved into plain functions the hooks call.
`launch-commit.test.ts` drives them through `owner-harness.test-support.ts`, with real `runLunar` replies.
Vitest does not collect that support module and no app code imports it. No React shim or dependency was added.

| Spec line | Proof |
|---|---|
| A mutated owned request fails its cached-key guard | `contracts.test.ts:50` and `:73`; `launch-commit.test.ts:145` and `:183` |
| A real preview for an older aim launches nothing for the newer release | `launch-commit.test.ts:65` |
| Old success and failure stay rejected after a newer request, even for an identical shot | `contracts.test.ts:43`; `launch-commit.test.ts:91` |
| Old answers, drifted or not, change nothing once the visit or the pilot changed | `launch-commit.test.ts:109` |
| A preview failure ends only the release waiting for its key | `launch-commit.test.ts:19` and `:77` |
| A successful commit writes the flight, clock, session, mark and snap | `launch-commit.test.ts:19` |
| Preview and launch fly one captured sub-day request identically | `lunar.test.ts:84` |

| Mutated guard | Killing test |
|---|---|
| `release.ts:21` stale before drift, `:22` drift and `:23` key match | `contracts.test.ts:50` and `:73`; `launch-commit.test.ts:91` |
| `use-launch-commit.ts:44` to `:49`, the gate reduced to `!preview` | `launch-commit.test.ts:65` |
| `use-launch-commit.ts:38` pending and in-flight checks; `:104` pending and preview checks | `launch-commit.test.ts:19` |
| `use-launch-commit.ts:55` visit and token checks; `:57` drift reported for any visit or pilot | `launch-commit.test.ts:109` |
| `use-launch-commit.ts:43`, `:62` and `:93` drift; `:64` summary; `:94` current failure | `launch-commit.test.ts:145` |
| `use-launch-commit.ts:63` mismatch read as accept | `launch-commit.test.ts:183` |
| `use-launch-commit.ts:94` failure for any generation; `:104` any key | `launch-commit.test.ts:91` and `:77` |
| `use-launch-commit.ts:69` to `:89`, each of the 16 writes of a successful commit | `launch-commit.test.ts:19` |
| `use-release.ts:69` to `:73`, each line of `cancel` | `launch-commit.test.ts:19`, `:77`, `:91` and `:145` |

Three single removals have no killing test, because each leaves behaviour unchanged.
`launchGate` at `use-launch-commit.ts:46` and `accepts` at `:47` imply each other after the drift check.
Dropping `this.generation !== generation` from `release.ts:21` is equivalent: a pending request carries the current generation.
Swapping `release.ts:21` and `:22` as written also fails `tsc -b`, because `owned` may be null there.

Size against `73e1c64`: 510 new contentful lines and 54 moved hook-body lines in 9 files.
Every non-blank added line counts, comments included. An added line is moved when a trimmed identical line left the same file.

Commands ran on `349ecc5` plus these test and note changes; production code is unchanged from `349ecc5`.
The development build is `953f8b0dd7be674f9d6c3b88`. Browser steps used `NODE_PATH="$(npm root -g)"` and set `STARSHOT_PROBE_OUT`.

| Command | Exit and result |
|---|---|
| `npm run gates` | 0, 13/13 gates, 155 tests |
| `npx vitest run apps/game/src/campaign` | 0, 5 files, 44 tests |
| `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts` | 0, 13 files, 134 tests |
| `npm run build` and `npm run build:prototype` | Both 0; existing large-chunk warnings remain |
| `node scripts/verify-game.mjs --steps scripts/verify-steps/screen-async.mjs`, at `/` and with `--base /starshot/` | Both 0, 3 contexts each; 4 stale replies ignored in each |
| Same two runs with `lunar-flight.mjs` | Both 0, 3 contexts and 55 screenshots each |
| Same two runs with `screen-flight.mjs` | Both 0, 3 contexts and 108 screenshots each |
| `node scripts/verify-web-release.mjs` | 0; offline launch, flight, update isolation and cache ownership pass at `/` and `/starshot/` |

## Ownership edits result

Part 2 of Ownership, based on the guard part at `c9fc706`. Paths start at `apps/game/src/campaign/`.
`use-hints.ts` moves the `applyGuide` body into `applyHint`, which the hook calls.
`use-restore.ts` moves restore's body and the owner switch into `restoreActions`, which `useRestore` and its layout effect call.
`aim-actions.test.ts` drives the production `aimActions`, `playbackControls`, `applyHint` and `restoreActions` through the shared harness.

| Spec line | Proof |
|---|---|
| Caller aim, parking or ET edits leave a captured request unchanged | `aim-actions.test.ts:158`, lunar and planetary |
| Launch captures the render ET; preview and launch get that request | `aim-actions.test.ts:36`, and `:57` for Plan and YOLO |
| Cancel, date, aim and mode edits reject old success and failure | `aim-actions.test.ts:71` |
| Date, phase and aim edits reject old preview success and failure | `aim-actions.test.ts:102` |
| Identical-shot owner switches reject old success and failure | `aim-actions.test.ts:131` through `restoreActions(...).select()`; visit and token alone in `launch-commit.test.ts:109` |
| Reference results never rewrite applied sessions or captured shots | `aim-actions.test.ts:171` |

`orbitPhase` refuses a phase edit while a release is pending, so no old launch answer exists for it to reject.
The switch test sets only `restoring.current = false` by hand: `useRestorePreview` does that once the restored preview arrives.
Restore's cancel alone already makes an old launch reply stale. The test asserts the new visit and token directly.
`launch-commit.test.ts:109` proves that each of those changes alone blocks a reply.

| Mutated guard | Killing test |
|---|---|
| `use-restore.ts:90` restore's cancel, `:91` visit increment and `:106` token assignment | `aim-actions.test.ts:131` |
| `use-hints.ts:40` copied parking and `:34` phase check | `aim-actions.test.ts:171` |
| `aim-actions.ts:118` render-clock freeze and `:122` owned preview request | `aim-actions.test.ts:36` |
| `aim-actions.ts:58` pull-cancel owner check | `aim-actions.test.ts:57` |
| `aim-actions.ts:33` and `:101` cancels, `playback-controls.ts:100` mode cancel | `aim-actions.test.ts:71` |
| `aim-actions.ts:84` phase refusal while pending | `aim-actions.test.ts:102` |

Two cancels have no killing test, because each repeats another cancel in the same call.
`cancel()` at `use-hints.ts:35` repeats the one inside `day()`.
`cancel()` at `aim-actions.ts:59` repeats the one `aim()` runs at `:33`, which it skips only while a launch snap runs.
The planetary branch of `applyHint` at `use-hints.ts:37` was not mutated; these tests apply only the lunar guide.
A build with a no-op `applyHint` fails `screen-flight.mjs` at `:89` (`hit` is false) and `lunar-flight.mjs` at its readiness wait after `:20`.
`screen-async.mjs` passes that build, because its Guide path only compares the flight with its preview.

Size against `c9fc706`: 286 new contentful lines and 16 moved hook-body lines in 8 files.
Of those, 268 are this part's own and 18 record the Search split and the handover packet.
That is 26 lines over the 260-line budget (deviation row 32).
That includes 13 lines of split records in `00-plan.md`, `03-work.yaml`, `05-deviation-log.md`, `06-resumption.md` and the Parts table.
Every non-blank added line counts, comments included. An added line is moved when a trimmed identical line left the same file.
Git keeps restore's body and the owner switch's two lines in place in `use-restore.ts`, so they are unchanged lines, not additions.

Commands ran on `c9fc706` plus this part's uncommitted changes. The development build is `c440e6b231031d0f8e4eba08`.
Browser steps ran as `NODE_PATH="$(npm root -g)" STARSHOT_PROBE_OUT=<folder> node scripts/verify-game.mjs --steps <step> [--base /starshot/]`.

| Command | Exit and result |
|---|---|
| `npm run gates` | 0, 13/13 gates, 162 tests |
| `npx vitest run apps/game/src/campaign` | 0, 6 files, 51 tests |
| `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts` | 0, 14 files, 141 tests |
| `npm run build` and `npm run build:prototype` | Both 0; existing large-chunk warnings remain |
| `screen-async.mjs` at `/` and at `/starshot/` | Both 0, 3 contexts each; 4 stale replies ignored in each |
| `lunar-flight.mjs` at `/` and at `/starshot/` | Both 0, 3 contexts and 55 screenshots each |
| `screen-flight.mjs` at `/` and at `/starshot/` | Both 0, 3 contexts and 108 screenshots each |
| `node scripts/verify-web-release.mjs` | 0; offline launch, flight, update isolation and cache ownership pass at `/` and `/starshot/` |

## Search core result

Part 1 of Search (deviation row 33), based on the Ownership edits part at `0a39ad4`. Paths start at `apps/game/src/sim/`.
`lunar-hint.ts` adds `findLunarHint`. `lunarHint()`, the 3.240 km/s par and the worker are unchanged.
An omitted or `reference` strategy returns `lunarHint()` itself. A search flies the reference, the coarse grid, then each seed's refinement.
By orchestrator ruling, each integer tuple flies at most once per search, and a seed's own tuple is not flown again.
Refinement adds at most 4 x 17 = 68 flights and a full search at most 236, tightening the spec's "at most 72 further calls".
Budgets 236 to 240 therefore give identical results. Measured coarse hits seed days 0, 25, 26 and 27, all at 3.150 km/s and 0 degrees.
A full search selects day 0, 2026-11-02 at 01:00 UTC, at 3.120 km/s and 0 degrees. It is the cheapest hit of a finite grid, not an optimum, and the 3.240 km/s par stays.

Open points, settled conservatively:
- The coarse grid flies by day, then burn, then angle, each ascending, without repeating the reference. A truncated budget flies a prefix of that order. PR11 to PR15 keep it as a conformance rule.
- A budget is validated for both strategies but bounds only the search, so a reference query with budget 0 still flies the reference once.
- A `null` strategy or budget is malformed, not omitted. `findLunarHint` is async because it awaits `afterFlight`.
- A null result has no count field; transport can count `afterFlight` calls, which the tests tie one to one to flights.

Tests count flights through `vi.mock` wrappers of the production `runLunar` (`lunar-hint.test.ts:14`) and of `simulateLunar` below it (`:19`).
The second wrapper also sees an integration that bypasses `runLunar`.

| Spec line | Proof in `lunar-hint.test.ts` |
|---|---|
| Repeatable order and results | `:71`; at `:136` every budget flies a prefix of that one order |
| Integer conversion, with every flown burn below the 3.55 km/s fuel budget | `:82` |
| Fixed frame and date, for every flight and for a returned day-26 route | `:92` and `:199` |
| The selected route replays through `finalRequest` to the same analysis | `:101` |
| Reference strategy, par and first searched flight, with one integration each | `:117` |
| Budgets 0, 1, 2, 167, 168, 169, 235, 239 and 240 fly 0, 1, 2, 167, 168, 169, 235, 236 and 236, at both layers | `:136` |
| Invalid budgets and unknown strategies reject before any integration | `:155` |
| `afterFlight` awaited once after each flight; a yielding hook changes nothing | `:169`, `:178` and `:71` |
| Cost order, seeds and refinement | `:218`, `:225` and `:232` |

Real flights always select a day-0 prograde route, so `:199` uses a controlled runner instead.
In it only day 26 at 3.240 km/s and -20 degrees hits, and the whole returned hint is compared.
The sweep at `:136` flies 1,214 real simulations in 15.7 to 15.8 s over two runs here, under a 120 s timeout. The file takes about 22 s.

There are 84 distinct mutants of `lunar-hint.ts`: 72 from the builder's sweep and 12 from review, labelled N1 to N11 and X5 below. 75 fail a test.
Review also reran nine of the builder's mutants with the same results: an unawaited search hook and the eight that change nothing.
Each mutant was restored and checked with `cmp`.

| Mutated line in `lunar-hint.ts` | Killing test |
|---|---|
| `:26` each `byCost` term dropped, day before burn, burn descending | `:218`; dropping or reversing burn also `:71` and `:136` |
| `:22` three or five seeds, `:31` unsorted, `:32` distinct-day rule dropped | `:225`; three and unsorted also `:71` |
| `:39` and `:40` loops swapped, offsets mirrored, burn or angle not seed-relative, day 0; `:20` and `:21` other steps | `:232`; most also `:71` |
| `:16` other reference, `:98` reference skipped; `:17`, `:99`, `:18` and `:19` other coarse days, burns or angles | `:71` and `:136` |
| `:74` key without angle, `:75` no dedupe or a repeat stopping the search, `:107` refining every hit | `:71` and `:136` |
| `:76` guard `>` or removed, `:78` no count; `:95` first or last hit; `:96` validation flight, hits counted | `:136`; most also `:71` |
| `:81` angle scale or burn off by one | `:71`, `:136` and `:199` |
| `:80` 00:00 UTC, `:83` radius, `:84` moving frame, fixed epoch or phase 226 | `:92` and `:199` |
| `:86` every flight a hit, `:87` closest dropped, `:89` labelled `curated` | `:199`; also `:101` or `:117` |
| `:88` hint on day 0, at `LAUNCH_ET`, with a fixed epoch, a moving frame or angle 0 (N1 to N5) | `:199` |
| `:95` a hidden `lunarHint()` or `simulateLunar` call (N6, N7) | `:117` and `:136` |
| `:65` the reference flown twice (N8); `:64` reference skipped at budget 0 (N9) | `:117` |
| `:85` and `:91` `afterFlight` before, unawaited, missing or only on hits; `:66` none or unawaited (N10) | `:169` or `:178` |
| `:66` `afterFlight` moved before the reference flight (X5); it passes the 13 tests at `54c9be7` | `:178` |
| `:56` default `search`; `:57` default budget 100 | `:117`; `:71` |
| `:56` and `:57` null as omitted; `:58` and `:61` each check dropped; `:59` and `:62` plain `Error` | `:155` |
| `:61` 0 rejected; 240 rejected | `:136`; every test |

Nine mutants leave behaviour unchanged. Once `:76` refuses, every later new tuple is refused too.
So a late dedupe, an early `seen` mark, or continuing at `:98`, `:102` or `:109`, changes nothing.
Counting after the synchronous flight at `:78` is the same. At `:81`, `burn * 0.001` equals `burn / 1000` for every grid burn, 3100 to 3240.
Likewise `angle * 0.01` (N11) equals `angle / 100` for every grid angle, -2500 to 2500. A default of 239 at `:57` equals 240, because the grid holds 236 flights.

Size against `0a39ad4`, counted as deviation row 34 counts it: 417 contentful added lines and none moved in 7 files.
That is 115 code, 234 test, 66 result-note, 1 changelog and 1 deviation-log line: 137 over the 280-line budget and 17 over the 400-line cap.
Row 34 records this total. The total is a warning below the 800-line failure. Nothing was compressed.

Commands ran on `54c9be7` plus the uncommitted review fixes.

| Command | Exit and result |
|---|---|
| `npm run gates` | 0, 13/13 gates, 175 tests |
| `npx vitest run apps/game/src/sim` | 0, 2 files, 18 tests |
| `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts` | 0, 15 files, 154 tests |
| `npm run build` and `npm run build:prototype` | Both 0; existing large-chunk warnings remain |
| `node scripts/check-copy-tells.mjs` and `node scripts/check-secrets.mjs` | Both 0 |
