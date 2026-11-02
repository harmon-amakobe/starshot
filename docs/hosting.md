# Hosting and publishing Starshot

This release uses Firebase Hosting for the static game at
<https://playstarshot.com>. D34 brings this release forward and supersedes D21's
GitHub Pages mirror with the owner's Firebase-only choice.
The remaining v1 program is still planned; cloud accounts and a leaderboard do not
ship in this preview. Firebase App Hosting is not needed for this Vite build.

Production and development previews use separate Firebase projects. Saves belong to
each origin, so progress in a preview does not transfer to playstarshot.com.
There is no hosted mirror or automatic failover. A fork can reproduce the static
build with `npm ci` and `npm run build`, then serve `apps/game/dist` on its own host.
Cloudflare or another CDN remains deferred until production measurements justify
it under D21.

## Build and deployment

`.github/workflows/release.yml` is the Web release workflow. A push to `main` or
`starshot/pr0-bootstrap` runs all gates, workflow lint and browser verification at
the root and a subpath for portability.
It also proves offline startup and the transition between two worker releases.
Only then does it upload the files from `apps/game/dist`.

The deployment job publishes those same files to the selected Firebase Hosting
project. It does not run the application build or restore dependency caches.
Firebase uses short-lived Google credentials from Workload Identity Federation.
There is no stored service-account key. The game itself has no Firebase SDK or key.

Merging the release PR into `starshot/pr0-bootstrap` automatically deploys an
expiring channel in the development project.
Verify that preview before merging PR0 into `main`.
The workflow can also be dispatched with `target: preview` from a reviewed branch.
It uses the same isolated preview job and expiring channels. `target: production`
accepts only `main`.
The workflow does not accept arbitrary pull-request events or execute fork code
with deployment access.

For the first publication only, the owner approved deploying that verified PR0
artifact with the existing signed-in CLI before merging to `main`. This lets the
real domain, HTTPS and game be checked first. It grants no additional production
access to a branch workflow; subsequent automatic production deploys remain main-only.

## One-time settings

1. Enable Actions and Dependency graph. Keep default workflow permissions read-only.
   Dependency review must run; do not waive its failure to get a green PR.
2. Require the `gates` check and a pull request on `main`. Block force pushes and deletions.
3. Create `production` and `preview` environments. Restrict production
   to `main`. Allow preview for `starshot/pr0-bootstrap` and other
   branches the owner reviews.
4. Create dedicated Firebase production and development projects and their default
   Hosting sites. This release uses static Hosting within its free allowance, with
   no billing upgrade, database, Authentication or Functions setup.
5. Configure the identities below and add the environment variables. Connect the
   custom domain only to production Hosting.

The Firebase projects are `playstarshot-prod` and `playstarshot-dev`. Their default
Hosting site ids match their project ids. These names are public deployment identifiers.
Every CLI command still supplies `--project` explicitly; there is no implicit CLI alias.

| Environment variable | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | The environment's dedicated Firebase project id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | The full Google workload identity provider resource name |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | That project's Hosting deployment service account |

These are GitHub environment Variables, not secrets and not Vite build variables.
Configure both `production` and `preview`.

## Keyless deployment identity

Use a separate deployment service account and workload identity pool per project.
The account needs Firebase Hosting administration, Service Usage Consumer and API
Keys Viewer for the CLI's project lookup. Grant these only on the target project.
Grant Workload Identity User on that service account only to its GitHub provider principal.

The provider condition pins the numeric repository id and owner id. Production also
pins `refs/heads/main`, the `production` environment and the release workflow path.
Preview pins its own environment and release workflow path. It accepts a push only
from `refs/heads/starshot/pr0-bootstrap`, plus manual dispatch from explicitly allowed
refs. Configure the GitHub environment branch policies as a second boundary.
Do not grant an owner, editor, Firebase-wide administration or Authentication
administration role.

Use the current GitHub OIDC claims when creating the provider. Do not assume an old
subject string format. The workflow's exact resource names are configured through
Variables, so no credential or account email is embedded in the application.

The preview command passes `--no-authorized-domains`: this static game does not need
to modify Firebase Authentication settings. Production deploys only Hosting.

