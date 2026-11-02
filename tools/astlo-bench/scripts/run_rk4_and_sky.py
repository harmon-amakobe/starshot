#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Probe astlo's rungekutta() behaviour and its sky (azimuth/elevation) output.

Checks whether rungekutta(days=N) steps through time (its run time and result
versus astlo's own Kepler position at day N), then asks Topocentric.topo for
seven bodies as seen from Nairobi. Calls astlo's public API only. Run with the
Python of a virtualenv where you installed the astlo wheel yourself:

    MPLBACKEND=Agg <venv>/bin/python -I run_rk4_and_sky.py

Writes OUTF (default out_run2.json, in the current directory) and prints it.
"""
import io, json, os, time, contextlib
with contextlib.redirect_stdout(io.StringIO()):   # astlo prints on import; keep stdout pure JSON
    from astlo import Contin, Topocentric
c = Contin()
def q(fn,*a,**k):
    with contextlib.redirect_stdout(io.StringIO()):
        t=time.time(); r=fn(*a,**k); return r, time.time()-t
out={}
# Is rungekutta(days=N) a single 1-hour RK4 step from the analytic state at day N?
rk, dt = q(c.rungekutta, days=365)
b0, _ = q(c.barycentric, 'EARTH', 365)
b1, _ = q(c.barycentric, 'EARTH', 365 + 1/24)
out['rk_secs']=dt
out['rk_earth']=rk['new_pos_vectors'][3]
out['analytic_earth_day365']=[b0['X_bary'],b0['Y_bary'],b0['Z_bary']]
out['analytic_earth_day365_plus1h']=[b1['X_bary'],b1['Y_bary'],b1['Z_bary']]
# long timestep: how long does a days=1e6 (2700 yr) and 1e9-day call take?
for d in (1e4, 1e6, 3.65e11):
    try:
        r, dt = q(c.rungekutta, days=d); out[f'rk_days_{d}']={'secs':dt,'earth':r['new_pos_vectors'][3]}
    except BaseException as e:
        out[f'rk_days_{d}']=repr(e)
# topocentric, Nairobi (city centre, public coordinates)
tp = Topocentric(); out['topo_unix']=time.time(); out['topo']={}
for bname in ['SUN','VENUS','MARS','JUPITER','SATURN','URANUS','NEPTUNE']:
    try:
        r, dt = q(tp.topo, bname, -1.2921, 36.8219, 1795.0)
        out['topo'][bname]={'el':r['elevation_deg'],'az':r['azimuth_deg'],'secs':dt,'time':str(r.get('time'))[-40:]}
    except BaseException as e:
        out['topo'][bname]=repr(e)
with open(os.environ.get('OUTF','out_run2.json'),'w') as fh:
    json.dump(out, fh, indent=1, default=str)
print(json.dumps(out, indent=1, default=str))
