# starshot prototype

The approved launch-window and system-map study is preserved in
`public/observatory/`. It is an isolated design workspace. The production game,
campaign levels and physics packages are unchanged by packaging this study.

## Run

From the repository root:

```sh
npm ci
npm run dev:prototype
```

Open `http://127.0.0.1:8767/observatory/shell-preview.html`. The root entry also
opens the study. The server binds to the local machine only.

```sh
npm run build:prototype
npm run preview -w @starshot/prototype
npm run verify:data -w @starshot/prototype
```

The static build is in `apps/prototype/dist/`. It uses relative URLs and needs an
HTTP server; opening files directly does not support its module workers and data fetches.
This command does not deploy the build. The existing game still uses `npm run dev`.

## Preserved behavior

- A fixed game shell with a top Mission deck and a translucent bottom Flight deck.
- Simplified and Scientific controls, labelled unit cycling and independent size overrides.
- Replay pacing, pause, camera following, system framing and free inspection.
- Eight planets, 24 major moons, ring systems, physical orientation and Sun inspection.
- White Sun in Scientific or realistic size; gold in Simplified with enlarged worlds.
- Granulation, sunspots and illustrative solar activity, with pause and reduced motion.
- Keyboard controls, labelled DOM buttons, 44 px targets and live announcements.

The recorded First light shot uses the existing source model without changing its
path. The study is a Canvas presentation sketch. It does not replace D19's three.js
production renderer, create a lunar level, or implement low-orbit flight.

## Data and assets

The runtime is about 12.6 MB before HTTP compression, mostly an 11.6 MB satellite
rail. This is an iteration artifact, not the production download budget.

`public/observatory/assets-manifest.json` records source, licence, credit, byte length
and SHA-256 for each shipped runtime file. `planet-assets.json` retains both source
and resized texture hashes. `NOTICE.txt` carries the font and icon notices in the
static build. Repository `CREDITS.md` and `REUSE.toml` remain authoritative.

The three IBM Plex Mono WOFF2 files are lossless conversions of their complete
source TTFs. They retain all 995 glyphs and font metadata. No font was subsetted.

`tools/fixtures/provenance/` holds 24 Horizons request records with response hashes
and source headers. The metadata stores geometric ECLIPJ2000 vectors in km and km/s,
with ET as seconds of TDB past J2000. Earth centre is derived from EMB and the lunar
mass fraction. Global planets retain the existing approximate Kepler model.

`verify-system-data.mjs` compares 93 orientation matrices with CSPICE and recomputes
120 independent satellite probes. The 207651 midpoint-holdout results are cached
measurements, not fetched again by this offline check. The replay check compares
1001 probes against saved results from the unchanged game source.

## Regeneration

Generation is separate from serving and building. It makes network requests only
when explicitly run. Review new results and hashes before committing them.

```sh
node apps/prototype/tools/prepare-flight.mjs
python -m pip install numpy spiceypy
python apps/prototype/tools/prepare-system-data.py
node apps/prototype/tools/update-manifest.mjs
npm run verify:data -w @starshot/prototype
```

Use a disposable virtual environment for the Python dependencies. The physical-only
option `--physical-only` refreshes NAIF constants and CSPICE fixtures without lunar
rail queries. Raw network responses stay in ignored `tools/.cache/` for resuming a
generation run; compact provenance records are retained in `tools/fixtures/`.

The texture recipe is `tools/prepare-textures.ps1` on Windows. It verifies original
downloads against the recorded source hash, then resizes with the same JPEG quality
and bicubic filter used for the shipped files. It does not download or modify the
NASA Moon map beyond verifying its original bytes. Font conversion is documented in
`tools/prepare-fonts.py`; use `fonttools[woff]` in the disposable environment.

The cached source data and generation limits are also documented in
`docs/plans/look-prototype.md` and `docs/design/plan-proposals.md` at repository root.
