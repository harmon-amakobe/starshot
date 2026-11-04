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
| Loader | 240 | 8 | Memoized dynamic loader with retry; the scene takes a nullable model each frame, still passed eagerly |
| Readiness | 320 | 12 | Launch, pulling and Guide gated on the model, the matching preview enforced at commit (deviation row 41), with the preview-key fixes; still eager |
| Lazy | 340 | 12 | The main thread loads the rail on demand, with the loading and retry panel and the `lunar-loading.mjs` browser probe (deviation row 42) |
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
The Loading work is three parts (deviation row 39). Loader adds `sim/load-lunar-model.ts`
to memoize main-thread dynamic loading with absent/loading/ready/failed states and retry
after failure. Readiness gates the controls, and Lazy switches the main thread to it.

Pass the ready model through `CampaignScene`, `makeFrame`, `scene-geometry` and
`worldFor`. `use-view` or the scene owns loading, never request construction.
Keep renderer and worker mounted. While loading, never display an old planetary
frame as Moonshot or advance lunar time unseen. Show loading/error with explicit
retry; gate lunar pulling and Launch until scene and matching preview are ready (as
ruled in deviation row 41, controls gate on the scene and the commit waits for the preview).
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
and `scripts/verify-lunar-loading.mjs --dist apps/game/dist` as focused probes. The Lazy
part supplies `lunar-loading.mjs` as its own proof; Evidence adds the bundle checker.
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

## Search transport result

Part 2 of Search (deviation row 33), based on Search core at `6032f07`. Paths start at `apps/game/src/sim/`.
`worker-handler.ts` holds the worker's handler apart from `self`; `sim.worker.ts` keeps the ephemeris and the message loop and calls it.
Lunar queries go through `findLunarHint`, so an omitted strategy flies the reference. The player's Guide still sends `{ kind: 'lunar' }`.
After each flight the handler awaits a zero-delay `setTimeout`, a macrotask, so a preview queued during a search is answered between flights.
Moon replies add `strategy`, `grid` (`moon-grid/1`, `LUNAR_GRID` at `lunar-hint.ts:17`) and `simulations` (`protocol.ts:30` to `:32`). Planetary replies keep their four fields.

Open points, settled conservatively:
- The count is the number of `afterFlight` calls (`worker-handler.ts:30`), which Search core's tests tie one to one to flights. `findLunarHint` and its tests stay unchanged; returning `{ hint, simulations }` would change both for no new information.
- No production seam starts a search. `scripts/verify-steps/lunar-worker.mjs` wraps `window.Worker` in an init script, as `screen-async.mjs` does, and posts its queries on the app's own worker with ids from 900001.
- The app drops replies to ids it did not issue (`useSimulation.ts:91`), so a search reply reaches no state. The wrapper exists only in the probe's browser context.
- `use-hints.ts` is unchanged, so its visit and token guards and the 2-star guide cap remain. `apps/game/README.md` states no hint limit that changed.

| Spec line | Proof |
|---|---|
| Omitted strategy means reference; strategy, grid and real flight count, even for no route | `worker-dispatch.test.ts:112`, budget 0 gives null and 0; `:141`, real flights read as misses give null and 2 |
| Positive budgets include the reference | `worker-dispatch.test.ts:112`, budgets 1 and 2, first flight the reference request |
| Invalid budgets and unknown strategies use the error reply | `worker-dispatch.test.ts:155`; `lunar-worker.mjs:63` for budget 241 |
| A macrotask after each flight; a queued preview answered first, with the same ids | `worker-dispatch.test.ts:47`, a controlled scheduler holding each timer, for a search and at `:73` the reference; `:88` through the real `sim.worker.ts` loop; `lunar-worker.mjs:86` |
| Preview and launch fly one canonical request to identical samples and analysis | `worker-dispatch.test.ts:83` to `:86`; `lunar-worker.mjs:91` to `:93` |
| Planetary hints and shots unchanged | `worker-dispatch.test.ts:165`, strict equality with direct `findHint` and `simulateShot` |
| One worker; search completion changes no aim | `lunar-worker.mjs:73`, `:74` and `:77` |

The probe prewarms with the player's Guide (reference, 1 flight) and a budget-0 search, then starts a default search and fills 3.2 km/s.
In six contexts, phone, desktop and reduced motion at `/` and `/starshot/`, replies came in the order 1, 2, 3, 900001, 900002, 4, 900003, 5.
Preview 4, posted 240 to 344 ms into a search of 2,369 to 2,730 ms, answered in 45 to 69 ms; the idle preview after the guide took 37 to 59 ms.
Each search flew 236 simulations and selected day 0 at 3.120 km/s, as in Node. Times are headless Chromium page-clock milliseconds, post to reply.
Interleaving was measured only in Chromium. WebKit and Firefox are unmeasured, not passed.

