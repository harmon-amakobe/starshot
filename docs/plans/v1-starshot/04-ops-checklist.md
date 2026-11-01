# v1-starshot: what only the owner can do

Steps with no gate: they happen in a settings page, a registrar or a console, so no
script can do or check them for you. They are grouped by where you click, in the order
to do them. Each says how to confirm it worked and which pull requests wait on it
(PR ids are those of [00-plan.md](00-plan.md#the-pull-requests)). Click-by-click detail
for Pages and the ruleset is also in [../../hosting.md](../../hosting.md).

Never paste a password, token, key file or personal email address into the repository,
an issue or a pull request. Values that are identifiers rather than secrets (the
Firebase web configuration, D13) go only where a step below says.

## GitHub

| # | Step | Where to click | How to confirm | Blocks |
|---|---|---|---|---|
| G1 | Turn on Issues (off on this fork) | Repository, Settings, General, Features: tick **Issues** | `curl -s https://api.github.com/repos/harmon-amakobe/starshot` shows `"has_issues": true` | The orchestrator's first `node scripts/sync-work.mjs --apply` (D23), so every issue on the board |
| G2 | Replace the About description and add topics (R17) | Repository home page, the gear beside **About**. Suggested text: "A slingshot game across the real Solar System, with open orbital-mechanics code. Apache-2.0. Includes separately owned, all-rights-reserved Python code in third_party/ and python/astlo/; see NOTICE.md." Topics: `game`, `orbital-mechanics`, `typescript`, `rust`, `webassembly`, `accessibility` | The About box shows the new text; it no longer says the game is built on astlo | Nothing; it corrects a public claim |
| G3 | Enable Actions on the fork | **Actions** tab: "I understand my workflows, go ahead and enable them" | The Actions tab lists CI, Pages and astlo | Every CI proof from PR0 on |
| G4 | Read-only default token; no PRs from Actions yet | Settings, Actions, General, Workflow permissions: **Read repository contents and packages permissions**; leave **Allow GitHub Actions to create and approve pull requests** off until PR38 | `gh api repos/harmon-amakobe/starshot/actions/permissions/workflow` shows `"default_workflow_permissions": "read"` | PR1 (the workflows assume it); PR38 turns the second switch on |
| G5 | Pages source | Settings, Pages, Source: **GitHub Actions** | After PR0 merges, <https://harmon-amakobe.github.io/starshot/> loads (it returned 404 on 2026-11-01) | The Pages mirror (D21) and acceptance criterion AC17 |
| G6 | Ruleset on `main` | Settings, Rules, Rulesets, **New branch ruleset**: target the default branch; require a pull request; require the status check `gates`; block force pushes; restrict deletions. The copy-lint workflow's `copy` check may be added to the ruleset once it has run on a pull request | Open any PR: `gates` shows as **Required** | Enforcement of every gate; nothing fails without it, but nothing is enforced either |
| G7 | Code security | Settings, Code security: push protection **on**; private vulnerability reporting **on**; Dependabot alerts and security updates **on**; CodeQL **default setup** for GitHub Actions, JavaScript and TypeScript, Python. After PR6 merges, add Rust to CodeQL | The Security tab lists CodeQL runs; a test push of a fake key is blocked | PR1's Scorecard job reports these; `SECURITY.md` promises private reporting |
| G8 | Install the DCO app, after PR0 merges | <https://github.com/apps/dco>: install on this repository only. Wait until PR0 has merged: PR0's earlier commits predate D24 and carry no sign-off | The next PR shows a **DCO** check | D24 enforcement from PR1 on |
| G9 | Create the project board and link it | Your profile, Projects, **New project**, Table, name "Starshot". Fields: Status (Triage, Ready, In progress, In review, Done, Won't do), Priority (P0, P1, P2, P3), Size (XS, S, M, L, XL), Area (one option per `area:` label), Actor (Human, Agent, Either), Chapter (Chapter 1: web). Views: Board (by Status, open items), Backlog (table grouped by Area, sorted by Priority), Epics (filter `label:kind:epic`), Roadmap (by Chapter), Agent queue (filter `label:agent-ready` and Status Ready). Workflows: keep "closed to Done" and "merged to Done"; turn on "item added sets Triage", auto-archive Done after 30 days, and the one auto-add workflow for `is:issue,pr` in this repository. Then the repository's **Projects** tab, **Link a project** | A new issue appears on the board within a minute | The board views named in D23. `sync-work.mjs` sets project fields only with a token that can reach the project; otherwise it prints what it would have set |
| G10 | Environments | Settings, Environments, **New environment**: `production` (deployment branches: `main` only), `preview` (any branch), `release` (`main` only, required reviewer: you). Later: `e2e`, `firebase-prod` (`main` only), and `appstore` and `play` (tags only) for the native program | Each is listed with its branch rule | `production` and `preview`: PR33. `release`: PR38. `e2e` and `firebase-prod`: PR30 to PR32 |
| G11 | Optional: allow auto-merge | Settings, General, Pull Requests: **Allow auto-merge** | The option shows on a PR | Nothing in this program |
| G12 | Optional: the private-name secret | Settings, Secrets and variables, Actions, **New repository secret** `STARSHOT_PRIVATE_NAMES` (comma-separated); see [../../hosting.md](../../hosting.md#the-optional-private-name-list) | The CI log's `secrets` line reports private-name hashes | Nothing; it widens the hygiene scan |

## Domain and email

The domain scout's safety steps, condensed. Prices were read on 2026-11-01; confirm them
in the cart.

| # | Step | Where to click | How to confirm | Blocks |
|---|---|---|---|---|
| M1 | Register `playstarshot.com` and `playstarshot.app` (D20) | Cloudflare dashboard, Domain Registration, **Register Domains**, in your own account with an email address you control long term (not one that forwards through these domains). Turn on two-factor authentication first and keep the recovery codes offline. If the cart price is above the standard price (about US$10.46 a year for .com; about US$8.20, then US$14.20, for .app), the name is premium: stop | `https://rdap.org/domain/playstarshot.com` shows Cloudflare as registrar and `client transfer prohibited` | PR33 (custom domain); the contact addresses in M3 |
| M2 | Keep the defaults on | Auto-renew on with a card that will not expire soon; verify the registrant email the day it arrives (an unverified email leads to a hold); registrar lock on; WHOIS redaction on (the default); add a calendar reminder 60 days before expiry | The domain's overview page shows auto-renew and the lock | Nothing directly; losing the domain would block everything public |
| M3 | Forward the project addresses | Cloudflare, the domain, Email, **Email Routing**: create `security@`, `hello@` and `conduct@` on playstarshot.com, each forwarding to an inbox you control. The destination address never goes into the repository | Send a test message to each; it arrives | The reporting contacts in `CODE_OF_CONDUCT.md`, `SECURITY.md` and `TRADEMARK.md` (PR0) work only once this is done |
| M4 | SPF and DMARC | Email Routing adds the MX and SPF records. Add one TXT record at `_dmarc` with `v=DMARC1; p=reject` (the domain receives mail only) | `dig +short TXT _dmarc.playstarshot.com` prints the record | Nothing; it stops others spoofing the address |
| M5 | DNSSEC | Cloudflare, the domain, DNS, Settings: **Enable DNSSEC**, after the records above exist | The DNS settings page shows DNSSEC active | Nothing |
| M6 | The records Firebase asks for (at PR33) | Firebase console, Hosting, **Add custom domain** `playstarshot.com`; copy each record the wizard shows into Cloudflare DNS: the ownership TXT at the apex (keep it permanently; it also authorises certificate renewal), the A records (remove any other A, AAAA or CNAME on the same name), the ACME challenge TXT if the wizard asks, and `www`. Set each Firebase record to **DNS only** (grey cloud) | The Hosting page says the domain is connected and the certificate is active | PR33 |
| M7 | The second domain (at PR33) | Cloudflare, `playstarshot.app`, Rules, **Redirect rule** to `https://playstarshot.com` with the path kept | `curl -sI https://playstarshot.app/` shows a 301 to playstarshot.com | PR33 |

## Firebase and Google Cloud

Do these before PR30. Names below are examples: project ids must be globally unique, so
add a suffix and check it is free.

| # | Step | Where to click | How to confirm | Blocks |
|---|---|---|---|---|
| F1 | A billing account used by nothing else | Google Cloud console, Billing, **Create account** | Billing, Account management lists only Starshot's projects | F2; free allowances are shared per billing account, so sharing would mix bills |
| F2 | Two projects: development and production (D13) | Firebase console, **Add project** twice, for example `starshot-dev-<suffix>` and `starshot-prod-<suffix>`; no organisation or folder shared with other work; **turn Google Analytics off** when asked; link both to F1's account | Project settings, Integrations: Google Analytics not linked | PR30 to PR33 |
| F3 | Budgets and alerts | Billing, **Budgets and alerts**: one budget per project with alerts at 50%, 90% and 100%. Amounts are your call; budgets alert, they do not cap. Consider the documented billing kill switch on the development project | The budgets are listed | PR30 |
| F4 | Pay-as-you-go plan on both projects | Firebase console, Usage and billing, **Modify plan**: Blaze | The plan shows Blaze | PR32 (Functions) and PR33 (Hosting beyond the free 10 GB a month) |
| F5 | One web app per project | Project settings, Your apps, **Add app**, Web | Each project lists one web app | PR30 copies the production apiKey, authDomain, projectId and appId into the one allow-listed file; the development values go into the `preview` environment's Variables as `VITE_FIREBASE_*` |
| F6 | Restrict the browser API keys | Google Cloud console, APIs and Services, Credentials, the browser key of each project: API restrictions = Firebase-related APIs only (never the Generative Language API); application restrictions = HTTP referrers for playstarshot.com, playstarshot.app, the preview channel domain and `localhost` | Each key shows both restrictions | PR31 |
| F7 | App Check with reCAPTCHA Enterprise | Google Cloud console, Security, reCAPTCHA Enterprise: create a key for the game's domains; Firebase console, App Check: register the web app with it. Watch the metrics for about a week, then enforce on Firestore, Storage and Functions. Create one debug token for CI and store it only as the secret `APP_CHECK_DEBUG_TOKEN` in the `e2e` environment | App Check metrics show verified requests | PR31; enforcement before the first public leaderboard |
| F8 | Sign-in method and authorised domains | Authentication, Sign-in method: enable **Anonymous**. Settings, Authorized domains: playstarshot.com, playstarshot.app, the project's default Hosting domains; `localhost` on the development project only | Both lists show the entries | PR31 |
| F9 | Firestore and Storage, deny-all first | Build, Firestore Database, **Create database** in production mode, in a region you choose (it cannot change later); the same for Storage | The Rules tab shows a deny-all rule | PR30 deploys the tested rules over it |
| F10 | Hosting site and custom domain (production) | Hosting, **Get started**, then M6 | `curl -sI https://playstarshot.com/` returns 200 after PR33's first deploy | PR33 |
| F11 | Deploy credentials without stored keys first | Google Cloud console, IAM, Workload Identity Federation: one pool per project with a GitHub provider whose condition pins the repository `harmon-amakobe/starshot` (and, for production, the `main` ref or the `production` environment); one deploy service account per project with only the roles it deploys (Hosting first). If the Firebase CLI refuses the federated credential in PR33's trial, create a Hosting-only key for the **development** project only and store it as an environment secret in `preview`. Production never holds a key | PR33's deploy jobs succeed | PR33 |
| F12 | Leave Analytics unlinked (D22) | Nothing to click; do not accept prompts to link Analytics | Project settings, Integrations: not linked | D22 |

## Optional: npm organisation

| # | Step | Where to click | How to confirm | Blocks |
|---|---|---|---|---|
| N1 | Hold the `starshot` npm scope | npmjs.com, your avatar, **Add organization**, free plan, name `starshot`. Nothing is published | `https://www.npmjs.com/org/starshot` shows your organisation | Nothing |

## Mark Macharia (D26)

| # | Step | Where | How to confirm | Blocks |
|---|---|---|---|---|
| K1 | Send Mark the fixes and the directions | Your own channel to Mark. Link `python/astlo/`, `python/astlo/VERIFICATION.md`, [../../astlo/directions.md](../../astlo/directions.md) and the `astlo-fixed-wheel` artifact of the astlo workflow. Ask which name and handle he wants in the credits. The message itself stays outside the repository | Note the date (not the content) in the governance epic's issue | PR37 uses the name and handle he chooses; if he objects to `python/astlo/`, the `astlo-upstream` skill describes its removal (D10) |
| K2 | Open the upstream pull requests (D29) | Mark's repository on GitHub, when PR40's kit has produced the patch series, the report and a draft body per topic (at the latest when chapter one is done). One pull request per topic, astlo changes only. When he adopts one, the orchestrator pins his release and drops Starshot's copy of that change | Each pull request is listed in the governance epic's issue | Nothing in Starshot waits on his answer |

## Playtests for the prototypes

| # | Step | Where | How to confirm | Blocks |
|---|---|---|---|---|
| P1 | Run the feel prototypes with real players | Five to ten testers, in person or remote, for gameplay prototypes 2, 3, 4 and 6 ([00-plan.md](00-plan.md#prototypes-before-bands-c-and-d)); prototype 5 is a script an agent runs | Results recorded in the Band C planning session's notes, with the success test of each | Band C's build |
| P2 | Pull-back feel with sound and haptics | The same testers, on an Android phone and an iPhone, prototype 1 | Recorded in the Band D planning notes | PR28 |

## Before any store submission (a later program)

| # | Step | Where | How to confirm | Blocks |
|---|---|---|---|---|
| T1 | Trademark searches (D20) | USPTO Trademark Search (<https://tmsearch.uspto.gov/>), EUIPO eSearch plus (<https://euipo.europa.eu/eSearch/>), WIPO Global Brand Database (<https://branddb.wipo.int/>) and KIPI's search service, for STARSHOT in classes 9, 28 and 41; then decide on a KIPI filing in classes 9 and 41 | A short note of the results in the issue (no legal advice in the repository) | Any store listing |
| T2 | Developer accounts | Apple Developer Program (US$99 a year, <https://developer.apple.com/programs/>) and a Google Play developer account, in the publisher's name you choose | Both accounts are active | The native program, not this one |

## Which pull requests wait on which steps

| PR | Waits on |
|---|---|
| PR0 merge | G3 (CI runs) |
| The board views | G9 |
| The Pages proof (AC17) | G5 |
| PR1 | G3, G4; G6 makes `gates` binding; G7 feeds Scorecard |
| PR1 onward (DCO) | G8 |
| PR4 | G1 (the first sync writes the lock the `work` gate reads) |
| PR6 | G7 adds Rust to CodeQL after it merges |
| PR28 | P2 |
| Band C build | P1 |
| PR30 | F1, F2, F3, F5, F9, G10 (`e2e`, `firebase-prod`) |
| PR31 | F6, F7, F8 |
| PR32 | F4 |
| PR33 | M1 to M6, F10, F11, G10 (`production`, `preview`) |
| PR37 | K1 (the name and handle) |
| After PR40 | K2 |
| PR38 | G4's second switch, G10 (`release`) |