References: [Firebase CLI authentication](https://firebase.google.com/docs/cli#cli-ci-systems)
and [Google's GitHub authentication action](https://github.com/google-github-actions/auth).

## Preview before production

A workflow dispatch becomes available after the workflow exists on the default branch.
The automatic push run on `starshot/pr0-bootstrap` does not need that default-branch
step. Merge the release PR into PR0, wait for Web release to pass, then open the
preview channel URL in its deployment log. Confirm `release.json` records the new
PR0 commit and test the hosted game before merging PR0 into `main`.

Before the release PR merges, the orchestrator can also stage the same verified build
with the signed-in Firebase CLI:

```bash
npm ci
npm run gates
node scripts/verify-game.mjs --out <temporary-directory>/root
node scripts/verify-game.mjs --base /starshot/ --out <temporary-directory>/subpath
node scripts/verify-web-release.mjs
firebase hosting:channel:deploy release-check --expires 7d --no-authorized-domains --project playstarshot-dev --non-interactive
```

Playwright must resolve outside the product dependencies. CI installs its pinned
version globally. Keep screenshots and logs outside the repository. Open the preview
URL returned by Firebase and verify entry, an actual mission, saves and About links.
Do not interpret a successful upload as proof that the game works.

## First publication before the main merge

After the automatic PR0 preview passes, download its retained `web-release` artifact
from that successful Web release run into a temporary directory:

```bash
gh run download <successful-pr0-run-id> --repo harmon-amakobe/starshot --name web-release --dir <temporary-directory>/web-release
```

Confirm `apps/game/dist/release.json` records the exact PR0 commit from the successful
run. Its `version` must match the verified preview's `release.json`. Stop if either
differs. Keep the artifact unchanged: do not rebuild it from a local checkout.
From the extracted artifact root, use the existing signed-in Firebase CLI:

```bash
firebase deploy --only hosting --project playstarshot-prod --config firebase.json --non-interactive
```

Compare the production default URL's `release.json` with the artifact, then complete
the apex and `www` domain steps below. Verify HTTPS, the redirect and the game at
playstarshot.com before merging PR0 to `main`. Retain the run URL, source SHA, artifact
version and live verification evidence. A failed check stops the main merge.
The first main merge rebuilds from its own commit and publishes that new release to
Firebase. Compare the apex and production default URL again after it finishes.

## Domain and caching

Add playstarshot.com in the production site's Firebase Hosting console. Copy the
exact ownership, address and certificate records Firebase provides to the DNS host.
Do not guess those records or replace unrelated mail records. Keep ownership records
needed for renewal. Wait until Firebase reports the certificate and domain active.
Set `www.playstarshot.com` as a Firebase redirect domain to the apex and verify its
HTTPS redirect. Both domains belong to the production site, never an expiring
development preview channel.

`firebase.json` sends security headers and revalidates HTML, the worker and unhashed
observatory assets. Vite's hashed `/assets/` files are immutable for one year.
There is no catch-all rewrite: missing assets return 404 rather than HTML.
The relative Vite base also supports subpath hosting for forks. CI checks `/starshot/`
as a portability test; Starshot itself is served at the production domain's root.

The build generates a scoped worker cache and a content digest in `release.json`.
A complete release, including required astronomy data, downloads in the background.
Offline play is ready after the worker finishes installing. Failed or partial
installation leaves online play available and does not replace an existing worker.
Updates wait for all existing game tabs to close. A flight controlled by an installed
worker keeps matching code and data. The worker does not take over a first visit that
started before installation. Browser storage can be cleared or evicted; local saves
are not a backup.

References: [Hosting configuration](https://firebase.google.com/docs/hosting/full-config)
and [custom domains](https://firebase.google.com/docs/hosting/custom-domain).

## Verify production and recover

After the first main Web release and each later one, compare `release.json` at
playstarshot.com and the production project's default Hosting URL. They must identify
the same build. Check entry and a mission on phone and desktop, the credits links,
offline startup after installation, and a fresh browser profile.

A failure to load entry, launch a mission or fetch an asset is a rollback trigger.
Restore the previous verified release in Firebase Hosting's release history.
Revert the faulty source through a PR before the next deployment from `main`.
The workflow retains the exact `web-release` artifact for 14 days. Never clear pilot
storage as part of rollback. Visit online and let the restored worker finish its
download; confirm it is installed or waiting in browser developer tools. Then close
all game tabs and reopen. A first reopen may still use the old worker while downloading
the restored one, so closing before installation finishes is not sufficient.
The release plan records the [merge order](plans/current-game-release.md#shipping-order).

## The optional private-name list

`STARSHOT_PRIVATE_NAMES` is an optional GitHub secret containing private names the
hygiene checker should reject. Only CI's standalone secrets gate reads it, before
installing packages. It is never passed to the app or deployment jobs.
Without it, the ordinary credential, email and private-path rules still run.

## Later releases

The remaining program retains its Firebase accounts, replay verification, leaderboard,
Rust core and content work. Each service gets its own minimum permissions when it is
implemented. Native store packaging and billing upgrades require their own scope.
No such feature is needed to publish this browser preview.
