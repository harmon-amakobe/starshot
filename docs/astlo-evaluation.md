# astlo: what it is, what it can do, and how it compares with NASA/JPL

> **About this document.** This evaluation was produced on 31 October 2026 while
> bootstrapping Starshot, to understand whether Starshot could build on astlo. It is
> published with respect for Mark Macharia's work: astlo is an ambitious engine that
> one person built on a phone, and every issue listed below is fixable.
>
> **Status (1 November 2026).** The findings below describe astlo as published
> (v12.5.5130000). Starshot has since fixed most of them in the open, in
> [`python/astlo/`](../python/astlo/README.md): Mark's v12 source followed by one
> reviewable commit per fix, measured against NASA/JPL in
> [`python/astlo/VERIFICATION.md`](../python/astlo/VERIFICATION.md) (decision D10 in
> [decisions.md](decisions.md)). That folder is still Mark's code, all rights reserved,
> shared in good faith pending his permission. The fixes have **not** been sent to him
> yet: the owner plans to show them to him once Starshot is finished. His original files
> sit untouched in `third_party/astlo/`, and Starshot's game and packages use none of
> his code.

*Evaluation of Mark Macharia's (GitHub [@iamnothimbutwe](https://github.com/iamnothimbutwe))
astlo engine, public build `astlo-12.5.5130000` from
<https://github.com/iamnothimbutwe/astlopublic> (`dist/`). Done 31 Oct 2026.*

**How this was checked**

1. We read the source of the v12 wheel line by line, with several independent reviewers
   each covering one part of the code.
2. We installed the wheel in an isolated virtualenv and ran it.
3. We compared its output with NASA JPL Horizons, the reference that professionals use.
4. An independent re-implementation of the same maths, written without running astlo,
   matches the real engine's numbers within about 0.1% (for example, Earth's position
   error is 61.36 vs 61.38 million km).

---

## 1. Summary

astlo is an impressive solo hobby project. Mark built a working orbital-mechanics
toolkit on a phone. It has a real Kepler solver, a solar-system barycentre calculation,
satellite tracking and a command-line interface.

The public build has some data and maths bugs. The biggest puts Earth about 24° away
from its true direction. Everything that depends on Earth inherits that error: the sky
view, a launch from Earth, the Sun's direction. The "RK4 N-body" time stepping also does
not yet do what its description says.

The good news: the biggest bug is a mix-up in one data table. Putting the original
numbers back brings Earth, Venus and Mars close to NASA's positions. We tested this,
and the fixed build in [`python/astlo/`](../python/astlo/README.md) now puts Earth
within about 0.2 arcminutes of NASA's direction
([VERIFICATION.md](../python/astlo/VERIFICATION.md)).

**What this means for Starshot** (decisions D2 and D4): Starshot's planet positions come
from NASA/JPL's public data through Starshot's own code. astlo's data could be adopted
later, body by body, once it passes a direction check against JPL and Mark grants a
licence that allows it.

---

## 2. How astlo works (plain words)

```
  hard-coded orbit tables          "now" = phone clock (+/- N days)
  (16 bodies: size, shape,                    |
   tilt, and angle of each orbit)             v
            |                  Kepler's equation: where on its ellipse is
            +----------------> the body at time t?  (closed-form, ~3 ms)
                                              |
                                              v
                         heliocentric x,y,z (metres) + velocity
                                              |
               +------------------------------+----------------------------+
               v                              v                            v
     shift to the solar-system      "topocentric": turn it into     plots, tables, CLI
     barycentre (the point the      azimuth/elevation for your      (matplotlib PNGs,
     Sun and planets orbit)         latitude/longitude              terminal charts)

  Satellites are a separate path: download a TLE from celestrak.org -> SGP4 library -> az/el
```

Key ideas:

- **Orbital elements** are six numbers that describe an ellipse and where a body is on
  it. astlo keeps one fixed set per body in `astlo.py:53-264`.
- **Kepler's equation** turns those numbers plus a time into a position. This is a
  closed-form calculation, not a simulation. `Astro.orbits()` (`astlo.py:816-1166`) does
  it, and almost every other feature is built on top of it.
- **Barycentre**: the Sun wobbles because Jupiter and the other planets pull on it.
  `baryc_sun()` works out that wobble, and it's accurate: within about 5,000 km of NASA.
- **N-body / RK4** would mean simulating every body pulling on every other body, step by
  step. The force code exists (`custacce`, `acce`), but `rungekutta()` only takes one
  tiny step. See section 4e.
