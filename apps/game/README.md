# @starshot/game

The Starshot game prototype: a slingshot game in orbit across the real
Solar System. Vite + React 19 + TypeScript, Canvas 2D, physics in a Web Worker.
Fully static: no network requests, no external fonts or CDNs, no backend.

```sh
npm run dev -w @starshot/game        # local dev server
npm run build -w @starshot/game      # tsc -b, then a static build in apps/game/dist
npm run preview -w @starshot/game    # serve the build
npx vitest run apps/game             # scoring, progress and level-solvability tests
```

The build uses `base: "./"`, so `dist/` works from any sub-path (GitHub Pages
under any repository name, a file share, a USB stick behind a static server).

## How a shot works

1. The player picks a launch day in the level's window and an aim (direction in
   the ecliptic plane + departure excess speed v-infinity).
2. `src/sim/shot.ts` `simulateShot` starts the probe at Earth's centre with
   Earth's velocity plus v-infinity (patched-conic departure, `departFrom: "earth"`)
   and integrates it under the Sun and the level's planets with
   `@starshot/physics` `simulate`, stopping at the target's capture zone: its
   sphere of influence, or three times that on the training level (First Light),
   where the flight is cut where it first crosses the larger radius.
3. `analyzeShot` turns the result into what the HUD and the scoring need: hit,
   miss distance, arrival periapsis (patched conic), flybys, delta-v from LEO, C3,
   and whether the flight runs past 2050 (the end of the JPL table).

The aiming preview and the real launch run the **same** `simulateShot` with the
level's own integrator settings (`level.sim`, carried inside the shot request;
decision D6), so what you see is what you get. The level tests run it too.
Previews are answered asynchronously, so Launch is enabled only while the
preview on screen is for exactly the current aim (`src/sim/preview.ts`); it then
launches that preview's own request, and a keyboard launch made while the
preview is still computing waits for it.

## Layout

| Path | What it is |
| --- | --- |
| `src/levels.ts` | Campaign levels (real windows, pars, attractors) and the runtime sandbox. |
| `src/levels.test.ts` | Every campaign level is solvable with the game's exact settings; pars are real and reachable; hints are deterministic and hit; the training zone; Grand Tour cannot reach Saturn without Jupiter. |
| `src/scoring.ts` | Pure star rules (unit-tested in `scoring.test.ts`). |
| `src/progress.ts` | Best stars per level in `localStorage["starshot.progress.v1"]`, guarded for blocked storage. |
| `src/sim/shot.ts` | Shot model shared by worker, hint finder and tests. |
| `src/sim/hint.ts` | Hint: Lambert `bestDirectTransfer` over the window, nudged until the game simulator agrees (at most 240 simulations, no wall clock); curated shot for flyby levels. The aim is rounded to 0.01 degree and 0.001 km/s before it is checked, so the label is exactly what "Use hint" applies. |
| `src/sim/preview.ts` | Launch gate: canonical shot key; Launch only for the preview of the aim on screen. |
| `src/sim/sim.worker.ts`, `protocol.ts`, `useSimulation.ts` | Physics worker; previews are latest-request-wins and throttled. |
| `src/render/` | Linear top-down camera, Canvas 2D scene renderer, deterministic starfield. |
| `src/input/useSlingshot.ts` | Pointer input: pull to aim, pinch/pan, wheel zoom, modifier-drag pan. |
| `src/ui/` | Title, level select, game screen, HUD, controls, result overlay. |
| `public/` | Icon, web manifest, a small same-origin service worker for offline play. |

## Levels

| # | Level | Target | Window | v-inf cap | Par (delta-v from LEO) | Efficiency star |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | First Light | Mars (training capture zone, 3× real) | 2026-10-15 + 90 d | 6 km/s | 3.62 km/s (best 2026-11-02, v-inf 2.98, 323 d) | within 110% |
| 2 | Morning Star | Venus | 2028-01-20 + 90 d | 5 km/s | 3.51 km/s (best 2028-03-05, v-inf 2.53, 150 d) | within 110% |
| 3 | Big Game | Jupiter | 2028-11-20 + 90 d | 12 km/s | 6.24 km/s (best 2028-12-25, v-inf 8.69, 1,056 d) | within 110% |
| 4 | Grand Tour | Saturn via Jupiter | 1977-08-10 + 30 d | 10.5 km/s | 6.50 km/s (v-inf 9.10, Jupiter-assisted) | within 105% (v-inf up to 9.60) |
| 5 | Sandbox | any planet | today + 730 d | 20 km/s | none | none |

Pars of the direct levels are the cheapest Lambert transfer in the window
(`bestDirectTransfer` on the flattened JPL ephemeris, 1-day launch and flight-time
grid); the tests hold them to 1%. Checked with the game's simulator too: the
cheapest hits found (3-day launch steps, 1% speed steps, 0.1 degree aim steps)
are within 2% of par, 6.13 km/s on Big Game being the furthest below it, because
Jupiter's capture zone is 48 million km in radius.

