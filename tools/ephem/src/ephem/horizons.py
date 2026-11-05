# SPDX-License-Identifier: Apache-2.0
"""State vectors from the NASA/JPL Horizons API, with the standard library only. A person
runs this to refresh test fixtures; the game never calls Horizons (D17). Answers are
cached under the SHA-256 of their query, and an answer without vectors never is."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
BACKOFF_S = (1, 2, 4, 8, 16)  # waits before each retry of a busy answer
RETRY_STATUS = frozenset({429, 503})


class HorizonsError(RuntimeError):
    """Horizons answered, but not with vectors; the message is Horizons' own text."""


def vectors_query(command: str, center: str, epochs_jd_tdb: list[float]) -> str:
    """The query the fixtures have always used: ecliptic of J2000, ICRF, km and km/s,
    TDB Julian dates. repr keeps "2451545.0" as the old script sent it, and every digit
    of a fractional epoch."""
    params = {"format": "json", "COMMAND": f"'{command}'", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'"}
    params |= {"EPHEM_TYPE": "'VECTORS'", "CENTER": f"'{center}'", "REF_PLANE": "'ECLIPTIC'", "REF_SYSTEM": "'ICRF'"}
    params |= {"VEC_TABLE": "'2'", "OUT_UNITS": "'KM-S'", "CSV_FORMAT": "'YES'", "TIME_TYPE": "'TDB'", "TLIST_TYPE": "'JD'"}
    params["TLIST"] = "'" + " ".join(repr(float(jd)) for jd in epochs_jd_tdb) + "'"
    return urllib.parse.urlencode(params)


def parse_vectors(response: dict) -> dict:
    """Rows, API signature and ephemeris source from one Horizons JSON answer. Horizons
    reports many failures inside an HTTP 200 answer, as an "error" key or as result text
    with no $$SOE table; both raise with Horizons' message."""
    if not isinstance(response, dict):
        raise HorizonsError("Horizons answered with something other than a JSON object")
    if response.get("error"):
        raise HorizonsError(f"Horizons error: {str(response['error']).strip()}")
    result = response.get("result")
    if not isinstance(result, str) or "$$SOE" not in result or "$$EOE" not in result:
        lines = [ln.strip() for ln in str(result).splitlines() if ln.strip()]
        raise HorizonsError("Horizons returned no vectors: " + " | ".join(lines[-6:]))
    header, rest = result.split("$$SOE", 1)
    rows = []
    for line in rest.split("$$EOE", 1)[0].strip().splitlines():
        cells = [c.strip() for c in line.split(",")]
        if len(cells) < 8:
            raise HorizonsError(f"unreadable vector row: {line.strip()[:80]}")
        rows.append({"jdTdb": float(cells[0]), "r": [float(c) for c in cells[2:5]], "v": [float(c) for c in cells[5:8]]})
    if not rows:
        raise HorizonsError("Horizons returned an empty vector table")
    # Target and centre each name their source, for example {source: DE441}.
    sources = list(dict.fromkeys(re.findall(r"\{source:\s*([^}]*?)\s*\}", header)))
    return {
        "rows": sorted(rows, key=lambda row: row["jdTdb"]),
        "api_signature": (response.get("signature") or {}).get("version"),
        "ephemeris_source": ", ".join(sources) or None,
    }


def _get(url: str) -> dict:
    for wait in (*BACKOFF_S, None):
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as err:
            if err.code not in RETRY_STATUS or wait is None:
                raise HorizonsError(f"Horizons answered HTTP {err.code}: {err.read().decode('utf-8', 'replace')[:300]}") from err
            time.sleep(wait)
    raise AssertionError("unreachable: the last attempt returns or raises")


def fetch_vectors(command: str, center: str, epochs_jd_tdb: list[float], *, cache_dir: Path) -> dict:
    """Vectors of `command` relative to `center` at TDB Julian dates, from the cache when
    the same query was answered before, otherwise from the API. The result names the
    query, the API signature, the ephemeris source and the UTC time of the fetch."""
    query = vectors_query(command, center, epochs_jd_tdb)
    path = Path(cache_dir) / f"{hashlib.sha256(query.encode('utf-8')).hexdigest()}.json"
    if path.exists():
        cached = json.loads(path.read_text(encoding="utf-8"))
        if cached.get("query") != query:
            raise HorizonsError(f"{path} answers another query; delete it and run again")
        parsed = parse_vectors(cached["response"])
    else:
        response = _get(f"{API}?{query}")
        parsed = parse_vectors(response)  # raises before an error is cached
        fetched = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        cached = {"query": query, "fetched_utc": fetched, "response": response}
        path.parent.mkdir(parents=True, exist_ok=True)
        part = path.with_name(f"{path.name}.{os.getpid()}.part")
        part.write_text(json.dumps(cached, indent=1) + "\n", encoding="utf-8")
        part.replace(path)
    return {**parsed, "fetched_utc": cached["fetched_utc"], "query": query}
