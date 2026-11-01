# python/astlo/bench

Starshot's own scripts (MIT, Python standard library plus astlo) that measure astlo
against NASA/JPL Horizons. They contain no astlo code. The steps to run them, and the
results, are in [`../VERIFICATION.md`](../VERIFICATION.md#reproduce).

| Script | Runs with | What it does |
|---|---|---|
| `bench_run.py` | the Python of a virtualenv with one astlo build | Freezes astlo's clock, asks it for 16 bodies at five dates, the Moon, RK4, sky positions and error handling; writes JSON |
| `bench_compare.py` | any Python 3 | Fetches the same instants from Horizons and prints before/after tables |
| `moon_series.py` | astlo virtualenv | The Moon's direction error every 3 days for a month |
| `topo_days.py` | astlo virtualenv | Sky positions 10 days ahead (checks the date used for Earth's rotation) |
| `compute_elements.py` | any Python 3 | Derives the element values used by the `data` fix, from JPL Table 1 and Horizons |
| `fetch_fixtures.py` | any Python 3 | Writes `../tests/fixtures/horizons.json` for the offline test (never hand-edit it) |
| `hz.py` | (imported) | A small Horizons client with an on-disk cache (`$HZ_CACHE`, default `./hz_cache`) |

Run them from an empty scratch directory outside the repository: they write their
outputs and the Horizons cache into the current directory (and some astlo functions
write PNG charts there). The first look at the published build, on 31 October 2026,
used the older scripts in [`tools/astlo-bench/`](../../../tools/astlo-bench/README.md),
kept as the record behind [`docs/astlo-evaluation.md`](../../../docs/astlo-evaluation.md).
