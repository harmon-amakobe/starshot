# v1-starshot: chapter one on the web, on one Rust core

**Current sequence (D34):** first publish the existing game through the
[current-game release](../current-game-release.md), stacked on PR0. After it lands,
create a new program trunk from the released `main`. Review and import the saved
PR2 branch and D33's Moon-first TypeScript direction there. The tables below retain
the remaining feature scope; hosting this preview does not complete their future work.
D34's revised Firebase-only choice supersedes their earlier Pages mirror requirements.
Reconcile those historical hosting steps when preparing the next program trunk.

The program plan: what chapter one delivers, the decisions it rests on, how each goal is
proven, and the pull requests that build it. Research and its sources are in
[01-research.md](01-research.md). Every contradiction found on the way, with its ruling,
is in [02-disagreement-register.md](02-disagreement-register.md). The issues are code in
[03-work.yaml](03-work.yaml), and the steps only the owner can take are in
[04-ops-checklist.md](04-ops-checklist.md). Departures from this plan go in
[05-deviation-log.md](05-deviation-log.md).

| | |
|---|---|
| Program | `v1-starshot` |
| Trunk | PR0 on `starshot/pr0-bootstrap`, then `main` |
| Shape | PR0 (with PR1 inside it), then 39 specs built as 19 PR groups in six bands (A to F), then one master review (D30) |
| Date | 2026-11-01 |
| Decisions | D12 to D30 in [../../decisions.md](../../decisions.md), on top of D1 to D11 |
| Turnkey specs | Bands A and B. Bands C to F are outlines until their band planning sessions |

Line numbers in this plan are anchors only: re-locate code by symbol or heading before
editing, because lines drift.

## Program summary

Chapter one is Starshot on the web, finished. A player starts in a 200 km parking orbit
with 3.55 km/s of fuel and pulls the slingshot. From there they work outward on real
launch windows to the Moon, Venus, Mars, Jupiter, Saturn and a close solar orbit at 20
solar radii. Entering a body's sphere of influence adds fuel. A collector left in a
stable orbit adds more when its beam reaches Earth, and lighter craft go farther because
fuel is impulse. Captures happen at periapsis: the craft's computer times the burn and
the player's hold sets only the amount. Previews lock to the next sphere of influence
with one faded ghost leg, and every lock state speaks through colour, icon, text, sound
and haptic together. Planet and Moon positions come from DE440 rails checked against
NASA/JPL. The map is drawn with three.js presenting as 2D, with real imagery in tiers and
Canvas 2D as the fallback; sound is generated in code. The game plays fully offline.
Online, players get an anonymous account and a leaderboard whose scores a server function
re-flies with the same wasm the browser ran. It is served from Firebase Hosting at
playstarshot.com, with a GitHub Pages mirror any fork can rebuild.

Under the game, one Rust core in `crates/` replaces the TypeScript ephemeris and physics
packages. It holds the ephemeris, the integrator, the launch model, Lambert, the shot
model, scoring, hints and the replay format. Every transcendental function goes through
one software maths crate, so the results are bit-identical in V8, JavaScriptCore and
native code (D16). A Python tool in `tools/ephem/` fits the rails from NASA's
`de440s.bsp` and writes the validation reports (D17). Around both, the repository becomes
a project others can join after chapter one (D25). It gets Apache-2.0 with DCO sign-off
and a trademark policy (D12), and a copy standard and a size gate that run on every
change (D27, D28). Issues are kept as code with one project board (D23), and CI is
hardened around one stable required check. Bands A and B lay those foundations and the
core. Bands C to F build the flight model, the senses, the online features, and the
chapter's content and release. Native shells for iOS and Android, a 3D chapter and an
interstellar chapter are later programs.

## The decisions this plan rests on

| # | One line |
|---|---|
| D12 | Code is Apache-2.0 with DCO sign-off; original media CC BY 4.0; name, logo and icon reserved under `TRADEMARK.md`; REUSE layout |
| D13 | Anonymous accounts and a leaderboard on Firebase from the first release, with server-side replay verification; the production web configuration is committed in one allow-listed file; offline play needs none of it |
| D14 | Free to play everywhere, no ads, no purchases; no non-commercial assets |
| D15 | Real imagery (Solar System Scope, NASA SVS, SDO, NASA and JPL), a permissively licensed star catalogue, no Gaia-derived data, sound effects in code, original or CC BY music, a manifest entry per asset, no AI-generated assets without a new decision |
| D16 | One Rust core under `crates/`, adopted now with no staged cut-over; software maths for identical bits; TypeScript packages are the conformance oracle, then retired |
| D17 | Positions from DE440 Chebyshev rails for the planets and the Moon (100 km tier, test budget 150 km), Table 1 as fallback and cross-check, Horizons never at runtime |
| D18 | Fuel budget 3.55 km/s from a 200 km orbit, fuel as impulse, `u_SOI` unlocks, impulsive physics with a drawn 1 g burn, capture at periapsis, one-leg previews, multi-channel cues, an event-anchored time map, chapter one under about 15 km/s |
| D19 | three.js `WebGLRenderer` presenting as 2D, imperative scene code, camera-relative positions, linear distances with labelled enlarged sizes, KTX2 textures in tiers, Canvas 2D fallback, first load under about 300 KB before textures |
| D20 | The name stays Starshot; the domain is playstarshot.com (and .app); qualified store titles; trademark searches before any store submission |
| D21 | Firebase Hosting for production with previews for same-repository branches, and a GitHub Pages mirror |
| D22 | 13 and up; anonymous accounts, display names from a filtered list, no free text, email, analytics or advertising identifiers |
| D23 | Issues on, epics as `kind:epic` with sub-issues, one user-owned project, issues as code synced by the orchestrator over REST |
| D24 | Agent commits are authored by the owner, signed off at the publish step, with the agent as co-author |
| D25 | Solo with agents until chapter one is playable; PRs sized for one reviewer (sizing superseded by D30) |
| D26 | Mark hears now, with the fixes and [../../astlo/directions.md](../../astlo/directions.md); astlo is a partner, never a runtime dependency |
| D27 | The copy standard and its gate, with the em dash, the en dash and the horizontal bar as hard failures |
| D28 | Size gate (warn 300 code lines, fail 500, shrinking baseline), god-component heuristics, layering, dependency licence allow-list; GameScreen split early |
| D29 | astlo changes are made here first, offered to Mark as pull requests (astlo changes only), and pulled back from his releases once adopted; the Rust core stays Starshot's, with dependency-free ephemeris and topocentric parts he may use as a crate; tooling may depend on a licensed, validated astlo, the game never does |
| D30 | Specs build as PR groups (one branch, one PR, one bounded review for one to four specs), two or three groups a session, PR1 inside PR0, and one master review of the whole stack at the end |

Still binding from before: D1 and D2 (Mark's files untouched), D6 (2D physics; a level's
preview, launch, hints and tests share its frozen `SimSettings`), D8 to D11.

## Acceptance criteria

Each criterion names the command that proves it and the PR that first makes it true. A
criterion without a recorded result in the PR body is not proven.

| # | Criterion | Proof command | First proven by |
|---|---|---|---|
| AC1 | Every gate passes from a clean install, Rust included | `npm ci && STARSHOT_REQUIRE_RUST=1 npm run gates` exits 0 and ends `gates: N/N passed` | PR1, in PR0 (D30); again at every PR |
| AC2 | The Rust workspace is formatted, lint-clean and tested | `cargo fmt --all --check && cargo clippy --workspace --all-targets --locked -- -D warnings && cargo test --workspace --locked` exits 0 | PR6 |
| AC3 | Planets stay within today's Horizons budgets at the fixture dates, from Rust, for Table 1 and for the rails | `cargo test -p starshot-ephemeris --locked --test horizons` | PR9, PR10 |
| AC4 | Every rail is within 150 km of DE440 every 5 days from 1950 to 2150, the Moon included | `uv run --project tools/ephem --locked pytest tools/ephem/tests -q` (every `ephem.validation/1` report has `pass: true`) and `cargo test -p starshot-ephemeris --locked --test rails` | PR8, PR10 |
| AC5 | Table 1 stays within its arcminute budgets every 5 days from 1950 to 2050 | `cargo test -p starshot-ephemeris --locked --test dense_table1` | PR10 |
| AC6 | The core gives identical bits in V8, JavaScriptCore, native x86_64 and native arm64 | `npx vitest run packages/core-wasm` (V8), `bun packages/core-wasm/scripts/bits-jsc.mjs` (JavaScriptCore), `cargo test -p starshot-math --locked --test golden` and `cargo test -p starshot-game --locked --test golden_replays` on x86_64 and in the `rust-arm64` CI job | PR6 (maths), PR15 (replays) |
| AC7 | Energy and timing hold: a Sun-only 1 AU orbit closes within 10 km after one period; Earth's gravity switches on energy-consistently once; a 3-year preview takes under 400 ms in CI | `cargo test -p starshot-physics --locked` | PR11, PR12 |
| AC8 | Every level's known solution reaches its target through the shipped core with the level's frozen settings, and every hint is deterministic | `cargo test -p starshot-game --locked --test levels` and `npx vitest run apps/game` | PR14, PR16; re-derived in PR18 and PR34 to PR36 |
| AC9 | Size budgets hold: wasm under 64 KB gzip; first-load JavaScript under 300 KB gzip before textures; level 1's 1k textures under 300 KB | `node scripts/check-bundle-size.mjs` (gate `bundle-size`) | PR15 (wasm), PR25 (first load), PR26 (textures) |
| AC10 | The game plays through on a phone, a desktop and a phone with reduced motion: a result, zero console errors, zero unnamed controls, zero targets under 44 px, and level 1 replayed offline | `npm run build && node scripts/verify-game.mjs` (CI job `verify-game`), with `--steps scripts/verify-steps/chapter-one.mjs` from PR34 | PR1, in PR0 (D30, in CI); PR31 (offline); PR34 to PR36 (the chapter) |
| AC11 | The copy standard holds everywhere it applies | `node scripts/check-copy-tells.mjs` exits 0, and ``LC_ALL=C.UTF-8 git grep -nP '[\x{2013}\x{2014}\x{2015}]' -- . ':!third_party' ':!python/astlo/astlo' ':!python/astlo/astlo-*.dist-info'; test $? -eq 1`` exits 0 | PR0; every PR |
| AC12 | Every shipped file and dependency has an allowed licence and every asset is credited | `node scripts/check-licence.mjs && node scripts/check-dependency-licences.mjs && node scripts/check-assets.mjs && node scripts/gen-credits.mjs --check` | PR0 (files), PR5 (the rest) |
| AC13 | Nothing private or secret in files, commit messages or PR bodies | `node scripts/check-secrets.mjs` with the local private-name list; the `commits` gate; the PR body through `node scripts/check-secrets.mjs --stdin` | Every PR; the `commits` gate from PR4 |
| AC14 | The TypeScript core is gone and nothing refers to it | `test ! -e packages/ephemeris && test ! -e packages/physics && ! git grep -n -e @starshot/ephemeris -e @starshot/physics -- apps crates packages scripts tools` | PR17 |
| AC15 | Security Rules deny by default and allow only the documented writes | `npx firebase-tools emulators:exec --only firestore,storage --project demo-starshot "npx vitest run tests/rules"` exits 0 | PR30, PR31 |
| AC16 | The server accepts every golden replay and rejects tampered ones, running the same `.wasm` bytes the web ships | The function's test command, fixed in the Band E planning session; it compares the wasm's SHA-256 with `packages/core-wasm/pkg` | PR32 |
| AC17 | Both sites load, and hashed assets are cached as immutable | `curl -sSfI https://playstarshot.com/` and `curl -sSfI https://harmon-amakobe.github.io/starshot/` return 200; a hashed asset's response carries `cache-control: public, max-age=31536000, immutable` | PR33 (and owner step G5) |
| AC18 | The issues agree with the plan | `node scripts/sync-work.mjs --program v1-starshot --check` exits 0 (gate `work`) | PR4 |
| AC19 | The workflows lint clean | `pipx run zizmor==1.31.1 --offline .github/` exits 0 (CI job `workflow-lint`) | PR1, in PR0 (D30) |

## The bands

| Band | PRs | Goal | Ends with |
|---|---|---|---|
| A, foundations | PR1 (in PR0) to PR5 | CI hardened with one stable required check; GameScreen split under the size gate; PR text, commits and size checked; licences and assets gated | `verify-all` sweep; handoff |
| B, the Rust core | PR6 to PR17 | One Rust core in wasm running the game, bit-identical across engines; rails pack and tool; TypeScript core retired | `verify-all` and `verify-physics`; handoff |
| C, flight model | PR18 to PR24 | Rails as the game's source; fuel, capture, lock states, time map, launch windows, progression | Band C planning first; `verify-game` and `verify-physics`; handoff |
| D, senses | PR25 to PR29 | three.js presenting as 2D, textures, sky, sound and haptics, settings | Band D planning first; `verify-game`; handoff |
| E, online | PR30 to PR33 | Firebase, accounts, verified leaderboard, Hosting | Band E planning first; rules tests; handoff |
| F, content and release | PR34 to PR40 | Chapter one's levels, credits, release lane, store notes, the astlo upstream kit | Band F planning first; full sweep; trunk merge readiness |

## The pull requests

Size is an estimate of contentful lines added (lockfiles, fixture JSON, generated data
and pure deletions excluded) and files touched, against the cap of about 400 lines or
20 files per spec (`PR_SIZE_CAP` in [../../../.claude/README.md](../../../.claude/README.md)).
A PR group of n specs is held to n times the cap (D30), and `check-pr-size.mjs` (PR4)
warns above that and fails at twice it. Slugs are the
stable ids used in [03-work.yaml](03-work.yaml); the numbers of Bands C to F may change
in their planning sessions.

| PR | Slug | Title | Band | Size estimate | Depends on |
|---|---|---|---|---|---|
| PR0 | `v1-pr0-plan` | Plan, decisions D12 to D30, governance files and gates, and PR1's CI hardening (D30) | trunk | well over the cap (deviation 1) | none |
| PR1 | `v1-ci-hardening` | CI hardening | A | about 330 lines, 11 files: built in PR0 (D30) | PR0 |
| PR2 | `v1-screen-split-render` | GameScreen split, render loop | A | about 500 lines (about 440 moved), 8 files: over, warns | PR1 |
| PR3 | `v1-screen-split-state` | GameScreen split, state hooks | A | about 480 lines (about 400 moved), 9 files: over, warns | PR2 |
| PR4 | `v1-process-checks` | Process checks | A | about 330 lines, 9 files: inside | PR1 |
| PR5 | `v1-licence-assets` | Licence and assets gates | A | about 400 lines, 10 files: at the cap | PR1 |
| PR6 | `v1-rust-workspace` | Rust workspace and starshot-math | B | about 360 lines, 15 files: inside | PR1, PR5 |
| PR7 | `v1-ephem-tool` | Ephemeris tool and Horizons fixtures | B | about 430 lines, 15 files: slightly over | PR1, PR5 |
| PR8 | `v1-ephem-rails` | DE440 rails pack | B | about 400 lines, 12 files plus 31 generated data files: at the cap | PR7 |
| PR9 | `v1-ephemeris-crate` | Ephemeris crate | B | about 520 lines (about 190 of tests), 18 files: over, warns | PR6 |
| PR10 | `v1-rails-reader` | Rails reader | B | about 430 lines, 8 files: slightly over | PR8, PR9 |
| PR11 | `v1-physics-core` | Physics crate, integrator and Lambert | B | about 420 lines, 11 files: slightly over | PR9 |
| PR12 | `v1-physics-simulate` | Physics crate, simulate | B | about 460 lines, 6 files: over, warns | PR11 |
| PR13 | `v1-game-shot` | Game crate, shots and replays | B | about 430 lines, 11 files: slightly over | PR12 |
| PR14 | `v1-game-levels` | Game crate, levels, scoring and hints | B | about 560 lines (about 220 of tests), 8 files: over, warns; split rule in the spec | PR13 |
| PR15 | `v1-core-wasm` | core-wasm package and bit identity | B | about 480 lines plus the generated package, 16 files: over, warns | PR14 |
| PR16 | `v1-worker-cutover` | Worker cut-over | B | about 450 lines, 14 files: over, warns | PR15, PR3 |
| PR17 | `v1-retire-ts-core` | Retire the TypeScript core | B | about 180 lines added, about 2,100 deleted, about 35 files: over on files, deletions only | PR16, PR10 |
| PR18 | `v1-rails-default` | Fly on DE440 rails | C | outline | PR17 |
| PR19 | `v1-craft-fuel` | Craft and fuel | C | outline | PR18 |
| PR20 | `v1-soi-capture` | Spheres of influence and capture | C | outline | PR19 |
| PR21 | `v1-lock-cues` | Lock states and cues | C | outline | PR20 |
| PR22 | `v1-time-map` | Time map | C | outline | PR20 |
| PR23 | `v1-window-screen` | Launch-window screen | C | outline | PR18 |
| PR24 | `v1-progression` | Progression and saves | C | outline | PR19, PR20 |
| PR25 | `v1-three-renderer` | three.js renderer | D | outline | PR16 |
| PR26 | `v1-textures` | Textures | D | outline | PR25, PR5 |
| PR27 | `v1-sky` | Stars and sky | D | outline | PR25, PR5 |
| PR28 | `v1-audio-haptics` | Audio and haptics | D | outline | PR21 |
| PR29 | `v1-settings` | Settings | D | outline | PR28, PR26 |
| PR30 | `v1-firebase-foundation` | Firebase foundation | E | outline | PR4, PR5 |
| PR31 | `v1-auth-leaderboard` | Accounts and leaderboard | E | outline | PR30 |
| PR32 | `v1-replay-verify` | Replay verification | E | outline | PR31, PR15, PR24 |
| PR33 | `v1-hosting` | Hosting | E | outline | PR30 |
| PR34 | `v1-levels-moon` | Levels, Earth and Moon | F | outline | PR24, PR21, PR22, PR23 |
| PR35 | `v1-levels-inner` | Levels, Venus and Mars | F | outline | PR34 |
| PR36 | `v1-levels-outer` | Levels, outer planets and the Sun | F | outline | PR35 |
| PR37 | `v1-credits` | Credits | F | outline | PR26, PR27, PR28 |
| PR38 | `v1-release-lane` | Release lane | F | outline | PR1 |
| PR39 | `v1-store-prep` | Store preparation | F | outline | PR33, PR37 |
| PR40 | `v1-astlo-upstream-kit` | astlo upstream kit | F | outline | PR8 |

