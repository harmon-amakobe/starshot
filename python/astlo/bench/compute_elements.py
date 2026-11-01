#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Derive the orbital element values that the 'data' fix wrote into astlo.py.

Starshot's own code (MIT, standard library only); it does not import astlo. It shows
where every number in that commit (git log -- python/astlo/astlo/astlo.py) comes from:

  * Mercury to Neptune: NASA/JPL "Keplerian Elements for Approximate Positions of the
    Major Planets", Table 1 (1800-2050), at J2000
    (https://ssd.jpl.nasa.gov/planets/approx_pos.html). MO = L - varpi,
    w = varpi - node, omega = node; P from the rate of L ("sidereal", the shipped
    choice) or of L - varpi ("anomalistic"). "Earth" there is the Earth-Moon barycentre.
  * Pluto (system barycentre), Ceres, Vesta, Pallas, Hygiea, Haumea, Makemake, Eris:
    Horizons heliocentric ecliptic-J2000 osculating elements at 2026-11-01 00:00 TDB,
    P from a, and the mean anomaly carried back to astlo's J2000 instant with astlo's
    own mean motion, so M is exact on 2026-11-01.

    python3 -I <repo>/python/astlo/bench/compute_elements.py [sidereal|anomalistic] [osc|mean2]

Prints the values as astlo attribute names (Body_AU, Body_e, ...) and writes
new_elements_<mode>.json into the current directory. 'mean2' fits the small bodies'
mean motion between J2000 and 2026 instead (measured, not shipped; VERIFICATION.md).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I leaves the script dir off sys.path
import hz  # noqa: E402

YR = 3.15569e7            # astlo's self.earthperiod_s
JD2000_UNIX = 946728000   # astlo's self.JD2000 (2000-01-01 12:00 UTC as Unix time)
EPOCH_UNIX = 1793491200 - 69.184  # 2026-11-01 00:00 TDB as UTC Unix seconds (TDB - UTC = 69.184 s)
EPOCH_JD_TDB = 2461345.5
CY_S = 36525 * 86400

T1 = {  # a, e, I, L, varpi, node; then rates per Julian century (JPL Table 1, digit for digit)
    "Mercury": ([0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
                [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]),
    "Venus": ([0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
              [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]),
    "Earth": ([1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
              [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]),
    "Mars": ([1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
             [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]),
    "Jupiter": ([5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
                [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]),
    "Saturn": ([9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
               [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]),
    "Uranus": ([19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
               [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]),
    "Neptune": ([30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
                [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]),
}
# Horizons IDs: Pluto as the Pluto-Charon barycentre (9), small bodies by record number.
SMALL = {"PLUTO": "9", "CERES": "1;", "VESTA": "4;", "PALLAS": "2;", "HYGIEA": "10;",
         "HAUMEA": "136108;", "MAKEMAKE": "136472;", "ERIS": "136199;"}


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "sidereal"
    pmode = sys.argv[2] if len(sys.argv) > 2 else "osc"
    if mode not in ("sidereal", "anomalistic") or pmode not in ("osc", "mean2"):
        sys.exit(__doc__)
    tag = mode if pmode == "osc" else f"{mode}_{pmode}"
    out = {}
    for n, (el, rt) in T1.items():
        a, e, i, L, varpi, node = el
        n_deg_cy = rt[3] - rt[4] if mode == "anomalistic" else rt[3]
        P = round(360.0 / n_deg_cy * CY_S / YR, 9)
        out[n] = dict(AU=a, e=e, i=i, w=round((varpi - node) % 360, 8), omega=node, MO=round((L - varpi) % 360, 8), P=P)

    for N, cmd in SMALL.items():
        d = hz.elements(cmd, EPOCH_JD_TDB)
        A, EC, IN, OM, W, NN, MA = (float(d[k]) for k in ("A", "EC", "IN", "OM", "W", "N", "MA"))
        P = round((360.0 / NN) * 86400 / YR, 9)  # sidereal period from a (Horizons N = sqrt(GM/a^3))
        if pmode == "mean2":  # the mean motion actually observed between J2000 and 2026
            d0 = hz.elements(cmd, 2451545.0)
            lam0 = float(d0["OM"]) + float(d0["W"]) + float(d0["MA"])
            lam1 = OM + W + MA
            dt_d = float(d["JDTDB"]) - float(d0["JDTDB"])
            k = round((NN * dt_d - (lam1 - lam0)) / 360.0)
            P = round((360.0 / ((lam1 - lam0 + 360.0 * k) / dt_d)) * 86400 / YR, 9)
        n_astlo = 360.0 / (P * YR)  # deg/s, exactly what astlo's orbits() uses
        MO = (MA - n_astlo * (EPOCH_UNIX - JD2000_UNIX)) % 360
        out[N.title()] = dict(AU=round(A, 8), e=round(EC, 8), i=round(IN, 6), w=round(W, 6), omega=round(OM, 6),
                              MO=round(MO, 6), P=P)

    with open(f"new_elements_{tag}.json", "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    for n, d in out.items():
        print(n.ljust(9), "  ".join(f"{n}_{k}={v!r}" for k, v in d.items()))


if __name__ == "__main__":
    main()