The zero-delay timer has a cost. In a later run at `/`, full searches took 2,479 to 2,705 ms, and 1,402 to 1,627 ms with a `MessageChannel` post as the yield.
That is 4.2 to 4.6 ms more per flight in the worker, as the [HTML timer rule](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers) predicts: nested timers past level 5 wait at least 4 ms.
Previews in those six contexts answered in 40 to 104 ms. The yield stays as built; PR3b can take the `MessageChannel` option.

There are 31 unit mutants of `worker-handler.ts`, `sim.worker.ts` and `lunar-hint.ts`, all killed, and two browser mutants, both killed. Each was restored and checked with `cmp`.

| Mutated line | Killing test |
|---|---|
| `worker-handler.ts:12` yield as `queueMicrotask` or `Promise.resolve()`, as `setImmediate`, or with a 4 ms delay | `worker-dispatch.test.ts:47` |
| `:31` yield unawaited, removed, doubled or only for a search; `:29` an extra yield before the search | `:47` |
| `:30` no count or a double count | `:47`, `:112` and `:141` |
| `:36` count read from the returned hint | `:141` |
| `:34` omitted strategy reported as search | `:47` and `:112` |
| `:36` strategy, grid or id dropped or changed; `lunar-hint.ts:17` another grid id | `:47`, `:112` and `:141` |
| `:29` the old `lunarHint()` for every Moon query; `:25` the Moon query test inverted | `:47`, `:112`, `:141` and `:155`; inverted also `:165` |
| `:44` rejection not awaited; `:46` error id or message | `:155` |
| `:19` Moon shot id or purpose | `:47` |
| `:23` planetary shot id or purpose; `:38` planetary hint budget; `:39` planetary id or an extra undefined field | `:165` |
| `sim.worker.ts:16` to `:18` one message at a time (review mutant S1); `:17` the reply posted unawaited | `:88`; in the browser, unawaited also times out at `lunar-worker.mjs:48` |
| Browser: `worker-handler.ts:12` microtask yield | `lunar-worker.mjs:86` |

No test reads `ms`, which is wall time. `:88` imports the real `sim.worker.ts` on a stubbed `self`.
CI's verify-game job passes no `--steps` (`.github/workflows/ci.yml:109` and `:110`), so the browser steps above run by hand.

Size against `6032f07`: 399 contentful added lines and 16 moved in 11 files. Every non-blank added line counts, comments included.
A handler line is moved when a trimmed identical line left `sim.worker.ts`: one import, the handler body, and its try and catch lines. Nothing was compressed.
That is 41 code, 179 test, 114 probe, 60 result-note, 3 README and architecture, 1 changelog and 1 deviation-log line: 159 over the 240-line budget and 1 under the 400-line cap (row 35).

Commands ran on `46c4873` plus the uncommitted review fixes, which change no production code. The development build is `3dc2b7d9cb1c0bf0dee20611`.
Browser steps ran as `NODE_PATH="$(npm root -g)" STARSHOT_PROBE_OUT=<folder> node scripts/verify-game.mjs --steps <step> [--base /starshot/]`.

| Command | Exit and result |
|---|---|
| `npm run gates` | 0, 13/13 gates, 181 tests |
| `npx vitest run apps/game/src/sim` | 0, 3 files, 24 tests |
| `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts` | 0, 16 files, 160 tests |
| `npm run build` and `npm run build:prototype` | Both 0; existing large-chunk warnings remain |
| `lunar-worker.mjs` at `/` and at `/starshot/` | Both 0, 3 contexts and 9 screenshots each; the later run at `/` and its `MessageChannel` build also 0 |
| `screen-async.mjs` at `/` and at `/starshot/` | Both 0, 3 contexts each; 4 stale replies ignored in each |
| `node scripts/verify-web-release.mjs` | 0; offline launch, flight, update isolation and cache ownership pass at `/` and `/starshot/` |
| `node scripts/check-copy-tells.mjs` and `node scripts/check-secrets.mjs` | Both 0 |

## Model result

Based on the D40 window checkpoint at `6f88454`, above Search transport at `e3714f5`. Paths start at `apps/game/src/`. Loading stays eager.
`sim/lunar-request.ts` builds Moon requests from constants alone, and `campaign/contracts.ts:5` imports it directly.
`sim/lunar-model.ts` is the only module that imports the rail, and it holds the shared `lunarModel`.
`sim/lunar.ts` keeps `runLunar` and `lunarHint`, imports both new modules and re-exports nothing. The worker still reaches it only by the dynamic imports at `sim/worker-handler.ts:18` and `:26`.
`worldFor`, `geometry` and `makeFrame` take a required `model: LunarModel` last; `CampaignScene` takes it as a third constructor argument. `campaign/use-view.ts:22` passes the shared instance.
The 8 moved lines are the rail import and the instance (`sim/lunar.ts:2` and `:9` at base) and `lunarRequest` with its guard (`:10` to `:15`), unchanged.

