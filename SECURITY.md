# Security policy

Starshot is a static website: there is no server, no database, no user accounts and
nothing secret in this repository. Even so, we take reports seriously.

## Reporting a vulnerability

Please report security problems **privately**, not in a public issue or pull request:

1. Go to the repository's **Security** tab on GitHub.
2. Choose **Report a vulnerability** (GitHub private vulnerability reporting).
3. Describe the problem, how to reproduce it, and what an attacker could do with it.

Only the maintainers can see the report. We aim to acknowledge it within a week and
will credit you in the fix unless you prefer otherwise.

If the **Report a vulnerability** button is missing, the owner has not yet switched on
private reporting (Settings, Code security, "Private vulnerability reporting"). In that
case, open an issue that says only "please enable private vulnerability reporting",
without any details, and we will follow up.

## What is in scope

- The game as published at <https://playstarshot.com>, its Firebase preview
  deployments and its source in `apps/game`.
- The packages in `packages/`, the tools in `tools/`, the scripts in `scripts/`, and
  the GitHub Actions workflows in `.github/workflows/`.

`third_party/astlo/` is Mark Macharia's code, kept unmodified and not run by Starshot.
Problems in it are best reported to him directly, at
[iamnothimbutwe/astlopublic](https://github.com/iamnothimbutwe/astlopublic).

`python/astlo/` is Mark's astlo source with Starshot's fixes (decision D10), plus the
wheel build, benchmarks and tests, and the `astlo-fixed-wheel` that CI builds from it.

- **Problems in Starshot's fixes or files** (a change one of Starshot's fix commits made,
  `build_wheel.py`, `bench/`, `tests/`, or the `astlo` workflow) are in scope: report
  them here, privately, as above.
- **Problems in Mark's original code** (behaviour the fixed copy shares with his
  published release) go to him at
  [iamnothimbutwe/astlopublic](https://github.com/iamnothimbutwe/astlopublic). If you
  are not sure which it is, report it here and we will say which applies.

## No secrets in this repository

This repository is public, and everything in it, including its history, is published.
It must never contain passwords, API keys, tokens, private keys, service-account files,
personal emails or personal file paths. The `secrets` gate (`scripts/check-secrets.mjs`,
run by `npm run gates` and by CI) scans every file for these.

The build needs no credential. Firebase Hosting deployment uses short-lived
credentials from GitHub OIDC and Google Workload Identity Federation, restricted to
the deployment environment and project. No service-account key is stored.
Project and provider identifiers live
in environment Variables, as described in [docs/hosting.md](docs/hosting.md).

The current public preview has local profiles, not real accounts or cloud saves.
Future backend configuration follows D13 and gets its own reviewed permissions.

## If a secret is committed by mistake

Act in this order:

1. **Rotate it first.** Revoke or regenerate the key, token or password at its source,
   immediately. Assume it has already been copied: public repositories are scanned by
   bots within minutes, and forks keep their own copy of the history.
2. **Remove it from the code** in a new commit, and replace it with a build-time
   Variable or a placeholder.
3. **Then purge it from history**, if needed, with a tool such as `git filter-repo`,
   followed by a force push. This is the owner's decision, made deliberately; it
   rewrites history for everyone and does not reach copies that already exist.
4. **Check for misuse** in the provider's logs, and record what happened.

Rotating first matters most: purging history without rotating leaves the old key valid
for anyone who already copied it.

## Recommended repository settings

The owner should keep these switched on under Settings, Code security:

- **Secret scanning** and **Push protection**, which block many kinds of secret before
  they are pushed.
- **Private vulnerability reporting**, for the process above.
- **Dependabot alerts** (dependency updates are configured in `.github/dependabot.yml`).
