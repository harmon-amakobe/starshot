## Summary

<!-- What changed and why, in two or three sentences. Code claims carry file:line. -->

## Issue

<!-- "Part of #n" inside a stack, one per member spec of a PR group (D30); "Closes #n" only where the work reaches main (D23). -->

Part of #

## Stack

- Base branch: <!-- main only for the bottom of the stack; otherwise the branch below (in a PR group program, the previous group's branch, D30) -->
- Specs: <!-- docs/plans/<program>/...#anchor for each member spec, or "none (small change)" -->

## Decisions cited

<!-- D# from docs/decisions.md that this change relies on, and any deviation logged. -->

## Gates

<!-- Paste the final table and the "gates: n/n passed" line from npm run gates. -->

```
```

## Evidence

- [ ] Physics: tests against Horizons fixtures, energy or known-solution tests (if `packages/` or shot settings changed)
- [ ] Game: phone and desktop screenshots, console clean (`node scripts/verify-game.mjs`) (if anything a player sees changed)
- [ ] `CHANGELOG.md` `[Unreleased]` entry (if a player or package user would notice)

## Authorship

- [ ] Every commit carries a `Signed-off-by:` line from its author (`git commit -s`, DCO)
- [ ] AI assistance: none, or the tool is named here: <!-- for example "Claude Code wrote the first draft; I reviewed every line" -->
- [ ] This description and the commit messages pass the copy gate (`node scripts/check-copy-tells.mjs --stdin --kind pr` and `--commits <base>..HEAD`)

## Public-repo hygiene

- [ ] `node scripts/check-secrets.mjs` is clean, and this description and the commit messages were piped through `--stdin`
- [ ] No personal emails, personal absolute paths, private project names or Firebase/GCP ids
- [ ] No change under `third_party/` (or this is an upstream sync per the astlo-upstream skill)
- [ ] Screenshots are headless captures with nothing personal in frame