Open points, settled conservatively, and inputs for Loading:
- The model is the non-null `LunarModel`, the spec's ready model. No planetary frame reads it: `campaign/frame.ts:19` draws only the Sun and planets there. The planetary path needs it only through the required parameters (`campaign/world.ts:11`, `campaign/scene-geometry.ts:22`, `campaign/frame.ts:8`) and `campaign/scene.ts:29`. Loading must let those accept an absent model on planetary levels.
- `CampaignScene` receives the model once, as a readonly constructor argument, and `use-view.ts` builds the scene in a mount-only effect. A model that arrives after mount needs a setter or a per-frame argument; that is Loading's choice.
- Of the two owners the spec allows, the view hook holds the model and the scene receives it. Neither builds a request.
- The `moonOrbits` cache (`campaign/scene-geometry.ts:10`) is a `WeakMap` of per-model day maps, because a day key alone would draw one model's orbit for another. The 161 samples, the sidereal period and the 32-entry clear are unchanged.
- "No rail import through a barrel" is a Vitest guard, not a new gate: `scripts/gates.mjs` is harness.
- The scan counts as a re-export any `export ... from` either module, and a binding imported from one and exported again by name, as the default or as a new constant, typed or not. Using the binding is not one.
- The `86400` literals stay, so the moved lines still count as moved. `DAY` can replace them in a later physics part; the value is identical.

| Spec line | Proof |
|---|---|
| Request construction is pure; contracts imports it directly | `sim/lunar-request.test.ts:45`: contracts, the scene and the worker handler load the rail 0 times, then `./lunar-model` loads it once |
| No rail import may enter through a barrel | `:70`, the rail's only importer is `sim/lunar-model.ts`; `:74`, nothing re-exports either module, with controls at `:57` |
| `sim/lunar-model.ts` owns the shared instance | `:71`, `new LunarModel` appears only there |
| Worker simulation stays in its dynamic graph | `:45`, the worker-handler entry; `:77`, the runner's importers are exactly the worker's `sim/lunar-hint.ts` and `sim/worker-handler.ts` and the tests' shared harness |
| The ready model passes through `CampaignScene`, `makeFrame`, `scene-geometry` and `worldFor` | Typecheck, as the parameter is required; `campaign/lunar.test.ts:185`, a model 1% wider drawn on a day the shared model drew |
| `use-view` or the scene owns loading, never request construction | `sim/lunar-request.test.ts:73`, the model's importers are exactly `campaign/use-view.ts` and `sim/lunar.ts` |
| The move changes no request | `:85`, the 35 degree guard; `:92`, the one frozen settings object |

There are 45 production mutants: 43 killed and 2 equivalent, none surviving. Seven more mutate the guard's own helpers, all killed.
Vitest ran with `--fsModuleCache=false`, and each mutant was restored and checked with `cmp`. Lines without a file are in `sim/lunar-request.test.ts`.

| Mutant | Killing test |
|---|---|
| `campaign/contracts.ts:5` back to `../sim/lunar` | `:51`, 8 tests in `campaign/lunar.test.ts`, and typecheck (TS2459) |
| The same, with `sim/lunar.ts` re-exporting `lunarRequest`, which passes typecheck | `:51` and `:74` |
| `sim/lunar-request.ts` imports `lunar-model`, or the rail | `:51`, and `:73` or `:70` |
| `world.ts`, `scene-geometry.ts` or `frame.ts` uses the shared `lunarModel`, not its parameter | `:51`, `:73`, and `campaign/lunar.test.ts:193` or `:194` |
| `scene.ts` passes the shared `lunarModel` to `makeFrame` | `:51` and `:73` |
| A static `./lunar` import in `sim/worker-handler.ts` | `:51` only |
| `campaign/aim-actions.ts` imports `runLunar` from `../sim/lunar` | `:77` only; typecheck passes |
| `sim/lunar-model.ts` builds from an empty rail | `:54`, `:70` and 8 tests in `campaign/lunar.test.ts` |
| A second rail import in `sim/lunar.ts`, or its own `new LunarModel(rail)` | `:70` |
| `use-view.ts` builds a second `LunarModel` | `:71` |
| `sim/lunar.ts` re-exports by `export from`, `export *`, by name or as a new constant | `:74` |
| `sim/lunar.ts` exports `lunarModel` as a typed constant | `:74`, with its control at `:63` |
| `use-campaign.ts` or `aim-actions.ts` imports `lunar-model` | `:73` |
| The `moonOrbits` cache keyed by day only | `campaign/lunar.test.ts:194` |
| The `moonOrbits` day key made constant | `campaign/lunar.test.ts:198`; it survived every test at base |
| The guard as `<=` or `>=`, a bound of 34 or 36 on either side, removed, or `Error` for `RangeError` (8) | `:87` to `:90`; all 8 pass the 76 other sim and campaign tests |
| `settings: { ...SETTINGS, rtol: 1e-8 }` | `:93` only; the 80 other sim and campaign tests pass |
| `stopAtEntry` false or dropped | `campaign/lunar.test.ts:44` and `:72` |
| `approachRadiusKm` 65000 or dropped | `campaign/lunar.test.ts:68` |
| `parking` aliased, not copied | `campaign/aim-actions.test.ts:168`, in the test at `:158` |
| `model` dropped at `scene-geometry.ts:23`, `:29` or `:32`, `frame.ts:9`, `scene.ts:41` or `use-view.ts:22` | `node scripts/gates.mjs --only typecheck`, exit 1 for each (TS2554) |
| Guard helpers: each regex never matching (3), `reexports` always true, no count, the control first, a flat walk | `:59`, `:61`, `:61`, `:66`, `:54`, `:51` and `:70` |

