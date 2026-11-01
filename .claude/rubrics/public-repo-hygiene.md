# Public repository hygiene rubric

Starshot is public. A push is publication, forks and caches keep what a later commit
deletes, and CI logs of a public repository are public too. Apply this to every diff,
commit message, PR body, screenshot and log you produce.

## Never in the repository

- **Credentials:** API keys, tokens, private keys, service-account JSON, `.env` files,
  webhook URLs, passwords in URLs. If one was committed, deleting it is not enough:
  it must be rotated, and the owner decides on any history rewrite.
- **Personal data:** personal email addresses (commit author emails too: use the GitHub
  noreply form), phone numbers, home locations.
- **Personal paths:** absolute paths naming a person's machine or account (a Windows
  user folder, a Git Bash `/c/Users/<name>` form, a macOS `/Users/<name>`, a Linux
  `/home/<name>`, a phone's app-data home). Write `<repo>/...` or a path relative to the
  repository root.
- **The owner's private projects:** their names, URLs, project ids, company names and
  content. Do not type them even as negative examples. `check-secrets.mjs` reads the
  list from a local, never-committed file (`.git/info/private-names`) or the
  `STARSHOT_PRIVATE_NAMES` variable, because even hashes of short names can be guessed.
- **Firebase or GCP configuration:** none today. A future leaderboard uses a separate,
  Starshot-only project whose config is injected at build time from repository
  Variables (D7), never committed and never borrowed from another project.

## Allowed

- Role and no-reply addresses (`noreply@...`, `<id>+<user>@users.noreply.github.com`),
  `@example.com` placeholders.
- Public handles the owner chose to publish (the GitHub account that owns the fork).
- `localhost` URLs and relative paths.
- Upstream content in `third_party/astlo`, exactly as published there (pinned by hash).

## Screenshots and logs

- Capture headless, at fixed viewports, with no desktop, browser chrome, bookmarks or
  notifications in frame. Store them outside the repository.
- Read a log before pasting it: hostnames, usernames and paths leak through stack
  traces and tool output.

## Licence hygiene

- Starshot's own files are MIT (D3). Mark's astlo files keep his notice and are never
  relabelled, excerpted or summarised into our code (D2).
- Third-party data (JPL elements, Horizons vectors) carries its source citation where
  it is used.

## Before a push

```bash
node scripts/check-secrets.mjs                         # every tracked and untracked file
git log --format='%an <%ae> %cn <%ce>%n%B' main..HEAD | node scripts/check-secrets.mjs --stdin
git diff --name-only main...HEAD                       # what will be published
git ls-files -o --exclude-standard                     # what you forgot, or should not add
```

## Reporting

A hygiene finding is a blocker. Cite `file:line` and redact the value in the report
itself: write the first characters and the length, never the secret or the name.