For the Grand Tour the cheapest direct (Lambert) transfer to Saturn in the
window needs 15.12 km/s (1977-09-09, 1,498 days), far above the 10.5 km/s cap.
The par is the cheapest Jupiter-assisted hit found on the search grid, within
~0.01 km/s of the floor in delta-v: v-infinity 9.10 km/s (delta-v 6.50),
1977-09-02, 68.43 degrees, in a band about 0.14 degrees wide, Jupiter on
1979-11-04, Saturn on 1982-04-04. A finer probe finds hits down to 9.085 km/s
(delta-v 6.49) and none at 9.080 km/s (search, grid and probe in
`GRAND_TOUR_PAR_SHOT`). Without Jupiter, a full 10.5 km/s pull never
comes closer to Saturn than 7.5 Saturn spheres of influence (closest on the
window's last day, aimed 95-110 degrees); the test asserts more than 5. The
curated Grand Tour hint (1977-08-20, 75.93 degrees, 9.800 km/s) flies by
Jupiter on 1979-07-03 and reaches Saturn's sphere of influence on 1981-06-26 in
the game's flattened model.

In the sandbox every planet but Mercury pulls (Mercury too when it is the
target), except for targets beyond Mars: there only Earth and the giant planets
pull, with the looser `OUTER_SIM_SETTINGS` (see below). A flight that runs past
2050 says so: the JPL table is extrapolated there.

## Measured performance

Time per preview on one development machine (a 4-core cloud VM), with the
worker's cached ephemeris:

| Level | Node 22, 432 aims per level: median / p90 / max | Headless Chromium 153, 72 drags: median / p90 / max |
| --- | --- | --- |
| First Light, Morning Star | 2 / 3 / 9-16 ms | 3 / 4 / 4-7 ms |
| Big Game, Grand Tour | 8 / 12 / 17-20 ms | 10-11 / 13 / 17-20 ms |
| Sandbox Mercury, Venus, Mars | 4-7 / 6-13 / 11-27 ms | Mars 12 / 17 / 34 ms |
| Sandbox Jupiter, Saturn | 3-4 / 8-10 / 17-23 ms | 6-7 / 9-12 / 23-26 ms |
| Sandbox Uranus, Neptune | 6-8 / 16-20 / 37-41 ms | 10-13 / 17-29 / 31-67 ms |

The slowest previews are 20 km/s shots aimed backwards, which fall into a
10-14 year orbit grazing the Sun every few months: 30-45 ms in Chromium, with
single outliers of 54-67 ms in three runs of 72 drags (Neptune). Before the
outer-sandbox settings (`OUTER_SIM_SETTINGS`: rtol 1e-9, 300 km, 10-day steps;
Earth and the giant planets only), the same aims took up to ~140 ms (Uranus)
and ~220 ms (Neptune) in Node, and a review measured 114-155 ms in Chromium for
outer-planet sandbox previews. Their cost in accuracy, against the previous
sandbox setup on 864 shots: no hit or miss changed, closest approaches moved by
a median 0.06-0.12% of the capture-zone radius (90th percentile 0.4-1.4%). Phones were not measured; if one is 3-5x slower than this machine (the
review's estimate), the slowest campaign previews (20 ms here) reach the 100 ms
budget of AGENTS.md, typical ones (2-11 ms) stay far below it, and only those
outer-sandbox Sun-grazers would exceed it.
Hints run at most 240 simulations: 0.01-0.6 s per level and sandbox target here
(Node).

## Design rationale

- **Linear scale, framed per level** (Sun to the outermost relevant orbit). True
  distances keep the slingshot honest; planets get a minimum on-screen radius and
  the target's capture zone is drawn to scale when it is big enough, otherwise as
  a reticle. Pinch / wheel zoom reaches true scale around any planet.
- **Pull anywhere, band anchored at Earth.** On outer-planet maps Earth sits a few
  pixels from the Sun, so the drag is measured from where it starts. Pull length
  maps to v-infinity with a u^1.5 curve (fine control at small pulls); aims snap to
  0.1 degree and 0.01 km/s, then the step buttons (and the Fine toggle, 10x
  smaller) refine them. The Grand Tour needs that precision: its solutions are
  0.02-0.3 degrees wide (the par shot's band is about 0.14 degrees).
- **First Light trains.** Its capture zone is three times Mars's real sphere of
  influence, and the HUD, the status line and the result card say "Training
  capture zone (3× real)"; every other level is real size. Until the first drag
  or nudge, a coach mark near Earth says "Drag anywhere to pull the slingshot"
  (remembered in `localStorage`).
- **Draw on demand.** The canvas redraws after React state changes and runs a rAF
  loop only while flying, bursting or briefly pulsing the capture zone; device
  pixel ratio is capped at 2.
- **Honest numbers.** The HUD shows v-infinity, delta-v from a 200 km LEO, C3 and
  flight time; misses report the closest approach against the capture-zone radius.

## Known issues

- Landscape phones narrower than 700 CSS px (667 x 375, 640 x 360) keep the
  controls along the bottom, because the right-hand column starts at 700 px, and
  that leaves almost no map between the HUD and the panel: 40 px tall at
  667 x 375 with the earlier 36 px step buttons, 20 px with today's 44 px touch
  targets (Playwright, Chromium). 740 x 360 and wider get the column and a
  390 x 222 px map.

## Extension points

- New levels: add to `CAMPAIGN` in `src/levels.ts` (with `sim: SIM_SETTINGS`,
  and `parTolerance` / `captureZoneScale` only when the level needs them) and a
  known solution to `KNOWN_SOLUTIONS` in `src/levels.test.ts` (the test fails
  until it hits).
- New mechanics (mid-course burns, multiple flybys): extend `ShotRequest` /
  `simulateShot`; preview, launch and tests pick it up together.
- Scoring tweaks live in `src/scoring.ts` only; `maxStars` drives the UI.
- Renderer: `drawScene` takes a plain `SceneInput`; a 3D map (apps/orrery, D5)
  can reuse `src/sim/*` unchanged.
- Leaderboard (D7, future): a separate Starshot-only project configured at build
  time; `progress.ts` is the seam for syncing results.

## Credits and honesty

2D mode: orbits flattened onto the ecliptic. Planet positions: NASA/JPL
approximate elements (1800-2050). Inspired by astlo by Mark Macharia; no astlo
code or data is used by the game. Starshot's code is MIT licensed.
