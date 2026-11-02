# Hosting and publishing Starshot

Starshot uses Firebase Hosting for the static game at <https://playstarshot.com>.
The stable testing address is <https://beta.playstarshot.com>. D35 brings semantic
versions and explicit promotion forward from the v1 release lane. A merge to main
does not publish production. The earlier unversioned public preview stays live
until the owner promotes the first versioned candidate.

Production uses `playstarshot-prod`; beta and temporary previews use
`playstarshot-dev`. Each default site id matches its project id. These are public
deployment identifiers. Saves belong to each origin and do not transfer between
beta, a preview URL and production. There is no hosted mirror or automatic failover.
Forks can reproduce the static build with `npm ci` and `npm run build`.
Cloudflare or another CDN remains deferred until measurements justify it under D21.
No Firebase runtime SDK, account, database, Functions, paid plan or App Hosting
backend is required for this game.

## Release actions

All cloud jobs remain in `.github/workflows/release.yml`, the Web release workflow.

| Trigger or action | Result |
|---|---|
| Push to `starshot/pr0-bootstrap` | Verified beta snapshot on the development live channel |
| Preview, manually from a reviewed ref | Development preview URL, expires after seven days |
| Beta, manually from a reviewed ref | Snapshot at beta.playstarshot.com |
| Candidate, manually from main | Final stable version built once, registered, then staged on beta |
| Promote release, manually from main with a stable version | Exact registered candidate deployed to production, then GitHub release published |
| Push to main, a tag, a commit marker or a fork PR | No production deployment |

The dispatch input values are `preview`, `beta`, `candidate` and `promote`.
Only promotion takes a version, such as `0.1.0`. It does not accept arbitrary
commit ids, workflow runs, project ids or artifact URLs. Beta has destination-wide
concurrency; production has a separate group. Temporary previews are grouped by ref.

Each new build runs the full gates, workflow lint, root and subpath browser checks,
and real worker installation, offline flight and update checks. It has no cloud
credentials and restores no npm cache. The deployment job consumes the verified
archive, validates and extracts static files, and obtains short-lived Google
credentials. It performs no application checkout or rebuild. The pinned Firebase
CLI installs with lifecycle scripts disabled.

## Prepare version outputs

Contributors write notes under `CHANGELOG.md` `[Unreleased]`. CI generates every npm
workspace version, internal dependency range, corresponding lockfile entry and dated
heading. The first Starshot release keeps the inherited package baseline `0.1.0`.
Later releases infer major from Breaking changes, minor from nonempty Added, and
otherwise patch. One `Bump: major`, `Bump: minor` or `Bump: patch` line can override
that inference. Empty notes produce no proposal. Malformed or conflicting input fails.

Before the workflow reaches the default branch, a successful PR0 push uploads
`release-proposal-<attempt>`. Afterwards, run Prepare release from main and select
the existing integration branch as `base`. Its default is `starshot/pr0-bootstrap`.
The ordinary path is a read-only proposal artifact. Download it outside the checkout,
verify its source run and SHA, and start a stacked branch from that exact source:

```bash
gh run download <run-id> --repo harmon-amakobe/starshot --name release-proposal-<attempt> --dir <temporary-directory>/proposal
git switch -c codex/release-0.1.0 <proposal-source-sha>
node scripts/release/cli.mjs apply-proposal <temporary-directory>/proposal/proposal.json
npm run gates
```

The apply command requires clean HEAD at the recorded source. It independently
regenerates the allowed files, date and notes and rejects changed, unknown or stale
output before writing anything. It does not commit or push. The orchestrator reviews
and commits those unchanged CI outputs with the owner's D24 identity and opens a PR
to the integration branch. If that branch advanced, generate again. Keep one bottom
PR to main. Do not type version values or dated headings by hand.

Optional automatic proposal PR creation is disabled by default. It requires the
exact repository variable `RELEASE_PR_AUTOMATION_ENABLED=true` and GitHub's combined
setting allowing Actions to create and approve pull requests. The latter is a broader
repository permission and has not been authorized. Do not enable it as a workaround.
The isolated optional job uses the main-only `release` environment, creates a
`codex/release-X.Y.Z` branch and targets the existing integration branch. It never
approves or merges a PR. GitHub may require the owner to select **Approve workflows
to run** for a token-created PR. No PAT or long-lived key is needed.

