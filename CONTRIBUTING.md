# Contributing to Starshot

Thank you for helping. This page covers the practical steps. The full working
agreement, which people and AI agents both follow, is [AGENTS.md](AGENTS.md); where the
two ever disagree, AGENTS.md wins.

## Set up

You need Node.js 22 (pinned in `.nvmrc`) and git.

```bash
npm ci          # install the exact locked versions
npm run dev     # play your local copy
```

Please do not add or upgrade dependencies in the same pull request as other work. If
you need a new one, say why in its own pull request.

## The checks ("gates")

A change is done when this passes:

```bash
npm run gates
```

It runs every check in one go and prints a table. It must end with
`gates: n/n passed`. CI runs the same command on every pull request.

| Gate | What it protects |
|---|---|
| `secrets` | The repository is public: no keys, tokens, personal emails, personal file paths or private project names |
| `third-party` | `third_party/astlo` stays byte-for-byte as Mark published it |
| `instruction-dedup`, `agent-frontmatter`, `guard-scan-coverage`, `hook-fixtures` | The agent setup stays consistent and the checks really check something |
| `typecheck` | The TypeScript types agree across packages and the game |
| `test` | Planet positions against NASA/JPL, the flight simulator, and every level's known solution |
| `build` | The website still builds |

Useful variations: `npm run gates:fast` (the quick static checks only),
`node scripts/gates.mjs --list` (what each gate is for) and
`node scripts/gates.mjs --only test` (a single gate).

If your change affects what a player sees, also build the game and drive it in a
headless browser on phone and desktop sizes:

```bash
npm run build
node scripts/verify-game.mjs
```

This needs [Playwright](https://playwright.dev/) with Chromium available on your
machine; it is not a project dependency, so CI does not run it. Screenshots go to a
temporary folder, never into the repository.

## Pull requests: small, stacked, one at a time

- **One pull request to `main` per working session.** If you need several steps, make
  a *stack*: the first branch starts from `main`, each later branch starts from the one
  below it, and each pull request targets the branch below. The stack merges as one.
  The [stacked-pr skill](.claude/skills/stacked-pr/SKILL.md) has the exact commands.
- Name branches `starshot/<topic>`, for example `starshot/daily-challenge`.
- Keep each pull request reviewable: roughly 400 changed lines or 20 files, not
  counting lockfiles and test data.
- Fill in the [pull request template](.github/pull_request_template.md): what changed,
  which decisions it relies on, the gates table, and the evidence.
- Cite code as `file:line` when you make a claim about it.

## Commit messages

We use a light version of [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <what changed, in the imperative>

<why, if it is not obvious>
```

Types we use: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `ci`, `chore`.
Scopes are usually a package or area: `ephemeris`, `physics`, `game`, `docs`, `harness`.
Example: `fix(physics): stop the preview when the probe hits a planet`.

Commit messages are public too. Configure git to use your GitHub "noreply" email for
this repository (GitHub, Settings, Emails), not a personal address.

## The changelog and version numbers

Describe anything a player or a package user would notice under `## [Unreleased]` in
[CHANGELOG.md](CHANGELOG.md). Do not add dated release headings and do not edit
`version` fields in `package.json`. Version numbers will be set by an automated release
step (not built yet), once per merged stack, so nobody has to coordinate them by hand.

## Never touch `third_party/`

`third_party/astlo/` is Mark Macharia's code, all rights reserved (decision D2 in
[docs/decisions.md](docs/decisions.md)). Do not edit, reformat, move, copy from or
"fix" anything in it, and do not copy its code into Starshot's packages.

- Found a bug in astlo? Fix it in [`python/astlo/`](python/astlo/README.md), which holds
  Mark's v12 source with Starshot's fixes (decision D10), as its own commit with the
  evidence: the input, NASA/JPL's value, and astlo's value before and after. That code
  stays Mark's, under his terms, not MIT. The
  [astlo-upstream skill](.claude/skills/astlo-upstream/SKILL.md) explains how; changes
  there also run the `astlo` workflow, which builds the wheel and runs
  `python/astlo/tests` against NASA/JPL data.
- The owner will show the fixes made here to Mark once Starshot is finished, so please
  do not file them on his repository yourself.
- Mirroring a new upstream release follows the same skill, in its own pull request.

## Physics changes need proof

A number about positions, speeds or timing is a claim only once a test compares it with
NASA/JPL or with a known physical result. Loosening a test budget needs a new entry in
[docs/decisions.md](docs/decisions.md). The
[verify-physics skill](.claude/skills/verify-physics/SKILL.md) lists the budgets and how
to refresh the NASA/JPL reference data.

## How to add a level

Every level is a real launch window, and every campaign level has a known solution
that the tests fly on every change, so no level can quietly become impossible.

1. **Find a real window.** Use `bestDirectTransfer` from `@starshot/physics` over the
   flattened ephemeris (`createEphemeris({ flatten: true })`) to find the cheapest
   launch date and flight time to your target.
2. **Fly it the way the player would**, with `simulateShot` from
   `apps/game/src/sim/shot.ts` on a request from `shotRequestFor` in
   `apps/game/src/levels.ts`, which carries the level's own frozen settings, and adjust
   the aim until it really arrives.
3. **Add the level** to `CAMPAIGN` in `apps/game/src/levels.ts`, with a factual
   one-line blurb, a launch window, a speed cap with some headroom, a par based on the
   measured cost, and `sim: SIM_SETTINGS` (the preview and the launch both use it).
4. **Prove it** by adding the solution to `KNOWN_SOLUTIONS` in
   `apps/game/src/levels.test.ts`, then run `npm run gates`.

The full recipe, with code, is the [add-level skill](.claude/skills/add-level/SKILL.md).

## How to add a body (planet, dwarf planet, moon)

1. Add its orbital elements to `packages/ephemeris/src/elements.ts`, copied digit for
   digit from a cited NASA/JPL table.
2. Add its mass (GM), radius, colour and name to `BODIES` in
   `packages/ephemeris/src/bodies.ts`.
3. Add its Horizons ID to `tools/horizons/fetch_fixtures.py`, refresh the reference
   data with `python3 tools/horizons/fetch_fixtures.py`, and never hand-edit the result.
4. Give it an accuracy budget in `packages/ephemeris/test/ephemeris.test.ts`, justified
   by JPL's stated accuracy for that table.
5. Run `npm run gates`.

## Accessibility

Every control is a real, labelled button or slider that works with a keyboard, aiming
has a way that does not need dragging, results are announced to screen readers,
reduced-motion settings are respected, and colour is never the only signal. New UI
keeps all of that.

## Settled decisions

[docs/decisions.md](docs/decisions.md) lists the choices that are settled (D1, D2, ...).
Please do not reopen them in a pull request. If you think one should change, open an
issue explaining why; only the owner reopens a decision.

## Security

Never commit a secret. If you find a vulnerability, report it privately as described in
[SECURITY.md](SECURITY.md), not in a public issue.
