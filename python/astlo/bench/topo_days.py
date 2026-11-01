#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Sky position 10 days ahead (Topocentric.topo with days=10), astlo vs Horizons.

Checks that Earth's rotation angle (GMST) and the positions are taken at the requested
date, not at "now". Starshot's own code (MIT); it contains no astlo code. Run it with
the Python of a virtualenv where one astlo build is installed, from a scratch directory:

    <venv>/bin/python -I <repo>/python/astlo/bench/topo_days.py

The Horizons reference is fetched (and cached, see hz.py) before the clock is frozen.
ASTLO_SRC=<folder holding astlo/> tests a source tree instead of the installed build.
"""
import contextlib
import datetime as _dt
import io
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I leaves the script dir off sys.path
import hz  # noqa: E402

FREEZE = 1793480400.0  # 2026-10-31T21:00:00Z
DAYS = 10
LAT, LON, ALT_M = -1.2921, 36.8219, 1795.0  # Nairobi
BODIES = {"SUN": "10", "MARS": "499"}
ref = {b: hz.observer_azel(cmd, FREEZE / 86400 + 2440587.5 + DAYS, LON, LAT, ALT_M / 1000) for b, cmd in BODIES.items()}

time.time = lambda: FREEZE  # astlo reads time.time() for "now"
if os.environ.get("ASTLO_SRC"):
    sys.path.insert(0, os.path.abspath(os.environ["ASTLO_SRC"]))


class _FrozenDT(_dt.datetime):
    @classmethod
    def now(cls, tz=None):
        return _dt.datetime.fromtimestamp(time.time(), tz)


with contextlib.redirect_stdout(io.StringIO()):
    import astlo.topocentric as tpm

    tpm.datetime = _FrozenDT  # the published build used datetime.now() for GMST
    tp = tpm.Topocentric()
out = {}
for b in BODIES:
    with contextlib.redirect_stdout(io.StringIO()):
        r = tp.topo(b, LAT, LON, ALT_M, DAYS)
    az, el = ref[b]
    a1, e1, a2, e2 = map(math.radians, (float(r["azimuth_deg"]), float(r["elevation_deg"]), az, el))
    sep = math.degrees(math.acos(max(-1.0, min(1.0, math.sin(e1) * math.sin(e2) + math.cos(e1) * math.cos(e2) * math.cos(a1 - a2)))))
    out[b] = {"astlo_el_az": [round(float(r["elevation_deg"]), 3), round(float(r["azimuth_deg"]), 3)],
              "jpl_el_az": [round(el, 3), round(az, 3)], "sep_deg": round(sep, 3), "jd": r["Julian_Date_full"]}
print(json.dumps(out))
