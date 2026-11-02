# Architecture

How Starshot's parts fit together, the conventions every part follows, and what is
planned next. Sections marked **Future** describe designs that are not built yet.

## The big picture

```
  NASA/JPL "approximate positions"          NASA/JPL Horizons
  Table 1 (published numbers)               (reference positions)
             |                                        |
             | copied digit for digit                 | tools/horizons/fetch_fixtures.py
             v                                        v
  +-----------------------------+        +-----------------------------------+
  | packages/ephemeris          |<-------| test/fixtures/horizons.json       |
  |  elements.ts  (the table)   | tests  | (accuracy checked on every run)   |
  |  kepler.ts    (ellipse ->   |        +-----------------------------------+
  |               position)     |
  |  time.ts      (UTC <-> ET)  |
  |  bodies.ts    (GM, radius)  |
  |  createEphemeris({flatten}) |  state(planet, et) -> position, velocity
  +--------------+--------------+
                 |
                 v
  +-----------------------------+
  | packages/physics            |
  |  simulate()  adaptive       |  probe pulled by the Sun + chosen planets
  |              Dormand-Prince |  -> samples, encounters, how it ended
  |  launch.ts   patched-conic  |
  |              Earth departure|
  |  lambert.ts  launch-window  |
  |              search         |
  +--------------+--------------+
                 |
                 v
  +---------------------------------------------------------------+
  | apps/game  (browser)                                          |
  |                                                               |
  |   main thread (React UI)          Web Worker (sim.worker.ts)  |
  |   +--------------------+  aim     +-------------------------+ |
  |   | campaign/ gesture |--------->| simulateShot()          | |
  |   | decks, profiles   |  preview | + level's frozen sim    | |
  |   | Three + Canvas    |<---------| analyzeShot()           | |
  |   | scoring, progress |  result  | findHint()              | |
  |   +--------------------+          +-------------------------+ |
  |            |                                                  |
  |            v  localStorage (canonical pilots and stars)       |
  +---------------------------------------------------------------+
                 |
                 v  npm run build -> apps/game/dist (static files)
         Firebase Hosting and Pages (via .github/workflows/release.yml)
```

## The parts

### `packages/ephemeris`: where the planets are

- `src/elements.ts` holds NASA/JPL's Table 1: six numbers per planet describing its
  orbit, plus how fast each number drifts per century. Valid from 1800 to 2050.
- `src/kepler.ts` solves Kepler's equation, which turns those numbers and a time into a
  position and velocity on the ellipse.
