# Rust core supplement (D38)

This file adds the lunar and current-path content that the Band B specs lack. It governs PR9 to PR17 with
[the Band B specs](00-plan.md#band-b-the-rust-core-turnkey) and
[the Rust proof boundaries](06-resumption.md#rust-and-later-proof-boundaries). It cites their criteria and proof
commands by line and lists only what it adds. The specs predate D33 and D38, so their requests and file maps are
planetary and TypeScript-only (00-plan.md:772-779). Citations were drafted at fdd6810 and re-read at daa1d8c, the PR7
group's tip, with this checkpoint's edits to `AGENTS.md`, `docs/README.md` and `06-resumption.md`; re-locate each by
symbol before building. Where a spec row and this file
disagree on lunar or current-path content, this file applies once the plan approves its row. That includes the `hermite`
home, the `norm` formula, `dateFromEt` rounding and the PR16 UI rows. The builder logs each in
[the deviation log](05-deviation-log.md) (AGENTS.md:84). A conflict with a numbered decision stops for the owner. Rows
marked proposed need the orchestrator's approval in the plan before `agent-ready` (G7).

Paths: `model.ts`, `parking.ts` and `flight.ts` alone are in `packages/physics/src/lunar/`; `vec.ts`, `time.ts` and
`bodies.ts` alone are in `packages/ephemeris/src/`; `lunar.test.ts` alone is `packages/physics/test/lunar.test.ts`;
`flight.test.ts` alone is `apps/prototype/src/lunar/flight.test.ts`; `campaign/` and `sim/` are under `apps/game/src/`.
Other prototype paths are written in full.

## Cross-cutting rules

### Starting point

- At daa1d8c PR6 to PR8 are built in the stack (#100 to #102). The workspace holds `crates/starshot-math` over `libm` =0.2.16 without default
  features (`Cargo.toml:17-18`), the root `clippy.toml` fence, and `fixtures/math/golden.json` with 7,916 cases. The
  gates `rust-fmt`, `rust-clippy`, `rust-test` and `rust-licences` (`scripts/gates.mjs:68-76`) run in CI's `checks`
  job with `STARSHOT_REQUIRE_RUST=1` (`.github/workflows/ci.yml:29-31`). The `rust-arm64` job (`ci.yml:60-73`) passed
  every golden case on aarch64 in run 41978913715 of PR #101.
- PR7 and PR8 add `tools/ephem`, the pack in `data/ephem/de440s-100km` (20 decade files, `pack.json`, 9 reports), and
  the fixture's `geocentric.moon` and `heliocentric_extra.earth` (`horizons.json:562-563`, `:631-632`). No
  `starshot-ephemeris`, `starshot-physics`, `starshot-game` or wasm crate, `packages/core-wasm/` or
  `fixtures/conformance/` exists yet (`ls`); PR9 to PR15 add them in order (G1).
- The TypeScript oracle is `npx vitest run packages apps/game apps/prototype/src/lunar/flight.test.ts`
  (06-resumption.md:121). It stays green until PR17's last commit deletes the package tests (00-plan.md:1677). After it,
  the oracle is the frozen `fixtures/conformance/*.json` that the Rust tests read (00-plan.md:1252), with
  `npx vitest run` on the core.
- Each Rust row below lists every assertion in its cited range, with the same bound or a tighter one.
  `toBeCloseTo(x, d)` passes when the difference is under 10^-d / 2.

### Lunar ownership map (proposed)

One home per symbol. Rust names are the TypeScript names in snake case; `LunarRequest` and `LunarFlight` add a prefix to
avoid planetary clashes. Constants keep their TypeScript names inside a `lunar` module, so the two Earth GMs never share
a path. The ephemeris crate holds only what `LunarModel` reads, since the ledger gives PR9/10 the fixed basis and the
Earth/Moon derivation (06-resumption.md:139-140). `starshot_physics::lunar` re-exports those items, as
`packages/physics/src/lunar/index.ts:1-3` exports all of them today.

| TypeScript today | Rust home | PR |
|---|---|---|
| `packages/physics/src/hermite.ts:3-36` `Knot`, `hermite` | `starshot-ephemeris/src/hermite.rs`. PR11's `starshot-physics/src/hermite.rs` (00-plan.md:1057) re-exports it; no second copy (G6) | PR10 |
| `model.ts:6-7`, `:13`, the constants `LunarModel` reads | `starshot_ephemeris::lunar`: `EARTH_GM` = 398600.43550702266, `MOON_GM` = 4902.8001184575496, `LAUNCH_ET` = 846853269.184 | PR10 |
| `model.ts:15-51` `RailData`, `Basis`, `LunarModel` | `starshot_ephemeris::lunar`: `Basis`, `RailError`, `LunarModel::new(knots: &[f64]) -> Result<LunarModel, RailError>`, `relative`, `bodies`, `basis` | PR10 |
| `model.ts:4`, `:8-12`, the other constants | `starshot_physics::lunar` in `lunar/mod.rs`: `DAY`, `EARTH_RADIUS` = 6371, `MOON_RADIUS`, `FUEL_BUDGET` = 3.55, and `MOON_SOI_KM` as `f64::from_bits(0x40f0286ec632c31c)`, 66182.9233882543 km (node at fdd6810), since `starshot_math::pow` is a plain `pub fn` (`crates/starshot-math/src/lib.rs:26`, `:61`); `LunarError` | PR11 |
| `parking.ts:5-24` | `starshot_physics::lunar::parking`: `ParkingOrbit { frame_et: Option<f64>, epoch_et, phase_deg, radius_km }`, `parking_period`, `parking_phase`, `parking_state` | PR11 |
| `flight.ts:7-33` | `starshot_physics::lunar::flight`: `LunarSettings`, `SETTINGS` (`flight.ts:8`; the PR3a row's `LUNAR_SIM_SETTINGS` at 00-plan.md:593 is stale), `LunarRequest` (the game's alias, `sim/flight-request.ts:2`), `request_for` | PR12 |
| `flight.ts:34-142` | Same module: `LunarFlight`, `LunarImpact { Earth, Moon }`, `sample_flight`, `simulate_lunar -> Result<LunarFlight, LunarError>` | PR12 |
| `sim/flight-request.ts:7-27`, `sim/lunar-request.ts:6-11`, `sim/lunar.ts:9-30` | `starshot_game::lunar`: `LunarShotRequest`, `FlightRequest { Planetary, Lunar }`, `LunarResult`, `LunarHintQuery`, `lunar_request`, `run_lunar`, `lunar_hint` | PR13 |
| `sim/lunar-hint.ts:14-116` | `starshot_game::lunar_hint`: `Route`, `LUNAR_SEARCH_BUDGET` = 240, `LUNAR_GRID` = `moon-grid/1`, `by_cost`, `seeds_of`, `refinement_of`, `LunarSearch` (one flight per step, G12), `find_lunar_hint` | PR14 |
| `apps/game/src/missions.ts:5-29`, physics fields only | `starshot_game::levels`: `MissionId`, `LunarLevel` with window, default launch, target, maximum flight days, burn cap, attractors, settings and par burn; mission order; `next_mission`. Number, title, blurb and par source text stay in TypeScript (00-plan.md:1138-1139) | PR14 |
| `packages/ephemeris/data/moon-rail.json` | Stays in place until PR17's first commit moves it to the home the owner rules (G4) | PR17 |

- `LunarModel` owns a `Table1Ephemeris { flatten: false }`, as `model.ts:19` does. The game worker's planetary ephemeris
  is flattened (`sim/sim.worker.ts:11`), so `Core::new_table1(flatten)` (00-plan.md:1169) never selects the lunar mode.
- At run time the core takes the rail as its flat knot array, 7 numbers per knot (`model.ts:23-29`), from the lazy
  loader. The wasm never embeds the rail, which stays out of the entry graph (docs/README.md:70); PR15 forbids serde in
  the wasm (00-plan.md:1197).
- Rust tests read the rail with `include_str!` and the dev-only `serde_json` (00-plan.md:994) from its home, not from
  `fixtures/` (00-plan.md:790-791): the game ships it, and a copy would be a second source. Log it (G8).
- Errors keep their text and class. `RailError::OutsideDates` is "Outside the lunar rail dates" (`model.ts:25`).
  `LunarError` carries the `RangeError` text at `parking.ts:19` and the `Error` texts at `flight.ts:49`, `:98` and
  `:128`.

### Fixed frame and coasting epoch

- The parking plane is fixed at `LAUNCH_ET` = 846853269.184, which `dateFromEt` prints as 2026-11-02T01:00:00.000Z
  (`model.ts:13`; D38 at docs/decisions.md:1002-1007). `basis` defaults to that ET and to phase 225 degrees
  (`model.ts:43`).
- `frameEt` picks the plane; `epochEt` is the coasting epoch, the origin of phase advance. Both call sites read
  `frameEt ?? epochEt` (`parking.ts:21`, `flight.ts:53`); Rust keeps the same fallback. The game always sets it
  (`campaign/lunar.test.ts:81`) and refuses a save whose `frameEt` differs (`:130`).
- Two phase formulas differ in operation order. `parkingPhase` wraps to 0 to 360 degrees (`parking.ts:13-14`); the
  departure basis adds `sqrt(GM / r^3)` times the elapsed time, in degrees, unwrapped (`flight.ts:53`). Port both as
  written.
- Lunar day n is `LAUNCH_ET + n * DAY`, not `launchEtForDay`. Day 27 prints 2026-11-29T01:00:00.000Z
  (`sim/lunar-hint.test.ts:97-99`).

### Full 3D state and sub-day ET

- The lunar flight is 3D, heliocentric ECLIPJ2000, in km and km/s (`sim/flight-request.ts:6`, `parking.ts:16`). The flat
  world is planetary only (D33, docs/decisions.md:838-840).
- The captured state is the whole `LunarShotRequest`: launch ET, parking orbit, burn speed and angle, duration, approach
  radius, scope, settings and the stop flag (`flight.ts:10-18`, `sim/flight-request.ts:7-12`). Every field crosses the
  ABI as f64 bits; nothing is rebuilt from a day or a phase. Golden files store t and all six r and v components as
  16-hex-digit bits, as the PR15 replays do (00-plan.md:1171).
- A lunar launch is any f64 ET. The game flies `LAUNCH_ET + 8.004` s and `+ 321` s (`campaign/lunar.test.ts:115`,
  `:124`), so lunar Rust types carry `launch_et: f64`. UTC enters through `et_from_iso` and leaves through
  `unix_ms_from_et` (00-plan.md:990). The lunar replay format waits for the owner (G2).

### Pack budget and lunar probes

- AC4 (00-plan.md:113) and D17 (docs/decisions.md:446) set the pack's 150 km budget, the geocentric Moon included. The
  last decade file, `2140.bin`, ends 2150-01-01 TDB (00-plan.md:915-916, :952). The lunar path reads `moon-rail.json`
  through PR17 (the ownership map row at :60); PR10 validates the pack's Moon and does not fly it (00-plan.md:1043). PR8's
  reports pass, the largest Mars at 86.606 km and the Moon at 56.810 km (`data/ephem/de440s-100km/VALIDATION.md:12-20`).
  They bound position at sampled points only; the PR10 edge cases list what they miss.
- Rust checks its reader against Horizons only at the five fixture epochs, JD 2443375.5 to 2469807.5, that is 1977-08-20
  to 2050-01-01 TDB (`horizons.json`), and `dense_table1` checks planet directions only up to 2050-01-01
  (00-plan.md:1030). No Rust test reads the pack after that instant, or its Moon between fixture dates. PR10 adds
  `fixtures/conformance/rails.json` (proposed), written by a `tools/ephem` command through `pack.read` and
  `chebyshev.evaluate` (00-plan.md:940, :943). It holds all 9 bodies at every 73rd epoch of the 5-day grid, at each
  decade file's first instant and at the pack's last, plus the Moon every 5 days over the 2020 file. Each point follows
  PR10's later-segment rule (00-plan.md:1034-1035). `tests/rails.rs` holds the Rust reader within 1 m of it.
- The rail, measured with node at fdd6810, has 713 knots from 2026-11-01T23:59:59Z to 2027-08-31T17:09:35.780Z UTC
  (about 3601 s before `LAUNCH_ET` to 302.673 days after) and 5 probes, in 95,110 bytes. Probes hold position under
  0.1 km and velocity under 1.1e-5 km/s (`lunar.test.ts:14-18`, `flight.test.ts:21-27`). The barycentre identity holds
  under 1e-6 km and 1e-12 km/s (`lunar.test.ts:20-24`, `flight.test.ts:28-32`). Rust asserts these from PR10 on; no
  lunar test reads the 150 km figure. The pack's Moon misses the probes, so its replacement waits for the owner (G5).

### Four-runtime bit identity

- The runtimes are AC6's four (00-plan.md:115; D16 at docs/decisions.md:433-434): native x86_64 in `checks`, native
  arm64 in `rust-arm64` on `ubuntu-24.04-arm` (`.github/workflows/ci.yml:60-62`), V8, and JavaScriptCore through Bun.
  The two native runs agree on all 7,916 maths golden cases (Starting point).
- Real arm64 means the tests run on arm64 hardware, not a cross-compile or QEMU. Run 41978913715's log names an
  aarch64 host, but no step checks it. `rust-arm64` starts with the step `test "$(uname -m)" = aarch64` and `checks`
  with `test "$(uname -m)" = x86_64`, so a wrong runner fails (proposed).
- Bit identity is Rust against Rust across the four. Rust matches TypeScript bits only on arithmetic-only paths
  (00-plan.md:786-788). The lunar path calls `Math.hypot` through `norm` (`vec.ts:8`), `Math.sin`, `Math.cos` and `**`
  (`model.ts:11`, `:47-48`; `flight.ts:21-29`, `:53`, `:62`, `:67`; `parking.ts:12`). Those fields take the bounds
  stated with each golden table (G10).
- A TypeScript `toEqual` or `toBe` on one engine becomes equal bits on each of the four. Lunar captured states join the
  AC6 corpus (06-resumption.md:42).

### Both apps before deletion

- `apps/game` loads through `sim/sim.worker.ts:11-18`, `sim/lunar-model.ts:1-6` and the precache
  (`apps/game/public/sw.js:7`, `:12-14`). `apps/prototype` re-exports the core (`apps/prototype/src/lunar/model.ts:1-2`,
  `apps/prototype/src/lunar/flight.ts:1-2`). It builds a `LunarModel` on its main thread
  (`apps/prototype/src/use-flight.ts:34-38`) and in its worker (`apps/prototype/src/lunar/worker.ts:4-11`). The PR16
  rows below map each.
- PR16 moves both apps onto the core. PR17's first commit moves the rail and updates every reader; its last deletes the
  packages. Each commit passes the oracle, `npm run build` and `npm run build:prototype`. The root `build` builds
  `@starshot/game` alone (`package.json:25`, `scripts/gates.mjs:67`), and CI builds no other app
  (`.github/workflows/ci.yml:155`).

### Size and splits

These are estimates, not measurements: the Rust lines are taken as twice the TypeScript each PR ports (`wc -l` at
daa1d8c), plus tests. The cap is about 400 contentful lines per member spec (`.claude/rubrics/pr-review.md:56-58`); the
600-line threshold is PR14's (00-plan.md:1135-1136).

| PR | Spec size | Lunar TypeScript ported | Estimate added | Past 600 added lines |
|---|---|---|---|---|
| PR10 | about 430 (00-plan.md:1019) | `packages/physics/src/hermite.ts` 36, `model.ts` 51 | about 250 | PR10b on top: `hermite.rs`, `lunar.rs`, `tests/lunar.rs`, the lunar generator |
| PR11 | about 450 (00-plan.md:1048) | `parking.ts` 24 | about 120 | `parking.rs` and its cases move to PR12b |
| PR12 | about 460 (00-plan.md:1080) | `flight.ts` 142 | about 450 | PR12b on top: `flight.rs`, its tests and `lunar.json` flight cases |
| PR13 | about 430 (00-plan.md:1109) | `sim/lunar.ts` 30, `sim/lunar-request.ts` 11, `sim/flight-request.ts` 27 | about 250 | PR13b on top: game `lunar.rs`, its tests, `lunar-shots.json` |
| PR14 | about 560 (00-plan.md:1134) | `sim/lunar-hint.ts` 116, `apps/game/src/missions.ts` 32 | about 450 | `lunar_hint.rs` and its tests join the spec's PR14b, or form a PR14c past 600. A group holds one to four specs (D30), so a fifth member moves to a group of its own in the table (00-plan.md:247), logged |
| PR15 | about 520 (00-plan.md:1161) | none; lunar ABI slots and `Core` methods | about 250 | PR15b on top: the lunar slots, methods and replays |
| PR16 | about 520 (00-plan.md:1205) | `sim/lunar-model.ts` 6, `sim/load-lunar-model.ts` 43, `campaign/lunar-readiness.ts` 74, `apps/prototype/src/lunar/worker.ts` 11 | about 200 | PR16b on top: the prototype and the PR16 seams |

### Readiness check in the issue

Builders never post to GitHub (AGENTS.md:140). The orchestrator copies a group's readiness list (the last column of the
proof table at the end) into the task's `body:` in `03-work.yaml` (as at 03-work.yaml:296-305) and syncs it with
`scripts/sync-work.mjs`, or mirrors it through the GitHub connector where `--apply` lacks a token. Each item names a `file:line`, or a command with its exit code. `status:blocked`
(03-work.yaml:298) gives way to `agent-ready` (.github/labels.yml:104; `.claude/skills/track-work/SKILL.md:54-56`) only
when every item has evidence and no open gap names the spec. A builder re-runs every item at its base and reports each
as held or failed; one failure ends the build.

## PR9 and PR10: ephemeris crate and rails reader

The group builds on `codex/v1-band-b-supplement`, this checkpoint, in five declared parts (00-plan.md:241-245, deviation row 77). The dependency column lists PR6
for PR9 (00-plan.md:166); the group base governs.

### Files and types

- PR10 adds `src/hermite.rs` and `src/lunar.rs` from the map, wired in `src/lib.rs`. The crate still depends on
  `starshot-math` alone (00-plan.md:1010).
- Each Earth constant keeps its digits in its own place: `EARTH_ONLY_GM` = 398600.435507
  (`packages/physics/src/launch.ts:4`, 00-plan.md:991); `lunar::EARTH_GM` = 398600.43550702266 (`model.ts:6`); the
  Earth-Moon GM 403503.235502 and radius 6371.0084 in `BodyInfo` (`bodies.ts:28`); `lunar::EARTH_RADIUS` = 6371
  (`model.ts:8`). The ledger keeps the study digits apart (06-resumption.md:108).
- Two Earth-Moon splits coexist. `RailEphemeris::earth_centre` uses the pack's EMRAT (00-plan.md:1028);
  `LunarModel::bodies` uses `MOON_GM / (EARTH_GM + MOON_GM)` with the study digits (`model.ts:36`). Neither replaces the
  other in Band B.
- Proposed: `vec::norm` is the square root of `x*x + y*y + z*z`, in that order, in place of `Math.hypot` (`vec.ts:8`).
  Log it (G10).

### Lunar golden cases

Fixture: `moon-rail.json`, plus `fixtures/conformance/lunar.json` from a new write-or-compare generator,
`packages/physics/test/conformance-lunar.test.ts` (proposed; PR9's pattern and write flag, 00-plan.md:1000). PR10 writes
model cases at `LAUNCH_ET`, `+ 321`, `+ 27 * DAY` and each probe ET. Fixed-frame and closure cases need `parking_state`,
so they belong to PR11.

| Case | TypeScript source | Rust assertion |
|---|---|---|
| Probes | `lunar.test.ts:14-18`, `flight.test.ts:21-27` | All 5 probes: position under 0.1 km, velocity under 1.1e-5 km/s |
| Barycentre | `lunar.test.ts:20-24`, `flight.test.ts:28-32` | At `LAUNCH_ET`, `+ 27 * DAY` and 101 ETs over 7 days: under 1e-6 km and 1e-12 km/s |
| Relative state, sub-day | `lunar.test.ts:37`, `model.ts:22-31` | `relative` bits equal `lunar.json`: the search and Hermite are arithmetic only (`packages/physics/src/hermite.ts:10-36`) |
| Bodies | `model.ts:32-42` | Within PR9's Table 1 bounds of `lunar.json`, 1 m and 1 mm/s (00-plan.md:999), since the barycentre comes through Table 1 |
| Fixed basis | `model.ts:43-50` | `basis(LAUNCH_ET, 225.0)` matches `lunar.json`, each unit-vector component within 1e-15 (proposed); the defaults are exactly `LAUNCH_ET` and 225 |
| Moon moves with the date | `lunar.test.ts:42` | Relative position moves over 100,000 km in 8 days |
| Rail edge | `lunar.test.ts:54-57`, `flight.test.ts:33` | Before the first knot or after the last: `RailError::OutsideDates` |

### Edge cases

- `etFromIso` appends Z unless the text contains z or Z, ends in a `+` or `-` offset written `hh:mm` or `hhmm`, or has
  10 characters or fewer (`time.ts:55-56`). In node at fdd6810 it reads `2026-11-02T01:00:00` and `2026-11-02T01:00` as
  UTC, takes both offset forms, and parses `Nov 2 2026`, which `Date` reads per engine and time zone. PR9 names two
  forms (00-plan.md:990) yet asks for exactly the forms `etFromIso` accepts (:1004). The two disagree (G17).
- `dateFromEt` uses `Math.round`, ties toward plus infinity (`time.ts:48`). Port it as `floor(x)`, plus one when
  `x - floor(x) >= 0.5`: `f64::round` sends -2.5 to -3, and `floor(x + 0.5)` sends 0.49999999999999994 to 1. Pre-1970
  milliseconds are negative, and the time test starts at 1800 (00-plan.md:997).
- `relative` throws only below the first knot or above the last (`model.ts:25`), so NaN passes in TypeScript. Rust
  rejects NaN; log it. An interior knot ET takes the later segment (`model.ts:26`), as PR10's boundary rule does
  (00-plan.md:1034-1035).
- `LunarModel::new` rejects a length that is not a multiple of 7, fewer than 2 knots, a non-finite value or a
  non-increasing t. TypeScript checks none of these (`model.ts:21`); log it. The lunar model never reads the pack, whose
  Moon panics outside coverage (00-plan.md:1028).
- PR8's reports bound position at sampled points, and nothing bounds velocity (PR8 physics audit, 06-resumption.md:227).
  Segment edges jump up to 96.8 km (Jupiter) and 36.7 km (Moon); the Moon reaches 60.24 km on a 1-minute grid against
  56.81 km reported; differentiated fit errors reach 6.36e-3 km/s for the Moon. PR10 sets a velocity budget for the
  reader, or logs that it has none. Set: a budget per body at the five Horizons epochs, about twice the worst a dense
  sample of `de440s.bsp` found (deviation row 96); a dense velocity check is findings row 54.

## PR11 and PR12: physics crate, lunar departure and flight

The group builds on `codex/v1-pr10-lunar-model` (00-plan.md:246).

### Files and types

- Planetary details the spec leaves open: Stumpff helpers are private (`packages/physics/src/lambert.ts:3`, `:9`);
  `bestDirectTransfer` returns null when nothing solves (`lambert.ts:92`); the "0.02 d" cap (00-plan.md:1096) is
  `0.02 * d / max(speed, 1e-3)` (`packages/physics/src/simulate.ts:159`).
- One `StepTolerance { rtol, atol_pos, atol_vel }` (`packages/physics/src/dopri5.ts:18-25`) serves both paths: planetary
  steps derive it from `atolKm` (`simulate.ts:120`), lunar settings set it (`flight.ts:7-9`).
- PR11 adds `starshot-physics/src/lunar/mod.rs` and `parking.rs`; PR12 adds `flight.rs`. Splits follow the size table.
- Forces: the Sun, Earth's centre with `lunar::EARTH_GM` and the Moon with `MOON_GM`, each Earth and Moon term with its
  indirect part. The barycentre is never a mass (`flight.ts:60-70`).
- Keep every loop count: crossing bisection 50 times to 0.001 s (`flight.ts:78`); graze search 30 times within 1.1 radii
  (`flight.ts:88-93`); closest-approach search 32 times (`flight.ts:133-137`); step cap
  `nearBodyFraction * d / max(0.001, relative speed)` for Earth and Moon (`flight.ts:100-101`).

### Lunar golden cases

Fixture: `fixtures/conformance/lunar.json`. PR11 adds parking and departure cases; PR12 adds flights with `entryEt`,
`impact`, `closestKm`, `closestEt`, `endEt`, `steps`, sample 0 and the last sample. Bounds against the file (proposed):
parking and departure states within PR9's Table 1 bounds, 1 m and 1 mm/s (00-plan.md:999), since Earth's centre comes
through Table 1. Flights keep `impact`, whether `entryEt` is null, and `steps` equal (00-plan.md:1101-1102). They hold
`entryEt`, `closestEt` and `endEt` within 0.01 s (as `flight.test.ts:53` does), and `closestKm` and the last position
within 1 km (00-plan.md:1090).

| Case | TypeScript source | Rust assertion |
|---|---|---|
| `MOON_SOI_KM` pin | `model.ts:11` | Bits equal the TypeScript value in `lunar.json`; within 1e-9 km of `384400.0 * pow(MOON_GM / EARTH_GM, 0.4)` |
| Parking closure | `lunar.test.ts:26-35` | One period on, position change under 1e-5 km; at 0, 0.25, 0.5, 0.75 and 1 period, radius within 5e-6 km of 6571 and speed within 5e-11 km/s of `sqrt(GM / r)` |
| Fixed frame, changed epoch | `lunar.test.ts:36-41` | Frozen at `LAUNCH_ET + 321`, re-dated 8 days later: Earth-relative r change under 1e-7 km, v change under 1e-12 km/s |
| Phase still moves | `lunar.test.ts:42-43` | Moon moves over 100,000 km; a quarter period later the craft moves over 9,000 km |
| Explicit departure vector | `flight.ts:54-58`; no TypeScript assertion | Parking state and post-burn velocity at launch match `lunar.json`; sample 0's r equals the parking r bit for bit (`lunar.test.ts:48`) |
| Sub-day and re-dated departure | None at the physics level | Departure vectors at `LAUNCH_ET + 8.004` and `+ 321`, and on day 27 with `epochEt` equal to its launch ET, in `lunar.json` |
| Real-SOI stop | `lunar.test.ts:45-53` | Entry found; last t equals `entryEt`; distance within 0.005 km of `MOON_SOI_KM`; every earlier sample at or outside it; a rerun gives equal bits |
| Graze between knots | `lunar.test.ts:58-82` | 17.33167459468716 degrees, not stopped: every knot outside the SOI; entry found between two knots; `closestEt` after entry, before the next knot, inside the SOI; outside 0.01 s before entry. Stopped: equal `entryEt`, last t equal to it, no later sample, distance within 0.01 km of the SOI |
| Study zone hit, miss, impact | `flight.test.ts:35-48` | A physics case on the 65,000 km study zone (`flight.ts:32`), never a game expectation. 3.24 km/s at 0 degrees: entry 1.582776944585 days after launch within 5e-8 days, no impact, closest under 8,100 km, a rerun gives equal samples; at 20 degrees no entry, closest over 100,000 km; at -20 degrees Earth impact and no entry |
| Study graze | `flight.test.ts:59-64` | 17.210867496829703 degrees: entry found, distance within 0.05 km of 65,000 km |
| Tighter settings | `flight.test.ts:49-57` | Entry within 0.01 s; 201 sample ETs within 0.05 km |
| Weak pulls | `flight.test.ts:10-19` | 0, 0.05, 0.2 and 0.5 km/s: scope local, at most 1 day, under 1,500 steps, no entry, `end_et` within 5e-6 s of launch plus duration; a NaN launch ET is refused |
| Rail horizon | `lunar.test.ts:54-57` | `LunarError::Rail(RailError::OutsideDates)` |

### Edge cases

- The burn guard says "The departure burn is outside the collector fuel budget" for non-finite input too
  (`flight.ts:47-50`); keep the text. `request_for` clamps the burn to 0 to 3.55 km/s without an error (`flight.ts:20`).
- `parking_state` refuses a non-finite `epoch_et`, `phase_deg`, `radius_km` or ET, or a radius at or below 6371 km
  (`parking.ts:18-19`). It never checks `frame_et`; neither does Rust.
- No test asserts any of the four `LunarError` texts (`git grep` over `*.test.ts`, no match). PR11 and PR12 add a Rust
  test for each, with matching generator cases.
- The check at `launchEt + durationSeconds` (`flight.ts:51`) and the parking state at launch bound every later rail
  read.
- A flight on the pack crosses segment edges that jump up to 96.8 km (PR10 edge cases). PR12 decides whether the
  integrator stops at each edge (06-resumption.md:227); Band B flies no pack (00-plan.md:1043), so the rule binds PR18.

## PR13 and PR14: game crate with the lunar variant

The group builds on `codex/v1-pr11-physics-crate` (00-plan.md:247).

### Files and types

- Planetary files as specified (00-plan.md:1115-1122, :1143-1148). PR13 adds `starshot-game/src/lunar.rs`; PR14 adds
  `src/lunar_hint.rs` and the mission rows in `levels.rs`.
- `LevelId` omits Moonshot (`apps/game/src/levels.ts:18`) and `MissionId` adds it (`apps/game/src/missions.ts:12`). Rust
  keeps both; the PR3a line "LevelId gains moonshot" (00-plan.md:598) is stale.
- `settings.rs` adds `pub mod lunar { pub use starshot_physics::lunar::flight::SETTINGS; }` beside `SIM_SETTINGS` and
  `OUTER_SIM_SETTINGS` (00-plan.md:1115). Frozen settings then come from one module (D6) under their TypeScript names.
  The value stays in physics, as in TypeScript (`flight.ts:8-9`, `apps/game/src/missions.ts:21`).
- `run_lunar` fills `ShotAnalysis` as `sim/lunar.ts:9-23` does: a hit is SOI entry, closest is the two-body periapsis
  about the Moon, bullseye is a periapsis under 10 Moon radii (`:22`), and `delta_v_kms` is the raw burn (`:23`).
  `lunar_request` needs constants only, never the rail (`sim/lunar-request.ts:5`).
- `Hint.source` is an inline union of `lambert`, `curated` and `lunar-grid` (`sim/hint.ts:61`); Rust names it
  `HintSource`. The reference guide is day 0, 3.24 km/s at 0 degrees, phase 225 (`sim/lunar.ts:26-30`).

### Lunar golden cases

Fixture: `fixtures/conformance/lunar-shots.json`, from a lunar section (proposed) in PR13's generator
`apps/game/src/sim/conformance.test.ts` (00-plan.md:1122). Each entry stores its request and analysis as bits, plus the
bits of sample 0 and the final sample. Request fields are copies, exact arithmetic or the pinned `MOON_SOI_KM`, so they
match bit for bit; only a local shot's `durationSeconds` comes through `sqrt` and `**` (`flight.ts:29`) and holds within
1e-9 relative, with `scope` equal. Analysis flags are equal; times and distances take PR12's flight bounds.

| Case | TypeScript source | Rust assertion |
|---|---|---|
| Hit | `campaign/lunar.test.ts:55-58` | 3.24 km/s at 0 degrees: hit, `delta_v_kms` equal to 3.24, bullseye, end time equal to `end_et` |
| Miss | `campaign/lunar.test.ts:59` | 20 degrees: no hit, closest over 100,000 km |
| Earth impact | `campaign/lunar.test.ts:60-61` | -20 degrees: terminated by Earth, no hit |
| Real-SOI graze | `campaign/lunar.test.ts:77-86` | 17.33167459468716 degrees: launch ET `LAUNCH_ET`, parking frame and epoch `LAUNCH_ET`, phase 225, radius 6571, approach radius `MOON_SOI_KM`; hit; terminated at SOI entry; last t equals `end_et`; distance within 0.01 km of `MOON_SOI_KM` |
| Sub-day launch | `campaign/lunar.test.ts:99-121` | At `LAUNCH_ET + 8.004`, two runs give equal result and analysis bits |
| Sub-day request | `campaign/lunar.test.ts:124-125` | `lunar_request` at `LAUNCH_ET + 321` against the TypeScript request, bounds above. Session validity (`:126-135`) stays in TypeScript |
| Moonshot score | `campaign/lunar.test.ts:172`, `:176`; `campaign/use-result.ts:26-39` | In `tests/scoring.rs`: par 3.24 at the default tolerance 1.1 (`apps/game/src/levels.ts:68`), a hit and bullseye at the raw burn 3.24, earns 3 stars |
| Reference guide | `sim/lunar-hint.test.ts:117-135` | Day 0 at `LAUNCH_ET`, source curated, par 3.24 (`apps/game/src/missions.ts:22`); each reference query, budget 0 included, flies once; budget 1 gives the reference as `lunar-grid` after 1 flight |
| Search order | `sim/lunar-hint.test.ts:71-81` | 236 tuples in the fixed order; a rerun gives equal shots, analyses and hint; day 0 at 3.120 km/s and 0 degrees after 236 simulations |
| Flown values | `sim/lunar-hint.test.ts:82-96` | Each burn equals its label over 1000 and each angle its label over 100, exactly; each burn under `FUEL_BUDGET`; aim 0 degrees at 3.12 km/s; parking frame `LAUNCH_ET`, epoch the shot's launch ET, phase 225, radius 6571 |
| Searched guide | `sim/lunar-hint.test.ts:101-116` | The re-flown request equals the searched one; its analysis equals the search's; hit; equal closest distance |
| Budget counts | `sim/lunar-hint.test.ts:136-154` | Budgets 0, 1, 2, 167, 168, 169, 235, 239 and 240 fly 0, 1, 2, 167, 168, 169, 235, 236 and 236, each a prefix of the order; simulations and integrations equal those counts; routes none, the reference twice, the seed three times, the refinement three times; budgets 239 and 240 give equal hints |
| Controlled runner | `sim/lunar-hint.test.ts:199-213` | Only day 26 at 3.240 km/s and -20 degrees hits: that route's hint, 185 simulations |
| Cost order, seeds, refinement | `sim/lunar-hint.test.ts:216-238` | `by_cost`, `seeds_of` and `refinement_of` give the test's lists from the test's inputs |
| Rejections | `sim/lunar-request.test.ts:87-93`, `sim/lunar-hint.test.ts:155-168` | Same texts as `sim/lunar-request.ts:7` and `sim/lunar-hint.ts:62`, `:65`; no flight first |

### Edge cases

- Planetary: a capture-zone scale below 1 or NaN errs (`apps/game/src/sim/shot.ts:141-145`); a flight past 2050 is
  flagged, not refused (`sim/shot.ts:345`); the sandbox takes today as an ISO argument in place of `new Date()`
  (`apps/game/src/levels.ts:245`); `find_hint` returns none without a Lambert transfer (`sim/hint.ts:120`).
- `lunar_request` errs beyond 35 degrees (`sim/lunar-request.ts:7`). `finalRequest` clamps first
  (`campaign/contracts.ts:10`), so only direct calls reach it. `request_for` clamps an over-budget burn silently; the
  search never relies on that, and its test checks every flown burn is under the budget
  (`sim/lunar-hint.test.ts:87-88`).
- `find_lunar_hint` validates strategy and budget for both strategies before any flight (`sim/lunar-hint.ts:59-66`). The
  budget bounds only the search, so a reference query flies once at any valid budget (`sim/lunar-hint.test.ts:121-131`).

## PR15 to PR17: core-wasm, cut-over and retirement

PR15 builds on `codex/v1-pr13-game-crate`; PR16 and PR17 build on `codex/v1-pr15-core-wasm` (00-plan.md:248-249).

### Files and types

- PR15: `abi.rs` and `abi.ts` gain a slot for each field of `flight.ts:10-18` and `sim/flight-request.ts:7-27`. `Core`
  gains `load_moon_rail(knots: &[f64])`, `simulate_lunar`, `lunar_search_new`, `lunar_search_step`, `lunar_bodies`,
  `parking_state` and `lunar_basis`; the scene draws with the basis (`campaign/world.ts:23`). All proposed.
- PR15: the root `package.json` row (00-plan.md:1180) also makes `build:prototype` and `dev:prototype`
  (`package.json:27-28`) build `@starshot/core-wasm` first.
- PR16: the game worker keeps its protocol and lazy imports (`sim/worker-handler.ts:36`, `:44`). The search steps one
  flight per macrotask through `LunarSearch` (`sim/worker-handler.ts:17-30`, `:47-50`).
- PR16: `sim/lunar-model.ts` stays the one rail importer and the Moon chunk facade (`apps/game/vite.config.ts:10-19`)
  and hands the knots to the core; the guard at `sim/lunar-request.test.ts:70-71` follows the new call. The scene draws
  through the core (`campaign/world.ts:18-26`) in place of the `ui/GameScreen.tsx` row (00-plan.md:1217).
- PR16 seams (proposed). `LunarModel` stays a TypeScript class over the core: `relative`, the barycentre, `basis` and
  `parkingState` come from the core, and `bodies` keeps its arithmetic on `this.relative`. The subclass at
  `campaign/lunar.test.ts:220-226` then still moves the drawn Moon, and frames still take `null` (`:258-274`).
  `lunarReadiness` gains the core's state: a planetary level, ready at once today (`campaign/lunar-readiness.ts:22`),
  waits for the core, and Moonshot for the core and the rail, with the reason in a polite live region.
- PR16: the prototype's main thread (`apps/prototype/src/use-flight.ts:34-38`) and worker
  (`apps/prototype/src/lunar/worker.ts:4-11`) move to the core. The worker keeps its `{ id, flight }` or `{ id, error }`
  reply (`apps/prototype/src/use-flight.ts:28-29`) (G14).
- PR16: `apps/game/release-build.ts:22-23` precaches every output file but `.map`, `sw.js` and `release.json`, so the
  `.wasm` may need no `sw.js` edit (00-plan.md:1223 asks for one); confirm on a build and log it.
- PR17: the first commit moves the rail to its ruled home (G4). It updates the 15 files outside `docs/` that name the
  rail (`git grep -l moon-rail`) and the Rust `include_str!` paths. The table at 00-plan.md:1670-1690 gains two rows:
  `packages/physics/src/lunar/` to the crates, and the rail to its new home.
- PR17: the files to update are the output of
  `git grep -l -e packages/ephemeris -e packages/physics -e @starshot/ephemeris -e @starshot/physics -- apps crates packages scripts tools`
  at its base. They include `flight.test.ts`, which imports `@starshot/ephemeris` and the rail (`flight.test.ts:2-3`).

### Lunar golden cases

- `fixtures/replays/lunar-*.json` (proposed): the game hit, miss, Earth impact and real-SOI graze; the sub-day launch at
  `LAUNCH_ET + 8.004`; a re-dated day-27 flight with `frameEt` `LAUNCH_ET` and `epochEt` its launch ET, as
  `sim/lunar-hint.ts:87` flies; the reference guide and the study zone hit. Each holds the request bits, `entryEt`,
  `impact`, `steps`, and the bits of sample 0 (the parking position and the post-burn velocity) and of the last sample.
- `golden_replays.rs`, `bits.test.ts`, `bits-jsc.mjs` and the `rust-arm64` job read them (00-plan.md:1172, :1177-1178,
  :1178). PR15 adds no new expectation; it proves the four runtimes agree on the cases PR10 to PR14 own.

### Edge cases

- The ABI carries no strings beyond the catalogue and the version (00-plan.md:1188-1189). Lunar errors cross as codes,
  and `abi.ts` maps each to its TypeScript class and text. Direct callers still get a `RangeError` where tests expect
  one (`sim/lunar-request.test.ts:91-92`, `sim/lunar-hint.test.ts:164`, `parking.ts:19`) and an `Error` elsewhere
  (`flight.ts:49`). The worker's error reply is unchanged (`sim/worker-handler.ts:64`).
- A Moon request before the rail loads keeps today's answers: the prototype replies "Moon data is not ready"
  (`apps/prototype/src/lunar/worker.ts:8`), and the game holds the scene on its readiness reason
  (`campaign/lunar-readiness.ts:21-23`).
- The rail never enters the wasm; the 64 KB gzip budget includes the lunar code (00-plan.md:1179). The PR16 settings
  grep needs scoping first (G16).

## Proof additions and readiness

Each row adds to its specs' proof lines, and is the readiness list the orchestrator copies into the issue.

| Group | Adds to the spec proofs | Ready when |
|---|---|---|
| PR9, PR10 | To 00-plan.md:1007-1009 and :1037-1039: `cargo test -p starshot-ephemeris --locked --test lunar` (`tests/lunar.rs`, proposed), the `rails.json` check in `--test rails`, and the lunar generator in compare mode under `npx vitest run packages/ephemeris packages/physics` | Held at daa1d8c: `Cargo.toml` and `data/ephem/de440s-100km/pack.json` exist, and `horizons.json` has `geocentric.moon` and `heliocentric_extra.earth` (G9). The plan approves the PR10 map rows, `rails.json` and the PR10b rule (G6, G7). G8, G10 and G17 have answers. The plan states PR10's velocity budget, or that it has none (PR10 edge cases). The owner has ruled on G5, or the plan records that PR10 leaves the probes to the knot rail. Each PR10 case names its Rust test |
| PR11, PR12 | To 00-plan.md:1069-1071 and :1098-1100: `--test lunar --test conformance_lunar` (proposed) and `npx vitest run apps/prototype/src/lunar/flight.test.ts` | The base has `starshot_ephemeris::lunar` and `hermite`; G10 and G11 have answers. The plan approves the PR11 and PR12 map rows, the flight bounds and the PR12b rule, and records whether the integrator stops at segment edges (PR12 edge cases). Each case names its Rust test and its `lunar.json` entry |
| PR13, PR14 | To 00-plan.md:1124-1125 and :1150-1152: `--test lunar` for PR13 and `--test lunar_hint` for PR14 (proposed), with the generator in compare mode | The base has `LunarFlight` and `LunarError`; the owner has ruled on G2 and G3, or the lunar replay is deferred with a logged entry. The plan approves the PR13 and PR14 map rows, `LunarSearch` (G12), the `lunar-shots.json` case list and the split rules. Each case names its Rust test |
| PR15 | The AC6 and AC9 commands (00-plan.md:115, :118) on x86_64 and in `rust-arm64`. Through PR17's last commit: the oracle, `npm run build`, `npm run build:prototype` and `node scripts/verify-lunar-loading.mjs --dist apps/game/dist` | Each lunar golden case has a Rust test in the base. Every field of `LunarShotRequest`, `ParkingOrbit`, `LunarSettings` and `LunarResult` has an ABI slot. The plan approves the lunar `Core` methods and the PR15b rule. G2, G3 and G12 are closed |
| PR16, PR17 | To 00-plan.md:1230-1235 and :1260-1262, on the cut-over build: the four checks the PR15 row runs through PR17; `npx vitest run apps/prototype`; the three verifier runs at `.github/workflows/ci.yml:164-166`; and `node scripts/verify-game.mjs --steps scripts/verify-steps/lunar-<name>.mjs` for `flight`, `worker`, `loading`, `offline` and `evidence`, at the root and with `--base /starshot/`. CI's runs pass no `--steps` (`ci.yml:164-165`), and `scripts/verify-web-release.mjs` names no Moon, lunar or wasm (`grep -c`, 0) | The PR15 row holds. The plan approves the PR16 seams and the PR16b rule. G4 and G13 to G16 are closed |

## Open gaps

| # | Gap | Blocks |
|---|---|---|
| G1 | Narrowed. PR6 (00-plan.md:793), PR7 (:851) and PR8 (:891) are built in the stack (#100 to #102): the workspace, `starshot-math`, `tools/ephem`, the pack and both native Rust jobs exist (Starting point). Still open: no CI step checks the runner's architecture (Four-runtime bit identity, proposed) | PR15 |
| G2 | D16 puts a launch day in replays (docs/decisions.md:422-423); `Replay.launch_day: u32` (00-plan.md:1119) cannot hold `LAUNCH_ET + 8.004` (`campaign/lunar.test.ts:115`). Only the owner can rule; a proposed shape is a lunar replay with `launch_et_bits: u64` | PR13 lunar replay, PR15 lunar ABI, PR32 |
| G3 | `physics_version` hashes `SimSettings` bytes and names `table1` or a pack (00-plan.md:1119). `LunarSettings` has six fields (`flight.ts:7`) and the rail is neither source. Proposed: hash `LunarSettings` and name `moon-rail/<sourceSha256>`. Ruled with G2 | PR13, PR15 |
| G4 | PR17 deletes `packages/ephemeris` (00-plan.md:1252), which holds and exports the rail (`packages/ephemeris/package.json:11`). D33 placed it there (docs/decisions.md:842) and D38 moves it "into packages" (:1023), so any home after PR17 departs from D33's wording: the owner rules. `data/ephem/` would not fit, since its README names `de440s.bsp` (00-plan.md:953) and the rail comes from the Horizons API (its `source` field). Proposed: `packages/core-wasm/data/moon-rail.json`, exported as `@starshot/core-wasm/moon-rail.json` | PR17 |
| G5 | A 100 km Moon tier (docs/decisions.md:446) cannot pass the 0.1 km probes (`lunar.test.ts:17-18`), yet D33 says the rails replace the rail and keep its probes (docs/decisions.md:843). PR8's physics audit measured the pack's Moon (32-day segments, degree 15) at 1.412 to 44.126 km and 8.15e-5 to 8.68e-4 km/s from the five probes, against 0.1 km and 1.1e-5 km/s. Over 2026 to 2028 a 16-day degree-15 tier gives 0.028 km and 7.7e-6 km/s, and an 8-day degree-12 tier 0.017 km and 2.2e-7 km/s, about 76,776 bytes per decade for the Moon block. A finer tier, or keeping the knot rail, is the owner's decision (06-resumption.md:226). Until then PR10 leaves the probes to the knot rail: `LunarModel` reads `moon-rail.json`, and the pack's Moon is held to 150 km and 1e-2 km/s (deviation row 96) | PR10 if the ruling changes the pack's Moon; PR18 otherwise |
| G6 | PR11 defines `hermite` in physics (00-plan.md:1057), but PR10's `LunarModel::relative` needs it and the ephemeris crate cannot depend on physics (00-plan.md:1010). Answered: PR10 owns it in `starshot-ephemeris`, PR11 re-exports (deviation row 98) | PR11 |
| G7 | No spec file table lists a lunar module. The ownership map is a proposal until the plan approves it. Answered for PR9 and PR10: the map's rows as built, with the additions in deviation row 99 | PR11 to PR16 |
| G8 | Only `PackError::MixedBuilds` is named (00-plan.md:1026); FNV-1a 64 has no fixed test vector (:922), though the committed `pack.json` `build` value, which `pack.read` checks (`tools/ephem/src/ephem/pack.py:217-219`), can serve as one; the `include_bytes!` path to `data/ephem/de440s-100km/` and the rail's `include_str!` path are unstated while the rule names `fixtures/` (:790, :952). Answered in deviation rows 91 and 92 | None |
| G9 | Closed at daa1d8c. PR7 added `geocentric.moon` (from 399) and `heliocentric_extra.earth` (from the Sun) at the five epochs (00-plan.md:866; `horizons.json:4-8`, `:562-563`, `:631-632`) | None |
| G10 | Narrowed. The spec's golden `pow` exponents were -0.2, 0.4, 1.5 and 2/3 (00-plan.md:834); PR6 added 2 and 3 (05-deviation-log.md:74), 445 cases each in `fixtures/math/golden.json`, which the lunar path raises to (`flight.ts:23`, `:25`, `:29`, `:53`, `:62`, `:67`; `parking.ts:12`). `norm` is a three-argument `Math.hypot` (`vec.ts:8`) with no `libm` twin (06-resumption.md:223). Decide `pow(x, 3.0)` or `x * x * x`, and the `norm` formula; extend the golden set for `norm`. PR9 answered `norm`, and needs no golden entry since its operations are correctly rounded (deviation row 79) | PR11, PR12 |
| G11 | No TypeScript test asserts a post-burn departure vector or a physics-level sub-day launch (`flight.ts:54-58`). The generator's case list must be fixed | PR11, PR12 |
| G12 | The worker yields between search flights (`sim/sim.worker.ts:14-17`) with a `MessageChannel` post since PR3b (`sim/worker-handler.ts:17-30`, `:47-50`). A full 236-flight search took 1,401 to 1,782 ms in headless Chromium, against 2,667 to 3,099 ms with the zero-delay timer (06-resumption.md:190, findings row 5). Wasm flight time is unmeasured, and one blocking call would hold the worker for all of it. Proposed `LunarSearch` stepper | PR14, PR15, PR16 |
| G13 | `git grep -l -E "@starshot/(ephemeris\|physics)"` finds 31 non-test files in `apps/game/src` (18 in `campaign/`, 10 in `sim/`), 14 in `apps/prototype`, and 63 in `apps` with tests. With `packages/(ephemeris\|physics)` paths too, 12 files under `scripts/`, `tools/` and `apps/prototype/tools/` match, 4 of them in `tools/ephem`. Helpers such as `BODIES`, `PLANET_IDS`, `dateFromEt`, `orbitPath`, `hermite`, `LAUNCH_ET` and `DAY` have no `Core` slot (00-plan.md:1169) | PR16, PR17 |
| G14 | No spec line moves `apps/prototype` onto the core (`apps/prototype/src/lunar/worker.ts:4-11`, `apps/prototype/src/use-flight.ts:34-38`). Proposed in the PR16 rows above | PR16 |
| G15 | PR16 maps `App.tsx`, `ui/GameScreen.tsx`, `ui/screen/` and `ui/TitleScreen.tsx` (00-plan.md:1217-1221), none of which exist: `apps/game/src/main.tsx:3` mounts `CampaignApp` (`campaign/CampaignApp.tsx:35`). The `LEVEL_COPY` split (00-plan.md:1215) has no campaign owner named | PR16 |
| G16 | The PR16 check `git grep -n 'rtol:' -- apps` (00-plan.md:1237) prints 6 lines today, including the kept type field `apps/game/src/sim/shot.ts:35` and two tests (`apps/game/src/sim/preview.test.ts:32`, `flight.test.ts:52`), so "prints nothing" cannot hold as written | PR16 |
| G17 | `et_from_iso` forms: 00-plan.md:990 names two, and :1004 asks for exactly what `etFromIso` accepts, which includes text `Date` parses per engine. Answered as proposed (deviation row 78) | None |