- **Topocentric** means "where is it in *my* sky": azimuth (compass direction) and
  elevation (height above the horizon).

What it isn't: it doesn't read NASA ephemeris files for the planets. It doesn't
integrate trajectories over time. It has no comets, NEOs or Apophis in the public build
(those are listed for an unreleased v13). And it doesn't solve Lambert transfers that
would give launch velocities.

---

## 3. What it can do today

| Feature | Works? | Notes |
|---|---|---|
| Position and velocity of 16 bodies (Mercury to Neptune, Pluto, Ceres, Vesta, Pallas, Hygiea, Haumea, Makemake, Eris) for "now ± N days" | Runs, but positions are wrong for several bodies | ~3 ms per call; returns a Python dict of about 70 values. Earth 24°, Venus 33°, Mercury 16° and Ceres 87° off (section 4) |
| Sun's offset from the solar-system barycentre | Yes, good | Within ~5,000 km of JPL |
| Orbit paths (lists of points along each ellipse) for drawing | Yes, usable | `reel()` returns X/Y/Z lists in AU; the shapes and sizes are right |
| "RK4 N-body" time stepping | Not what the name suggests | One step of ~0.04 s on top of the Kepler answer (section 4e) |
| Sky position for your location | No: 1° to 26° off | Inherits Earth's error, plus a frame bug (section 4c) |
| Moon position and phase | No: ~116° off | Degrees/radians bug (section 4d) |
| Earth satellites (any NORAD number) | Probably fine | Standard SGP4 library and textbook maths. Needs internet (celestrak.org) on every call |
| Lambert / transfer planning, Hohmann | No | `lamberts()` returns no velocities and can loop forever; `hohmann()` is an empty stub |
| Rocket sizing (`Lsim.wetmass`) | Basic | One hard-coded engine, simple ratios |
| Physics charts (energy, velocity, inclination vs distance) | Yes | Terminal plots only; they print and don't return data |
| 3D/2D renders | Yes | matplotlib PNGs; not suited to embedding in an app |
| Apophis, Bennu, Eros, Halley, 67P | Not in the public code | Asking for them calls `sys.exit(0)`, which stops the program that called it |

**Performance on a laptop-class CPU** (measured):

- `import astlo`: 0.76 s.
- `barycentric(body)`: 2–4 ms.
- `rungekutta()`: 0.8 s, the same whether you ask for 1 year or 1 billion years.
- `Topocentric.topo()`: 0.7–0.9 s.

---

## 4. Test results: real engine vs NASA JPL Horizons

Heliocentric positions (seen from the Sun), ecliptic J2000 frame. **Angle error** is how
far off the body's direction is as seen from the Sun; 60′ = 1°.

### 4a. As shipped (v12.5.5130000), on 2026-10-31

| Body | Position error | Angle error |
|---|---|---|
| Mercury | 13.7 million km | 15.9° |
| **Venus** | **61.4 million km (0.41 AU)** | **33.0°** |
| **Earth** | **61.4 million km (0.41 AU)** | **23.8°** |
| Mars | 7.2 million km | 1.7° |
| Jupiter | 5.6 million km | 0.4° |
| Saturn | 13.8 million km | 0.5° |
| Uranus | 26.9 million km | 0.5° |
| Neptune | 74.6 million km | 1.0° |
| Pluto | 204 million km | 2.2° |
| **Ceres** | **536 million km (3.6 AU)** | **87°** |
| Vesta / Pallas / Hygiea | 200–290 million km | 25–43° |

The same errors appear at J2000 (the date the tables are supposed to describe), in
1986, 2029 and 2126. That means they come from **input data, not slow drift**. Full
tables: [`tools/astlo-bench/results/compare_shipped.txt`](../tools/astlo-bench/results/compare_shipped.txt).

**Why "it holds up clean against JPL" still sounded true.** The **distance from the
Sun** (the vector magnitude, which Mark said he checked) matches JPL to about 0.01–1%
for the planets. The **direction** is what's wrong. Checking magnitudes alone can't
catch it, which is why Starshot's own tests and any future data gate check direction.

### 4b. Root cause, and proof it's fixable

In `astlo.py:192-245`, the inclination, node (Ω) and argument of perihelion (ω) were
replaced with "updated" values. Those values are JPL *barycentric osculating* angles
from 2026, but they are still paired with the **J2000 mean anomalies** in
`astlo.py:173-188`. Mixing epochs rotates the orbit:

