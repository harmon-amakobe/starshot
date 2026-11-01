# PR0: bootstrap Starshot

The record of the first Starshot pull request, in the Kobe-loop format: what it set out
to do, how each goal is proven, what landed, where it deviated, and what comes next.

| | |
|---|---|
| Branch | `starshot/pr0-bootstrap` → `main` |
| Shape | One pull request with layered commits (D8) |
| Date | 2026-10-31; fix round 2026-11-01 |
| Decisions | D1 to D10 in [../decisions.md](../decisions.md) |

## Goals

1. Turn the fork of Mark Macharia's astlopublic into Starshot's home without touching
   his work: his files moved, unchanged, into `third_party/astlo/` and pinned by hash
   (D1, D2).
2. Ship accurate, tested building blocks under MIT: `@starshot/ephemeris` (NASA/JPL
   Table 1, validated against Horizons) and `@starshot/physics` (adaptive integrator,
   patched-conic launch, Lambert search) (D3, D4).
3. Ship a playable first version of the game: Vite + React + Canvas 2D, physics in a Web
   Worker, preview identical to launch, campaign levels on real launch windows, each
   proven solvable by a test (D5, D6).
4. Publish it for free on GitHub Pages with no backend and no secrets (D7).
5. Install the Kobe loop: `AGENTS.md`, `CLAUDE.md` pointer, agent roster, rubrics,
   skills, hooks and a deterministic gate registry (D9).
6. Document it for a non-specialist owner: README, licence and notices, contributing,
   security, decisions, architecture, game design, hosting, and a sanitized astlo
   evaluation with its benchmark scripts.
7. (Added 2026-11-01, D10.) Fix astlo in the open: Mark's v12 source in `python/astlo/`
   with one commit per fix, a reproducible wheel, benchmarks and an offline test against
   NASA/JPL, built and tested by CI, without touching `third_party/astlo/`.

## Acceptance criteria and proof

Each criterion names the command that proves it. "Result" is filled in from real runs;
a criterion without a recorded result is not yet proven.

| # | Criterion | Proof command | Result |
|---|---|---|---|
| A1 | Every gate passes from a clean install | `npm ci && npm run gates` | `npm run gates`: `gates: 9/9 passed` (exit 0) on the final tree before the push (2026-11-01). The clean `npm ci` run is CI's on the pull request |
| A2 | Planet directions within budget vs Horizons at 5 dates, 1977 to 2049 | `npx vitest run packages/ephemeris` | worst errors: Mercury 0.30′, Venus 0.25′, Earth 0.18′, Mars 0.98′, Jupiter 5.15′, Saturn 8.61′, Uranus 1.41′, Neptune 0.75′ (budgets 1.5′ to 15′) |
| A3 | Integrator, launch model, Lambert, Mars window, Jupiter assist, impact stop, preview speed | `npx vitest run packages/physics` | `npx vitest run packages`: 2 files, 28 tests passed, ephemeris and physics together (2026-11-01, after the physics fix round; was 25). The Mars window test's threshold is deviation 14 and D11 |
| A4 | Every campaign level's known solution reaches its target with the game's exact settings; Grand Tour needs Jupiter | `npx vitest run apps/game` | 3 files, 40 tests passed; with A3, the 68 tests of the `test` gate (2026-11-01, final tree; an earlier count of 70 included a since-deleted measurement file) |
| A5 | `third_party/astlo` byte-identical to upstream | `node scripts/check-third-party-untouched.mjs` | 47 files match `third_party/astlo.sha256`, and the 50 files of `packages/` and `apps/` point nowhere into astlo (exit 0, 2026-11-01; the gate fails on a planted reference) |
| A6 | Nothing private or secret in files, commit messages or the PR body | `node scripts/check-secrets.mjs`; `git log --format='%an <%ae>%n%B' main..HEAD \| node scripts/check-secrets.mjs --stdin` | 169 files clean with the local private-name list loaded; every commit message on the branch clean (both exit 0, 2026-11-01, final tree). The PR body is checked when it is written |
| A7 | The game works on a phone and a desktop viewport, console clean | `npm run build && node scripts/verify-game.mjs --base /starshot/` | phone, desktop and phone with reduced motion: console 0, page errors 0, failed requests 0, no horizontal overflow, unnamed controls 0, targets under 44 px 0 (exit 0, 2026-11-01, on the build from the A1 run, with a machine-wide Playwright). Re-run on the final build at merge |
| A8 | The site deploys and loads | After merge: Actions → Pages is green; <https://harmon-amakobe.github.io/starshot/> loads | needs the owner's one-time setup ([../hosting.md](../hosting.md)) |
| A9 | Documentation links resolve and name nothing private | a relative-link and anchor check over every Markdown file outside `third_party/`; `node scripts/check-secrets.mjs` | 54 relative links, 0 broken; secrets scan clean (2026-10-31, docs layer). After the D10 round: 97 relative links and anchors in 46 Markdown files, 0 broken; secrets scan clean (2026-11-01). After the review round: 101 relative links and anchors in 46 Markdown files, 0 broken (a throwaway checker outside the repository, itself shown to flag a planted bad anchor and a missing file); secrets scan clean with the local list (2026-11-01) |
| A10 | The fixed astlo wheel builds and passes its offline JPL test in a fresh virtualenv; the published wheel fails it | `python3 python/astlo/build_wheel.py`, `pip install` it into a new venv, `python -I -m unittest discover -s python/astlo/tests -v` | 9 tests OK on Python 3.12.3 and 3.13.18; the build is byte-identical across runs and Python versions; against the published wheel, every check fails (2026-11-01). Rebuilt as `astlo-12.5.5130000+starshot.1` (96,601 bytes, sha256 `41dfebfe…b1f49c5206`): byte-identical on Python 3.11, 3.12 and 3.13; RECORD 19 entries, no mismatch; METADATA shows the new version and the one-line note; installed into fresh virtualenvs, 9 tests OK on 3.12.3 and 3.13.18 (2026-11-01). The published-wheel run was not repeated |

