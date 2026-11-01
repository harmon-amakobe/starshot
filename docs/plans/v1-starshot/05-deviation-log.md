# v1-starshot: deviation log

Where the tree or the work contradicted the plan, and what was done instead. A deviation
is logged here, never absorbed (AGENTS.md, non-negotiable 11). A deviation that would
contradict a numbered decision is not logged as built: the work stops and the owner rules.

The bootstrap record ([../pr0-bootstrap.md](../pr0-bootstrap.md#deviations)) kept its
deviations as a numbered list, each with a title, what the plan said, what was done and
why. This table carries the same fields, one row per deviation, oldest first.

| # | PR | What the plan or spec said | What was done instead | Why | Decision or ruling | Logged |
|---|---|---|---|---|---|---|
| 1 | PR0 | A pull request stays within about 400 contentful lines or 20 files (`PR_SIZE_CAP` in [../../../.claude/README.md](../../../.claude/README.md)) | PR0 carries the program plan, the decision entries D12 to D29, the governance files and the new gates in one pull request | The plan, the decisions and the gates that enforce them only make sense together, and PR0 is the trunk every later PR stacks on. D8 made the same call for the bootstrap | D8 precedent *(judgment)*; D25 sizes every later PR for one reviewer | 2026-11-01 |
| 2 | PR0 | Code of conduct contact: a direct message to the owner on GitHub until the domain is live | The text names `conduct@playstarshot.com` and, until it is live, the repository's private reporting form | GitHub has no direct messages | Governance executor *(judgment)* | 2026-11-01 |
| 3 | PR0 | AGENTS.md rule 4 kept the D7 wording on Firebase | Rule 4 now matches D13 (one allow-listed production web config; keys and tokens never) | Rule 4 contradicted D13 as written | Orchestrator *(judgment)*; D13 | 2026-11-01 |
| 4 | PR0 | The tell catalogue from the governance research, as listed | Narrower patterns for in-todays, lets-dive, navigate-figure and landscape-figure; "elevate" is a warning; emoji allows the copyright, registered and trademark marks; the triplet rule skips UI strings and YAML titles; some rule ids renamed | Game text about the Sun needs "dive into"; `TRADEMARK.md` needs the marks; false positives in UI strings | Governance executor *(judgment)* | 2026-11-01 |
| 5 | PR0 | Commit messages checked in the Stop hook or CI | `--commits <range>` scans commit messages only; the gate scans the tree, plus the pull request's commits when `GITHUB_BASE_REF` is set | The Stop hook cannot see messages not yet written | Governance executor *(judgment)* | 2026-11-01 |
| 6 | PR0 | A `work` gate that fails when `work.yaml` and the lock disagree | `sync-work --check` exists but is not registered as a gate; a missing lock reads as "never synced" and passes | The first sync has not run; PR4 registers the gate once the lock exists | Governance executor *(judgment)*; PR4 | 2026-11-01 |
| 7 | PR0 | The work file is `work.yaml` (D23) | The sync and the copy gate accept a numbered name such as `03-work.yaml`; the lock is always `work.lock.json` | The plan folder numbers its files | Governance executor *(judgment)* | 2026-11-01 |
| 8 | PR0 | The copy gate exits 1 on failure | Self-test and catalogue failures exit 3 | The copy-lint workflow must tell a broken checker from failing text | Governance executor *(judgment)* | 2026-11-01 |
| 9 | PR11 (plan) | The fix pass asked for a new fine-grid Lambert test expecting the Mars minimum at launch 2026-11-02, 326 days, 2.982 km/s | The spec expects 2026-11-02, 323 days, 2.982 km/s within 0.001 | Measured on 2026-11-01 with the TypeScript packages on the flattened ephemeris, launch days 2026-11-02 plus or minus 10 and flights of 300 to 340 days at 1-day steps: 2026-11-02, 323 days, 2.9817 km/s. 326 days is the best node of the 8-day flight grid in today's simulate test (`packages/physics/test/physics.test.ts`), which D11 quotes; register R29 | Plan author *(judgment)*, a measured fact; D11 itself unchanged | 2026-11-01 |
| 10 | [PR1](00-plan.md#pr1-ci-hardening) | Its own branch `starshot/v1-pr01-ci-hardening`, its own pull request and issue, based on PR0 | Built on `starshot/pr0-bootstrap` as part of PR0 (#1) | The owner wants the CI work in PR0 before the stack starts, and the rest built as PR groups | Owner, [D30](../../decisions.md#d30-specs-build-in-groups-two-or-three-a-session-with-one-master-review-at-the-end) | 2026-11-01 |
| 11 | [PR1](00-plan.md#pr1-ci-hardening) | Session protocol step 3: claim the issue before building | No claim comment; PR #1 still says "Part of none" | Issues are off on the repository (owner step G1), so `sync-work.mjs --apply` cannot create the issue yet | Orchestrator *(judgment)*; G1 | 2026-11-01 |
| 12 | [PR1](00-plan.md#pr1-ci-hardening) | The zizmor findings on copy-lint's triggers are suppressed inline; `dependency-review` has a job-level `if:` and is skipped on push; the aggregator fails on failure or cancelled | Both ignores sit in `.github/zizmor.yml`, keyed to their lines; `dependency-review` always runs and skips its steps on push; the aggregator also fails on a skipped job | The review showed an inline ignore also hides a trigger added later to the same block, and that a skipped job passes `gates` silently. Keyed ignores and "skipped fails" close both, and no later job needs to be named | Orchestrator *(judgment)*, from the PR0 review | 2026-11-01 |
| 13 | [PR1](00-plan.md#pr1-ci-hardening) | Proof: `dependency-review` and `gates` are green on the pushed PR | Both are red on PR #1: "Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled" | The dependency graph is off by default on a fork. Owner step G7 now names it; the check is not weakened | Orchestrator *(judgment)*; G7 | 2026-11-01 |
| 14 | PR0 | The look prototype stayed on `starshot/look-prototype`; the next foundation specs named the old GameScreen | The owner directed that the approved prototype through `3baee8c` join PR0. The main-game handoff requires active-shell cleanup and Earth-to-Moon as the first campaign level in subsequent work | The owner wants the approved UX carried into a maintainable main game. This merge changes no runtime behavior and does not implement Moon-first | Owner, 2026-11-02; [handoff](../main-game-handoff.md) | 2026-11-02 |

## How to add a row

- Number rows in order; never renumber.
- Name the PR by its plan id (PR1, PR2, ...) and link the spec anchor in
  [00-plan.md](00-plan.md) if the row is about one spec.
- Quote what the spec said in a few words, then what was built, then why.
- Say who ruled: the owner (with the decision number), or *(judgment)* with the role.
- If the deviation changes a number a test proves, name the test.
