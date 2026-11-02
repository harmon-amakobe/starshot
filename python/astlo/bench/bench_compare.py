#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Compare one or more bench_run.py outputs with NASA/JPL Horizons; print Markdown tables.

Starshot's own code (Apache-2.0, standard library only); it does not import astlo. Horizons
answers are cached (see hz.py), so a re-run makes no new requests. Run it from the
scratch directory that holds the bench_run.py outputs:

    python3 -I <repo>/python/astlo/bench/bench_compare.py before.json            # also writes rk4_seed.json
    python3 -I <repo>/python/astlo/bench/bench_compare.py before.json after.json > tables.md

Writes compare_summary.json and rk4_seed.json (Horizons states that seed the looped
rk4steps() run) into the current directory. About 51 Horizons requests on a cold cache.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I leaves the script dir off sys.path
import hz  # noqa: E402

if len(sys.argv) < 2:
    sys.exit(__doc__)
runs = []
for path in sys.argv[1:]:
    with open(path, encoding="utf-8") as fh:
        runs.append((os.path.basename(path).replace(".json", ""), json.load(fh)))
T0 = runs[0][1]['freeze_unix']
for _, o in runs:
    assert o['freeze_unix'] == T0
OFFS = runs[0][1]['offsets']
KEYS = ['now' if x is None else repr(x) for x in OFFS]
LABEL = dict(zip(KEYS, ['2026-10-31 21:00 (now)', '2000-01-01 12:00 (J2000)', '1986-02-09', '2029-04-13 21:46', '2126-10-31']))
DAYS = [0 if x is None else x for x in OFFS] + [1 / 24, 365.0]
def jd(u): return u / 86400 + 2440587.5
JDS = [jd(T0 + d * 86400) for d in DAYS]
IDS = {'MERCURY': '199', 'VENUS': '299', 'EARTH': '399', 'MARS': '499', 'CERES': '1;', 'VESTA': '4;', 'PALLAS': '2;',
       'HYGIEA': '10;', 'JUPITER': '599', 'SATURN': '699', 'URANUS': '799', 'NEPTUNE': '899', 'PLUTO': '999',
       'HAUMEA': '136108;', 'MAKEMAKE': '136472;', 'ERIS': '136199;'}
BODIES = list(IDS)
# barycentric (SSB) reference states, km & km/s
SSB = {b: hz.vectors(c, '500@0', JDS) for b, c in IDS.items()}
SSB['SUN'] = hz.vectors('10', '500@0', JDS)
# system barycentres used to seed the looped RK4 (EMB for Earth, Pluto-Charon barycentre for Pluto)
SEEDID = {'EARTH': '3', 'MARS': '4', 'JUPITER': '5', 'SATURN': '6', 'URANUS': '7', 'NEPTUNE': '8', 'PLUTO': '9'}
SEED = {b: hz.vectors(c, '500@0', JDS) for b, c in SEEDID.items()}

def helio(b, ti): return [SSB[b][ti][k] - SSB['SUN'][ti][k] for k in range(6)]
def ang(a, b):
    d = sum(x * y for x, y in zip(a, b)) / (math.hypot(*a) * math.hypot(*b))
    return math.degrees(math.acos(max(-1, min(1, d)))) * 60
def fmt_ang(m):
    if m is None: return 'n/a'
    return f'{m / 60:.2f}°' if m >= 60 else f"{m:.2f}′"

