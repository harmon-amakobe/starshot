# v1-starshot: owner steps and verified ops status

This checklist distinguishes observed state from settings still needing verification.
Stable step ids remain for the work map. D34 to D37 and the
[hosting runbook](../../hosting.md) govern deployment. Keep the existing production
and development Hosting projects and numeric OIDC identity pins. Source and emulator
work are authorized; paid activation or permission expansion needs concrete review.

The 2026-11-03 opening audit found a standalone public repository with Issues on,
Pages off, and active main and release-tag rulesets. It did not reverify environment
reviewers, environment branch policies, IAM bindings, budgets or backend service state.

At 2026-11-03 01:27 Africa/Nairobi, read-only fetches of
[production metadata](https://playstarshot.com/release.json) and
[beta metadata](https://beta.playstarshot.com/release.json) returned HTTP 200 and 0.1.0,
source `64c4b12a542770960b935439aec47e3d47947b99`, build
`4374bc44ad803dbcf26dc586`. These are observations at that time, not a claim about
later deployment. Main at `7f325a61b77a43c98d95a7644d7d03834829b1a1` contains accepted
gameplay and 0.2.0 preparation through merged PR16/17. Staging was still in progress;
no 0.2.0 production deployment is asserted here.

Never place passwords, tokens, key files or personal contact details in the repository,
issues or PR text. Public Firebase identifiers follow D13's one-file allow-list.
Hosting deployment credentials confer no authority to administer backend products.

## GitHub

| # | Current status and remaining action | Evidence or verification | Blocks |
|---|---|---|---|
| G1 | Issues enabled; use the existing repository | [Repository API](https://api.github.com/repos/harmon-amakobe/starshot), opening audit | First live work sync needs a working owner credential; offline check alone proves no parity |
| G2 | About/topics not reverified; correct only claims that remain stale | Inspect the [repository](https://github.com/harmon-amakobe/starshot); preserve separate astlo ownership | No implementation |
| G3 | Actions already run; this is a standalone repository under D36 | Existing [Actions](https://github.com/harmon-amakobe/starshot/actions); verify relevant run results | CI proof |
| G4 | Workflow permission settings not reverified; existing release lane is authoritative | Read `actions/permissions/workflow` and compare with [hosting.md](../../hosting.md); keep least privilege | A change needing new token permissions |
| G5 | Pages is off and remains off under D34 | Repository API observation; AC17 now covers Firebase production and beta | Nothing; no Pages setup |
| G6 | Main ruleset 26381131 and release-tag ruleset 26385757 active | [Main rules](https://github.com/harmon-amakobe/starshot/rules/26381131), [release-tag rules](https://github.com/harmon-amakobe/starshot/rules/26385757); reverify before changes | Preserve PR/gates and immutable release protections |
| G7 | Code security settings not fully reverified | Read Dependency graph, push protection, private reporting, Dependabot and CodeQL status; add Rust coverage when supported and needed | Relevant CI/security claims |
| G8 | DCO installation unverified | Check the next PR's DCO check or installed app; owner-authored sign-off remains required by D24 regardless | DCO enforcement evidence |
| G9 | Project board creation/linkage unverified | Inspect the owner's project for Status, Priority, Size, Area, Actor and Chapter fields and board/backlog/epic/roadmap/agent views | Board parity only; issue work can proceed |
| G10 | Existing environments must be inspected, not recreated | Verify production owner review with no admin bypass and main-only deployment, release main-only, and preview reviewed-ref restrictions against D37 and [hosting.md](../../hosting.md#production-approval) | Deployment or environment changes |
| G11 | Auto-merge optional and unverified | Inspect repository setting if needed | Nothing |
| G12 | Private-name secret optional and unverified | Existing secret metadata or hygiene result; never print its value | Nothing; expands hygiene coverage only |

## Domain and email

Production and beta HTTPS already serve the game. Registration, renewal, mail delivery
and the second domain were not reverified. Do not repurchase domains or replace working
DNS merely because the original plan described initial setup.

| # | Current status and remaining action | Verification | Blocks |
|---|---|---|---|
| M1 | Confirm ownership of existing domains and whether the optional .app domain was acquired | Registrar account and public registration record; keep private details out of logs | A new domain change |
| M2 | Confirm renewal, registrar lock and recovery access | Owner checks the registrar account | Domain continuity |
| M3 | Project address forwarding unverified | Owner checks security, hello and conduct routing and explicitly sends delivery tests if desired | Claims that reporting mail works |
| M4 | Mail DNS unverified | Check MX/SPF/DMARC against actual routing; preserve working records | Mail hardening |
| M5 | DNSSEC unverified | Check registrar/DNS state | No implementation |
| M6 | Existing production and beta custom domains respond over HTTPS | Compare fresh metadata and Firebase domain/certificate state before any DNS edit | Future Hosting changes needing DNS |
| M7 | .app redirect status unverified | Read HTTP redirect if the domain exists; preserve path behavior | Optional second domain only |

## Firebase and Google Cloud

`playstarshot-prod` serves production; `playstarshot-dev` serves beta and previews.
These are existing isolated Hosting projects documented in [hosting.md](../../hosting.md).
The historical create-project, key-fallback and automatic-main-deploy steps are superseded.
Do not add Auth, Firestore, Storage, Functions or billing permissions to a Hosting identity
without a reviewed need.

| # | Current status and remaining action | Verification | Blocks |
|---|---|---|---|
| F1 | Billing-account arrangement unverified | Owner inspects project billing; review costs before paid activation | Paid services only |
| F2 | Retain existing isolated projects; inspect backend suitability during Band E planning | Compare existing project ids and service state with the detailed backend spec | Backend activation, not emulator work |
| F3 | Budgets/alerts unverified | Owner reviews limits and alerts before paid activation; alerts are not spending caps | Paid services |
| F4 | Billing plan unverified; no automatic Blaze upgrade | Review a concrete Functions/backend deployment and its costs | Paid backend deployment |
| F5 | Backend web-app configuration unverified | Inspect registered apps when PR30 needs them; production public config stays in D13's allow-listed file | Real account connection |
| F6 | Browser-key restrictions unverified | Inspect keys used by the planned backend; restrict APIs/referrers to reviewed requirements | Public backend activation |
| F7 | App Check unverified | Prepare source/emulator integration first; review registration/enforcement and any CI secret need separately | Public leaderboard activation |
| F8 | Anonymous Auth and authorized domains unverified | Confirm required service/domain configuration before activation | Real sign-in |
| F9 | Firestore/Storage existence, regions and Rules unverified | Build deny-by-default source and emulator tests first; review region and deployment before creating services | Real data service |
| F10 | Hosting sites/domains exist and serve metadata | Fresh production/beta `release.json`, immutable headers, offline/update verification and exact candidate provenance | Promotion proof |
| F11 | Existing federation is the required credential path; current IAM bindings not reverified | Preserve numeric repository/owner ids, exact workflow path, environment and ref conditions. Production stays main-only; preview stays within existing reviewed refs. Compare provider and service-account bindings with [hosting.md](../../hosting.md) before change | Any permission/deployment change |
| F12 | Analytics remains outside D22 scope; current console state unverified | Confirm no Analytics link when reviewing backend setup | D22 evidence |

No stored-key fallback is authorized. The new program trunk uses the existing manual
reviewed-ref beta path. Main push, a tag or a new branch name does not grant production
authority. Preserve immutable candidate registration, digest checks, downgrade guards and
the D37 owner approval. Recheck served metadata after staging or promotion.

## Optional: npm organisation

| # | Action | Verification | Blocks |
|---|---|---|---|
| N1 | Scope reservation remains optional; publish nothing as part of this checklist | Owner account if relevant | Nothing |

## Mark Macharia (D26)

| # | Action and status | Verification | Blocks |
|---|---|---|---|
| K1 | Owner contact and preferred credit remain unverified. Only the owner contacts Mark about fixes and directions | Record only the contact date and permitted credit choice in the issue | Final chosen attribution in PR37 |
| K2 | Only the owner submits upstream topics after PR40 prepares the kit | Record upstream PR links when they exist | No Starshot implementation waits on a reply |

## Playtests for the prototypes

| # | Action | Evidence | Blocks |
|---|---|---|---|
| P1 | Optional: use feedback after release to refine gameplay; no recruited tester count or success quota (D39) | Record observations if available; distinguish them from automated proof | Nothing |
| P2 | Optional: measure pull, audio, haptic and performance behavior on physical devices (D39) | Record device/browser and measurements if available | Nothing |

Browser automation does not establish physical-phone frame time or player success rates.
The 60 fps and 100 ms preview targets remain unmeasured unless device evidence exists.
Missing human or device feedback does not block band planning, master review or release
readiness. Automated checks and the D34 to D37 release lane remain required.

## Before any store submission (a later program)

| # | Action | Verification | Blocks |
|---|---|---|---|
| T1 | Owner reviews trademark searches under D20 before a listing | Dated source-backed findings; no new search claimed here | Store submission |
| T2 | Owner arranges developer accounts for the native program | Active account evidence, with costs reviewed then | Native publication only |

## Which pull requests wait on which steps

| Work | Remaining dependency |
|---|---|
| New PR0 publication | Real issue sync/lock and CI; existing main rules remain enforced |
| PR2 group onward | D24 sign-off; verify G8 enforcement without delaying independent implementation |
| PR4 | Real work-map sync, then work gate; G1 is already satisfied |
| PR6 | Relevant Rust CI and code-security coverage |
| Bands C and D | Detailed specs and automated proof, including prototype 5's economy script; P1/P2 are optional under D39 |
| PR30/31 source | Detailed Band E spec and emulator proofs; no billing activation required |
| PR30 to PR32 deployment | Concrete owner review of required F1 to F9 services/permissions, then their verification |
| PR33 | Reverify G10, M6, F10/F11 for actual changes; preserve D34 to D37 |
| PR37 | K1 for preferred credit, plus asset provenance |
| PR38 | Extend existing release source; reverify G4/G10 only if permissions change |
| After PR40 | K2, owner only |
