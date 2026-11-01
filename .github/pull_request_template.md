## Summary

<!-- What changed and why, in two or three sentences. Code claims carry file:line. -->

## Stack

- Base branch: <!-- main only for the first PR of a session; otherwise the branch below -->
- Spec: <!-- docs/plans/<program>/...#anchor, or "none (small change)" -->

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

## Public-repo hygiene

- [ ] `node scripts/check-secrets.mjs` is clean, and this description and the commit messages were piped through `--stdin`
- [ ] No personal emails, personal absolute paths, private project names or Firebase/GCP ids
- [ ] No change under `third_party/` (or this is an upstream sync per the astlo-upstream skill)
- [ ] Screenshots are headless captures with nothing personal in frame