Equivalent: dropping `settings` leaves the one `requestFor` sets (`packages/physics/src/lunar/flight.ts:32`). A relative import of the same rail file is still counted by the mock and seen by the scan.
The count is cumulative, so the guard shows that an entry loaded the rail, not which one.

The eager baseline for Loading: the rail is in two built chunks. They are the main entry `index-*.js` (988,681 bytes) and the worker's lazy `lunar-*.js` (99,316 bytes), which `sim.worker-*.js` and `lunar-hint-*.js` load.
A build of the base put the rail in the same two chunks, at 988,600 and 99,327 bytes.
In `lunar-worker.mjs` each search flew 236 simulations. Previews posted during a search answered in 77 to 112 ms, and searches took 3,790 to 4,049 ms.
The base on the same machine gave 78 to 108 ms and 3,816 to 3,960 ms, so the gap to the Search transport figures comes from the machine, not this part.

Size against `6f88454`: 244 contentful added lines and 8 moved in 19 files, against a budget of 280 lines and 16 files. Every non-blank added line counts, comments included.
That is 41 code, 130 test, 66 result-note, 1 changelog, 1 deviation-row and 5 handover-packet lines. Moved lines are trimmed-identical lines removed elsewhere in the diff. Nothing was compressed (row 37).

| Command | Exit and result |
|---|---|
| `npm run gates` | 0, 13/13 gates, 188 tests |
| `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts` | 0, 17 files, 167 tests |
| `npm run build` and `npm run build:prototype` | Both 0; existing large-chunk warnings remain |
| `lunar-flight.mjs`, `screen-flight.mjs` and `lunar-worker.mjs`, each at `/` and at `/starshot/` | All 6 exit 0 on the final tree, 3 contexts each: console 0, page errors 0, failed requests 0, no target under 44 px |
| `node scripts/verify-web-release.mjs` | 0; offline launch, flight, update isolation and cache ownership pass at `/` and `/starshot/` |
| `node scripts/check-copy-tells.mjs` and `node scripts/check-secrets.mjs` | Both 0 |

## Loader result

Based on the D41 checkpoint at `cab3844`, above Model at `067e5f9`. Paths start at `apps/game/src/`. Loading stays eager.
`sim/load-lunar-model.ts` adds `createLunarModelLoader(importer)`, with `state`, `model` and `load()`, and the default `lunarModelLoader`, whose importer is `() => import('./lunar-model')`. No production module imports it yet.
`CampaignScene` takes no model at construction. `update(state, model)` (`campaign/scene.ts:35`) passes it to `makeFrame` each frame, and `campaign/use-view.ts:38` passes the shared `lunarModel`. The renderer stays mounted.
`makeFrame`, `geometry` and `worldFor` take a required `model: LunarModel | null`. `worldFor` reads it only through `loaded()` (`campaign/world.ts:11`), which throws on null, and returns the narrowed `moonModel`, which `geometry` reads.
`DAY` replaces `86400` at `campaign/scene-geometry.ts:14` and `:17` and at `sim/lunar.ts:19`. That closes findings row 8.

Open points, settled conservatively, and inputs for Readiness:
- The loader exposes `state`, `model` and `load()`, nothing more. It has no subscription and keeps no error: `load()` resolves or rejects, and a consumer sets its own state from that.
- Without the model, a lunar frame throws `The Moon model has not loaded, so the Moon cannot be drawn.` A planetary frame that asks for the Moon, as a `moon` focus would, throws the same. No other planetary path reads the model.
- `CampaignScene.update` sets its release state and canvas size before `makeFrame` throws, and `use-view.ts` shows the throw as its error text. Readiness or Lazy must not draw a lunar level before the model is ready.
- Findings row 9: the guard still counts `*.test-support.ts` files and type-only imports as importers. An extra importer can only fail the guard, so counting them errs closed.
- `campaign/scene.ts:52` keeps a `86400` in the planetary orbit key. Row 8 did not name it.

