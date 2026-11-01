# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""A tiny, cached client for the public NASA/JPL Horizons API (standard library only).

Every distinct query is fetched once and cached as JSON, so re-running a comparison
makes no new requests. The cache lives in $HZ_CACHE, or ./hz_cache in the current
directory; run the bench from a scratch directory, never from inside the repository.
This module does not import astlo.

API documentation: https://ssd-api.jpl.nasa.gov/doc/horizons.html
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.parse
import urllib.request

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
_REAL_TIME = time.time  # the bench freezes time.time for astlo; requests keep the real clock


def cache_dir() -> str:
    path = os.environ.get("HZ_CACHE") or os.path.join(os.getcwd(), "hz_cache")
    os.makedirs(path, exist_ok=True)
    return path


def query(params: dict, use_cache: bool = True) -> str:
    """Run one Horizons query and return its 'result' text (see query_full)."""
    return query_full(params, use_cache)["result"]


def query_full(params: dict, use_cache: bool = True) -> dict:
    """Run one Horizons query; return {'params', 'result', 'signature'} (signature may be absent)."""
    p = {"format": "json", "OBJ_DATA": "NO", "MAKE_EPHEM": "YES"}
    p.update(params)
    p = {k: (v if k == "format" else f"'{v}'") for k, v in p.items()}
    key = hashlib.sha1(json.dumps(p, sort_keys=True).encode()).hexdigest()[:16]
    path = os.path.join(cache_dir(), key + ".json") if use_cache else None
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    url = API + "?" + urllib.parse.urlencode(p)
    req = urllib.request.Request(url, headers={"User-Agent": "starshot-astlo-bench (stdlib urllib)"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.load(resp)
    if "result" not in data:
        raise RuntimeError(f"Horizons error: {data}")
    entry = {"params": p, "result": data["result"], "signature": data.get("signature")}
    if path:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(entry, fh)
        with open(os.path.join(cache_dir(), "_requests.txt"), "a", encoding="utf-8") as fh:
            fh.write(f"{_REAL_TIME():.0f} {key} {params.get('COMMAND')} {params.get('EPHEM_TYPE')}\n")
    time.sleep(1.0)  # be gentle with a free public service
    return entry


def soe(txt: str) -> list[str]:
    """The data rows between $$SOE and $$EOE."""
    if "$$SOE" not in txt:
        raise RuntimeError(txt[:2000])
    return [ln for ln in txt.split("$$SOE")[1].split("$$EOE")[0].strip().splitlines() if ln.strip()]


def vectors(cmd: str, center: str, jds: list[float], use_cache: bool = True) -> list[list[float]]:
    """State vectors [x, y, z, vx, vy, vz] (km, km/s), ecliptic J2000, at each JD (UT)."""
    txt = query({"COMMAND": cmd, "EPHEM_TYPE": "VECTORS", "CENTER": center,
                 "TLIST": " ".join(f"{j:.9f}" for j in jds), "TLIST_TYPE": "JD", "TIME_TYPE": "UT",
                 "REF_PLANE": "ECLIPTIC", "REF_SYSTEM": "ICRF", "VEC_TABLE": "2", "OUT_UNITS": "KM-S",
                 "CSV_FORMAT": "YES", "VEC_LABELS": "NO"}, use_cache)
    rows = {}
    for line in soe(txt):
        cells = [c.strip() for c in line.split(",")]
        rows[float(cells[0])] = [float(c) for c in cells[2:8]]
    out = []
    for j in jds:
        best = min(rows, key=lambda x: abs(x - j))
        if abs(best - j) > 1e-5:
            raise RuntimeError(f"Horizons returned no row for JD {j} (closest {best})")
        out.append(rows[best])
    return out


def elements(cmd: str, jd_tdb: float, use_cache: bool = True) -> dict[str, str]:
    """Heliocentric osculating elements (ecliptic J2000, au and days) at one JD (TDB)."""
    txt = query({"COMMAND": cmd, "EPHEM_TYPE": "ELEMENTS", "CENTER": "500@10", "TLIST": f"{jd_tdb:.6f}",
                 "TLIST_TYPE": "JD", "TIME_TYPE": "TDB", "REF_PLANE": "ECLIPTIC", "REF_SYSTEM": "ICRF",
                 "OUT_UNITS": "AU-D", "CSV_FORMAT": "YES", "ELM_LABELS": "YES"}, use_cache)
    cols = None
    for line in txt.split("$$SOE")[0].strip().splitlines()[::-1]:
        if "JDTDB" in line:
            cols = [c.strip() for c in line.split(",")]
            break
    if cols is None:
        raise RuntimeError("Horizons elements: no header row")
    return dict(zip(cols, [c.strip() for c in soe(txt)[0].split(",")]))


def observer_azel(cmd: str, jd_ut: float, lon: float, lat: float, alt_km: float,
                  use_cache: bool = True) -> tuple[float, float]:
    """Apparent, airless azimuth and elevation (degrees) from a geodetic site at one JD (UT)."""
    txt = query({"COMMAND": cmd, "EPHEM_TYPE": "OBSERVER", "CENTER": "coord@399", "COORD_TYPE": "GEODETIC",
                 "SITE_COORD": f"{lon},{lat},{alt_km}", "TLIST": f"{jd_ut:.9f}", "TLIST_TYPE": "JD",
                 "TIME_TYPE": "UT", "QUANTITIES": "4", "ANG_FORMAT": "DEG", "CSV_FORMAT": "YES",
                 "EXTRA_PREC": "YES", "APPARENT": "AIRLESS"}, use_cache)
    nums = []
    for cell in [c.strip() for c in soe(txt)[0].split(",")][1:]:
        try:
            nums.append(float(cell))
        except ValueError:
            pass
    return nums[-2], nums[-1]
