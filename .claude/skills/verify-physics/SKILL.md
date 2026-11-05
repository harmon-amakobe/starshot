---
name: verify-physics
description: Use when a change touches Starshot's ephemeris or physics packages, the Horizons fixtures, the ephemeris tool in tools/ephem, the DE440 rails pack in data/ephem, integrator tolerances, the game's frozen simulator settings (SIM_SETTINGS, OUTER_SIM_SETTINGS, a level's sim) or time scales, when refreshing fixtures from NASA/JPL Horizons or rebuilding the rails, when adding a planet or body, or when a task mentions accuracy budgets, arcminutes, energy drift, JPL, Horizons, DE440, rails, Chebyshev, ET or TDB.
---

# Verifying the physics

## Run

```bash
npx vitest run packages            # ephemeris vs Horizons, integrator, Lambert, launch
npx vitest run apps/game           # shot settings and every level's known solution
uv run --project tools/ephem --locked pytest tools/ephem/tests -q   # rails pack and its reports, offline
```

Quote the pass counts. The rubric is `.claude/rubrics/physics.md`; for anything beyond a
typo, spawn the `physics-auditor` agent on the diff.

## Accuracy budgets (as tested)

Heliocentric direction error against Horizons at every fixture epoch, in arcminutes,
from `ARCMIN_BUDGET` in `packages/ephemeris/test/ephemeris.test.ts`: Mercury, Venus,
Earth 1.5; Mars 2; Jupiter 12; Saturn 15; Uranus 3; Neptune 2. Plus distance within
0.2% and velocity within 1%. JPL quotes tens of arcseconds for the inner planets and up
to about 10 arcminutes for Jupiter and Saturn over 1800-2050 for Table 1. Read the file
for the current values; this table is a summary.

Integrator: a circular 1 au orbit closes within 10 km with relative energy drift under
1e-7; the 3-year preview flight runs under 400 ms (`packages/physics/test`).

Rails: each body stays within 150 km of the DE440 kernel every 5 days from 1950 to
2150, fitted to 100 km; the numbers are in `data/ephem/de440s-100km/VALIDATION.md`.
Rebuild only when `tools/ephem/src/ephem/bodies.py`, the fit or a kernel pin changes,
with the commands in `data/ephem/README.md`, and quote each body's maximum before and
after.

## Refresh the Horizons fixtures

```bash
uv run --project tools/ephem --locked starshot-ephem fixtures \
  --out fixtures/horizons/horizons.json   # needs ssd.jpl.nasa.gov; answers cached
git diff --stat fixtures/horizons/horizons.json
npx vitest run packages/ephemeris
uv run --project tools/ephem --locked pytest tools/ephem/tests -q
```

Re-run only when the epoch list or the targets change. Never hand-edit the JSON. A
refreshed fixture that moves a result is a finding to explain, not a budget to raise.

## Add a body

1. Elements: add its row to `packages/ephemeris/src/elements.ts` from the cited JPL
   table, digit for digit, with the source in the comment.
2. Physical data: `BODIES` in `packages/ephemeris/src/bodies.ts` (GM in km^3/s^2,
   radius in km, colour, name).
3. Reference: add its Horizons id to `TARGETS` in `tools/ephem/src/ephem/fixtures.py`
   (barycentre where the elements describe one) and refresh the fixtures. If the rails
   carry it, add its `BodySpec` to `BODIES` in `tools/ephem/src/ephem/bodies.py`, then
   rebuild and validate the pack.
4. Budget: an `ARCMIN_BUDGET` entry justified by JPL's stated accuracy for that table.
5. Prove it: the new test fails before step 1 and passes after.

## Changing tolerances, SIM_SETTINGS or OUTER_SIM_SETTINGS

Before and after numbers for closure, energy drift and preview timing, plus every level
test still green. Settings are frozen per level (`Level.sim` in `apps/game/src/levels.ts`)
and carried in the `ShotRequest`, so a level's preview, launch, hint and tests share one
object (D6). Changing `OUTER_SIM_SETTINGS` (sandbox targets beyond Mars) also needs the
hit/miss comparison its docblock in `apps/game/src/sim/shot.ts` records.
