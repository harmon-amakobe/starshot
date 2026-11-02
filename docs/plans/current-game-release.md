# Current-game web release

The owner requested this release before the remaining v1 program on 2026-11-02.
D34 records the scope. The tracked task is `early-web-release` in
`current-game-release/work.yaml`. This small program tracks the release separately
from the unfinished v1 backlog.

## Scope and stack

Publish the existing four-mission campaign and seven sandbox destinations at
playstarshot.com. Firebase Hosting is primary. GitHub Pages is the mirror.
Profiles and progress remain local. The cloud interaction is a labelled demo.
This release does not claim Moon-first, real accounts, a leaderboard or the Rust core.

The release branch is `starshot/current-game-release`, based on
`starshot/pr0-bootstrap`. Its pull request targets PR0. It is the only release
group above PR0; the saved PR2 refactor remains separate until reviewed.

`starshot/v1-pr02-screen-split` already holds saved work, including D33 and its
Moon-first TypeScript direction. Reserve that decision number and deviation rows
15 and 16. Do not overwrite this work or make it part of the deployment diff.

## Acceptance criteria

| Requirement | Proof |
|---|---|
| Existing gameplay remains valid | `npm run gates` and its known mission solutions |
| Both public paths work | `verify-game.mjs` at `/` and `/starshot/` |
| An installed release starts offline | `node scripts/verify-web-release.mjs` |
| Updates do not mix code and astronomy data | The same verifier installs a changed data file with a new worker, keeps an active client on its old data, then checks the new data after closing it |
| Caches belong to one registration scope | The verifier runs both paths and preserves an unrelated cache |
| Public copy describes local play accurately | Entry says Cloud demo; About explains saves and links shipped licences |
| A branch cannot deploy production | Workflow conditions, protected environments and cloud trust all pin production to `main` |
| PR0 proves deployment before production | A push to `starshot/pr0-bootstrap` runs Web release and deploys only an expiring development preview |
| No stored deployment key | Workload Identity Federation provides short-lived Hosting credentials |
| Both sites serve one build | Both deploy jobs consume the build job's files; `release.json` identifies them |
| Rollback preserves saves | Redeploy a verified static release; never clear browser storage |

Browser output belongs in temporary directories or CI artifacts, not in the tree.
Run the full gates, workflow lint and browser checks before publishing the PR.
Read the resulting screenshots. Physical-phone performance remains unmeasured.

## Shipping order

1. Configure dependency graph, required `gates`, Pages from Actions and the three
   deployment environments described in [hosting.md](../hosting.md).
2. Configure the isolated Hosting projects and keyless identities. Use free static
   Hosting for this slice. No database, Functions or paid App Hosting backend is needed.
3. Run the release checks and deploy the exact build to a development preview channel.
   Verify a real playable scene, local saves, offline startup and the credits links.
4. Review and merge the release PR into PR0. Its automatic Web release run verifies
   and deploys an expiring development preview. Confirm the hosted `release.json`
   records the new PR0 tip, then verify gameplay, saves, offline startup and credits.
   Require that run and hosted verification to pass before the next step.
5. Merge PR0 into `main`. Its Web release run verifies and deploys one build to both sites.
6. Connect playstarshot.com using Firebase's actual ownership and DNS records.
   Verify HTTPS and that `release.json` matches the Firebase default URL and mirror.
7. Create the next program PR0 from the released `main`. Review and import the saved
   refactor, reconcile its D33 and the release changes, then rebase the remaining plan.

The new program trunk must preserve D33's approved Moon-first TypeScript work before
the later Rust migration. Its PR3a flight, PR3b campaign and PR3c CSS sequence needs
review against the published game. Do not restart from the old handoff's dependency
ordering, or count publication as completion of the v1 physics and content program.

## Rollback and release evidence

The deployment run retains `web-release` for 14 days. It contains `firebase.json`
and the exact `apps/game/dist` that passed verification. A release is identified by
the content digest in `release.json`; CI builds also record the source commit.

If entry fails, an existing mission cannot start, or assets return errors, stop the
release and restore the previous verified Hosting release. The Firebase console's
Hosting release history supports rollback. For both sites together, revert the
offending commit through a PR, then let Web release deploy the resulting `main`.
Do not dispatch production from an old branch or bypass the required checks.

A worker downloads one complete release in the background. It installs only if all
files pass their integrity checks. A waiting update activates after all old game tabs
close. Flights controlled by an installed worker retain that release's code and data.
For rollback, visit online and confirm the restored worker finishes installing before
closing all game tabs and reopening. The first reopen can still run the old worker
while the restored one downloads. Local pilot data is not part of a deployment.

The final PR and handoff must record the exact source commit, gate exit codes,
preview URL, live URLs, deployment run and any unresolved DNS or account step.
Never mark a pending infrastructure step complete because the source files exist.