| Spec line | Proof |
|---|---|
| Lazy start, one shared pending promise, ready reuse | `sim/load-lunar-model.test.ts:39`, with an injected importer |
| A failure sets `failed` and the next call retries | `:56` |
| The default instance does not load the rail on import, and loads it once when asked | `:28`, with the rail counter; `sim/lunar-request.test.ts:75` pins the loader as an importer |
| Every planetary level draws with a null model | `campaign/lunar.test.ts:231`: 4 levels, 4 cameras, map on and off, 4 focus values, each frame equal to the one drawn with the model |
| A lunar level with a null model throws, with no fallback | `:240`, with a planetary Moon focus as the second case |
| The scene takes the model each frame, without a rebuild | `:248`: one scene draws a planet, refuses Moonshot without the model, then draws its Moon with it |
| Drawing is unchanged | The frame tests in `campaign/lunar.test.ts`, `campaign/contracts.test.ts` and `campaign/moon-coordinates.test.ts` pass unedited |

There are 23 production mutants, all killed: 18 by Vitest, 4 by typecheck and 1 by the browser probe. Vitest ran with `--fsModuleCache=false` on the 5 affected test files, and each mutant was restored and checked with `cmp`.

| Mutant | Killing test |
|---|---|
| The memo is never cleared on failure, or `failed` is never set | `sim/load-lunar-model.test.ts:56` |
| A second call starts a second import, or a ready model is imported again | `:39` |
| The loader imports `./lunar-model` statically | `:28` |
| `loading`, `ready` or the kept model dropped, or the importer called at creation (4) | `:39` and `:56` |
| A lunar null model falls back to an empty-rail stand-in | `campaign/lunar.test.ts:240` and `:248`, and `sim/lunar-request.test.ts:72` |
| A planetary Moon read falls back to Earth | `campaign/lunar.test.ts:240` |
| The planetary path reads the model, for every body or for Earth when present (2) | `:231`, with 3 or 1 tests in `campaign/contracts.test.ts` |
| `loaded()` without its null check, or `geometry` drawing a Moon orbit on every level (2) | `:240` and `:248`, and `:231` for the orbit |
| `makeFrame` passes `null` to `geometry` | `:240`, `:248`, 4 older frame tests and 4 in `campaign/moon-coordinates.test.ts` |
| The scene passes `null`, or keeps the first model it gets (2) | `:248` only |
| The model argument dropped at `use-view.ts:38`, `scene.ts:42`, `frame.ts:10` or `scene-geometry.ts:23` (4) | `node scripts/gates.mjs --only typecheck`, exit 1 each (TS2554) |
| `use-view.ts:38` passes `null` | Typecheck and Vitest pass; `lunar-flight.mjs:18` exits 1, as no frame is drawn |

Size against `cab3844`: 236 contentful added lines and 0 moved, in 12 files, against a budget of 240 lines and 8 files. That is 62 code, 128 test, 45 note and 1 changelog lines; the orchestrator's split records are counted apart. The spec's own list is 8 files; `sim/lunar.ts`, the null-model tests in `campaign/lunar.test.ts`, the changelog and this note add 4. Nothing was compressed.
The entry `index-*.js` is 988,786 bytes, against 988,681 at the base; the loader is in no chunk. The worker's `lunar-*.js` is 99,312 bytes.

| Command | Exit and result |
|---|---|
| `npm run gates` | 0, 13/13 gates, 194 tests |
| `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts` | 0, 18 files, 173 tests |
| `npm run build` and `npm run build:prototype` | Both 0; the existing large-chunk warning remains |
| `lunar-flight.mjs` at `/` | 0 on the final tree, 3 contexts: page errors 0, failed requests 0, no target under 44 px. The phone context logs 4 Chromium "GPU stall due to ReadPixels" warnings, as the base build does on this machine |
| `node scripts/check-copy-tells.mjs` and `node scripts/check-secrets.mjs` | Both 0; no copy finding on a line this part added |

## Readiness result

Based on Loader at `ce5a10f`. Paths start at `apps/game/src/`. Loading stays eager.
`sim/useSimulation.ts:31` adds `PreviewQueue`, the hook's preview bookkeeping, which the hook now calls. It queues a `structuredClone` of each shot (`:42`), so the answered key is the key of the request posted (findings row 1). No production caller mutates a shot: both pass a fresh `finalRequest` (`campaign/use-campaign.ts:28`, `campaign/aim-actions.ts:125`), but nested arrays are shared (row 2). A failed answer clears the last key while it is still the last asked (`:62`), and a worker error clears it (`:69`), so the same shot can be asked again (row 3).
`campaign/lunar-readiness.ts:18` returns `scene` and a visible `reason`; `ownedCallback` (`:35`) binds a late callback to its pilot, visit, mission and view. `CampaignApp.tsx:82` computes readiness once per render for `FlightDeck` and `AimHandle`, and writes `c.release.readiness` for the actions and gestures.
Without the Moon model, Launch, Guide and the aim handle with its keys are disabled. Each is described by `#c-launch-wait`, a visible line above Launch that reads "Loading the Moon." and moves nothing (`FlightDeck.tsx:110` to `:140`, `AimHandle.tsx:26` to `:39`). A pull (`gestures.ts:31`) and the launch guard (`aim-actions.ts:120`) need the model too.
One deviation: row 3 named failed answers, and a worker error clears the last key too.