- Earth: ω+Ω = 78.7° instead of 102.9°, an error of −24.2°.
- Venus: an error of −33.3°.

The original J2000 numbers are still there as comments, e.g.
`self.Earth_w=354.19059 #114.20783`.

We put the commented J2000 values back **in memory only** (Mark's files were not
changed) and re-ran the real engine:

| Body | Shipped: today | J2000 values restored: at J2000 | Restored: today | Restored: 2126 |
|---|---|---|---|---|
| Earth | 23.8° | **0.08′** | 23′ | 1.8° |
| Venus | 33.0° | **1.4′** | 15′ | 1.3° |
| Mars | 1.7° | **0.9′** | 11′ | 51′ |
| Jupiter | 0.4° | 30′ | 27′ | 52′ |
| Neptune | 1.0° | 0.4′ | 0.06′ | 2.7′ |
| Mercury | 15.9° | 0.05′ | 11.8° | 51° |

The remaining drift has two causes. The periods are rounded: Mercury's `0.2408 yr` is
enough to drift 12° in 27 years. And there are no per-century correction terms. Using
JPL's standard "approximate positions" element set, which includes those terms, would
bring all the planets to within about 1° or better over 1800–2050 (Starshot's own
ephemeris uses that set and stays within 9 arcminutes; see the
[README](../README.md#how-accurate-is-it)). Ceres needs a new mean anomaly:
`Ceres_MO = 80.39` is actually Ceres' node value, a copy error. Full table:
[`tools/astlo-bench/results/compare_patched.txt`](../tools/astlo-bench/results/compare_patched.txt).

### 4c. "Where is it in my sky" (Nairobi, 2026-10-31 20:54 UTC)

| Body | astlo elevation / azimuth | JPL elevation / azimuth | Off by |
|---|---|---|---|
| Sun | −73.6° / 94.4° | −73.5° / 199.1° | 25.9° |
| Venus | −79.6° / 153.8° | −72.2° / 154.0° | 7.5° |
| Mars | −14.0° / 89.0° | −20.4° / 72.6° | 16.9° |
| Jupiter | −21.1° / 89.8° | −25.8° / 75.0° | 14.4° |
| Saturn | 70.4° / 265.5° | 68.9° / 276.7° | 4.2° |
| Uranus | 54.7° / 88.4° | 51.5° / 53.0° | 21.3° |
| Neptune | 62.9° / 269.4° | 61.9° / 271.4° | 1.4° |

To point at a planet with your eyes you need errors under about 1°. Two causes:

- Earth's 24° error.
- `topocentric.py:167-185` rotates ecliptic coordinates as if they were equatorial. The
  23.44° Earth-tilt constant (`astlo.py:31`) is defined but never used.

Also, Earth's rotation angle always uses *now*, even when you ask about a future date.

### 4d. Moon

Real engine vs JPL: **116° off**, 393,380 km away vs JPL's 369,660 km
(`contin.py:1567-1660`). There are two bugs: angles in degrees are passed to
`cos`/`sin`, which expect radians; and `a·cos(E−e)` is used where it should be
`a·(cos E − e)`.

### 4e. The "RK4 N-body" claim

`rungekutta(days=N)` (`contin.py:2116-2393`):

1. It ignores the `r` and `v` you pass in.
2. It computes the Kepler position at now+N days.
3. It takes **one** RK4 step whose size is 1/24 "days" multiplied directly by velocities
   in m/s. That's 0.04 seconds, not 1 hour.

Measured: the output differs from the plain Kepler answer by about 0.4 km. It takes
0.8 s whether N is 10⁴, 10⁶ or 3.65×10¹¹ days, which shows nothing is being stepped
through time. There are also two bugs that corrupt the state: the Sun's X is overwritten
by a velocity (we measured Sun X = −0.22 m), and the k4 Z velocity uses `v_X`.

The force model itself (`custacce`) is reasonable. A separate, correctly looped and
unit-fixed implementation of the same force model got Earth within about 180 km after
896 days. **So the method is sound; it just isn't wired up yet.**

### 4f. Author's claims scorecard

The claims below are the author's own descriptions of astlo, quoted or closely
paraphrased from his public Reddit post and his replies in its comments, in the
r/nairobitechies community, October 2026. Each verdict is about the public
v12.5.5130000 build as published, checked as described above; several are things the
public code does not show yet, not things that cannot be done.

| Claim | Verdict |
|---|---|
| Core engine under 100 KB | **Only the zipped wheel** (93.5 KB). The installed source is 411 KB, and numpy and matplotlib are required |
| No ephemeris tables; RK4 N-body from raw osculating elements, accounting for drift | **Not in the public code.** It's fixed-element two-body Kepler; RK4 is a single 0.04 s step |
| Cross-validated vs JPL .bsp, "holds up clean" | Magnitudes, yes; directions are 24–87° off. There's no validation code in the package |
| 100% local and offline | True for the 16 bodies. Satellites need internet; the Moon and `--ephem` need an external `import_states.json` from an unreleased helper |
| 21 bodies | Public v12 has 16 plus the Sun; the 21 is the unreleased v13 |
| Any object, asteroid, satellite | Satellites: yes. Arbitrary asteroids and comets: no. Unknown names call `sys.exit` |
| Exact position/velocity matrices in real time | It returns Python dicts quickly (yes), but they aren't exact (Earth is 0.41 AU and ~12 km/s off) |
| Pure Python | The physics files are. The package requires numpy, matplotlib, sgp4, requests, rich, click and plotext, and **Python ≥ 3.12** (it uses PEP 701 f-strings), although the metadata says ≥ 3.10 |

---

## 5. Is it safe? Can it be used?

**Safety: nothing malicious was found.**

- No `eval`, `exec`, `subprocess`, pickle, base64 or obfuscation. The file hashes match
  the wheel's RECORD.
- The only network call is the celestrak.org satellite-data download (`eo.py:54-56`).
- `os.system` is only used to clear the terminal.
- It writes PNG charts into the current folder.

Rough edges:

- About 20 `sys.exit(0)` calls inside library functions. These would stop any server or
  app that calls them.
- Infinite loops in `lamberts()` and in the CLI's real-time mode.
- `sleep(60)` per object in rise/set.
- `import astlo` switches matplotlib to TkAgg and prints to the console as soon as it
  loads.

If you try it, install it in a virtualenv, not your main Python
([tools/astlo-bench](../tools/astlo-bench/README.md) shows how).

**Licence: "All rights reserved."** The wheel, README and every file header say copying,
modification, distribution and commercial use are prohibited without written
permission. The repository's LICENSE file is MIT text with the "Permission is hereby
granted…" clause removed, so it grants nothing. Ownership is also ambiguous:
`interface.py:41` calls it "a property of Astlo Space Systems … and KenyaSpaceNerds".

**What this means for Starshot:** bundling, porting, modifying or hosting astlo, or
publishing its output as data, needs short written terms from Mark (ideally MIT or
Apache-2.0 for code and CC-BY for exported data). Physics formulas and NASA data
aren't copyrighted, so Starshot is built on public JPL data with its own code
(decisions D2, D3 and D4). The one exception is the owner's call in D10: Starshot's
fixes to astlo are published in `python/astlo/` before those terms exist, under Mark's
rights and pending his permission, and are removed if he objects.

---

## 6. What Starshot took from this

The evaluation shaped several of Starshot's decisions:

- **Positions from NASA/JPL, checked by direction.** Starshot uses JPL's "approximate
  positions" element set with per-century terms, and its tests compare *directions*
  with Horizons, not just distances (D4).
- **Physics on the device, in TypeScript.** A 60 fps slingshot cannot wait for a server
  on every frame, so the simulator runs in the browser in a Web Worker (D5). Running
  astlo itself in the browser through Pyodide was ruled out: it is a 6–21 MB download,
  roughly 13× slower than JavaScript for this work, and shipping the wheel would count
  as distribution under its licence.
- **A real, looped integrator.** Starshot's simulator integrates the whole flight with
  an adaptive Dormand–Prince method, so gravity assists happen naturally.
- **A data gate for astlo.** If Mark licenses astlo's output, it can replace JPL data
  body by body, once each body passes the same direction check. The contract for that
  is in [architecture.md](architecture.md#future-the-astlo-data-gate).

---

## 7. Suggested fixes for astlo, in priority order

Status, 1 November 2026: items 3, 4, 5 and 8, most of 6 (`rungekutta()` still takes
one step; a new `rk4steps()` loops), and parts of 2 and 7 are done in
[`python/astlo/`](../python/astlo/README.md), one commit per topic, with before/after
numbers in [`VERIFICATION.md`](../python/astlo/VERIFICATION.md). Nothing has been sent
to Mark yet; the owner plans to show him the fixes once Starshot is finished
(decision D10). Item 1 is his alone.

1. **A written licence** that names who owns astlo: Mark, Astlo Space Systems, or
   KenyaSpaceNerds.
2. **A clean API** such as `astlo.api.state(body, t_tdb)` that:
   - returns numbers;
   - raises exceptions instead of calling `sys.exit`;
   - doesn't print;
   - doesn't read the wall clock internally;
   - doesn't pull in matplotlib or the CLI on import.
3. **Fix the data** (`astlo.py:173-264`):
   - restore the commented J2000 ω/Ω/i, or switch to JPL's "approximate positions"
     elements with century rates;
   - fix the asteroid mean anomalies, starting with `Ceres_MO` (`astlo.py:178`);
   - use `n = sqrt(μ/a³)` or exact sidereal periods.
4. **Fix the Moon**: degrees→radians and `a·(cos E − e)` (`contin.py:1608-1652, 1627`).
5. **Fix topocentric**: rotate ecliptic→equatorial before applying Earth's rotation, and
   use the requested time, not *now* (`topocentric.py:167-185`).
6. **Fix and actually loop RK4**:
   - dt in seconds (`contin.py:2154`);
   - the `sun_X` overwrite (`2359-2361`);
   - `velk4Z` (`2329`);
   - use the `r`/`v` arguments;
   - loop over steps;
   - start from JPL DE440 states.
7. **A validation script**: compare full x/y/z *and direction* against Horizons or
   DE440 at several dates, in CI.
8. Set `Requires-Python >= 3.12` in the package metadata.

---

## 8. Open questions

1. Who legally owns astlo, and would a core be released under MIT or Apache-2.0, with
   CC-BY for exported data?
2. Is there a newer private build than 12.5.5130000? The 21 bodies, Apophis/Halley and
   astlotalk/astlohorizons only appear in the v13 notes.
3. How exactly was the cross-validation against the .bsp files done: magnitudes only,
   or full x/y/z?
4. Why are the active ω/Ω values 2026 barycentric osculating angles while the mean
   anomalies are J2000? Would restoring the commented J2000 set be acceptable?
5. Is a real looped N-body integrator planned? It would be a great Python project,
   seeded from DE440.
6. Which Python version runs in Termux on the development phone? The code needs 3.12 or
   newer.

---

## Appendix: reproducing these results

These steps reproduce the 31 October evaluation of the published build. To compare the
published and the fixed builds side by side, at a frozen instant, use the newer bench in
[`python/astlo/bench/`](../python/astlo/bench/) instead; its steps are in
[`python/astlo/VERIFICATION.md`](../python/astlo/VERIFICATION.md#reproduce).

The scripts are in [`tools/astlo-bench/scripts/`](../tools/astlo-bench/scripts/) and the
comparison outputs in [`tools/astlo-bench/results/`](../tools/astlo-bench/results/). The
scripts are Starshot's own code (MIT). They call astlo's public API and the public JPL
Horizons API; none of astlo's code is included. Step-by-step instructions are in
[`tools/astlo-bench/README.md`](../tools/astlo-bench/README.md). In short:

```bash
python3 -m venv <scratch>/astlo-venv
<scratch>/astlo-venv/bin/pip install third_party/astlo/dist/astlo-12.5.5130000-py3-none-any.whl
mkdir <scratch>/work && cd <scratch>/work            # an empty scratch directory
BENCH=<repo>/tools/astlo-bench/scripts

# positions now and at J2000, 1986, 2029, 2126 (day offsets from now)
MPLBACKEND=Agg <scratch>/astlo-venv/bin/python -I $BENCH/run_positions.py -9800.37 -14874.87 895.04 36523.13
python3 -I $BENCH/compare.py out_run1.json            # vs JPL Horizons (needs internet)

# the same, with the commented J2000 angles restored in memory
PATCH=1 OUTF=out_patched.json MPLBACKEND=Agg <scratch>/astlo-venv/bin/python -I $BENCH/run_positions.py <same offsets>
python3 -I $BENCH/compare.py out_patched.json horizons_ref_patched.json

MPLBACKEND=Agg <scratch>/astlo-venv/bin/python -I $BENCH/run_rk4_and_sky.py   # RK4 behaviour + Nairobi az/el
MPLBACKEND=Agg <scratch>/astlo-venv/bin/python -I $BENCH/run_moon.py          # Moon
```

The day offsets above are relative to 2026-10-31 ~20:52 UTC. Recompute them for your
own run date (the README shows a one-line helper).

*Python 3.13, astlo 12.5.5130000, JPL Horizons API 1.2 (DE441), run on 2026-10-31.*
