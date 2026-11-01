# Changelog

All notable changes to Starshot are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project will use
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it starts making
releases.

Write new entries under `## [Unreleased]`. Release headings with dates and version
numbers will be added by an automated release step (planned), never by hand.

## [Unreleased]

### Added

- The Starshot game (`apps/game`): a slingshot across the real Solar System, built
  with Vite, React and Canvas 2D, playable on phones and desktops, with keyboard
  controls, screen-reader announcements and reduced-motion support.
- Four campaign levels on real launch windows (Mars in late 2026, Venus in 2028,
  Jupiter in 2028 and a Voyager-2-style Jupiter-to-Saturn Grand Tour from 1977), plus a
  sandbox that starts from today's date. Every campaign level has a known solution that
  the tests fly.
- Star scoring: one for reaching the target, one for an efficient launch (within 10%
  of par, 5% on the Grand Tour), one for a bullseye or the required flyby; hints cap a
  level at two stars.
- An aiming preview that runs the identical simulation as the real launch, in a Web
  Worker so the screen never freezes. The launch button waits until the preview of the
  aim on screen has finished, and the launch flies that preview's own request.
- A training level: First Light's capture zone is three times Mars's real sphere of
  influence, labelled as such in the HUD, the status line and the result, with a
  first-run coach mark ("Drag anywhere to pull the slingshot"). Every other level is
  real size.
- Deterministic hints: a search with a fixed number of simulations and no wall clock,
  rounded to the precision the controls show, so the hint's label is exactly what "Use
  hint" applies; when no exact hit exists, the hint says so.
- `@starshot/ephemeris`: planet positions and velocities from NASA/JPL's approximate
  Keplerian elements (1800 to 2050), time conversions (UTC to TDB), planet masses,
  radii and spheres of influence, and orbit paths for drawing. Tested against NASA/JPL
  Horizons at five dates from 1977 to 2049.
- `@starshot/physics`: an adaptive Dormand-Prince flight simulator with encounter,
  impact and capture detection, a patched-conic Earth departure, delta-v and C3
  helpers, a Lambert solver and a launch-window search.
- `tools/horizons/fetch_fixtures.py`: refreshes the NASA/JPL Horizons reference data
  used by the tests (Python standard library only).
- `tools/astlo-bench`: the scripts and results used to compare astlo with NASA/JPL.
- Automatic publishing to GitHub Pages and a CI workflow that runs every quality check
  on each pull request.
- Quality gates (`npm run gates`): secret and private-name scanning, a byte-for-byte
  check that `third_party/astlo` is untouched, agent-configuration checks, type
  checking, tests and the build.
- The agent working agreement (`AGENTS.md`) and its Claude Code setup: agent roster,
  review rubrics, skills and safety hooks.
- Documentation: README, licence and notices, contributing guide, security policy,
  decision log, architecture, game design, hosting guide, the astlo evaluation and the
  bootstrap plan.
- `python/astlo`: Mark Macharia's astlo v12 source, imported unmodified, followed by
  Starshot's fixes, one commit per topic: consistent J2000 orbital elements (Earth from
  24° off to about 0.2′), the Moon (116° off to about 1°), the RK4 step, barycentric
  velocities, sky positions (to within 0.06°), `ValueError` instead of `sys.exit`, a
  quiet import with an honest `Requires-Python >=3.12`, and a new looped RK4 N-body
  integrator. It is Mark's code, all rights reserved and not MIT, shared in good faith
  pending his permission (decision D10).
- `python/astlo/build_wheel.py`: a reproducible, standard-library build of the fixed
  wheel, `astlo-12.5.5130000+starshot.1`. The PEP 440 local label marks a patched
  downstream build (PyPI refuses such versions), and the wheel's description opens with
  one line saying it is a Starshot-patched build of Mark Macharia's astlo, not an
  official release. Plus its NASA/JPL benchmarks (`python/astlo/bench`), an offline
  test against committed Horizons fixtures, and `python/astlo/VERIFICATION.md`.
- An `astlo` CI workflow that builds the fixed wheel whenever `python/astlo` changes,
  prints its sha256, keeps it as the `astlo-fixed-wheel` artifact before anything is
  installed from PyPI, and then tests it.
- An optional `STARSHOT_PRIVATE_NAMES` repository secret (comma-separated) that CI and
  the Pages workflow pass to the `secrets` scan alone, before `npm ci`; forks run
  without it. Setup in `docs/hosting.md`.