Open points and inputs for Lazy:
- Ruling: pull and every control gate on the model; the matching preview is enforced at commit by `launchGate`, so a coasting orbit can still launch and guide (`campaign/use-launch-commit.ts:45` to `:47`, where `accepts` also rejects a mismatched shot). The builder's preview gate and its five browser-step edits were reverted.
- `use-view.ts:46` returns the eager model. With the loader's null model, `scene` is false and the line reads "Loading the Moon." The panel and Retry are Lazy's.
- Settle the load through `ownedCallback({ ...hydration, mission: () => store.current.current.levelId, disposed })`, with `disposed` set in the view effect's cleanup.
- The pull gate (`gestures.ts:31`) is pinned by `lunar-readiness.test.ts:152`. With the model always present, only the ref write (`CampaignApp.tsx:83`) cannot be killed here. `lunar-loading.mjs` should try a pull and Enter while loading. The hook's calls into `PreviewQueue` have no React test.
- Row 14: the camera focus is never saved and resets on a pilot change or level pick (`CampaignApp.tsx:91`, `pick`), and a planetary frame lists no Moon (`campaign/frame.ts:20`). A saved planetary pilot never waits on the rail. Lazy should still refuse a planetary `inspectBody('moon')` or load the model behind the panel.

| Spec line | Proof |
|---|---|
| Answered key is the posted request's | `sim/preview.test.ts:79`, a shared array edited between queue and post; failed before the fix |
| A failed preview can be asked again | `:93` and `:108`, failed before the fix |
| Planetary at once; a Moon level waits for its model | `campaign/lunar-readiness.test.ts:20` and `:23` |
| Launch waits for the matching preview, from a coasting orbit too | `:42`, added; `campaign/launch-commit.test.ts:65` and `campaign/aim-actions.test.ts:102` already pinned it |
| The launch guard; the aim handle; Launch and Guide | `lunar-readiness.test.ts:30`, `:75` and `:81`, the last two on rendered controls |
| Late callbacks: disposal, owner, visit, mission | `:98` each alone, `:115` through `restoreActions` |
| A coasting orbit keeps Launch and Guide, with no wait reason | `screen-flight.mjs:28` to `:34` |

There are 26 production mutants, all killed, each restored and checked with `cmp`. Vitest ran with `--fsModuleCache=false` on the four affected test files.

| Mutant | Killing test |
|---|---|
| The rule ignores the model, or gates a planetary level (2) | `lunar-readiness.test.ts:23` and `:20` |
| Each late-callback dimension ignored (4) | `:98` |
| The guard skips readiness | `:30` |
| The handle's disabled state, arrows, Enter or description ungated (4) | `:75` |
| Launch or Guide not disabled, either without its description, or no reason line (5) | `:81` |
| The queue keeps the caller's live shot; `lastKey` kept after a failed answer or a worker error, or cleared for a newer shot (4) | `sim/preview.test.ts:79`, `:93`, `:108` and `:108` |
| The commit launches on any preview | `lunar-readiness.test.ts:42`; the two older tests fail only by timeout |
| Launch or Guide disabled on a coasting orbit, or `CampaignApp` passes no model (3) | `screen-flight.mjs`, exit 1 at `:32` each |
| `FlightDeck` gets no readiness | `node scripts/gates.mjs --only typecheck`, exit 1 (TS2741) |
| A pull starts without the model (`gestures.ts:31`, added at review) | `lunar-readiness.test.ts:152` |

Size against `ce5a10f`: 395 contentful added lines and 1 moved, in 16 files, against a budget of 320 lines and 12 files, review fixes included (deviation row 41). That is 147 code, 194 test, 7 browser-step, 46 note and 1 changelog lines; nothing was compressed. The extra files are the view and release plumbing, the test harness and one CSS line.
The entry `index-*.js` is 989,705 bytes, against 988,786 at Loader; the worker's `lunar-*.js` is 99,312.

