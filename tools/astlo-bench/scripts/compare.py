#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Compare astlo's heliocentric positions with NASA/JPL Horizons.

Reads the JSON written by run_positions.py, asks the public Horizons API for the
same bodies at the same instants, and prints, per epoch and body: the position
error (km and au), the direction error seen from the Sun, and the direction error
seen from Earth (arcminutes). Python standard library only; needs internet access
to ssd.jpl.nasa.gov. It does not import astlo.

    python3 -I compare.py <run_positions output .json> [<horizons output .json>]

The second argument is where the downloaded Horizons vectors are saved (default:
horizons_ref.json in the current directory).
"""
import datetime
import json
import math
import sys
import urllib.parse
import urllib.request

if len(sys.argv) < 2:
    sys.exit(__doc__)
SRC = sys.argv[1]
REF_OUT = sys.argv[2] if len(sys.argv) > 2 else 'horizons_ref.json'

with open(SRC) as fh:
    o = json.load(fh)
now = o['now_unix']
offs = list(o['barycentric'].keys())


def unix_of(k):
    # astlo evaluates "now + N days" on the wall clock, so each epoch is now + offset.
    return now + (0 if k == 'now' else float(k) * 86400)


IDS = {'MERCURY': '199', 'VENUS': '299', 'EARTH': '399', 'MARS': '499', 'CERES': '1;', 'VESTA': '4;',
       'PALLAS': '2;', 'HYGIEA': '10;', 'JUPITER': '599', 'SATURN': '699', 'URANUS': '799',
       'NEPTUNE': '899', 'PLUTO': '999', 'HAUMEA': '136108;', 'MAKEMAKE': '136472;',
       'ERIS': '136199;', 'SUN': '10'}


def jd(u):
    return u / 86400 + 2440587.5


JDS = [jd(unix_of(k)) for k in offs]


def horizons(cmd, center):
    q = {'format': 'json', 'COMMAND': f"'{cmd}'", 'OBJ_DATA': "'NO'", 'MAKE_EPHEM': "'YES'",
         'EPHEM_TYPE': "'VECTORS'", 'CENTER': f"'{center}'",
         'TLIST': "'" + ' '.join(f'{j:.6f}' for j in JDS) + "'", 'TLIST_TYPE': "'JD'",
         'TIME_TYPE': "'UT'", 'REF_PLANE': "'ECLIPTIC'", 'VEC_TABLE': "'2'",
         'OUT_UNITS': "'KM-S'", 'CSV_FORMAT': "'YES'"}
    url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(q)
    with urllib.request.urlopen(url, timeout=60) as resp:
        txt = json.loads(resp.read().decode('utf-8'))['result']
    body = txt.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines()
    rows = {}
    for line in body:
        p = [x.strip() for x in line.split(',')]
        rows[float(p[0])] = [float(p[2]), float(p[3]), float(p[4]), float(p[5]), float(p[6]), float(p[7])]
    keys = sorted(rows)
    out = []
    for j in JDS:
        best = min(keys, key=lambda x: abs(x - j))
        assert abs(best - j) < 0.01, (best, j)
        out.append(rows[best])
    return out


ref = {}
for b, i in IDS.items():
    if b == 'SUN':
        ref['SUN_SSB'] = horizons(i, '500@0')   # Sun relative to the solar-system barycentre
    else:
        ref[b] = horizons(i, '500@10')          # body relative to the Sun's centre
with open(REF_OUT, 'w') as fh:
    json.dump({'JDS': JDS, 'offs': offs, 'ref': ref}, fh)


def ang(a, b):
    d = sum(x * y for x, y in zip(a, b)) / (math.hypot(*a) * math.hypot(*b))
    return math.degrees(math.acos(max(-1, min(1, d)))) * 60


def label(k, j):
    day = datetime.datetime(1970, 1, 1) + datetime.timedelta(seconds=(j - 2440587.5) * 86400)
    return day.strftime('%Y-%m-%d') + (' now' if k == 'now' else '')


AU = 1.495978707e8
lab = {k: label(k, j) for k, j in zip(offs, JDS)}
rows = []
for ti, k in enumerate(offs):
    E_est = [o['barycentric'][k]['EARTH'][c] / 1000 for c in ('X_helio', 'Y_helio', 'Z_helio')]
    E_ref = ref['EARTH'][ti][:3]
    for b in IDS:
        if b == 'SUN':
            continue
        r = o['barycentric'][k].get(b, {})
        if r.get('X_helio') is None:
            continue
        est = [r[c] / 1000 for c in ('X_helio', 'Y_helio', 'Z_helio')]
        jr = ref[b][ti][:3]
        err = math.dist(est, jr)
        geo_est = [a - c for a, c in zip(est, E_est)]
        geo_ref = [a - c for a, c in zip(jr, E_ref)]
        rows.append((k, b, err, err / AU, ang(est, jr), ang(geo_est, geo_ref) if b != 'EARTH' else float('nan')))

print(f"{'epoch':18} {'body':9} {'err_km':>14} {'err_AU':>8} {'helio_arcmin':>12} {'geo_arcmin(sky)':>15}")
for k, b, e, ea, ah, ag in rows:
    print(f"{lab[k]:18} {b:9} {e:14.0f} {ea:8.4f} {ah:12.2f} {ag:15.2f}")
# Velocity check for Earth now (astlo reports barycentric m/s; JPL heliocentric km/s).
E = o['barycentric']['now']['EARTH']
print('Earth v_X,v_Y (bary,m/s) astlo:', E.get('v_X'), '| JPL helio vx,vy km/s:', ref['EARTH'][0][3:5])
# The Sun's offset from the solar-system barycentre, astlo vs JPL.
for ti, k in enumerate(offs):
    e = o['barycentric'][k]['EARTH']
    sun_est = [(e[c1] - e[c2]) / 1000 for c1, c2 in (('X_bary', 'X_helio'), ('Y_bary', 'Y_helio'), ('Z_bary', 'Z_helio'))]
    print('Sun wrt SSB', lab[k], 'astlo km', [round(x) for x in sun_est], 'JPL km', [round(x) for x in ref['SUN_SSB'][ti][:3]])
