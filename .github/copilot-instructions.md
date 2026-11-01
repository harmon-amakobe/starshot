# Copilot instructions

The working agreement for this repository is `AGENTS.md` at the root. Read it first and
follow it; this file adds only what differs for GitHub Copilot.

<!-- On GitHub.com this file outranks AGENTS.md, so it must never restate a rule:
     a stale copy here would silently win. scripts/check-instruction-dedup.mjs enforces
     that. -->

## What is different for Copilot

- None of the local hooks described in `.claude/README.md` run in Copilot's
  environment. The CI workflow (`npm run gates`) is the only enforcement that reaches
  you, so run `npm ci && npm run gates` before declaring a task finished and quote the
  final summary line.
- The Copilot coding agent pushes to its own branch and opens a draft pull request by
  design. Keep it a draft, base it on the branch named in the issue or task (not
  `main` unless told so), and leave publishing decisions to the repository owner.
- When reviewing a pull request, use `.claude/rubrics/pr-review.md` as the rubric, and
  `.claude/rubrics/physics.md` when the diff touches `packages/` or the game's shot
  settings.
- If you can drive a browser, `scripts/verify-game.mjs` is the harness for the built
  game. If you cannot, write "not verified in a browser" rather than describing what
  the game would look like.
