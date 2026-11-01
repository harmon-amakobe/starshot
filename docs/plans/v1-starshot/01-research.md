# v1-starshot: research report

The evidence behind the program plan ([00-plan.md](00-plan.md)). Seven scout reports
were written on 2026-11-01: gameplay and physics, shared-core architecture, visuals and
audio, licence and governance, CI and hosting, ephemeris and astlo, and domains. They are
merged here by axis with the orchestrator's own blind-spot pass. For each axis: the facts
that matter with their sources, the options considered, the recommendation taken, and
what would change it. The owner's rulings are the decision entries D12 to D28 in
[../../decisions.md](../../decisions.md). Where a source and a ruling disagreed, the row
is in [02-disagreement-register.md](02-disagreement-register.md).

How claims are marked:

- Repository claims carry `file:line` on the tree of 2026-11-01. Line numbers are
  anchors. Re-locate by symbol.
- External claims carry the URL a scout fetched on 2026-11-01. A claim the scouts could
  not fetch is marked *(not verified)*.
- *(measured)* means a scout ran it on 2026-11-01 (Node 22, Bun, Rust 1.97 with the
  `libm` crate 0.2.16, Python 3 with jplephem 2.24 and numpy 2.5.4, on an x86_64 Xeon).
  The scratch scripts stayed outside the repository. The plan's tests re-measure every
  number they rely on.
- *(computed)* means a closed-form result from standard two-body relations with the
  repository's constants (`packages/ephemeris/src/bodies.ts`, `packages/physics/src/launch.ts:4-6`).
- *(estimate)* and *(judgment)* mean what they say.

## The owner's answers

The orchestrator interviewed the owner in three rounds. The brief records the answers.
Rounds 1 and 2 follow the orchestrator's plan skeleton, and round 3 holds the rest.

### Round 1: before the research

| Question | Answer (intent, from the brief) | Decision |
|---|---|---|
| Which licence? | Apache-2.0 | D12 |
| Online features in v1? | "we need firebase anyway, since we need to publish it, so yeah anonymous and leaderboard"; a cheap domain | D13, D20 |
| Money? | Free and open, no ads | D14 |
| Art and sound? | Real imagery, plus CC or original music | D15 |

### Round 2: after the research

| Question | Answer | Decision |
|---|---|---|
| Rust core now, or TypeScript now and port later? | "Adopt it now, you don't need to stage, this is technically greenfield. Nothing really exists or is live, what exists is a prototype." <!-- copy-ok: the owner's words, quoted --> | D16 |
| Where do positions come from? | DE440 rails for the planets and the Moon | D17 |
| Starting budget, unlocks and mass? | 3.55 km/s to start; unlocks by the depth of each gravity well; lighter craft go farther (fuel is impulse) | D18 |
| The name? | Keep Starshot; register playstarshot.com and playstarshot.app | D20 |
| Mark's role and timing? | Reach out now with the fixes | D26 |
| Pace? | Solo with agents; invite others after chapter one | D25 |

### Round 3: hosting, audience and process

| Question | Answer | Decision |
|---|---|---|
| Hosting? | Firebase Hosting plus a GitHub Pages mirror | D21 |
| Audience? | 13 and up | D22 |
| Personal account or organisation? | Personal for now | D23 |
| Commit authorship? | The owner as author, the agent as co-author, DCO for all | D24 |
| Standing instructions | No em dashes anywhere, and no en dashes; no AI tells; no god components; no verbose comments; nothing proprietary or private of the owner's in the repository; best open-source practice; strong CI; issues, epics and a board kept current by agents | D27, D28, D23 |

## 1. The shared core and determinism

### Facts

The architecture scout ported Table 1, heliocentric gravity and the Dormand-Prince step
to Rust, in about 120 lines that keep the TypeScript operation order. It flew 252 flights
from Earth with every planet but Earth pulling. 183 flights of 326 days used
`SIM_SETTINGS`-like tolerances and 69 of 13.7 years used `OUTER_SIM_SETTINGS`-like ones
(`apps/game/src/sim/shot.ts:50-55`, `:68-73`). Inputs were exact binary fractions *(measured)*:

| Comparison (252 flights) | Flights that differ in any bit | Largest position gap |
|---|---|---|
| Rust with the `libm` crate as wasm, in V8 and in JavaScriptCore | 0 | 0 |
| The same wasm in V8, and native x86_64 Rust with `libm` | 0 | 0 |
| Today's TypeScript in V8, and in JavaScriptCore | 23 | 29 m |
| Today's TypeScript in V8, and the Rust wasm | 24 | 98 m |
| Native Rust with glibc's maths, and with `libm` | 22 | 127 m |

- Step counts were identical in every comparison, so the differences were last-digit
  drift, not a changed accept or reject decision.
- Computing the aim as `s * Math.cos(angle)` in each engine made the otherwise identical
  wasm disagree on 3 of 252 flights. So a replay must carry the exact bits of its inputs,
  or the degrees-to-vector conversion (`vInfFromAim`, `apps/game/src/sim/shot.ts:363-366`)
  must run inside the core.
- Over a million inputs each, V8 and JavaScriptCore disagree on 33,285 `sin` results,
  97,469 `exp`, 11,785 `atan2` and 60,136 `pow` with exponent -0.2 *(measured)*. The
  integrator's step control calls `Math.pow(err, -0.2)`
  (`packages/physics/src/dopri5.ts:88`), so even the step sequence depends on the engine.
