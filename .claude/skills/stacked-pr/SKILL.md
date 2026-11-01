---
name: stacked-pr
description: Use when starting a branch that depends on an unmerged Starshot branch, choosing a PR base, pushing, restacking after the branch below changed, sweeping before a push, or when a diff shows a mass change nobody expected, or a task mentions stacking, rebasing, the stack base or opening a pull request.
---

# Stacked pull requests

## The base rule

One PR per session targets `main`. The first branch of a session bases on `main`;
every later branch bases on the branch below it, and its PR targets that branch. The
chain merges as one. Check before every PR:

```bash
git status --short && git branch --show-current && git log --oneline -5
gh pr list --state open --json number,headRefName,baseRefName \
  --jq '.[] | "\(.number) \(.headRefName) -> \(.baseRefName)"'
```

Only the orchestrator pushes and opens PRs; builders never do.

## Branch and publish

```bash
git switch -c starshot/<topic> <branch below>      # never from a stale worktree default
git push -u origin starshot/<topic>                # by name; never --all, --mirror, --prune
gh pr create --base <branch below> --title "<title>" --body-file <file outside the repo>
```

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
