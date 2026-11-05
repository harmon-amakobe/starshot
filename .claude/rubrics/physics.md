# Physics rubric

For any diff touching `packages/ephemeris`, `packages/physics`, the Horizons fixtures,
`tools/ephem`, the DE440 rails in `data/ephem`, the game's shot settings or level
windows. A physics bug in Starshot rarely crashes; it draws a believable orbit in the
wrong place. So the bar is evidence, not plausibility.

## Frames

- Heliocentric, ecliptic and equinox of J2000 everywhere in the packages.
- In Table 1 and the fixture's `states`, "earth" is the Earth-Moon barycentre (the
  rails' EMB); the giant planets are their system barycentres. Earth's centre (399) is
  the fixture's `heliocentric_extra.earth` and the origin of the geocentric Moon. A
  comparison uses the same targets and centres (`TARGETS` and `SERIES` in
  `tools/ephem/src/ephem/fixtures.py`).
- The game's 2D world is `createEphemeris({ flatten: true })`, a projection onto the
  ecliptic used by both preview and launch (D6). A 3D claim tested only in 2D is
  unproven.

## Units

- Distance km, velocity km/s, time s, GM km^3/s^2, angles radians in code.
- AU (`AU_KM`), days and degrees appear only at input and display edges, converted once.
- Blocker: any unit mixing, any literal like `1.496e8` instead of `AU_KM`, any `86400`
  scattered where `DAY` exists.

## Time

- ET = TDB seconds past J2000.0. UTC enters only through `etFromIso`, `etFromDate`,
  `dateFromEt`; the leap-second table lives in `time.ts` and nowhere else.
- TT is used for TDB (difference under 2 ms), which is stated in `time.ts` and fine.
- Blocker: `Date.now()`, `performance.now()`, Unix seconds or frame time feeding physics.

## Integrator and tolerances

- Defaults live in `simulate.ts` (`rtol`, `atolKm`, `maxStep`, `maxSteps`); the game's
  shot uses the level's frozen `sim` (`SIM_SETTINGS` or `OUTER_SIM_SETTINGS` in
  `apps/game/src/sim/shot.ts`), carried in the `ShotRequest`, for preview and launch
  alike.
- Any tolerance change ships with before/after numbers: two-body closure error and
  relative energy drift (the circular 1 au test), the preview timing test, and every
  level's known solution still winning.
- Encounter (20 SOI), impact (body radius) and termination rules are behaviour: a change
  is a game change and needs a test that shows the new behaviour.

## Validation evidence

| Claim | Evidence that counts |
|---|---|
| Planet position accuracy | arcminute budgets in `packages/ephemeris/test` against `fixtures/horizons/horizons.json` |
| Rail accuracy (D17) | each body's `ephem.validation/1` report in `data/ephem/*/validation/` within 150 km of the JPL kernel every 5 days, held by `tools/ephem/tests/test_committed_pack.py` |
| Integrator accuracy | closure and energy tests in `packages/physics/test` |
| A transfer is possible | `bestDirectTransfer` output, then the shot flown by `simulate` reaching SOI |
| A level is winnable | a known-solution test flown with the level's own `sim` settings |
| astlo data is usable (D4) | direction error vs Horizons at the fixture epochs, per planet, within the Table 1 budgets |

A number in prose, a comment or a PR description without one of these is not a claim.
Budgets are loosened only with a decision entry stating why.

## Determinism

- Same inputs, same samples, bit for bit, on every device: no randomness, no wall
  clock, no dependence on frame rate. Rendering interpolates with `sampleAt`; it never
  steps the physics.
- Work happens in the worker; the result message is the only output.

## Numerical traps to look for

Kepler's equation near e = 1 and for hyperbolic arcs; Lambert near 180 degrees of
transfer angle (the plane is ill-defined); SOI ratios at the boundary; catastrophic
cancellation in `r2 - r1` for close encounters; `noUncheckedIndexedAccess` hidden by
`!`.

## Reporting

Each finding: `file:line`, the rule above, the command that shows it, and its output.
Say which claims you recomputed and which you only read.