- ECMAScript leaves `Math.sin` "implementation-approximated"
  (<https://tc39.es/ecma262/multipage/numbers-and-dates.html>). V8's current source
  routes `sin` and friends to LLVM's libc
  (<https://chromium.googlesource.com/v8/v8/+/refs/heads/main/src/base/ieee754.cc>).
  JavaScriptCore calls the platform's `std::sin`
  (<https://github.com/WebKit/WebKit/blob/main/Source/JavaScriptCore/runtime/MathCommon.h>).
- Rust's `f64::sin` "is non-deterministic. This means it varies by platform, Rust version,
  and can even differ within the same execution"
  (<https://doc.rust-lang.org/std/primitive.f64.html>). WebAssembly's nondeterminism is
  limited to NaN bit patterns, relaxed SIMD and threads
  (<https://github.com/WebAssembly/design/blob/main/Nondeterminism.md>).
- Speed for the 252 flights: TypeScript 885 ms in V8 and 1,142 ms in JavaScriptCore.
  Rust wasm 589 and 733 ms. Native 536 to 584 ms *(measured)*. Wasm is about 1.5 times
  faster.
- Size: the wasm kernel is 31.6 KB raw, 15.2 KB gzip, most of it the software `sin`, `cos`
  and `pow` *(measured)*. Today's physics worker bundle is 17.3 KB raw, 7.9 KB gzip.
- Ecosystem: UniFFI 0.32.2, MPL-2.0, about two minor releases a year
  (<https://crates.io/crates/uniffi>). Wasm-bindgen 0.2.130 and wasm-pack 0.15.1, MIT or
  Apache-2.0 (<https://crates.io/crates/wasm-bindgen>). `aarch64-apple-ios`,
  `aarch64-linux-android` and `wasm32-unknown-unknown` are tier 2 targets
  (<https://doc.rust-lang.org/rustc/platform-support.html>). Mozilla
  application-services, matrix-rust-sdk and Bitwarden's sdk-internal ship this shape:
  thin binding crates over a logic crate
  (<https://github.com/mozilla/application-services>,
  <https://github.com/matrix-org/matrix-rust-sdk>,
  <https://github.com/bitwarden/sdk-internal>).
- Contributor reach, share of all respondents using each language: TypeScript 43.6%,
  Rust 14.8%, Kotlin 10.8% (<https://survey.stackoverflow.co/2025/technology>).

### Options

| Option | Determinism across web, phones and server | Main cost |
|---|---|---|
| Rust core: wasm for the web worker, UniFFI for Swift and Kotlin | Bit-identical with a software maths layer (measured on x86_64; arm64 not yet) | A second language and toolchain |
| Keep TypeScript, port when the native apps start | Not bit-exact across browsers unless a pure-JS maths layer is added | Two cores during the port |
| Kotlin Multiplatform | Needs its own maths layer; Kotlin/Wasm is Beta (<https://kotlinlang.org/docs/wasm-overview.html>) | The web becomes the weakest target |
| C++ core | Possible, but GCC contracts `a*b+c` into fused multiply-adds by default (<https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html>) | Silent non-determinism and memory bugs |
| A cross-platform engine (Godot, Bevy, Unity, Flutter) | Engine physics would be replaced anyway | Canvas-drawn UI fights real labelled DOM controls (AGENTS.md, non-negotiable 7) |
| TypeScript everywhere, JS engine embedded in the apps | Only with a pure-JS maths layer | JIT availability in a third-party iOS app was not verified |

### Recommendation taken

One Rust core under `crates/`, all transcendental maths through one crate that calls
`libm`, compiled to wasm for the worker and run unchanged on the server, adopted now
without a dual-engine release (D16). Canonical replay inputs carry exact bits and a
`physicsVersion`.

**What would change it:** an arm64 run of the golden tests showing different bits.
Tolerance checks would then become primary, and the case for Rust would narrow to speed
and native reuse. The owner dropping server-verified scores and native apps would change
it too.

## 2. Where the planets and the Moon come from

### Facts

- JPL's Table 1 is "valid for the time-interval 1800 AD - 2050 AD", and its elements
  "are not valid outside the given time-interval"
  (<https://ssd.jpl.nasa.gov/planets/approx_pos.html>). Its "earth" is the Earth-Moon
  barycentre (`packages/ephemeris/src/elements.ts:9`). It has no Moon, no moons, no
  Pluto and no small bodies.
- Measured against DE440 every 5 days, 1950 to 2150 *(measured)*:

| Planet | Worst direction 1950 to 2050 | Worst position 1950 to 2050 | Worst direction 2050 to 2150 | Today's test budget |
|---|---|---|---|---|
| Mercury | 0.53 arcmin | 7,100 km | 0.68 arcmin | 1.5 arcmin |
| Venus | 0.46 | 14,700 km | 0.47 | 1.5 |
| Earth (barycentre) | 0.38 | 16,500 km | 0.41 | 1.5 |
| Mars | 1.68 | 102,000 km | 1.98 | 2 |
| Jupiter | 8.6 | 1.86 million km | 10.1 | 12 |
| Saturn | 9.3 | 3.96 million km | 27.3 | 15 |
| Uranus | 1.9 | 1.66 million km | 11.9 | 3 |
| Neptune | 0.97 | 1.61 million km | 2.4 | 2 |

  Budgets are in `packages/ephemeris/test/ephemeris.test.ts:25-34`. Mars reaches 84% of
  its budget between the five fixture dates (`tools/horizons/fetch_fixtures.py:32-33`),
  and after 2050 Saturn, Uranus and Neptune break theirs. A 1.86 million km Jupiter error
  is larger than a typical flyby distance.
- DE440 covers 1550 to 2650. `de440s.bsp` (31 MB) covers 1849-12-26 to 2150-01-22 and
  includes the Moon (<https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/>,
  `aa_summaries.txt` there). The downloaded copy matched NAIF's MD5
  `3917ee56769db332790c751e2168843d` *(measured)*. DE441's planets agree with DE440 to
  within a metre (<https://ssd.jpl.nasa.gov/planets/eph_export.html>). Horizons reported
  `{source: DE441}` on 2026-11-01 *(measured)*.
- NAIF's rules: kernels "may be downloaded and used by anyone". A modified kernel must
  name "whomever has made the last modification"
  (<https://naif.jpl.nasa.gov/naif/rules.html>).
- Readers: jplephem 2.24, MIT (<https://pypi.org/pypi/jplephem/json>). ANISE, MPL-2.0
  (<https://github.com/nyx-space/anise/blob/master/README.md>), builds for wasm at 126
  to 200 KB gzip and grew wasm memory to 95 MiB loading `de440s` *(measured)*. Hifitime,
  MPL-2.0. Nyx-space, AGPL-3.0-or-later (<https://crates.io/api/v1/crates/nyx-space>).
- astronomy-engine, MIT, "accurate to within plus or minus 1 arcminute"
  (<https://github.com/cosinekitty/astronomy>), 46.7 KB gzip. Measured against DE440 its
  Moon is within 15 km and it does not degrade after 2050 *(measured)*. VSOP2013 is
  about 290 MB of data (<https://ftp.imcce.fr/pub/ephem/planets/vsop2013/solution/>).
  The Python ELP/MPP02 port is GPL-3.0-or-later
  (<https://pypi.org/pypi/elp-mpp02/json>).
- Chebyshev rails were fitted to `de440s` at a 100 km tolerance *(measured)*. Mercury
  needs 32-day segments of degree 12 (191,756 bytes per century). Venus takes 256 days
  and degree 15, the barycentre 256 and 12, Mars 512 and 17, and the four giants 512 and
  8 (8,561 bytes each). The geocentric Moon takes 32 and 15 (232,847 bytes, worst error
  54 km). Totals: 295 KB per century for the planets, 528 KB with the Moon. At 10 km,
  407 and 681 KB. A two-year level needs about 6 KB, 11 KB with the Moon *(estimate)*.
  Cubic Hermite rails were 3 to 9 times larger for the same error.
- One evaluation costs 0.13 microseconds for a degree-15 Chebyshev series, 0.38 for a
  Table 1 Kepler solve, 1.3 to 2.6 for astronomy-engine's planets and 10 for its Moon
  *(measured)*. Rails use only additions and multiplications, so they give the same bits
  on every engine.
- Satellite kernels are large (`jup365.bsp` 1.1 GB, `sat441.bsp` 631 MB). `ura111` and
  `nep095` are no longer current
  (<https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/>). Per-level
  rails for a two-year window would be about 75 KB for Io *(estimate)*.
- Small bodies cannot be two-body propagated across an encounter: Apophis is 10.5 million
  km off after its 2029 Earth flyby, 67P 50 million km after ten years *(measured against
  Horizons)*.
- Horizons' fair-use policy: cache and reuse results, and "You may not embed these APIs
  in your website" (<https://ssd-api.jpl.nasa.gov/>). `TLIST` takes up to 10,000 times
  per request (<https://ssd-api.jpl.nasa.gov/doc/horizons.html>). The committed fixture
  records neither the API version, nor the ephemeris source, nor the fetch date
  (`packages/ephemeris/test/fixtures/horizons.json:2-8`).
- Time: ET is TDB seconds past J2000 (`packages/ephemeris/src/time.ts:1-8`). IERS
  Bulletin C 72 announced no leap second at the end of December 2026
  (<https://hpiers.obspm.fr/iers/bul/bulc/bulletinc.dat>).

### Options

| | Rails | Analytical series | Trimmed SPK | Table 1 plus a lunar theory |
|---|---|---|---|---|
| Accuracy | Chosen at build time (100 or 10 km) | 0.05 to 0.58 arcmin; Moon 15 km | Full DE440 | 0.4 to 9.3 arcmin to 2050, up to 27 after |
| Download | 0.3 to 0.7 MB per century, 5 to 50 KB per level | 47 KB once | 7.8 to 21.5 MB plus a reader | about 14 KB of code |
| CPU | Lowest | Highest | Low | Low |
| Determinism | Adds and multiplies only | Many `sin` and `cos` calls | Depends on the reader | Trigonometry in every call |

### Recommendation taken

Chebyshev rails from `de440s.bsp` for the eight planets and the geocentric Moon at a 100
km tolerance (test budget 150 km), packed per decade with an `ephem.validation/1`
report. Table 1 kept as the fallback and an independent cross-check. Earth's centre
derived from the barycentre and the Moon. Small bodies and major moons as per-level
rails later. Horizons never called at runtime (D17).

**What would change it:** a date slider past 2150 (then the generator reads the 114 MB
`de440.bsp`). A need for player-chosen small bodies at runtime (then a trimmed SPK).

## 3. Flight model and economy

### Facts *(computed unless marked)*

- Escape from a 200 km parking orbit costs 3.226 km/s. Every km/s beyond it buys more than
  a km/s of hyperbolic excess (the Oberth effect,
  <https://en.wikipedia.org/wiki/Oberth_effect>): 4.0 km/s gives 4.20, 6.0 gives 8.29.
- The Moon: translunar injection 3.133 km/s. A loose capture 0.21 km/s. The Moon's
  sphere of influence about 66,200 km. Earth sits 4,670 km from the barycentre.
- Departures from 200 km to Venus 3.51, Mars 3.61, Jupiter 6.31 and Saturn 7.28 km/s. The
  repository's pars agree: Mars 2026 3.62, Venus 2028 3.51, Jupiter 2028 6.24
  (`apps/game/src/levels.ts`, the `CAMPAIGN` entries).
- Captures at periapsis: loose captures cost 0.2 to 0.7 km/s. Circular captures at the
  giants cost 8 to 17 km/s. Real anchors: Cassini's Saturn insertion slowed by 626 m/s
  over 96 minutes
  (<https://www.jpl.nasa.gov/news/cassini-spacecraft-at-saturns-doorstep/>). Juno's
  Jupiter insertion 542 m/s over 35 minutes
  (<https://www.jpl.nasa.gov/news/juno-enters-orbit-around-jupiter/>).
- The Sun: perihelion at 20 solar radii costs 12.89 km/s direct. Parker-like depth
  15.89.
- At 1 g, 1 km/s takes 102 s. The impulsive model stays within 1% of a real 1 g burn
  while the burn sweeps less than about 45 degrees of the parking orbit. That holds up
  to a hyperbolic excess of about 6 km/s. Jupiter-class departures lose 2 to 3%. Loose
  captures at 1 g match the impulsive result to 0.1%. Circular captures at the giants
  are not valid single burns (the craft sinks into the planet).
- What a literal 12.6 km/s budget would do: a hyperbolic excess of 17.2 km/s, solar escape
  (8.75 km/s) and Jupiter on 43% of days with no flyby.
- Keeping slingshots meaningful: at 10 km/s from orbit, Mars windows stop mattering. The
  outer planets still need windows at 20 km/s. Keep chapter one at or below about 15
  km/s.
- `u = sqrt(GM / r_SOI)`, the circular speed at a body's sphere of influence: Moon 0.27,
  Venus 0.73, Mars 0.27, Jupiter 1.62, Saturn 0.83 km/s. With the 3.55 km/s start, loose
  captures and best windows, a worked progression reaches the chapter's end near 14.7 km/s.
- Fuel as impulse: with `J0 = 700 kg x 3.55 km/s`, the 1,000 kg crewed craft gets 0.7 of
  the probe's delta-v and cannot leave Earth until the probe budget reaches 4.61 km/s.

### Options

| Topic | Options | Taken |
|---|---|---|
| Burn model | Impulsive at the boundary (today); the same plus a drawn burn arc and a precomputed loss table; an integrated finite burn | Drawn burn, charged from a table (D18 item 3) |
| Capture | Manual timing; fully automatic; auto-timed at periapsis with a hold that sets the amount | Auto-timed with detents (D18 item 4) |
| Starting budget | Literal 12.6 km/s; 3.23 (escape only, too tight); 3.55 (escape plus 10%) | 3.55 (D18 item 1) |
| Unlock rule | Surface escape speed (too steep); delta-v spent (rewards waste); a hand-set table; `u_SOI` | `u_SOI` plus `2u` for a collector in a stable orbit (D18 item 2) |
| Mass | Flavour only; impulse | Impulse (D18 item 1) |

**What would change it:** prototype 5 (the economy script) showing a body that needs
more than three attempts, or Jupiter's jump trivialising Saturn. Playtests showing
players want to time burns themselves.

## 4. Previews, time and the launch window

### Facts

- Chaos after a flyby: turning the Grand Tour hint by 0.01 degree moves the Jupiter
  periapsis by about 45,000 km and Saturn's closest approach by about 16.5 million km
  *(measured in the game's simulator)*. The cheapest Jupiter-assisted Saturn hit sits in
  a band about 0.14 degrees wide (`apps/game/src/levels.ts`, `GRAND_TOUR_PAR_SHOT` docblock).
- Previews take a median 2 to 8 ms on desktop Node and 30 to 45 ms for the slowest
  outer-planet case (`apps/game/src/sim/shot.ts:43-48`, `:57-67`). A Lambert solve takes
  11 to 13 microseconds *(measured)*. Phones are 3 to 5 times slower *(estimate)*,
  against a 100 ms aiming budget (AGENTS.md, non-negotiable 6).
- Warp spans six orders of magnitude in one launch: about 100,000 times for a Moon trip,
  21 million for Saturn via Jupiter, 14 to 50 times during a capture burn. The game plays
  a flight in 4 to 9 s today (`apps/game/src/ui/GameScreen.tsx`, the flight clock).
- From 2026-11 to 2050 the repository's `bestDirectTransfer` finds 10 Mars, 14 Venus and
  21 Jupiter windows on a 5-day grid, 0.5 to 0.75 s per target on desktop *(measured)*.
- One-way light time: Moon 1.3 s, Mars 3 to 22 minutes, Jupiter 33 to 54, Saturn 67 to 92.

### Options and recommendation taken

| Topic | Options | Taken |
|---|---|---|
| Multi-flyby preview | Full simulation to the end; exact to the next sphere of influence plus an analytic flyby and one ghost leg; a Tisserand view; snap-to-flyby aim assist | The second and the fourth, with the next leg aimed in flight (D18 item 5); Tisserand graphs belong in level-design tools |
| Time | Fixed warp steps; an event-anchored time map | The time map: about 4 to 8 s of player time per launch, eased in log space (D18 item 7) |
| Fuel delivery clock | Wall-clock (an idle layer); mission time | Mission time with a visible beam (D18 item 2) |
| Window slider | Live search on the phone; a precomputed table refined on the device | Precomputed at build time and tested like a fixture (PR23) |

**What would change it:** measured phone timings showing two full legs fit in 100 ms.

## 5. Rendering and scale

### Facts

- Minimal scenes, minified and gzipped *(measured)*: three.js `WebGLRenderer` 134.5 KB.
  `WebGPURenderer` 222.2 KB. Three with `KTX2Loader` 157.0 KB plus a 260 KB transcoder
  fetched on demand. React Three Fiber about 248 KB on top of React. Babylon.js 342.5
  KB. PlayCanvas 515.9 KB. Today's main bundle is 92 KB gzip.
- WebGPU in Chrome on Android arrived on "devices running Android 12 and greater powered
  by Qualcomm and ARM GPUs" (<https://developer.chrome.com/blog/new-in-webgpu-121>).
  Firefox for Android has none (<https://caniuse.com/webgpu>). Most target phones run
  WebGL 2.
- At mission framing on a 340 px wide phone, Earth's true radius is 0.0045 px and the Sun's
  0.49 px *(computed)*: textured planets are visible only in close-ups or with enlarged
  sizes. Float32 resolves 16 km at 1 AU and 512 km at Neptune *(computed)*, so positions go
  to the GPU relative to the camera (Babylon.js documents why:
  <https://doc.babylonjs.com/features/featuresDeepDive/scene/floating_origin>).
- `docs/game-design.md:94-95` promises "Honest scale". The orrery note already planned
  "planets drawn larger than life with a size badge" (`docs/architecture.md:207-219`).

### Options and recommendation taken

Options: stay on Canvas 2D. Three.js `WebGLRenderer`. Three.js `WebGPURenderer` first.
React Three Fiber. Babylon.js or PlayCanvas. Taken: three.js `WebGLRenderer`,
imperative, presenting as 2D. Linear distances. Enlarged body sizes with a badge, a
scale bar and a true-size toggle. Canvas 2D kept as the fallback and the accessibility
reference (D19).

**What would change it:** a WebGL 2 failure rate above a few percent on real low-end
phones. The 3D chapter starting within the first PRs (then write shaders once in TSL).

## 6. Planet imagery and the asset pipeline

### Facts

| Source | Terms | Use |
|---|---|---|
| Solar System Scope textures (<https://www.solarsystemscope.com/textures/>) | CC BY 4.0: "You may use, adapt, and share these textures for any purpose, even commercially" | Base set for the Sun, the planets and the Moon |
| NASA images and media (<https://www.nasa.gov/nasa-brand-center/images-and-media/>) | Generally not subject to copyright; acknowledge NASA; no implied endorsement; insignia excluded | Cards and close-ups |
| JPL (<https://www.jpl.nasa.gov/jpl-image-use-policy>) | "may be used for any purpose without prior permission"; credit "Courtesy NASA/JPL-Caltech" | Cards |
| NASA SVS CGI Moon Kit (<https://svs.gsfc.nasa.gov/4720>) | NASA terms | The Moon |
| NASA SDO (<https://sdo.gsfc.nasa.gov/data/rules.php>) | "not copyrighted unless explicitly noted" | The Sun |
| Björn Jónsson's maps (<https://bjj.mmedia.is/data/planetary_maps.html>) | Asks that copies not be placed on a website | Not used without his written agreement |
| ESA website images (<https://www.esa.int/ESA_Multimedia/Copyright_Notice_Images>) | Commercial uses excluded unless CC BY-SA 3.0 IGO | Not used |

- Sizes for all 16 maps *(measured)*: 1k WebP 603 KB, KTX2 ETC1S 837 KB. 2k WebP 2,182
  KB, KTX2 2,785 KB. Level 1 (Sun, Earth, Mars, Milky Way) at 1k ETC1S is 275 KB.
- GPU memory *(computed)*: sixteen 2k maps take about 170 MiB as RGBA from WebP and about
  21 MiB as ETC1 from KTX2. On a low-end phone the first number risks the tab.
- First load before textures: app 92 KB + three 135 KB + game 3D code and audio about
  30 KB *(estimate)* = about 260 KB gzip.

### Recommendation taken

Real imagery from the sources above, KTX2 (ETC1S for colour, UASTC for normals) in 512,
1k and 2k tiers with an optional 4k download and a WebP fallback. A manifest entry per
shipped asset with its source, licence, attribution and hash. `CREDITS.md` generated
from it. No AI-generated assets without a new decision (D15, D19).

## 7. Stars and sky

- Yale Bright Star Catalogue 5: 9,110 stars, licence not stated on its page *(not
  verified)* (<http://tdc-www.harvard.edu/catalogs/bsc5.html>).
- HYG: CC BY-SA 4.0 (<https://codeberg.org/astronexus/hyg/raw/branch/main/LICENSE>),
  usable as a separately licensed data file.
- Gaia: "Gaia data are distributed under the CC BY-NC 3.0 IGO license"
  (<https://www.cosmos.esa.int/web/gaia-users/license>). The brief had said CC BY-SA
  (register R2). NASA SVS's Deep Star Maps 2020 are built partly from Gaia DR2
  (<https://svs.gsfc.nasa.gov/4851>).
- The physics frame is ecliptic J2000. Star catalogues are equatorial, so star
  directions rotate by the obliquity about +x. The repository has no obliquity constant
  today. PR27 adds one with its source and a test.

Taken: Yale BSC if its terms are confirmed, otherwise HYG as a separately licensed file.
No Gaia-derived data. Solar System Scope's CC BY 4.0 Milky Way as the backdrop (D15).

## 8. Sound and haptics

- Browsers start an `AudioContext` suspended until a user gesture
  (<https://developer.chrome.com/blog/autoplay>). The first pull of the slingshot is
  that gesture.
- The Vibration API works in Chrome and Samsung Internet on Android, not in Safari or
  Firefox (<https://caniuse.com/vibration>). iOS haptics need the native app (Core
  Haptics, <https://developer.apple.com/documentation/corehaptics>).
- Decoding a 3-minute stereo track at 48 kHz takes 69 MB of float samples *(computed)*.
  Music streams through an `<audio>` element instead.
- Music sources and their terms: incompetech, CC BY 4.0
  (<https://incompetech.com/music/royalty-free/faq.html>). Scott Buckley, who files
  automated claims on uncredited videos
  (<https://www.scottbuckley.com.au/library/faq/>). Free Music Archive, licences vary
  per track (<https://freemusicarchive.org/License_Guide>).

Taken: sound effects generated in code. Music original, commissioned or CC BY from
composers whose Content ID practice the owner accepts. Haptics as an enhancement only,
always paired with sound, a visual pulse and text (D15, D18 item 6).

## 9. Accessibility of the cues

- Each lock state has a colour, an icon, a map shape, text, a sound and a haptic, so no
  channel carries the meaning alone (D18 item 6).
- On the game's field colour `#0b1020`, Okabe-Ito sky blue `#56B4E9` and orange `#E69F00`
  reach 8.20:1 and 8.41:1 *(computed; the hex values were not verified against the
  palette's source page)*. At 35% opacity every planet colour drops under the 3:1 that
  meaningful graphics need
  (<https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html>), so the preview
  path and the target's orbit stay opaque.
- Reduced motion: no bloom pulses, no camera fly-to, no shake. The time map keeps the
  result and uses 0.6 of the time budget.

## 10. Licence, brand and governance

### Facts

- Apache-2.0 section 3 is a patent grant that ends for anyone who sues. Section 5
  settles inbound contributions. Section 6: "This License does not grant permission to
  use the trade names, trademarks" (<https://www.apache.org/licenses/LICENSE-2.0.txt>).
  Apache-2.0 code can go into GPLv3 projects but not GPLv2
  (<https://www.apache.org/licenses/GPL-compatibility.html>).
- GPL and the App Store: GNU Go was pulled in May 2010
  (<https://www.theregister.com/2010/05/27/gnu_go_fsf_apple_itunes/>). VLC was pulled in
  early 2011 and returned in 2013 under MPL-2.0
  (<https://images.videolan.org/press/ios2out.html>).
- The DCO is certified by a `Signed-off-by:` line (<https://developercertificate.org/>).
  The DCO app matches it to the author's email (<https://github.com/dcoapp/app>). The
  Linux kernel's guidance says agents must not add it
  (<https://raw.githubusercontent.com/torvalds/linux/master/Documentation/process/coding-assistants.rst>).
- Creative Commons recommends against CC licences for software
  (<https://creativecommons.org/faq/>). REUSE uses `LICENSES/`, `REUSE.toml` and
  `LicenseRef-` identifiers (<https://reuse.software/spec-3.3/>).
- `third_party/astlo/LICENSE` has an MIT layout with the permission paragraph missing.
  It grants no permission (D2).
- Every Starshot commit so far was authored as "Claude" with a co-author trailer
  (governance scout, `git shortlog`), so a licence change costs nothing today.
- The name: Breakthrough Starshot (<https://breakthroughinitiatives.org/initiative/3>), a
  1998 game "Starshot: Space Circus Fever"
  (<https://en.wikipedia.org/wiki/Starshot:_Space_Circus_Fever>), a studio at
  `starshot.games`, and an App Store app called "Starshot!" in Health and Fitness. No live
  STARSHOT mark in classes 9 or 41 was found, but the official databases refused the
  sandbox, so this is not a clearance.
- Registration fees: KIPI about KES 16,000 for two classes. USPTO US$350 per class.
  EUIPO EUR 850 for the first class (governance scout, section A7, with its sources).
- Contributor Covenant 3.0 is current, CC BY-SA 4.0
  (<https://www.contributor-covenant.org/version/3/0/code_of_conduct/>).

### Recommendation taken

Apache-2.0 for code, DCO without a CLA, CC BY 4.0 for original media, the name and logo
reserved under `TRADEMARK.md`, the REUSE layout, Contributor Covenant 3.0 (D12). Keep
the name with a qualified title and register the qualified domains (D20).

**What would change it:** wanting GPLv2 projects to reuse the code (then
`MIT OR Apache-2.0`). A clearance search finding a live class 9 or 41 STARSHOT mark.

## 11. Work tracking and the copy standard

### Facts

- Projects exist "at the user or organization level"
  (<https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects>).
  Sub-issues are generally available, up to 100 per parent
  (<https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/>).
  Issue types and issue fields are organisation features (register R13).
- Closing keywords act only when a PR merges into the default branch
  (<https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue>),
  so stacked PRs say `Part of #n` and the PR that reaches `main` says `Closes #n`.
- "`GITHUB_TOKEN` is scoped to the repository level and cannot access projects"
  (<https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions>).
  REST endpoints for user projects now exist
  (<https://docs.github.com/en/rest/projects/items>). GraphQL is blocked in these
  sessions (it answered 403), so `gh project` cannot run here.
- Issues are off on the fork, labels are GitHub's defaults plus `accessibility`, and there
  are no topics (REST, 2026-11-01).
- Copy findings on the tree of 2026-11-01, which PR0 fixes so its copy gate starts green:
  - em dashes at `docs/decisions.md:182` and `docs/game-design.md:105`;
  - en dashes in `docs/astlo-evaluation.md` (8 lines), `docs/plans/pr0-bootstrap.md:173`
    and `python/astlo/VERIFICATION.md` (12 lines);
  - rhetorical setups at `docs/game-design.md:4` and `docs/astlo-evaluation.md:46`;
  - "not just" at `docs/architecture.md:283` and `docs/astlo-evaluation.md:302` <!-- copy-ok: quoting a finding -->
  - "simply" at `README.md:47` and `docs/architecture.md:169` <!-- copy-ok: quoting a finding -->
  - exclamation marks in UI strings at `apps/game/src/ui/GameScreen.tsx:134,136` and
    `apps/game/src/ui/ResultOverlay.tsx:26,91`.
- Size: `apps/game/src/ui/GameScreen.tsx` is 1,025 lines with 52 React hook calls.
  `apps/game/src/styles.css` 1,324. `apps/game/src/render/draw.ts` 641. No gate checked
  size before PR0. ESLint is not used.

### Recommendation taken

Issues as code (`03-work.yaml`, a lock file and a REST sync run by the orchestrator), a
user-owned project with six fields and five views, `kind:epic` with sub-issues, status
comments at claim and completion (D23). The copy standard with a gate over Markdown, UI
strings, YAML templates, issue and PR bodies and commit messages (D27). A size gate that
warns at 300 code lines and fails at 500 with a shrinking baseline, god-component
heuristics, a layering check and a dependency licence allow-list (D28).

## 12. CI

### Facts

- zizmor 1.31.1, offline on a copy of `.github/`: 10 high findings (every action pinned
  by tag, not SHA), 2 medium (Dependabot without a cooldown), 1 secret outside an
  environment *(measured)*. GitHub: "Pin actions to a full-length commit SHA"
  (<https://docs.github.com/en/actions/reference/security/secure-use>).
- A workflow "skipped by path filtering" leaves required checks pending and blocks
  merging
  (<https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks>).
  An aggregator job keeps the required name `gates` stable when jobs are added.
- Merge queues need an organisation-owned public repository (register R14).
- Standard GitHub-hosted runners, including arm64 Linux and macOS, are free for public
  repositories (<https://docs.github.com/en/actions/reference/runners/github-hosted-runners>).
- Playwright in CI: install browsers with `--with-deps`. Caching them is not recommended
  (<https://playwright.dev/docs/ci>). `scripts/verify-game.mjs:4-6` says it is not a CI
  gate because CI installs no browsers.
- Dependabot's cooldown defaults to fewer than 7 days
  (<https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference>).
- The Pages site returned 404 on 2026-11-01: the owner's one-time setup is not done.

### Recommendation taken

PR1: SHA pins, `permissions: {}` at the top, an aggregator `gates`, zizmor, dependency
review, Scorecard, `verify-game` in CI feeding `gates`, Dependabot cooldown, annotations
and a job summary. PR4: PR text, commit messages and PR size. PR38: a custom release PR
from `[Unreleased]` rather than release-please or changesets. Stay on Dependabot rather
than Renovate (Renovate needs an app; its digest pinning is the one feature Dependabot
lacks, and SHA pins plus comments cover it).

## 13. Hosting and Firebase

### Facts

| | GitHub Pages | Firebase Hosting | Cloudflare static assets |
|---|---|---|---|
| Free transfer | 100 GB a month soft limit | 360 MB a day on Spark; US$0.15 per GB on Blaze | Free and unlimited |
| Headers | Fixed `max-age=600` observed | Full control in `firebase.json` | `_headers` file |
| Previews | None | Preview channels | Per branch |
| Edge in Africa | Fastly: Cape Town, Johannesburg, Lagos, Nairobi | Likely Fastly *(inference)* | 33 cities |

Sources: <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>,
<https://firebase.google.com/docs/hosting/usage-quotas-pricing>,
<https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/>,
<https://www.fastly.com/network-map/>, <https://www.cloudflare.com/network/>.

- The Firebase web configuration is safe to ship when the key's API list holds only
  Firebase APIs and no Generative Language API (<https://firebase.google.com/docs/projects/api-keys>).
- Previews through the official action need a service-account key. Workload Identity
  Federation "is not supported by Firebase Admin SDK", so the Hosting route with it
  needs a trial (<https://github.com/google-github-actions/auth>). Forks receive no
  secrets.
- Rules tests run in the emulator with `@firebase/rules-unit-testing`
  (<https://firebase.google.com/docs/rules/unit-tests>). App Check's debug token must
  never be committed (<https://firebase.google.com/docs/app-check/web/debug-provider>).
- Budgets alert but do not cap
  (<https://firebase.google.com/docs/hosting/usage-quotas-pricing>).
- COPPA defines a child as under 13 and allows a neutral age screen for mixed audiences
  (<https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312>). Kenya's Data
  Protection Act section 33 on children's data could not be loaded *(not verified)*.

### Recommendation taken

Firebase Hosting for production with a Pages mirror, previews for same-repository
branches, immutable caching for hashed assets (D21). Two Firebase projects on their own
billing account, deny-by-default rules tested in CI, App Check, restricted keys, no
Analytics, a per-player cooldown, the production web configuration committed in one
allow-listed file (D13). Anonymous accounts, display names from a list, no free text
(D22). Cloudflare is deferred with a trigger.

## 14. The domain

- `starshot.com`, `.net`, `.org`, `.app`, `.dev`, `.io` and `.games` are taken.
  `starshot.game` is free but costs about US$300 to US$340 every year. `starshot.online`
  costs US$4.99 then about US$28 a year (Radix and Porkbun pages, RDAP lookups via
  <https://rdap.org/>).
- `playstarshot.com` was free at about US$10.46 a year flat at Cloudflare (a third-party
  tracker of Cloudflare's prices; confirm in the cart) and `playstarshot.app` at US$8.20,
  then US$14.20.
- Cloudflare Registrar redacts WHOIS by default and offers one-click DNSSEC
  (<https://developers.cloudflare.com/registrar/>). Email Routing forwards custom
  addresses for free (<https://developers.cloudflare.com/email-routing/>). App links
  need a domain the project controls
  (<https://developer.apple.com/documentation/xcode/supporting-associated-domains>,
  <https://developer.android.com/training/app-links/verify-android-applinks>).

Taken: `playstarshot.com` and `playstarshot.app`, DNS on Cloudflare, forwarding addresses
(D20).

## 15. astlo and Mark

- The fixed astlo in `python/astlo/` gives sky positions within 0.055 degrees of JPL from
  Nairobi, a Moon within 2.32 degrees and a one-year N-body run with Earth within 178 km
  (`python/astlo/VERIFICATION.md`, sections 2 to 4).
- It is not for the game: all rights reserved (D2, D10). Its Moon is far coarser than a
  100 km rail. And a par or a hint must be flown by the game's own simulation (D6).
- Where it fits: a launch-window explorer (once `lamberts()` returns velocities), a
  sky-position reference, small-body propagation, planet content, and the shared
  `ephem.pack/1` and `ephem.validation/1` formats.

Taken: Mark hears now, with the fixes, the verification and a directions document
([../../astlo/directions.md](../../astlo/directions.md)). Astlo is a partner, never a
runtime dependency (D26).

## Measured numbers the plan relies on

| Quantity | Value | How | Used by |
|---|---|---|---|
| Cross-engine bit differences, wasm with `libm` | 0 of 252 flights (V8, JavaScriptCore, native x86_64) | Scratch Rust port, 2026-11-01 | D16, PR15 |
| Cross-engine bit differences, today's TypeScript | 23 of 252, up to 29 m | Same | D16 |
| Wasm speed against today's TypeScript | about 1.5 times faster | Same | D16 |
| Wasm kernel size | 15.2 KB gzip | Same | PR15 budget |
| Table 1 worst direction, Mars, 1950 to 2050 | 1.68 arcmin (budget 2) | Every 5 days against DE440 | R18, PR10 |
| Table 1 worst direction, Saturn, 2050 to 2150 | 27.3 arcmin (budget 15) | Same | D17 |
| Table 1 worst position, Jupiter, to 2050 | 1.86 million km | Same | D17 |
| Rails size at 100 km | 295 KB per century (planets), 528 KB with the Moon | Fitted to `de440s` | PR8 |
| Moon rail worst error at the 100 km tier | 54 km | Same | PR8 budget 150 km |
| Evaluation cost | 0.13 microseconds (rails), 0.38 (Table 1) | Node 22 | D17 |
| Escape from 200 km | 3.226 km/s | Computed | D18 |
| Starting budget | 3.55 km/s (1.1 times escape) | Computed | D18 |
| Literal budget's excess speed | 17.2 km/s | Computed | R7 |
| `u_SOI`: Moon, Mars, Venus, Jupiter, Saturn | 0.27, 0.27, 0.73, 1.62, 0.83 km/s | Computed | D18, PR24 |
| Worked progression's end | about 14.7 km/s | Computed | D18 |
| 1 g burn | 102 s per km/s | Computed | D18 |
| Impulsive error at 1 g, excess speed 6 km/s | under 1% | Integrated burn | D18 |
| Saturn shift from a 0.01 degree aim change after Jupiter | about 16.5 million km | Game simulator | D18 item 5 |
| Preview time, desktop Node | median 2 to 8 ms; slowest 30 to 45 ms | Game simulator | AC7 |
| three.js `WebGLRenderer` minimal scene | 134.5 KB gzip | esbuild | D19, AC9 |
| `WebGPURenderer`, R3F on top of React, Babylon.js | 222.2, about 248, 342.5 KB gzip | esbuild | D19 |
| Level 1 textures at 1k, KTX2 | 275 KB | Encoded | PR26 budget |
| Sixteen 2k textures in GPU memory | about 170 MiB (WebP) against about 21 MiB (KTX2) | Computed | D19 |
| Today's main bundle | 92 KB gzip | Built | AC9 |
| zizmor on today's workflows | 10 high, 2 medium | zizmor 1.31.1 offline | PR1 |

## Blind spots

The orchestrator's 27 notes, checked against the scout reports.

| # | Note (short) | Status after the research |
|---|---|---|
| 1 | "Starshot" collides with Breakthrough Starshot | Confirmed as a confusion risk; qualified title and domain (D20) |
| 2 | The brand needs a policy and later a registration | Settled: `TRADEMARK.md` now, registration before a store (D12, D20) |
| 3 | With massless fuel and 1 g, mass is flavour only | Overruled: fuel is impulse (D18, R8) |
| 4 | The literal 12.6 km/s budget buys a 9 km/s excess | Corrected: it buys 17.2 km/s (R7); the conclusion (gate the economy) stands |
| 5 | Huge budgets turn paths into straight lines | Confirmed; the chapter stays under about 15 km/s (D18 item 8) |
| 6 | The Moon needs a real ephemeris and a capture model | Settled by the Moon rail (D17) and capture at periapsis (D18) |
| 7 | Multi-flyby previews are chaotic | Confirmed (16.5 million km per 0.01 degree); one leg plus a ghost (D18 item 5) |
| 8 | Capture timing is unforgiving on a phone | Settled: the craft's computer times it (D18 item 4) |
| 9 | Colour alone cannot carry brake and boost | Settled: colour, icon, text, sound and haptic (D18 item 6) |
| 10 | Atmospheres, landings and moon impacts are out of scope | Settled for chapter one: periapsis floors, no aerobraking (D18 item 8) |
| 11 | Determinism across devices | Measured and settled by the Rust core (D16) |
| 12 | Which clock each mechanic uses | Settled: mission time for fuel delivery (D18 item 2) |
| 13 | No Vibration API on iOS Safari | Confirmed (<https://caniuse.com/vibration>); never the only cue |
| 14 | Audio needs a gesture first | Confirmed; the first pull is the gesture |
| 15 | Native builds need accounts, keys, labels and ratings | Confirmed; a later program (04-ops-checklist.md, T2) |
| 16 | Open source plus stores invites clones | Confirmed; the trademark policy is the defence (D12) |
| 17 | Low-end phones: memory, WebGL 2, data cost | Confirmed; KTX2 tiers and a 300 KB first load (D19) |
| 18 | Offline first; online features fail quietly | Settled (D13: the web game plays fully offline) |
| 19 | Issue types are organisation-only | Confirmed; labels and sub-issues (D23) |
| 20 | Agents may lack the Projects permission | Confirmed (GraphQL blocked); built-in workflows and REST (D23) |
| 21 | Two files over 1,000 lines | Confirmed; size gate and the GameScreen split (D28, PR2, PR3) |
| 22 | One copy standard for every kind of text | Settled (D27) |
| 23 | Mark's code without written permission must stay visible | Unchanged rules (D2, D10); contact now (D26) |
| 24 | Fork PRs get no secrets | Confirmed; previews for same-repository branches only (D21) |
| 25 | NASA no-endorsement rules; ESA share-alike and NC terms | Confirmed; no ESA website images, no NC data (D15) |
| 26 | Firebase's configuration is identifying, not secret | Confirmed with conditions (D13) |
| 27 | Analytics and consent | Settled: no Analytics, no identifiers beyond an anonymous id (D22) |

## Still not verified

These were outside the sandbox's reach. None blocks Band A or Band B. Each is assigned.

| Item | Why it matters | Who checks, when |
|---|---|---|
| The Yale Bright Star Catalogue's licence | Decides the star source (D15) | Band D planning, before PR27 |
| The Okabe-Ito hex values against the palette's source | The brake and boost colours | Band C planning, before PR21 |
| Kenya's Data Protection Act section 33 and the ODPC guidance | Confirms D22's age line holds | The owner, before PR31 |
| Whether the Firebase CLI accepts a federated credential for Hosting | Decides whether a dev-only key is needed | PR33's trial |
| Low-end phone numbers: KTX2 transcode time, frame time, preview time | The phone budgets of non-negotiable 6 | Bands C and D, on the owner's test phones |
| The arm64 bits of the `libm` crate | The one measurement that could weaken D16 | PR6's arm64 job |
| The official trademark databases | Name clearance | The owner, before any store submission (T1) |
