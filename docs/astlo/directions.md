# Directions for astlo

This document accompanies the fixes to astlo in [`python/astlo/`](../../python/astlo/)
and their measurements in [`python/astlo/VERIFICATION.md`](../../python/astlo/VERIFICATION.md).
It is a technical note for Mark Macharia, the author of astlo, written by the Starshot
project. It says where we think astlo could go next, where astlo would matter most to
Starshot, and how the two projects can check each other's numbers through two shared
file formats. Every suggestion is offered, not imposed: astlo is Mark's, all rights
reserved, and the fixes are his to take or leave, one by one.

Starshot never depends on astlo at runtime and never copies its code into Starshot's
own packages ([D2](../decisions.md#d2-marks-code-is-all-rights-reserved-never-modified-copied-or-relicensed-here),
[D10](../decisions.md#d10-astlo-fixes-are-made-here-first-in-pythonastlo-shared-pending-marks-permission),
[D26](../decisions.md#d26-mark-macharia-hears-from-the-owner-now-astlo-is-a-partner-not-a-dependency)).
If Mark objects to `python/astlo/`, it is removed. How changes would reach him, and come
back once he adopts them, is the subject of the last section (D29).

## What was checked and fixed

astlo v12 was compared with NASA/JPL Horizons at five dates from 1986 to 2029 and, for
the sky, from Nairobi. Each fix is one commit in `python/astlo/astlo/`, with its before
and after numbers in `VERIFICATION.md`. The headline results:

| Area | Before the fixes | After the fixes | Where |
|---|---|---|---|
| Moon direction (10 dates, every 3 days) | mean 117.3 degrees, worst 120.3 | mean 0.96 degrees, worst 2.32 | `VERIFICATION.md`, section 2 |
| Sky position from Nairobi, Sun to Neptune | separations of 1.37 to 25.91 degrees | 0.005 to 0.055 degrees | section 3 |
| `rungekutta()` time step | returned days used as seconds | returns 3,600 s | section 4 |
| New `rk4steps()` over one year, seeded from Horizons | (did not exist) | Earth 178 km, Jupiter 8 km, Mercury 732 km | section 4 |

What is still imperfect, and not touched, is listed in section 7 of `VERIFICATION.md`:
`lamberts()` returns no velocities and can loop forever, `hohmann()` is a stub, and the
elements have no century rates.

## Eight directions

1. **One licence that names one rights holder.** astlo's files reserve all rights, and
   the licence file and the headers do not all name the same holder. A licence that
   names the holder and grants terms would let other projects, Starshot included, build
   on astlo with his name on it. For example: MIT or Apache-2.0 for the code, and CC BY
   4.0 for exported data. This is his decision alone; nothing in Starshot's plan
   waits on it.
2. **A pure API with absolute epochs.** For example
   `state(body, et_tdb, frame="ECLIPJ2000", center="SUN") -> (r_km, v_km_s)`. No "now
   plus N days", no wall clock, no printing and no plotting on import. A function that
   takes an absolute time can be tested; one that reads the clock cannot.
3. **Exceptions, not exits.** Library functions raise `ValueError` and its relatives;
   only the command-line interface turns an exception into an exit code. The `errors`
   fix in `python/astlo/` does this for the library paths; the command-line paths still
   exit, which is right for them.
4. **JSON output.** A `--json` flag on every command, with a documented schema, so other
   programs (and Starshot's checks) can read astlo's answers without parsing tables.
5. **An optional DE440 mode.** An extra such as `astlo[de]` that reads `de440s.bsp` with
   jplephem (MIT) would give exact planets and Moon, while astlo's own Kepler and N-body
   code stays the default and the thing people learn from.
6. **Tests against Horizons, with budgets.** Direction and distance, per body, at several
   dates, run on every change. Starshot's offline fixtures and test in
   `python/astlo/tests/` can be reused as a starting point.
7. **Packaging.** Publish on PyPI with a documented version scheme, `Requires-Python >=
   3.12`, the core separated from the command line and the plots (`astlo[cli]`,
   `astlo[plot]`), and a short changelog. The fixed wheel Starshot builds carries a
   local version label (`+starshot.1`) so it can never be mistaken for an official
   release or uploaded to PyPI under astlo's name.
8. **Documentation.** One page per feature with an example, the frame, the units and the
   time scale it uses.

## Where astlo would matter most to Starshot

Starshot's game flies on positions from NASA/JPL DE440 and its own Rust simulation
([D16](../decisions.md#d16-one-rust-core-adopted-now-without-a-staged-cut-over),
[D17](../decisions.md#d17-positions-come-from-de440-derived-rails-validated-against-jpl)),
so astlo is not in the game. It could matter in the tools around the game, once Mark
grants terms that allow it:

- **A launch-window explorer.** Porkchop sweeps that propose candidate windows for new
  levels. Starshot would still fly every candidate through its own simulator before a
  window becomes a level, because a level's preview, launch and tests must use one
  simulation (D6). This needs a Lambert solver that returns velocities and always ends.
- **A sky-position reference.** astlo's topocentric code is now within 0.055 degrees of
  JPL from Nairobi. A future "where is it in my sky tonight" panel in Starshot could be
  tested against it.
- **Small bodies.** Starshot fits per-level rails for asteroids and comets to Horizons
  vectors (D17). `rk4steps()`, seeded from DE440 or Horizons states, could propagate
  those bodies between the fixture dates and cross-check the rails there, once each
  body passes the same direction check Starshot applies to every data source (D4, D17).
- **Planet content.** The educational "details" command is commented out in the public
  v12 (`python/astlo/astlo/interface.py:372-392`), so it could not be assessed. If it
  becomes available, it could feed the game's planet cards with credit.
- **Shared formats.** astlo reading and writing the two formats below, so each project
  can check the other with the same files.

## The shared formats

Two JSON formats are the interface between the projects (D26). Starshot's ephemeris tool
will write them from PR8 of its current program on. astlo could write the validation
report for its own outputs and read the pack as a reference. Both use ET (TDB seconds past J2000), the ecliptic and
equinox of J2000 (`ECLIPJ2000`), kilometres and kilometres per second.

### `ephem.pack/1`: an ephemeris pack

The manifest describes where each body's numbers came from and how they are encoded. The
example shows one body; values are illustrative.

```json
{
  "schema": "ephem.pack/1",
  "id": "starshot-de440s-1950-2150-100km",
  "time_scale": "TDB",
  "time_argument": "seconds past J2000 TDB (ET)",
  "frame": "ECLIPJ2000",
  "units": { "length": "km", "velocity": "km/s", "gm": "km^3/s^2" },
  "generated": { "by": "tools/ephem 0.1.0", "utc": "2026-11-01T00:00:00Z", "last_modifier": "Starshot" },
  "bodies": [
    {
      "id": "MOON", "naif_id": 301, "center": "EARTH", "center_naif_id": 399,
      "source": { "kind": "spk", "file": "de440s.bsp", "md5": "3917ee56769db332790c751e2168843d", "producer": "NASA/JPL" },
      "coverage_et": [-1577880000.0, 4733553600.0],
      "encoding": { "kind": "chebyshev", "segment_s": 2764800, "degree": 15, "c0": "f64", "rest": "f32" },
      "validation": "validation/MOON.json"
    }
  ],
  "constants": { "emrat": 81.30057 }
}
```

- `source` records the kernel file and its MD5 as NAIF publishes it, so anyone can fetch
  the same input.
- `last_modifier` is the project that derived the file. NAIF's rules ask that a modified
  kernel name whoever made the last modification
  (<https://naif.jpl.nasa.gov/naif/rules.html>); a derived pack does the same.
- `constants.emrat` is the Earth-Moon mass ratio, from DE440's own GM values; Earth's
  centre is derived from the Earth-Moon barycentre and the Moon with it.
- In Starshot's packs the coefficients sit in one little-endian binary file per decade;
  the manifest's `decades` list gives each file's name, coverage and SHA-256.

### `ephem.validation/1`: a validation report

One report per body, per pack or per program output, comparing it with a reference.

```json
{
  "schema": "ephem.validation/1",
  "subject": { "pack": "starshot-de440s-1950-2150-100km", "body": "MOON", "producer": "starshot | astlo <version>" },
  "reference": { "name": "JPL DE440", "via": "local kernel | Horizons API", "api_signature": "1.2", "ephemeris_source": "DE441" },
  "sampling": { "from_et": -1577880000.0, "to_et": 4733553600.0, "step_s": 432000, "points": 14623 },
  "metrics": { "max_position_km": 54.3, "max_direction_arcmin": null, "rms_position_km": null },
  "budget": { "max_position_km": 150 },
  "pass": true
}
```

- `producer` says which program made the numbers being checked; astlo would write its
  own name and version there.
- `reference.via` says whether the truth came from a local DE440 kernel or from the
  Horizons API, and `api_signature` and `ephemeris_source` record what Horizons
  reported, because Horizons' planetary ephemeris can change.
- `pass` is computed from `metrics` against `budget`; a reader never trusts a `pass`
  without the numbers beside it.

## How Starshot credits astlo

- The repository's `README.md` and `NOTICE.md` name Mark Macharia as the author of
  astlo and say Starshot began as a fork of his public repository (D1).
- The game's credits screen carries a line such as "Starshot began as a fork of astlo by
  Mark Macharia", next to the data credits, using the name and handle he chooses (D26).
- `python/astlo/` keeps his headers and metadata as he wrote them, and its files stay
  under his terms, not Starshot's licence (D10, D12).
- Starshot never publishes contact details for him in its own files.

## How we would like to work with you

- **Changes come to you as pull requests.** Every fix is made in `python/astlo/` first,
  one topic per commit, and checked against NASA/JPL. When a set is ready, at the latest
  when Starshot's first chapter is done, it is offered to you as pull requests against
  your repository: astlo changes only, nothing of Starshot, each with its numbers.
- **You choose.** Take any of them, none, or all. If you adopt a change, Starshot pulls
  astlo from your repository or your PyPI release and drops its own copy of that
  change. The copy here then shrinks to a pinned version plus tests, instead of becoming
  a permanent fork.
- **You keep the Python.** You do not have to write Rust, ever. Starshot maintains the
  tests, the shared formats and, if you want it, a small Rust crate beside your code
  with Python bindings, so astlo's Python stays the version people learn from and read.
  All of this works from a phone: a pull request can be reviewed and merged there.
- **Nothing waits on you.** Starshot's plan does not depend on any of these choices, and
  the game never needs astlo at runtime (D26, D29).
