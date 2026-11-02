---
name: astlo-upstream
description: Use when Mark Macharia's astlo upstream has new commits to mirror into third_party/astlo, when the fixes in python/astlo need rebasing onto a new Mark release, when adding or changing a fix in python/astlo, when a new astlo wheel needs benchmarking against NASA/JPL before any of its data is used, or when the third-party gate fails and someone wants to change third_party, the upstream remote, or the astlo.sha256 manifest.
---

# Working with Mark's astlo

astlo is Mark Macharia's code, "All rights reserved". It lives in two places here, with
two different rules:

| Folder | What it is | Rule |
|---|---|---|
| `third_party/astlo` | Mark's repository files, mirrored byte for byte (D1) | Never edited (D2). Pinned by `third_party/astlo.sha256`; a hook denies edits; only the sync below changes it |
| `python/astlo` | Mark's v12 wheel source, imported unmodified, then Starshot's fixes, one commit per topic (D10) | Fix commits only. His code keeps his headers and his rights: not Apache-2.0, shared in good faith pending his written permission. Removed if he objects |

Both rules share three limits: astlo code is never copied into `packages/` or `apps/`,
nothing there imports or depends on astlo, and astlo data is used only after the D4
direction gate and a licence from Mark that allows it. Starshot's own files beside
`python/astlo/astlo` (README, `VERIFICATION.md`, `build_wheel.py`, `bench/`, `tests/`)
are Apache-2.0 (D12); its Python scripts carry an SPDX header, and new ones say
`Apache-2.0`. Older headers that still say MIT are listed by the `licence` gate as
warnings until they are updated.

## Sync upstream (mirror, never edit)

Starshot is a standalone GitHub repository (D36). The `upstream` Git remote remains
the source for the selective sync below. Import reviewed changes through a PR;
do not merge the entire upstream tree to synchronize GitHub's commit counts.

```bash
git remote get-url upstream 2>/dev/null || git remote add upstream https://github.com/iamnothimbutwe/astlopublic.git
git fetch upstream
git log --oneline HEAD..upstream/main          # what is new upstream
git diff --stat <last-synced-sha> upstream/main  # first sync: git merge-base HEAD upstream/main
```

Mirror each changed upstream file into `third_party/astlo/` exactly as published, from
the upstream ref and never from an editor:

```bash
git show upstream/main:README.md > third_party/astlo/README.md     # per changed path
git rm -q third_party/astlo/<path removed upstream>                 # per deletion
for f in $(git ls-tree -r --name-only upstream/main); do
  [ "$(git rev-parse "upstream/main:$f")" = "$(git hash-object "third_party/astlo/$f")" ] || echo "differs: $f"
done                                           # must print nothing
node scripts/check-third-party-untouched.mjs --write
node scripts/check-third-party-untouched.mjs   # green
```

Binary files go through `git show` unchanged. The sync is its own PR, containing only
`third_party/astlo/**` and the manifest, and names the upstream sha in its description.

## Add or change a fix in python/astlo

- One topic per commit. The subject starts with the topic (`data:`, `moon:`, `rk4:`,
  ...); the body says why, and what was measured against JPL before and after.
- Change only what the fix needs. Keep Mark's headers, layout and comments (a replaced
  value keeps the old one as a trailing comment, as the `data` commit does). Never
  reformat his files.
- Prove it: `python3 python/astlo/build_wheel.py`, install the wheel into a scratch
  virtualenv, run `python -I -m unittest discover -s python/astlo/tests -v`, and re-run
  the bench in `python/astlo/VERIFICATION.md` (section "Reproduce") for the numbers.
  Add a test when the fix can be checked offline.
- Update the fix table in `python/astlo/README.md`, the tables in
  `python/astlo/VERIFICATION.md`, and `CHANGELOG.md` under `## [Unreleased]`.
- `node scripts/check-secrets.mjs` skips only the email rule in Mark's files; every
  other rule applies to them.

## Rebase the fixes onto a new Mark release

When Mark publishes a new wheel, start from his code, not ours:

1. Sync it into `third_party/astlo/` first (section above), in its own PR.
2. On the next stacked branch, replace the imported source with the new wheel's, as one
   commit, without RECORD (the build writes a fresh one):

   ```bash
   python3 -I -m zipfile -e third_party/astlo/dist/<new>.whl <scratch>/new
   git rm -r -q python/astlo/astlo python/astlo/astlo-*.dist-info
   cp -R <scratch>/new/astlo <scratch>/new/astlo-<ver>.dist-info python/astlo/
   rm python/astlo/astlo-<ver>.dist-info/RECORD
   git add python/astlo && git commit -m "python/astlo: import astlo <ver> source as published"
   ```

3. Replay the fixes, oldest first, one cherry-pick per topic:

   ```bash
   git log --reverse --format='%h %s' <old import commit>..<last fix> -- python/astlo/astlo python/astlo/astlo-*.dist-info
   git cherry-pick <sha>          # per fix; on a conflict, redo the fix by hand against the new code
   ```

   Drop a fix Mark has made himself, and say so in the PR. Re-measure every replayed
   fix: a change in his data or code can move the numbers.
4. `build_wheel.py` takes the version from his METADATA and adds the local label
   `+starshot.1` (and a one-line "Starshot-patched build" note to the description), so
   no version is edited by hand and no build can pass for his release. Re-run the test
   (the Horizons fixtures do not change) and the bench, then update
   `python/astlo/VERIFICATION.md` and the README's fix table.

## Benchmark a new wheel before using any astlo data (D4)

astlo data is admitted only after a direction-error gate against JPL. The method is in
[reference.md](reference.md): install the wheel into a throwaway virtualenv outside the
repository, compute heliocentric ecliptic J2000 positions at the Horizons fixture
epochs, and compare directions with the fixtures, per planet, against the Table 1
budgets. Results go in a decision entry. No astlo output is committed as data for
Starshot until Mark grants a licence that allows it.

## Sharing the fixes with Mark

The owner holds this channel (D10): once Starshot is finished, the owner shows Mark
`python/astlo`, its `VERIFICATION.md` and the `astlo-fixed-wheel` CI artifact, and asks
for his written permission. Until the owner says it happened, nothing has been sent:
never claim otherwise. Agents never contact Mark, never open issues or pull requests on
his repository, and never commit a draft message to him. If the owner asks for a patch
series, write it outside the repository:

```bash
git format-patch <import commit>..HEAD -o <scratch dir> -- python/astlo/astlo python/astlo/astlo-*.dist-info
```

## If Mark objects

Remove `python/astlo/`, `.github/workflows/astlo.yml` and the D10 email exemption in
`scripts/check-secrets.mjs` in one PR, and update the docs that mention them
(`git grep -n python/astlo`). Removing files does not remove them from history or from
existing copies. The owner decides anything beyond the removal.
`third_party/astlo/` stays.
