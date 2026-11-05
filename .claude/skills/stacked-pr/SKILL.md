---
name: stacked-pr
description: Use when starting a branch that depends on an unmerged Starshot branch, choosing a PR base, committing agent work, signing off, pushing, restacking after the branch below changed, sweeping before a push, or when a diff shows a mass change nobody expected, or a task mentions stacking, rebasing, the stack base, the DCO, commit authorship or opening a pull request.
---

# Stacked pull requests

## The base rule

Only the bottom of the stack targets `main`. Every later branch, in any session, bases
on the branch below it, and its PR targets that branch. In a program built as PR groups
(D30) that is the previous group's branch in the plan's group table. The chain merges as
one. Check before every PR:

```bash
git status --short && git branch --show-current && git log --oneline -5
gh pr list --state open --json number,headRefName,baseRefName \
  --jq '.[] | "\(.number) \(.headRefName) -> \(.baseRefName)"'
```

Only the orchestrator pushes and opens PRs; builders never do.

## Commit agent work as the owner (D24)

The orchestrator makes every commit, at its publish step; builders never commit. Each
commit is authored by the owner, carries the owner's `Signed-off-by:` (the DCO check
compares it with the author) and names the agent in a `Co-Authored-By:` trailer with the
session link. The committer stays the session's own identity: the platform signs a
commit only when the committer is that identity, and a commit whose committer is the
owner shows as unverified. Write the message to a file outside the repository, with the
sign-off typed into it, then:

```bash
git commit --author="Harmon Amakobe <73005556+harmon-amakobe@users.noreply.github.com>" -F <message file>
git log -1 --format='%an <%ae>%n%cn <%ce>%n%(trailers)'   # author, committer, the trailers
node scripts/check-secrets.mjs --stdin < <message file>
node scripts/check-copy-tells.mjs --stdin --kind commit < <message file>
```

The message file ends with these trailers, in this order:

```text
Co-Authored-By: <agent> <noreply@anthropic.com>
Claude-Session: <link>
Signed-off-by: Harmon Amakobe <73005556+harmon-amakobe@users.noreply.github.com>
```

Never pass `-s`: it signs off as the committer, which is the session rather than the
owner, and the DCO check compares the sign-off with the author. Never add a
`Signed-off-by:` for anyone but the owner, and only under that standing instruction. A
commit without one gets a follow-up remediation commit from the owner, never a
third-party sign-off (`.github/dco.yml`). Check the messages before the push:
`node scripts/check-copy-tells.mjs --commits <below>..HEAD` and
`node scripts/check-commits.mjs --base <below>`.

## Branch and publish

```bash
git switch -c starshot/<topic> <branch below>      # never from a stale worktree default
git push -u origin starshot/<topic>                # by name; never --all, --mirror, --prune
gh pr create --base <branch below> --title "<title>" --body-file <file outside the repo>
```

The body names each member spec's issue: `Part of #n` inside the stack, `Closes #n` only in the pull
request that reaches `main` (D23, the `track-work` skill).

## Restack after the branch below changed

```bash
git fetch origin
git switch <top of stack>
git rebase --update-refs origin/<bottom branch>    # git 2.38+; moves every branch in between
git push --force-with-lease origin <each moved branch>
```

Then verify each PR's diff is only its own change (`git diff --stat <below>...<branch>`).
Never rebase `main`; the guard refuses it.

## The pre-push sweep

```bash
git diff --name-only <below>...HEAD     # what you are about to publish
git ls-files -o --exclude-standard      # what you forgot, or must not add
```

Then the `public-hygiene` scan. Screenshots, scratch tests and reports belong in the
temp directory, not the tree.

## A diff that looks catastrophic

Hundreds of unexpected changes almost always mean a wrong comparison base or rewritten
line endings, not a disaster. Recheck against the remote (`git diff --stat
origin/<base>...HEAD`) and compare the changed-line count with the file length before
believing it.
