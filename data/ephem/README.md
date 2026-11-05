# data/ephem: DE440 rails

Positions of the planets and the Moon as Chebyshev rails, for the Rust core to read
(D17). Nothing here is hand-written: `tools/ephem` generates every file.

## Provenance

- **Source:** NASA/JPL's DE440 planetary ephemeris, as NAIF publishes it in
  `de440s.bsp` (<https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/>, MD5
  `3917ee56769db332790c751e2168843d`). The Earth-Moon mass ratio in `pack.json` comes
  from NAIF's `gm_de440.tpc` (BODY399_GM over BODY301_GM).
- **Last modifier: Starshot.** These files are derived from the kernel, not copies of
  it: fitted, quantised and repacked by `tools/ephem`. NAIF's rules ask that a modified
  kernel name whoever made the last change (<https://naif.jpl.nasa.gov/naif/rules.html>),
  so `pack.json` records `"last_modifier": "Starshot"`. NASA/JPL did not produce or
  check these files. Credit NASA/JPL-Caltech for the data.
- **Licence record:** `LicenseRef-NASA-JPL-Data` in `REUSE.toml`.

## What `de440s-100km/` holds

| File | What it is |
|---|---|
| `pack.json` | The `ephem.pack/1` manifest: bodies, encodings, coverage, EMRAT and each decade file's size and SHA-256 |
| `1950.bin` to `2140.bin` | One little-endian decade file per decade, 1950 to 2150, in the layout `tools/ephem/src/ephem/pack.py` describes |
| `validation/<BODY>.json` | One `ephem.validation/1` report per body, against the kernel every 432,000 s (5 days) |
| `VALIDATION.md` | The reports as a table |

The planets are system barycentres relative to the Sun, the Moon is relative to Earth's
centre, in the ecliptic of J2000, in km and seconds of ET. Each body's fit stays within
100 km of the kernel, and the reports hold every body to 150 km.

## Rebuilding

The committed files are the source of truth, and the tests read them, not the kernel.
A rebuild on another machine may differ in the last bits of a coefficient, so commit a
rebuild only when the inputs change. From the repository root:

```bash
uv run --project tools/ephem --locked starshot-ephem build --kernel tools/ephem/.cache/de440s.bsp \
  --from-year 1950 --to-year 2150 --out data/ephem/de440s-100km
uv run --project tools/ephem --locked starshot-ephem validate --kernel tools/ephem/.cache/de440s.bsp \
  --pack data/ephem/de440s-100km
```

The `ephem` workflow's manual `regenerate` job runs the same two commands and uploads
the result as the `ephem-pack` artifact for a person to review and commit.
