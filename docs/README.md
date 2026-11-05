# Documentation index

Every document in the repository, with what it is for. Agents start from `AGENTS.md`;
people start from the README at the root.

## Decisions and standards

| Document | What it is |
|---|---|
| [decisions.md](decisions.md) | The binding decisions, D1 onward. Cited by number and never re-argued in a pull request |
| [copy-standard.md](copy-standard.md) | How every text is written, and what the `copy` gate checks (D27) |

## How Starshot works

| Document | What it is |
|---|---|
| [architecture.md](architecture.md) | How the packages, the physics worker and the game fit together |
| [game-design.md](game-design.md) | How the game plays: the loop, the controls, the levels, the scoring |
| [design/entry-experience.md](design/entry-experience.md) | The live orbital menu, local profiles and simulated cloud-profile interaction design |
| [hosting.md](hosting.md) | Firebase Hosting, keyless deployment, previews, domain setup and rollback |
| [astlo-evaluation.md](astlo-evaluation.md) | What testing Mark Macharia's astlo against NASA/JPL found |
| [astlo/directions.md](astlo/directions.md) | Technical directions for astlo as a partner project (D26) |

## Plans

| Document | What it is |
|---|---|
| [plans/v1-starshot/](plans/v1-starshot/) | The resumed V1 program: plan, research, work list, current ops status and historical deviations |
| [plans/v1-starshot/06-resumption.md](plans/v1-starshot/06-resumption.md) | Current acceptance ledger, accepted gameplay and remaining lunar/Rust proof |
| [plans/v1-starshot/07-screen-split.md](plans/v1-starshot/07-screen-split.md) | Current campaign file/symbol mapping and verification for PR2/PR3 |
| [plans/v1-starshot/08-moon-flight.md](plans/v1-starshot/08-moon-flight.md) | Remaining lunar scope, declared delivery parts, budgets and proof |
| [plans/pr0-bootstrap.md](plans/pr0-bootstrap.md) | The record of the bootstrap pull request (D8) |
| [plans/current-game-release.md](plans/current-game-release.md) | The active release: publish the existing game and verify its domain before the first main merge (D34) |
| [plans/current-game-release/work.yaml](plans/current-game-release/work.yaml) | The release epic and task, tracked separately from the remaining program |
| [plans/current-game-release/versioned-releases.md](plans/current-game-release/versioned-releases.md) | CI versions, stable beta, immutable candidates and explicit production promotion (D35) |
| [plans/entry-experience-prototype.md](plans/entry-experience-prototype.md) | Entry prototype scope, save ownership, camera handoff and verification |
| [plans/campaign-ux-integration.md](plans/campaign-ux-integration.md) | Integration of the approved shell with all existing campaign missions and sandbox destinations |
| [plans/orbital-gameplay/plan.md](plans/orbital-gameplay/plan.md) | Local Moon-first gameplay, orbit cameras, date and phase controls, and save migration (D38) |
| [plans/main-game-handoff.md](plans/main-game-handoff.md) | Implementation handoff after the prototype joins PR0: active-shell cleanup and a Moon-first main campaign |

## At the repository root

| File | What it is |
|---|---|
| `README.md` | What Starshot is, how to run it, how accurate it is |
| `CONTRIBUTING.md` | Setting up, the gates, issues and labels, pull requests, the DCO, AI-assisted work |
| `GOVERNANCE.md` | Who decides what, how to propose a change, succession |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 3.0, with how to report |
| `SUPPORT.md` | Where to ask what |
| `SECURITY.md` | Reporting a vulnerability, and what to do if a secret leaks |
| `TRADEMARK.md` | What you may do with the name and logo |
| `NOTICE.md`, `LICENSE`, `LICENSES/`, `REUSE.toml` | Who owns what, and under which licence (D12) |
| `CREDITS.md` | Every shipped asset's source, licence and credit |
| `CHANGELOG.md` | Changes since the last release, under `[Unreleased]` |
| `AGENTS.md` | The working agreement for agents and people |

## Scripts worth knowing

| Command | What it does |
|---|---|
| `npm run gates` | Every check, as CI runs it. `npm run gates:fast` is the static subset |
| `node scripts/check-copy-tells.mjs` | The copy gate; `--stdin --kind pr` for a body, `--commits <range>` for messages |
| `node scripts/check-file-size.mjs` | The size, shape and layering gate, which also warns on lines over 160 characters; `--update` lowers the baseline, `--self-test` runs only the long-line fixtures |
| `node scripts/check-licence.mjs` | The licence gate |
| `node scripts/gen-credits.mjs` | Writes the game assets section of `CREDITS.md` from `apps/game/assets/manifest.json`; `--check` is the credits gate |
| `node scripts/sync-work.mjs` | Issues as code (D23), described below |
| `node scripts/verify-game.mjs` | Drives the built game in a headless browser on phone and desktop sizes |
| `node scripts/verify-web-release.mjs` | Verifies offline flight, worker updates and cache ownership at the root and a portable subpath |
| `node scripts/verify-lunar-loading.mjs --dist apps/game/dist` | After `npm run build`, fails when the entry graph carries the Moon rail or the Moon chunk is missing from the page or the precache, and prints raw and gzip bytes. A verifier, not a gate |
| `node scripts/release/cli.mjs apply-proposal <proposal.json>` | Validates and applies unchanged CI version outputs to a clean checkout at their source commit |

### sync-work.mjs

`scripts/sync-work.mjs` makes GitHub match a program's work list: the labels in
`.github/labels.yml`, the program's milestone, one issue per epic and task, and each
task as a sub-issue of its epic. It reads `docs/plans/<program>/work.yaml` (a numbered
name such as `03-work.yaml` also works) and records the issues it made in
`work.lock.json` beside it.

```bash
node scripts/sync-work.mjs --program v1-starshot --check   # offline: plan and lock agree
node scripts/sync-work.mjs --program v1-starshot           # dry run: what would change
node scripts/sync-work.mjs --program v1-starshot --apply   # make the changes, write the lock
node scripts/sync-work.mjs --self-test                     # offline, on scripts/fixtures/work
```

It uses the REST API only, with `GITHUB_TOKEN` or `GH_TOKEN`; without a token the dry run
plans from the lock alone. Every title and body passes the copy checker before any
request. It never closes or deletes an issue unless the work list says `state: closed`
with a reason. Only the orchestrator runs it with `--apply`. The conventions around it,
such as `Part of #n` and `agent-ready`, are in `.claude/skills/track-work/SKILL.md`.
