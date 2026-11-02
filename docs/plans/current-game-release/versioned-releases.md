# Versioned releases and beta testing

The owner requested semantic versioning and a stable testing domain on 2026-11-02,
then chose an explicit promotion action after testing. This brings the release lane
in the v1 plan's PR38 forward and revises D34's automatic production deployment.
It does not merge PR0 to main or broaden cloud deployment trust.

## Outcomes

- Contributors and agents describe changes under `CHANGELOG.md` `[Unreleased]`.
  CI generates version and dated changelog outputs; a stack receives one bump.
- Preserve the custom release-PR approach in R26. Infer major from a declared
  breaking change, minor from Added, otherwise patch. An explicit `Bump:` line
  may select major, minor or patch; ambiguous or invalid input fails.
- Start Starshot's releases at the existing package baseline, 0.1.0. Use
  `starshot-vX.Y.Z` tags, excluding inherited upstream tags. Versions are never
  reused for different source or bytes. Major zero denotes the current early game.
- Beta snapshots have valid prerelease versions. A candidate for production already
  has its final stable version while tested on beta, so promotion changes no bytes.
- Keep the content digest as cache identity and retain the exact source commit.
  Expose a readable game version in the menu footer, About and release metadata.
  The footer puts View source on GitHub at left, the version centered and About
  and credits at right. On phones, the centered version can use a second row.
  Replace the extra top-left mark/tagline with A game by Kobe and the creator link;
  retain the profile control at top-right.
- `beta.playstarshot.com` uses the development site's live channel. Temporary
  previews keep their expiring URLs. Production remains in the other project.
- A push to the current PR0 can deploy beta. Other trusted integration branches use
  an explicit beta action; do not expand the provider's push allowlist implicitly.
- Production requires an explicit Promote release action running from main. A tag,
  a commit-message marker, or a fork pull request cannot deploy production.

## Spec 1: version calculation and generated release proposal

Implement dependency-free release scripts with arithmetic, input and retry tests.
Root package version is the stable source of truth. Synchronize every current npm
workspace and matching package-lock entries, including internal version ranges.
Exclude upstream astlo and nonexistent Rust packages. Keep hand-edit guards.
Infer the bump from the Unreleased section, with a validated explicit override.
Empty sections produce no release. Reject conflicting versions, malformed SemVer,
duplicate headings, invalid bump lines and an existing tag on another commit.

Generate a reviewable release proposal from CI. It updates version outputs and moves
Unreleased notes to a dated version heading. Do not push directly to main. Respect
the single stacked PR to main: a proposal can target the integration branch.
Use only a short-lived GitHub token for repository writes, isolated from both
application dependency execution and cloud credentials. No PAT or service key.
Before the workflow exists on main, a PR0 push may generate a proposal artifact;
the orchestrator may publish those unchanged CI-generated outputs as the bootstrap
release PR. Document and verify this exception instead of claiming manual dispatch
works before its workflow reaches the default branch.

## Spec 2: version metadata and contributor checks

Add strict manifest and lockfile parity checks to the gate registry, with negative
fixtures proving they fail. Extend the existing version-edit protection rather than
duplicating policy in agent adapters. Add release readiness instructions and route
release changes through them. Update the PR template with expected bump and release
notes, not a requirement that contributors edit version numbers.

Build metadata distinguishes semantic game version, content digest and source SHA.
An ordinary local build is clearly a development build. Preview and beta snapshots
are valid unique prereleases; prepared candidates are stable versions. The worker
continues to key caches by the digest, with complete integrity-checked installs.
About shows the version without contacting a backend. Test metadata and offline
updates, including two different builds of the same planned version.

## Spec 3: candidate staging and promotion

Update Web release with explicit, fail-closed routing for preview, beta, candidate
and promotion. Keep deployment identities in artifact-only jobs, no app checkout
or build there. Preserve current repository, workflow, ref and environment pins.
Use separate destination-wide concurrency for beta and production. Only reviewed
trusted refs can publish beta; main alone can create stable candidates or promote.

Retain a verified candidate artifact and provenance: repository, workflow, source
ref and SHA, version, workflow run and cryptographic digest. Promotion accepts a
semantic version, not arbitrary commands, project ids, refs or artifact URLs.
Resolve its recorded candidate; validate its source is on main, successful source
workflow and matching digest. Reject missing or expired artifacts, prereleases,
tag/source mismatches, reuse of a version and wrong-repository candidates.
Never rebuild during promotion. Stage the candidate's exact bytes on beta first,
then require beta's release metadata to match before production publication.
Retain the archive, release notes and checksums in the GitHub release for recovery;
publish the release only after successful production checks. Retries resolve the
same candidate instead of substituting the latest branch head. A rollback uses a
previous verified release and never clears player storage.

The GitHub write job is separate from the cloud identity job. Any artifact downloaded
for deployment must contain only expected static files and a validated Hosting-only
configuration, without hooks or backend deployment instructions.

## Spec 4: infrastructure and documentation

Attach beta.playstarshot.com to the existing development Hosting site. Use Firebase's
returned ownership, certificate and CNAME records in GoDaddy, preserving unrelated
DNS. Verify TLS and live metadata. No new project, paid plan, runtime service or
broader IAM role is needed. Beta uses the existing preview identity and environment.

Document the normal contributor, agent, integration, release-PR, beta and promotion
steps. Distinguish existing local-save schema versions from the game's SemVer;
versioning does not silently migrate saves. Define compatibility around supported
saved progress and public package APIs, with breaking changes explained in notes.
Remove stale publication wording from README and old hosting references in touched
instructions. Record the owner choice in D35 and a deviation, preserving D33.

## Acceptance and evidence

| Requirement | Proof |
|---|---|
| Bumps, initial release and retries are deterministic | Release script tests, including malformed and conflicting inputs |
| Version outputs agree | Registered parity gate and failing negative fixtures |
| CI owns generated outputs | CI proposal artifact and exact generated diff |
| Forks and markers cannot publish | Workflow routing tests for repository, event, ref and target |
| Deployment preserves provenance | Wrong SHA, wrong digest, expired artifact and duplicate version tests |
| Beta works | Hosted version, valid HTTPS, phone/desktop startup and installed offline reload |
| Promotion preserves bytes | Candidate archive and beta/production metadata comparison; fixture tests before first main release |
| Existing game is unaffected | Full gates, workflow lint and browser verifiers exit 0 |

The public domain currently serves the previously verified unversioned artifact.
Leave it running while this follow-up is reviewed. Hold the main merge and the first
versioned production promotion for the owner's release decision. Report bootstrap
or account steps that remain unexecuted; do not claim a configured workflow has run.

## Implementation choices

The default proposal path is a read-only artifact plus `apply-proposal`, which checks
clean source HEAD, source date and exact regenerated bytes before writing. Optional
PR automation requires an explicit repository switch and the broader GitHub setting;
it remains disabled. Repository-write jobs use the main-only `release` environment,
which has no Google credentials. All cloud identity remains in Web release.

Protected annotated tags pin the original successful build job and attempt as well
as run, artifact and digests. This allows retry after a failed downstream stage while
keeping the original bytes. Promotion requires the source run's latest success and
matching beta metadata. Recovery assets have an exact four-file set with checked
digests; only the protected record is authoritative before publication.

The bounded static archive uses gzip JSON/base64 rather than tar. This keeps path,
size and file-type validation dependency-free. No candidate-supplied code is executed.
No-change snapshots use the current prepared version; pending notes use the next
planned version. A no-change prerelease sorts below its corresponding stable release.
The beta host currently shares Hosting headers with production; adding noindex is
deferred rather than changing the promoted game files.
