# starshot prototype

The root opens the playable lunar study. The approved launch-window and system-map
study is preserved in `public/observatory/`. This is an isolated design workspace.
The production game, campaign levels and physics packages are unchanged.

## Run

From the repository root:

```sh
npm ci
npm run dev:prototype
```

Open `http://127.0.0.1:8767/`. Launch window opens the Observatory over the same
lunar level. Return to flight restores its current clock and preferences. The server
binds to the local machine only.

```sh
npm run build:prototype
npm run preview -w @starshot/prototype
npm run verify:data -w @starshot/prototype
```

The static build is in `apps/prototype/dist/`. It uses relative URLs and needs an
HTTP server; opening files directly does not support its module workers and data fetches.
This command does not deploy the build. The existing game still uses `npm run dev`.

## Preserved Observatory behavior

- A fixed game shell with a top Mission deck and a translucent bottom Flight deck.
- Simplified and Scientific controls, labelled unit cycling and independent size overrides.
- Replay pacing, pause, camera following, system framing and free inspection.
- Eight planets, 24 major moons, ring systems, physical orientation and Sun inspection.
- White Sun in Scientific or realistic size; gold in Simplified with enlarged worlds.
- Granulation, sunspots and illustrative solar activity, with pause and reduced motion.
- Keyboard controls, labelled DOM buttons, 44 px targets and live announcements.

The standalone Observatory retains its recorded First light shot and unchanged path.
The hosted version receives the current lunar preview or flight. Its Canvas renderer
does not replace the lunar level's D19 three.js scene.

## Play the lunar study

The initial view includes Earth and the Moon. Pull the rear engine ring and release.
The collector stays anchored while its field chamber extends behind it. The ring
follows the grip without an initial jump. Extreme pulls show the existing 35 degree limit.
Guide sets the measured successful request.
The button labelled Use buttons offers non-drag aiming; the ring also accepts arrow
keys and Enter. Scientific exposes exact burn and angle sliders. A cancelled pull
never launches. Release can wait for the current worker preview, but never an old one.
While waiting, the chamber stays charged. A 180 ms snap retracts it before the
flight clock starts. The physical launch point does not move. Result cards offer
Try again and Replay. Menu's Restart level resets aim, fuel, time and the initial view.
Replay uses the same path from the initial view, without repeating the pull gesture.

The craft faces its Earth-relative direction of travel. Its cool plume animates
with the flight clock and freezes on pause. This is a visual powered effect; the
integrator still uses a single departure impulse and unchanged fuel accounting.

Zoom buttons and the wheel span local orbit to the complete Earth-Moon system.
Zoom centres the craft and retains the chosen height. Drag empty space to pan.
The deck's Follow, System and Free controls share the Observatory vocabulary.
System fits the mission; Free retains the current frame. Pause stops the flight clock.
The collapsed deck keeps fuel, angle and preview status in a compact dashboard.
During flight it shows progress and Moon distance, with Pause still available.
The hangar shows each original 3D vehicle part; drag or use arrow keys to inspect it.
Menus and the hangar pause flight and restore it on return. Sound is optional in Menu.
The Engine tab offers a rear-ring drag, charge slider and Release test. This isolated
demo uses the same engine geometry without changing the live shot. The graviton field
and contained core are fictional vehicle design, not claims about real propulsion.

The worker integrates Sun, Earth and Moon forces with the existing Dopri5 integrator.
The 700 kg collector starts 200 km above Earth with a 3.55 km/s departure budget.
The objective is entry within a 65,000 km lunar approach zone, not landing or capture.
The crew pod is a heavier concept and is not the vehicle flown in this level.

Positions stay full 3D; only the departure aim plane is locked. Rendering subtracts
Earth's position at each knot's own ET, then uses a fixed north-facing lunar basis. This
removes Earth's solar travel from the local plot without changing the integrated path.
Distances stay linear. Simplified gives Earth and the Moon a minimum displayed size;
Scientific uses physical radii. The craft remains enlarged for visibility, with a
short leader connecting its control symbol to the physical position.
Earth and Moon orientation reuse the Observatory's validated NAIF model.
The Moon moves counterclockwise from this side. The 200 km prograde parking orbit
is unchanged; it is not geostationary. A sampled lunar rail shows the orbit. Successful
previews mark the actual approach point and the Moon's position at the same future ET.

The hosted map suspends the mounted level while it owns playback. A validated bridge
returns exact ET, pause state, rates and preferences. Its clock uses full 3D geocentric
distance from a trimmed copy ending at the visible approach or impact. The original
Flight object stays unchanged. Planet inspection does not alter the returned level camera.

Weak pulls whose initial two-body apogee is below 100,000 km use a declared local
preview window: two estimated periods, capped at one day. The full force model still
computes that window. Other requests run for seven days or an impact. Entry detection
refines near-boundary segment minima, including approaches between accepted knots.
Preview and launch use the same frozen request and the exact same returned samples.

`?renderer=canvas` selects the accessible Canvas fallback. It preserves aiming and
the physical path; its vehicle drawing is a flat reference, not a 3D model viewer.
Reduced motion removes the release animation and automatic camera zoom. System
framing stays fixed from the pull through flight, including while menus are open.
The travel plume stays steady under reduced motion.
Manual camera controls remain available. Both motion preferences use the same flight time.

```sh
npx vitest run apps/prototype
npm run typecheck -w @starshot/prototype
node apps/prototype/tools/extract-lunar-rail.mjs
```

The [lunar plan](../../docs/plans/lunar-play-prototype.md) records measured evidence
and limits. The [design note](../../docs/design/lunar-play.md) names extension points.

## Data and assets

The Observatory runtime is about 12.6 MB before HTTP compression, mostly an 11.6 MB satellite
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