- `src/time.ts` converts between calendar time (UTC) and the physics time "ET".
- `src/bodies.ts` gives each body its gravity strength (GM), radius, colour and name,
  and computes spheres of influence (the region where a planet's pull dominates the
  Sun's).
- `createEphemeris({ flatten })` wraps it all in one interface:
  `state(id, et)`, `soiKm(id, et)` and `bodies`. `orbitPath()` gives points for drawing
  an orbit.

### `packages/physics`: how the probe flies

- `simulate()` (`src/simulate.ts`) integrates the probe's path under the Sun's gravity
  and any chosen planets. It uses an adaptive Dormand-Prince 5(4) integrator
  (`src/dopri5.ts`): it takes big steps in empty space and small steps near planets, so
  a fast probe cannot jump through one. It reports samples along the path, close
  encounters, the closest approach to each body, and why the flight ended (time up,
  impact, too close to the Sun, escaped, reached the target's sphere of influence, or
  step limit).
- `sampleAt()` interpolates smoothly between samples (cubic Hermite) for animation.
- `departureState()`, `deltaVFromLeo()` and `c3()` (`src/launch.ts`) model the launch
  from Earth.
- `lambert()` and `bestDirectTransfer()` (`src/lambert.ts`) find the cheapest direct
  transfer between two planets over a grid of launch dates and flight times. Levels use
  them to find real launch windows and par values.

### `apps/game`: the game

- `src/sim/shot.ts` is the single path from an aim to a flight: `simulateShot()`, run
  with the frozen integrator settings the level carries in its `ShotRequest`
  (`SIM_SETTINGS` for the campaign and the inner-planet sandbox, `OUTER_SIM_SETTINGS`
  for sandbox targets beyond Mars), and `analyzeShot()`, which turns a flight into what
  the HUD and scoring need.
- `src/sim/sim.worker.ts` runs those on a background thread; `src/sim/useSimulation.ts`
  is the React side of that conversation.
- `src/campaign/` owns the default single-screen shell and persistent scene. Its
  controller retains the original worker and scoring contracts. Entry, level,
  Launch window and body inspection share a scene, ET and preferences.
- The scene uses camera-relative coordinates in Three.js, with a Canvas fallback.
  Both project the campaign's flattened ephemeris and the worker's Hermite path.
  Body enlargement changes display radii, not centre positions or flight samples.
  The old `src/ui/`, `src/input/` and most of `src/render/` remain as reference code.
- `src/levels.ts`, `src/scoring.ts` and `src/progress.ts` hold the campaign, the star
  rules and saved progress. Each level names its settings (`sim`), its par and, where
  it differs from the default, its par tolerance and capture-zone size;
  `shotRequestFor()` and `hintQueryFor()` turn a level into the requests the worker
  runs.
- `public/sw.js` caches the game's own files so it keeps working offline after the
  first visit.

### Shared presentation and the lunar study

`packages/presentation` contains the collector, engine chamber, crew pod, drone,
icons, sound synthesis and entry timing. It imports no app. The original Moon study
re-exports these modules and keeps its lunar controller in `apps/prototype`.
The campaign never uses the study's limited-angle burn or local Earth-Moon frame.

Credited imagery and astronomy presentation data remain canonical in
`apps/prototype/public/observatory`. `apps/game/observatory-assets.ts` mounts that
directory during development and copies it to the static build without a second
checked-in media collection. Major moons are shown only inside the rail interval
in `satellite-data.json`; no historical mission reuses a clamped modern moon pose.

### Campaign persistence and ownership

`src/campaign/session.ts` validates and copies a whitelisted canonical save. A
sandbox save includes its original UTC window start, and hinted attempts retain
their star cap. Restoration reconstructs `ShotRequest` from the level catalogue,
then waits for a matching worker preview before restoring ET. It does not trust
serialized simulation settings, paths or results.

`src/campaign/profiles.ts` keeps these sessions and earned progress in the versioned
campaign namespace. The first pilot may import the existing legacy progress key;
it does not overwrite that key. Each release also owns a generation, so a late
success or failure cannot launch or cancel a newer pilot's shot. The local cloud
demo has a separate store, revisioned drafts and explicit conflict choices. It has
no connection to Firebase or a real identity provider.

## Conventions: units, frames and time

These rules apply everywhere physics happens. Mixing them up still draws a believable
orbit, which is why they are strict.

| What | Convention |
|---|---|
| Distance | kilometres (km) |
| Speed | kilometres per second (km/s) |
| Gravity strength (GM) | km³/s² |
| Time inside physics | **ET**: seconds of TDB since J2000 (1 January 2000, 12:00 TDB) |
| Frame | heliocentric (Sun at the centre), ecliptic and equinox of J2000: +x points to the March equinox direction, the x-y plane is Earth's orbital plane |
| Angles shown to players | degrees; inside the maths, radians |

**Time scales in plain words.** Clocks on Earth show UTC, which occasionally gets a
leap second. Orbit maths needs a perfectly smooth clock, so Starshot converts UTC to
TDB (a smooth astronomical time scale) at the edges, with `etFromIso`, `etFromDate` and
`dateFromEt`. In 2026 the difference is 69.184 seconds. The tiny difference between TDB
and TT (under 2 milliseconds) is ignored. Physics code never reads the computer's clock
directly.

**"Earth" is the Earth-Moon barycentre** (the balance point of Earth and the Moon),
because that is what JPL's Table 1 describes. Jupiter to Neptune are their system
barycentres, for the same reason.

## Why the game is flat (2D)

A slingshot on a flat screen can aim left, right, harder or softer, but not up or down.
Real orbits are tilted by up to 7 degrees (Mercury), so in 3D a perfect-looking shot
could pass thousands of kilometres above or below its target. The game therefore uses
`createEphemeris({ flatten: true })`, which squashes every planet's position and
velocity onto the ecliptic plane (z = 0). Inside that flat world, gravity, masses,
dates and launch windows are all real. Decision D6 records this.

The packages are not limited to 2D: without `flatten` they work in full 3D, which the
future orrery will use.

## The launch: a patched-conic departure

Escaping Earth's gravity takes hours; a trip to Mars takes months. Simulating the
escape in detail would need tiny time steps for no gameplay benefit. Instead Starshot
uses the standard *patched-conic* shortcut:

1. The player chooses the probe's speed and direction **after** escaping Earth (the
   "hyperbolic excess speed", v∞).
2. The probe starts at Earth's centre, moving at Earth's velocity plus v∞
   (`departureState()`).
3. `simulate(..., { departFrom: "earth" })` ignores Earth's gravity until the probe is
   two spheres of influence away, then switches it back on (so a probe can still swing
   past Earth later).
4. The cost shown to the player is the rocket burn needed from a 200 km parking orbit
   (`deltaVFromLeo()`), the number real mission planners compare.

This is also how real launch windows are computed, so the game's aim agrees with the
Lambert solutions used to build levels.

## Determinism: what you see is what you get

- **Same input, same output.** The physics has no randomness and no hidden clock.
  Given the same launch time, aim and settings, `simulateShot()` returns the same path.
- **One settings object per level.** Each level carries one frozen settings object
  (`Level.sim`, either `SIM_SETTINGS` or `OUTER_SIM_SETTINGS` from
  `apps/game/src/sim/shot.ts`) inside every `ShotRequest`, and the aiming preview and
  the real launch both call `simulateShot()` with that request (decision D6). The launch
  re-runs the preview's calculation, so the flight matches the dotted line.
- **Tests fly the same code.** `apps/game/src/levels.test.ts` flies every level's known
  solution, par shot and hint through `simulateShot()` with the level's own settings,
  so a change that breaks a level fails the build.
