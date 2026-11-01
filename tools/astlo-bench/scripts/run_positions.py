#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Record astlo's planet positions, timings and a few other outputs as JSON.

Calls astlo's public API only (Contin.barycentric, rungekutta, reel and
Topocentric.topo). astlo is not in this folder: install either the published wheel
(third_party/astlo/dist) or the fixed build from python/astlo
(python/astlo/build_wheel.py) into a virtualenv yourself, and run this script with
that virtualenv's Python:

    MPLBACKEND=Agg <venv>/bin/python -I run_positions.py [day offsets ...]

Each optional argument is a day offset from "now" at which astlo is also asked
for every body (astlo reads the wall clock, so offsets are how other dates are
requested). Environment variables:

    OUTF   output file (default out_run1.json, in the current directory)
    PATCH  if set, restore the published J2000 orbital angles (argument of
           perihelion, ascending node, inclination) on the Contin object, in
           memory only, before computing. No astlo file is modified.
"""
import io, json, time, contextlib, sys, os
OUT = {}
t0 = time.time()
import astlo
from astlo import Contin, Topocentric
OUT['import_s'] = time.time() - t0
OUT['version'] = astlo.__version__
c = Contin()
if os.environ.get('PATCH'):
    # Standard published J2000 orbital angles in degrees (astlo keeps the same values as comments).
    for k,v in dict(Mercury_w=29.12478,Venus_w=54.85229,Earth_w=114.20783,Mars_w=286.4623,Jupiter_w=274.1977,Saturn_w=338.7169,Uranus_w=96.73436,Neptune_w=273.24966,Pluto_w=113.76329,Mercury_omega=48.33167,Venus_omega=76.68069,Earth_omega=348.73936,Mars_omega=49.57854,Jupiter_omega=100.55615,Saturn_omega=113.71504,Uranus_omega=74.22988,Neptune_omega=131.72169,Pluto_omega=110.30347,Mercury_i=7.00487,Venus_i=3.39471,Mars_i=1.85061,Jupiter_i=1.30530,Saturn_i=2.48446,Uranus_i=0.76986,Neptune_i=1.76917,Pluto_i=17.142).items(): setattr(c,k,v)

BODIES = ['MERCURY','VENUS','EARTH','MARS','CERES','VESTA','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']
def quiet(fn, *a, **k):
    # astlo prints as it works; capture that and any exception (including SystemExit).
    buf = io.StringIO()
    t = time.time()
    with contextlib.redirect_stdout(buf):
        try:
            r = fn(*a, **k); err = None
        except BaseException as e:
            r = None; err = f'{type(e).__name__}: {e}'
    return r, time.time() - t, len(buf.getvalue()), err
# offsets in days relative to "now" are passed via the days arg
OFFSETS = [None] + [float(x) for x in sys.argv[1:]]
OUT['now_unix'] = time.time()
res = {}
for off in OFFSETS:
    key = 'now' if off is None else str(off)
    res[key] = {}
    for b in BODIES + ['APOPHIS','HALLEY','LUNAR']:
        r, dt, nprint, err = quiet(c.barycentric, b, off) if off is not None else quiet(c.barycentric, b)
        entry = {'secs': dt, 'printed_chars': nprint, 'err': err}
        if isinstance(r, dict):
            for k in ('X_bary','Y_bary','Z_bary','X_helio','Y_helio','Z_helio','v_X','v_Y','v_Z','Unix_time','mode','resp_day'):
                if k in r: entry[k] = r[k] if isinstance(r[k], (int,float,str,type(None))) else str(r[k])
            entry['keys'] = len(r)
        else:
            entry['ret'] = str(r)[:200]
        res[key][b] = entry; print(key, b, round(dt,3), err, file=sys.stderr)
OUT['barycentric'] = res
# RK4
for label, kw in [('rk4_now', {}), ('rk4_days365', {'days': 365})]:
    r, dt, nprint, err = quiet(c.rungekutta, **kw)
    OUT[label] = {'secs': dt, 'printed_chars': nprint, 'err': err,
                  'keys': list(r.keys()) if isinstance(r, dict) else None,
                  'n_bodies': len(r['new_pos_vectors']) if isinstance(r, dict) else None,
                  'pos_idx0_sun': r['new_pos_vectors'][0] if isinstance(r, dict) else None,
                  'pos_idx3_earth': r['new_pos_vectors'][3] if isinstance(r, dict) else None,
                  'vel_idx3_earth': r['new_vel_vectors'][3] if isinstance(r, dict) else None,
                  'delta_t': r.get('delta_t') if isinstance(r, dict) else None}
# reel single vector
r, dt, nprint, err = quiet(c.reel, 'MARS', True, True)
OUT['reel_mars'] = {'secs': dt, 'err': err, 'printed_chars': nprint, 'keys': list(r.keys()) if isinstance(r, dict) else None,
                    'n_orbit_pts': len(r['X_AUl']) if isinstance(r, dict) else None,
                    'X_baryreal': r.get('X_baryreal') if isinstance(r, dict) else None}
# topocentric for Nairobi (city centre, public coordinates)
tp = Topocentric()
for b in ['MARS','JUPITER','SATURN','VENUS','SUN']:
    r, dt, nprint, err = quiet(tp.topo, b, -1.2921, 36.8219, 1795.0)
    OUT.setdefault('topo', {})[b] = {'secs': dt, 'err': err, 'printed_chars': nprint,
        'elevation_deg': r.get('elevation_deg') if isinstance(r, dict) else None,
        'azimuth_deg': r.get('azimuth_deg') if isinstance(r, dict) else None,
        'time': str(r.get('time')) if isinstance(r, dict) else str(r)[:200]}
with open(os.environ.get('OUTF','out_run1.json'),'w') as fh:
    json.dump(OUT, fh, indent=1, default=str)
print('done', time.time()-t0)