The parity gate becomes strict after the first prepared release. Adding a new npm
workspace then requires a scoped extension to the generator that initializes that
workspace in CI, with negative fixtures; omitting or hand-writing its version is
not an accepted shortcut. The current lane versions the existing workspace set.

## Stage, test and promote

1. Merge the generated proposal into the integration branch after its checks pass.
   Verify the automatic PR0 beta and its displayed version. Review any new Unreleased
   notes before moving on: a candidate rejects unresolved changes.
2. When the owner approves the main merge, land the stack. Main stays unpublished.
3. Run Web release on main with `target=candidate`. The candidate already carries
   its final stable version, for example `0.1.0`, while it is tested on beta.
4. Verify beta's HTTPS, footer and About version, phone and desktop entry, a launched
   mission, local save restoration, installed offline reload and the update lifecycle.
   Record the candidate version, SHA, build id, workflow URL and browser evidence.
5. Run Web release on main with `target=promote` and that exact stable version.
   Promotion validates provenance and requires beta to serve the same metadata.
   It deploys the retained bytes to production without rebuilding. A newer live
   stable version or a conflicting source/build under the same version stops it.
6. Compare `release.json` at the apex and production default URL, then verify the
   hosted game. Only after production metadata matches does the workflow publish
   the complete immutable GitHub release.

In GitHub, open **Actions**, select **Web release**, then **Run workflow**. Choose
the `main` branch, select `candidate` as the target and leave version empty. Run it
and test that candidate on beta. When ready, open **Run workflow** again on `main`,
select `promote` and enter its stable version, such as `0.1.0`.
Web release must first exist on the default branch, `main`, for **Run workflow**
to be available. Before then, PR0 pushes publish beta; candidate and promotion
dispatches become available after the workflow lands on main.

Snapshots use `X.Y.Z-beta.<run>.<attempt>` or `X.Y.Z-preview.<run>.<attempt>`.
Pending notes after a prepared release use the next planned stable version. With
empty Unreleased, a snapshot uses the current prepared version. Such a no-change
test build sorts below that stable version and makes no update-order claim.
Local builds say `X.Y.Z-dev`. `release.json` distinguishes `version`, `kind`,
`sourceCommit` and `buildId`. The menu uses a short label such as
`Version 0.1.0 · Beta`, with Preview or Development for those builds. A stable
candidate shows `Version 0.1.0` on both beta and production, preserving exact bytes.
In About and credits, expand **Build details** for the full version to include in
bug reports. The numeric snapshot suffix is a workflow run and attempt, not a hash.
Both labels come from the compiled version; an old or offline client never fetches
a newer label from the server. The build id stays out of the main footer.
Save-schema versions are separate and do not change just because game SemVer changes.

## Candidate provenance and retries

The protected annotated tag `starshot-vX.Y.Z` is the authority. Its message records
the exact source commit, repository, workflow, main ref, version, build id, original
run and attempt, successful build job, artifact id and digests for the artifact,
archive and notes. Tags cannot be updated or deleted. Inherited astlo tags are ignored.

Resolution checks GitHub API metadata, successful original build, upload timing,
source ancestry on main, matching digests and an unexpired artifact. Promotion also
requires the same source run's latest attempt to have completed successfully.
Candidate files cannot assert their own provenance. The static archive is bounded
gzip JSON with base64 file entries, not executable tooling. Extraction rejects
unsafe paths, duplicate names, symlinks, oversized data, unexpected files and a
changed Hosting config. Hooks and backend deployment settings are not accepted.

Actions retains `web-release-<attempt>` for 90 days. It contains
`starshot-web.json.gz` and `release-notes.md`. A draft GitHub release receives the
archive, `candidate.json`, notes and `SHA256SUMS` for long-term recovery. Drafts are
editable, so they are not the authority. Publication requires exactly those four
completed assets and verifies every digest against the protected record. Published
releases are immutable. The initial title, stable-release type and public body must
also match the version and protected notes digest before publication.

