# The agent harness for this repository

`AGENTS.md` at the repository root is the working agreement. This file holds the
Kobe loop configuration for Starshot and the map of what the harness enforces and
what it does not. Change it in the same pull request as the mechanism it describes.

## Config table (the Kobe loop's slots, filled for Starshot; AGENTS.md is the agreement)

| Slot | Value |
|---|---|
| `PRODUCT` | Starshot: a slingshot game across the real Solar System (React + Three.js with Canvas 2D fallback, on Firebase Hosting) plus the open orbital-mechanics packages behind it (`@starshot/ephemeris`, `@starshot/physics`). |
| `REPO_ABS_PATH` | Per machine; never committed, because this repository is public. The orchestrator resolves it with `git rev-parse --show-toplevel` and pins that absolute path in every subagent prompt. |
| `DEFAULT_BRANCH` | `main` (standalone repository retaining Mark Macharia's astlo history, D1, D36). |
| `VCS_AUDIT` | `git status --short && git branch --show-current && git log --oneline -5 && git rev-list --count main..HEAD`; for open work, `gh pr list`. The SessionStart gate prints the same facts. |
| `CONTEXT_TOOL` | None wired. Restore points come from platform checkpoints plus `refs/snapshots/*`. If a session recorder is added later, it ships with its four open-gate probes (enabled, authenticated, capturing, synced). |
| `RESEARCH_SURFACE` | A Claude Code session with web access and the repo mounted; NASA/JPL Horizons is reachable for fixtures. |
| `BROWSER_CHANNEL` | Headless Chromium through Playwright, driven by `scripts/verify-game.mjs` (phone, desktop and reduced-motion contexts). CI runs the same script in the `verify-game` job of `.github/workflows/ci.yml`, which installs Playwright for that run only. Playwright is not a project dependency. |
| `PLANS_DIR` | `docs/plans/`; binding decisions in `docs/decisions.md`. |
| `PR_SIZE_CAP` | About 400 contentful lines or 20 files per spec, excluding lockfiles and fixture JSON; a PR group of n specs is held to n times that (D30). |
| `LARGE_FILE_CAP` | 300 lines: above it, anchored edits only. |
| `GATE_COMMANDS` | `npm run gates` (secrets, third-party, licence, copy, size, versions, instruction-dedup, agent-frontmatter, guard-scan-coverage, hook-fixtures, typecheck, test, build). Fast subset: `npm run gates:fast`. Before a push, also `node scripts/check-copy-tells.mjs --commits <base>..HEAD`. |
| `COPY_STANDARD` | `docs/copy-standard.md` (D27), catalogue `scripts/copy-tells.json`; text typed into GitHub goes through `.github/workflows/copy-lint.yml`. |
| `WORK_TRACKING` | `docs/plans/<program>/work.yaml` and `work.lock.json`, synced by `scripts/sync-work.mjs` from the orchestrator only (D23, `track-work` skill). |
| `COMMIT_AUTHOR` | The owner, with a `Signed-off-by:` and the agent in a `Co-Authored-By:` trailer (D24); recipe in the `stacked-pr` skill. |
| `RELEASE_CHECKLIST` | Follow `release-ready`: CI proposal and parity gate, successful Web release candidate, root/subpath browser and offline-update proof, hosted beta verification, explicit promotion from main (D35). |
| Model tier map | originator = `fable` · top = `opus` · mid = `sonnet` · fast = `haiku`. Agent files name the tier alias; update only this row when models change. |

## Hooks

| Event | Script | Does | Never does |
|---|---|---|---|
| SessionStart | `scripts/agent/open-gate.sh` | One JSON line of repository facts | Block; take longer than about 0.1 s here |
| PreToolUse `Bash` | `scripts/agent/guard-destructive-git.sh` | Denies history- and work-destroying git commands with the safe alternative | Inspect non-git commands beyond one string test |
| PreToolUse `Edit\|Write\|MultiEdit\|NotebookEdit` | `scripts/agent/guard-protected-paths.sh` | Denies edits under `third_party/**`, npm manifest and workspace lock versions, dated CHANGELOG headings | See shell rewrites; parity cannot prove CI authorship |
| PostToolUse `Edit\|Write\|MultiEdit\|NotebookEdit` | `scripts/agent/snapshot-ref.sh` | Writes `refs/snapshots/<epoch>-<pid>`; prunes after 7 days | Print anything; touch the real index |
| Stop | `scripts/agent/stop-gates.sh` | Runs `node scripts/gates.mjs --fast`, reports failures | Block or force continuation |

Every hook resolves the repository through `$CLAUDE_PROJECT_DIR` or `git rev-parse`,
is POSIX `sh`, and exits 0 when its script, `git` or `node` is missing. Each one is
exercised by `scripts/check-hook-fixtures.mjs` in both directions.

## Surface by protection

| Surface | Local hooks | CI gates | Notes |
|---|---|---|---|
| Claude Code (local or cloud) | yes | yes | The only surface the hooks bind. |
| GitHub Copilot (coding agent, review) | no | yes | Reads `.github/copilot-instructions.md`, which only points here. |
| Any other agent reading `AGENTS.md` | no | yes | |
| A human with git | no | yes | The pull request template carries the hygiene checklist. |

## Accepted gaps (named, not assumed away)

- The git guard parses commands; it is not a sandbox. Variables, aliases, scripts
  and anything executed indirectly are invisible to it.
- The path guard sees edit tools only. A shell redirect into `third_party/` passes it;
  `check-third-party-untouched.mjs` catches the result at the next gate run.
- A file written by a shell command reaches a snapshot only at the next Edit or Write.
- The Stop report reaches the human through `systemMessage`; the agent sees failures
  when it next runs the gates.
- D30's working shape is advisory: one to four specs per group, D41's lite review and,
  outside the V1 cloud run, two or three groups a session with the hand-off at about
  70%. D40's handover from 776,000 to 792,000 tokens of measured context, its
  compaction controls and its rule against pull-request subscriptions are wholly
  advisory: no hook reads occupancy, sets compaction or denies a subscription. Of D30's
  shape, only the size check that PR4 adds enforces anything.
- In Actions, `scripts/gates.mjs` prints a failed gate's raw output, so a line in it that
  starts with `::` acts as a workflow command. The jobs that run it hold a read-only
  token and no secret but the optional private-name list, in its own step.
- CI generates release proposals, and the parity gate checks their shape. It cannot
  prove that every matching version edit came from CI; the validated proposal path
  and review enforce that ownership. Automatic PR creation remains optional and off.
- CI enforcement on `main` uses enabled Actions and a ruleset requiring the CI check.
  Preserve these settings during repository recovery (documented in `docs/hosting.md`).
- Singleton and tier rules in the roster are advisory: nothing enforces them.
- CI runs the `secrets` gate without the private-name list unless the owner sets the
  `STARSHOT_PRIVATE_NAMES` secret, and a pull request from a fork never gets it.
- The copy gate cannot see text typed straight into GitHub. The `copy-lint` workflow
  checks issues, comments and pull request descriptions after they are posted.
  Review comments are not checked. Generated release notes come from the copy-checked changelog;
  later manual edits to a published release body are outside that gate.
- The copy gate's `warn` rules, and the size gate's god-component signs and its warning
  on lines over 160 characters, are heuristics with estimated limits (D27, D28). They
  print and pass; the Stop hook reports only failures, so only review acts on them.
- The size gate compares its baseline with the base branch in CI only when the checkout
  has full history (`fetch-depth: 0` in `ci.yml`); without it, the baseline is checked
  against the file sizes alone.
- The DCO check needs the owner to install the DCO app; until then `.github/dco.yml` is
  inert and only review sees a missing sign-off.
- `scripts/sync-work.mjs` sets project board fields only with a token that can read the
  owner's project; the default Actions token cannot.
- The private-name rule of the `secrets` gate is only as good as its list, which is
  never committed: `.git/info/private-names` locally, and the optional repository secret
  `STARSHOT_PRIVATE_NAMES` (comma-separated) in CI only (deploy jobs stay secret-free, D7), mapped into one scan step
  before `npm ci` (`docs/hosting.md`). Pull requests from forks get no secrets, so they
  run with the rule off and say so; the run on `main` after the merge is the backstop.
