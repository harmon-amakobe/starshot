# Campaign UX integration

Status: implemented. Final verification is recorded below.

Follow-up: the owner directed that this prototype join PR0 on 2026-11-02.
The [main-game handoff](main-game-handoff.md) requests a maintainable main-game
implementation with Earth to Moon first, then the planetary campaign. That work
is not implemented by this integration or its incorporation into PR0.

## Owner direction

Bring the approved live entry, flight deck and 3D play-study presentation into the
existing game so every existing mission can be played with that interface. This is
an integration for local playtesting, not the Rust, economy or backend release.
The Moon study remains available separately. The existing campaign contains Mars,
Venus, Jupiter and Saturn via Jupiter, plus seven sandbox destinations.

Use D19's three.js renderer and D32's single-screen shell. D19 already supersedes
D5's original Canvas-only choice. D6 and D18 preserve the campaign's planar dynamics.
No new inclination-unlock mechanic or changed flight model is part of this work.

## Preserve the game contract

- Keep `apps/game/src/levels.ts`, known solutions, capture zones, par, attractors and
  frozen simulation settings unchanged. Build requests through `shotRequestFor` and
  hints through `hintQueryFor`. Keep `simulateShot`, analysis and scoring unchanged.
- Preview and release use the exact same final request. Release captures the final
  aim explicitly and waits for its matching preview. Stale, cancelled or failed work
  cannot launch a different shot or restore another profile.
- Campaign aim is planar heliocentric departure excess velocity, with a full circle
  and each level's speed cap. It is not the lunar study's limited-angle LEO burn.
  Engine extension represents charge. Physical fuel cost comes from `deltaVFromLeo`,
  including the nonzero escape cost at zero excess speed. Say what the meter measures.
- Use the campaign's flattened ephemeris for its bodies, route and encounter markers.
  Its departure begins at Earth centre (`packages/physics/src/launch.ts:8`); a close
  launch vignette is presentation, not a different initial physical state.
- Preserve First Light's disclosed 3x training zone, Grand Tour's Jupiter condition,
  hint application penalties and real star records. Keep the post-2050 warning.
- Keep old `starshot.progress.v1` data. A new versioned campaign-profile namespace
  may import the old progress for the first local pilot without destroying it.

The governing interfaces are `apps/game/src/levels.ts:76`, `sim/shot.ts:82`,
`sim/preview.ts:23`, `sim/useSimulation.ts:39` and `scoring.ts:52`.

## Playable result

1. `apps/game` opens the approved live orbital menu. Play or Continue enters the same
   mounted scene and worker. Main-menu return freezes the flight and keeps its exact
   session. The latest selected mission is the backdrop. Keep the lowercase title.
2. The level picker contains all four real missions and the sandbox. Offer clearly
   labelled playtest access to any mission without granting stars. Ordinary unlock
   status remains visible. Sandbox selection uses planet buttons, not a dropdown.
3. The craft, rear engine ring, charged field and release snap use the approved art
   and interaction. The craft stays anchored during charging. It faces the integrated
   path during travel. Render the exact preview as dots, then split travelled and
   future path styles. Show target and encounter context in the default view.
4. The bottom flight deck expands and collapses without page scrolling. Its compact
   state contains a horizontal meter, angle/status or flight progress, units and detail
   controls. Extra instruments use explicit pages, with swipe and button navigation.
   Launch, pause, retry and cameras stay readily available.
5. Simplified and Scientific, Light-time/Metric/Imperial, linked world sizes with
   independent override, Follow/System/Free and craft-centred zoom remain available.
   Flight speed uses the established step controls; double-click returns to real time.
   Scientific light-time uses apparent c pacing without changing physical velocities.
6. Launch window is part of the same mission session, available during flight. It
   exposes launch date and mission information in a top deck while aiming. Date and
   target changes are locked during flight. Inspection and return preserve ET, pause,
   camera and preferences. Planet focus has a clear close action. Settings stay in menus.
7. Reuse the approved textured bodies, orientations, rings, Sun appearance, craft,
   hangar engine demo and sound controls. Prefer shared presentation code and assets;
   avoid importing lunar dynamics into the campaign renderer. Historical dates must
   not reuse clamped 2026 moon rails. Hide unavailable moon positions with a clear
   availability note rather than fabricate them.
