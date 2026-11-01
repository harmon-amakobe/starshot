# Starshot

**A slingshot game in orbit, across the real Solar System.**

Pull back the slingshot, let go, and watch your probe fly to Mars, Venus, Jupiter or
Saturn, using the real positions of the planets on real launch dates. Miss, and the
Sun's gravity bends your path into a long loop. Swing close to Jupiter, and its gravity
flings you onward, just as it did for Voyager 2.

Starshot is two things in one repository:

1. **A browser game** that works on phones and desktops, with no install and no account.
2. **Open orbital-mechanics packages** (planet positions and flight simulation) that
   anyone can reuse under the MIT licence.

## Play it

**<https://harmon-amakobe.github.io/starshot/>**

The link works once GitHub Pages is switched on for this repository. It takes two
clicks, described in [docs/hosting.md](docs/hosting.md). After that, every change merged
into `main` is published automatically.

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
| `npm run preview` | Serves that built website locally, the way GitHub Pages will |

## How it works, in one minute

- **Where the planets are.** NASA/JPL publishes a small table of numbers that describe
  each planet's orbit and how that orbit slowly changes. From it you can work out where
  a planet was or will be on any date from 1800 to 2050. Starshot does exactly that
  (`packages/ephemeris`). An *ephemeris* is simply a table or formula of positions over
  time.
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
| `apps/game` | The game: Vite + React, drawn on a Canvas; the flight maths runs in a background thread (a Web Worker) so the screen never freezes |
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

## The one big simplification: the game is flat

The real planets orbit in slightly tilted planes (Mercury's is tilted 7 degrees; the
others are within about 3.5 degrees). A slingshot you aim on a flat screen cannot aim up or down, so
the **game** squashes every orbit flat onto one plane, viewed from above. Within that
flat world the flight is still fully simulated with real gravity, real masses and real
dates.

This means Starshot's flights are close to real missions, not identical to them. Do not
use the game to plan a real spacecraft. The packages themselves can also work in full
3D (without the flattening), and a 3D map of the Solar System is planned.

## Starshot and astlo

Starshot was inspired by **astlo**, an orbital-mechanics engine that Mark Macharia
([@iamnothimbutwe](https://github.com/iamnothimbutwe)) built, impressively, on a phone.
This repository is a GitHub fork of his public repository,
[iamnothimbutwe/astlopublic](https://github.com/iamnothimbutwe/astlopublic), so his
history is kept.

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

- Starshot's own code and documentation: [MIT](LICENSE). You may use, copy, change and
  share it, including commercially, as long as you keep the copyright notice.
- `third_party/astlo/`, `python/astlo/astlo/` and `python/astlo/astlo-*.dist-info/`:
  copyright Mark Macharia, all rights reserved. **Not** covered by the MIT licence.
- Details, including NASA/JPL data credits: [NOTICE.md](NOTICE.md).

## Credits

- **NASA/JPL Solar System Dynamics** for the approximate planetary elements and the
  Horizons system.
- **Mark Macharia** for astlo, the project that started this one.
- The open-source projects Starshot is built on: TypeScript, React, Vite and Vitest.

Starshot is an independent fan project, not endorsed by NASA, JPL or anyone named
above.

## Contributing

Contributions are welcome, from people and from AI coding agents alike.

- Start with [CONTRIBUTING.md](CONTRIBUTING.md): the checks to run, how pull requests
  are organised, and how to add a level or a planet.
- The working agreement every agent (and every human) follows is
  [AGENTS.md](AGENTS.md). It is the core of the "Kobe loop": a small set of rules,
  checks and review steps that keep changes honest and the repository safe to publish.
- Settled choices are recorded in [docs/decisions.md](docs/decisions.md).
- Found a security problem? Please report it privately: see [SECURITY.md](SECURITY.md).
