# Decision log

These are Starshot's binding decisions. Each one is cited by its number (D1, D2, ...)
in code comments, plans and pull requests.

**How this log works**

- A decision marked **Resolved** is settled. Do not reopen it in a pull request or a
  plan; build on it. If a decision seems wrong, open an issue that explains why. Only
  the owner reopens a decision.
- Entries are append-only. A change of mind is a **new** entry that names the one it
  supersedes; the old entry stays, marked "Superseded by D#".
- **Source** says where a decision came from: the owner's instruction, the project
  brief that set up the bootstrap, a fact (such as a licence), or a *(judgment)* call
  made while building, which the owner may revisit later through a new entry.
- Loosening an accuracy budget, changing a licence position or adding a hosted service
  always needs a new entry.

---

## D1. Starshot is a fork of Mark's repository; his files live unchanged in `third_party/astlo`

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** owner instruction.

**Superseded in part by D36.** Starshot is now a standalone GitHub repository.
D1's requirements to preserve the inherited history, attribution and pristine
`third_party/astlo` mirror remain.

**Decision.** Fork of Mark's repo by owner instruction; Mark's files live unchanged in
`third_party/astlo`.

**Why.** The owner asked for Starshot to live in a fork of
[iamnothimbutwe/astlopublic](https://github.com/iamnothimbutwe/astlopublic), which
keeps Mark's history and makes the project's origin visible. Moving his files into one
folder keeps them intact and clearly separated from Starshot's own code.

**Consequences.** The repository's `main` branch carries Mark's commits, followed by
Starshot's. His README, licence, assets and wheels are under `third_party/astlo/`,
byte-for-byte as published.

---

## D2. Mark's code is all rights reserved: never modified, copied or relicensed here

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** fact (astlo's licence terms).
**Revised by [D10](#d10-astlo-fixes-are-made-here-first-in-pythonastlo-shared-pending-marks-permission)
(2026-11-01, the owner's call).** `third_party/astlo` keeps every rule below. What D10
changes: Mark's v12 source, with Starshot's fixes, now also lives in `python/astlo/`
(still his rights, never relicensed), and the fixes are shown to him once Starshot is
finished instead of being sent privately as patches. The original text stays as decided.

**Decision.** Mark's code is all-rights-reserved: never modified/copied/relicensed
here. Fixes go to Mark privately as a patch until he grants a licence. A guard verifies
`third_party` hashes.

**Why.** astlo's licence and file headers reserve all rights: copying, modification and
distribution need Mark's written permission. The fork exists by his goodwill, and one
copied line would break both that trust and his licence.

**How it is enforced.**

- `third_party/astlo.sha256` records the hash of every file;
  `scripts/check-third-party-untouched.mjs` (the `third-party` gate) fails on any change.
- A Claude Code hook (`scripts/agent/guard-protected-paths.sh`) refuses edits under
  `third_party/`.
- Upstream syncs and private patches follow `.claude/skills/astlo-upstream/SKILL.md`.

---

## D3. Starshot's own code is MIT-licensed

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** project brief.
**Superseded by [D12](#d12-code-licence-apache-20-with-dco-cc-by-40-assets-and-a-trademark-policy) (2026-11-01, the owner's call).**

**Decision.** Starshot's own code: MIT licence (permissive; does not affect the owner's
private projects).

**Why.** MIT lets anyone use, change and share the game and packages, including
commercially, with very little paperwork. It covers only this repository: it grants
nothing over, and places no obligation on, any other project the owner has.

**Consequences.** `LICENSE` holds the MIT text; `NOTICE.md` explains that
`third_party/astlo/**` is excluded. Every `package.json` declares `"license": "MIT"`.

**Note (2026-11-01, following [D10](#d10-astlo-fixes-are-made-here-first-in-pythonastlo-shared-pending-marks-permission)).**
`python/astlo/astlo/**` and `python/astlo/astlo-*.dist-info/**` are also excluded from
the MIT licence: they are Mark's astlo source and metadata with Starshot's fixes, under
his terms. Starshot's own files beside them in `python/astlo/` (its README,
`VERIFICATION.md`, `build_wheel.py`, `bench/`, `tests/`) are MIT. `NOTICE.md` lists both
exclusions. The decision above is unchanged.

---

## D4. Planet positions come from JPL's Table 1, validated against Horizons; astlo data only after a gate

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** project brief, backed by a fact (the astlo evaluation).
**Superseded in part by [D17](#d17-positions-come-from-de440-derived-rails-validated-against-jpl) (2026-11-01, the owner's call).**

**Decision.** Positions come from the JPL Table 1 TypeScript ephemeris, validated
against Horizons. astlo data may be used only after it passes a validation gate
(direction error vs JPL).

**Why.** NASA/JPL's "Keplerian Elements for Approximate Positions of the Major Planets"
(Table 1, valid 1800 to 2050) is public, tiny and accurate enough for a game and a map.
The [astlo evaluation](astlo-evaluation.md) found that astlo's published build puts
some planets in the wrong direction (Earth about 24 degrees off) even though its
distances from the Sun look right, so a direction check is the gate that matters.

**How it is enforced.** `packages/ephemeris/test/ephemeris.test.ts` compares every
planet with NASA/JPL Horizons at five dates (1977 to 2049) against per-planet budgets in
arcminutes. Any future astlo data must pass the same direction check, per body, before
it is used (method: `.claude/skills/astlo-upstream/reference.md`), and also needs a
licence from Mark that allows it (D2).

---

## D5. Stack: TypeScript monorepo, Vite + React, Canvas 2D; three.js later for a 3D map

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** *(judgment)*.
**Superseded in part by [D16](#d16-one-rust-core-adopted-now-without-a-staged-cut-over) and [D19](#d19-the-game-renders-with-threejs-on-webgl-2-presenting-as-2d-first) (2026-11-01, the owner's call).**

**Decision.** Stack: TypeScript, npm workspaces monorepo, Vite + React, Canvas 2D for
the game prototype; three.js/R3F reserved for a future 3D map app (`apps/orrery`, not
now).

**Why.** A 60 fps slingshot has to run its physics on the player's phone, so the engine
is TypeScript in the browser. npm workspaces let the game and the reusable packages
live and be tested together without extra tooling. Canvas 2D is light, fast to load and
enough for a top-down game. three.js with React Three Fiber (R3F) is the natural choice
for a 3D map of the Solar System, but it is heavy, so it waits for the app that needs
it.

**Consequences.** `apps/game` (Vite + React + Canvas 2D), `packages/ephemeris` and
`packages/physics`. A future `apps/orrery` reuses the same packages.

---

## D6. Game physics is 2D, with a patched-conic departure, and the preview equals the launch

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** partly *(judgment)*: the flat world and the departure model are judgment
calls; "preview equals launch" is a product rule from the project brief.

**Decision.** Game physics is 2D: `createEphemeris({flatten:true})`; patched-conic
Earth departure (`departFrom:'earth'`); preview and actual launch use IDENTICAL
`simulate` settings so what you see is what you get.

**Why.**

- *Flat (judgment).* A slingshot aimed on a flat screen cannot aim up or down. Real
  orbits are tilted by up to 7 degrees, so a perfectly aimed 2D shot could pass above or
  below its target. Flattening every orbit onto the ecliptic plane keeps aiming honest.
  The packages still work in full 3D for future apps.
- *Patched-conic departure (judgment).* The climb out of Earth's gravity takes less
  than a day of a months-long flight. The probe therefore starts at Earth's centre with
  Earth's velocity plus the launch speed, and Earth's pull is switched on once the
  probe is clear. This keeps the game's aim consistent with real launch-window maths.
- *Identical settings (product rule).* If the dotted preview and the real flight used
  different settings, a shot that looked perfect could miss. Both go through one
  function with one frozen settings object.

**How it is enforced.** `SIM_SETTINGS` and `simulateShot` in
`apps/game/src/sim/shot.ts` are the only path from an aim to a flight; the physics
worker (`apps/game/src/sim/sim.worker.ts`) uses them for both previews and launches.

**Note (2026-11-01): a clarification, not a reversal.** The settings are frozen **per
level**, not one object for the whole game. Each level carries its own frozen
`SimSettings` (`Level.sim` in `apps/game/src/levels.ts`): `SIM_SETTINGS` for the
campaign and the inner-planet sandbox, `OUTER_SIM_SETTINGS` for sandbox targets beyond
Mars (5 to 14 year flights). The level's settings travel inside every `ShotRequest`
(`sim`), and `simulateShot` is still the only path from an aim to a flight, so a level's
preview and its launch remain identical; so do the hint search and the level tests,
which build their requests the same way (`shotRequestFor`, `hintQueryFor`).

---

## D7. Hosting: GitHub Pages, fully static, no backend, no secrets

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** project brief.
**Revised by [D13](#d13-online-features-from-the-first-release-on-firebase) and [D21](#d21-hosting-firebase-hosting-with-a-github-pages-mirror) (2026-11-01, the owner's call).**

**Decision.** Hosting: GitHub Pages via GitHub Actions; fully static; no backend, no
secrets, no Firebase. A future leaderboard would use a separate, Starshot-only Firebase
project with config injected at build time from repo Variables, never any private
project's config.

**Why.** Pages is free for public repositories, needs no server, and deploys straight
from this repository. With nothing secret in the build, there is nothing to leak.
Keeping any future online feature in its own project means a mistake in Starshot can
never reach the owner's other work.

**Consequences.** `.github/workflows/pages.yml` builds and deploys on every push to
`main`. The `secrets` gate rejects Firebase-style configuration in files. Setup steps
and the future leaderboard plan are in [hosting.md](hosting.md).

---

## D8. The bootstrap ships as one pull request with layered commits

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** *(judgment: new repository)*.

**Decision.** This bootstrap ships as ONE PR with layered commits (judgment: new repo);
later work follows stacked PRs per the Kobe loop.

**Why.** The repository starts empty of Starshot code, so there is no existing work to
stack on, and the packages, game, harness and docs only make sense together (the gates
check all of them at once). Layered commits keep the single pull request reviewable
piece by piece.

**Consequences.** Branch `starshot/pr0-bootstrap` targets `main`. Every later change
follows the stacked-PR rule in `AGENTS.md`. The record of this PR is
[plans/pr0-bootstrap.md](plans/pr0-bootstrap.md).

---

## D9. The Kobe loop is adopted

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** project brief.

**Decision.** Kobe loop adopted: `AGENTS.md` canonical core, `CLAUDE.md` pointer, roster
in `.claude/agents`, rubrics, skills, hooks, deterministic gate registry.

**Why.** Starshot is built largely by AI agents in a public repository. A single
working agreement, a fixed roster of roles, written review rubrics, and checks that
are scripts (not good intentions) keep changes honest, reviewable and safe to publish.

**Consequences.**

- `AGENTS.md` is the one canonical agreement; `CLAUDE.md` and
  `.github/copilot-instructions.md` only point to it (the `instruction-dedup` gate
  enforces this).
- Roles live in `.claude/agents/`, review rubrics in `.claude/rubrics/`, skills in
  `.claude/skills/`, hooks in `.claude/settings.json` and `scripts/agent/`.
- Every check is registered in `scripts/gates.mjs` and run by `npm run gates`, locally
  and in CI.

---

## D10. astlo fixes are made here first, in `python/astlo`, shared pending Mark's permission

**Revised by [D26](#d26-mark-macharia-hears-from-the-owner-now-astlo-is-a-partner-not-a-dependency) (2026-11-01, the owner's call): the owner contacts Mark now rather than after chapter one.**

**Resolved 2026-11-01. The owner's call. Do not re-litigate.**
**Source:** owner instruction. Revises D2 (the `third_party/astlo` rules are unchanged).

**Decision.** The owner wants the astlo fixes made in this repository first, packaged,
and shown to Mark once Starshot is finished. The owner expects Mark to allow it and
accepts the risk. Therefore:

- `python/astlo/` holds Mark's astlo v12 source plus Starshot's fixes, each fix a
  reviewable commit, shared in good faith pending Mark's written permission.
- Mark keeps all rights to his code. It is **not** under Starshot's MIT licence, and it
  keeps his copyright headers.
- `third_party/astlo/` stays the pristine, hash-pinned upstream reference (D1, D2).
- Starshot's TypeScript packages and game never copy astlo code and do not depend on
  astlo (D4 is unchanged).
- If Mark objects, `python/astlo/` is removed.
- Nothing has been offered to Mark yet; the owner shows him the work when Starshot is
  finished. Any draft message to him stays outside this repository.

**Why.** The owner's call. Each fix is a separate commit with its evidence against
NASA/JPL, so Mark can review, take or drop each one, and the packaged wheel shows that
together they work. The owner expects Mark to allow it, and accepts the risk of
publishing changed copies of all-rights-reserved code before his written permission.

**The risk, stated plainly.** astlo's licence reserves copying, modification and
distribution. Removing `python/astlo/` later takes it off the branch, but not out of git
history or out of forks and clones already made, and GitHub does not allow a fork of a
public repository to be made private.

**How it is enforced.**

- [`python/astlo/README.md`](../python/astlo/README.md) and [NOTICE.md](../NOTICE.md)
  state the licence status; Mark's headers and metadata stay as he wrote them.
- The import commit is his wheel's contents byte for byte; every later commit under
  `python/astlo/astlo` is one fix, measured in
  [`python/astlo/VERIFICATION.md`](../python/astlo/VERIFICATION.md).
- `.github/workflows/astlo.yml` builds the wheel, tests it offline against NASA/JPL
  Horizons fixtures, and keeps it as the workflow artifact `astlo-fixed-wheel`. It is
  not published to PyPI or as a release.
- The `secrets` gate skips only its email rule, and only in Mark's files
  (`python/astlo/astlo/` and `python/astlo/astlo-*.dist-info/`), where his published
  contact addresses are upstream content.
- Fixes, rebases onto a new upstream release, and the removal if Mark objects follow
  `.claude/skills/astlo-upstream/SKILL.md`.

## D11. The Mars-window physics test asserts a near miss of the two-body aim

**Clarified 2026-11-01 ([register row R29](plans/v1-starshot/02-disagreement-register.md), [deviation row 9](plans/v1-starshot/05-deviation-log.md)): the 326 days below is the node of the test's 3-day grid; on a 1-day grid the Lambert minimum is 323 days at the same 2.982 km/s. The threshold and the test are unchanged.**

*Date:* 2026-11-01. *Source:* orchestrator (judgment), under the owner's standing
instruction not to block on small calls. Revisit if the owner disagrees.

**Decision.** `packages/physics/test/physics.test.ts` ("reaches Mars' sphere of
influence on the 2026 window with the Lambert aim") asserts that the cheapest two-body
Lambert aim, flown through the full simulator with every planet pulling, passes within
**1.25** Mars spheres of influence. It used to assert that the flight enters the sphere.

**Why.** Fixing `lambert()` for long transfers let it find the window's true two-body
minimum (launch 2026-11-02, 326 days, v-infinity 2.982 km/s). The other planets' pull
deflects that aim to a 1.135-sphere near miss. That is physics, not a regression, and the
game's hint closes the gap with the simulator itself. The test still fails loudly if the
aim drifts: 1.25 leaves about 10% headroom over the measured miss. This is a behaviour
test of the Lambert-to-simulator hand-off, not one of the Horizons accuracy budgets in
`packages/ephemeris/test`, which are unchanged.

---

## D12. Code licence: Apache-2.0, with DCO, CC BY 4.0 assets and a trademark policy

*Date:* 2026-11-01. *Source:* owner's ruling (supersedes the MIT choice in D3; D3's
scoping of Mark's files stays).

**Decision.** Starshot's own code is licensed Apache-2.0. Original art, audio and
screenshots are CC BY 4.0, credited in `CREDITS.md`. The name "Starshot", the logo and the
icon are all rights reserved, with permitted uses set out in `TRADEMARK.md`. Contributions
need a Developer Certificate of Origin sign-off (no contributor licence agreement). The
repository uses the REUSE layout (`LICENSES/`, `REUSE.toml`) with `LicenseRef-astlo` for
Mark Macharia's files and `LicenseRef-starshot-brand` for brand files.

**Why.** Apache-2.0 adds a patent grant from every contributor that ends for anyone who
sues, says in section 6 that the name is not licensed with the code, and settles inbound
contribution terms in section 5. The switch costs nothing today because every Starshot
commit is the owner's own work. Copyleft licences were rejected: GPL has a history of
removals from the Apple App Store, and the real threat to the project is a confusingly
named clone, which a trademark policy addresses and a code licence cannot.

**Consequences.** `LICENSE` holds the Apache-2.0 text; the four `package.json` files say
`Apache-2.0`; `NOTICE.md`, `README.md` and `CONTRIBUTING.md` are updated; nothing changes
for `third_party/astlo/**`, `python/astlo/astlo/**` or its `.dist-info` (D2, D10).

**How it is enforced.** The DCO GitHub app on every pull request; a licence gate that fails
when a shipped file has no licence record; the trademark policy quoted in `README.md`.

---

## D13. Online features from the first release, on Firebase

*Date:* 2026-11-01. *Source:* owner's ruling (revises the "no Firebase, Variables only"
part of D7; D7's rule that no private project's configuration ever appears here stands).

**Decision.** The first public release includes anonymous accounts and a leaderboard, on
Firebase under the owner's personal Google account, with server-side replay verification
that runs the same simulation core as the client. The web game plays fully offline without
any of it. Two Firebase projects, development and production, each with its own budget and
alerts and both on a billing account used by nothing else; a `demo-` project for the
emulator suite locally and in CI. Protections, in this order: Security Rules that deny by
default and are tested in CI; App Check (reCAPTCHA Enterprise on the web, App Attest and
Play Integrity in the native apps, a debug token held only as a CI secret); API key
restrictions to Firebase APIs and the game's domains; no Analytics link; a per-player write
cooldown. The production web configuration (apiKey, authDomain, projectId, appId) is
committed in one allow-listed file, because Firebase documents it as an identifier rather
than a secret and the protections above are what make that true; local development
defaults to the emulator, and preview builds use the development project through a
build-time variable.

**Why.** The owner wants to publish with Firebase and to share scores early; the scouts
confirmed the configuration is safe to ship under the listed conditions.

**Consequences.** Service-account keys, Admin SDK credentials, `.env` files, App Check debug
tokens and any Gemini key are never committed. The `secrets` gate allow-lists exactly one
configuration file and keeps rejecting Firebase configuration anywhere else.

---

## D14. Free and open, with no advertising or purchases

*Date:* 2026-11-01. *Source:* owner's ruling.

**Decision.** Starshot is free to play on every platform. No advertising, no in-app
purchases, no paid edition. Donations or sponsorship may be accepted later without
changing the game. Because the licence invites commercial reuse by others, assets under
non-commercial licences are not used.

**Why.** Simplest privacy and store compliance, no anti-cheat pressure beyond fairness, and
a clear position for contributors.

---

## D15. Art, sound and music come from real imagery and open licences

*Date:* 2026-11-01. *Source:* owner's ruling.

**Decision.** Planets and the Sun use real imagery: the Solar System Scope set (CC BY 4.0)
as the base, NASA's Scientific Visualization Studio Moon kit, NASA SDO for the Sun, and
NASA and JPL imagery for cards. Stars come from a catalogue with a permissive licence (the
Yale Bright Star Catalogue if its terms are confirmed, otherwise the HYG database as a
separately licensed CC BY-SA data file). No Gaia-derived data (CC BY-NC), no ESA website
images, no planetary maps whose author asks that copies not be hosted. Sound effects are
generated in code. Music is original, commissioned, or CC BY from composers whose
Content ID practice the owner accepts. Every shipped asset has a manifest entry with its
source, licence, attribution and hash; `CREDITS.md` and the in-game credits are generated
from it. AI-generated assets are not planned; using one would need a new decision.

**Why.** The owner chose real imagery with CC or original music; NC terms conflict with
D12 and D14.

---

## D16. One Rust core, adopted now, without a staged cut-over

*Date:* 2026-11-01. *Source:* owner's ruling (supersedes the engine-language and layout
parts of D5).

**Decision.** The simulation, ephemeris evaluation, game rules, scoring, hint search and
replay format live in one Rust core under `crates/`: `starshot-math` (the only place
transcendental functions live, through the `libm` crate), `starshot-ephemeris`,
`starshot-physics`, `starshot-game`, and thin binding crates `starshot-wasm` (wasm-bindgen)
and `starshot-ffi` (UniFFI, when the native apps start). The web worker loads the wasm
through a typed wrapper in `packages/core-wasm`; the replay-verification function on the
server runs the same `.wasm` file the web shipped. No staged release with two engines: the
TypeScript packages are the conformance oracle and are retired in the same program once
the wasm passes every existing Horizons, physics and level test and gives identical bits
across V8, JavaScriptCore and native. Replays carry canonical inputs (level id, launch
day, aim as exact bits) and a `physicsVersion`.

**Why.** Measured: the Rust core with a software maths library gave identical bits on
every runtime tested (0 of 252 flights differed) where today's TypeScript differs between
browser engines on 23 of 252 flights; wasm ran about 1.5 times faster; the native apps
need a compiled core anyway. The owner ruled that nothing is live, so no dual-engine
release is needed.

**Consequences.** Changing physics needs the Rust toolchain; binding crates are pinned and
upgraded deliberately; no `mul_add`, fast-math flags, relaxed SIMD or threads inside the
simulation; `#![forbid(unsafe_code)]` in logic crates; an arm64 CI job proves the mobile
builds match the wasm bits before scores from them are accepted; the worker protocol does
not change.

---

## D17. Positions come from DE440-derived rails, validated against JPL

*Date:* 2026-11-01. *Source:* owner's ruling (supersedes the "Table 1" naming in D4; D4's
rule that data enters only through a validation gate stands).

**Decision.** A Python tool at `tools/ephem/` (pyproject with a locked `uv.lock`, jplephem)
generates Chebyshev rails from NASA's `de440s.bsp` for the eight planets (Sun-relative,
ecliptic J2000, km) and the geocentric Moon at a 100 km tolerance (test budget 150 km),
packed per decade and committed with an `ephem.validation/1` report. Earth's centre is
derived from the Earth-Moon barycentre and the Moon. Table 1 stays as the fallback and as
an independent cross-check in tests. Small bodies get per-level rails fitted to Horizons
vectors; major moons come later from the satellite kernels. Stars are a curated table with
per-star sources. Horizons is never called at runtime; fixtures record the API signature,
the ephemeris source and the fetch date. Derived files name Starshot as the last modifier,
as NAIF's rules require.

**Why.** Table 1 has no Moon, degrades after 2050 (Saturn 27 arcminutes) and places Jupiter
up to 1.86 million km from DE440; rails cost about 530 KB per century for planets and
Moon, 6 to 11 KB per level, evaluate with adds and multiplies only (identical in every
engine) and run faster than Table 1.

---

## D18. Flight model and progression economy for chapter one

*Date:* 2026-11-01. *Source:* owner's rulings on the budget, the unlock rule and mass;
the rest (judgment) by the orchestrator from the gameplay research, to be tuned by the
prototypes named in the plan. Chapter one keeps the flattened world of D6; the 3D chapter
gets its own decision.

**Decision.**
1. The fuel budget is delta-v burned from a 200 km parking orbit. Fuel is impulse: the
   starting tank holds `J0 = 700 kg x 3.55 km/s`, so the 700 kg collector probe starts
   with 3.55 km/s (escape plus a 10% reserve) and the 1,000 kg crewed craft with 0.7 times
   that. The HUD shows km/s for the craft on the pad. Lighter craft go farther.
2. Unlocks: first entry into a body's sphere of influence adds `u = sqrt(GM / r_SOI)` to
   the tank permanently; a collector left in a stable orbit adds `2u` more, credited when
   its beam reaches Earth on mission time (light time plus a collection period). A stable
   orbit has periapsis above the body's safe altitude and apoapsis inside 0.49 Hill radii.
   The close solar orbit at 20 solar radii ends chapter one with a chapter reward.
3. Flight physics stays impulsive at the patched-conic boundary. The 1 g burn is drawn
   around Earth from the same request and its real loss is charged from a precomputed
   table; 2 g unlocks after a Jupiter flyby and 3 g after Saturn, as pacing.
4. "Capture" means a loose capture at periapsis. The craft's computer times the burn at
   periapsis; the hold sets only the amount, with detents at "captured" and "planned
   orbit" and a soft floor at circular. Too little becomes a slower flyby; a crash is only
   ever deliberate.
5. Previews lock to the next sphere of influence, show the flyby inside it analytically
   and one faded ghost leg; aim assist snaps to flybys that lead to the target; the next
   leg is aimed in flight.
6. Each lock state has a colour (Okabe-Ito sky blue for brake, orange for boost), an icon,
   text, a sound and a haptic, so no channel carries the meaning alone.
7. Time: an event-anchored time map gives every launch about 4 to 8 s of player time,
   eased in log space, slowing into burns and encounters; reduced motion uses 0.6 of the
   budget without changing the result.
8. Chapter one is one-way for crews; no aerobraking (periapsis floors); the economy stays
   under about 15 km/s from the parking orbit so launch windows keep mattering.

**Why.** The literal budget (surface to orbit plus escape, spent from orbit) buys a 17 km/s
hyperbolic excess and reaches a 0.1 AU solar dive on level one. The unlock rule rewards
deep gravity wells and keeps the chapter inside the regime where slingshots matter.

---

## D19. The game renders with three.js on WebGL 2, presenting as 2D first

*Date:* 2026-11-01. *Source:* owner's vision (3D presenting as 2D, real imagery), the
renderer choice (judgment) from the visuals research. Supersedes the Canvas 2D and
"three.js only for the orrery" parts of D5.

**Decision.** three.js (r187 line) `WebGLRenderer` with imperative scene code owned by the
game; React keeps the UI and DOM labels; rendering stays on the main thread and physics in
its worker. Positions are converted camera-relative from float64 to float32 every frame.
Distances stay linear; body sizes are exaggerated with a visible badge, a scale bar and a
true-size toggle; textured planets appear in close-ups, cards and the map above a minimum
radius. Shaders are small self-contained materials that can move to TSL later. Canvas 2D
stays as the fallback for devices without WebGL 2 and as the accessibility reference.
Textures ship as KTX2 (ETC1S for colour, UASTC for normals) in 512, 1k and 2k tiers with
an optional 4k download and a WebP fallback; the first load stays under about 300 KB
before textures. No full-screen bloom on the low tier.

**Why.** Measured bundle floors: three.js WebGL 135 KB gzipped against 222 KB for the
WebGPU renderer and 343 KB for Babylon; most target phones run WebGL 2 anyway. Sixteen 2k
textures take about 170 MiB of GPU memory as WebP and about 21 MiB as KTX2.

---

## D20. The name stays Starshot; the domain is playstarshot.com

*Date:* 2026-11-01. *Source:* owner's ruling.

**Decision.** The game stays "Starshot". The owner registers `playstarshot.com` and
`playstarshot.app` at Cloudflare Registrar in the owner's own account (auto-renew,
two-factor authentication, registrar lock, privacy and DNSSEC on). Titles on the web and
in the stores carry a qualifier such as "Starshot: the orbital slingshot game" to stay
distinct from Starshot Games and Breakthrough Starshot. Before any store submission the
owner runs the manual trademark searches (USPTO, EUIPO, WIPO, KIPI) and considers a KIPI
filing in classes 9 and 41. `TRADEMARK.md` states the policy now.

**Why.** Bare `starshot` is taken on every mainstream domain; `.game` renews at about
$340 a year; `playstarshot.com` renews at about $10. The qualified name reads as one
product rather than a claim on the word.

---

## D21. Hosting: Firebase Hosting with a GitHub Pages mirror

*Date:* 2026-11-01. *Source:* owner's ruling (revises D7's "GitHub Pages only").

**Decision.** Production is served by Firebase Hosting from the production project on the
custom domain, deployed from CI on merges to `main`; preview channels on the development
project for branches of this repository (forks get a downloadable build artifact instead,
because they receive no credentials). GitHub Pages keeps building the same bundle as a
mirror that any fork can reproduce. Hashed assets are served immutable, the app shell and
service worker with `no-cache`; textures are hashed and cached with a budget. Static assets
move to another CDN only if bandwidth cost or latency in Africa measured in production
says so.

**Why.** One console with the backend, preview deploys, and the owner's familiarity;
the pay-as-you-go plan the leaderboard needs anyway charges about $0.15 per GB beyond the
free 10 GB a month, which a budget alert watches.

---

## D22. Audience and privacy

*Date:* 2026-11-01. *Source:* owner's ruling.

**Decision.** The game is for teens and adults (13 and up); store ratings follow. Accounts
are anonymous; display names come from a filtered list; no free text, no email, no
analytics, no advertising identifiers. Anyone can play offline without an account. The
leaderboard stores an anonymous id, the chosen display name and the shot.

**Why.** Keeps the project outside child-specific consent rules in the United States and
Kenya while remaining usable by younger players offline.

---

## D23. Work is tracked with GitHub issues, sub-issues and one project board

*Date:* 2026-11-01. *Source:* owner's ruling (repository stays under the personal account
for now) and the process research.

**Decision.** The repository stays under the owner's personal account; moving to an
organization is a later decision. GitHub Issues are turned on. Epics are parent issues
labelled `kind:epic` with sub-issues (issue types are an organization feature and are not
used). One user-owned Project with fields Status, Priority, Size, Area, Actor and Chapter,
the built-in automations, and the views named in the plan. Issues are code: each program
has `docs/plans/<program>/work.yaml` and `work.lock.json`, and `scripts/sync-work.mjs`
(REST only, dry run by default) creates and updates labels, milestones, issues and
sub-issue links; the orchestrator runs it, never a builder and never CI with a personal
token. Conventions: every pull request names its issue (`Part of #n` inside a stack,
`Closes #n` where the work reaches `main`); a status comment at claim and at completion;
agents take only `agent-ready` issues; outside contributors claim by comment.

**Why.** Works on a personal repository without GraphQL (blocked in these sessions) and
without any token beyond the repository's own; keeps the plan and the board in step.

---

## D24. Agent commits are authored by the owner, with the agent as co-author

*Date:* 2026-11-01. *Source:* owner's ruling.

**Decision.** Commits made by agents on the owner's behalf are authored as
`Harmon Amakobe <73005556+harmon-amakobe@users.noreply.github.com>`, carry
`Signed-off-by:` from the owner (the owner directs the work, reviews it and takes
responsibility for the certificate of origin; the orchestrator's publish step adds the
line under this standing instruction), and carry a `Co-Authored-By:` trailer naming the
agent and the session link. The DCO check applies to every pull request. Agents never
add a sign-off for anyone else.

**Why.** The DCO app matches the sign-off to the commit author, only a person can certify
origin, and the owner is the person submitting agent-written work.

---

## D25. Solo with agents until chapter one is playable

*Date:* 2026-11-01. *Source:* owner's ruling.
**Superseded in part by [D30](#d30-specs-build-in-groups-two-or-three-a-session-with-one-master-review-at-the-end) (2026-11-01, the owner's call): pull request sizing.**

**Decision.** The owner builds with agents and does not promote the project or recruit
contributors until chapter one is playable. Governance files, templates, labels and the
copy gate ship now so the door is ready; `good first issue` labels wait. Pull requests are
sized for one reviewer.

---

## D26. Mark Macharia hears from the owner now; astlo is a partner, not a dependency

*Date:* 2026-11-01. *Source:* owner's ruling.

**Decision.** The owner contacts Mark now with the fixes in `python/astlo`, the
verification, and the technical "directions for astlo" document kept at
`docs/astlo/directions.md`. astlo is an authoring and education partner: a sky-position
reference, a launch-window explorer once its Lambert solver works, a small-body
propagator, and planet content; it is never a runtime dependency of the game. The shared
`ephem.pack/1` and `ephem.validation/1` formats are the interface between the projects.
Mark is credited in `README.md`, `NOTICE.md` and the game's credits with the name and
handle he chooses. The personal message itself stays outside the repository.

---

## D27. The copy standard and its gate

*Date:* 2026-11-01. *Source:* owner's ruling (em dashes banned everywhere; no AI tells).

**Decision.** All prose and UI text follows the copy standard in `docs/copy-standard.md`:
sentence case; short sentences; concrete nouns and numbers; no hype adjectives, filler
adverbs, reflexive groups of three, rhetorical setups or chatbot residue; no emoji in
docs, issues, pull requests or commits. The em dash (U+2014), the en dash (U+2013) and
the horizontal bar (U+2015) are hard failures everywhere. `scripts/check-copy-tells.mjs`
scans Markdown, UI strings in TypeScript and TSX (through the TypeScript parser, skipping
comments), YAML templates and, through `--stdin`, issue and pull request bodies (a
workflow) and commit messages (CI and the publish step). Exemptions: Mark's files,
fixtures, lockfiles, the catalogue itself, code blocks, and lines carrying
`copy-ok: <reason>`. Typographic fixes to resolved decision entries are allowed; their
meaning is not changed.

---

## D28. Size and shape gates for maintainability

*Date:* 2026-11-01. *Source:* owner's ruling (no god components, checked always).

**Decision.** `scripts/check-file-size.mjs` warns above 300 code lines and fails above 500
for `.ts`, `.tsx`, `.rs`, `.mjs` and `.css` files, with a baseline file that may only
shrink (starting with `apps/game/src/ui/GameScreen.tsx`, `apps/game/src/styles.css` and
`apps/game/src/render/draw.ts`). God-component heuristics (hook calls, state variables,
props, cross-area imports) warn. A layering check keeps `packages/` from importing
`apps/`, and anything from importing `python/` or `third_party/`. A dependency licence
allow-list runs over the lockfiles. Splitting `GameScreen.tsx` is an early pull request
of the program.

---

## D29. astlo changes are made here first, offered upstream, and pulled back from upstream once adopted

*Date:* 2026-11-01. *Source:* owner's ruling.

**Decision.** Every change to astlo is made in `python/astlo` in this repository first,
one topic per commit, verified against NASA/JPL. When a set of changes is ready (at the
latest when chapter one is done), a report and a patch series derived from those commits
are offered to Mark Macharia as pull requests against his repository, containing astlo
changes only and nothing of Starshot. If Mark adopts a change, Starshot consumes astlo
from his repository or his PyPI release and drops its own copy of that change, so
`python/astlo` shrinks towards a pin plus tests rather than a permanent fork. Mark
develops on a phone and, as far as his public history shows, without AI assistance, so
nothing in the plan assumes he will rewrite anything in Rust. The Rust core stays
Starshot's; its ephemeris and topocentric parts are kept dependency-free with a stable
interface so that Starshot can maintain them as a crate beside his Python, with Python
bindings as an option, if he wants that. Build-time tooling may depend on astlo once it
is licensed and validated; the game's runtime never does (D26).

**Why.** The owner's call: avoid a permanent fork of astlo, give Mark changes he can take
piecemeal, and let both projects grow together.

**How it is enforced.** The `astlo-upstream` skill, the upstream kit of PR40, and the
licence gate keeping `python/astlo/astlo` under `LicenseRef-astlo`.

---

## D30. Specs build in groups, two or three a session, with one master review at the end

*Date:* 2026-11-01. *Source:* owner's ruling (supersedes D25's sizing of pull requests
for one reviewer).

**Superseded in part by [D40](#d40-cloud-sessions-hand-over-at-measured-context-not-a-group-count) (2026-11-03, the owner's call): for the V1
cloud run, the count of two or three groups a session and the handoff at about 70% of
context.**

**Decision.** The plan's specs stay as written, but they are built as PR groups. A group
is one branch, one pull request and one review for one to four consecutive specs. It is
named for its first member and based on the previous group's branch. The groups and
their order are the table in the plan's
[PR groups](plans/v1-starshot/00-plan.md#pr-groups-d30) section. PR1 (CI hardening)
joins PR0 and has no branch of its own. A session builds two or three groups and hands
off at about 70% of its context.

Each group gets one bounded review:

- One `adversary` pass on the top tier. It also reads the deviation log and the PR body
  against the diff, and it reports, per directory, which files it opened and what it
  found.
- A domain lens only when the diff calls for it: `physics-auditor` for crates,
  packages, fixtures or shot settings; `verification-driver` for anything a player
  sees; `rules-reviewer` for the harness, as the `verify-all` skill's table lists it.
- No refuters by default. The orchestrator judges each finding from the tree. Only when
  a blocker would change the design does it ask one more `adversary`, scoped to that
  finding, to refute it.
- A second adversary pass only over files the first did not open. A delta pass only
  when the fixes touched a physics number, a workflow, the harness, or more than about
  50 contentful lines.

The deep review waits for the end. After the last group, one master review covers the
whole stack. It runs the `verify-all` sweep on the top tip, with every acceptance
criterion's command and exit code. It reviews the combined diff through several lenses:
an adversary per band, `physics-auditor` over the crates and fixtures, `rules-reviewer`
over the harness and `verification-driver` over chapter one. A final fix group closes
what it finds. Then the owner reviews the stack, and the groups above PR0 merge as one.
PR0 itself merges when the owner approves it, as before. A band still closes with its
`verify-all` sweep and a handoff; that is a check, not the master review.

The size cap (`PR_SIZE_CAP`) applies to each member spec. A group of n specs is held to
n times the cap. The Definition of Done does not change: every group runs
`npm run gates`, plus `verify-physics` and `verify-game` when its diff calls for them.

**Scoped exception, 2026-11-03.** The owner approved a one-time size exception for
the reviewed PR2 and PR3 campaign cleanup in `codex/v1-pr02-screen-split`. The
reviewed change spans 71 files and 4,036 raw added lines, including formatting and
moves, before recording this ruling. It includes 967 new browser-probe code lines.
This exception covers that cleanup and its verification, plus this ruling's record.
Future group limits, file-size limits and verification requirements stay unchanged.

**Why.** Each session gets more built. A review per spec cost more than the building it
checked, and most of what it found was cheap to fix in place. One full review of the
finished stack sees how the parts fit, which no single-spec review can.

**Consequences.** PR0 (#1) carries the CI hardening. Every group PR names each member's
issue (`Part of #a, #b`). PR4's size check reads the member count. Each spec's Branch
line gives way to its group's branch in the group table.

---

## D31. The name is always written starshot

*Date:* 2026-11-01. *Source:* owner's ruling (refines D20's spelling; the name and
domains are unchanged).

**Decision.** Write "starshot" in lowercase everywhere, including logos, title
screens, documentation and the start of a sentence. The look prototype follows
this rule in new and changed copy.

**Why.** The owner chose lowercase as the name's presentation.

**Consequences.** A sweep of existing spelling, including `TRADEMARK.md`, is a
separate proposed change for the owner. It is not part of the look prototype.

---

## D32. A playful observatory in a single-screen game shell

*Date:* 2026-11-01. *Source:* owner's choice after comparing the three look studies.

**Decision.** Combine Pocket observatory's playfulness with Deep field's rounded
forms and spacious world view. Present the game in an app shell that fits the screen.
The world stays behind the controls. Menus and detailed information appear in
overlays and can be dismissed. Long content scrolls inside its own panel; the game
page does not scroll.

Flight instruments belong in a live translucent bottom sheet. The map remains
interactive while the instruments are open. Their primary presentation uses clear
symbols, numbers and short labels, with scientific precision available in the same
sheet. Reading or changing a flight instrument must not implicitly pause the journey.
Settings and help may use modal panels.

The flight deck does not scroll vertically. Additional instruments use swipeable
horizontal pages with visible navigation; playback and camera controls stay fixed.
The detail choices are named Simplified and Scientific. Each has an icon that can
stand alone when the deck is collapsed or space is limited. Accessible names remain.
The control for hiding the interface is named Hide UI; its return action is Show UI.

**Why.** The owner wants an intuitive game that can be read at a glance, with the
world and current action on screen together.

**Consequences.** The [look direction](design/look-direction.md) records the combined
style and proposed interaction details. The look prototype demonstrates the shell
before adopting it in the game. D6's physics and preview agreement, D15's asset
rules and D19's rendering constraints remain in force. Detailed timing, materials
and sound composition remain adjustable during iteration.

---

## D33. Earth to Moon is the first mission, built on today's engine before the Rust core

*Date:* 2026-11-02. *Source:* owner's ruling on when (directly after the PR2 group, on
the current TypeScript engine, with the Rust core required to match it); the flight
details (judgment) follow the approved lunar study. Amends the group order of D30's table
and the Moon's place in PR34; refines D18's flattened chapter one for the Earth-Moon
system. D16 and D17 stand.

**Decision.** The Moon-first slice is built in the two groups after the PR2 group:
PR3a (the flight) and PR3b (the campaign).

- Earth to Moon is mission one, with the stable id `moonshot`. The planetary missions
  keep their ids (`first-light`, `morning-star`, `big-game`, `grand-tour`) and follow it.
- The lunar flight is an explicit typed variant beside the planetary shot. It is an
  impulsive burn from a 200 km parking orbit (D18 item 1, the 3.55 km/s tank). Earth's
  centre with Earth's own mass, the Moon and the Sun pull on the craft. Its frame and
  units are named wherever it crosses a boundary.
- The mission is planar in the Moon's own orbital plane at launch, not the ecliptic.
  Flattening the Moon's orbit onto the ecliptic would move it by up to about 34,000 km,
  so the flattened world of D6 and D18 applies to the planetary missions only.
- The Moon's position comes from the cached JPL Horizons rail the lunar study validated
  (five JPL probes within 0.1 km), moved into `packages/ephemeris` with its provenance.
  The DE440 rails of PR8 replace it and keep its probes as a cross-check.
- Success is first entry into the Moon's sphere of influence, as a hit is for the
  planets. It is an encounter, not an orbit; capture stays with PR20.
- The Rust core reproduces the lunar variant: PR11 to PR14 add its tests to their
  conformance scope, and PR17 retires the TypeScript version only after the wasm matches
  it. There is one engine at a time.

**Why.** The owner wants a playable Moon-first campaign before the Rust core lands. The
lunar study already has a measured flight model with tests against JPL probes, so the
TypeScript version becomes one more oracle the Rust port is tested against, as the
planetary code already is.

**Consequences.** The group table gains PR3a, PR3b and PR3c (the stylesheet split,
deviation 16) between the PR2 and PR4 groups. PR34 keeps the later Earth and Moon levels:
an Earth-orbit lesson and a loose lunar capture. Mission numbers shift by one; ids do not.

---

## D34. Publish the current browser game before resuming v1

*Date:* 2026-11-02. *Source:* owner's release direction.

**Updated by D35:** subsequent production publication requires explicit candidate
promotion. The first unversioned CLI publication remains the historical bootstrap.

**Decision.** Put the existing playable game on playstarshot.com using Firebase
Hosting. The owner's revised choice on 2026-11-02 is Firebase only for simplicity;
this supersedes D21's GitHub Pages mirror. Stack the deployment work on PR0. Merging the
release PR into PR0 automatically deploys an isolated development preview. Verify
that run and the hosted game. For the first publication, download its retained
artifact, confirm the source SHA and deploy those exact files to production with
the existing signed-in CLI. Complete the apex and `www` DNS, HTTPS and game checks
before merging PR0 into `main`. This is a one-time exception to D21's first-publication
order, not a new production permission for branch workflows. Automatic production
deployments remain main-only. Create a new program PR0 from the released
main for the remaining work.

This is an early public preview with local profiles. D13's real accounts and
leaderboard, D16's Rust migration, D17's rails and D18's full chapter are deferred
from this release, not cancelled. No database or paid runtime is needed. The local
cloud interaction must be called a demo. The current campaign remains intact.

**Why.** The owner wants a playable public site and working deployment process
before expanding the game. The existing design can be published independently.

**Consequences.** One verified static artifact goes to Firebase Hosting. Keyless
identities and protected deployment environments limit publishing to the intended
project and branch. Offline caches must install complete releases and preserve an
active flight's code and data until its tabs close. Shipped licences stay accessible.
Forks can reproduce the static build without a hosted mirror. D21's requirement to
measure production cost or latency before adding another CDN remains in force.

D33 is reserved for the saved PR2 branch's approved Moon-first TypeScript direction.
That branch remains separate for review on the new program trunk. This release does
not replace its decision or require Moon-first to wait for Rust. Deviations 17 to 19 and
[the release plan](plans/current-game-release.md) record the temporary sequence.

---

## D35. Generate release versions in CI and promote tested beta bytes explicitly

*Date:* 2026-11-02. *Source:* owner's versioning, beta and promotion choice.

**Decision.** Bring R26 and PR38's custom release proposal forward. Contributors
write Unreleased notes; CI calculates one semantic version for the stack and generates
all current npm workspace and lockfile versions plus a dated changelog heading.
The first Starshot release is the existing 0.1.0 baseline. Later releases infer major
from breaking changes, minor from Added and otherwise patch, with a validated Bump
override. Tags use `starshot-vX.Y.Z`, preserving inherited astlo history.

Beta uses the development site's live channel at beta.playstarshot.com. Temporary
previews keep expiring URLs. PR0 pushes can stage beta; other reviewed refs use manual
dispatch. Main merge does not publish production. The owner stages a stable candidate
from main, tests it on beta, then explicitly selects Promote release with its version.
Promotion deploys the same retained bytes and publishes the GitHub release after
production checks. No rebuild, commit marker or mutable branch tip selects a release.

A protected annotated tag binds version, source, original successful build, artifact
id and digests. Its version cannot move to another archive. Resolution checks GitHub
metadata and fails on mismatch or expiry. The source run must finish successfully
before promotion; retrying a downstream failure reuses the original verified build.
Published GitHub releases retain exact recovery assets and are immutable. Hosting
rollback is a separate explicit recovery operation and never clears player saves.

The ordinary proposal flow is a read-only CI artifact. The orchestrator applies its
unchanged generated files with the validating CLI and opens a stacked PR. Optional
automatic PR creation stays disabled unless the owner authorizes GitHub's combined
create/approve permission and the exact repository switch. Its isolated main-only
job uses D24's public owner author/signoff and Actions as committer. No PAT, stored
cloud key or expanded production branch grant is introduced.

**Why.** The owner wants a stable place to test and a deliberate release choice,
with a readable version and evidence tying the published game to its tested bytes.

**Consequences.** Snapshot versions include run and attempt; stable candidates already
carry their final version on beta. The content build id still owns worker caches.
The menu footer and About compile the same semantic version as release.json, so old
offline clients identify themselves accurately. The header credits Kobe with the
owner-requested public creator link, replacing the extra top-left mark and tagline.
The footer has View source on GitHub at left, the version centered and About and
credits at right. Save-schema versions remain
separate. D33's future game program and D21's measurement requirement remain intact.
The [versioned release plan](plans/current-game-release/versioned-releases.md) and
[hosting runbook](hosting.md) define verification and recovery.

---

## D36. Starshot is a standalone GitHub repository with selective astlo updates

*Date:* 2026-11-02. *Source:* owner's instruction to leave the GitHub fork network.

**Decision.** Detach Starshot from GitHub's astlo fork network after backing up the
repository metadata. Preserve the Git history, source, tags, attribution and licence
notices. Keep the `upstream` remote for reviewed updates through the `astlo-upstream`
skill. D2, D10, D26 and D29 continue to govern the original mirror, patched Python
source and upstream contributions. This changes only D1's active GitHub fork status.

**Why.** Starshot has its own game and release process while retaining its origin
and a supported path for astlo updates.

**Consequences.** Verify repository identity, GitHub settings and release provenance
after detachment. Existing candidate versions remain bound to their original records
and artifacts. This notice correction belongs to a future build; it does not rebuild
or replace the tested 0.1.0 candidate. Selective imports may preserve upstream content
without merging all upstream ancestry or original root paths.

---

## D37. The owner approves every GitHub production deployment

*Date:* 2026-11-02. *Source:* owner's approval of a production gate limited to their account.

**Decision.** Require `harmon-amakobe` as the sole reviewer of the existing
`production` environment. Disable administrator bypass. Allow self-review so the
solo owner can approve a run they requested. Retain the main-only branch rule and
the existing keyless cloud identity. Preview and candidate staging remain unchanged.

**Why.** Repository write access may grow as contributors join. Requesting a release
must not grant the right to approve production deployment.

**Consequences.** D35's explicit promotion now waits for the owner to select
**Approve and deploy**. The README links to the workflow and explains its inputs;
the button never submits a release. Preserve this gate during repository recovery.
Repository administration and direct Firebase deployment access remain trusted powers.
Agents using the owner's identity still need an explicit instruction to promote.
The existing 0.1.0 candidate remains bound to its original records and tested bytes.


---

## D38. Make the local Moon-first campaign playable with explicit orbit and time controls

*Date:* 2026-11-03. *Source:* owner's local gameplay request. Circular parking and its fixed frame are implementation judgments under D33.

**Decision.** Bring D33's flight and campaign into the current approved shell before
its later refactor. Keep the planetary physics and existing mission identities.
Show the complete orbit or trajectory, with Craft, Orbit and System camera choices.
Zoom retains its chosen world point. Date and phase controls are visible and independent.

The craft starts in a circular 200 km Earth-relative parking orbit. Its plane is fixed
at the lunar study's 2026-11-02 01:00 UTC reference. A separate coasting epoch controls
phase advance. This refines D33's plane-at-launch wording so changing the launch date
can hold the craft's Earth-relative position and velocity while the Moon moves.
Changing phase at frozen ET deliberately sets a new circular initial condition.
The same state feeds the scene and the worker's impulsive burn. Circular parking is
an initial-condition approximation; released flights include Sun, Earth and Moon forces.

Each pilot defaults to Plan and launch: releasing sets the aim and keeps time
paused for inspection before explicit Launch. The optional YOLO setting
launches on release. Missing saved settings migrate to Plan and launch.
Pulling pauses ET before editing the burn. Cancelling restores the previous aim and
coasting state. Reduced motion starts paused. The lunar guide retains its measured
01:00 UTC epoch and 225-degree phase. Its reference par is not a claim of optimality.
Success remains first entry into the real Moon sphere of influence, not lunar capture.

**Why.** The owner wants to play and review a coherent local game before the next
implementation handoff. A visible orbit must agree with the state that actually flies.

**Consequences.** v2 pilot storage preserves old stars, sessions and earned access.
Old storage is not overwritten. Playtest access cannot award unearned achievements.
The shared lunar model and rail move into packages; the study imports them. The saved
screen refactor remains separate. D35 and D37 still govern any later release: this
local task grants no gameplay publication or deployment. See the
[local gameplay plan](plans/orbital-gameplay/plan.md) for scope, deviations and proof.

**Release follow-up, 2026-11-03.** After reviewing the local build, the owner
requested a pull request and a release carrying these changes to beta and production
before the handoff. That instruction authorizes publication under D35 and D37;
it does not change the protected candidate or owner approval requirements.

---

## D39. Learn from releases without mandatory human trials

*Date:* 2026-11-03. *Source:* owner's ruling to release and learn through use instead
of requiring recruited testers or physical-phone measurements.

**Decision.** V1 implementation, band planning, master review and release readiness
do not depend on a tester count, human success quota or physical-phone measurement.
Gameplay trials and device measurements are optional feedback after release. The
plan's human prototype thresholds are research questions, not acceptance gates.
This supersedes their mandatory status under the D18 prototype plan.

Automated verification remains required: browser layouts, accessibility, offline
behavior, physics/JPL comparisons, deterministic conformance, bundle budgets, CI
timing, scripted pacing and the economy simulation. Phone 60 fps and 100 ms preview
remain design targets; do not claim they are measured without device evidence.

**Why.** The owner will learn from actual use and iterate after release, without
arranging a separate tester program. Missing optional feedback does not block work.

**Consequences.** P1 and P2 become optional. Retire the required recruitment task as
not planned; preserve its issue identity. No new telemetry or Analytics dependency
is introduced. D34 to D37 still govern candidate integrity and production approval.
This decision changes readiness criteria; it does not mark any build verified,
choose a production candidate or replace the owner's production approval.

---

## D40. Cloud sessions hand over at measured context, not a group count

*Date:* 2026-11-03. *Source:* owner's ruling for the cloud run of the remaining V1
program (supersedes D30's handoff at about 70% of context and its count of two or
three groups a session).

**Decision.** The V1 cloud run is this program's sessions on the cloud platform, and
the lead is its orchestrator session. The lead has an operating budget of 800,000
tokens of context. It
starts handover when its measured context occupancy reaches 776,000 tokens, 97% of
that budget, which leaves a 24,000-token reserve. Occupancy means the current context
window, with loaded instructions and tool results; cached tokens in that window count.
It is not billing, cumulative cache read or write totals, or the sum of subagent
contexts. The trigger stays at 776,000 on a larger window.

Until the trigger or a band close, the session keeps building the authorized program.
Finishing two or three groups is no reason to stop. At the trigger it starts no new
implementation or research. It finishes bounded stabilization: the step in flight, its
gates and the publication of reviewed work. Then it updates the handover packet and
transfers the work. It may pass 800,000 only to finish handover, within the runtime's
real limit.

Only the lead creates the successor, and exactly one, so that two sessions never build
one stack. It uses the platform's supported session tool, from the final published tip,
and checks for an existing successor before retrying an uncertain create. It then
confirms that the successor started, received its kickoff and runs the requested model
and mode. A returned session id is not that proof. If creation is unavailable or
refused, the lead keeps all state and gives the owner the kickoff. That is a blocked
handover, not completion.

Sessions use supported controls to prevent automatic and idle compaction and never run
`/compact`. They measure occupancy with the runtime's own telemetry. If an unavoidable
compaction or hard limit would arrive before 776,000, the session hands over earlier
and records the measured limit. Missing telemetry is recorded as unknown, and the
session then hands over after each published group. A forced compaction is disclosed,
and a fresh session rebuilds from the handover packet before more implementation.

After each reviewed group and each material decision, the lead updates the acceptance
record and the handover packet, the
[session handover](plans/v1-starshot/06-resumption.md#session-handover-d40) section of
the resumption ledger, and pushes it. A file that exists only on a session's machine is
not durable. The handover packet and other public files name no private account
details, personal emails, personal paths or the owner's other private projects
(non-negotiable 4). A kickoff follows the same rule, except for the absolute repository
path, which goes only there.

**Why.** Each session builds more when handover follows measured context rather than a
fixed group count, and a count can no longer end the program early. Measuring
occupancy, instead of trusting a configured threshold, keeps handover ahead of any
compaction that would drop detail.

**Consequences.** The handoff skill and the plan's operating steps use this trigger.
D30's group table, size rules, bounded reviews, band sweeps, fresh band-planning
sessions and master review are unchanged. A session that hands over finishes or
preserves its current group; partial work is labelled partial and kept. Sessions outside
the V1 cloud run keep D30's handoff.