- Decision D10 (the owner's call), which revises D2 for `python/astlo`.
- Licence records in the REUSE layout: `LICENSES/` with the Apache-2.0 and CC BY 4.0
  texts and two `LicenseRef` notices (Mark Macharia's astlo, and the Starshot brand),
  and `REUSE.toml`, which labels every path (D12).
- Governance files: `TRADEMARK.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 3.0),
  `GOVERNANCE.md`, `SUPPORT.md` and `CREDITS.md`. `CONTRIBUTING.md` now covers the
  DCO sign-off, issue claims and labels, the copy standard and AI-assisted
  contributions.
- Issue forms for bugs, features, level ideas and physics discrepancies; a label
  taxonomy in `.github/labels.yml`; the DCO app's configuration in `.github/dco.yml`;
  and a pull request template that names the issue and the AI tool used.
- The copy standard (`docs/copy-standard.md`, D27) and its `copy` gate
  (`scripts/check-copy-tells.mjs`). The gate reads Markdown, UI strings through the
  TypeScript parser, issue forms and commit messages. It fails on the em dash, the en
  dash and a short list of stock phrases, and warns on the rest.
- A `copy-lint` workflow that checks issue, comment and pull request text on GitHub and
  keeps one comment per thread up to date.
- A `size` gate (`scripts/check-file-size.mjs`, D28): no file over 500 code lines
  unless it is on a baseline that may only shrink, warnings for large components, and a
  layering check that keeps `packages/` from importing the game.
- A `licence` gate (`scripts/check-licence.mjs`) that fails when a file has no licence
  record, `LICENSE` is not Apache-2.0, a `package.json` names another licence, or an
  art or audio file is missing from `CREDITS.md`.
- `scripts/sync-work.mjs`: creates and updates a program's labels, milestone, issues and
  sub-issues on GitHub from `docs/plans/<program>/work.yaml`, over REST, as a dry run
  unless told to apply (D23). The `track-work` skill explains its use.
- The v1-starshot program plan in `docs/plans/v1-starshot/` (the plan with its 40
  pull-request specs, the research, the disagreement register, the issues as code, the
  owner's checklist and the deviation log), decisions D12 to D30 in `docs/decisions.md`,
  and `docs/astlo/directions.md`, the technical note for Mark Macharia on where astlo
  could grow beside Starshot (D26, D29).

### Changed

- Starshot's own code and documentation are now licensed Apache-2.0 instead of MIT
  (D12). The four `package.json` files say so; Mark Macharia's files keep his terms.
- Game: result messages are statements ("Captured by Mars", "Hit."), with one
  exclamation mark left for a bullseye, and the hint tag no longer uses a dash.
- Documentation: ranges use "to" instead of the en dash, and a few stock phrases were
  rewritten, so the tree passes the copy gate.

- Mark Macharia's original astlo files moved, unmodified, into `third_party/astlo/`.
- The `secrets` gate skips its email rule, and only that rule, in Mark's own files under
  `python/astlo/` (his published contact addresses are upstream content).
- The Pages workflow no longer passes an unused `BASE_PATH`; its comment now says the
  game's relative `base` makes a path prefix unnecessary.
- Simulator settings are frozen per level and carried in each shot request, so a
  level's preview, launch, hint and tests still share one object (decision D6, clarified
  in the decision log). Sandbox targets beyond Mars use `OUTER_SIM_SETTINGS` and a
  shorter list of pulling planets, which keeps previews of 5 to 14 year flights fast.
- Pars are the cheapest shot found in each window. The Grand Tour's par is now the
  cheapest Jupiter-assisted hit found by a fine search, with a 5% efficiency tolerance,
  because 10% would allow nearly the full slingshot speed.
- The decision log notes that `python/astlo/astlo/**` and its `.dist-info` are outside
  the MIT licence (D3, following D10), and that D6's settings are frozen per level.
- The third-party guard and check messages now say that astlo fixes go into
  `python/astlo` as one-topic commits (D10), not to Mark privately as patches.
- Neutral wording ("a slingshot game in orbit") replaces a comparison with another
  game's name in the top-level README, `AGENTS.md` and `docs/`.
- CI: every workflow starts with no token permissions, and each job asks for what it
  needs. Every action is pinned to a full commit SHA. A new Scorecard workflow scores
  the supply chain, and Dependabot waits 7 days before it proposes a new release.
- CI: the required `gates` check now fails when any of four jobs fails, is cancelled or
  is skipped: the gate registry, zizmor on the workflows, dependency review, or the
  game's play-through in a headless browser. A failed gate shows as an annotation and in the job summary.
- The plan's specs now build as PR groups, two or three a session, with one bounded
  review per group and one master review of the whole stack at the end (D30).

### Fixed

- `@starshot/physics`: `lambert()` now solves long transfers (more than 180°), with a
  numerically stable Stumpff C function and an upper bracket that steps back from the
  single-revolution limit until the flight time is finite.
- `@starshot/physics`: the departure from Earth is energy-consistent. When Earth's
  gravity switches on at twice its sphere of influence, the probe's Earth-relative
  speed is raised so that it still leaves with the v∞ the player chose.
- `@starshot/ephemeris`: `dateFromEt` rounds to the millisecond, so exact UTC midnights
  no longer print as 23:59:59.999.
- Game: a launch can no longer fly a different shot from the one previewed on screen.
- Game accessibility: the result dialog keeps keyboard focus inside it and fits
  landscape phones; labels are larger; every control's accessible name starts with
  its visible text.
- Game: the service worker deletes only Starshot's own caches, so other sites on the
  same GitHub Pages origin keep theirs.

[Unreleased]: https://github.com/harmon-amakobe/starshot/commits/main
