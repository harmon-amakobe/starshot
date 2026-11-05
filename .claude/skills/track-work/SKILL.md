---
name: track-work
description: Use when a plan's work.yaml or work.lock.json changes, issues, epics, sub-issues, labels, milestones or the project board need creating or updating, a pull request needs its issue line (Part of or Closes), an issue is claimed or finished, or a task mentions sync-work, agent-ready, status comments or tracking (D23).
---

# Tracking work on GitHub (D23)

Issues are code. Each program lists its epics and tasks in
`docs/plans/<program>/work.yaml`; a numbered name such as `03-work.yaml` also works.
`scripts/sync-work.mjs` makes GitHub match it: labels from `.github/labels.yml`, the
milestone, one issue per epic and task, and each task as a sub-issue of its epic. The
issue numbers it creates go into `work.lock.json` beside the plan.

Only the orchestrator runs the sync, from a session with the owner's token. A builder
never runs it, and CI never runs it with a personal token.

## Run the sync

```bash
node scripts/sync-work.mjs --program <name> --check     # offline: plan and lock agree
node scripts/sync-work.mjs --program <name>             # dry run: what would change
node scripts/sync-work.mjs --program <name> --apply     # create and update, write the lock
node scripts/sync-work.mjs --program <name> --only <slug>
node scripts/sync-work.mjs --self-test                  # offline, on scripts/fixtures/work
```

- The token comes from `GITHUB_TOKEN` or `GH_TOKEN`. Without one the dry run is offline,
  planned from the lock alone. The repository comes from `--repo` or the origin remote.
- Titles and bodies pass the copy checker first; a failure stops the run before any
  request.
- It never closes or deletes. An issue closes only when work.yaml says `state: closed`
  with `reason: completed` or `reason: not_planned`.
- Commit `work.lock.json` with the plan change in the same pull request. If the lock is
  lost, the next run rebuilds it from the `<!-- starshot-work: slug -->` marker in each
  body instead of creating duplicates.
- The project board steps run only when the token can read the project named by
  `project:` in work.yaml; otherwise the output says what they would set. Turning on
  Issues, creating the board and installing the DCO app are owner steps.

## Ids and fields

Ids are lowercase slugs. They stay stable and are never reused. Each task has `title`, `labels`,
`size` (XS to XL), `priority` (p0 to p3), `actor` (Human, Agent or Either), `spec` (a
plan anchor), `depends_on` (ids) and a short `body`. Every label must exist in
`.github/labels.yml`. A `priority` adds its `priority:` label when the list lacks it.

## Conventions

- **Name the issue in every pull request.** Inside a stack, write `Part of #n`; a PR
  group names each member's issue (`Part of #a, #b`, D30). Write
  `Closes #n` only in the pull request whose merge reaches `main`: GitHub closes issues
  only on merges into the default branch, so a `Closes` lower in the stack does nothing
  until the stack lands.
- **Agents take only `agent-ready` issues.** The label means acceptance criteria are
  written, the files are named and no owner decision is pending. An issue without it
  goes back to the owner, not to a builder.
- **Outside contributors claim by comment.** A triager assigns them and sets
  `status:claimed`.
- **Epics** are parent issues labelled `kind:epic`; their progress comes from their
  sub-issues. Issue types are an organization feature and are not used here.

## Status comments

Post one when work starts and one when it ends, on the issue, through the MCP issue
tools or `gh issue comment`. They follow the copy standard; check a draft with
`node scripts/check-copy-tells.mjs --stdin --kind comment < draft.md`.

These two lines are the templates (D23, the plan's PR4 spec), the first at the claim
and the second at completion. `CONTRIBUTING.md` points here rather than repeating them.

```text
Claimed. Branch codex/v1-prNN-<topic>. Spec: docs/plans/v1-starshot/00-plan.md#<anchor>.
Done in #<pr>. Gates: <n>/<n> passed, exit 0. Evidence: <one line per proof command>.
```

## When the plan changes

Edit work.yaml, run `--check` and the dry run, then `--apply` from the orchestrator's
publish step, and commit the lock with the plan. Renaming a label in `.github/labels.yml`
uses `from: <old name>`, so issues keep it.
