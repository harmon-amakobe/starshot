# The agent harness for this repository

`AGENTS.md` at the repository root is the working agreement. This file holds the
Kobe loop configuration for Starshot and the map of what the harness enforces and
what it does not. Change it in the same pull request as the mechanism it describes.

## Config table (playbook §0.1, filled for Starshot)

| Slot | Value |
|---|---|
| `PRODUCT` | Starshot: a slingshot game across the real Solar System (React + Canvas 2D on GitHub Pages) plus the open orbital-mechanics packages behind it (`@starshot/ephemeris`, `@starshot/physics`). |
| `REPO_ABS_PATH` | Per machine; never committed, because this repository is public. The orchestrator resolves it with `git rev-parse --show-toplevel` and pins that absolute path in every subagent prompt. |
| `DEFAULT_BRANCH` | `main` (fork of Mark Macharia's astlo history, D1). |
| `VCS_AUDIT` | `git status --short && git branch --show-current && git log --oneline -5 && git rev-list --count main..HEAD`; for open work, `gh pr list`. The SessionStart gate prints the same facts. |
| `CONTEXT_TOOL` | None wired. Restore points come from platform checkpoints plus `refs/snapshots/*`. If a session recorder is added later, it ships with its four open-gate probes (enabled, authenticated, capturing, synced). |
| `RESEARCH_SURFACE` | A Claude Code session with web access and the repo mounted; NASA/JPL Horizons is reachable for fixtures. |
| `BROWSER_CHANNEL` | Headless Chromium through Playwright, driven by `scripts/verify-game.mjs` (phone, desktop and reduced-motion contexts). Playwright is not a project dependency. |
| `PLANS_DIR` | `docs/plans/`; binding decisions in `docs/decisions.md`. |
| `PR_SIZE_CAP` | About 400 contentful lines or 20 files per PR, excluding lockfiles and fixture JSON. |
| `LARGE_FILE_CAP` | 300 lines: above it, anchored edits only. |
| `GATE_COMMANDS` | `npm run gates` (secrets, third-party, instruction-dedup, agent-frontmatter, guard-scan-coverage, hook-fixtures, typecheck, test, build). Fast subset: `npm run gates:fast`. |
| `RELEASE_CHECKLIST` | `CHANGELOG.md` `[Unreleased]` entry for anything a player or package user notices; Pages workflow green; `scripts/verify-game.mjs` clean against the built site with `--base /<repo>/`; third-party manifest green. |
| Model tier map | originator = `fable` · top = `opus` · mid = `sonnet` · fast = `haiku`. Agent files name the tier alias; update only this row when models change. |

## Hooks

| Event | Script | Does | Never does |
|---|---|---|---|
| SessionStart | `scripts/agent/open-gate.sh` | One JSON line of repository facts | Block; take longer than about 0.1 s here |
| PreToolUse `Bash` | `scripts/agent/guard-destructive-git.sh` | Denies history- and work-destroying git commands with the safe alternative | Inspect non-git commands beyond one string test |
| PreToolUse `Edit\|Write\|MultiEdit\|NotebookEdit` | `scripts/agent/guard-protected-paths.sh` | Denies edits under `third_party/**`, `version` field changes in any `package.json`, dated CHANGELOG headings | See shell rewrites (the gates do) |
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
- The release lane that bumps versions from `CHANGELOG.md` is not built yet. Until it
  is, version fields stay where they are; the guard keeps it that way.
- CI enforcement on `main` depends on the owner enabling Actions on the fork and branch
  protection with the CI check required (documented in `docs/hosting.md`).
- Singleton and tier rules in the roster are advisory: nothing enforces them.