- **Limit.** Results are identical on the same JavaScript engine. Different browsers
  may differ in the last digits of functions like `Math.sin`, which can grow over a long
  flight. Anything that compares results across devices (such as a future leaderboard)
  must allow a small tolerance rather than expect exact equality.

## The worker model

The physics runs in one dedicated module Web Worker, so dragging the slingshot never
stutters, even on a phone.

- **Preview: latest request wins.** While the player drags, the UI sends aims at most
  every 30 ms (`PREVIEW_THROTTLE_MS`). At most one preview is being computed; a newer
  aim replaces any queued one, so the worker never falls behind.
- **Launch and hint: awaited.** A launch request runs the identical simulation and the
  UI animates the result. A hint request searches for a working shot in the worker.
- **Budget.** Measured in Node 22 over 432 aims per level (the docblocks above
  `SIM_SETTINGS` and `OUTER_SIM_SETTINGS` hold the numbers): a median of 2 ms on the
  Mars and Venus levels, 8 ms on Big Game and the Grand Tour, 7 to 8 ms in the Mars
  sandbox, and about 30 to 45 ms for the slowest outer-sandbox shot (an orbit that
  grazes the Sun). The physics test suite fails if a 3-year preview takes more than
  400 ms in CI.
- Module workers do not run from `file://` pages, which is one reason the game must be
  served by a web server (see [hosting.md](hosting.md)).

## Quality checks

`npm run gates` (`scripts/gates.mjs`) runs every check: public-repo hygiene, the
untouched `third_party/astlo`, the agent configuration, type checking, tests and the
build. CI runs it on every pull request, and the Web release workflow runs it before each
deploy. Accuracy budgets are in `packages/ephemeris/test/ephemeris.test.ts`; integrator
and timing checks in `packages/physics/test/physics.test.ts`.

---

## Future: a 3D map of the Solar System (`apps/orrery`)

**Not built yet.** Planned as a separate app in the same repository (decision D5).

- three.js with React Three Fiber, reusing `@starshot/ephemeris` **without**
  flattening, so orbits keep their real tilts.
- A readable default scale (distances compressed but directions kept true) with a "true
  scale" toggle, planets drawn larger than life with a size badge, tap-to-focus, and a
  time scrubber with speed controls and a **Now** button.
- Rendered only when something changes, to save phone batteries.
- Shares the time, units and frame conventions above, so a position in the map and in
  the game always agree.

## Future: the astlo data gate

**Not built yet.** It becomes relevant only if Mark Macharia grants a licence that
allows Starshot to use astlo's output (decisions D2 and D4). The fixed build in
`python/astlo/` (D10) would be the natural candidate, and it too would need that licence
and this gate.

The contract: astlo (or any other source) would supply a data pack in which **every
body records where its numbers came from and whether they passed validation**. The app
uses a body's astlo numbers only if that body passed.

```json
{
  "schema": "ephem.snapshot/1",
  "epoch": { "jd_tdb": 2461344.5 },
  "frame": "ECLIPJ2000",
  "center": "SUN",
  "units": { "length": "km", "velocity": "km/s", "gm": "km^3/s^2" },
  "bodies": [
    {
      "id": "EARTH",
      "r": [0, 0, 0],
      "v": [0, 0, 0],
      "source": "reference",
      "validation": {
        "ref": "JPL Horizons",
        "epochs": 5,
        "max_direction_error_arcmin": 23.85,
        "budget_arcmin": 1.5,
        "pass": false
      }
    }
  ]
}
```

(The vectors above are placeholders; the validation numbers are illustrative.)

- `source` is `"reference"` (NASA/JPL, Starshot's own ephemeris) or `"astlo"`.
- The gate compares directions as seen from the Sun, at the same dates as the existing
  Horizons fixtures, against the same per-planet budgets as
  `packages/ephemeris/test/ephemeris.test.ts`. Distances alone are not enough: the
  [astlo evaluation](astlo-evaluation.md) found distances that matched while directions
  were off by up to 87 degrees.
- A body that fails keeps `"source": "reference"`. The method is written up in
  `.claude/skills/astlo-upstream/reference.md`.

## Future: a leaderboard

**Not built yet.** Today Starshot is fully static (decision D7). If a leaderboard is
added, the design is:

- **A separate Firebase project used only by Starshot.** Never reuse a project that
  belongs to anything else.
- **Configuration follows D13.** The planned production web configuration identifies
  the project and belongs in its one allow-listed file. Development configuration
  comes from environment Variables. The current static release needs neither; its
  Hosting deployment identifiers never enter the Vite build.
- **Locked down on the server side:** Firestore security rules that allow a player to
  write only their own score, in the expected shape, and **App Check**, so only the real
  Starshot site can call the backend.
- **No trust in the client.** A submitted score carries the shot (level, launch date
  and aim) as well as the result. A server function re-simulates it with the same
  `@starshot/physics` code and the level's own frozen settings, and records the score only if the
  re-simulated flight earns it (within the small cross-device tolerance described under
  Determinism).
- **No service-account keys in the repository, ever.** Deployment of rules and functions
  would authenticate from GitHub Actions with short-lived credentials (workload identity
  federation), not a stored key file.