The stack is linear in this order. A PR that depends on an earlier one that is not
directly below it (PR16 on PR3, for example) is satisfied because everything below it is
already in the branch it bases on.

### PR groups (D30)

The owner incorporated the approved design prototype into PR0 on 2026-11-02.
The runtime now starts at `apps/game/src/campaign/CampaignApp.tsx`.
Before the PR2 group, reconcile its legacy `GameScreen` file mapping with this
active shell while preserving its behavior-only cleanup goal. The
[main-game handoff](../main-game-handoff.md) records the accepted design,
Moon-first campaign objective and required proof. This does not mark later
core, flight, renderer or progression specs complete.

The specs build as the groups below, in this order. A group is one branch, one pull
request and one review for one to four consecutive specs, named for its first member
and based on the previous group's branch. Each spec's own Branch line gives way to its
group's row here. A session builds two or three groups; the session column is a
guide, and the context budget decides. The groups of Bands C to F are provisional:
each band's planning session confirms or regroups them before it builds.

| Group | Members | Branch | Base | Session |
|---|---|---|---|---|
| PR0 | PR0, PR1 | `starshot/pr0-bootstrap` | `main` | the trunk; the owner reviews it |
| PR2 | PR2, PR3 | `starshot/v1-pr02-screen-split` | `starshot/pr0-bootstrap` | A1 |
| PR4 | PR4, PR5 | `starshot/v1-pr04-process-licence` | the PR2 group's | A1 |
| PR6 | PR6 | `starshot/v1-pr06-rust-workspace` | the PR4 group's | B1 |
| PR7 | PR7, PR8 | `starshot/v1-pr07-ephem-rails` | the PR6 group's | B1 |
| PR9 | PR9, PR10 | `starshot/v1-pr09-ephemeris-crate` | the PR7 group's | B2 |
| PR11 | PR11, PR12 | `starshot/v1-pr11-physics-crate` | the PR9 group's | B2 |
| PR13 | PR13, PR14 | `starshot/v1-pr13-game-crate` | the PR11 group's | B3 |
| PR15 | PR15 | `starshot/v1-pr15-core-wasm` | the PR13 group's | B3 |
| PR16 | PR16, PR17 | `starshot/v1-pr16-cutover` | the PR15 group's | B3 |
| PR18 | PR18, PR19 | `starshot/v1-pr18-rails-fuel` | the PR16 group's | C1 |
| PR20 | PR20, PR21 | `starshot/v1-pr20-capture-cues` | the PR18 group's | C1 |
| PR22 | PR22, PR23, PR24 | `starshot/v1-pr22-time-windows-saves` | the PR20 group's | C1 |
| PR25 | PR25, PR26, PR27 | `starshot/v1-pr25-renderer` | the PR22 group's | D1 |
| PR28 | PR28, PR29 | `starshot/v1-pr28-audio-settings` | the PR25 group's | D1 |
| PR30 | PR30, PR31 | `starshot/v1-pr30-firebase` | the PR28 group's | E1 |
| PR32 | PR32, PR33 | `starshot/v1-pr32-verify-hosting` | the PR30 group's | E1 |
| PR34 | PR34, PR35, PR36 | `starshot/v1-pr34-levels` | the PR32 group's | F1 |
| PR37 | PR37, PR38, PR39 | `starshot/v1-pr37-release-prep` | the PR34 group's | F1 |
| PR40 | PR40 | `starshot/v1-pr40-astlo-kit` | the PR37 group's | F1 |
| Master review | the whole stack | fixes on `starshot/v1-master-fixes` | the PR40 group's | last |

Members are consecutive and every dependency in the table above sits in the same group
or an earlier one, so the stack stays linear. Groups pair specs that share a domain and
a review lens. Examples: the GameScreen split, the gates, the Python rails tool, each
Rust crate, the cut-over with its deletion, the flight model, the renderer, the online
pieces, the levels and the release preparation. PR6 and PR15 stand alone because each
brings a new toolchain or a new runtime boundary, and PR40 because it is astlo work, not
Starshot's. The master review is defined in D30.

## What PR0 carries

PR0 is this plan's own pull request, on `starshot/pr0-bootstrap` (the bootstrap branch,
D8). The list below matches the PR0 commits; the PR2 group's builder confirms each path with
`git ls-files` before starting. A missing item is logged in
[05-deviation-log.md](05-deviation-log.md) and joins the Band A PR whose topic it
matches: copy and work tracking go to PR4, licences and credits to PR5, size to PR3.

- **The plan and the decisions:** `docs/plans/v1-starshot/` (these six files),
  `docs/decisions.md` D12 to D30 with the supersession notes on D3, D4, D5, D7, D10 and D25, and
  `docs/astlo/directions.md`.
- **The licence switch (D12):** `LICENSE` (Apache-2.0), `LICENSES/` (`Apache-2.0`,
  `CC-BY-4.0`, `LicenseRef-astlo`, `LicenseRef-starshot-brand`), `REUSE.toml`, the
  `license` fields of the four `package.json` files, `NOTICE.md`, `README.md`,
  `CONTRIBUTING.md`, `TRADEMARK.md`, `CREDITS.md`, `apps/game/public/brand/`.
- **Governance:** `CODE_OF_CONDUCT.md` (Contributor Covenant 3.0), `GOVERNANCE.md`,
  `SUPPORT.md`, `.github/ISSUE_TEMPLATE/` (bug, feature, level idea, physics
  discrepancy, `config.yml`), `.github/labels.yml`, `.github/dco.yml`, the PR template.
