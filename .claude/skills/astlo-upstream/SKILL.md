---
name: astlo-upstream
description: Use when Mark Macharia's astlo upstream has new commits to mirror into third_party/astlo, when a new astlo wheel needs benchmarking against NASA/JPL before any of its data is used, when proposing a fix to astlo, or when the third-party gate fails and someone wants to change third_party, the upstream remote, or the astlo.sha256 manifest.
---

# Working with Mark's astlo upstream

astlo is Mark Macharia's code, "All rights reserved" (D2). In this repository it is
mirrored byte for byte under `third_party/astlo`, pinned by `third_party/astlo.sha256`,
and never modified, copied into our packages, or relicensed. The edit tools are denied
there by a hook; this skill is the only sanctioned path that changes those files.

## Sync upstream (mirror, never edit)

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

## Benchmark a new wheel before using any astlo data (D4)

astlo data is admitted only after a direction-error gate against JPL. The method is in
[reference.md](reference.md): install the wheel into a throwaway virtualenv outside the
repository, compute heliocentric ecliptic J2000 positions at the Horizons fixture
epochs, and compare directions with the fixtures, per planet, against the Table 1
budgets. Results go in a decision entry; no astlo code or output is committed until
Mark grants a licence that allows it.

## Propose a fix to Mark

Fixes travel privately as a patch until he grants a licence:

```bash
git clone https://github.com/iamnothimbutwe/astlopublic.git <scratch dir outside this repo>
# make the fix there, commit it, then:
git format-patch -1 --stdout > <scratch dir>/astlo-fix.patch
```

Send the patch to Mark directly (the owner's channel), with the evidence: the input,
the expected value from Horizons, and astlo's output. Never open a public PR or issue
containing modified astlo code, and never commit the patch here.
