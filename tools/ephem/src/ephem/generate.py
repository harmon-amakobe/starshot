# SPDX-License-Identifier: Apache-2.0
"""generate(): fit Chebyshev rails from a position source into an in-memory pack.

With validate() this is the interface of the growth path (D29): another producer can
supply the same pack from the same source, and the tests depend only on these two
signatures and the pack format. No file I/O happens here.
"""

from __future__ import annotations

import datetime as dt
import math
import os
from importlib.metadata import version
from pathlib import Path
from typing import Protocol

import numpy as np
from jplephem.spk import SPK

from . import pack as packfmt
from .bodies import BodySpec
from .chebyshev import evaluate, fit, quantise
from .kernel import file_md5

# The obliquity of the ecliptic at J2000 that Horizons and SPICE's ECLIPJ2000 use
# (84381.448 arcseconds, IAU 1976), so the rails share the fixtures' frame.
_EPS = math.radians(84381.448 / 3600.0)
CHECK_POINTS = 24


class FitError(RuntimeError):
    """A quantised segment strays further than the tolerance from its source."""


class PositionSource(Protocol):
    def position(self, target: int, center: int, et) -> np.ndarray:
        """km, ecliptic J2000, at ET (a float or a 1-D array): shape (3,) or (3, n)."""
        ...


class KernelSource:
    """A NAIF SPK read with jplephem, rotated from ICRF to the ecliptic of J2000. Chains to
    the barycentre cancel their shared part: the Sun-relative EMB is (0 to 3) minus (0 to
    10) and the geocentric Moon (3 to 301) minus (3 to 399), as the plan defines them."""

    def __init__(self, path: Path) -> None:
        self._segments = {s.target: s for s in SPK.open(str(path)).segments}
        # The file's own MD5, so a pack or report names exactly the kernel it read.
        self.source = {"kind": "spk", "file": Path(path).name, "md5": file_md5(path), "producer": "NASA/JPL"}

    def _chain(self, body: int) -> list:
        chain = []
        while body != 0:
            chain.append(self._segments[body])
            body = chain[-1].center
        return chain

    def position(self, target: int, center: int, et) -> np.ndarray:
        up, down = self._chain(target), self._chain(center)
        while up and down and up[-1] is down[-1]:
            up.pop()
            down.pop()
        days = np.asarray(et, dtype=np.float64) / 86400.0
        jd0 = np.full(np.shape(days), 2451545.0)
        eq = sum(s.compute(jd0, days) for s in up) - sum(s.compute(jd0, days) for s in down)
        cos_e, sin_e = math.cos(_EPS), math.sin(_EPS)
        return np.stack([eq[0], cos_e * eq[1] + sin_e * eq[2], -sin_e * eq[1] + cos_e * eq[2]])


def _fit_body(source: PositionSource, body: BodySpec, year: int, tolerance_km: float) -> np.ndarray:
    from_et, to_et = packfmt.decade_start_et(year), packfmt.decade_start_et(year + 10)
    count = packfmt.segment_count(from_et, to_et, body.segment_s)
    out = np.empty((count, 3, body.degree + 1))
    for i in range(count):
        t0, t1 = from_et + i * body.segment_s, min(from_et + (i + 1) * body.segment_s, to_et)
        out[i] = quantise(fit(lambda t: source.position(body.target, body.center, t), t0, t1, body.degree))
        ts = np.linspace(t0, t1, CHECK_POINTS)
        err = np.linalg.norm(evaluate(out[i][:, None, :], t0, t1, ts) - source.position(body.target, body.center, ts), axis=0)
        if not err.max() <= tolerance_km:
            raise FitError(f"{body.name} segment {i} of decade {year} (ET {t0} to {t1}) is {err.max():.3f} km off, over {tolerance_km} km")
    return out


def generate(
    kernel: PositionSource, bodies: list[BodySpec], window: tuple[int, int], tolerance_km: float, *, constants: dict | None = None
) -> packfmt.Pack:
    """Fit every body over the decades of `window` (years on decade boundaries), check
    each quantised segment at 24 points against the source, and return the pack."""
    first, last = window
    if first % 10 or last % 10 or last <= first:
        raise ValueError(f"window {window} must run between decade boundaries, such as (1950, 2150)")
    blobs = {}
    for year in range(first, last, 10):
        a, b = packfmt.decade_start_et(year), packfmt.decade_start_et(year + 10)
        blocks = {s.target: packfmt.Block(s.degree, s.segment_s, _fit_body(kernel, s, year, tolerance_km)) for s in bodies}
        blobs[f"{year}.bin"] = packfmt.encode_decade(a, b, blocks)
    build = packfmt.fnv1a64(packfmt.data_section(b) for b in blobs.values())
    blobs = {name: packfmt.with_build(b, build) for name, b in blobs.items()}
    source = getattr(kernel, "source", {"kind": "unspecified"})
    # SOURCE_DATE_EPOCH (reproducible-builds.org) makes two builds byte-identical.
    stamp = os.environ.get("SOURCE_DATE_EPOCH")
    utc = dt.datetime.fromtimestamp(int(stamp), dt.timezone.utc) if stamp else dt.datetime.now(dt.timezone.utc)
    manifest = {
        "schema": packfmt.SCHEMA,
        "id": f"starshot-{Path(source.get('file', source['kind'])).stem}-{first}-{last}-{tolerance_km:g}km",
        "time_scale": "TDB",
        "time_argument": "seconds past J2000 TDB (ET)",
        "frame": "ECLIPJ2000",
        "units": {"length": "km", "velocity": "km/s", "gm": "km^3/s^2"},
        "generated": {"by": f"tools/ephem {version('starshot-ephem')}", "utc": utc.strftime("%Y-%m-%dT%H:%M:%SZ"), "last_modifier": "Starshot"},
        "fit": {"tolerance_km": tolerance_km, "check_points_per_segment": CHECK_POINTS},
        "bodies": [
            {"id": s.name, "naif_id": s.target, "center": s.center_name, "center_naif_id": s.center, "source": source}
            | {"coverage_et": [packfmt.decade_start_et(first), packfmt.decade_start_et(last)]}
            | {"encoding": {"kind": "chebyshev", "segment_s": s.segment_s, "degree": s.degree, "c0": "f64", "rest": "f32"}}
            | {"validation": f"validation/{s.name}.json"}
            for s in bodies
        ],
        "constants": dict(constants or {}),
        "build": f"{build:016x}",
        "decades": packfmt.decades_manifest(blobs),
    }
    return packfmt.Pack(manifest, blobs)
