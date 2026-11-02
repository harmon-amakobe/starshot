# Starshot

[![CI](https://github.com/harmon-amakobe/starshot/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/harmon-amakobe/starshot/actions/workflows/ci.yml?query=branch%3Amain)
[![Code licence: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue)](LICENSE)
[![Play Starshot](https://img.shields.io/badge/play-Starshot-635bff)](https://playstarshot.com)
[![Test beta](https://img.shields.io/badge/beta-test_candidate-d97706)](https://beta.playstarshot.com)

**A slingshot game in orbit, across the real Solar System.**

Pull back the slingshot, let go, and watch your probe fly to Mars, Venus, Jupiter or
Saturn, using the real positions of the planets on real launch dates. Miss, and the
Sun's gravity bends your path into a long loop. Swing close to Jupiter, and its gravity
flings you onward, as it did for Voyager 2.

Starshot is two things in one repository:

1. **A browser game** that works on phones and desktops, with no install and no account.
2. **Open orbital-mechanics packages** (planet positions and flight simulation) that
   anyone can reuse under the Apache-2.0 licence.

## Play Starshot

**<https://playstarshot.com>**

The public preview is live on Firebase Hosting. The browser game includes:

- Four campaign missions, from an Earth-to-Mars training flight to Saturn via Jupiter.
- Seven sandbox destinations, real launch dates and a shared aiming/flight simulation.
- A 3D scene with touch, mouse and keyboard controls, plus a Canvas fallback.
- Local pilot profiles and saves. No account is needed; Cloud demo is a local
  interaction study, not an account or backup.

The [release plan](docs/plans/current-game-release.md) records the initial publication
and domain checks. Versioned releases stage a candidate at [beta.playstarshot.com](https://beta.playstarshot.com),
then explicitly promote those tested bytes to production. Merging to `main` alone
does not publish. The [release runbook](docs/hosting.md) describes this process.
Production and beta use separate Firebase projects. Forks can build and host their
own static copy with the commands below.

## Promote a tested release

[![Open GitHub to promote a release](https://img.shields.io/badge/release-Promote_to_production-166534?style=for-the-badge&logo=github)](https://github.com/harmon-amakobe/starshot/actions/workflows/release.yml?query=branch%3Amain)

For the maintainer, after [staging and testing a stable candidate](docs/hosting.md#stage-test-and-promote):

1. Open the button above, then choose **Run workflow** in **Web release**.
2. Select branch `main`, target `promote` and the tested stable version, such as `0.1.0`.
3. Click **Run workflow**, then open the new run.
4. When it waits for approval, choose **Review deployments**, select `production`
   and click **Approve and deploy**.
5. Wait for the run to succeed, then check [playstarshot.com](https://playstarshot.com).

Production approval is restricted to [@harmon-amakobe](https://github.com/harmon-amakobe),
including runs requested by other writers. Administrator bypass is disabled.
The owner can approve their own run. The workflow publishes the exact tested candidate
without rebuilding, then publishes its GitHub release. The public button only opens
GitHub; clicking it does not deploy or grant access. See the [release controls](docs/hosting.md#production-approval)
for the approval boundary and recovery settings.

## Run it on your own computer

You need [Node.js](https://nodejs.org/) 22 (the version is pinned in `.nvmrc`).

```bash
npm ci          # install exactly the versions in package-lock.json
npm run dev     # start the game; open the local address it prints
```

Other useful commands:

| Command | What it does |
|---|---|
| `npm test` | Runs every test, including the accuracy checks against NASA/JPL |
| `npm run gates` | Runs every quality check (the "Definition of Done"); must pass before a change is merged |
| `npm run build` | Builds the static website into `apps/game/dist` |
| `npm run preview` | Serves the built static website locally |

## How it works, in one minute

- **Where the planets are.** NASA/JPL publishes a small table of numbers that describe
  each planet's orbit and how that orbit slowly changes. From it you can work out where
  a planet was or will be on any date from 1800 to 2050. Starshot does exactly that
  (`packages/ephemeris`). An *ephemeris* is a table or formula of positions over time.
- **How your probe flies.** Once you let go, the probe is pulled by the Sun and the
  planets at every moment. Starshot works out its path in small time steps, taking
  smaller steps near planets so nothing is missed (`packages/physics`). Gravity assists
  are not scripted: they fall out of the maths.
- **What you see is what you get.** The dotted line you see while aiming comes from the
  same calculation, with the same settings, as the real launch.

More detail: [docs/architecture.md](docs/architecture.md) (how the parts fit) and
[docs/game-design.md](docs/game-design.md) (how the game plays).

## What is in this repository

| Folder | What lives there |
|---|---|
| `apps/game` | The browser game: Vite + React, Three.js with a Canvas fallback, and flight physics in a Web Worker |
| `packages/presentation` | Shared spacecraft, controls, audio and presentation styles |
| `apps/prototype` | Design studies and the canonical credited observatory assets shared with the game |
| `packages/ephemeris` | Planet positions from NASA/JPL's table, time conversions, planet sizes and masses |
| `packages/physics` | The flight simulator, the launch model, and a launch-window finder |
| `tools/horizons` | A small Python script that downloads the NASA/JPL reference positions the tests compare against |
| `tools/astlo-bench` | The scripts behind the first comparison of Mark Macharia's astlo engine with NASA/JPL (see below) |
| `python/astlo` | Mark's astlo v12 with Starshot's fixes, one commit per fix, plus the wheel build, benchmarks and tests; his code, all rights reserved (see below) |
| `third_party/astlo` | Mark's original astlo files, kept exactly as he published them, all rights reserved |
| `docs/` | Decisions, plans, architecture, game design, hosting |
| `scripts/`, `.claude/`, `.github/` | Quality checks, the agent setup, and the GitHub Actions that test and publish |

## How accurate is it?

Every test run compares Starshot's planet positions with NASA/JPL
[Horizons](https://ssd.jpl.nasa.gov/horizons/), the reference that professionals use, at
five dates between 1977 and 2050 (19 Aug 1977, 1 Jan 2000, 30 Oct 2026, 31 Dec 2039 and
31 Dec 2049).

The error is measured as an angle seen from the Sun, in *arcminutes*. One arcminute is
1/60 of a degree. For scale, the full Moon looks about 30 arcminutes wide from Earth.

| Planet | Worst error at the five dates | The test fails above |
|---|---|---|
| Mercury | 0.30′ | 1.5′ |
| Venus | 0.25′ | 1.5′ |
| Earth\* | 0.18′ | 1.5′ |
| Mars | 0.98′ | 2′ |
| Jupiter | 5.15′ | 12′ |
| Saturn | 8.61′ | 15′ |
| Uranus | 1.41′ | 3′ |
| Neptune | 0.75′ | 2′ |

Distances from the Sun agree with JPL to within 0.13%, and speeds to within 0.41%. The
budgets live in `packages/ephemeris/test/ephemeris.test.ts`; the reference data is in
`packages/ephemeris/test/fixtures/horizons.json`. The numbers match the accuracy
NASA/JPL itself quotes for this table: under an arcminute for the inner planets, up to
about 10 arcminutes for Jupiter and Saturn.

\* "Earth" here is the centre of mass of the Earth and the Moon, which is what JPL's
table describes.

That is far more accurate than a game needs, and accurate enough that real launch
windows (like the late-2026 window to Mars) show up in the game on the right dates.

## A 3D scene with planar flight physics

The real planets orbit in slightly tilted planes (Mercury's is tilted 7 degrees; the
others are within about 3.5 degrees). The current campaign flattens those orbits onto
one plane so aiming needs only a direction and a launch speed. Its 3D camera can
orbit the scene, but that does not add inclination to the simulated flight. Within
the plane, flights use real gravity, masses and dates.

This means Starshot's flights are close to real missions, not identical to them. Do not
use the game to plan a real spacecraft. The packages themselves can also work in full
3D without the campaign's flattening.

## Starshot and astlo

Starshot was inspired by **astlo**, an orbital-mechanics engine that Mark Macharia
([@iamnothimbutwe](https://github.com/iamnothimbutwe)) built, impressively, on a phone.
Starshot began as a GitHub fork of
[iamnothimbutwe/astlopublic](https://github.com/iamnothimbutwe/astlopublic).
It is now a standalone GitHub repository and preserves that history and attribution.

- **His original files are untouched.** They live in `third_party/astlo/`, exactly as
  he published them. They are "all rights reserved", so Starshot does not modify or
  relicense them, and an automated check makes sure they never change.
- **Starshot's code is its own.** The game and packages were written from scratch from
  public NASA/JPL data and textbook physics. They do not copy or use astlo.
- **We tested astlo carefully** against NASA/JPL and wrote up what we found, including
  what works well and what needs fixing: [docs/astlo-evaluation.md](docs/astlo-evaluation.md).
- **We fixed what we found, in the open.** [`python/astlo/`](python/astlo/README.md)
  holds Mark's v12 source followed by Starshot's fixes, one reviewable commit per fix.
  Earth's direction goes from 24° off to about 0.2 arcminutes from NASA/JPL, and the
  Moon's from 116° off to about 1° (2.3° at worst). CI builds a fixed wheel from it on
  every change (`astlo-12.5.5130000+starshot.1`, the `astlo-fixed-wheel` artifact of the
  `astlo` workflow) and tests it against NASA/JPL. The `+starshot` label in its version
  marks a patched build, not one of Mark's releases, and PyPI does not accept it. It is still Mark's code, under his terms: the owner plans to show
  him the fixes when Starshot is finished and ask for his permission, and if he
  objects, the folder is removed. Nothing has been sent to him yet.
- If Mark chooses an open licence, astlo's data could be used in Starshot once it passes
  the same accuracy check against NASA/JPL that Starshot's own data passes.

## Licence

Copyright 2026 Harmon Amakobe and Starshot contributors.

- **Code and documentation:** [Apache-2.0](LICENSE) (D12). You may use, copy, change and
  share it, including commercially. Keep the licence and the notices in
  [NOTICE.md](NOTICE.md), and say what you changed. The licence includes a patent grant
  from every contributor.
- **Original art, audio and screenshots:** [CC BY 4.0](LICENSES/CC-BY-4.0.txt), with the
  credit listed in [CREDITS.md](CREDITS.md). Assets from elsewhere keep their own
  licences, also listed there.
- **The name, logo and icon:** not licensed with the code. A fork is welcome, but it
  needs its own name and logo before it ships as an app. See [TRADEMARK.md](TRADEMARK.md).
- **Mark Macharia's files** (`third_party/astlo/`, `python/astlo/astlo/` and
  `python/astlo/astlo-*.dist-info/`): copyright Mark Macharia, all rights reserved.
  **Not** covered by Starshot's licences.
- [REUSE.toml](REUSE.toml) records the licence of every path. Details, including the
  NASA/JPL data credits: [NOTICE.md](NOTICE.md).

## Credits

- **Mark Macharia** for astlo, the project that started this one. Starshot began as a
  fork of astlo.
- **NASA/JPL Solar System Dynamics** for the approximate planetary elements and the
  Horizons system.
- The open-source projects Starshot is built on: TypeScript, React, Vite and Vitest.
- Art, audio and data sources for anything the game ships: [CREDITS.md](CREDITS.md).

Starshot is an independent fan project, not endorsed by NASA, JPL or anyone named
above.

## Governance and contributing

Contributions are welcome, from people and from AI coding agents alike.

- Start with [CONTRIBUTING.md](CONTRIBUTING.md): the checks to run, how pull requests
  are organised, and how to add a level or a planet.
- The working agreement every agent (and every human) follows is
  [AGENTS.md](AGENTS.md). It is the core of the "Kobe loop": a small set of rules,
  checks and review steps that keep changes honest and the repository safe to publish.
- Settled choices are recorded in [docs/decisions.md](docs/decisions.md).
- Text in the repository, issues and pull requests follows the
  [copy standard](docs/copy-standard.md).
- Who decides what: [GOVERNANCE.md](GOVERNANCE.md). Where to ask: [SUPPORT.md](SUPPORT.md).
  How we treat each other: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Commits carry a DCO sign-off (`git commit -s`); see [CONTRIBUTING.md](CONTRIBUTING.md).
- Found a security problem? Please report it privately: see [SECURITY.md](SECURITY.md).