8. Local profiles restore canonical campaign aim, day/window, target, phase, ET,
   preferences and progress. Preserve the cloud-profile interaction preview as an
   explicitly local simulation. No real Firebase connection or credentials.
9. Results keep Try again and Replay together, with the correct next-mission action.
   Help, stores and settings remain honest and reachable. All controls are labelled
   DOM targets of at least 44 px, with non-drag aiming, keyboard focus and reduced motion.
10. Canvas remains a usable fallback. Render linear distances with camera-relative
    coordinates. Changes of display size do not move physical bodies or route samples.

## Implementation and scope

One sequential builder owns the working tree after this plan is written. Extract a
campaign controller from the current behavior and feed it to the new UI and renderer.
Use small modules under the size gate. The old large screen is a reference during
integration; edits above 300 lines stay surgical. Shared presentation can be promoted
to a package without importing app simulation code into packages.

The prototype's existing texture packaging and procedural art are accepted for this
local test. Do not claim the future production texture tiers, Rust core, economy,
full 3D mission progression or authenticated cloud service are finished. Do not change
physical constants or relax checks to make the new interface work.

Issues remain disabled in this repository, as recorded in the preceding prototype
plans. This plan carries the iteration until that tracking limitation is resolved.

## Verification

Run every existing level, physics and preview test unchanged, plus focused tests for
the new request-release and profile-ownership boundaries. Full `npm run gates` must
exit 0. Build and run the integrated game, not only the old study.

Drive each campaign mission and all sandbox destinations through the new picker.
Check known successful shots, a miss, hinted scoring, flight playback, pause, retry,
replay and next level. Compare preview and launch fingerprints. Check stale release,
level/profile switching and reload during a flight. Verify the original progress key
survives. Test maps and close-up return during flight without replacing its request.

Inspect phone portrait, short landscape and desktop screenshots. Check target/handle
clearance, no page or deck scrolling, keyboard focus, touch aiming, reduced motion and
Canvas fallback. Record command exit codes and measured limitations. Run independent
source review and browser verification before committing and pushing the existing branch.

## Implemented structure

- `packages/presentation/src/` owns the existing collector, engine, chamber, crew pod,
  drone, icons, audio, entry timing and shared shell styles. Prototype imports remain
  compatible through re-exports; no shared package imports an app.
- `apps/game/src/campaign/use-campaign.ts` retains the worker protocol and original
  scoring. `contracts.ts` captures final requests and checks restored-shot identity.
  `release.ts` guards both successful and failed asynchronous completions by generation.
- `session.ts`, `profiles.ts` and `cloud.ts` hold validated canonical sessions,
  isolated local pilots and the explicitly local cloud interaction demo. Saved sandbox
  windows and hint caps survive restoration. The legacy progress key is read-only.
- `scene.ts`, `three-scene.ts`, `frame.ts` and `scene-geometry.ts` adapt the real
  campaign path to the shared art. The view uses flattened planet states, sourced
  orientations and rings, camera-relative coordinates and adaptive close-up depth.
- `CampaignApp.tsx`, `HomeMenu.tsx`, `FlightDeck.tsx` and `MissionDeck.tsx` form the
  default app shell. Entry and Continue do not replace the renderer or worker.
  The deck follows its actual DOM bounds through entry and Hide UI remounts.
- `observatory-assets.ts` mounts and copies the canonical asset directory. Runtime
  asset and font URLs resolve from the page base, including repository subpaths.

## Conservative adaptations and remaining scope

1. Launch window uses the campaign's persistent scene instead of the lunar iframe
   bridge. This preserves its flattened ephemeris, current trajectory, ET and camera.
   It avoids applying the lunar bridge's different Earth and inclination corrections.
2. The entry portrait stages an enlarged collector near Earth. It is a presentation
   camera handoff, not an added physical orbit. The flight retains `departureState`.
3. Major-moon positions are available only within the existing late-2026 to 2027
   rails. Historical and later dates display a coverage note. Focused WebGL moons
   use their physical radii, so small moons require closer zoom. Canvas retains
   usable campaign gameplay and sourced ring
   projections, with simpler bodies and vehicles and no matching moon meshes yet.