AU = 1.495978707e8
summary = {}
for name, o in runs:
    S = summary[name] = {'helio': {}, 'geo': {}, 'errkm': {}}
    for ti, k in enumerate(KEYS):
        bc = o['barycentric'][k]
        if bc['EARTH'].get('X_helio') is None: continue
        E_est = [bc['EARTH'][c] / 1000 for c in ('X_helio', 'Y_helio', 'Z_helio')]
        E_ref = helio('EARTH', ti)[:3]
        for b in BODIES:
            r = bc.get(b, {})
            if r.get('X_helio') is None: continue
            est = [r[c] / 1000 for c in ('X_helio', 'Y_helio', 'Z_helio')]
            ref = helio(b, ti)[:3]
            S['helio'].setdefault(b, {})[k] = ang(est, ref)
            S['errkm'].setdefault(b, {})[k] = math.dist(est, ref)
            if b != 'EARTH':
                S['geo'].setdefault(b, {})[k] = ang([a - c for a, c in zip(est, E_est)], [a - c for a, c in zip(ref, E_ref)])
    # velocities now: heliocentric and barycentric for Earth and Jupiter
    S['vel'] = {}
    for b in ('EARTH', 'MARS', 'JUPITER'):
        r = o['barycentric']['now'][b]
        vh = [r[c] / 1000 for c in ('v_Xhelio', 'v_Yhelio', 'v_Zhelio')]
        vb = [r[c] / 1000 for c in ('v_X', 'v_Y', 'v_Z')]
        S['vel'][b] = {'helio_err_kms': math.dist(vh, helio(b, 0)[3:]), 'bary_err_kms': math.dist(vb, SSB[b][0][3:]),
                       'bary_minus_helio_est_ms': [1000 * (x - y) for x, y in zip(vb, vh)],
                       'sun_ssb_vel_ref_ms': [1000 * x for x in SSB['SUN'][0][3:]]}
    # Sun wrt SSB (position) from the Earth record: X_bary - X_helio
    e = o['barycentric']['now']['EARTH']
    sun_est = [(e[a] - e[b2]) / 1000 for a, b2 in (('X_bary', 'X_helio'), ('Y_bary', 'Y_helio'), ('Z_bary', 'Z_helio'))]
    S['sun_ssb_err_km'] = math.dist(sun_est, SSB['SUN'][0][:3])
    # RK4 single step: Sun state and Earth state
    rk = o.get('rk4_now', {})
    if 'pos' in rk:
        S['rk4'] = {'delta_t_reported': rk['delta_t'], 'secs': rk['secs'],
                    'sun_X_m': rk['pos'][0][0], 'sun_X_ref_m_now': SSB['SUN'][0][0] * 1000, 'sun_X_ref_m_now_plus_1h': SSB['SUN'][5][0] * 1000,
                    'sun_pos_err_km_vs_now_plus_1h': math.dist([x / 1000 for x in rk['pos'][0]], SSB['SUN'][5][:3]),
                    'sun_pos_err_km_vs_now': math.dist([x / 1000 for x in rk['pos'][0]], SSB['SUN'][0][:3]),
                    'earth_minus_analytic_km': math.dist([x / 1000 for x in rk['pos'][3]], [x / 1000 for x in o['analytic_now']['EARTH']]),
                    'earth_step_vs_jpl_1h_motion_km': math.dist(SSB['EARTH'][5][:3], SSB['EARTH'][0][:3])}
        S['rk4_days365_secs'] = o.get('rk4_days365', {}).get('secs')
    # Moon (geocentric)
    m = o.get('moon', {})
    if 'X' in m:
        ref = [SSB_m for SSB_m in hz.vectors('301', '500@399', [JDS[0]])[0]]
        est = [m['X'] / 1000, m['Y'] / 1000, m['Z'] / 1000]
        S['moon'] = {'ang_deg': ang(est, ref[:3]) / 60, 'dist_est_km': math.hypot(*est), 'dist_ref_km': math.hypot(*ref[:3])}
    # topocentric
    S['topo'] = {}
    HZ_TOPO = {'SUN': '10', 'VENUS': '299', 'MARS': '499', 'JUPITER': '599', 'SATURN': '699', 'URANUS': '799', 'NEPTUNE': '899'}
    for b, t in o.get('topo', {}).items():
        if 'el' not in t: continue
        az, el = hz.observer_azel(HZ_TOPO[b], JDS[0], 36.8219, -1.2921, 1.795)
        a1, e1, a2, e2 = map(math.radians, (t['az'], t['el'], az, el))
        sep = math.degrees(math.acos(max(-1, min(1, math.sin(e1) * math.sin(e2) + math.cos(e1) * math.cos(e2) * math.cos(a1 - a2)))))
        S['topo'][b] = {'astlo_el': t['el'], 'astlo_az': t['az'], 'jpl_el': el, 'jpl_az': az, 'sep_deg': sep, 'secs': t['secs']}
    S['unknown'] = o.get('unknown')
    S['import'] = {'secs': o['import_s'], 'printed': o['import_printed'], 'backend': o['mpl_backend']}
    # looped RK4 seeded from JPL (fixed build only)
    for lab in ('rk4steps',):
        rr = o.get(lab)
        if rr and 'pos' in rr:
            order = ['SUN', 'MERCURY', 'VENUS', 'EARTH', 'MARS', 'VESTA', 'CERES', 'PALLAS', 'HYGIEA', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO', 'HAUMEA', 'MAKEMAKE', 'ERIS']
            S[lab] = {'secs': rr['secs'], 'steps': rr.get('steps'), 'err_km': {}, 'helio_arcsec': {}}
            for i, b in enumerate(order):
                ref = (SEED[b] if b in SEED else SSB[b])[6]
                est = [x / 1000 for x in rr['pos'][i]]
                S[lab]['err_km'][b] = math.dist(est, ref[:3])
                if b != 'SUN':
                    S[lab]['helio_arcsec'][b] = ang([a - s for a, s in zip(est, [x / 1000 for x in rr['pos'][0]])],
                                                    [a - s for a, s in zip(ref[:3], SSB['SUN'][6][:3])]) * 60
    rr = o.get('rk4steps_from_kepler')
    if rr and 'pos' in rr:
        order = ['SUN', 'MERCURY', 'VENUS', 'EARTH', 'MARS', 'VESTA', 'CERES', 'PALLAS', 'HYGIEA', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO', 'HAUMEA', 'MAKEMAKE', 'ERIS']
        S['rk4steps_from_kepler'] = {'secs': rr['secs'], 'steps': rr.get('steps'), 'helio_arcmin': {}}
        for i, b in enumerate(order[1:], start=1):
            ref = (SEED[b] if b in SEED else SSB[b])[6]
            est = [x / 1000 for x in rr['pos'][i]]
            S['rk4steps_from_kepler']['helio_arcmin'][b] = ang([a - s for a, s in zip(est, [x / 1000 for x in rr['pos'][0]])],
                                                              [a - s for a, s in zip(ref[:3], SSB['SUN'][6][:3])])

# write the JPL seed for the looped RK4 test (SSB, metres and m/s, astlo's body order)
order = ['SUN', 'MERCURY', 'VENUS', 'EARTH', 'MARS', 'VESTA', 'CERES', 'PALLAS', 'HYGIEA', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO', 'HAUMEA', 'MAKEMAKE', 'ERIS']
seed = {'r': [], 'v': [], 'tt': 0.5, 'days': 365, 'jd_ut': JDS[0]}
for b in order:
    s = (SEED[b] if b in SEED else SSB[b])[0]
    seed['r'].append([x * 1000 for x in s[:3]]); seed['v'].append([x * 1000 for x in s[3:]])
with open('rk4_seed.json', 'w', encoding='utf-8') as fh:
    json.dump(seed, fh)
with open('compare_summary.json', 'w', encoding='utf-8') as fh:
    json.dump(summary, fh, indent=1, default=str)

# ---------- markdown ----------
names = [n for n, _ in runs]
print('### Heliocentric direction error vs JPL (arcmin unless marked °)\n')
for k in KEYS:
    print(f'**{LABEL[k]}**\n')
    print('| Body | ' + ' | '.join(names) + ' |')
    print('|---|' + '---|' * len(names))
    for b in BODIES:
        print(f'| {b.title()} | ' + ' | '.join(fmt_ang(summary[n]['helio'].get(b, {}).get(k)) for n in names) + ' |')
    print()
print('### Position error (million km), heliocentric\n')
print('| Body | epoch | ' + ' | '.join(names) + ' |')
print('|---|---|' + '---|' * len(names))
for b in BODIES:
    for k in KEYS:
        print(f'| {b.title()} | {LABEL[k]} | ' + ' | '.join(f"{summary[n]['errkm'].get(b, {}).get(k, float('nan')) / 1e6:.3f}" for n in names) + ' |')
print('\n### Geocentric (sky) direction error, now\n')
print('| Body | ' + ' | '.join(names) + ' |')
print('|---|' + '---|' * len(names))
for b in BODIES:
    if b == 'EARTH': continue
    print(f'| {b.title()} | ' + ' | '.join(fmt_ang(summary[n]['geo'].get(b, {}).get('now')) for n in names) + ' |')
for n in names:
    S = summary[n]
    print(f'\n### {n}: misc\n')
    print('velocities now:', json.dumps(S['vel'], default=lambda x: round(x, 3)))
    print('sun_ssb_err_km:', round(S['sun_ssb_err_km'], 1))
    print('rk4:', json.dumps(S.get('rk4'), default=str))
    print('rk4_days365_secs:', S.get('rk4_days365_secs'))
    print('moon:', S.get('moon'))
    print('topo:')
    for b, t in S['topo'].items():
        print(f"  {b:8} astlo el/az {t['astlo_el']:7.2f} {t['astlo_az']:7.2f} | JPL {t['jpl_el']:7.2f} {t['jpl_az']:7.2f} | sep {t['sep_deg']:.3f} deg | {t['secs']:.2f}s")
    print('unknown:', S['unknown'])
    print('import:', S['import'])
    if 'rk4steps' in S:
        print('rk4steps (JPL seed, 365 d):', json.dumps(S['rk4steps'], default=lambda x: round(x, 2)))
    if 'rk4steps_from_kepler' in S:
        print('rk4steps_from_kepler (365 d):', json.dumps(S['rk4steps_from_kepler'], default=lambda x: round(x, 2)))