| Command | Exit and result |
|---|---|
| `npm run gates` | 0, 13/13 gates, 205 tests |
| `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts` | 0, 19 files, 184 tests |
| `npm run build` and `npm run build:prototype` | Both 0; the large-chunk warning remains |
| `lunar-flight.mjs`, `screen-flight.mjs`, `lunar-worker.mjs`, `screen-async.mjs`, `screen-split.mjs` and `screen-restore.mjs` at `/`, and `lunar-flight.mjs` at `/starshot/` | All 7 exit 0, 3 contexts each: page errors 0, failed requests 0, no target under 44 px. The phone logs 4 GL driver warnings, as at Loader. `screen-restore.mjs` reads the output of `screen-flight.mjs` |
| `node scripts/check-copy-tells.mjs` and `node scripts/check-secrets.mjs` | Both 0; no copy finding on a line this part added |

## Lazy result

Based on Readiness at `65969fa`. Paths start at `apps/game/src/`. The main thread now loads the Moon rail on demand.
`campaign/use-view.ts` no longer imports `lunarModel`. Its load effect (`:24` to `:30`) runs again when the Moon level, pilot or visit changes and calls `lunarLoadRun` (`campaign/lunar-readiness.ts:63`). A planetary level gets null and loads nothing. A Moon level loads through `lunarModelLoader` with a disposal flag of its own run, and success and failure settle through `ownedCallback` with the `useHydration` refs (`hydrationRefs`, `campaign/use-campaign.ts`) and the session's level id. Retry loads again through the same owner.
While a Moon level waits, the draw loop holds lunar time and skips `scene.update` (`use-view.ts:47` to `:52`). On the switch, a layout effect clears both canvases (`campaign/scene.ts:140`) and resets the frame to `EMPTY_FRAME` before the browser paints (`use-view.ts:32` to `:37`). The camera controls and gestures ignore that undrawn frame, and the target cue hides.
The reason reads "Loading the Moon." or "The Moon could not load." `MoonLoadPanel` (`campaign/FlightDeck.tsx:179`) shows it above the deck, with Retry (named "Retry loading the Moon") after a failure, and the polite live region announces it. Focus goes to the panel while Launch is disabled.
Findings row 14: a planetary level refuses a Moon focus before any focus state is written (`campaign/use-camera-views.ts:61`). Row 17: Apply guide and both fine-aim inputs wait for the model. Row 15: the reason line covered the orbit slider's 44 px box by 6 to 11 px at every size measured. It now takes its own row in `.c-actions` (`campaign/campaign.css:42`), and the deck grows about 19 px while the Moon loads.

Retry, measured: Chromium 153.0.8010.12 under Playwright 1.63.0 keeps a failed dynamic import for the life of the page. After an abort, a 500 or a held abort, three `import()` calls of one URL made 1 request, and all three rejected. So a retry imports the same chunk under `?retry=n` (`sim/load-lunar-model.ts:36`). The build names the chunk in a `starshot-moon-chunk` meta tag (`apps/game/vite.config.ts`) and fails unless there is exactly one. An emitted chunk URL was rejected: Rolldown then moved shared code into a new static chunk and ignored `implicitlyLoadedAfterOneOf`. The service worker serves the chunk from its cache and drops the query (`apps/game/public/sw.js:29` to `:33`).

| Build | Entry `index-*.js`, raw / gzip | Moon chunk `lunar-model-*.js`, raw / gzip |
|---|---:|---:|
| Readiness `65969fa` | 989,705 / 295,350 | none: the rail is in the entry |
| Lazy | 898,845 / 245,651 | 93,176 / 47,024 |

Gzip is `gzip -9` output in bytes. The worker's `lunar-*.js` stays 99,312 bytes.
`scripts/verify-steps/lunar-loading.mjs` runs in every verify-game context. It removes the release service worker from its pages, because `page.route` never sees a chunk the worker answers from cache. `scripts/verify-game.mjs` gives a step `intend(url)`. Each call excuses one failed request for that exact URL and one "Failed to load resource" line for it, counted apart (`:99` to `:113`). Scratch canaries: a declared failure exits 0; adding an undeclared URL exits 1; failing the declared URL twice exits 1; declaring a failure that never happens exits 1 (`declared but never failed`, added at the delta review).

| Case | Proof in `lunar-loading.mjs` |
|---|---|
| The served entry lacks the rail's `sourceSha256`; one lazy import carries it, and the meta tag names it | Before case 1 |
| A fresh Moonshot holds `et` over 700 ms, draws nothing and asks once; reduced motion resumes its parked orbit first | Case 1 |
| Pull, Enter, Launch and Guide do nothing; the reason is visible and announced; focus stays off the body; no target cue | Case 2 |
| The reason line lies inside the deck and clear of every deck control, and the panel clear of all others | Case 3: 390x844, 360x780, 844x390, 1440x900 and 720x450 (200% zoom approximated by halving the CSS viewport), collapsed and on each page |
| A failed request shows the error; Retry by keyboard asks `?retry=1`, and Launch is enabled | Case 4 |
| First Light draws during a held load; Moonshot then has no lit pixel and no frame; the model is reused with no request | Case 5, from a screenshot on black, as WebGL keeps no readable buffer |
| A saved planetary pilot asks for nothing until Moonshot opens | Case 6 |
| Under `?renderer=canvas` (D19), which draws planets behind the home menu too: cases 1 and 5 again, with no lit pixel on the held Moonshot | Case 7 |

