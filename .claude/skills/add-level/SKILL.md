---
name: add-level
description: Use when designing or changing a Starshot level, picking a real launch window, setting a target planet, attractors, a required flyby, the slingshot cap or par, or when a task mentions a new mission, Hohmann transfer, gravity assist, C3, delta-v, bestDirectTransfer or a known-solution test.
---

# Adding a level on a real launch window

Every level is a mission a real spacecraft could fly in the game's physics, and every
campaign level carries a known solution the tests fly on each change. The catalogue is
`apps/game/src/levels.ts`; known solutions are in `apps/game/src/levels.test.ts`.
Re-locate both by symbol before editing.

## 1. Find the window

Search with the physics package over the flattened ephemeris (the game's world, D6):

```ts
const eph = createEphemeris({ flatten: true });
const start = etFromIso("2026-10-15");
const launches = Array.from({ length: 30 }, (_, k) => start + k * 2 * DAY);
const tofs = Array.from({ length: 40 }, (_, k) => (120 + k * 6) * DAY);
const best = bestDirectTransfer(eph, "earth", "mars", launches, tofs);
// best.launchEt, best.tof, best.vInf (km/s vector), best.vInfKmS, best.arrivalVInfKmS
```

Run it as a throwaway `*.test.ts` under `apps/game/src` (vitest collects tests only
there and in `packages/*/test`) and delete it before committing. Record the launch date
(UTC calendar, via `dateFromEt`), time of flight in days, departure v-infinity, C3
(`c3()`), and delta-v from LEO (`deltaVFromLeo()`). For a flyby level there is no direct transfer:
search the first leg to the flyby planet, then fly it and inspect `encounters`.

## 2. Fly it exactly as the player would

Use the game's own `simulateShot` and `SIM_SETTINGS` from `apps/game/src/sim/shot.ts`,
never a hand-built `simulate` call. Two-body Lambert aims land close but not exact once
all planets pull; adjust the aim within the window and record the final vector. The
level is winnable only if that flight meets its win condition untouched.

## 3. Set the numbers from measurements

- `vInfMaxKmS` (full pull) above the solution's v-infinity with stated headroom.
- `par` from the measured delta-v, with its source written in `par.source`.
- `maxFlightDays` above the solution's flight time.
- `attractors` and `requiredFlyby` only as the mission needs.

## 4. Prove it forever

Add the solution to `KNOWN_SOLUTIONS` in `levels.test.ts` (launch ISO date and the
v-infinity vector, with angle and speed in the comment). Run `npx vitest run apps/game`
and `npm run gates`, then a `verify-game` pass if the level adds anything visible.

## Truth in text

Titles and blurbs state facts with a source you could cite (mission names, real
windows). Flavour that is not literally true is cut or clearly framed as fiction.
