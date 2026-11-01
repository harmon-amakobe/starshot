# Hosting and publishing Starshot

Plain answers to the practical questions: how to put the game online, whether it can
run straight from the repository, how to keep private things private, and what comes
later (a custom domain, the Play Store).

**Short version:** switch on GitHub Actions, set Pages to "GitHub Actions", merge to
`main`, and the game appears at **<https://harmon-amakobe.github.io/starshot/>**. It is
free, there is no server to run, and nothing secret is involved.

---

## (a) What is the easiest way to publish it?

**GitHub Pages, from this repository, using the workflow that is already included**
(`.github/workflows/pages.yml`). GitHub Pages is free for public repositories. The game
is a set of static files (HTML, JavaScript, CSS), so there is no server, no database
and no Firebase to set up (decision D7).

### One-time setup (about five minutes)

1. **Turn on Actions.** Forks start with GitHub Actions switched off. Open the
   repository's **Actions** tab and click the button to enable workflows ("I understand
   my workflows, go ahead and enable them").
2. **Point Pages at Actions.** Go to **Settings → Pages**. Under *Build and deployment*,
   set **Source** to **GitHub Actions**.
3. **Publish.** Merge a pull request into `main` (or push to `main`). The **Pages**
   workflow runs. You can also start it by hand: **Actions → Pages → Run workflow**.
4. **Open the game** at <https://harmon-amakobe.github.io/starshot/> once the workflow
   shows a green tick. The first deploy can take a minute or two to appear.

From then on, every merge into `main` republishes the game automatically.

### What the workflow does

1. Installs the exact locked dependencies (`npm ci`).
2. Runs every quality check (`npm run gates`). **If any check fails, nothing is
   published**, so a broken build never replaces a working one.
3. Builds the game (`npm run build`) into `apps/game/dist`.
4. Uploads that folder and deploys it to Pages.