- **Gates:** `licence` (`scripts/check-licence.mjs`: REUSE coverage, `LICENSES/`,
  `LICENSE`, package licences, media credited in `CREDITS.md`); `copy`
  (`scripts/check-copy-tells.mjs`, `scripts/copy-tells.json`, `docs/copy-standard.md`;
  prose, UI strings and the branch's commit messages); `size`
  (`scripts/check-file-size.mjs`, `scripts/size-baseline.json`; size, shape and
  layering); the `copy-lint` workflow for issue, comment and PR text; a full-history
  checkout in `ci.yml`.
- **Copy fixes** across the docs, `python/astlo/VERIFICATION.md` (Starshot's file) and
  the UI strings, so the copy gate starts green.
- **Issues as code** (D23): `scripts/sync-work.mjs`, `scripts/lib/yaml-lite.mjs`, `scripts/lib/github-rest.mjs`, the fixture under `scripts/fixtures/work/`, the `track-work` skill and `docs/README.md`.
- **CI hardening** (PR1's spec, built here by the owner's ruling, D30): least-privilege
  workflows with SHA-pinned actions, the `checks`, `workflow-lint`, `dependency-review`
  and `verify-game` jobs under the `gates` aggregator, Scorecard, Dependabot cooldowns,
  and annotations and a job summary from `scripts/gates.mjs`.
- **Commits:** the licence switch, the gates and the governance files landed as three
  signed-off commits authored by the owner (D24). The decisions, the plan, the
  directions document, a licence-label correction and the review fix pass follow in
  five more.

PR0's commits after D24 follow it; the earlier bootstrap commits predate it, which is why
the owner installs the DCO app only after PR0 merges ([04-ops-checklist.md](04-ops-checklist.md#github), G8).

## How to read a turnkey spec

Every Band A and Band B spec has the same parts. It says where the PR sits in the stack,
the goal, the files with what changes in each, the symbols and sketches, and the edge
cases. Then come the proof (tests and commands, each reported with its exit code), what
the adversary checks, and what is out of scope. Branches are `starshot/v1-prNN-<topic>`
with a two-digit number, and each bases on the branch of the PR directly below it. Every
PR adds a line under `## [Unreleased]` in `CHANGELOG.md` when a player or a contributor
would notice it. No PR touches a `version` field (AGENTS.md, non-negotiable 10).
Re-locate by symbol; line numbers are anchors only. Since D30 a spec's Branch line gives
way to its group's row in the [PR groups](#pr-groups-d30) table, which names the branch
and its base.

## Band A: foundations (turnkey)

### PR1: CI hardening

- **Branch** none: built on `starshot/pr0-bootstrap` as part of PR0 (#1), by the
  owner's ruling (D30).
  **Issue** `v1-ci-hardening`. **Decisions** D28, AGENTS.md non-negotiables 4 and 9.
  **Size** about 330 lines, 11 files.
- **Goal.** Every workflow runs with least privilege and SHA-pinned actions. The one
  required check keeps the name `gates` however many jobs CI grows. Workflows are
  linted. The game's play-through (`scripts/verify-game.mjs`) runs on every PR and feeds
  `gates` (register R19). Failures surface as annotations and a job summary.

| File | Change |
|---|---|
| `.github/workflows/ci.yml` | Top-level `permissions: {}`. Rename today's job from `gates` to `checks` (`name: checks`) with `permissions: contents: read`; keep its steps (the private-name scan before `npm ci`, the full-history checkout, `npm run gates`) and add `# zizmor: ignore[secrets-outside-env]` on the `STARSHOT_PRIVATE_NAMES` line, pointing at the reason already written above it. New jobs `workflow-lint`, `dependency-review`, `verify-game`, and the aggregator `gates` (sketches below) |
| `.github/workflows/pages.yml` | Top-level `permissions: {}`; `build` gets `name: build` and `contents: read`; `deploy` gets `name: deploy` and keeps `pages: write` and `id-token: write`, each with a one-line comment saying why; remove `cache: npm` from the deploy build so a published build never restores a cache a PR could have written |
| `.github/workflows/astlo.yml` | Top-level `permissions: {}`; the job gets `contents: read`; a comment on the PyPI install step saying its dependencies are unpinned on purpose (Mark's wheel declares them) |
| `.github/workflows/copy-lint.yml` | (PR0's.) Pin its actions. Add `# zizmor: ignore[dangerous-triggers]` on the `pull_request_target` line with the reason in its header (base checkout only, text through environment variables), after confirming the checkout step does not use the PR's head ref. Give each job explicit permissions |
| `.github/workflows/scorecard.yml` | New. Triggers: `push` to `main`, a weekly `schedule`, `workflow_dispatch`. Top-level `permissions: {}`; the job: `contents: read`, `security-events: write`, `id-token: write`, `actions: read`. Steps: checkout (`persist-credentials: false`), `ossf/scorecard-action` with `results_file: results.sarif`, `results_format: sarif`, `publish_results: true`, then `github/codeql-action/upload-sarif` |
| `.github/dependabot.yml` | `cooldown: { default-days: 7 }` on both ecosystems; `github-actions` weekly, npm monthly |
| `scripts/gates.mjs` | When `GITHUB_ACTIONS` is `true`: print `::error title=gate <id>::<summary>` for each failed gate, with `%`, CR and LF escaped as `%25`, `%0D`, `%0A`; append the results table as Markdown to the file named by `GITHUB_STEP_SUMMARY` |
| `scripts/verify-game.mjs` | Header comment only: it now runs in CI as the `verify-game` job, which installs Playwright for that run; Playwright is still not a project dependency |
| `docs/hosting.md` | Under "Make the checks required": the required check stays `gates`, now an aggregator over `checks`, `workflow-lint`, `dependency-review` and `verify-game` |
| `.claude/README.md` | The `BROWSER_CHANNEL` row: CI runs the same script in the `verify-game` job |
| `CHANGELOG.md` | `[Unreleased]` entry |

Pins. Every `uses:` names a full commit SHA with the tag in a comment on the same line
(`uses: actions/checkout@<sha> # v7.0.1`), so Dependabot can update both. The CI research
resolved these on 2026-11-01. Re-resolve each with
`git ls-remote https://github.com/<owner>/<repo> 'refs/tags/<tag>*'`, using the peeled
`^{}` SHA for annotated tags. Take the newest release tag of the same major, and list
tag and SHA in the PR body: `actions/checkout` v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1`;
`actions/setup-node` v7.1.0 `949feb2413d6458794dcd2491c4babbbce0c15c1`;
`actions/setup-python` v7.1.0 `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0`;
`actions/upload-artifact` v7.0.2 `cf430e030ddbb5b0abf93d22962f4752f3646cd9`;
`actions/configure-pages` v6.0.0 `45bfe0192ca1faeb007ade9deae92b16b8254a0d`;
`actions/upload-pages-artifact` v5.0.0 `fc324d3547104276b827a68afc52ff2a11cc49c9`;
`actions/deploy-pages` v5.0.1 `368f82528645a54fb793d4d04e342629a3f51346`. Resolve the
newest tags of `actions/dependency-review-action` (v5 line), `ossf/scorecard-action`
(v2 line) and `github/codeql-action` the same way.

New jobs in `ci.yml` (sketch):

```yaml
  workflow-lint:
    name: workflow-lint
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@<sha> # v7.0.1
        with: { persist-credentials: false }
      - run: pipx run zizmor==1.31.1 --offline .github/

  dependency-review:
    name: dependency-review
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@<sha> # v7.0.1
        with: { persist-credentials: false }
      - uses: actions/dependency-review-action@<sha> # v5.x.y
        with: { fail-on-severity: high }

  verify-game:
    name: verify-game
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions: { contents: read }
    env: { PLAYWRIGHT_VERSION: "<exact version from npm view playwright version>" }
    steps:
      - checkout, setup-node (node-version-file: .nvmrc, cache: npm), npm ci, npm run build
      - run: |
          npm install --global "playwright@${PLAYWRIGHT_VERSION}"
          echo "NODE_PATH=$(npm root -g)" >> "$GITHUB_ENV"
      - run: playwright install --with-deps chromium
      - run: node scripts/verify-game.mjs --out "$RUNNER_TEMP/verify-game"
      - if: always()
        uses: actions/upload-artifact@<sha> # v7.0.2
        with: { name: verify-game-screenshots, path: "${{ runner.temp }}/verify-game", retention-days: 7 }

  gates:
    name: gates
    if: always()
    needs: [checks, workflow-lint, dependency-review, verify-game]
    runs-on: ubuntu-latest
    permissions: {}
    steps:
      - name: Fail if any needed job failed or was cancelled
        if: contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')
        run: exit 1
```

- **Edge cases.** `dependency-review` is skipped on `push`. A skipped job counts as
  success, so `gates` still passes on `main`. Forks get no secrets: the private-name
  step already says its rule is off. The global Playwright install never touches
  `package.json` or `package-lock.json`. zizmor may report findings not listed in the
  research. Fix each, or suppress it inline with its reason, and list them in the PR
  body.
- **Proof.** `npm run gates` exits 0. `pipx run zizmor==1.31.1 --offline .github/` exits
  0. `git grep -nE 'uses: [^ ]+@v[0-9]' -- .github/workflows` prints nothing.
  `GITHUB_ACTIONS=true GITHUB_STEP_SUMMARY="$(mktemp)" node scripts/gates.mjs --only secrets`
  writes a Markdown table to that file. On the pushed PR: `checks`, `workflow-lint`,
  `dependency-review`, `verify-game` and `gates` are green and the artifact
  `verify-game-screenshots` downloads.
- **Adversary checks.** Every job states its permissions and none is broader than its
  steps need. No `pull_request_target` other than copy-lint's, and that one never checks
  out PR code. The aggregator fails on `cancelled` as well as `failure`. The secrets
  step still runs before `npm ci`. Every SHA has its tag comment. The Pages deploy job's
  permissions are unchanged. `gates.mjs` escapes annotation text.
- **Out of scope.** Rust jobs (PR6), PR text and size checks (PR4), release automation
  (PR38), a Dependabot auto-merge workflow (not in this program).

### PR2: GameScreen split, render loop

- **Branch** `starshot/v1-pr02-screen-split-render`, based on PR1's.
  **Issue** `v1-screen-split-render`. **Decisions** D28, D6.
  **Size** about 500 lines, most of them moved; warns, does not fail.
- **Goal.** Move the pure helpers and the canvas render loop out of
  `apps/game/src/ui/GameScreen.tsx` (1,025 lines, 914 code lines in
  `scripts/size-baseline.json`) with no change in behaviour, so PR3 can finish the split.

| File | Change |
|---|---|
| `apps/game/src/ui/screen/status.ts` | New: `COACH_TEXT`, `trainingZoneLabel`, `scoringRulesFor`, `flightSummary`, `statusFor`, moved unchanged and exported |
| `apps/game/src/ui/screen/markers.ts` | New: `buildMarkers`, `buildGhost` |
| `apps/game/src/ui/screen/layout.ts` | New: `measureInsets`, `overlapArea`, `placeCoach` |
| `apps/game/src/ui/screen/defaultAim.ts` | New: `defaultAim`, importing `round` from `apps/game/src/util/round.ts` |
| `apps/game/src/util/round.ts` | New: `round(x, step)`, moved from GameScreen.tsx. Both call sites import it: `defaultAim.ts`, and GameScreen.tsx's drag and nudge handlers (PR3 moves them into `useAimState`) |
| `apps/game/src/flight/useFlightPlayback.ts` | New hook that owns flight playback: the `FlightAnim` type, `flightRef`, `stepFlight`, `FAST_FORWARD`, and `beginFlight(res: ShotResponse): { et: number; slowedBy: PlanetId \| null }`, which is the block in `fire` that builds the `FlightAnim` (flight seconds from the flight days, 0.6 of them with reduced motion) and returns the starting clock. `fire` passes that clock to `setClock` |
| `apps/game/src/ui/screen/usePrefersReducedMotion.ts` | New: `usePrefersReducedMotion` |
| `apps/game/src/ui/screen/useSceneRenderer.ts` | New hook that owns the canvas loop (sketch below) |
| `apps/game/src/ui/GameScreen.tsx` | Imports the above; keeps state, handlers and JSX; `fire` calls `beginFlight` |
| `scripts/size-baseline.json` | Lowered with `node scripts/check-file-size.mjs --update` (it only lowers) |

`useSceneRenderer` takes over, unchanged in logic: the refs `canvasRef`, `camRef`,
`vpRef`, `dprRef`, `starRef`, `userMovedRef`, `frameRef`, `animUntilRef`, `burstRef`,
`fitScaleRef` and `insetsDirty`; the callbacks `draw`, `requestDraw`, `poke` and `refit`;
`maxPull`; the resize, redraw and teardown effects; the constant `DPR_CAP`. It advances a
flight by calling the `stepFlight` of the `useFlightPlayback` object it receives. It reads the per-render inputs through the same
`latest` ref pattern the file uses today (the `snapshot` object).

```ts
// apps/game/src/ui/screen/useSceneRenderer.ts (shape; names of today's code kept)
export interface SceneSnapshot { /* the fields of today's `snapshot` object, typed */ }
export interface SceneRendererInput {
  readonly snapshot: SceneSnapshot;
  readonly rootRef: RefObject<HTMLDivElement | null>;
  readonly hudRef: RefObject<HTMLDivElement | null>;
  readonly controlsRef: RefObject<HTMLDivElement | null>;
  readonly coachRef: RefObject<HTMLDivElement | null>;
  readonly playback: FlightPlayback; // from useFlightPlayback: flightRef, stepFlight
}
export function useSceneRenderer(input: SceneRendererInput): SceneRenderer;
// SceneRenderer returns exactly what GameScreen still calls (canvasRef, pullRef,
// requestDraw, poke, refit, maxPull, and the camera operations the zoom buttons and
// gestures use); derive the list from the call sites.
// apps/game/src/flight/useFlightPlayback.ts
export function useFlightPlayback(input: {
  readonly reducedMotion: boolean;
  readonly fast: boolean;
  readonly onClock: (clock: { et: number; slowedBy: PlanetId | null }) => void;
  readonly onFlightEnd: (f: FlightAnim) => void;
}): FlightPlayback; // { flightRef, stepFlight, beginFlight }
```

- **Edge cases.** The coach mark's placement reads layout after paint
  (`useLayoutEffect`). Keep the effect order. Reduced motion must still shorten flights
  to 0.6 of their time. The `vibrate` calls stay where they are. No new state: the hook
  must not add a render.
- **Proof.** `npm run gates` exits 0 (`typecheck`, `test`, `size`, `copy`).
  `node scripts/check-file-size.mjs` reports GameScreen.tsx below its old baseline
  entry. `npm run build && node scripts/verify-game.mjs` exits 0, and its report shows
  the same counts as on PR0's branch (console 0, page errors 0, unnamed controls 0,
  small targets 0). The screenshots of both runs, compared side by side, show no
  difference. `git diff --color-moved=zebra --stat` in the PR body.
- **Adversary checks.** Moves are moves: a function body that changed is called out in
  the PR body with the reason. No module-level mutable state was introduced. Effects keep
  their dependency lists. No new file is over 300 code lines.
- **Out of scope.** State hooks (PR3). `draw.ts` and `styles.css` (they leave the
  baseline in PR25 and PR29).

### PR3: GameScreen split, state hooks

- **Branch** `starshot/v1-pr03-screen-split-state`, based on PR2's.
  **Issue** `v1-screen-split-state`. **Decisions** D28, D6.
  **Size** about 480 lines, most of them moved; warns.
- **Goal.** Move GameScreen's state and handlers into hooks. `GameScreen.tsx` becomes a
  thin view under 300 code lines and leaves `scripts/size-baseline.json`. It must not trip
  the shape heuristics: more than 12 hook calls, more than 8 `useState`, more than 10
  props, imports from more than 3 areas.

| File | Change |
|---|---|
| `apps/game/src/ui/screen/useAimState.ts` | New: `day`, `setDay`, `clampDay`, `launchEt`, `aim`, `setAim`, `fine`, `setFine`, the `shot` memo, `nudgeAngle`, `nudgeSpeed`, `pickDay`, and the drag handlers (`aimBeforeDrag`, `maxTensionBuzzed`, `endDrag`, the `useSlingshot` wiring) |
| `apps/game/src/ui/screen/useHintFlow.ts` | New: `hint`, `hintState`, `hintUsed`, `showHint`, `applyHint` |
| `apps/game/src/ui/screen/useFlightPhase.ts` | New: `phase` with `phaseRef` and `setPhase`, `flight`, `outcome`, `clock`, `fast`, `pendingLaunch`, `fire`, `launch`, `finish`, `skip`, `retry` |
| `apps/game/src/ui/screen/useKeyboardShortcuts.ts` | New: the `keyHandlers` ref and the `keydown` effect |
| `apps/game/src/ui/screen/useCoachMark.ts` | New: `coach`, `coachOn`, `dismissCoach` |
| `apps/game/src/ui/screen/useAnnouncer.ts` | New: `announcement` and the function that sets it |
| `apps/game/src/ui/GameScreen.tsx` | Composes the hooks and renders the JSX; under 300 code lines |
| `scripts/size-baseline.json` | GameScreen.tsx's entry removed by `node scripts/check-file-size.mjs --update` |
| `docs/architecture.md` | Under "`apps/game`: the game": one paragraph on the `ui/screen/` hooks |

- **Edge cases.** The launch gate (`launchGate` in `apps/game/src/sim/preview.ts`) must
  keep reading the same `preview` and `shot`, so preview still equals launch (D6). Hooks
  that need each other's values receive them as arguments. None reads another hook's
  internals. Keyboard shortcuts read the latest handlers through the ref, as today.
- **Proof.** As PR2, plus: `node scripts/check-file-size.mjs` prints no warning for
  GameScreen.tsx and the baseline no longer lists it. `npx vitest run apps/game` exits
  0. The `verify-game` job passes on the PR.
- **Adversary checks.** Every hook has one reason to exist. No hook returns more than
  about ten members. GameScreen.tsx holds no physics or scoring logic. No behaviour
  changed (compare the verify-game reports of PR0's branch and this group's).
- **Out of scope.** New features, copy changes, styles.

### PR4: Process checks

- **Branch** `starshot/v1-pr04-process-checks`, based on PR3's.
  **Issue** `v1-process-checks`. **Decisions** D23, D24, D25, D27, D30.
  **Size** about 330 lines, 9 files.
- **Goal.** The size cap becomes a check, commit messages get the secrets scan, the issues
  file becomes a gate, and the D23 and D24 conventions are written where contributors and
  the orchestrator read them.

| File | Change |
|---|---|
| `scripts/check-pr-size.mjs` | New. Runs `git diff --numstat <base>...HEAD`; excludes `package-lock.json`, `Cargo.lock`, `**/uv.lock`, `**/fixtures/**/*.json`, `data/ephem/**`, `packages/core-wasm/pkg/**`, binary files (numstat `-`); counts added lines and changed files; prints both. The group's member count n (D30) comes from `--members <n>`, else from the PR groups table in `docs/plans/v1-starshot/00-plan.md` (or `--plan <path>`): the number of `PRnn` ids in the Members cell of the row whose Branch is the head branch (`GITHUB_HEAD_REF`, else the current branch), at least 1; a branch the table does not list, the master review's row included, counts 1. A PR title cannot raise it. Warns (`::warning::` in Actions) above n times 400 lines or n times 20 files; exits 1 above twice that. Base: `--base <ref>`, else `GITHUB_BASE_REF`, else `origin/main` |
| `scripts/check-commits.mjs` | New gate `commits` (group `hygiene`, fast). For each commit in `<base>..HEAD` (base as above): pipes `%an <%ae>%n%B` through `node scripts/check-secrets.mjs --stdin` and fails on any finding; warns when a commit has no `Signed-off-by:` (the DCO app is the enforcement) |
| `scripts/gates.mjs` | Register `commits`; register `work` (`node scripts/sync-work.mjs --program v1-starshot --check`, group `hygiene`, fast) unless an entry that runs `scripts/sync-work.mjs` already exists |
| `scripts/sync-work.mjs` | (PR0's.) `--check` with no `--program` checks every folder under `docs/plans/` that holds a `*work.yaml`, prints one line per program, and exits 1 if any disagrees with its lock. A new `--plans-dir <path>` (default `docs/plans`) lets the self-test point it elsewhere |
| `scripts/fixtures/work/plans/` | Two fixture programs: `agrees/` (a `work.yaml` and a matching `work.lock.json`) and `drifts/` (a lock that names a slug the YAML lacks). `--self-test` asserts that `--check --program agrees --plans-dir scripts/fixtures/work/plans` passes, and that `--check --plans-dir scripts/fixtures/work/plans` exits 1 naming `drifts` |
| `.github/workflows/ci.yml` | New job `pr-size` (`pull_request` only; `contents: read`; full-history checkout; `node scripts/check-pr-size.mjs --base "origin/${GITHUB_BASE_REF}"`) added to the aggregator's `needs` |
| `CONTRIBUTING.md` | New section "Claiming work, the board and status comments": `agent-ready` issues are for agents through the orchestrator; outside contributors claim by comment; `Part of #n` inside a stack and `Closes #n` where the work reaches `main`; the two status comment templates below |
| `.claude/skills/stacked-pr/SKILL.md` | New section "Commit authorship (D24)" with the publish recipe below, unless the skill already carries it |
| `.claude/README.md` | `GATE_COMMANDS` row lists `commits` and `work` |
| `docs/hosting.md` | The ruleset step: `gates` stays the one required check. The copy-lint workflow's `copy` check may be added once it has run on a pull request (owner step G6) |
| `CHANGELOG.md` | `[Unreleased]` entry |

Status comments (D23), posted by the orchestrator:

```text
Claimed. Branch starshot/v1-prNN-<topic>. Spec: docs/plans/v1-starshot/00-plan.md#<anchor>.
Done in #<pr>. Gates: <n>/<n> passed, exit 0. Evidence: <one line per proof command>.
```

The publish recipe (D24), run by the orchestrator only:

```bash
# Author: the owner. Committer: the session identity, the one the platform signs for.
# The message file ends with Co-Authored-By, the session link and the owner's
# Signed-off-by line, typed in. Never -s: it would sign off as the committer.
git commit --author="Harmon Amakobe <73005556+harmon-amakobe@users.noreply.github.com>" -F <message-file>
git log -1 --format='%an <%ae>%n%cn <%ce>%n%(trailers)'
node scripts/check-secrets.mjs --stdin < <message-file>
node scripts/check-copy-tells.mjs --stdin --kind commit < <message-file>
```

- **Edge cases.** A PR from a fork has no `origin/<base>` until fetched: the job fetches
  the base ref first. Pure renames count zero added lines. `check-commits.mjs` on `main`
  with no base finds no range and passes, saying so.
- **Proof.** `npm run gates` exits 0 with `commits` and `work` listed.
  `node scripts/sync-work.mjs --self-test` passes, the two-program case included, and
  `node scripts/sync-work.mjs --check` (no program) checks every program under `docs/plans/`.
  `node scripts/check-pr-size.mjs --base starshot/v1-pr02-screen-split --members 2`
  prints this group's counts and its cap.
  `GITHUB_HEAD_REF=starshot/v1-pr04-process-licence node scripts/check-pr-size.mjs --base starshot/v1-pr02-screen-split`
  prints n = 2, and with an unlisted head branch it prints n = 1. A scratch commit whose
  message contains a planted `ghp_` token makes
  `node scripts/check-commits.mjs` exit 1 (then drop the commit). The `pr-size` job is
  green on the PR.
- **Adversary checks.** No new token or secret is needed. Nothing writes to issues from
  CI. The size thresholds match `PR_SIZE_CAP`. The publish recipe never runs in a
  builder.
- **Out of scope.** Applying `sync-work.mjs` (the orchestrator does it), project field
  automation from CI (refused, R15).

### PR5: Licence and assets gates

- **Branch** `starshot/v1-pr05-licence-assets`, based on PR4's.
  **Issue** `v1-licence-assets`. **Decisions** D12, D14, D15, D28.
  **Size** about 400 lines, 10 files.
- **Goal.** Dependencies are checked against a licence allow-list. Every shipped asset
  has a manifest entry with source, licence, attribution and hash. The assets sections
  of `CREDITS.md` are generated from that manifest, so the in-game credits (PR37) and
  the file can never disagree.

| File | Change |
|---|---|
| `scripts/licence-allow.json` | New: `allowed` (`MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `0BSD`, `CC0-1.0`, `BlueOak-1.0.0`, `Unlicense`, `CC-BY-4.0`) and `exceptions` (an array of `{ package, version, licence, reason }`, empty at first) |
| `scripts/check-dependency-licences.mjs` | New gate `dependency-licences` (hygiene, fast). Reads `package-lock.json` `packages`, skips the workspace's own entries, evaluates each `license` as an SPDX expression (`OR` passes when one side is allowed, `AND` when both are, parentheses respected); a missing or disallowed licence fails unless listed in `exceptions`. A `cargo` part arrives in PR6 |
| `apps/game/assets/manifest.json` | New, schema `assets.manifest/1`: `{ "schema", "assets": [ ... ] }`. Entry fields: `id`, `kind` (`texture`, `image`, `audio`, `font`, `data`), `title`, `files` (repository paths), `source` (`{ "kind": "original" }` or `{ "kind": "url", "url", "retrieved", "sha256" }`), `licence` (SPDX id or `LicenseRef-`), `attribution`, `modifications`, `aiGenerated` (must be `false`, D15), optional `tiers` and `separateDataFile`. First entry: `apps/game/public/icon.svg` as `LicenseRef-starshot-brand`, original |
| `scripts/check-assets.mjs` | New gate `assets` (hygiene, fast): every file under `apps/game/public/` except `sw.js`, `manifest.webmanifest` and `*.md` (notes such as `brand/README.md` are not assets), and every file a manifest entry names, is listed exactly once with a matching SHA-256 of its bytes; licences must be in `CC-BY-4.0`, `CC0-1.0`, `LicenseRef-NASA-Media`, `LicenseRef-starshot-brand`, `Apache-2.0`, `OFL-1.1`, or `CC-BY-SA-4.0` only with `separateDataFile: true`; any `-NC` or `-ND` licence fails; `aiGenerated: true` fails |
| `scripts/gen-credits.mjs` | New: writes the asset sections of `CREDITS.md` between `<!-- assets:start -->` and `<!-- assets:end -->` (grouped by `kind`, one line per entry with title, attribution and licence); `--check` exits 1 when the file would change. Registered as gate `credits` (hygiene, fast) |
| `scripts/check-licence.mjs` | (PR0's.) Remove its "media credited in CREDITS.md" rule (re-locate by the string `CREDITS.md`), which `check-assets.mjs` now owns; nothing else changes |
| `CREDITS.md` | Gains the two markers around today's asset sections; content regenerated |
| `scripts/gates.mjs` | Register the three gates |
| `CONTRIBUTING.md` | New section "Adding an asset": the manifest entry, the hash command, `node scripts/gen-credits.mjs` |
| `CHANGELOG.md` | `[Unreleased]` entry |

- **Edge cases.** `package-lock.json` entries with no `license` field fail with the
  package name and a hint to add an exception with a reason. Licences given as objects or
  arrays in old packages are normalised before evaluation. An SVG is hashed as bytes, like
  any other file.
- **Proof.** `npm run gates` exits 0 with `dependency-licences`, `assets` and `credits`.
  A scratch manifest entry with `CC-BY-NC-4.0` makes `node scripts/check-assets.mjs`
  exit 1. Editing `CREDITS.md` between the markers by hand makes
  `node scripts/gen-credits.mjs --check` exit 1. The PR body lists every licence found
  in the lockfile with its count.
- **Adversary checks.** No dependency was added to make the checks pass. The allow-list
  holds no copyleft licence. The manifest schema has room for PR26's tiers without a
  rewrite. One gate owns each rule.
- **Out of scope.** Textures and audio themselves (Band D). The Cargo part (PR6).

## Band B: the Rust core (turnkey)

Rules for every Band B PR, from D16:

- Logic crates carry `#![forbid(unsafe_code)]`.
- No `mul_add`, fast-math flags, `target-cpu` tuning, relaxed SIMD or threads in the
  simulation. Every transcendental function comes from `starshot-math`.
- The port keeps the TypeScript operation order. Arithmetic-only paths then match the
  TypeScript results bit for bit, and paths with `sin`, `cos`, `pow` and the like match
  within the stated tolerance.
- The TypeScript packages stay untouched, except for their conformance tests, until PR17.
- Rust tests read shared data from the top-level `fixtures/` tree with `include_str!` or
  `include_bytes!`.

### PR6: Rust workspace and starshot-math

- **Branch** `starshot/v1-pr06-rust-workspace`, based on PR5's.
  **Issue** `v1-rust-workspace`. **Decisions** D16, D28. **Size** about 380 lines,
  16 files, plus the generated golden file.
- **Goal.** A Cargo workspace with a pinned toolchain and one maths crate, the only place
  transcendental functions live. A golden file of its exact results is checked on x86_64
  and arm64, and the Rust gates join the registry.

| File | Change |
|---|---|
| `Cargo.toml` | New workspace: `members = ["crates/*"]`, `resolver = "3"`; `[workspace.package]` `edition = "2024"`, `license = "Apache-2.0"`, `rust-version = "1.97"`, `publish = false`; `[workspace.dependencies]` `libm = "=0.2.16"`, `serde_json = "1"`; `[workspace.lints.rust] unsafe_code = "forbid"` (every crate's `Cargo.toml` says `[lints] workspace = true`); `[profile.release]` `opt-level = "s"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`, `strip = true`; `[profile.test] opt-level = 2` (timing tests run optimised) |
| `rust-toolchain.toml` | `channel = "1.97.0"`, `profile = "minimal"`, `components = ["rustfmt", "clippy"]`, `targets = ["wasm32-unknown-unknown"]` |
| `clippy.toml` | `disallowed-methods`: `f64::` and `f32::` `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sin_cos`, `sinh`, `cosh`, `tanh`, `exp`, `exp2`, `exp_m1`, `ln`, `ln_1p`, `log`, `log2`, `log10`, `powf`, `powi`, `cbrt`, `hypot`, `mul_add`, each with the reason "use starshot_math (D16: identical bits on every runtime)" |
| `crates/starshot-math/Cargo.toml`, `src/lib.rs` | New. `pub fn` wrappers over `libm` for `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `exp`, `ln`, `log10`, `pow`, `cbrt`, `hypot`; `sqrt` as `f64::sqrt` (IEEE-exact, allowed); `pub const DEG: f64 = core::f64::consts::PI / 180.0`. Crate docs say why it exists |
| `crates/starshot-math/examples/gen_golden.rs` | New: prints `fixtures/math/golden.json` (sketch below) |
| `crates/starshot-math/tests/golden.rs` | New: every case's output bits equal the file's |
| `fixtures/math/golden.json` | Generated: `cargo run -p starshot-math --example gen_golden > fixtures/math/golden.json` |
| `scripts/gates.mjs` | Gates `rust-fmt` (`cargo fmt --all --check`), `rust-clippy` (`cargo clippy --workspace --all-targets --locked -- -D warnings`), `rust-test` (`cargo test --workspace --locked`), group `rust`, `needsCargo: true`. When `cargo --version` fails: if `STARSHOT_REQUIRE_RUST` is `1` the gate fails; otherwise it reports `skip` with "cargo not found; set STARSHOT_REQUIRE_RUST=1 to fail instead", and the last line reads `gates: P/N passed, S skipped`. A skip never counts as a pass in that line |
| `scripts/check-dependency-licences.mjs` | Cargo part: `cargo metadata --format-version 1 --locked`, each package's `license` through the same allow-list, with the same skip rule |
| `scripts/check-file-size.mjs` | (PR0's.) Layering also scans `crates/`: an `include_str!`, `include_bytes!` or `#[path]` that resolves under `python/` or `third_party/` fails |
| `.github/workflows/ci.yml` | `checks`: env `STARSHOT_REQUIRE_RUST: "1"` and the `setup-rust-wasm` action before `npm run gates`. New job `rust-arm64` on `ubuntu-24.04-arm`: checkout, the action with `wasm-bindgen: "false"`, `cargo test --workspace --locked`; added to the aggregator's `needs` |
| `.github/actions/setup-rust-wasm/action.yml` | New composite action, the one way CI gets Rust: installs rustup with the official script if the runner lacks it; `rustup show` (installs the toolchain, `rustfmt`, `clippy` and the `wasm32-unknown-unknown` target named in `rust-toolchain.toml`); `Swatinem/rust-cache` pinned by SHA (it also caches `~/.cargo/bin`); then, unless the input `wasm-bindgen` is `"false"`, `cargo install --locked wasm-bindgen-cli --version 0.2.130` when that version is not already installed. PR15 pins the `wasm-bindgen` crate to the same version |
| `.github/dependabot.yml` | `cargo` ecosystem, monthly, cooldown 7 days |
| `.gitignore` | `/target/` |
| `CONTRIBUTING.md`, `docs/architecture.md`, `CHANGELOG.md` | The Rust toolchain is needed to change physics (D16); the crate layout; `[Unreleased]` |

```text
fixtures/math/golden.json
{ "schema": "starshot.math-golden/1",
  "generator": "cargo run -p starshot-math --example gen_golden",
  "cases": [ { "fn": "sin", "x": "<16 hex digits>", "out": "<16 hex digits>" },
             { "fn": "pow", "x": "...", "y": "...", "out": "..." }, ... ] }
```

Inputs: 256 per function, made as `lo + (hi - lo) * (i as f64) / 255.0`, plus the
special values `0`, `-0`, `1` and `-1` where valid.

- `sin`, `cos`, `tan`: -7 to 7, and -1e4 to 1e4.
- `asin`, `acos`: -1 to 1. `atan`: -1e3 to 1e3. `atan2`: a 16 by 16 grid over -1e3 to 1e3.
- `exp`: -700 to 700. `ln`, `log10`: 1e-6 to 1e12.
- `pow`: `y` in `-0.2`, `0.4`, `1.5` and `2.0 / 3.0` (the exponents the code uses), `x`
  from 1e-6 to 1e6.
- `cbrt`: -1e9 to 1e9. `sinh`, `cosh`, `tanh`: -20 to 20. `hypot`: a 16 by 16 grid.

- **Edge cases.** A contributor without Rust runs `npm run gates` and sees three skips,
  not a failure and not a silent pass. That promise lasts until PR15: from PR15 Rust is
  required to build from source, and a missing toolchain fails (PR15's spec). `cargo clippy` must reject a planted `x.sin()` in
  a scratch crate. Nothing in `starshot-math` calls an `f64` transcendental method.
- **Proof.** AC2 commands exit 0. `cargo test -p starshot-math --locked` passes on x86_64
  and in the `rust-arm64` job: that run is the first measurement of arm64 bits (register
  item in [01-research.md](01-research.md#still-not-verified)). `npm run gates` with
  cargo on `PATH` and with it removed shows the two behaviours above.
- **Adversary checks.** `libm` is pinned exactly. No `build.rs`. No `unsafe`. The golden
  generator's inputs come only from IEEE arithmetic. The skip line cannot be misread as
  a pass. The toolchain pin matches the CI jobs.
- **Out of scope.** Any physics. Wasm builds (PR15).

### PR7: Ephemeris tool and Horizons fixtures

- **Branch** `starshot/v1-pr07-ephem-tool`, based on PR6's.
  **Issue** `v1-ephem-tool`. **Decisions** D17, D4. **Size** about 430 lines, 15 files.
- **Goal.** One Starshot-owned Python project for ephemeris work, replacing
  `tools/horizons/`, with a Horizons client that records what Horizons said about itself,
  a verified kernel download, and a refreshed fixture that adds the Moon and Earth's
  centre.

| File | Change |
|---|---|
| `tools/ephem/pyproject.toml` | New. Created with `uv init --lib --build-backend uv --name starshot-ephem tools/ephem`, then: `requires-python = ">=3.12"`, dependencies `jplephem==2.24` and `numpy` pinned to the version `uv lock` resolves, dev group `pytest`, script `starshot-ephem = "ephem.cli:main"`. The import package is `ephem` (`[tool.uv.build-backend] module-name = "ephem"`, code in `tools/ephem/src/ephem/`); PyEphem uses the same import name, and this project never installs PyEphem |
| `tools/ephem/uv.lock` | Generated by `uv lock --project tools/ephem` |
| `tools/ephem/src/ephem/horizons.py` | `fetch_vectors(command: str, center: str, epochs_jd_tdb: list[float], *, cache_dir: Path) -> dict` using `urllib` only; the request parameters of today's `tools/horizons/fetch_fixtures.py` (`fetch`); on-disk cache keyed by the SHA-256 of the query; retries on HTTP 429 and 503 with backoff (1, 2, 4, 8, 16 s); returns `{ "rows", "api_signature" (the JSON `signature.version`), "ephemeris_source" (the `{source: ...}` text in the result header), "fetched_utc", "query" }` |
| `tools/ephem/src/ephem/kernel.py` | `ensure_kernel(path: Path) -> Path`: downloads `https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp` if absent and checks MD5 `3917ee56769db332790c751e2168843d`, else raises |
| `tools/ephem/src/ephem/fixtures.py` | `write_horizons_fixture(out: Path)`: today's eight heliocentric targets at today's five epochs, unchanged in shape under `states`; plus `geocentric.moon` (target `301`, center `500@399`) and `heliocentric_extra.earth` (target `399`, center `500@10`) at the same epochs; top-level `fetched_utc`, `api_signature`, `ephemeris_source`, `queries` |
| `tools/ephem/src/ephem/cli.py` | `main()` with subcommands `fixtures --out PATH` and `kernel --path PATH` |
| `tools/ephem/tests/test_horizons.py`, `tests/data/horizons_sample.json` | Parses a small committed sample response: rows, signature, source |
| `tools/ephem/tests/test_fixture.py` | The committed fixture has every target and the metadata keys, and its epochs equal the five in `fixtures.py` |
| `tools/ephem/README.md` | What the tool does, the commands, the dependency licences (jplephem MIT, numpy BSD-3-Clause), the fair-use rule (never at runtime), and the interface of the growth path (D29): `generate(kernel, bodies, window, tolerance) -> Pack` and `validate(pack, reference) -> Report` in `tools/ephem/src/ephem/generate.py` and `validate.py`, which PR8 implements; the CLI stays a thin layer over them |
| `tools/ephem/src/ephem/__init__.py` | Exports the public functions only. Tests import from `ephem`, never from a private module, and test behaviour and file formats, not internals, so another implementation could satisfy them (D29) |
| `packages/ephemeris/test/fixtures/horizons.json` | Regenerated in place with `uv run --project tools/ephem --locked starshot-ephem fixtures --out packages/ephemeris/test/fixtures/horizons.json` (PR9 moves it) |
| `tools/horizons/fetch_fixtures.py` | Deleted, with every reference updated (`git grep -n fetch_fixtures`) |
| `.github/workflows/ephem.yml` | New, path-filtered on `tools/ephem/**`, `data/ephem/**` and itself (so never a required check): `permissions: {}`, job `contents: read`, `astral-sh/setup-uv` pinned, `uv sync --project tools/ephem --locked`, `uv run --project tools/ephem --locked pytest tools/ephem/tests -q` |
| `.github/dependabot.yml` | `uv` ecosystem for `/tools/ephem`, monthly, cooldown 7 days |
| `.gitignore` | `tools/ephem/.cache/`, `tools/ephem/.venv/`, `*.bsp` |
| `CHANGELOG.md` | `[Unreleased]` entry |

- **Edge cases.** Horizons answers with an error string inside a 200 response. The
  parser raises with the message. The fixture's heliocentric values may change in the
  last digits. Today's TypeScript budgets must still pass on them. No network in the
  tests.
- **Proof.** `uv run --project tools/ephem --locked pytest tools/ephem/tests -q` passes
  with the network off (`--offline`). `npx vitest run packages/ephemeris` passes on the
  refreshed fixture. `git grep -n fetch_fixtures` prints nothing.
- **Adversary checks.** No secret or token. The kernel is never committed. The cache is
  ignored. The request parameters match the old script's, so the heliocentric states
  mean the same thing. The fixture names its Horizons version and source.
- **Out of scope.** Rails (PR8). Moving the fixture (PR9).

### PR8: DE440 rails pack

- **Branch** `starshot/v1-pr08-ephem-rails`, based on PR7's.
  **Issue** `v1-ephem-rails`. **Decisions** D17, D29. **Size** about 450 lines, 17 files,
  plus 31 generated data files.
- **Goal.** Fit Chebyshev rails from `de440s.bsp` for 1950 to 2150, write them as an
  `ephem.pack/1` pack of self-describing decade files, validate every body every 5 days
  against the kernel, and commit pack and reports.

Bodies and fit parameters (the measured 100 km tier):

| Body | NAIF target, center | Segment | Degree |
|---|---|---|---|
| MERCURY | 1, 10 | 32 days | 12 |
| VENUS | 2, 10 | 256 days | 15 |
| EMB | 3, 10 | 256 days | 12 |
| MARS | 4, 10 | 512 days | 17 |
| JUPITER, SATURN, URANUS, NEPTUNE | 5 to 8, 10 | 512 days | 8 |
| MOON | 301, 399 | 32 days | 15 |

Heliocentric positions are the barycentre minus the Sun (10), both relative to the solar
system barycentre; the geocentric Moon is (301 relative to 3) minus (399 relative to 3).
Frame: ecliptic J2000; units km and ET.

Decade file layout (little-endian), one file per decade from 1950 to 2140, each decade
starting at ET of `YYYY-01-01T00:00:00 TDB` (`(date - 2000-01-01).days * 86400 - 43200`):

```text
offset 0   4 bytes  "SSEP"
       4   u16      format version = 1
       6   u16      body count
       8   u64      pack build: FNV-1a 64 over the data sections of all decade files, in order
      16   f64      decade start ET
      24   f64      decade end ET
      32   body table, 24 bytes per body:
               u16 body code (1..8 planets, 301 Moon), u16 degree, u32 segment count,
               f64 segment length [s], u32 data offset from file start, u32 reserved = 0
then  data: per body, per segment: 3 x f64 (c0 for x, y, z),
               then 3 x degree x f32 (c1..c_degree for x, then y, then z)
```

Segments tile the decade from its start; the last one ends at the decade's end and its
Chebyshev domain maps its own shorter span to -1 to 1. `pack.json` (`ephem.pack/1`, the
schema in [../../astlo/directions.md](../../astlo/directions.md#ephempack1-an-ephemeris-pack))
lists the bodies with their source and encoding and a `decades` array of
`{ file, from_et, to_et, bytes, sha256 }`, plus `constants.emrat`.

| File | Change |
|---|---|
| `tools/ephem/src/ephem/chebyshev.py` | `fit(fn, t0, t1, degree)` on Chebyshev nodes with `numpy.polynomial.chebyshev`; `quantise(coeffs)` keeps c0 as float64 and rounds the rest to float32; `evaluate(coeffs, t0, t1, t)` |
| `tools/ephem/src/ephem/bodies.py` | The table above |
| `tools/ephem/src/ephem/generate.py` | `generate(kernel: PositionSource, bodies: list[BodySpec], window: tuple[int, int], tolerance_km: float) -> Pack`. `PositionSource` is a protocol (`position(target, center, et) -> (x, y, z)`); `KernelSource(path)` wraps jplephem. It fits each body over the decades of `window` (years), checks each quantised segment at 24 points (more than `tolerance_km` is an error naming body and segment) and returns the in-memory `Pack`. No file I/O |
| `tools/ephem/src/ephem/pack.py` | The `Pack` type (manifest plus decade bytes), `write(pack, out_dir)` and `read(pack_dir) -> Pack` for the binary layout above and `pack.json` |
| `tools/ephem/src/ephem/validate.py` | `validate(pack: Pack, reference: Reference) -> Report`. `Reference` is a `PositionSource` (every 432,000 s over each body's coverage) or a Horizons fixture (every fixture epoch). The `Report` holds one `ephem.validation/1` record per body (budget 150 km, `pass`); `write_report(report, out_dir)` writes `validation/<BODY>.json` and `VALIDATION.md`. `generate` and `validate` are the interface of the growth path (D29) |
| `tools/ephem/src/ephem/constants.py` | `emrat()`: the Earth-Moon mass ratio from DE440's own GM values, `BODY399_GM / BODY301_GM` in NAIF's `gm_de440.tpc`, the GM kernel published for the DE440 ephemerides (the builder confirms its name in the NAIF listing and pins its MD5 like the SPK's). `pack.json` records it as `constants.emrat` |
| `tools/ephem/tests/test_constants.py` | `emrat()` equals the Earth-Moon mass ratio JPL publishes for DE440 (the builder copies the value and its URL into the test) within 1e-9 relative; the repository's own GMs give 81.30057 to five decimals (computed from `bodies.ts` and `launch.ts`) |
| `tools/ephem/src/ephem/cli.py` | A thin layer over the interface: `build --kernel PATH --from-year 1950 --to-year 2150 --out DIR` (years on decade boundaries) and `validate --kernel PATH --pack DIR`; no logic of its own |
| `tools/ephem/tests/test_chebyshev.py` | A cubic is fitted exactly (1e-9); quantisation error stays under the float32 bound |
| `tools/ephem/tests/test_pack.py` | A synthetic pack round-trips through `pack.write` and `pack.read`: header, offsets, segment lookup at decade edges |
| `tools/ephem/tests/test_interface.py` | `generate` on an analytic `PositionSource` (circular orbits), then `validate` against the same source: the result passes within the tolerance. The test depends on the two signatures and the pack format only |
| `tools/ephem/tests/test_committed_pack.py` | The committed `pack.json` hashes match the decade files; every report has `pass: true` and `max_position_km <= 150`; the Moon's parameters are 32 days and degree 15 |
| `data/ephem/de440s-100km/` | Generated: `pack.json`, `1950.bin` to `2140.bin`, `validation/*.json` (9), `VALIDATION.md` |
| `data/ephem/README.md` | Provenance: derived from NASA/JPL DE440 (`de440s.bsp`), last modified by Starshot (NAIF's rule), how to rebuild |
| `REUSE.toml`, `LICENSES/LicenseRef-NASA-JPL-Data.txt` | Annotate `data/ephem/**` with `LicenseRef-NASA-JPL-Data`; the text states the source, NAIF's rules (<https://naif.jpl.nasa.gov/naif/rules.html>) and the last-modifier line |
| `.github/workflows/ephem.yml` | New `workflow_dispatch` job `regenerate`: kernel from cache (key `de440s-3917ee56769db332790c751e2168843d`) or download, `build`, `validate`, upload artifact `ephem-pack` (7 days) for a person to commit |
| `docs/architecture.md` | Under "Future: the astlo data gate", the `ephem.snapshot/1` sketch is replaced by a pointer to `ephem.pack/1` and `ephem.validation/1` (`docs/astlo/directions.md`, `data/ephem/README.md`) |
| `CHANGELOG.md` | `[Unreleased]` entry |

`constants.emrat` comes from `constants.emrat()`, that is from DE440's own GM values. The
repository's GMs (398600.435507 for Earth alone in `packages/physics/src/launch.ts`,
403503.235502 for the Earth-Moon system in `packages/ephemeris/src/bodies.ts`) give
81.300570, which agrees to five decimals; the Rust core uses the pack's value (PR10).

- **Edge cases.** NAIF's kernel ends 2150-01-22, so the last decade is fully covered. A
  rebuild on another machine may differ in the last bits of a coefficient. The committed
  pack is the source of truth and the tests read it, not the kernel.
- **Proof.** `uv run --project tools/ephem --locked pytest tools/ephem/tests -q` passes
  offline. With the kernel present, `starshot-ephem build --kernel <path> --from-year 1950
  --to-year 2150 --out <dir>` twice on one machine gives
  identical bytes, and `starshot-ephem validate` reproduces the committed reports. The PR
  body carries `VALIDATION.md`'s table and the pack's total size (expected about 1.06 MB
  for 200 years).
- **Adversary checks.** Every body is within 150 km in its report and the numbers look
  like the research's (Moon about 54 km). NAIF's last-modifier rule is met. Nothing
  reads the network at test time. The header's offsets cannot point outside the file.
- **Out of scope.** Reading the pack in Rust (PR10). Small bodies and moons (later).

### PR9: Ephemeris crate

- **Branch** `starshot/v1-pr09-ephemeris-crate`, based on PR8's.
  **Issue** `v1-ephemeris-crate`. **Decisions** D16, D17, D4. **Size** about 520 lines
  (about 190 of tests), 18 files; warns.
- **Goal.** `starshot-ephemeris` reproduces today's `@starshot/ephemeris`: time scales,
  bodies, Table 1 with its Kepler solver, the `Ephemeris` trait with flattening, all
  passing today's Horizons budgets in Rust and matching the TypeScript outputs.

| File | Change |
|---|---|
| `crates/starshot-ephemeris/src/vec.rs` | `pub type Vec3 = [f64; 3]`; `add`, `sub`, `scale`, `dot`, `cross`, `norm`, `angle_between` (clamped `acos` from `starshot-math`) |
| `src/time.rs` | `J2000_JD`, `SECONDS_PER_DAY`, `DAYS_PER_JULIAN_CENTURY`; the leap-second table copied from `packages/ephemeris/src/time.ts`; `tt_minus_utc(unix_s)`; `et_from_unix_ms(ms: i64)` with `etFromDate`'s exact operation order; `et_from_iso(&str) -> Result<f64, TimeError>` for `YYYY-MM-DD` and `YYYY-MM-DDTHH:MM:SS(.sss)Z`, using an integer days-from-civil conversion; `unix_ms_from_et` rounding to the millisecond like `dateFromEt`; `et_from_jd_tdb`, `jd_tdb_from_et` |
| `src/bodies.rs` | `enum BodyId { Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune }` (`Earth` is the Earth-Moon barycentre, as in Table 1); `BodyInfo { gm, radius_km, name }` with today's values digit for digit; `AU_KM`; `EARTH_ONLY_GM = 398600.435507`; `sphere_of_influence_km(id, a_km)` with `pow(ratio, 0.4)` |
| `src/table1.rs`, `src/kepler.rs` | Table 1 copied digit for digit from `packages/ephemeris/src/elements.ts`; `planet_elements(id, et)`, `solve_kepler(m, e)`, `state_from_elements(&el)` ported with the same iteration and operation order |
| `src/ephemeris.rs` | `pub struct State { pub r: Vec3, pub v: Vec3 }`; `pub trait Ephemeris { fn bodies(&self) -> &[BodyId]; fn flattened(&self) -> bool; fn state(&self, id: BodyId, et: f64) -> State; fn soi_km(&self, id: BodyId, et: f64) -> f64; }`; `Table1Ephemeris { flatten: bool }`; `orbit_path`, `orbital_period_seconds` |
| `src/lib.rs`, `Cargo.toml` | Module wiring; depends on `starshot-math`; dev-depends on `serde_json` |
| `fixtures/horizons/horizons.json` | Moved with `git mv` from `packages/ephemeris/test/fixtures/horizons.json`; every reference updated: `packages/ephemeris/test/ephemeris.test.ts` (import), `scripts/check-guard-scan-coverage.mjs`, `AGENTS.md` ("Think before you touch"), `README.md`, `.claude/skills/verify-physics/SKILL.md`, `.claude/skills/astlo-upstream/reference.md`, `tools/ephem` (default `--out`), and any exemption glob in `scripts/copy-tells.json` |
| `crates/starshot-ephemeris/tests/horizons.rs` | Today's per-planet arcminute budgets (1.5, 1.5, 1.5, 2, 12, 15, 3, 2), distance within 0.2% and speed within 1%, at every fixture epoch. A loosened budget needs a decision entry |
| `tests/time.rs` | J2000 is `2000-01-01T11:58:55.816Z`; every UTC midnight from 1800 to 2050, weekly, round-trips to the millisecond; 2026 has TT minus UTC of 69.184 s |
| `tests/kepler.rs` | `M = E - e sin E` across the same eccentricities as today's test |
| `tests/conformance_table1.rs` | Against `fixtures/conformance/table1.json`: positions within 1 m, velocities within 1 mm/s; `et_from_iso` on its listed strings bit-equal |
| `packages/ephemeris/test/conformance.test.ts` | New: computes 8 planets at 40 fixed ETs (the five fixture epochs plus 35 dates from 1800 to 2049 listed in the file) and 20 ISO strings through `etFromIso`; with `STARSHOT_WRITE_CONFORMANCE=1` writes `fixtures/conformance/table1.json`, otherwise asserts the file equals the output exactly |
| `fixtures/conformance/table1.json` | Generated by that test |
| `docs/architecture.md`, `CHANGELOG.md` | The crate; `[Unreleased]` |

- **Edge cases.** `et_from_iso` accepts exactly the forms `etFromIso` accepts today and
  rejects the rest with an error, never a guess. Requesting a body the ephemeris does not
  list panics with a message naming the body (programming error, not input).
- **Proof.** `cargo test -p starshot-ephemeris --locked` passes (AC3 for Table 1).
  `npx vitest run packages/ephemeris` passes, including the conformance test without the
  write flag. `npm run gates` exits 0.
- **Adversary checks.** `starshot-ephemeris` depends on nothing but `starshot-math` (D29,
  stage 3 of the growth path). Table 1 digits equal the TypeScript file's (diff the two lists).
  Budgets equal today's. No transcendental call bypasses `starshot-math`. The moved
  fixture is byte-identical (`git diff -M --stat` shows a pure rename).
- **Out of scope.** Rails and the Moon (PR10).

### PR10: Rails reader

- **Branch** `starshot/v1-pr10-rails-reader`, based on PR9's.
  **Issue** `v1-rails-reader`. **Decisions** D17. **Size** about 430 lines, 8 files.
- **Goal.** Read the decade files in Rust, evaluate positions and velocities with adds
  and multiplies only, derive Earth's centre and the heliocentric Moon, and check Table 1
  densely against the rails (register R18).

| File | Change |
|---|---|
| `crates/starshot-ephemeris/src/rails.rs` | `RailPack::new()`; `load_decade(&mut self, bytes: &[u8]) -> Result<(), PackError>` validating magic, version, the body table and every offset; `pack_build(&self) -> Option<u64>` (equal across loaded decades, else `PackError::MixedBuilds`); `position(body, et) -> Option<Vec3>` and `state(body, et) -> Option<State>` by Clenshaw's recurrence and its derivative scaled by `2 / span`; `coverage() -> (f64, f64)` |
| `src/bodies.rs` | `BodyId::Moon`; `RailBody` codes 1 to 8 and 301 |
| `src/ephemeris.rs` | `RailEphemeris { pack, flatten, table1 }` implementing `Ephemeris`. Inside pack coverage the decade holding `et` must be loaded, else a panic "decade <year> not loaded" (the caller loads before simulating; a silent fallback would make preview and server differ). Outside coverage, planets come from Table 1 and the Moon panics. `BodyId::Earth` stays the barycentre; `earth_centre(et)` and the heliocentric Moon use `EMRAT`, a constant in `bodies.rs` equal to `constants.emrat` in `pack.json` (a test reads the JSON and compares). `soi_km` uses Table 1's semi-major axis for every source, so spheres of influence do not depend on the source |
| `tests/rails.rs` | Loads all decade files with `include_bytes!`: planets within 150 km of `fixtures/horizons/horizons.json`, the geocentric Moon within 150 km of `geocentric.moon`, Earth's centre within 150 km of `heliocentric_extra.earth`, at every epoch inside coverage; corrupt headers are rejected |
| `tests/dense_table1.rs` | Every 432,000 s from 1950-01-01 to 2050-01-01: Table 1's direction against the rails' within today's per-planet arcminute budgets |
| `tests/clenshaw.rs` | Clenshaw against a direct sum of `T_k` on random coefficients within 1e-9 relative; the derivative against a central difference |
| `docs/architecture.md`, `CHANGELOG.md` | Rails in the crate; `[Unreleased]` |

- **Edge cases.** `et` exactly on a segment or decade boundary picks the later segment,
  except at the pack's last instant, which belongs to the last segment. A NaN `et` is
  rejected.
- **Proof.** `cargo test -p starshot-ephemeris --locked --test rails --test dense_table1`
  passes (AC3, AC4, AC5). The PR body lists the worst dense Table 1 error per planet next
  to its budget.
- **Adversary checks.** The reader cannot index out of bounds on a malformed file. No
  trigonometry in the evaluation path. The fallback rules match D17 and cannot trigger
  inside coverage.
- **Out of scope.** Using the rails in the game (PR18). The Moon as an attractor (PR20).

### PR11: Physics crate, integrator and Lambert

- **Branch** `starshot/v1-pr11-physics-core`, based on PR10's.
  **Issue** `v1-physics-core`. **Decisions** D16, D11. **Size** about 450 lines, 13 files.
- **Goal.** Port `dopri5`, `gravity`, `hermite`, `launch` and `lambert` from
  `packages/physics/src/` to `crates/starshot-physics`, with today's tests and a
  conformance fixture whose arithmetic-only cases must match bit for bit.

| File | Change |
|---|---|
| `crates/starshot-physics/src/dopri5.rs` | `Dopri5` with the same tableau constants, `attempt`, `accept`, `reset`, `next_step` (`pow(err, -0.2)` from `starshot-math`); `(errI / sc) ** 2` becomes `q * q` |
| `src/gravity.rs` | `acceleration(eph: &dyn Ephemeris, attractors: &[BodyId], et, r, out)` with the indirect term, same order |
| `src/hermite.rs` | `Knot`, `hermite(a, b, t)` |
| `src/launch.rs` | `LEO_RADIUS_KM = 6371.0 + 200.0` (today's value), `departure_state`, `delta_v_from_leo`, `c3`; Earth's GM from `starshot_ephemeris::EARTH_ONLY_GM` |
| `src/lambert.rs` | `stumpff_c`, `stumpff_s`, `lambert(r1, r2, tof, mu, prograde) -> Option<(Vec3, Vec3)>`, `best_direct_transfer` and `DirectTransfer` |
| `tests/lambert.rs` | Today's three Lambert tests with today's assertions: the round trip hits the target point; Earth to Saturn in 1977 (a long transfer) solves; on today's grid (unflattened ephemeris, 30 launches every 4 days from 2026-10-01, flights of 150 + 10k days for k = 0 to 24) the best direct Mars transfer has an excess speed between 2.6 and 4.0 km/s. Measured with the TypeScript packages on 2026-11-01: 3.0257 km/s, launch 2026-10-29, 300 days. This is the conformance test |
| `tests/lambert_fine.rs` | **New**, not a port: on the flattened ephemeris, launch days 2026-11-02 plus or minus 10 and flights of 300 to 340 days, both at 1-day steps, the minimum is launch 2026-11-02, 323 days, excess speed 2.982 km/s within 0.001. Measured with the TypeScript packages on 2026-11-01: 2026-11-02, 323 days, 2.9817 km/s (deviation 9, register R29) |
| `apps/game/src/levels.ts` | Comment only, in First Light's `par`: "(323 days)" is the Lambert time of flight of the 1-day-grid minimum, which `tests/lambert_fine.rs` proves; the comment gains the words "Lambert time of flight, 1-day grid". D11's "326 days" is the best node of the 8-day grid of the simulate test (PR12), and the known solution's simulated flight is a third quantity (302.7 days to the training zone, 308.3 days to the real sphere, measured 2026-11-01) |
| `tests/launch.rs` | About 3.2 km/s from LEO to escape; the departure state is Earth's velocity plus the excess |
| `tests/dopri5.rs` | A Sun-only circular 1 AU orbit integrated with `Dopri5` directly closes within 10 km after one period |
| `tests/conformance_physics.rs` | Against `fixtures/conformance/physics.json`: `hermite`, `delta_v_from_leo`, Sun-only `acceleration` and one Sun-only `Dopri5::attempt` per listed state equal bit for bit; `lambert` within 1e-9 relative; `next_step` within 1e-15 relative |
| `packages/physics/test/conformance.test.ts` | New, same write-or-compare pattern as PR9's, producing `fixtures/conformance/physics.json` |
| `fixtures/conformance/physics.json` | Generated |

- **Proof.** `cargo test -p starshot-physics --locked` passes. `npx vitest run packages/physics`
  passes, the conformance test included. The PR body lists which cases matched bit for
  bit.
- **Adversary checks.** Operation order equals the TypeScript's in every arithmetic-only
  function (that is what the bit-exact cases prove). No step is skipped in `lambert`'s
  bracketing loops. `LEO_RADIUS_KM` is today's 6,571 km, not a corrected radius.
- **Out of scope.** `simulate` (PR12).

### PR12: Physics crate, simulate

- **Branch** `starshot/v1-pr12-physics-simulate`, based on PR11's.
  **Issue** `v1-physics-simulate`. **Decisions** D16, D6, D11. **Size** about 460 lines,
  6 files; warns.
- **Goal.** Port `simulate` with encounter detection, the energy-consistent switch-on of
  the home planet, impact, escape, sun-dive and step-limit endings, and prove it against
  today's tests and 24 TypeScript flights.

| File | Change |
|---|---|
| `crates/starshot-physics/src/simulate.rs` | `SimulationConfig` (today's fields; `ephemeris: &dyn Ephemeris`), `Encounter`, `Termination` (`Duration`, `Impact`, `Sun`, `Escape`, `SoiReached`, `MaxSteps`), `SimulationResult` (`samples: Vec<Knot>`, `encounters`, `closest` as one `Option<Encounter>` per body, `termination`, `terminated_by`, `end_time`, `steps`), `simulate(&cfg)`, `sample_at(&result, t)`, the private `relative` and `refine_minimum` (golden section, 40 iterations, 1 s) with today's order |
| `tests/simulate.rs` | Today's tests: the circular orbit closes within 10 km; sampling between samples is smooth; the Mars 2026 Lambert aim, found on today's grid (20 launches every 3 days from 2026-10-15, flights of 150 + 8k days), passes within 1.25 Mars spheres of influence (D11); Earth's gravity switches on energy-consistently exactly once; a Jupiter flyby is detected with its energy gain; aiming at a planet stops on impact; a 3-year preview takes under 400 ms (`std::time::Instant`, test profile optimised) |
| `tests/conformance_simulate.rs` | Against `fixtures/conformance/simulate.json`: for each of 24 flights (the campaign's known solutions and par shots, misses, an impact, an escape and two outer-sandbox flights), the same termination and terminating body, the same step count, end position within 1 km, and closest approach per body within 1 km |
| `packages/physics/test/conformance-simulate.test.ts` | New, write-or-compare; stores each flight's inputs with the excess-speed vector as exact bits (16 hex digits per component) and the outputs |
| `fixtures/conformance/simulate.json` | Generated |
| `CHANGELOG.md` | `[Unreleased]` |

- **Edge cases.** A flight that ends on its time limit reports `Duration` with the last
  sample at `t0 + duration` exactly. The step cap near planets (`0.02 d / speed` inside
  5 spheres of influence) keeps its `max(speed, 1e-3)` guard.
- **Proof.** `cargo test -p starshot-physics --locked` passes (AC7). The PR body prints,
  per conformance flight, the end-position gap in metres. The largest is expected under
  100 m (the research measured 98 m between engines).
- **Adversary checks.** Step counts match the TypeScript's on every conformance flight
  (a different count means a changed branch, not drift). The energy-consistent switch
  adds `2 mu / d` exactly as `simulate.ts` does. The timing test runs in CI.
- **Out of scope.** The shot model (PR13).

### PR13: Game crate, shots and replays

- **Branch** `starshot/v1-pr13-game-shot`, based on PR12's.
  **Issue** `v1-game-shot`. **Decisions** D16, D6. **Size** about 430 lines, 11 files.
- **Goal.** Port the shot model of `apps/game/src/sim/shot.ts` and add the replay format
  with canonical inputs and a physics version.

| File | Change |
|---|---|
| `crates/starshot-game/src/settings.rs` | `SimSettings { rtol, atol_km, max_step, max_steps }`; `SIM_SETTINGS` and `OUTER_SIM_SETTINGS` with today's values |
| `src/shot.rs` | `ShotRequest` (today's fields), `simulate_shot`, `stop_at_capture_zone`, `analyze_shot` returning `ShotAnalysis` (today's fields), `periapsis_km`, `BULLSEYE_RADII = 10.0`, the 2050 validity ET; a capture-zone scale below 1 returns `ShotError::CaptureZoneScale` |
| `src/aim.rs` | `Aim { angle_deg, speed_kms }`, `normalize_deg`, `v_inf_from_aim` (`cos` and `sin` from `starshot-math`), `aim_from_v_inf`, `round_aim` (integer hundredths of a degree and thousandths of a km/s, divided once) |
| `src/days.rs` | `add_days_iso`, `days_between_iso`, `launch_et_for_day(start_iso, day)` through `et_from_iso` |
| `src/replay.rs` | `Replay { level_id: String, launch_day: u32, v_inf_x_bits: u64, v_inf_y_bits: u64, physics_version: String }` (format name `starshot.replay/1`; `z` is 0 in the flat world); `physics_version(settings, source_id) -> String` as `"<crate version>+<FNV-1a 64 of the settings' little-endian bytes, 16 hex digits>+<source id>"`, where the source id is `table1` or `de440s-100km/<pack build in hex>` |
| `tests/shot.rs`, `tests/aim.rs`, `tests/replay.rs` | `round_aim` on the controls' grid; aim round trips; `physics_version(&SIM_SETTINGS, "table1")` equals a stored string; a capture-zone scale of 0.5 is refused |
| `tests/conformance_shots.rs` | Against `fixtures/conformance/shots.json` (30 shots: full requests and analyses): `hit`, `bullseye`, flybys and termination equal; `closest_km` within 1 km; `flight_days` within 1e-6; `launch_et_for_day` bit-equal |
| `apps/game/src/sim/conformance.test.ts`, `fixtures/conformance/shots.json` | Write-or-compare generator and its output |

- **Proof.** `cargo test -p starshot-game --locked` passes. `npx vitest run apps/game`
  passes.
- **Adversary checks.** No clock and no randomness in the crate. The replay carries
  bits, not decimal strings. The physics version changes when any setting changes (a
  test flips `max_steps` by one).
- **Out of scope.** The rest of the game crate (PR14).

### PR14: Game crate, levels, scoring and hints

- **Branch** `starshot/v1-pr14-game-levels`, based on PR13's.
  **Issue** `v1-game-levels`. **Decisions** D16, D6, D11. **Size** about 560 lines (about
  220 of tests), 8 files; warns. If the diff passes 600 added lines, move `hint.rs` and
  its tests into a PR14b on top and log the split.
- **Goal.** Port levels, scoring and the hint search so every level test of today passes
  in Rust with the same numbers. Level physics lives in Rust. Level copy (number, title,
  blurb) stays in TypeScript, where the copy gate reads it.

| File | Change |
|---|---|
| `crates/starshot-game/src/levels.rs` | `LevelId`, `LaunchWindow`, `Par`, `Level` (physics fields only: window, default launch, target, max flight days, excess-speed cap, attractors, required flyby, par, par tolerance, capture-zone scale, settings, curated hint, sandbox flag); `CAMPAIGN` with today's values; `GRAND_TOUR_HINT` and `GRAND_TOUR_PAR_SHOT` with today's exact vectors; `shot_template`, `shot_request_for`, `hint_query_for`; sandbox functions taking "today" as an ISO date argument (no clock); `framing_bodies`; `replay_request(level, &Replay) -> ShotRequest` |
| `src/scoring.rs` | `ScoringRules`, `ShotFacts`, `Score`, `score_shot`, `max_stars`, `PAR_TOLERANCE`, `HINT_STAR_CAP` |
| `src/hint.rs` | `KnownShot`, `HintQuery`, `Hint`, `HINT_MAX_SIMULATIONS = 240`, `find_hint` with today's search order |
| `tests/levels.rs` | The port of `apps/game/src/levels.test.ts`: every known solution reaches its target; direct pars are the window's cheapest Lambert transfer within 1%; First Light's 3 times zone; hints are on the grid, deterministic and reach; the Grand Tour's par shot earns three stars, no direct transfer fits under the cap, and without Jupiter nothing comes within 5 Saturn spheres; sandbox settings choice; flights past 2050 are flagged |
| `tests/scoring.rs` | The port of `apps/game/src/scoring.test.ts`'s `scoreShot` cases |
| `apps/game/src/levels.ts` | Unchanged in this PR (PR16 splits copy from physics) |

- **Proof.** `cargo test -p starshot-game --locked --test levels --test scoring` passes
  (AC8 in Rust). The known-solution vectors in `tests/levels.rs` equal those in
  `levels.test.ts` digit for digit.
- **Adversary checks.** No level number was re-tuned to make a Rust test pass (any
  difference is a port bug or a deviation to log). The hint budget is a simulation
  count, as today.
- **Out of scope.** New levels (Band F).

### PR15: core-wasm package and bit identity

- **Branch** `starshot/v1-pr15-core-wasm`, based on PR14's.
  **Issue** `v1-core-wasm`. **Decisions** D16. **Size** about 520 lines, 19 files;
  warns.
- **Goal.** Compile the core to wasm, wrap it in a typed TypeScript package, and prove
  that golden replays give identical bits in V8, JavaScriptCore, native x86_64 and native
  arm64.

| File | Change |
|---|---|
| `crates/starshot-wasm/Cargo.toml`, `src/lib.rs` | `crate-type = ["cdylib"]`; `wasm-bindgen = "=0.2.130"`; a `Core` struct (`new_table1(flatten: bool)`) with `simulate_shot(&mut self, req: &[f64]) -> Vec<f64>`, `find_hint(&mut self, query: &[f64]) -> Vec<f64>`, `body_states(&self, et: f64, codes: &[u32]) -> Vec<f64>`, `orbit_path(&self, code: u32, et: f64, samples: u32) -> Vec<f64>`, `level_catalogue(&self) -> String` (hand-written JSON, no serde); free functions `v_inf_from_aim`, `round_aim`, `launch_et_for_day`, `physics_version`, `score_shot`. No logic beyond encoding |
| `crates/starshot-wasm/src/abi.rs` | The flat `f64` layouts of every request and result, documented once in its module comment (body codes as numbers, booleans as 0 and 1, variable-length parts prefixed by their counts) |
| `crates/starshot-game/examples/gen_replays.rs`, `fixtures/replays/*.json` | Golden replays: each campaign level's known solution and par shot, a miss, an impact and an outer-sandbox flight (12 files), each with its request and the final sample's `t`, `r` and `v` as 16-hex-digit bits |
| `crates/starshot-game/tests/golden_replays.rs` | Native: every golden replay's bits match |
| `packages/core-wasm/package.json` | `@starshot/core-wasm`, private, `Apache-2.0`, `type: module`, `exports: ./src/index.ts`, script `build` |
| `packages/core-wasm/build.mjs` | `cargo build -p starshot-wasm --target wasm32-unknown-unknown --release` with `RUSTFLAGS=--remap-path-prefix=<repo>=.`, then `wasm-bindgen --target web --out-dir packages/core-wasm/pkg` (the CLI at exactly 0.2.130) |
| `packages/core-wasm/pkg/` | Build output, listed in `.gitignore`; `npm run build` and CI produce it through `build.mjs` before the web build, so no generated file enters git (register R27). A contributor without Rust installs it with the three commands `CONTRIBUTING.md` lists (PR16) |
| `packages/core-wasm/src/abi.ts`, `src/types.ts`, `src/index.ts` | The TypeScript mirror of the layouts; types mirroring today's `ShotRequest`, `SimulationResult`, `ShotAnalysis`, `Hint`, `HintQuery`; `initCore(source?)` and wrapper functions with today's names (`simulateShot`, `analyzeShot`, `findHint`) |
| `packages/core-wasm/test/abi.test.ts`, `test/bits.test.ts` | Encode and decode the conformance shots; run `fixtures/math/golden.json` (through an exported `math_eval(code: u32, x: f64, y: f64) -> f64`) and every golden replay in V8 and compare bits |
| `packages/core-wasm/scripts/bits-jsc.mjs` | The same comparison, runnable by Bun (JavaScriptCore) with no test runner |
| `scripts/check-bundle-size.mjs` | New gate `bundle-size` (code, fast): gzip size of `packages/core-wasm/pkg/*.wasm` under 64 KB; prints the measured size |
| `package.json` (root) | `build` becomes `npm run build -w @starshot/core-wasm && npm run build -w @starshot/game`; `dev` runs the core build first too; `typecheck` and `test` keep their commands and run after the core build in the gates |
| `scripts/gates.mjs` | New gate `core-wasm` (group `code`: `npm run build -w @starshot/core-wasm`) registered before `typecheck`; `typecheck`, `test` and `build` (now the root `build`) follow it; registers `bundle-size`. From this PR Rust is required to build from source: PR6's skip ends and `STARSHOT_REQUIRE_RUST` becomes a no-op. When `cargo`, the `wasm32-unknown-unknown` target or `wasm-bindgen` is missing, `core-wasm`, `typecheck`, `test` and `build` fail with one message naming the three install commands: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh`, `rustup target add wasm32-unknown-unknown`, `cargo install --locked wasm-bindgen-cli --version 0.2.130` |
| `.github/workflows/ci.yml` | `checks`, `verify-game` and the new job `bits-jsc` run `.github/actions/setup-rust-wasm` (PR6) before any npm build. `bits-jsc`: `oven-sh/setup-bun` pinned, `npm ci`, `npm run build -w @starshot/core-wasm`, `bun packages/core-wasm/scripts/bits-jsc.mjs`; it joins the aggregator's `needs`. `rust-arm64` runs the golden tests |
| `.github/workflows/release.yml` | The `build` job runs `.github/actions/setup-rust-wasm` before `npm run gates`, so both published sites carry the wasm the gates tested. D34 replaced the old Pages workflow |
| `CHANGELOG.md` | `[Unreleased]` |

- **Edge cases.** PR6's promise of skips for contributors without Rust ends here, and
  the error says how to install it. Panics abort in wasm. The wrapper turns a trap into
  an `Error` with the request echoed, so a worker failure is reported, not hung. The ABI carries no
  strings except the catalogue and the version.
- **Proof.** AC6: `npx vitest run packages/core-wasm`, `bun packages/core-wasm/scripts/bits-jsc.mjs`,
  `cargo test -p starshot-math --locked --test golden`,
  `cargo test -p starshot-game --locked --test golden_replays` and the `rust-arm64` job
  all pass. With `cargo` removed from `PATH`, `npm run gates` fails at `core-wasm`,
  `typecheck`, `test` and `build` and prints the three install commands. AC9 (wasm
  part): `node scripts/check-bundle-size.mjs` prints the size, under 64 KB gzip (the
  research measured a 15 KB kernel). The CI job records the sha256 of the built `.wasm` in its summary, and the deploy (PR33) ships that same file to the server function (PR32).
- **Adversary checks.** No `serde` in the wasm. `pkg/` is ignored by git and absent from the tree.
  `wasm-bindgen` and its CLI versions are equal. Every golden replay covers a different
  branch of `simulate`.
- **Out of scope.** Using the package in the game (PR16).

### PR16: Worker cut-over

- **Branch** `starshot/v1-pr16-worker-cutover`, based on PR15's.
  **Issue** `v1-worker-cutover`. **Decisions** D16, D6. **Size** about 520 lines,
  19 files; warns.
- **Goal.** The physics worker and the map run on `@starshot/core-wasm`. The worker
  protocol and the UI do not change. Every game test runs through the wasm.

| File | Change |
|---|---|
| `apps/game/src/sim/sim.worker.ts` | Instantiates the core once (`new_table1(true)`) and answers `shot` and `hint` requests through it |
| `apps/game/src/sim/shot.ts` | Keeps its exports and types; `simulateShot`, `analyzeShot`, `vInfFromAim`, `roundAim` and `launchEtForDay` delegate to the core; `addDaysIso` and `daysBetweenIso` stay TypeScript. The `SIM_SETTINGS` and `OUTER_SIM_SETTINGS` literals are deleted; `settingsFor(levelId)` returns a level's frozen settings from the catalogue (they live in `crates/starshot-game/src/settings.rs`, D6). The sandbox, whose settings depend on its target, reads the catalogue's per-target entry in `sandboxLevel(target)` |
| `apps/game/src/sim/hint.ts`, `apps/game/src/scoring.ts` | Delegate to the core; types unchanged |
| `apps/game/src/levels.ts` | Becomes `LEVEL_COPY: Record<LevelId, { number, title, blurb }>` plus the physics fields read from `level_catalogue()`; the exported `Level` type and functions keep their names |
| `apps/game/src/core.ts` | New: loads the wasm once per thread (`?url` import so Vite hashes it) and exposes the ready core to the main thread for drawing (`body_states`, `orbit_path`) |
| `apps/game/src/ui/GameScreen.tsx` and the `ui/screen/` hooks | The map's planet positions and orbit paths come from `core.ts`; no physics change |
| `apps/game/src/levels.test.ts`, `src/sim/preview.test.ts`, `src/scoring.test.ts` | Run against the core; a new test asserts the copy ids equal the catalogue ids |
| `vitest.setup.ts` (new), `vitest.config.ts` | The setup file reads `packages/core-wasm/pkg/starshot_wasm_bg.wasm` with `readFile` and awaits `initCore(bytes)` once (the `--target web` glue accepts bytes); the config lists it in `setupFiles` |
| `apps/game/src/App.tsx` | Calls `initCore()` once at start and holds `coreReady`. The title screen renders at once; the level select renders only when the core is ready; a load failure shows the existing error path |
| `apps/game/src/ui/TitleScreen.tsx` | Takes `coreReady`; until it is true, the start control is disabled and a one-line "Loading physics" status sits in a polite live region |
| `CONTRIBUTING.md` | Documents the three install commands (rustup, the `wasm32-unknown-unknown` target, `wasm-bindgen-cli` 0.2.130) and that `npm run build` and `npm run gates` need them from PR15 |
| `apps/game/public/sw.js` | Caches the hashed `.wasm` like other hashed assets |
| `apps/game/package.json` | Depends on `@starshot/core-wasm` |
| `docs/architecture.md`, `CHANGELOG.md` | The worker on the core; `[Unreleased]` |

- **Edge cases.** The first preview may arrive before the wasm has loaded: the worker
  queues requests until ready. A main thread without wasm support shows the existing
  error path. Reduced motion and the launch gate behave as before.
- **Proof.** `npx vitest run apps/game` passes (AC8).
  `npm run build && node scripts/verify-game.mjs` passes with the same report counts as
  PR15's branch. The PR body adds the median preview time on the Mars level from the
  worker's `ms` field, against the median 2 to 8 ms on desktop Node that the TypeScript
  core measured. `node scripts/check-bundle-size.mjs`
  passes.
- **Adversary checks.** No TypeScript literal of a level's settings remains
  (`git grep -n 'rtol:' -- apps` prints nothing). `ShotRequest`, `SimRequest` and `SimResponse` are unchanged
  (`git diff` of `protocol.ts` is empty). Preview and launch still go through the same
  call (D6). No level copy moved into Rust.
- **Out of scope.** Rails in the game (PR18). Deleting the TypeScript packages (PR17).

### PR17: Retire the TypeScript core

- **Branch** `starshot/v1-pr17-retire-ts-core`, based on PR16's.
  **Issue** `v1-retire-ts-core`. **Decisions** D16. **Size** about 180 lines added, about
  2,100 deleted, about 35 files; over on files, deletions and path updates only.
- **Goal.** Delete `packages/ephemeris` and `packages/physics` and every reference to
  them, now that the core passes every test they had.

| File | Change |
|---|---|
| `packages/ephemeris/`, `packages/physics/` | Deleted (the conformance fixtures they wrote stay in `fixtures/conformance/` as frozen references, and the Rust tests keep reading them) |
| `tsconfig.json`, `vitest.config.ts`, `package.json`, `package-lock.json`, `apps/game/package.json` | References and workspaces updated; `npm install` refreshes the lockfile |
| `scripts/check-third-party-untouched.mjs`, `scripts/check-guard-scan-coverage.mjs`, `scripts/check-file-size.mjs` | Scan roots: `apps/`, `crates/`, `packages/core-wasm/` instead of the deleted packages |
| `AGENTS.md` | The "What lives where" rows and "Think before you touch" paths point at `crates/starshot-ephemeris/src/table1.rs`, `src/time.rs`, `crates/starshot-physics/src/dopri5.rs`, `src/simulate.rs`, `crates/starshot-game/src/settings.rs`, `fixtures/horizons/horizons.json`; non-negotiable 5 names `crates/starshot-game/src/settings.rs` and the level catalogue as where a level's frozen settings live |
| `.claude/skills/verify-physics/SKILL.md`, `.claude/agents/physics-auditor.md`, `.claude/rubrics/physics.md` | Commands and paths for the crates |
| `README.md`, `CONTRIBUTING.md` ("How to add a body"), `docs/architecture.md`, `NOTICE.md` | Point at the crates |
| `CHANGELOG.md` | `[Unreleased]`: the packages are no longer published or used |

- **Proof.** AC14's command passes. `npm ci && STARSHOT_REQUIRE_RUST=1 npm run gates`
  exits 0. `npx vitest run` and `cargo test --workspace --locked` pass. The
  `instruction-dedup`, `agent-frontmatter` and `guard-scan-coverage` gates pass.
- **Adversary checks.** Nothing references the deleted paths
  (`git grep -n -e packages/ephemeris -e packages/physics -- apps crates packages scripts
  tools` prints nothing). The Horizons budgets still run (now in Rust).
  The skills tell an agent the right commands.
- **Out of scope.** Any behaviour change.

## Bands C to F: outline specs

These are outlines. Before a band is built, a **band planning session** upgrades every
spec in it to the Band A and Band B format. The orchestrator runs it with the `plan-pr0`
skill's turnkey bar. It re-checks this outline against the tree, records the prototype
results named below, and commits the upgraded specs to this file before the first builder
starts. The acceptance criteria and proof commands here are the floor for that session,
not the whole spec.

### Prototypes before Bands C and D

From the gameplay research's prototyping plan (its section K). Each must meet its success
test, or the band planning session records why the design changes instead.

| # | Prototype | Success test | Before |
|---|---|---|---|
| 1 | Pull-back feel with haptics and audio (Android web, plus an iOS native shell when it exists) | Eight of ten testers set a requested delta-v within 0.1 km/s in under 5 s using only feel and the meter | PR28 |
| 2 | Time-warp pacing (the event-anchored map) on Moon, Mars and Saturn flights | Median launch-to-result time is 4 to 8 s for all three, and testers can name every planet they passed | PR22 |
| 3 | Capture hold-to-burn with auto-timing and detents | Nine of ten first-time players capture on their first or second attempt, and none say it needed precise timing | PR20 |
| 4 | Multi-assist ghost plus snap aim assist | With the assist, testers find a Jupiter-assisted Saturn shot in under 2 minutes; without it, most do not | PR21 |
| 5 | Economy simulation (a script, no UI) | A scripted competent player reaches the chapter's end in 15 to 25 runs, with no body needing more than three attempts | PR24 |
| 6 | Window slider with snapping | Testers pick a launch within 5% of the window minimum within 20 s | PR23 |

Prototypes 1 to 4 and 6 need real players (the owner's step P1 and P2 in
[04-ops-checklist.md](04-ops-checklist.md#playtests-for-the-prototypes)); prototype 5 is
a script an agent writes and runs against `starshot-game`.

### PR18: Fly on DE440 rails

- **Goal.** The game's ephemeris becomes `RailEphemeris` (D17): the worker loads the
  decade files a level's window and flight need before its first preview, and every
  par, hint and known solution is re-derived on rails. "earth" is still the barycentre.
- **Acceptance.** AC8 on rails. The Grand Tour still needs Jupiter (its tests). The
  `physics_version` of every level names the pack build. The service worker caches the
  decade files by hash. Proof: `cargo test -p starshot-game --locked --test levels`,
  `npx vitest run apps/game`, the `verify-game` job.
- **Prototypes.** None. A level that cannot be re-solved on rails is a deviation the
  owner sees before the PR merges.

### PR19: Craft and fuel

- **Goal.** The 700 kg probe and the 1,000 kg crewed craft. Fuel as impulse with
  `J0 = 700 kg x 3.55 km/s` (D18 item 1). The HUD shows km/s for the craft on the pad. A
  ring at the escape delta-v (3.226 km/s from 200 km) labelled "stays in Earth orbit".
  The fuel meter with the pull-back cost, the planned brake or boost and what remains.
- **Acceptance.** Unit tests: delta-v equals J divided by mass for both craft. The
  ring's radius equals `delta_v_from_leo(0)`. A pull below it never launches. Proof:
  `cargo test -p starshot-game --locked`, `verify-game` with a step that pulls inside
  the ring and reads the polite announcement.
- **Prototypes.** Prototype 5 informs the starting tank only if it fails.

### PR20: Spheres of influence and capture

- **Goal.** The Moon becomes an attractor and Earth's centre and Earth-only GM replace
  the barycentre (register R28). Sphere-of-influence entry events. The analytic
  hyperbola inside a sphere. Capture at periapsis with the hold setting only the amount,
  detents at "captured" and "planned orbit", a soft floor at circular, periapsis floors
  instead of aerobraking. The drawn 1 g burn arc and the precomputed finite-burn loss
  table for 1, 2 and 3 g (D18 items 3, 4 and 8).
- **Acceptance.** Energy test: a loose capture at Mars costs 0.71 km/s within 1% and at
  the Moon 0.21 km/s within 1% (the research's computed values). The loss table matches
  an integrated constant-acceleration burn within 0.1% at its nodes. The stable-orbit
  rule (periapsis above the safe altitude, apoapsis inside 0.49 Hill radii) has tests at
  both edges. Proof: `cargo test -p starshot-physics -p starshot-game --locked`.
- **Prototypes.** 3.

### PR21: Lock states and cues

- **Goal.** Previews lock to the next sphere of influence with one faded ghost leg. Aim
  assist snaps to flybys that lead to the target. There are four lock states: capture
  available, slingshot to the next target, flyby with no plan, and impact. Each carries a
  colour (Okabe-Ito sky blue for brake, orange for boost), an icon, a map shape, text, a
  sound hook and a haptic hook (D18 items 5 and 6).
- **Acceptance.** A table-driven test asserts every state has all six channels and a
  text that names the action. Contrast of each colour against the field is at least 3:1
  (computed in the test). The preview stays under its budget in CI (the timing test).
  `verify-game` reads each state's text from the live region. Proof: the tests named,
  `npx vitest run apps/game`, `verify-game`.
- **Prototypes.** 4. The Okabe-Ito hex values are verified against their source first.

### PR22: Time map

- **Goal.** An event-anchored time map gives every launch about 4 to 8 s of player time,
  eased in log space and slowing into burns and encounters. Reduced motion uses 0.6 of
  the budget without changing the result (D18 item 7).
- **Acceptance.** Unit tests: the map is monotonic. Total player time for the campaign's
  known solutions lies in 4 to 8 s. Reduced motion scales time only. Proof:
  `npx vitest run apps/game`, `verify-game` timing per flight in its report.
- **Prototypes.** 2.

### PR23: Launch-window screen

- **Goal.** A window table per target computed at build time with the core's Lambert
  search, stored as JSON and tested like a fixture. A slider centred on today with snap
  ticks at windows, past windows dimmed and labelled, a "next window" button, the Moon's
  "launch any day" mode, and lockable minimum pull-backs.
- **Acceptance.** Regenerating the table reproduces the committed file. The slider is a
  labelled DOM control with keyboard steps of one day and one window. Snaps are
  announced. Proof: a test that regenerates and compares, `verify-game` steps.
- **Prototypes.** 6.

### PR24: Progression and saves

- **Goal.** Unlocks: `u_SOI` on first entry, and `2u` for a collector in a stable orbit,
  credited when its beam reaches Earth on mission time. The chapter reward at 20 solar
  radii; 2 g after a Jupiter flyby and 3 g after Saturn (D18 items 2 and 3). A versioned
  save that migrates `starshot.progress.v1` (`apps/game/src/progress.ts`) and an export
  and import code.
- **Acceptance.** Unit tests: unlock values for Moon, Mars, Venus, Jupiter and Saturn
  equal 0.27, 0.27, 0.73, 1.62 and 0.83 km/s within 0.005. A v1 save migrates with its
  stars intact. An export code round-trips and a corrupted one is rejected with a
  message. Proof: `cargo test -p starshot-game --locked`, `npx vitest run apps/game`.
- **Prototypes.** 5 (the economy script), whose report is committed with the band plan.

### PR25: three.js renderer

- **Goal.** three.js `WebGLRenderer` (r187 line) presenting the map as 2D with
  imperative scene code. Camera-relative positions converted from float64 each frame.
  Linear distances, enlarged body sizes with a visible badge, a scale bar and a
  true-size toggle. Canvas 2D kept as the fallback without WebGL 2 and as the
  accessibility reference. `render/draw.ts` split into painters so it leaves the size
  baseline. `docs/game-design.md` "Honest scale" updated (register R12) (D19).
- **Acceptance.** AC9 first-load part: `node scripts/check-bundle-size.mjs` reports
  first-load JavaScript under 300 KB gzip. `verify-game` passes with WebGL 2 and with it
  disabled (the fallback). No planet label exists only in the canvas. Proof: those
  commands.
- **Prototypes.** None. Frame time on the owner's low-end Android phone is recorded.

### PR26: Textures

- **Goal.** A texture pipeline. It downloads each source by URL and verifies its pinned
  SHA-256, then resizes and encodes KTX2 (ETC1S for colour, UASTC for normals) in 512, 1k
  and 2k tiers with a WebP 512 fallback. It writes manifest entries with output hashes.
  The transcoder loads lazily, and the service worker keeps an asset cache with a budget
  (D15, D19).
- **Acceptance.** AC9 texture part (level 1 at 1k under 300 KB). `check-assets` passes
  with every new file listed. No source image is committed. Proof: the gates.
- **Prototypes.** None. Transcode time per texture on the low-end phone is recorded.

### PR27: Stars and sky

- **Goal.** A star table from the Yale Bright Star Catalogue if its terms are confirmed,
  otherwise HYG as a separately licensed CC BY-SA file. The obliquity constant with its
  source and a test. The Solar System Scope CC BY 4.0 Milky Way. No Gaia-derived data
  (D15, register R2).
- **Acceptance.** A test rotates a known star from equatorial to ecliptic coordinates
  within 1 arcsecond of a published value. `check-assets` passes. Proof: the tests and
  gates.

### PR28: Audio and haptics

- **Goal.** Procedural Web Audio for pull tension, release, burn, sphere-of-influence
  chime per planet, capture detents, goal and miss. The context created on the first
  pull. Haptics through the Vibration API where it exists. Every cue paired with a
  visual pulse and live-region text (D15, D18 item 6).
- **Acceptance.** A test asserts no sound starts before a user gesture. A table test
  pairs every haptic with a sound, a visual and a text. `verify-game` passes with sound
  muted and with reduced motion. Proof: those commands.
- **Prototypes.** 1.

### PR29: Settings

- **Goal.** A settings screen: sound, music and haptics switches, a reduced-motion
  override, the texture tier, true size. `styles.css` split by feature so it leaves the
  size baseline.
- **Acceptance.** Every control is a labelled DOM element reachable by keyboard with a
  44 px target. Settings persist in the versioned save. The size baseline is empty or
  holds only `draw.ts` if PR25 left it. Proof: `verify-game`,
  `node scripts/check-file-size.mjs`.

### PR30: Firebase foundation

- **Goal.** `firebase.json`, `.firebaserc` with `demo-starshot` as the default,
  `firestore.rules` and `storage.rules` that deny everything, rules tests with
  `@firebase/rules-unit-testing` in the emulator in CI (no secrets), the one allow-listed
  production web configuration file with the `secrets` gate's exception for exactly that
  path (D13).
- **Acceptance.** AC15. `node scripts/check-secrets.mjs` still rejects Firebase
  configuration in any other file (a planted copy fails). Proof: those commands.
- **Owner steps.** F1 to F5 and F9 in [04-ops-checklist.md](04-ops-checklist.md#firebase-and-google-cloud).

### PR31: Accounts and leaderboard

- **Goal.** Anonymous sign-in only after the player opts into the leaderboard. Display
  names from a filtered list. A pending-score write that only its owner can create, with
  a per-player cooldown in the rules. App Check (reCAPTCHA Enterprise). The game plays
  fully offline and online features fail quietly (D13, D22).
- **Acceptance.** AC15 with the leaderboard rules: a player cannot write another's
  document, a second write inside the cooldown fails, free text is refused.
  `verify-game` with the network off plays level 1 to a result. Proof: those commands.
- **Owner steps.** F6 to F8.

### PR32: Replay verification

- **Goal.** A second-generation Cloud Function that loads the exact `.wasm` bytes the
  web ships, re-flies each pending replay with the level's frozen settings and the
  recorded `physics_version`, and writes the verified leaderboard entry. Older core
  versions stay runnable for scores they produced (D13, D16).
- **Acceptance.** AC16: every golden replay is accepted, a replay with one changed bit is
  rejected, and a replay with an unknown `physics_version` is rejected with a reason.
- **Owner steps.** F4.

### PR33: Hosting

- **Goal.** CI deploys to Firebase Hosting on merges to `main` (environment
  `production`). Same-repository branches get preview channels (environment `preview`),
  and forks get a downloadable build artifact. `firebase.json` sets the headers: hashed
  assets immutable, the app shell and service worker `no-cache`, and a CSP that allows
  the Firebase and reCAPTCHA origins and `wasm-unsafe-eval`. Also
  `/.well-known/security.txt`, the custom domain, and Pages kept as the mirror (D21).
- **Acceptance.** AC17. The deploy credential is federated, or a development-only
  Hosting key if the trial fails (F11). Production holds no key.
- **Owner steps.** M1 to M7, F10, F11, G10.

### PR34: Levels, Earth and Moon

- **Goal.** Chapter one's opening: leaving Earth orbit, a Moon flyby and a loose lunar
  capture. Each is on a real date with a known solution flown by the core and a par from
  the window table, and the progression is wired.
- **Acceptance.** AC8 for the new levels. A `verify-game` steps file
  `scripts/verify-steps/chapter-one.mjs` that plays level 1 to a result (AC10). Proof:
  `cargo test -p starshot-game --locked --test levels`, `verify-game --steps`.

### PR35: Levels, Venus and Mars

- **Goal.** Venus and Mars flybys and orbits on real windows from 2026 to 2031, with
  known solutions. The economy order from prototype 5.
- **Acceptance.** AC8 for the new levels. The chapter-one steps file reaches Mars.

### PR36: Levels, outer planets and the Sun

- **Goal.** A Jupiter flyby and loose capture, Saturn by way of Jupiter, and the close
  solar orbit at 20 solar radii as the chapter's end, with known solutions. The chapter
  stays under about 15 km/s from the parking orbit (D18 item 8).
- **Acceptance.** AC8. A test that the full progression's budget never exceeds 15 km/s.
  The chapter reward fires once.

### PR37: Credits

- **Goal.** An in-game credits screen built from the assets manifest, the data credits
  (NASA/JPL DE440 via NAIF; Horizons by JPL SSD), Mark's line with the name and handle
  he chose (D26), the NASA no-endorsement notice. `CREDITS.md` regenerated.
- **Acceptance.** `node scripts/gen-credits.mjs --check`. `verify-game` opens the screen
  by keyboard and reads its heading.
- **Owner steps.** K1 (the name and handle).

### PR38: Release lane

- **Goal.** A `workflow_dispatch` job that reads `## [Unreleased]`, picks the bump from
  a `Bump:` line, rewrites the heading with the version and date, bumps every version
  field (npm workspaces and the Cargo workspace), and opens a release PR. A second job
  tags `vX.Y.Z` when that PR merges. Environment `release` (AGENTS.md non-negotiable 10,
  register R26).
- **Acceptance.** A dry run on a scratch branch produces the expected diff. The version
  guard hook still denies hand edits. Proof: the workflow's dry-run output in the PR.
- **Owner steps.** G4's second switch, G10.

### PR39: Store preparation

- **Goal.** A notes document, no code. It holds privacy labels and data-safety answers
  for D22's data (anonymous id, display name, shots), the 13 and up rating, and export
  compliance. It also records the qualified store titles (D20), the trademark search
  results, and the choice between a Trusted Web Activity and native shells for the next
  program.
- **Acceptance.** The copy gate passes. Every claim about a store policy carries its
  URL.

### PR40: astlo upstream kit

- **Goal.** `tools/astlo-upstream/` holds a Python script (standard library only, like
  `python/astlo/build_wheel.py`) that regenerates what D29 offers Mark from the
  `python/astlo` commits. First, the patch series: `git format-patch` over the range
  after the import commit, with Starshot-specific paths stripped so each patch applies to
  astlo's own tree. Second, the report, built from `python/astlo/VERIFICATION.md` and the
  `ephem.validation/1` records the bench writes for the fixed astlo (producer
  `astlo <version>`, through `tools/ephem`'s `validate`). Third, a draft pull request body
  per topic for Mark's repository. Output goes to an ignored directory, never into git.
- **Acceptance.** The patches apply cleanly with `git am` to the unpacked wheel source in
  a temporary directory, and the fixed wheel's offline tests pass there. No patch
  touches a file outside astlo's tree. Every draft body passes
  `node scripts/check-copy-tells.mjs --stdin --kind pr` and
  `node scripts/check-secrets.mjs --stdin`.
- **Owner steps.** K2: the owner opens the pull requests; no agent does.

## Maintainability rules every PR obeys

- **Size.** About 400 contentful lines or 20 files per spec (`PR_SIZE_CAP`); a PR group
  of n specs is held to n times that (D30). `check-pr-size.mjs` from PR4 warns above the
  group's cap and fails at twice it. A spec that expects more says so and names where it
  splits.
- **No god files.** The `size` gate warns above 300 code lines and fails above 500 for
  `.ts`, `.tsx`, `.rs`, `.mjs` and `.css`; the baseline only shrinks; a `.tsx` file that
  exceeds two shape heuristics warns (D28). A component is a thin view; state lives in
  hooks with one reason each; pure helpers live beside them and are what tests call.
- **Files over about 300 lines get anchored edits**, never a rewrite (AGENTS.md,
  non-negotiable 12).
- **Comments explain why**, never what; long rationale goes in a module docblock or
  `docs/`.
- **The copy gate passes** on every file, UI string, issue, PR body and commit message
  (D27). No em dash, en dash or horizontal bar anywhere.
- **Layering.** `packages/` never imports `apps/`; nothing imports `python/` or
  `third_party/` (the `size` gate's layering check); in Rust, logic crates never depend
  on binding crates, and only `starshot-math` calls transcendental functions.
- **One writer per tree.** One builder per worktree, sequential building; only read-only
  research and review fan out (AGENTS.md, non-negotiable 8).
- **Physics numbers come with a test** against Horizons, the DE440 rails, an energy or
  timing check, or a known solution (AGENTS.md, non-negotiable 2).
- **Accessible from the first commit** (AGENTS.md, non-negotiable 7).

## The astlo growth path (D26, D29)

astlo grows beside Starshot in three stages. No plan item depends on Mark taking any of
them, and the game's runtime never depends on astlo (D26).

**Stage 1, now.** astlo is an independent cross-check: the bench writes the shared
`ephem.validation/1` report for the fixed astlo's positions (PR40), so its numbers are
read with the same file as Starshot's. astlo is also content: the planet "details", once
Mark makes them available, with credit (PR37). The fixes stay in `python/astlo`, one
topic per commit (D10, D29). Needs: PR8's formats and PR40's kit.

**Stage 2, after Mark grants a licence and astlo has the pure API.** `tools/ephem` is
built so astlo can take over its job. The generator and the validator are one module
with a documented interface, `generate(kernel, bodies, window, tolerance) -> Pack` and
`validate(pack, reference) -> Report`, and the CLI is thin (PR7, PR8). An astlo
implementation that produces packs passing the same tests means the game runs on data
astlo produced, verified against NASA, through the same per-body gate (D4, D17). The
first jobs astlo can own are the launch-window finder (the table of PR23) and the
small-body rails. Needs: his licence (D2, D10), the pure API and a Lambert solver that
returns velocities ([../../astlo/directions.md](../../astlo/directions.md)).

**Stage 3, if Mark wants it.** The dependency-free crates `starshot-ephemeris` (Table 1,
the rails reader, time scales) and a later `starshot-topocentric` are offered as a Rust
crate beside his Python, maintained by Starshot, with PyO3 bindings as an option. His
Python stays the teaching implementation and the crate the production one. Needs: those
crates depend on nothing but `starshot-math` (PR9's adversary check) and keep a stable
interface. No plan item depends on him taking it.

**How a change travels.**

1. It lands in `python/astlo` first, one topic per commit, verified against NASA/JPL
   (the `astlo-upstream` skill).
2. PR40's kit regenerates the patch series, the report and a pull request body per topic
   for Mark's repository.
3. The owner opens the pull requests (owner step K2).
4. When Mark adopts a change, Starshot pins his release, from his repository or PyPI,
   and drops its own copy of that change, so `python/astlo` shrinks towards a pin plus
   tests.

## Refuted

Approaches considered and rejected, so nobody re-derives them.

| Approach | Why not | Source |
|---|---|---|
| Run Python (astlo) in the browser with Pyodide | 6 to 21 MB download, about 13 times slower, and shipping the wheel is distribution of Mark's code | [../pr0-bootstrap.md](../pr0-bootstrap.md#refuted-options-with-the-losing-reason), D2 |
| A cross-platform engine (Godot, Bevy, Unity, Flutter) | Its physics would be replaced anyway; canvas-drawn UI fights real labelled DOM controls; Bevy breaks about every 3 months; Godot cannot export C# to the web | Architecture research, option 5 |
| Kotlin Multiplatform core | Kotlin/Wasm is Beta, so the web, the first target, would be the weakest | Architecture research, option 3 |
| A C++ core | Compilers fuse multiply-adds by default and memory bugs are silent; the highest risk of non-determinism | Architecture research, option 4 |
| TypeScript everywhere with an embedded JavaScript engine in the apps | Bit-exact only with a pure-JS maths layer; JIT availability in a third-party iOS app unverified; no server benefit | Architecture research, option 6 |
| A staged release with two engines | The owner ruled nothing is live; a dual-engine release doubles the test surface for no user | D16, register R4 |
| Shipping SPK kernels to the browser and reading them at runtime | 7.8 to 21.5 MB trimmed, plus a reader; ANISE in wasm took 95 MiB of memory with `de440s` | Ephemeris research, option 3 |
| VSOP2013 | About 290 MB of data; no gain at game accuracy | Ephemeris research, A3 |
| The GPL ELP/MPP02 port for the Moon | GPL-3.0-or-later code cannot enter Apache-2.0 code | Ephemeris research, A3 |
| nyx-space | AGPL-3.0-or-later would bind the game | Ephemeris research, A2 |
| Cubic Hermite rails | 3 to 9 times larger than Chebyshev for the same error | Register R9 |
| The literal 12.6 km/s starting budget | A 17.2 km/s excess makes slingshots optional on level one | D18, register R7 |
| Mass as flavour only | Fuel as impulse makes "probes first, people later" arithmetic | D18, register R8 |
| Manual burn timing | Punishes touch and motor-impaired players; the craft's computer times the burn | D18 item 4 |
| React Three Fiber for the game screen | About 248 KB on top of React and a second reconciler for a scene that changes every frame | D19, register R11 |
| A WebGPU-first renderer | 88 KB more, and most target phones would run its younger WebGL 2 backend anyway | D19 |
| Table 1 as the only source | No Moon; Saturn 27 arcmin after 2050; Jupiter 1.86 million km off | D17, register R3 |
| Gaia-derived sky data | CC BY-NC 3.0 IGO | D15, register R2 |
| The `.game` and `.online` domains | About US$340 a year for `.game`; `.online` renews at about US$28 after a cheap first year | D20, register R25 |
| Renaming the game | The owner keeps Starshot with a qualified title | D20 |
| A contributor licence agreement | Apache-2.0 section 5 settles inbound terms; DCO is enough for an open project | D12 |
| GPL or MPL for the code | GPL has an App Store removal history; copyleft does not stop a confusingly named clone, a trademark policy does | D12 |
| Issue types | Organisation-only | D23, register R13 |
| A merge queue | Organisation-only for public repositories | Register R14 |
| A CI token for the project board | A personal token in CI for a convenience; the orchestrator syncs instead | D23, register R15 |
| release-please and changesets | Both replace the hand-written `[Unreleased]` section | Register R26 |
| Renovate | Needs an app; Dependabot with SHA pins covers this repository | CI research, section D |
| Cloudflare as the primary host | Deferred, not refused: it moves only if bandwidth cost or latency in Africa measured in production says so | D21, register R6 |
| Committing none of the Firebase configuration | The owner chose to commit the production web configuration, which Firebase documents as an identifier | D13, register R5 |
| A script that fetches the wasm from the latest CI run for contributors without Rust | Needs a token or a public artifact, depends on artifact retention, and lets a local build use bits its own gates did not produce | Orchestrator ruling, register R27 |
| Publishing `@starshot/core-wasm` to npm so UI-only contributors can skip Rust | Deferred, not refused: it adds a release step and a second source of the wasm bits. Trigger: outside contributors arrive after chapter one (D25) and name the Rust setup as the obstacle; then the release lane (PR38) publishes it at each release | Orchestrator ruling, register R27 |

## What the program deletes or replaces

| Today | Destination | When |
|---|---|---|
| `packages/physics` (TypeScript integrator, launch, Lambert, simulate) | `crates/starshot-physics`; deleted | PR11, PR12; deleted in PR17 |
| `packages/ephemeris` (TypeScript Table 1, time, bodies) | `crates/starshot-ephemeris`; deleted | PR9, PR10; deleted in PR17 |
| `packages/ephemeris/test/fixtures/horizons.json` | `fixtures/horizons/horizons.json` | PR9 |
| The TypeScript tests of those packages | Rust tests plus the frozen conformance fixtures in `fixtures/conformance/` | PR9 to PR12; deleted in PR17 |
| `tools/horizons/fetch_fixtures.py` | `tools/ephem` (`starshot-ephem fixtures`) | PR7 |
| `apps/game/src/sim/shot.ts`, `hint.ts`, `scoring.ts` logic; `levels.ts` physics fields | `crates/starshot-game`, called through `@starshot/core-wasm`; the TypeScript files keep types, UI helpers and level copy | PR13, PR14, PR16 |
| Canvas 2D as the primary renderer (`apps/game/src/render/draw.ts`) | three.js; Canvas 2D stays as the fallback, split into painters | PR25 |
| The seeded random starfield | A real star catalogue; the seeded field stays for the fallback | PR27 |
| Table 1 as the primary source | DE440 rails; Table 1 stays as the fallback and cross-check | PR10, PR18 |
| `EPHEMERIS_VALID_UNTIL_ISO` (2050) | The pack's coverage (1950 to 2150) with Table 1 before 1950 | PR18 |
| The `ephem.snapshot/1` sketch in `docs/architecture.md` | `ephem.pack/1` and `ephem.validation/1` | PR8 |
| The MIT licence text | Apache-2.0; copies already received under MIT stay MIT for their holders | PR0 (D12) |
| GitHub's default labels and `accessibility` | The prefixed taxonomy in `.github/labels.yml` (`accessibility` becomes `area:a11y`; `bug`, `enhancement`, `documentation` become `kind:bug`, `kind:feature`, `kind:docs`; `duplicate`, `invalid`, `wontfix`, `good first issue`, `help wanted` stay) | PR0, applied by the orchestrator's sync |
| `localStorage["starshot.progress.v1"]` | A versioned save with migration and an export code | PR24 |
| GameScreen.tsx's 1,025 lines | `apps/game/src/ui/screen/` modules and hooks | PR2, PR3 |
| GitHub Pages as the only host | Firebase Hosting for production; Pages as the mirror | PR33 |

## Session protocol

Every build session follows this order, for the orchestrator and for builders. A
session builds two or three PR groups (D30); steps 2 to 8 run once per group.

1. **Open with the audit.** Run `VCS_AUDIT` from [../../../.claude/README.md](../../../.claude/README.md)
   (`git status --short && git branch --show-current && git log --oneline -5 && git
   rev-list --count main..HEAD`) and `gh pr list`; compare with the SessionStart line.
   Read `AGENTS.md`, this plan, [05-deviation-log.md](05-deviation-log.md) and the
   decision log's newest entries.
2. **Confirm the base.** The next group's branch bases on the previous group's branch in
   the [PR groups](#pr-groups-d30) table; harness worktrees branch from `main`, so check
   before building there (the `stacked-pr` skill).
3. **Claim.** Post the claim comment on each member's issue (D23; the `track-work`
   skill) and set its status.
4. **One builder at a time.** Spawn one `executor` for the group, or one per member in
   order when a member is large, with each spec's anchor, the absolute repository path
   and the base; nobody else writes to that tree.
5. **Review, bounded (D30).** One `adversary` pass in a fresh context against
   `.claude/rubrics/` and each member's "Adversary checks". It also reads this plan's
   deviation log and the PR body against the diff, and reports per directory which files
   it opened. A domain lens joins only when the diff calls for it (`physics-auditor`,
   `verification-driver`, `rules-reviewer`). No refuters by default: the orchestrator
   judges each finding from the tree and closes the gaps. A second adversary pass runs
   only over files the first did not open. A delta pass runs only when the fixes touched
   a physics number, a workflow, the harness or more than about 50 contentful lines.
6. **Gates.** `npm run gates` (with `STARSHOT_REQUIRE_RUST=1` from PR6), plus
   `verify-physics` for crates, packages or fixtures and `verify-game` for anything a
   player sees; every command reported with its exit code.
7. **Publish (orchestrator only).** Commit per D24 (the recipe in PR4's spec). Check the
   message and the PR body with `check-secrets.mjs --stdin` and `check-copy-tells.mjs
   --stdin`. Push the branch by name, and open the PR against the previous group's
   branch with `Part of #a, #b` for its members (or `Closes` for the PR that reaches
   `main`). Post the completion comments, and run `node scripts/sync-work.mjs --apply` if
   `03-work.yaml` changed.
8. **Record.** Update the acceptance results in the PR body, any deviation in
   [05-deviation-log.md](05-deviation-log.md), and each issue's status.
9. **Close a band.** After its last group: the `verify-all` sweep, a handoff, and for
   Bands B to E the next band's planning session in a fresh session, which also confirms
   that band's groups.
10. **Hand off at the budget band.** At about 70% of the session's context, stop after
    the current group's publish step and write the handoff below; never start a group
    the session cannot finish.
11. **Master review, once, at the end (D30).** After the last group: the `verify-all`
    sweep with every acceptance criterion's command and exit code, a multi-lens review of
    the whole stack, a final fix group, then the owner's review and the one merge.

### Handoff template

The fields of the `handoff-prompt` skill, in its order. Read each value fresh at close.

```text
Repo: <abs path>. Stack tip: starshot/v1-pr<NN>-<topic> @ <short sha>.
Base of the stack: starshot/pr0-bootstrap until PR0 merges, then main.
Plan: docs/plans/v1-starshot/00-plan.md.
Decisions: docs/decisions.md (D1..D30 resolved; do not re-litigate).
Deviations: docs/plans/v1-starshot/05-deviation-log.md.
Open-gate at close: <the line sh scripts/agent/open-gate.sh prints>.
Done: PR0 <one line>; group PR2 <one line>; ...; group PR<k> <one line>.
Next: group PR<m> (PR<m>, PR<m+1>) <titles>.
Specs: docs/plans/v1-starshot/00-plan.md#<anchor>, ... Issues: #<a>, #<b>.
Owner steps it waits on: <ids from 04-ops-checklist.md, or none>.
Routing: you are the orchestrator (top tier); route by "would anything be lost with the
cheaper tier?"; roster in .claude/agents/; one builder at a time; one adversary per
group against .claude/rubrics/, with physics-auditor, verification-driver or
rules-reviewer when the diff calls for them (D30). Executors never push.
DoD: npm run gates (+ verify-physics, verify-game, public-hygiene as the diff requires),
every command with its exit code.
Stop: at about 70% of the context, finish the current group's publish step, then emit
this block again.
First commands:
  git status --short && git branch --show-current && git log --oneline -5
  gh pr list
  node scripts/sync-work.mjs --program v1-starshot --check
```

## What the owner must do by hand

The settings, accounts, domain, Firebase projects, the message to Mark and the playtests
are listed, grouped and ordered, with how to confirm each and which PRs wait on them, in
[04-ops-checklist.md](04-ops-checklist.md). PR0's CI hardening (PR1's spec) waits on G3 and G4. G1 and G5 are needed
before PR4 and the Pages proof. After PR0 merges: G8 (the DCO app). Now: M1 to M4 (the
domain and the reporting addresses) and K1 (Mark).