There are 34 mutants, all killed, each restored and checked with `cmp`. Vitest ran with `--fsModuleCache=false`; a browser kill is the probe's exit 1 on a fresh build. The five killed in cases 2, 3 and 6 ran before case 7 was added; those cases did not change.

| Mutant | Killing test |
|---|---|
| A planetary level starts a load (unit and browser, 2) | `campaign/lunar-readiness.test.ts:238`; probe case 6 |
| One disposal flag shared by every run | `:263` |
| A late success or a late failure not owned (2) | `:245` |
| The run's Retry, or the view's, loads nothing (2) | `:271`; case 4, by its 30 s wait |
| The reason ignores a failure, or Retry shows while loading (2) | `:29` and `:34` |
| Row 14 gate removed, or placed after the focus return is written (2) | `:196` |
| Row 17: Apply guide, angle or speed not gated (3) | `:208` |
| Camera, zoom or pan guard removed (3) | `:185` |
| The loader stops counting failures | `sim/load-lunar-model.test.ts:68` |
| The view imports the model statically | `sim/lunar-request.test.ts:75` |
| Tick not paused; the layout effect removed; frame not reset; `clear()` not called; WebGL not cleared (5) | Cases 1, 5, 5, 5 and 5 |
| The 2D background not cleared | Case 7 only: with WebGL, the home menu's own frame already blanks that canvas (`campaign/scene.ts:45` and `:46`) |
| Retry under the same URL | Case 4, by its 30 s wait |
| Focus not given to the panel; reason not announced; target cue shown; reason line back out of flow (4) | Cases 2, 2, 2 and 3 |
| `verify-game.mjs` excuses every URL, or excuses a URL more than once (2) | The undeclared and twice canaries exit 0, not 1 |
| The build guard: the rail merged into the entry, or two chunks matched (2) | `npm run build` exits 1 with "Expected one Moon model chunk, found 0." and "found 2." |

Without the allowance, the probe fails each context on the aborted chunk and its console line.

| Command | Exit and result |
|---|---|
| `npm run gates` | 0, 13/13 gates, 214 tests |
| `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts` | 0, 19 files, 193 tests |
| `npm run build` | 0; the large-chunk warning remains |
| `lunar-loading.mjs` at `/` and `/starshot/`, and `lunar-flight.mjs` at `/` | All 0, 3 contexts each: page errors 0, failed requests 0, no target under 44 px. The phone logs 4 GL driver warnings, as at Readiness |
| The declared, undeclared, twice and unspent canaries | 0, 1, 1 and 1, as intended |
| Before the review fixes (layout effect, Retry name, one-shot allowance): `build:prototype`, `lunar-flight.mjs` at `/starshot/`, `screen-flight.mjs` and `lunar-worker.mjs` at `/`, plain `verify-game.mjs` | All 0; not rerun after the fixes |
| `node scripts/verify-web-release.mjs`, before the review fixes | 0: a fresh Moonshot launches offline at `/` and `/starshot/`, its chunk served by the worker |
| `node scripts/check-copy-tells.mjs` and `node scripts/check-secrets.mjs` | Both 0; no copy finding on a line this part added |

Open points, settled conservatively, and inputs for Evidence:
- Size against `65969fa`: 605 contentful added lines in 21 files, review fixes and the untracked probe included, against a budget of 340 lines and 12 files. That is 145 production, 140 test, 21 harness, 235 probe, 63 note and 1 changelog lines; nothing was compressed. The orchestrator ruled Lazy stays one part (deviation row 42).
- The retry URL needs the meta tag and its build plugin; in development a retry cannot refetch.
- `CampaignScene.clear()` and `ThreeScene.clear()` exist because a same-width reset leaves WebGL drawn in Chromium.
- On a switch to a waiting Moonshot, React still renders once with the planetary frame. The layout effect blanks the canvases and the frame before that render is painted; no probe times the paint itself.
- The deck moves while the reason row shows; in short landscape, Guide and Launch then sit at the left of their row.
- `MoonLoadPanel` lives in `FlightDeck.tsx` and renders beside `FlightDeck` in `CampaignApp`, which saves a file.
- While loading, the disabled ring handle sits at the empty frame's grip, the top-left corner.
- Offline: `verify-web-release.mjs` launches Moonshot offline at `/` and `/starshot/` from the worker's cache. Whether `page.route` sees worker-served requests, and retry in WebKit and Firefox, are unmeasured.
- The sub-day flight and result restore case stays with Evidence.
