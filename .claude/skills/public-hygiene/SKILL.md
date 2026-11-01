---
name: public-hygiene
description: Use when anything is about to leave the machine for this public repository, such as a push, a commit message, a pull-request title or body, an issue comment, a screenshot or a pasted log, or when a task mentions secrets, tokens, emails, personal paths, private project names, Firebase config or the check-secrets gate.
---

# The pre-push hygiene pass

Starshot is public: a push is publication, and forks keep what a later commit deletes.
The rubric is `.claude/rubrics/public-repo-hygiene.md`.

## Scan

```bash
node scripts/check-secrets.mjs                       # tracked and untracked files
git log --format='%an <%ae> %cn <%ce>%n%B' main..HEAD | node scripts/check-secrets.mjs --stdin
node scripts/check-secrets.mjs --stdin < <PR body file>
git diff --name-only main...HEAD                     # exactly what will be published
git ls-files -o --exclude-standard                   # strays: screenshots, scratch tests
```

Each must be clean before the push. In a stacked branch, replace `main` with the branch
below.

## Author identity

Commit author and committer emails are published with the commit. Use the GitHub
noreply address (`<id>+<user>@users.noreply.github.com`) in `git config user.email` for
this clone; the secrets scan of `git log` above catches a personal one.

## If something leaked

1. Stop pushing. A credential is rotated first, whatever happens to history.
2. Remove it in a new commit; report it to the owner with the commit sha.
3. History rewrites and force pushes are the owner's call, made outside an agent
   session; the destructive-git guard refuses them for agents on purpose.

## What the scan cannot see

Paraphrased private context, a screenshot's pixels, and content in binary files. Look at
every screenshot before attaching it, and keep them out of the repository.