The Pages workflow uses no secrets at all (D7); the optional private-name list is read
only by the CI workflow (see [section c](#the-optional-private-name-list)). Its only
special permissions are the two GitHub needs for Pages (`pages: write` and
`id-token: write`), granted to the deploy job alone.

### Make the checks required (recommended)

The **CI** workflow (`.github/workflows/ci.yml`) runs the same checks on every pull
request. To make sure nothing reaches `main` without passing them:

1. Let CI run once (open any pull request), so GitHub knows the check's name.
2. Go to **Settings → Rules → Rulesets → New branch ruleset** (or the older
   **Settings → Branches → Add rule**), target the `main` branch, and turn on:
   - **Require a pull request before merging**;
   - **Require status checks to pass**, adding the check named **`gates`**;
   - **Block force pushes** and **Restrict deletions**.

The required check stays **`gates`** however many jobs CI grows. It is a small job that
fails when any of four jobs failed or was cancelled: `checks` (the gate registry),
`workflow-lint` (zizmor, a security linter for workflow files), `dependency-review` and
`verify-game` (the play-through in a headless browser). `dependency-review` runs on pull
requests only; on `main` it is skipped, and a skipped job does not fail `gates`.

A third workflow, **astlo** (`.github/workflows/astlo.yml`), runs only when something
under `python/astlo/` changes. It builds the fixed astlo wheel
(`astlo-12.5.5130000+starshot.1-py3-none-any.whl`; the `+starshot` label marks a
patched build, which PyPI refuses), prints its sha256 in the log, and keeps it as a
downloadable artifact named `astlo-fixed-wheel` (open the run under **Actions**, then
**Artifacts**) before it installs anything from PyPI. Then it tests the wheel against
NASA/JPL data. It needs no secrets. Do not make its
check required: on a pull request that does not touch `python/astlo/` it never runs,
and a required check that never runs blocks the merge.

Two more workflows are not required checks either. **Scorecard** scores `main` after a
merge and once a week, never a pull request. **copy-lint** runs when a description is
opened or edited, not on each push, so a new commit would wait for it forever.

### If something goes wrong

| What you see | What to do |
|---|---|
| No workflow ran after merging | Actions are still disabled on the fork: see step 1 |
| The deploy step says the branch "is not allowed to deploy to github-pages" | **Settings → Environments → github-pages → Deployment branches**: allow `main` |
| The workflow is green but the page shows 404 | Check **Settings → Pages → Source** is "GitHub Actions"; wait a minute and refresh |
| The workflow is red at "gates" | Open the run's log: the last lines name the failing check and how to fix it |

---

## (b) Can it run directly from the repository?

**Yes, in the sense that matters:** GitHub Pages serves the game built from this
repository by its own CI, so the repository *is* the source of the website. There is
nothing else to host.

Two things to know:

- **Opening `index.html` on github.com shows source code, not the game.** The game has
  to be built first, and Pages does that for you.
- **The game needs to be served by a web server; double-clicking a file will not
  work.** Its physics runs in a *module Web Worker*, and browsers refuse to start those
  from `file://` pages. Any web server works, including a tiny local one.

### On your own computer

```bash
npm ci          # once
npm run dev     # live development server; open the address it prints
```

To try the production build exactly as Pages will serve it:

```bash
npm run build
npm run preview                                   # or, with no Node at all:
python3 -m http.server 8080 --directory apps/game/dist
```

### On other hosts

The built folder `apps/game/dist` is plain static files, and it uses relative paths, so
it works from any address or sub-folder. You can upload it to:

- **Netlify** or **Cloudflare Pages**: build command `npm run build`, publish directory
  `apps/game/dist`, Node version 22.
- **itch.io**: zip the *contents* of `apps/game/dist` (so `index.html` is at the top of
  the zip), upload it as an HTML game, and tick "This file will be played in the
  browser".
- Any other static host or your own web server.

---

## (c) How do we keep private information private?

**Starshot needs nothing private.** It has no server, no accounts, no API keys and no
passwords. Keep it that way:

- **Never put another project's configuration here.** A Firebase web configuration (the
  `apiKey`, `projectId` and similar values) is not a password: it is designed to be
  visible in a website. But it does identify a specific project, so pasting a private
  project's configuration into this public repository would point strangers at that
  project. Starshot must never use any private project's configuration (decision D7).
- **If a leaderboard or other online feature is added later:**
  1. Create a **separate Firebase project used only for Starshot**.
  2. Store its web configuration as **repository Variables** (**Settings → Secrets and
     variables → Actions → Variables** tab), and have the Pages workflow pass them to the
     build as `VITE_...` environment variables. They then exist only in the built site,
     never in a file in the repository.
  3. Protect the data with **Firestore security rules** (players can write only their
     own, well-formed scores) and **App Check** (only the real Starshot site can call
     the backend). Re-check submitted scores on the server by re-running the shot with
     the same physics code (see [architecture.md](architecture.md#future-a-leaderboard)).
  4. **Never commit a service-account key** (a JSON file containing `private_key`).
     Those *are* secrets. Deploy with short-lived credentials from GitHub Actions
     instead.
- **Switch on GitHub's protections:** **Settings → Code security** (called *Advanced
  Security* on some accounts): enable **Secret scanning** and **Push protection**, which
  blocks many kinds of secret at push time. Enable **Private vulnerability reporting**
  too (see [SECURITY.md](../SECURITY.md)).
- **Keep your email out of commits:** in GitHub, **Settings → Emails**, tick "Keep my
  email addresses private" and "Block command line pushes that expose my email", and
  use the `...@users.noreply.github.com` address in `git config user.email` for this
  repository.
- **The repository checks itself.** The `secrets` gate (`scripts/check-secrets.mjs`) runs
  in CI and before every deploy. It looks for keys and tokens, Firebase-style
  configuration, personal emails, personal file paths and the names of private
  projects, and fails the build if it finds any. The private-name part needs a list,
  which is never committed: see the next section.
- **If something slips through anyway:** rotate the secret first, then remove it. The
  steps are in [SECURITY.md](../SECURITY.md#if-a-secret-is-committed-by-mistake).

### The optional private-name list

The scan can only look for names it knows, and writing the names of private projects
into this public repository would publish them. So the list stays outside it, in two
places you control:

- **On your computer:** the file `.git/info/private-names` in your clone, one name per
  line. Git never commits anything under `.git/`.
- **In GitHub Actions:** a repository secret. Go to **Settings → Secrets and variables
  → Actions → Secrets** tab → **New repository secret**, name it
  `STARSHOT_PRIVATE_NAMES`, and enter the names separated by commas. The CI workflow
  passes it to the scan step alone, before any dependency is installed; the Pages
  workflow uses no secrets at all (D7).

Both are optional. Without a list the scan still runs every other rule and its summary
says "private-name rule off". GitHub gives no secrets to pull requests from forks, so
those run without the list; a name in one is caught by the run on `main` after the
merge, which is why the local file matters too. Findings are printed shortened, because
a public repository's CI logs are public, and GitHub also masks the secret's value.

---

## (d) Can it have its own domain name?

Yes, optionally. GitHub Pages supports custom domains with free HTTPS.

1. Buy a domain from any registrar.
2. In **Settings → Pages → Custom domain**, enter it (for example `play.example.com`)
   and save.
3. At your registrar, add the DNS records GitHub shows:
   - for a sub-domain such as `play.example.com`: a `CNAME` record pointing to
     `harmon-amakobe.github.io`;
   - for a bare domain such as `example.com`: the `A` records `185.199.108.153`,
     `185.199.109.153`, `185.199.110.153` and `185.199.111.153` (check GitHub's Pages
     documentation for the current list).
4. Once the check passes, tick **Enforce HTTPS**.
5. Recommended: **verify the domain** in your GitHub account settings (Settings → Pages
   → *Add a domain*), so nobody else can claim it on GitHub.

No code change is needed: the game uses relative paths, and with an Actions-based
deploy GitHub keeps the custom domain in the Pages settings rather than in a file.

---

## (e) Could it go on the Google Play Store later?

Yes, optionally, without rewriting anything, as a **Trusted Web Activity** (TWA). A
TWA is a thin Android app that opens the website full-screen, without browser bars.
Google's **Bubblewrap** tool generates it.

What it needs:

- **A web app manifest and a service worker:** Starshot already has both
  (`apps/game/public/manifest.webmanifest` and `apps/game/public/sw.js`), so it can be
  installed and works offline.
- **A domain you control at its root.** Android checks a file at
  `https://<domain>/.well-known/assetlinks.json` to prove the app and the site belong
  together. On the default address that file would have to live at the root of
  `harmon-amakobe.github.io`, which this repository does not control, so in practice a
  **custom domain** (section d) is the clean route.
- **A Google Play developer account** (a one-time registration fee).
- **An app signing key, kept safe and never committed to this repository.** Losing it
  means losing the ability to update the app; leaking it lets others impersonate it.

The rough steps: install Bubblewrap on your own computer (it needs Java and the Android
SDK, which it can download for you), run `bubblewrap init --manifest
https://<your-domain>/manifest.webmanifest`, then `bubblewrap build`, publish the
`assetlinks.json` it prints, and upload the generated app bundle in the Play Console.
This would be its own pull request and its own decision entry.