## What landed

| Layer | Contents |
|---|---|
| Upstream | Mark's files moved unchanged to `third_party/astlo/`; `third_party/astlo.sha256` |
| Workspace | Root `package.json` (npm workspaces), `tsconfig.base.json`, `vitest.config.ts`, `.nvmrc` (22), `.gitattributes` (LF), `.editorconfig` |
| Packages | `packages/ephemeris`, `packages/physics`, with tests and the Horizons fixtures |
| Tools | `tools/horizons/fetch_fixtures.py` (fixtures), `tools/astlo-bench/` (astlo vs JPL scripts and results) |
| astlo fixes (D10) | `python/astlo/`: Mark's v12 source imported unmodified, then ten fix commits (data, Moon ×2, RK4, barycentric, topocentric ×2, errors, packaging, rk4steps); `build_wheel.py`, `bench/`, `tests/` and `VERIFICATION.md`; `.github/workflows/astlo.yml` |
| Game | `apps/game`: levels, scoring, progress, worker, rendering, accessible controls, offline cache |
| Harness | `AGENTS.md`, `CLAUDE.md`, `.claude/` (agents, rubrics, skills, settings), `scripts/agent/` hooks, `scripts/gates.mjs` and `scripts/check-*.mjs`, `scripts/verify-game.mjs` |
| GitHub | `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `dependabot.yml`, PR template, `copilot-instructions.md` |
| Docs | `README.md`, `LICENSE`, `NOTICE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/decisions.md`, `docs/architecture.md`, `docs/game-design.md`, `docs/hosting.md`, `docs/astlo-evaluation.md`, this plan |

## Deviations

Deviations are logged here, never absorbed (AGENTS.md).

1. **One pull request instead of a stack (D8, judgment).** The repository had no
   Starshot code to stack on, and the gates check packages, game, harness and docs
   together. Layered commits keep the single PR reviewable. Every later change follows
   the stacked-PR rule.
2. **Benchmark results: tables only.** `tools/astlo-bench/results/` holds the two
   comparison tables. The raw astlo output dumps (position JSON) were left out, because
   astlo's licence reserves rights over distributing its output (D2).
3. **Benchmark scripts lightly hardened.** `compare.py` now uses Python's standard
   library instead of calling `curl`, takes its input and output files as arguments, and
   labels rows by date. Re-run on the original astlo output on 2026-10-31, it reproduced
   every number in `compare_shipped.txt`. The other scripts gained usage notes, an
   `OUTF` option, and keep astlo's import banner out of their JSON output.
4. **astlo evaluation sanitized.** The published copy keeps every finding, table and the
   claims scorecard, drops recommendations addressed to one person and a draft
   message, condenses the build recommendations into "What Starshot took from this", and
   uses words instead of status emoji.
5. **Plan location.** This record lives at `docs/plans/pr0-bootstrap.md`, as specified
   for the bootstrap; later programs use `docs/plans/<program>/` per the `plan-pr0`
   skill.
6. **D2 revised by D10 (the owner's call, 2026-11-01).** The owner decided that the
   astlo fixes are made in this repository first, in `python/astlo/`, one reviewable
   commit each, shared in good faith pending Mark's written permission, and shown to
   him once Starshot is finished. `third_party/astlo/` stays the pristine reference;
   the game and packages still use no astlo code. Nothing has been sent to Mark yet,
   and the draft message to him stays outside the repository. Follow-ons in this PR:
   the `secrets` gate skips only its email rule in Mark's files (his published
   addresses); `AGENTS.md`, the `astlo-upstream` skill, the hygiene rubric, README,
   NOTICE, the evaluation and the changelog describe the new state.
7. **Fix round on the packages (2026-11-01).** `lambert()` now solves long (more than
   180°) transfers; the Earth departure is energy-consistent (when Earth's gravity
   switches on at twice its sphere of influence, the Earth-relative speed is raised so
   the asymptotic v∞ equals the player's); `dateFromEt` rounds to the millisecond.
   Because the departure changed, level 1's stored known solution no longer hits and
   pars or hints may shift; re-solving it is the orchestrator's (see A4).
8. **No pip ecosystem in Dependabot.** `python/astlo` declares its dependencies only
   in Mark's wheel METADATA, which Dependabot does not read, so a `pip` entry would find
   nothing to update. CI installs the latest dependencies from PyPI on every run.
9. **No gate for astlo.** The astlo test needs numpy and matplotlib from PyPI, so it
   runs in its own workflow (`astlo.yml`, on changes under `python/astlo/`) rather
   than in `npm run gates`.
10. **Pages workflow comment.** It said the build received `BASE_PATH`; the game's Vite
    config uses `base: "./"`, so the comment was corrected and the unused variable
    removed.
11. **Simulator settings frozen per level, not one object (D6 clarified, game review
    round 2026-11-01).** D6 and the first `AGENTS.md` said the preview and the launch
    share one frozen `SIM_SETTINGS`. Each level now carries its own frozen settings
    (`Level.sim`) inside every `ShotRequest`: `SIM_SETTINGS` for the campaign and the
    inner-planet sandbox, `OUTER_SIM_SETTINGS` (rtol 1e-9, 300 km, 10-day steps) with a
    shorter attractor list for sandbox targets beyond Mars, whose 5 to 14 year previews
    were too slow for a phone. A level's preview, launch, hint and tests still use one
    object, so D6's rule holds; the decision log carries an append-only note saying so,
    and `AGENTS.md` non-negotiable 5, the architecture page, the skills and the agent
    files now describe per-level settings.
12. **A 3× training capture zone on level 1.** The plan's levels all scored against the
    target's real sphere of influence. After the game review, First Light, the
    teaching level, scores against three times Mars's (`captureZoneScale: 3`) and shows
    a first-run coach mark. The HUD, the status line and the result say "Training
    capture zone (3× real)", so the larger zone is never silent, and every other level
    and the sandbox stay real size (`levels.test.ts` checks both, and that the same
    shot misses the real-size zone).
13. **Grand Tour efficiency tolerance 5% (`parTolerance: 1.05`), not the default 10%.**
    Its par is the cheapest Jupiter-assisted hit a fine search found (v∞ 9.10 km/s);
    110% of it would allow v∞ up to about 10.09 km/s, nearly the 10.5 km/s cap, so the
    star would go to almost every hit. 105% allows up to about 9.60 km/s. The title
    screen and the result dialog state the tolerance per level.
14. **Mars Lambert physics test: "< 1.25 SOI" instead of "reaches the SOI".** The test
    in `packages/physics/test/physics.test.ts` flies the two-body Lambert minimum
    through the full simulator. Before the `lambert()` fix it reached Mars's sphere of
    influence; the fixed solver finds the true two-body minimum, which the planets'
    pull deflects into a near miss. Measured 2026-11-01 with the test's own inputs:
    launch 2026-11-02, 326 days, v∞ 2.982 km/s, closest approach 1.135 SOI, flight
    ends on its time limit. The test now asserts a closest approach under 1.25 SOI; the
    game's levels (A4) prove that a refined aim does reach Mars. AGENTS.md says
    loosening a budget needs a decision entry; this is a behaviour test rather than a
    Horizons accuracy budget, so it is logged here, and the owner may still want a
    decision entry for it.
15. **The astlo claims scorecard cites the source by community and month.** Section 4f
    of [../astlo-evaluation.md](../astlo-evaluation.md#4f-authors-claims-scorecard)
    names the author's public Reddit post in r/nairobitechies, October 2026, without a
    permalink, because none was recorded. It gains a link only if the owner supplies
    one.
16. **An optional repository secret for the private-name scan (D7 read, not
    changed).** D7 says the site needs no secrets, and it still needs none: nothing
    secret enters the build. The `secrets` scan can only find private project names it
    is given, and those names cannot be written into a public repository, so CI and the
    Pages workflow map an optional repository secret, `STARSHOT_PRIVATE_NAMES`, into one
    scan step that runs before `npm ci`. Forks and pull requests from forks run without
    it, and the scan says its name rule is off. If the owner reads D7 as forbidding even
    this, the two `env:` lines come out and the local list stays the only source.
17. **The fixed wheel's version is `12.5.5130000+starshot.1`, not `.post1`.** A post
    release (`.post1`) reads as Mark's own follow-up release and could be uploaded to
    PyPI under his project name. A PEP 440 local label marks a patched downstream build,
    and PyPI refuses it. The build also opens the wheel's description with a one-line
    "Starshot-patched build, not an official astlo release" note; the dist-info files in
    the repository are unchanged. The workflow artifact keeps the name D10 gives it,
    `astlo-fixed-wheel`, and is uploaded right after the build (sha256 printed) and
    before any dependency is installed from PyPI.

## Refuted options (with the losing reason)

| Option | Why not |
|---|---|
| Use astlo as the runtime engine | Licence reserves all rights (D2), and the public build's directions are off by up to 87° (see [../astlo-evaluation.md](../astlo-evaluation.md)) |
| Run astlo in the browser with Pyodide | 6 to 21 MB download, about 13× slower, and shipping the wheel is distribution |
| Server-side physics | A 60 fps aiming preview cannot wait for the network; static hosting needs no server (D5, D7) |
| A Firebase backend now | Nothing needs it yet; D7 keeps the site fully static, and any future backend is a separate Starshot-only project |
| A 3D game view | A flat screen cannot aim up or down; the game is 2D (D6); 3D waits for the orrery (D5) |

## Ops checklist (owner, one time)

These have no gate; [../hosting.md](../hosting.md) has the click-by-click steps.

- [ ] Actions tab: enable workflows on the fork.
- [ ] Settings → Pages → Source: **GitHub Actions**.
- [ ] Merge this PR; confirm the Pages run is green and the site loads.
- [ ] Branch ruleset on `main`: require a pull request and the `gates` check; block
      force pushes.
- [ ] Settings → Code security: secret scanning, push protection, private vulnerability
      reporting.
- [ ] Repository Variables: none needed (no build-time configuration exists yet).
- [ ] Optional: the repository secret `STARSHOT_PRIVATE_NAMES` (private project names,
      comma-separated) so CI's `secrets` scan checks them; the names never go into a
      file ([../hosting.md](../hosting.md#the-optional-private-name-list)).
- [ ] When Starshot is finished: show Mark `python/astlo/`, its `VERIFICATION.md` and
      the `astlo-fixed-wheel` artifact, and ask for his written permission (D10). If he
      objects, remove `python/astlo/` as the `astlo-upstream` skill describes.

## Next steps (stacked pull requests)

Each is its own branch, stacked per the `stacked-pr` skill, with its own plan.

1. **3D orrery** (`apps/orrery`): three.js + React Three Fiber on the unflattened
   ephemeris; readable scale with a true-scale toggle; time scrubber.
2. **Daily challenge**: one shared puzzle per day on today's real positions, with a
   shareable result.
3. **astlo data gate**, only once Mark grants a licence that allows it: the per-body
   `source` + `validation` contract in [../architecture.md](../architecture.md#future-the-astlo-data-gate),
   checked at the Horizons fixture dates against the existing budgets (D4).
4. **Internationalisation**: string extraction, then Kiswahili, shipped only after
   review by a native speaker.
5. **Release lane**: derive version bumps and dated CHANGELOG headings from
   `## [Unreleased]` at merge (the guard already keeps hands off version fields).

## Handoff

The next session starts by reading `AGENTS.md`, this plan and
[../decisions.md](../decisions.md), confirms PR0 is merged (or bases on its branch),
and opens the first stacked branch from the list above.
