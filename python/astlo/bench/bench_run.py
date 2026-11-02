#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Run one astlo build through its public API with the wall clock frozen; write JSON.

Starshot's own code (Apache-2.0); it contains no astlo code. Run it with the Python of a
virtualenv where one astlo build is installed (the published wheel, or the fixed one),
from an empty scratch directory, so the before and after builds are evaluated at
exactly the same instants:

    OUTF=before.json <venv-published>/bin/python -I <repo>/python/astlo/bench/bench_run.py
    RK4_SEED=rk4_seed.json OUTF=after.json <venv-fixed>/bin/python -I <repo>/python/astlo/bench/bench_run.py

Environment variables:
    FREEZE_UNIX  the frozen "now" (default 1793480400 = 2026-10-31T21:00:00Z)
    OUTF         output file (default bench_out.json in the current directory)
    RK4_SEED     JSON written by bench_compare.py; runs the looped rk4steps() from it
    ASTLO_SRC    test an unpacked source tree (a folder holding astlo/) instead
    OVERRIDES    experiment only: a JSON {attribute: value} applied to Contin in memory
"""
import contextlib
import datetime as _dt
import io
import json
import os
import sys
import time

FREEZE = float(os.environ.get("FREEZE_UNIX", "1793480400"))
# now, J2000, 1986-02-09, 2029-04-13 21:46, 2126-10-31 (astlo takes "days from now")
OFFSETS = [None, -9800.375, -14874.875, 895.0319444444444, 36524.0]
_perf = time.perf_counter
time.time = lambda: FREEZE  # astlo reads time.time() for "now"
time.sleep = lambda s: None  # some astlo paths sleep between objects


class _FrozenDT(_dt.datetime):
    @classmethod
    def now(cls, tz=None):
        return _dt.datetime.fromtimestamp(time.time(), tz)


if os.environ.get("ASTLO_SRC"):
    sys.path.insert(0, os.path.abspath(os.environ["ASTLO_SRC"]))
OUT = {"freeze_unix": FREEZE, "offsets": OFFSETS}
t0 = _perf()
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    import astlo
    import matplotlib
OUT["import_s"] = _perf() - t0
OUT["import_printed"] = buf.getvalue()
OUT["mpl_backend"] = matplotlib.get_backend()
OUT["version"] = astlo.__version__
import astlo.topocentric as _tp  # noqa: E402

_tp.datetime = _FrozenDT  # belt and braces: topo() derives its date from time.time()
from astlo import Contin, Topocentric  # noqa: E402

c = Contin()
if os.environ.get("OVERRIDES"):
    with open(os.environ["OVERRIDES"], encoding="utf-8") as fh:
        for k, v in json.load(fh).items():
            setattr(c, k, v)
BODIES = ["MERCURY", "VENUS", "EARTH", "MARS", "CERES", "VESTA", "PALLAS", "HYGIEA", "JUPITER", "SATURN",
          "URANUS", "NEPTUNE", "PLUTO", "HAUMEA", "MAKEMAKE", "ERIS"]


def quiet(fn, *a, **k):
    b = io.StringIO()
    t = _perf()
    with contextlib.redirect_stdout(b):
        try:
            r, err = fn(*a, **k), None
        except BaseException as e:  # SystemExit included on purpose: the published build calls sys.exit
            r, err = None, f"{type(e).__name__}: {e}"
    return r, _perf() - t, len(b.getvalue()), err


KEYS = ("X_bary", "Y_bary", "Z_bary", "X_helio", "Y_helio", "Z_helio", "v_X", "v_Y", "v_Z",
        "v_Xhelio", "v_Yhelio", "v_Zhelio", "sun_vX", "sun_vY", "sun_vZ", "sun_baryc_X", "sun_baryc_Y", "sun_baryc_Z")
res = {}
for off in OFFSETS:
    key = "now" if off is None else repr(off)
    res[key] = {}
    for b in BODIES:
        r, dt, npr, err = quiet(c.barycentric, b, off) if off is not None else quiet(c.barycentric, b)
        e = {"secs": dt, "printed_chars": npr, "err": err}
        if isinstance(r, dict):
            e.update({k: r[k] for k in KEYS if k in r})
        res[key][b] = e
OUT["barycentric"] = res

for b in ["APOPHIS", "HALLEY"]:  # names the public build does not know
    r, dt, npr, err = quiet(c.barycentric, b)
    OUT.setdefault("unknown", {})[b] = {"err": err, "ret": None if r is None else str(r)[:120], "printed_chars": npr}
r, dt, npr, err = quiet(c.orbits, "APOPHIS")
OUT["unknown"]["orbits(APOPHIS)"] = {"err": err, "printed_chars": npr}

r, dt, npr, err = quiet(c.lunars, "EARTH")  # Moon, geocentric, metres
OUT["moon"] = {"err": err, "secs": dt}
if isinstance(r, dict):
    OUT["moon"].update({k: r[k] for k in ("X", "Y", "Z", "v_X", "v_Y", "v_Z", "r_magnitude", "v_magnitude")})

for label, kw in [("rk4_now", {}), ("rk4_days365", {"days": 365})]:  # rungekutta(): one step
    r, dt, npr, err = quiet(c.rungekutta, **kw)
    OUT[label] = {"secs": dt, "err": err}
    if isinstance(r, dict):
        OUT[label].update({"delta_t": r.get("delta_t"), "pos": r["new_pos_vectors"], "vel": r["new_vel_vectors"]})
OUT["analytic_now"] = {b: [res["now"][b].get("X_bary"), res["now"][b].get("Y_bary"), res["now"][b].get("Z_bary")] for b in BODIES}
sb, _, _, _ = quiet(c.baryc_sun)
OUT["analytic_sun_now"] = [sb["X_s"], sb["Y_s"], sb["Z_s"], sb["v_X"], sb["v_Y"], sb["v_Z"]]

tp = Topocentric()  # sky positions from Nairobi
OUT["topo"] = {}
for b in ["SUN", "VENUS", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE"]:
    r, dt, npr, err = quiet(tp.topo, b, -1.2921, 36.8219, 1795.0)
    OUT["topo"][b] = {"err": err, "secs": dt}
    if isinstance(r, dict):
        OUT["topo"][b].update({"el": float(r["elevation_deg"]), "az": float(r["azimuth_deg"]), "jd": r.get("Julian_Date_full")})

if hasattr(c, "rk4steps") and os.environ.get("RK4_SEED"):  # the looped integrator (fixed build only)
    with open(os.environ["RK4_SEED"], encoding="utf-8") as fh:
        seed = json.load(fh)
    r, dt, npr, err = quiet(c.rk4steps, seed["r"], seed["v"], seed.get("tt", 0.5), seed["days"])
    OUT["rk4steps"] = {"secs": dt, "err": err}
    if isinstance(r, dict):
        OUT["rk4steps"].update({"pos": r["new_pos_vectors"], "vel": r["new_vel_vectors"], "steps": r.get("steps"), "delta_t": r.get("delta_t")})
if hasattr(c, "rk4steps"):
    r, dt, npr, err = quiet(c.rk4steps, None, None, 1, 365)
    OUT["rk4steps_from_kepler"] = {"secs": dt, "err": err}
    if isinstance(r, dict):
        OUT["rk4steps_from_kepler"].update({"pos": r["new_pos_vectors"], "steps": r.get("steps")})

with open(os.environ.get("OUTF", "bench_out.json"), "w", encoding="utf-8") as fh:
    json.dump(OUT, fh, indent=1, default=str)
print("done", round(_perf() - t0, 2), "s")