Use **Re-run failed jobs** on the original candidate run after a downstream failure.
Registration locates the original successful build even if the registration attempt
changed. Existing tags always resolve their original artifact; rerunning all jobs
cannot rebuild that version. A failure after production deployment but before release
publication can finish idempotently with the same candidate. It cannot overwrite a
newer live version. Missing or expired Actions artifacts stop promotion; do not
replace a tag or silently rebuild from the recovery archive. Prepare a new version
or use the documented emergency Hosting rollback after owner review.
A failed upload can leave a draft asset in `starter` state. Remove only that
incomplete draft asset after review and rerun the original job; never replace a
verified asset or protected tag to force a retry through.

## One-time settings and identity

Enable Actions and Dependency graph. Keep default workflow permissions read-only.
Require the `gates` check and PRs on main; block force pushes and deletions.
Create `production`, `preview` and `release` environments. Production and release
allow only main. Release has no Google variables or secrets. Preview allows the
reviewed main, starshot and codex refs accepted by its provider.
Protect `refs/tags/starshot-v*` against update and deletion without a bypass, allow
creation, and enable immutable GitHub releases.

Use a separate service account and workload identity pool in each Firebase project.
Grant Firebase Hosting administration, Service Usage Consumer and API Keys Viewer
only on the target project. Grant Workload Identity User on that service account
only to its GitHub provider principal. No owner, editor, Firebase-wide or Auth Admin
role is required. The game contains no service-account key.

Both cloud environments supply these GitHub Variables:

| Variable | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | Dedicated project id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full provider resource name |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | That project's Hosting deployment service account |

The provider pins numeric repository and owner ids and the exact release workflow
path. Production pins main and its environment. Preview pins its environment,
accepts a push only from PR0, and accepts dispatch only from its reviewed refs.
Main push is not a beta identity grant. GitHub environment branch rules provide
another boundary. Use current OIDC claims rather than assuming an old subject format.
The CLI always receives explicit `--project` and `--config`; preview channels also
pass `--no-authorized-domains`.

References: [Firebase CLI authentication](https://firebase.google.com/docs/cli#cli-ci-systems),
[Google's authentication action](https://github.com/google-github-actions/auth) and
[GitHub workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

## Domains, caching and recovery

The initial unversioned public preview was published from the exact verified PR0
artifact using the owner's signed-in CLI before the main merge (D34, deviation 18).
That one-time publication is complete; D35's candidate promotion controls subsequent
versioned production releases. Do not use a temporary development channel for the
production domain.

Attach playstarshot.com and the `www` redirect to production. Attach
beta.playstarshot.com to the development live site. Copy Firebase's actual ownership,
address and certificate records into DNS, preserving unrelated records. Keep renewal
records and wait for active domain and certificate status. Verify HTTPS and the
`www` redirect; a DNS update alone is not proof of completion.

`firebase.json` revalidates HTML, the worker and unhashed data. Only Vite hashed
assets are immutable for one year. Missing files return 404, with no blanket rewrite.
A complete integrity-checked worker cache downloads in the background, keyed by
content build id and registration scope. Offline readiness starts after installation.
Updates wait for old tabs to close and do not claim an uncontrolled first visit.
Browser storage can be cleared or evicted; local saves are not a backup.

If entry, mission launch or asset loading fails, restore the previous verified
release in Firebase Hosting history, then fix source through a PR. Rollback is an
explicit recovery action, not an older-version promotion. Never clear player storage.
Visit online and let the restored worker finish installing, then close all game
tabs and reopen. The first reopen can still run the old worker while downloading
the restored one. Record the restored release and hosted verification evidence.

References: [Hosting configuration](https://firebase.google.com/docs/hosting/full-config)
and [custom domains](https://firebase.google.com/docs/hosting/custom-domain).

`STARSHOT_PRIVATE_NAMES` remains an optional CI secret used only by the standalone
hygiene scan before dependencies install. It never reaches app or deployment jobs.
The remaining v1 accounts, leaderboard, Rust, rails and content work stays planned.
