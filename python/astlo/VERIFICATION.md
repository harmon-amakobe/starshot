# astlo v12 fixes: verification

This page shows, with numbers, what each Starshot fix to Mark Macharia's astlo changes,
measured against NASA/JPL Horizons. The code under test is
[Mark's astlo v12 source with the fixes](README.md) (his code, all rights reserved,
shared here in good faith pending his permission: see the README's
[licence section](README.md#licence-and-status)). The scripts that produced every table
are Starshot's own (Apache-2.0) and live in [`bench/`](bench/); they contain no astlo code.

## What was tested

- **Before:** the wheel as Mark published it,
  [`third_party/astlo/dist/astlo-12.5.5130000-py3-none-any.whl`](../../third_party/astlo/dist/),
  installed in its own virtualenv.
- **After:** the wheel built from this folder by [`build_wheel.py`](build_wheel.py) and
  installed into a fresh virtualenv with its dependencies from PyPI (numpy 2.5.4,
  matplotlib 3.11.2, sgp4 2.27). The tables were measured when the build was named
  `12.5.5130000.post1`; it is now `astlo-12.5.5130000+starshot.1-py3-none-any.whl`.
  Only the version label and one added description line in METADATA differ, not a byte
  of code, and the offline test passes on the renamed build (9 tests).
- **Python:** 3.13.18 for the tables below; the offline test was also run on 3.12.3.
- **The fixes** are the ten commits after the import commit in
  `git log --oneline -- python/astlo`, one topic each. Their subjects start with the
  topic name used in the headings below (`data`, `moon`, `rk4`, `barycentric`,
  `topocentric`, `errors`, `packaging`, `rk4steps`). The wheel's RECORD was checked: 19
  entries, no hash or size mismatch.

| Topic | What it fixes |
|---|---|
| `data` | Consistent J2000 element set for all 16 bodies: JPL Table 1 for the planets, Horizons osculating elements for Pluto and the small bodies |
| `moon` (1) | Degrees passed to cos/sin; `a*cos(E-e)` should be `a*(cos E - e)`; also v_Q, the Z sign in the phase vector, and `days` for Earth |
| `moon` (2) | The node, perigee and mean anomaly now move at their real rates |
| `rk4` | Step size was in days but multiplied m/s (0.04 s); `sun_X` was overwritten by a velocity; `velk4Z` used `v_X` |
| `barycentric` | SSB velocity = heliocentric velocity + the Sun's SSB velocity; Eris typo in `baryc_sun`; `future()` uses `baryc_sun(days)` |
| `topocentric` (1) | Rotate ecliptic to equatorial before the GMST rotation; GMST at now + days, not always now |
| `topocentric` (2) | Precess from J2000 to the equinox of date (GMST is measured from the equinox of date) |
| `errors` | `raise ValueError` instead of `sys.exit(0)` in library methods; the CLI entry point prints the message and exits 1 |
| `packaging` | `Requires-Python >=3.12`; no print and no forced TkAgg at import (Agg when there is no display); `'\##'` escape warnings |
| `rk4steps` | New method: a looped RK4 N-body integrator using Mark's own `custacce()` force model |

## Method

- The wall clock is frozen at **2026-10-31 21:00:00 UTC** (Unix 1793480400). The bench
  and the test replace `time.time` (and, defensively, `datetime` in `topocentric`)
  before calling astlo; astlo itself is not changed for this. The before and after
  builds are therefore evaluated at exactly the same instants.
- **Dates:** now; J2000 (2000-01-01 12:00 UTC); 1986-02-09; 2029-04-13 21:46;
  2126-10-31. They are passed as astlo's `days` offsets: −9800.375, −14874.875,
  +895.032 and +36524. astlo counts UTC Unix seconds, so Horizons is asked in UT.
- **Reference:** the JPL Horizons API (version 1.2, DE441 ephemeris).
  - Position checks use state vectors in the ecliptic J2000 frame, centred on the
    solar-system barycentre (SSB). Heliocentric vectors are the body minus the Sun.
  - Sky checks use OBSERVER quantity 4 (apparent, airless azimuth and elevation) for a
    geodetic site at Nairobi: lat −1.2921, lon 36.8219, 1795 m.
  - Earth is checked against the Earth's centre (399) and Pluto against Pluto (999),
    as in the original [evaluation](../../docs/astlo-evaluation.md).
- **Horizons usage:** 51 requests in total (26 vectors, 16 element sets, 9 observer).
  Every response is cached, so re-running the comparison makes no new requests.
- **Metrics:**
  - Heliocentric **direction** error is the angle between astlo's and JPL's Sun→body
    vectors.
  - **Sky** error is the same angle between the Earth→body vectors.
  - Position error is the distance between the two heliocentric points.
- **Scripts** ([`bench/`](bench/), standard library plus astlo only):
  - `bench_run.py` runs one build and writes its answers as JSON.
  - `bench_compare.py` fetches the JPL reference and prints the tables.
  - `moon_series.py` and `topo_days.py` are the Moon and "10 days ahead" checks.
  - `compute_elements.py` derives the element values the `data` commit uses.
  - `fetch_fixtures.py` writes the offline test's reference data.
  - `hz.py` is the small, cached Horizons client they share.
- **Raw outputs** (astlo's answers as JSON) stay in the scratch directory and are not
  committed; the tables below are the record.

## 1. Positions of the 16 bodies (`data`; `barycentric` for velocities)

### A. Now (2026-10-31 21:00 UTC): before vs after

| Body | Heliocentric direction, before | after | Position error km, before | after | Sky direction from Earth, before | after |
|---|---|---|---|---|---|---|
| Mercury | 15.89° | **0.38′** | 13.65 M | 8,050 | 42.24° | 0.45′ |
| Venus | 32.98° | **0.30′** | 61.41 M | 9,577 | 3.13° | 1.21′ |
| Earth | 23.85° | **0.17′** | 61.36 M | 9,606 | n/a | n/a |
| Mars | 1.72° | **1.04′** | 7.16 M | 75,117 | 3.63° | 1.22′ |
| Ceres | 86.86° | **0.00′** | 535.92 M | 10 | 70.44° | 0.09′ |
| Vesta | 43.37° | **0.00′** | 266.51 M | 5 | 54.14° | 0.12′ |
| Pallas | 43.18° | **0.00′** | 285.65 M | 5 | 71.23° | 0.09′ |
| Hygiea | 25.07° | **0.00′** | 200.50 M | 9 | 15.95° | 0.06′ |
| Jupiter | 24.28′ | **1.46′** | 5.62 M | 443,269 | 2.23° | 1.58′ |
| Saturn | 32.53′ | **3.34′** | 13.79 M | 1.39 M | 2.06° | 3.72′ |
| Uranus | 31.78′ | **0.24′** | 26.88 M | 971,363 | 1.53° | 0.22′ |
| Neptune | 57.40′ | **0.53′** | 74.63 M | 692,578 | 1.73° | 0.54′ |
| Pluto | 2.20° | **0.00′** | 204.43 M | 2,121 | 2.13° | 0.00′ |
| Haumea | 1.01° | **0.00′** | 132.99 M | 58 | 1.45° | 0.00′ |
| Makemake | 1.43° | **0.00′** | 196.27 M | 68 | 1.82° | 0.00′ |
| Eris | 44.23′ | **0.00′** | 185.36 M | 149 | 56.32′ | 0.00′ |

("M" = million km. 1° = 60′.)

### B. All five dates: heliocentric direction error, before → after

| Body | 2026-10-31 | 2000-01-01 (J2000) | 1986-02-09 | 2029-04-13 | 2126-10-31 |
|---|---|---|---|---|---|
| Mercury | 15.89° → **0.38′** | 4.12° → **0.08′** | 27.52′ → **0.41′** | 17.51° → **0.85′** | 53.95° → **4.30′** |
| Venus | 32.98° → **0.30′** | 33.25° → **0.17′** | 33.40° → **0.07′** | 32.96° → **0.33′** | 31.94° → **1.32′** |
| Earth | 23.85° → **0.17′** | 24.23° → **0.10′** | 24.44° → **0.09′** | 23.82° → **0.21′** | 22.40° → **0.67′** |
| Mars | 1.72° → **1.04′** | 1.51° → **0.04′** | 1.40° → **0.12′** | 1.72° → **1.37′** | 2.38° → **6.00′** |
| Ceres | 86.86° → **0.00′** | 83.57° → **1.06°** | 83.97° → **2.25°** | 65.83° → **11.20′** | 71.70° → **4.23°** |
| Vesta | 43.37° → **0.00′** | 51.26° → **1.65°** | 53.08° → **1.51°** | 53.71° → **0.81′** | 49.49° → **3.57°** |
| Pallas | 43.18° → **0.00′** | 61.33° → **5.67°** | 63.47° → **8.19°** | 25.48° → **0.65′** | 16.27° → **4.88°** |
| Hygiea | 25.07° → **0.00′** | 29.42° → **11.50°** | 18.48° → **10.36°** | 25.60° → **7.21′** | 38.30° → **20.37°** |
| Jupiter | 24.28′ → **1.46′** | 21.92′ → **5.15′** | 26.45′ → **3.66′** | 24.71′ → **1.97′** | 0.32′ → **8.75′** |
| Saturn | 32.53′ → **3.34′** | 39.58′ → **8.61′** | 24.17′ → **1.96′** | 34.62′ → **2.65′** | 1.27° → **24.08′** |
| Uranus | 31.78′ → **0.24′** | 29.50′ → **1.18′** | 31.48′ → **0.55′** | 32.14′ → **0.18′** | 26.77′ → **6.51′** |
| Neptune | 57.40′ → **0.53′** | 57.08′ → **0.75′** | 57.34′ → **0.46′** | 57.83′ → **0.11′** | 1.00° → **1.85′** |
| Pluto | 2.20° → **0.00′** | 2.20° → **4.43′** | 2.19° → **2.15′** | 2.19° → **0.13′** | 2.14° → **12.57′** |
| Haumea | 1.01° → **0.00′** | 48.82′ → **2.07′** | 44.61′ → **4.26′** | 1.03° → **0.23′** | 1.11° → **40.12′** |
| Makemake | 1.43° → **0.00′** | 1.46° → **2.91′** | 1.51° → **5.70′** | 1.43° → **0.18′** | 1.85° → **33.46′** |
| Eris | 44.23′ → **0.00′** | 46.96′ → **0.64′** | 48.85′ → **1.41′** | 44.10′ → **0.11′** | 39.39′ → **5.06′** |


How to read these numbers:

- The "now" values of **0.00′ for the eight small bodies are true by construction**. Their elements are Horizons' osculating elements at 2026-11-01 00:00 TDB, three hours after the test instant. The 2029 column is the fairer test for them.
- Earth in astlo is the Earth-Moon barycentre (JPL Table 1 lists it that way). This explains most of the ~9,600 km offset from the Earth's centre: about 0.1′ as seen from the Sun.
- 2126 is outside the 1800 to 2050 range for which JPL Table 1 is valid. Jupiter (8.75′) and Saturn (24′) drift there. Before the fix, Jupiter happened to be close at that date.

**Velocities, now (vs JPL):**

| | Before | After |
|---|---|---|
| Earth heliocentric velocity error | 12.389 km/s | **0.0148 km/s** |
| Earth SSB velocity error (`v_X/v_Y/v_Z` of `barycentric()`) | 12.381 km/s | **0.0148 km/s** |
| Mars SSB velocity error | 0.701 km/s | 0.0058 km/s |
| Jupiter SSB velocity error | 0.096 km/s | 0.0084 km/s |
| `v_bary − v_helio` (should equal the Sun's SSB velocity) | (−5.23, 19.38, 0.00) m/s | **(10.30, 4.78, −0.22) m/s**; JPL Sun/SSB: (10.31, 4.78, −0.22) m/s |
| Sun offset from the SSB (position) | 5,718 km | **545 km** |

**Why the planet periods are sidereal.** This was a choice made while fixing, and it is worth a reviewer's look. With w and Ω held fixed, P = 360°/(L rate) keeps the mean longitude on JPL's track. The anomalistic P = 360°/(L rate − ϖ rate) lets the longitude drift by ϖ's motion. Measured on the same dates:

| Body | Anomalistic P, now | Sidereal P, now | Anomalistic P, 2126 | Sidereal P, 2126 |
|---|---|---|---|---|
| Mercury | 3.15′ | **0.38′** | 12.86′ | **4.30′** |
| Earth | 5.37′ | **0.17′** | 24.80′ | **0.67′** |
| Mars | 7.55′ | **1.04′** | 34.14′ | **6.00′** |
| Saturn | 10.23′ | **3.34′** | **8.95′** | 24.08′ |
| Uranus | 6.64′ | **0.24′** | 40.04′ | **6.51′** |
| Neptune | 4.72′ | **0.53′** | 25.96′ | **1.85′** |

Across all 40 planet-and-date cells, the sidereal P is better or equal in 36. The exceptions are Jupiter in 2029 (1.97′ vs 1.43′), Venus in 2126 (1.32′ vs 1.26′), and Jupiter and Saturn in 2126, which is outside the table's range.

**Small bodies: P from a (shipped) vs a mean motion fitted between 2000 and 2026.** The alternative was measured (`bench/compute_elements.py sidereal mean2`) but not shipped.

- **Main-belt asteroids:** the fitted motion helps at J2000. Ceres goes from 1.06° to 12′ and Hygiea from 11.5° to 1.25°. But it is worse in 2029: Hygiea goes from 7′ to 40′.
- **Trans-Neptunian objects:** it is worse everywhere. For example, Pluto at J2000 goes from 4.4′ to 37.5′.

So the fix keeps P from the osculating a.

## 2. Moon (the two `moon` commits)

`lunars('EARTH')`, geocentric direction and distance vs JPL (Moon 301, centred on the Earth 399):

| | Before | After the first `moon` commit | After both `moon` commits |
|---|---|---|---|
| Direction error at 2026-10-31 21:00 | 116.07° | 3.58° | **1.71°** |
| Distance (JPL: 369,575 km) | 393,304 km | 366,415 km | 364,631 km |
| 10 dates, every 3 days: mean / max direction error | 117.3° / 120.3° | 6.2° / 9.9° | **0.96° / 2.32°** |
| Distance error range over the 10 dates | −24,630 … +29,685 km | −3,161 … +4,239 km | −5,838 … +6,446 km |

## 3. Sky position from Nairobi (the two `topocentric` commits; they also need `data` and `rk4`)

`Topocentric().topo(name, -1.2921, 36.8219, 1795.0)` vs JPL apparent az/el at 2026-10-31 21:00 UTC:

| Body | Before: el / az (sep.) | After: el / az (sep.) | JPL el / az |
|---|---|---|---|
| Sun | −72.21 / 94.03 (25.91°) | −73.85 / 194.50 (**0.046°**) | −73.87 / 194.36 |
| Venus | −78.90 / 147.16 (7.46°) | −71.47 / 150.03 (**0.022°**) | −71.48 / 150.09 |
| Mars | −12.60 / 89.00 (16.95°) | −19.04 / 72.68 (**0.005°**) | −19.04 / 72.68 |
| Jupiter | −19.72 / 89.78 (14.36°) | −24.43 / 75.13 (**0.035°**) | −24.39 / 75.12 |
| Saturn | 68.94 / 265.79 (4.17°) | 67.51 / 276.36 (**0.055°**) | 67.46 / 276.29 |
| Uranus | 56.15 / 88.33 (21.28°) | 52.61 / 51.86 (**0.011°**) | 52.60 / 51.85 |
| Neptune | 61.45 / 269.36 (1.37°) | 60.46 / 271.32 (**0.014°**) | 60.47 / 271.33 |

Breaking down the steps:

- With `data` to `barycentric` but without the frame fix, the separations were still 1.2° to 21°.
- With the first `topocentric` commit but not the second, they were 0.32° to 0.39°. That residual is the J2000-to-date precession.
- With `days=10`, after the fix: Sun 0.045°, Mars 0.003°. Before the fix: Sun 20.9°, Mars 14.5°, because GMST was computed for "now" and not for the requested date.

## 4. RK4 (`rk4` and `rk4steps`)

`rungekutta()` (default: one step) at 2026-10-31 21:00 UTC:

| | Before | After |
|---|---|---|
| Returned `delta_t` | 0.0416667 (days, used as seconds) | **3600.0 s** |
| Sun X after the step (`new_pos_vectors[0][0]`) | **−0.22 m** (overwritten by a velocity) | −158,284 km (JPL at +1 h: −158,524 km; the remaining 545 km is astlo's Sun/SSB model) |
| How far Earth moved in the step | 1.25 km | 108,020 km (JPL motion in 1 h: 107,986 km) |
| Run time | 0.89 s | 0.81 s |

`rk4steps(r, v, tt, days)`, the new looped integrator. It was seeded with Horizons SSB states at 2026-10-31 21:00 UTC (EMB for the Earth slot, the Pluto-Charon barycentre for Pluto) and run for **365 days** with tt = 0.5 d (730 steps, 2.1 s). Position error vs Horizons one year later:

| Sun | Mercury | Venus | Earth (EMB) | Mars | Jupiter | Saturn | Uranus | Neptune | Pluto | Ceres | Vesta | Pallas | Hygiea |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 53 km | 732 km | 230 km | 178 km | 188 km | 8 km | 4 km | 2.7 km | 1.1 km | 0.5 km | 19 km | 49 km | 52 km | 71 km |

- **Step size:** with tt = 0.25 d (4.2 s per year), Mercury's error drops to 470 km; the others don't change. Compared with a tt = 0.25 d run, Mercury's end position differs by 7,590 km at tt = 1.0 and by 261 km at tt = 0.5, so 0.5 d is converged for everything except Mercury.
- **Seeded from astlo's own Kepler states** (`rk4steps(None, None, 1, 365)`), the error after one year is Earth 10.6′, Venus 16.3′ and Mercury 76′. Mean elements give positions to about 1′ but velocities only to about 15 m/s. An N-body run should therefore start from real states such as DE440 or Horizons.

## 5. Errors, import and packaging (`errors` and `packaging`)

| Check | Before | After |
|---|---|---|
| `Contin().barycentric('APOPHIS')` | `SystemExit: 0` (the caller's process ends) | `ValueError: NAME NOT LOCALLY RECOGNIZED OR WRONG SPELLING: APOPHIS` |
| `Contin().orbits('APOPHIS')`, `barycentric('HALLEY')` | `SystemExit: 0` | `ValueError` |
| CLI `astlo rtime -n apophis` | red message, exit status 0 | red message, **exit status 1** |
| Output printed by `import astlo` | `Using TkAgg backend.` | nothing |
| matplotlib backend after import, no display | TkAgg (forced) | Agg |
| `import astlo` time | 0.58 s | 0.63 s |
| Python 3.11 | 6 of 13 files fail to parse (`SyntaxError: f-string: unmatched '['`), but METADATA allowed `>=3.10` | METADATA `Requires-Python: >=3.12` |
| Python 3.12 parse with `-W error` | SyntaxWarning `'\#'` in `contin.py` (4 f-strings) | clean |

## Budgets used by the test

[`tests/test_against_jpl.py`](tests/test_against_jpl.py) repeats the core of sections
1 to 5 offline, against [`tests/fixtures/horizons.json`](tests/fixtures/horizons.json)
(fetched once by `bench/fetch_fixtures.py`). Each budget leaves a margin of 30% or more
over the worst value measured above for the fixed build over 1986 to 2029 (inside JPL
Table 1's 1800 to 2050 range; never below 1′), and sits far below the published build's
error, so the test passes on the fixed build and fails on every row for the published
one.

| Check | Fixed build, worst | Budget | Published build |
|---|---|---|---|
| Mercury / Venus / Earth direction | 0.85′ / 0.33′ / 0.21′ | 1.5′ / 1′ / 1′ | 17.5° / 33.4° / 24.4° |
| Mars / Jupiter / Saturn | 1.37′ / 5.15′ / 8.61′ | 2.5′ / 8′ / 12′ | 1.72° / 26′ / 40′ |
| Uranus / Neptune | 1.18′ / 0.75′ | 2′ / 1.5′ | 32′ / 58′ |
| Pluto / Haumea / Makemake / Eris | 4.43′ / 4.26′ / 5.70′ / 1.41′ | 6′ / 6′ / 8′ / 2′ | 2.2° / 1.0° / 1.5° / 49′ |
| Ceres / Vesta / Pallas / Hygiea, 2026 and 2029 | 11.2′ / 0.81′ / 0.65′ / 7.21′ | 15′ each | 66° to 87° / 43° to 54° / 25° to 43° / 25° to 26° |
| Ceres / Vesta / Pallas / Hygiea, 2000 and 1986 | 2.25° / 1.65° / 8.19° / 11.5° | 3° / 2.5° / 10° / 14° | 84° / 53° / 63° / 29° |
| Planet distances from the Sun, now | 0.04% | 1% | Mercury 2.9% (the others within 0.3%) |
| Moon direction, 10 dates over a month | 2.32° | 3° | 120° |
| Sky position from Nairobi, 7 bodies | 0.055° | 0.1° | 1.4° to 26° |
| Sun after one `rungekutta()` step, vs JPL at +1 h | 545 km | 1,500 km | Sun X = −0.22 m |
| Unknown body (`APOPHIS`, `HALLEY`) | `ValueError` | `ValueError` | `SystemExit: 0` |
| `import astlo` output; backend with no display | nothing; Agg | nothing; Agg | `Using TkAgg backend.`; TkAgg |
| Compiling every module with warnings as errors | clean | clean | `SyntaxWarning` in `contin.py` |
| `Requires-Python` | `>=3.12` | `>=3.12` | `>=3.10` |

Run against the published wheel on 2026-11-01, the test reported 64 of 64 direction
cells, 10 of 10 Moon dates and 7 of 7 sky positions over budget, and failed each of the
other checks.

## 6. Choices worth a reviewer's look

1. **Planet periods are sidereal** (360°/L rate), not anomalistic
   (360°/(L rate − ϖ rate)). The measurements are in section 1.
2. **Pluto's elements come from the Pluto-Charon barycentre** (Horizons `9`), not from
   Pluto's centre (`999`). Charon swings Pluto's centre around by about 2,000 km and
   about 20 m/s, which would bias the osculating period. The comparison is still made
   against `999`.
3. **Separate, optional commits:** the second `moon` commit (moving node and perigee),
   the second `topocentric` commit (precession) and `rk4steps` are each measured above
   and kept separate, so Mark can take or drop each one.
4. **Small extra fixes inside the topic commits**, all one-liners:
   - In the first `moon` commit: Moon v_Q, the Z sign in the phase vector, and `days`
     for Earth in `lunars()`.
   - In `barycentric`: the `eris+Y` typo in `baryc_sun()` and `future()`'s
     `baryc_sun(days)`.
   - In `packaging`: the four `'\##'` escapes.
5. **Commit order:** data, Moon, RK4, barycentric, topocentric, errors, packaging,
   rk4steps. RK4 comes before topocentric because `topo()` reads the Sun from the RK4
   output.
6. **The wheel is rebuilt as a zip with a fresh RECORD, not with setuptools**
   ([`build_wheel.py`](build_wheel.py)). This keeps Mark's METADATA as published except
   for two marks of a patched build: `Version` becomes 12.5.5130000+starshot.1 (a PEP
   440 local label, which PyPI refuses), and the description gains one first line
   saying it is a Starshot-patched build, not an official astlo release. The WHEEL
   `Generator` line also changes, and `Requires-Python` changes in the `packaging`
   commit.
   `astlo.__version__` in `__init__.py` is left as `v12.5.5130000`; that is Mark's
   call.

## 7. What is still imperfect

- **Fixed elements (no century rates for a, e, i, Ω, ϖ).** Over 1986 to 2029 the planets stay within 1.4′, except Jupiter (up to 5.2′) and Saturn (up to 8.6′, at J2000). Out to 2126 the errors grow: Saturn 24′, Jupiter 8.8′, Mars 6′. Adding JPL Table 1's rate columns would hold everything within JPL's stated accuracy over 1800 to 2050.
- **Main-belt asteroids:** exact around 2026, but they drift by 1° to 11.5° by 2000/1986 and by up to 20° by 2126, because Jupiter changes their mean motion. Better options are to refresh elements from Horizons per epoch, or to integrate with `rk4steps` from real states.
- **TNOs:** 0.6′ to 5.7′ in 1986/2000, and 5′ to 40′ in 2126.
- **Moon:** an ellipse with mean rates gives about 1° typical error and 2.3° worst case. Better needs the main solar perturbation terms (evection, variation, annual equation; Meeus ch. 47).
- **Topocentric:**
  - Nutation (≤17″), annual aberration (20″), light time and refraction are not modelled.
  - The planet states come from `rungekutta()` and are 1 h after the requested instant, which accounts for about 0.04° on the Sun.
  - The json/DE440 branches (Moon, `ephem=`) are unchanged; their frame depends on the external `import_states.json`.
  - `topo(..., days=0)` hits a pre-existing gap in the RK4 branch selection.
- **`rungekutta()`** is still a single step from the Kepler state at now + days and ignores its `r`/`v` arguments. Use `rk4steps()` for real time stepping. The returned `delta_t` is now in seconds.
- **`rk4steps()`** has no relativity and no Moon (the Earth slot holds the EMB with Earth's mass). Mercury needs tt ≤ 0.25 d for errors under 500 km per year.
- **The Sun/SSB offset is still about 545 km off.** astlo builds it from its own Kepler planets; the remaining errors in Jupiter and Saturn dominate.
- **Not touched:**
  - `lamberts()` (no velocities, can loop forever) and the `hohmann()` stub.
  - `rise_set()`'s `sleep(60)`.
  - The CLI's own `v_bary` display in `rtime`.
  - `sys.exit` on CLI-only paths: the `--tble` table, the end of the `anmte` plot, and the KeyboardInterrupt handlers.
  - The trailing space on Mark's `pass ` line in `mat.py` (left exactly as he wrote it).

## Reproduce

From the repository root, with Python 3.12 or newer and internet access (pip and
Horizons). `<scratch>` is any empty folder outside the repository; the bench writes its
outputs and its Horizons cache into the current directory.

```bash
# the published build and the fixed build, in separate virtualenvs
python3 -m venv <scratch>/venv-published
<scratch>/venv-published/bin/pip install third_party/astlo/dist/astlo-12.5.5130000-py3-none-any.whl
python3 python/astlo/build_wheel.py --outdir <scratch>/dist
python3 -m venv <scratch>/venv-fixed
<scratch>/venv-fixed/bin/pip install "<scratch>/dist/astlo-12.5.5130000+starshot.1-py3-none-any.whl"

# the offline test (no network); 9 tests, about 10 s
<scratch>/venv-fixed/bin/python -I -m unittest discover -s python/astlo/tests -v

# the full before/after comparison
BENCH=$PWD/python/astlo/bench
mkdir <scratch>/work && cd <scratch>/work
OUTF=before.json MPLBACKEND=Agg <scratch>/venv-published/bin/python -I $BENCH/bench_run.py
python3 -I $BENCH/bench_compare.py before.json > /dev/null     # fetches Horizons once; writes rk4_seed.json
RK4_SEED=rk4_seed.json OUTF=after.json <scratch>/venv-fixed/bin/python -I $BENCH/bench_run.py
python3 -I $BENCH/bench_compare.py before.json after.json > tables.md
<scratch>/venv-fixed/bin/python -I $BENCH/moon_series.py
<scratch>/venv-fixed/bin/python -I $BENCH/topo_days.py
python3 -I $BENCH/compute_elements.py sidereal osc              # the values in the data commit
```

On 2026-11-01 this sequence reproduced every number in sections 1 to 5, and
`compute_elements.py` reproduced the element values of the `data` commit exactly.

To see each fix on its own, read its commit: `git log -p -- python/astlo` (the first
commit there is Mark's v12 source as published).

*Python 3.13.18 and 3.12.3; JPL Horizons API 1.2 (DE441); measured 2026-10-31 to
2026-11-01.*
