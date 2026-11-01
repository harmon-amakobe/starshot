# astlo v12, with Starshot's fixes

This folder holds **astlo**, the orbital-mechanics engine that Mark Macharia
([@iamnothimbutwe](https://github.com/iamnothimbutwe)) built, impressively, on a phone,
together with a set of fixes that Starshot made while
[evaluating it](../../docs/astlo-evaluation.md) against NASA/JPL.

- `astlo/` and `astlo-12.5.5130000.dist-info/` are **Mark's code and metadata**: the
  files of his v12.5.5130000 wheel, imported byte for byte (all but RECORD, which the
  build writes afresh), then changed only by the fix commits listed below. His copyright notices stay exactly as he wrote them.
- Everything else here (this README, [`VERIFICATION.md`](VERIFICATION.md),
  [`build_wheel.py`](build_wheel.py), [`bench/`](bench/) and [`tests/`](tests/)) is
  Starshot's own work under the [Apache-2.0 licence](../../LICENSE).

## Licence and status

**astlo is copyright (c) Mark Macharia, all rights reserved.** It is **not** covered by
Starshot's Apache-2.0 licence, and nothing in this repository grants any rights over it.

The fixes are made here first, in the open, so that each one can be read and checked on
its own. This is the owner's decision
([D10](../../docs/decisions.md#d10-astlo-fixes-are-made-here-first-in-pythonastlo-shared-pending-marks-permission)): finish
Starshot, then show Mark the fixes and this package, and ask for his written permission,
which the owner expects him to give. Until then, the folder is shared in good faith,
with full credit to Mark, and the fixes have **not** yet been sent to him. If Mark
objects, `python/astlo/` is removed from Starshot.

What does not change:

- [`third_party/astlo/`](../../third_party/astlo/) stays the pristine upstream
  reference, exactly as Mark published it and pinned by hash (D1, D2).
- Starshot's game and TypeScript packages never copy astlo code and do not depend on
  astlo; their planet positions come from NASA/JPL data through Starshot's own code (D4).

## The fixes, one commit each

Read them with `git log -p -- python/astlo` (or the folder's
[history on GitHub](https://github.com/harmon-amakobe/starshot/commits/main/python/astlo)).
The first commit is Mark's source as published; each later commit fixes one topic,
says why in its message, and records what it measured against JPL.

| Commit subject (topic first) | What it fixes |
|---|---|
| `python/astlo: import astlo v12.5.5130000 source as published` | Not a fix: Mark's v12 wheel contents, unmodified, as the base |
| `data: consistent J2000 elements for all 16 bodies` | Earth was 24° off (Venus 33°, Ceres 87°): 2026 angles were paired with J2000 mean anomalies. Now JPL Table 1 for the planets, Horizons elements for the small bodies |
| `moon: radians for the node/perigee angles and a*(cos E - e)` | The Moon was 116° off: degrees were passed to `cos`/`sin`, and `a*cos(E-e)` was used for `a*(cos E - e)` |
| `moon: let the node, perigee and mean anomaly move` | The Moon's node and perigee now move at their real rates (3.6° to 1.7°) |
| `rk4: step in seconds, keep the Sun's X, use v_Z for velk4Z` | The "1 hour" step was 0.04 s, the Sun's X was overwritten by a velocity, and one term used the wrong axis |
| `barycentric: SSB velocity = heliocentric velocity + Sun's SSB velocity` | Velocities about the solar-system barycentre, plus a `+`/`*` typo in the Sun's offset |
| `topocentric: rotate ecliptic -> equatorial, and GMST at the requested time` | Sky positions were 1° to 26° off: a frame rotation was missing, and Earth's rotation angle always used "now" |
| `topocentric: precess J2000 -> equinox of date before GMST` | The last 0.35° in the sky positions (now 0.005° to 0.055° from JPL) |
| `errors: raise ValueError instead of sys.exit() in library methods` | An unknown name no longer ends the caller's whole program |
| `packaging: Requires-Python >=3.12, quiet import, Agg when there is no display` | Honest Python requirement, a silent `import astlo`, and no forced desktop plotting backend |
| `rk4steps: a looped RK4 N-body integrator built on custacce()` | New: steps Mark's own force model through time (Earth within 178 km of JPL after a year) |

[`VERIFICATION.md`](VERIFICATION.md) has the before/after tables for every topic, the
method, what is still imperfect, and the choices a reviewer should look at.

## Build the wheel

Python 3 (standard library only; tested with 3.11 to 3.13), from the repository root:

```bash
python3 python/astlo/build_wheel.py                      # writes python/astlo/dist/ (git-ignored)
python3 python/astlo/build_wheel.py --outdir <folder>    # anywhere else
```

The result is `astlo-12.5.5130000+starshot.1-py3-none-any.whl`: Mark's metadata with
two marks of a patched build, and a fresh RECORD.

- The version is his 12.5.5130000 with the PEP 440 *local label* `+starshot.1`. A local
  label marks a downstream build that differs from the release it names, and PyPI
  refuses to host one, so this wheel cannot be uploaded there as astlo. The script
  rejects any `--version` without a `+starshot.N` label.
- Its description (what `pip show -v` and package indexes display) starts with one
  added line: "**Starshot-patched build, not an official astlo release:** Mark
  Macharia's astlo with Starshot's fixes (python/astlo in the Starshot repository); Mark
  keeps all rights to his code." The rest of his description follows unchanged. The
  dist-info files in this folder are not edited; the build adds both marks.

The build is reproducible: the same source gives a byte-identical wheel (fixed
timestamps; set `SOURCE_DATE_EPOCH` to choose another).

CI builds the same wheel on every change to this folder, prints its sha256 in the log,
and keeps it as the workflow artifact **`astlo-fixed-wheel`**
([`.github/workflows/astlo.yml`](../../.github/workflows/astlo.yml)). The artifact is
uploaded before anything is installed from PyPI for the test, so no third-party code
has run on the machine when it is stored.

## Install and try it

astlo needs Python 3.12 or newer. Install it into its own virtualenv, never into the
Python your system uses; pip fetches its dependencies (numpy, matplotlib, sgp4,
requests, rich, click, plotext) from PyPI.

```bash
python3 -m venv <scratch>/astlo-venv
<scratch>/astlo-venv/bin/pip install "python/astlo/dist/astlo-12.5.5130000+starshot.1-py3-none-any.whl"
<scratch>/astlo-venv/bin/python -c "from astlo import Contin; print(Contin().barycentric('MARS')['X_helio'])"
```

## Run the verification

The offline test compares the installed build with NASA/JPL Horizons data committed in
[`tests/fixtures/horizons.json`](tests/fixtures/horizons.json). It needs no network and
takes about 10 seconds:

```bash
<scratch>/astlo-venv/bin/python -I -m unittest discover -s python/astlo/tests -v
```

It freezes the clock astlo reads at 2026-10-31 21:00 UTC and checks: the directions of
all 16 bodies at four dates from 1986 to 2029, the Moon over a month, sky positions
from Nairobi, one RK4 step, that an unknown body raises `ValueError` (not
`SystemExit`), that `import astlo` prints nothing, and the metadata. To test the source
tree without installing, set `ASTLO_SRC=python/astlo` (the dependencies are still
needed). Against Mark's published wheel the same test fails on every check, which is
what makes it a test.

The full before/after comparison, which asks Horizons directly, is in
[`VERIFICATION.md`](VERIFICATION.md#reproduce). The scripts are in [`bench/`](bench/).

## When Mark publishes a new version

Mirror it into `third_party/astlo/` first, then move these fixes onto it, one commit at
a time, dropping any he has made himself. The steps are in the
[astlo-upstream skill](../../.claude/skills/astlo-upstream/SKILL.md#rebase-the-fixes-onto-a-new-mark-release).

## Credits

All of astlo's design and code is Mark Macharia's. Starshot exists because his work
made the idea concrete; the fixes here are offered in that spirit.
