# tools/ephem: Starshot's ephemeris tool

A small Python project that turns NASA/JPL data into the files Starshot's tests and
game read (D17). It writes the Horizons test fixture, downloads and checks NAIF's DE440
kernels, and fits and validates the rails pack in `data/ephem/`. It runs on a
contributor's machine or in the `ephem` workflow, never in the game.

## Commands

Run them from the repository root; `uv` installs the versions in `tools/ephem/uv.lock`.

```bash
uv sync --project tools/ephem --locked
uv run --project tools/ephem --locked pytest tools/ephem/tests -q        # no network
# The Horizons fixture the TypeScript ephemeris tests read (10 requests, then cached).
uv run --project tools/ephem --locked starshot-ephem fixtures --out fixtures/horizons/horizons.json
# de440s.bsp (about 32 MB) and gm_de440.tpc, downloaded once and MD5-checked.
uv run --project tools/ephem --locked starshot-ephem kernel --path tools/ephem/.cache/de440s.bsp
```

`build` and `validate` make and check the rails pack; `data/ephem/README.md` has both
commands. `conformance --pack data/ephem/de440s-100km` writes
`fixtures/conformance/rails.json`, this tool's own evaluation of the committed pack,
which the Rust reader must reproduce. `build` writes byte-identical decade files on one machine, and with
`SOURCE_DATE_EPOCH` set an identical `pack.json` too. `validate` exits 1 when any body
is over its budget.

## Rules

- **Horizons is never called at runtime.** The fixture command is the only caller. It
  caches each answer in `tools/ephem/.cache/horizons/` under the SHA-256 of its query
  and retries HTTP 429 and 503 after 1, 2, 4, 8 and 16 s. The fixture records the API
  signature, the ephemeris source and the fetch time.
- **Kernels are never committed.** `kernel.py` pins an MD5 for each file and refuses
  any other bytes.
- **Derived files name Starshot as the last modifier,** as NAIF's rules ask
  (<https://naif.jpl.nasa.gov/naif/rules.html>).
- **The import package is `ephem`.** PyEphem uses the same name; this project never
  installs it.

## The interface for other producers

Two functions are the interface of the growth path (D29). Another producer, such as a
validated astlo, could implement them and pass the same tests.

- `generate(kernel, bodies, window, tolerance) -> Pack` in `src/ephem/generate.py` fits
  each body over the decades of `window` from any `PositionSource` (an object with
  `position(target, center, et)`), checks every quantised segment at 24 points and
  returns the pack in memory.
- `validate(pack, reference) -> Report` in `src/ephem/validate.py` compares a pack with
  a `PositionSource` every 432,000 s, or with a Horizons fixture at its epochs, and
  returns one `ephem.validation/1` record per body.

The formats are described in `docs/astlo/directions.md`. The command line is a thin
layer over these functions, and the tests import only from `ephem`.

## Dependencies and their licences

| Package | Licence | Used for |
|---|---|---|
| `jplephem` 2.24 | MIT | reading NAIF SPK kernels |
| `numpy` 2.5.4 | BSD-3-Clause (its PyPI metadata adds 0BSD, MIT, Zlib and CC0-1.0 for bundled parts) | Chebyshev fits and arrays |
| `pytest` (dev only) | MIT | the tests |
