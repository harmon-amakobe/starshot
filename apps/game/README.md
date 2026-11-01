# @starshot/game

The Starshot game prototype: an "Angry Birds in orbit" slingshot across the real
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
   `@starshot/physics` `simulate`, stopping at the target's sphere of influence.
3. `analyzeShot` turns the result into what the HUD and the scoring need: hit,
   miss distance, arrival periapsis (patched conic), flybys, delta-v from LEO, C3.

The aiming preview and the real launch run the **same** `simulateShot` with the
same `SIM_SETTINGS` (decision D6), so what you see is what you get. The level
tests run it too.

## Layout

| Path | What it is |
| --- | --- |
| `src/levels.ts` | Campaign levels (real windows, pars, attractors) and the runtime sandbox. |
| `src/levels.test.ts` | Every campaign level is solvable with the game's exact settings; hints hit; Grand Tour cannot reach Saturn without Jupiter. |
| `src/scoring.ts` | Pure star rules (unit-tested in `scoring.test.ts`). |
| `src/progress.ts` | Best stars per level in `localStorage["starshot.progress.v1"]`, guarded for blocked storage. |
| `src/sim/shot.ts` | Shot model shared by worker, hint finder and tests. |
| `src/sim/hint.ts` | Hint: Lambert `bestDirectTransfer` over the window, nudged until the game simulator agrees; curated shot for flyby levels. |
| `src/sim/sim.worker.ts`, `protocol.ts`, `useSimulation.ts` | Physics worker; previews are latest-request-wins and throttled. |
| `src/render/` | Linear top-down camera, Canvas 2D scene renderer, deterministic starfield. |
| `src/input/useSlingshot.ts` | Pointer input: pull to aim, pinch/pan, wheel zoom, modifier-drag pan. |
| `src/ui/` | Title, level select, game screen, HUD, controls, result overlay. |
| `public/` | Icon, web manifest, a small same-origin service worker for offline play. |

## Levels

| # | Level | Target | Window | v-inf cap | Par (delta-v from LEO) |
| --- | --- | --- | --- | --- | --- |
| 1 | First Light | Mars | 2026-10-15 + 90 d | 6 km/s | 3.66 km/s (best 2026-11-04, v-inf 3.12) |
| 2 | Morning Star | Venus | 2028-01-20 + 90 d | 5 km/s | 3.51 km/s (best 2028-03-03, v-inf 2.53) |
| 3 | Big Game | Jupiter | 2028-11-20 + 90 d | 12 km/s | 6.25 km/s (best 2028-12-24, v-inf 8.70) |
| 4 | Grand Tour | Saturn via Jupiter | 1977-08-10 + 30 d | 10.5 km/s | 6.69 km/s (v-inf 9.4, Jupiter-assisted) |
| 5 | Sandbox | any planet | today + 730 d | 20 km/s | none (all planets pull; Mercury only when targeted) |

Windows were found with `bestDirectTransfer` on the flattened JPL ephemeris.
For the Grand Tour, the cheapest direct (Lambert) transfer to Saturn in the
window needs more than 12 km/s, while Jupiter-assisted shots exist from 9.4 km/s;
the tests check both. The curated Grand Tour hint (1977-08-20, 75.93 degrees,
9.80 km/s) flies by Jupiter on 1979-07-07 and reaches Saturn's sphere of
influence on 1981-06-21 in the game's flattened model.

## Measured performance

Worker time per preview (Playwright, headless Chromium, 390x844): 5-23 ms on
Mars, 4-13 ms on Venus, 14-27 ms on Jupiter, 12-34 ms on the Grand Tour; in the
sandbox 20-50 ms for Mars, Venus and Jupiter and ~117 ms for a 13.7-year Neptune
flight. Node 22, same settings: 2-7 ms for levels 1-3, ~13-20 ms for the Grand
Tour. Budget: under ~150 ms. Hints take 0.25-1.5 s on the campaign levels and
are capped at about 2.5 s of simulation in the sandbox.

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
  0.02-0.3 degrees wide.
- **Draw on demand.** The canvas redraws after React state changes and runs a rAF
  loop only while flying, bursting or briefly pulsing the capture zone; device
  pixel ratio is capped at 2.
- **Honest numbers.** The HUD shows v-infinity, delta-v from a 200 km LEO, C3 and
  flight time; misses report the closest approach against the capture-zone radius.

## Extension points

- New levels: add to `CAMPAIGN` in `src/levels.ts` and a known solution to
  `KNOWN_SOLUTIONS` in `src/levels.test.ts` (the test fails until it hits).
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
