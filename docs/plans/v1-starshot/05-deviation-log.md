# v1-starshot: deviation log

Where the tree or the work contradicted the plan, and what was done instead. A deviation
is logged here, never absorbed (AGENTS.md, non-negotiable 11). A deviation that would
contradict a numbered decision is not logged as built: the work stops and the owner rules.

The bootstrap record ([../pr0-bootstrap.md](../pr0-bootstrap.md#deviations)) kept its
deviations as a numbered list, each with a title, what the plan said, what was done and
why. This table carries the same fields, one row per deviation, oldest first.

| # | PR | What the plan or spec said | What was done instead | Why | Decision or ruling | Logged |
|---|---|---|---|---|---|---|
| 1 | PR0 | A pull request stays within about 400 contentful lines or 20 files (`PR_SIZE_CAP` in [../../../.claude/README.md](../../../.claude/README.md)) | PR0 carries the program plan, the decision entries D12 to D28, the governance files and the new gates in one pull request | The plan, the decisions and the gates that enforce them only make sense together, and PR0 is the trunk every later PR stacks on. D8 made the same call for the bootstrap | D8 precedent *(judgment)*; D25 sizes every later PR for one reviewer | 2026-11-01 |
| 2 | PR0 | Code of conduct contact: a direct message to the owner on GitHub until the domain is live | The text names `conduct@playstarshot.com` and, until it is live, the repository's private reporting form | GitHub has no direct messages | Governance executor *(judgment)* | 2026-11-01 |
| 3 | PR0 | AGENTS.md rule 4 kept the D7 wording on Firebase | Rule 4 now matches D13 (one allow-listed production web config; keys and tokens never) | Rule 4 contradicted D13 as written | Orchestrator *(judgment)*; D13 | 2026-11-01 |
| 4 | PR0 | The tell catalogue from the governance research, as listed | Narrower patterns for in-todays, lets-dive, navigate-figure and landscape-figure; "elevate" is a warning; emoji allows the copyright, registered and trademark marks; the triplet rule skips UI strings and YAML titles; some rule ids renamed | Game text about the Sun needs "dive into"; `TRADEMARK.md` needs the marks; false positives in UI strings | Governance executor *(judgment)* | 2026-11-01 |
| 5 | PR0 | Commit messages checked in the Stop hook or CI | `--commits <range>` scans commit messages only; the gate scans the tree, plus the pull request's commits when `GITHUB_BASE_REF` is set | The Stop hook cannot see messages not yet written | Governance executor *(judgment)* | 2026-11-01 |
| 6 | PR0 | A `work` gate that fails when `work.yaml` and the lock disagree | `sync-work --check` exists but is not registered as a gate; a missing lock reads as "never synced" and passes | The first sync has not run; PR4 registers the gate once the lock exists | Governance executor *(judgment)*; PR4 | 2026-11-01 |
| 7 | PR0 | The work file is `work.yaml` (D23) | The sync and the copy gate accept a numbered name such as `03-work.yaml`; the lock is always `work.lock.json` | The plan folder numbers its files | Governance executor *(judgment)* | 2026-11-01 |
| 8 | PR0 | The copy gate exits 1 on failure | Self-test and catalogue failures exit 3 | The copy-lint workflow must tell a broken checker from failing text | Governance executor *(judgment)* | 2026-11-01 |

## How to add a row

- Number rows in order; never renumber.
- Name the PR by its plan id (PR1, PR2, ...) and link the spec anchor in
  [00-plan.md](00-plan.md) if the row is about one spec.
- Quote what the spec said in a few words, then what was built, then why.
- Say who ruled: the owner (with the decision number), or *(judgment)* with the role.
- If the deviation changes a number a test proves, name the test.