4. Solar presentation keeps the white/scientific and warm/simplified distinction and
   procedural flare loops. It does not claim production solar surface simulation or
   new texture tiers. The original observatory surface study remains available.
5. Playtest access starts enabled and is explicitly labelled. It opens mission cards
   without writing stars or earned unlocks. The local cloud demo never contacts a
   provider. Real Firebase, production store links, Rust cutover, economy and
   inclination-unlock missions remain outside this iteration.
6. The pull handle hides while mission details are expanded. A small screen cannot
   always fit both panels and the full circular touch target. Numeric Fine aim and
   map gestures remain available; closing mission details restores the handle.

## Builder verification checkpoint

Runtime source was frozen before independent browser QA. The parent verification
pass owns subsequent runtime fixes and the final full-gate result.

| Command | Exit | Observed result |
| --- | --- | --- |
| `npm install --package-lock-only --ignore-scripts --offline` | 0 | Workspace lock metadata updated without widening dependency ranges |
| `npm install --ignore-scripts --offline` | 0 | Shared workspace link installed; local escalation was needed for the Windows junction |
| `npm run typecheck` | 0 | All TypeScript project references passed |
| `npx vitest run apps/game/src/campaign/contracts.test.ts` | 0 | 10 tests passed |
| `npm run build` | 0 | Main game built; bundle-size warning retained, about 239.6 kB gzip for the main JavaScript |

The focused tests cover final pointer requests across every mission and sandbox
target. They check cancellation, late rejection, matching restores, saved windows
and hint penalties. Camera checks cover projection inversion, whole-ring clearance,
entry continuity and giant-body close-up depth. Playback checks cover Hermite
arc length and monotonic speed steps. Browser results and final full gates follow
the independent pass. This checkpoint does not certify physical-phone frame rate
or preview latency.

## Integration verification

Independent source review found no remaining blockers after the fixes. The original
levels, known solutions, scoring, shot physics and ephemeris sources are unchanged
from `0a5fc647`. Shared vehicle, audio and engine implementations match the approved
study; both applications build against the extracted package.

| Check | Exit | Observed result |
| --- | --- | --- |
| `npm run gates` | 0 | 12/12 gates passed; 107 tests passed |
| `npm run build` | 0 | Final campaign build, including the short-phone menu spacing fix |
| `npm run build:prototype` | 0 | Standalone Moon study remains buildable |
| `npm run verify:data -w @starshot/prototype` | 0 | 34 asset hashes, 93 orientation matrices, 24 satellite rails, 120 JPL probes and 1001 replay probes passed |
| `node scripts/verify-game.mjs --steps <scratch>/steps.mjs --out <scratch>/harness-final-1` | 0 | 18 checks across phone, desktop and reduced-motion phone |
| External missions, profiles, cloud and race batches | 0 | All four mission solutions, seven sandbox targets, scoring and session ownership passed |
| External layout and view closure batches | 0 | Targeted fixes closed earlier failures; phone, desktop, landscape and Canvas covered |
| Final short-phone home-return closure | 0 | 1/1 check passed; route, Continue and status remain clear after a result |

The browser pass retained 93 successful criteria, including the final menu-spacing
closure. It compared complete genuine worker requests, samples and analysis between
preview and launch, including a real touch release. The same three-star Grand Tour
shot scored two stars after applying a guide. Misses did not erase best records.

Local pilots restored paused flights, active flights and results. The original
progress key remained intact. Both local cloud-demo providers, offline drafts and
conflict choices preserved pilot ownership without external requests. Map and menu
transitions retained the renderer, worker and flight. Subpath assets loaded from
`/campaign-qa/`. Screenshot reports remain local verification artifacts.

The final common browser harness reported no console errors, page errors, failed
requests, page overflow, unnamed controls or targets below 44 CSS px. Chromium
reported four ReadPixels performance warnings. Vite retains its large-chunk warning;
the main JavaScript is about 240 kB gzip. These checks do not certify physical-phone
performance, 200 percent browser zoom or blocked/corrupt storage recovery.

A positive post-2050 warning could not be reached through the current sandbox UI.
Its latest selectable Neptune date was 2028-10-31. The real 5000-day miss ended on
2042-07-10, correctly without an extrapolation warning. That positive warning branch
remains unverified by this browser pass; neither the clock nor saved state was changed
to force it.
