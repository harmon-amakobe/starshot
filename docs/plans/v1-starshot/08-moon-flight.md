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
| Ownership | 300 | 10 | Captured-request guards and asynchronous owner isolation |
| Search | 360 | 10 | Bounded deterministic search and cooperative worker dispatch |
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
Human trials and physical-phone 60 fps/100 ms measurements remain outstanding.

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
