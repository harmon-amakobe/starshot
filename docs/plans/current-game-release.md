# Current-game web release

The owner requested this release before the remaining v1 program on 2026-11-02.
D34 records the scope. The tracked task is `early-web-release` in
`current-game-release/work.yaml`. This small program tracks the release separately
from the unfinished v1 backlog.

## Scope and stack

Publish the existing four-mission campaign and seven sandbox destinations at
playstarshot.com using Firebase Hosting only. D34 supersedes D21's hosted mirror.
Profiles and progress remain local. The cloud interaction is a labelled demo.
This release does not claim Moon-first, real accounts, a leaderboard or the Rust core.

The release branch is `starshot/current-game-release`, based on
`starshot/pr0-bootstrap`. Its pull request targets PR0. The release documentation
and verification follow-up also targets PR0. D35's versioned release follow-up uses
`codex/versioned-releases` on the same integration branch. The saved PR2 refactor
remains separate until reviewed.

`starshot/v1-pr02-screen-split` already holds saved work, including D33 and its
Moon-first TypeScript direction. Reserve that decision number and deviation rows
15 and 16. Do not overwrite this work or make it part of the deployment diff.

## Acceptance criteria

| Requirement | Proof |
|---|---|
| Existing gameplay remains valid | `npm run gates` and its known mission solutions |
| The production root and portable subpath work | `verify-game.mjs` at `/` and `/starshot/` |
| An installed release starts offline | `node scripts/verify-web-release.mjs` |
| Updates do not mix code and astronomy data | The same verifier installs a changed data file with a new worker, keeps an active client on its old data, then checks the new data after closing it |
| Caches belong to one registration scope | The verifier runs both paths and preserves an unrelated cache |
| Public copy describes local play accurately | Entry says Cloud demo; About explains saves and links shipped licences |
| A branch workflow cannot deploy production | Workflow conditions, protected environments and cloud trust all pin production to `main` |
| PR0 proves deployment before production | A push to `starshot/pr0-bootstrap` runs Web release and deploys beta to the development live channel under D35 |
| The domain works before the main merge | The owner publishes the verified PR0 artifact with the signed-in CLI, then verifies apex HTTPS, the `www` redirect and the game |
| No stored deployment key | Workload Identity Federation provides short-lived Hosting credentials |
| Deployment uses the verified build | The deploy job consumes the build job's files; `release.json` identifies them |
| Rollback preserves saves | Redeploy a verified static release; never clear browser storage |

Browser output belongs in temporary directories or CI artifacts, not in the tree.
Run the full gates, workflow lint and browser checks before publishing the PR.
Read the resulting screenshots. Physical-phone performance remains unmeasured.

## Shipping order

The initial unversioned publication followed D34 and deviation 18: the owner
published the exact verified PR0 artifact through the signed-in CLI to verify the
real domain before the main merge. That bootstrap is complete. D35 supersedes the
remaining automatic-production sequence with the [versioned release plan](current-game-release/versioned-releases.md).

1. Review and merge this release follow-up into PR0. Its automatic Web release run
   verifies and publishes beta on the development site's live channel.
2. Apply the unchanged CI-generated version proposal on a clean stacked branch,
   verify it and merge it into PR0. Confirm beta and domain HTTPS evidence.
3. When the owner approves, merge the release stack into main. This does not deploy
   production. Stage a stable candidate from main with Web release.
4. Test that candidate at beta.playstarshot.com, then explicitly Promote release
   with its stable version. The retained artifact is reused without rebuilding.
5. Verify production and the published recovery assets. Create the next program
   PR0 from the released main, review and import the saved refactor, reconcile D33
   and the release changes, then rebase the remaining plan.

The new program trunk must preserve D33's approved Moon-first TypeScript work before
the later Rust migration. Its PR3a flight, PR3b campaign and PR3c CSS sequence needs
review against the published game. Do not restart from the old handoff's dependency
ordering, or count publication as completion of the v1 physics and content program.

The first CLI publication is the owner's one-time sequencing change in D34 and
deviation 18. D35 now requires explicit promotion from `main`.
The later Firebase-only choice is recorded in deviation 19. There is no hosted
mirror or automatic failover; preview and production saves remain separate by origin.
Another CDN remains deferred pending the measurements required by D21.

## Rollback and release evidence

The deployment run retains `web-release-<attempt>` for 90 days. Its bounded static
archive contains the verified Hosting config and game files. A protected candidate
tag records source, semantic version, build id and artifact digests. GitHub releases
retain exact recovery assets after production verification. See the hosting runbook.

If entry fails, an existing mission cannot start, or assets return errors, stop the
release and restore the previous verified Hosting release. The Firebase console's
Hosting release history supports rollback. Revert the offending commit through a
PR before preparing the next candidate from `main`.
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
