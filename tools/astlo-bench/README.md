# astlo-bench: comparing astlo with NASA/JPL

These are the scripts and results behind [docs/astlo-evaluation.md](../../docs/astlo-evaluation.md),
which compared Mark Macharia's astlo engine (public build 12.5.5130000) with NASA/JPL
Horizons on 31 October 2026. They are kept as the record of that evaluation.

> **For new work, use [`python/astlo/bench/`](../../python/astlo/bench/).** It
> supersedes these scripts: it freezes astlo's clock so the published and the fixed
> builds are compared at the same instants, caches every Horizons answer, and also
> covers velocities, the Moon over a month, RK4 and sky positions. Its results and
> steps are in [`python/astlo/VERIFICATION.md`](../../python/astlo/VERIFICATION.md).
> Both benches are Starshot's own code; neither contains astlo code.

- **The scripts are Starshot's own code (MIT).** They call astlo's *public* API and the
  public JPL Horizons API.
- **astlo itself is not included here** and is never copied into Starshot's own code
  (decision D2). Its published wheel sits, unmodified, in `third_party/astlo/dist/`; you
  install it yourself, into a throwaway environment, to run these scripts. (Mark's
  source with Starshot's fixes is in `python/astlo/`, under his terms; decision D10.)
- Only the comparison tables are committed. Raw astlo output (the position dumps) is
  not, because astlo's licence reserves rights over distributing it.

## What is here

| File | What it does |
|---|---|
| `scripts/run_positions.py` | Asks astlo for all 16 bodies now and at chosen day offsets, plus RK4, orbit-path and sky calls; records values and timings to JSON |
| `scripts/compare.py` | Downloads the same bodies at the same instants from JPL Horizons and prints the errors (standard-library Python; does not import astlo) |
| `scripts/run_rk4_and_sky.py` | Checks whether `rungekutta()` really steps through time, and records astlo's sky positions for Nairobi |
| `scripts/run_moon.py` | Records astlo's Moon output |
| `results/compare_shipped.txt` | astlo as published, at five dates (2026, 2000, 1986, 2029, 2126) |
| `results/compare_patched.txt` | The same, with the commented J2000 orbit angles restored in memory (`PATCH=1`) |

Columns in the results: `err_km` and `err_AU` are the position error; `helio_arcmin` is
the direction error seen from the Sun; `geo_arcmin(sky)` is the direction error seen
from Earth (what you would notice in the sky). 60 arcminutes = 1 degree.

## Run it yourself

You need Python 3.12 or newer (astlo uses Python 3.12 syntax) and internet access
(pip downloads astlo's dependencies; `compare.py` calls `ssd.jpl.nasa.gov`).

**Keep astlo isolated.** It is someone else's code: install it into a throwaway
virtualenv **outside this repository**, run it from an **empty scratch directory** (it
writes PNG files into the current directory), use `python -I` (so nothing in the
current directory is imported by accident), and set `MPLBACKEND=Agg` (so no windows
open). Below, `<scratch>` is any empty folder of your choice and `<repo>` is your clone
of Starshot.

```bash
# 1. A throwaway environment with the wheel from this repository
python3 -m venv <scratch>/astlo-venv
<scratch>/astlo-venv/bin/pip install <repo>/third_party/astlo/dist/astlo-12.5.5130000-py3-none-any.whl

# 2. An empty working directory
mkdir <scratch>/work && cd <scratch>/work
BENCH=<repo>/tools/astlo-bench/scripts
PY=<scratch>/astlo-venv/bin/python

# 3. Day offsets from now to J2000, 1986-02-09, 2029-04-13 and 2126-10-31
OFFSETS=$(python3 -I -c "import time, datetime as d; n = time.time(); print(*[round((d.datetime(*t, tzinfo=d.timezone.utc).timestamp() - n) / 86400, 4) for t in [(2000,1,1,12), (1986,2,9), (2029,4,13), (2126,10,31)]])")

# 4. astlo as published, then compared with JPL
MPLBACKEND=Agg $PY -I $BENCH/run_positions.py $OFFSETS
python3 -I $BENCH/compare.py out_run1.json > compare_shipped.txt

# 5. The same with the J2000 angles restored in memory (no file is changed)
PATCH=1 OUTF=out_patched.json MPLBACKEND=Agg $PY -I $BENCH/run_positions.py $OFFSETS
python3 -I $BENCH/compare.py out_patched.json horizons_ref_patched.json > compare_patched.txt

# 6. RK4 behaviour and sky positions; the Moon
MPLBACKEND=Agg $PY -I $BENCH/run_rk4_and_sky.py > /dev/null      # writes out_run2.json
MPLBACKEND=Agg $PY -I $BENCH/run_moon.py > moon.json
```

On Windows, use `<scratch>\astlo-venv\Scripts\python.exe` and set the environment
variables with `set` (Command Prompt) or `$env:` (PowerShell); or use WSL.

When you are done, delete `<scratch>`. Do not copy its contents into this repository.

### Expected results

`compare.py` should reproduce the committed tables. The epoch labels differ slightly
(the committed files name J2000 explicitly; the script labels each row by date), and a
run on a different day gives slightly different "now" rows, because astlo always works
relative to the current time. On 31 October 2026, `compare.py` run on the original
astlo output reproduced every number in `results/compare_shipped.txt` exactly.

## How this relates to Starshot's data gate

This bench was the first look at astlo, at astlo's own choice of dates. If Mark grants a
licence that allows Starshot to use astlo's data, the formal check (decision D4) runs at
the same dates as Starshot's own Horizons tests and against the same per-planet
budgets. That method is in `.claude/skills/astlo-upstream/reference.md`, and the data
contract is in [docs/architecture.md](../../docs/architecture.md#future-the-astlo-data-gate).

The stored results were produced with Python 3.13, astlo 12.5.5130000 and JPL Horizons API
1.2 (DE441), on 2026-10-31.
