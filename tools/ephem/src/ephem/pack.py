# SPDX-License-Identifier: Apache-2.0
"""The ephem.pack/1 rails pack: pack.json plus one little-endian decade file per decade.

Decade file layout (docs/plans/v1-starshot/00-plan.md, PR8):

    offset 0   4 bytes  "SSEP"
           4   u16      format version = 1
           6   u16      body count
           8   u64      pack build: FNV-1a 64 over the data sections of all decade files
          16   f64      decade start ET
          24   f64      decade end ET
          32   body table, 24 bytes per body: u16 body code, u16 degree, u32 segment
               count, f64 segment length [s], u32 data offset from file start, u32 0
    then  data: per body, per segment: 3 x f64 (c0 for x, y, z), then 3 x degree x f32
               (c1..c_degree for x, then y, then z)

Segments tile the decade from its start; the last one ends at the decade's end, its own
shorter span mapped to -1 to 1. Every header is checked on read, so an offset or count
that points outside its file is an error, never a read past the end.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
import struct
from dataclasses import dataclass, field
from pathlib import Path
from typing import NamedTuple

import numpy as np

from .chebyshev import evaluate

HEADER = struct.Struct("<4sHHQdd")
ENTRY = struct.Struct("<HHIdII")
SCHEMA = "ephem.pack/1"


class PackError(ValueError):
    """A pack or decade file that does not follow ephem.pack/1."""


class Block(NamedTuple):
    degree: int
    segment_s: float
    coeffs: np.ndarray  # (segments, 3, degree + 1), float64


class Decade(NamedTuple):
    build: int
    from_et: float
    to_et: float
    bodies: dict[int, Block]


def decade_start_et(year: int) -> float:
    """ET of YYYY-01-01T00:00:00 TDB: whole days from 2000-01-01, less the 12 hours
    between that midnight and J2000's noon."""
    return (dt.date(year, 1, 1) - dt.date(2000, 1, 1)).days * 86400.0 - 43200.0


def segment_count(from_et: float, to_et: float, segment_s: float) -> int:
    return math.ceil((to_et - from_et) / segment_s)


def _record(degree: int) -> np.dtype:
    return np.dtype([("c0", "<f8", (3,)), ("rest", "<f4", (3, degree))])


def fnv1a64(chunks) -> int:
    h = 0xCBF29CE484222325
    for chunk in chunks:
        for byte in chunk:
            h = ((h ^ byte) * 0x100000001B3) & 0xFFFFFFFFFFFFFFFF
    return h


def data_section(blob: bytes) -> bytes:
    return blob[HEADER.size + ENTRY.size * HEADER.unpack_from(blob)[2] :]


def with_build(blob: bytes, build: int) -> bytes:
    return blob[:8] + struct.pack("<Q", build) + blob[16:]


def encode_decade(from_et: float, to_et: float, blocks: dict[int, Block]) -> bytes:
    """One decade file, its build field zero until every decade exists (with_build)."""
    offset = HEADER.size + ENTRY.size * len(blocks)
    table, data = b"", b""
    for code, (degree, segment_s, coeffs) in blocks.items():
        count = segment_count(from_et, to_et, segment_s)
        if coeffs.shape != (count, 3, degree + 1):
            raise PackError(f"body {code}: coefficients {coeffs.shape} do not tile the decade")
        rec = np.zeros(count, dtype=_record(degree))
        rec["c0"], rec["rest"] = coeffs[:, :, 0], coeffs[:, :, 1:]
        table += ENTRY.pack(code, degree, count, segment_s, offset, 0)
        data += rec.tobytes()
        offset += rec.nbytes
    return HEADER.pack(b"SSEP", 1, len(blocks), 0, from_et, to_et) + table + data


def decode_decade(blob: bytes, name: str = "decade") -> Decade:
    """Parse and bounds-check one decade file."""
    if len(blob) < HEADER.size:
        raise PackError(f"{name}: {len(blob)} bytes is shorter than the header")
    magic, version, nbodies, build, from_et, to_et = HEADER.unpack_from(blob)
    if magic != b"SSEP" or version != 1 or not (math.isfinite(from_et) and math.isfinite(to_et) and to_et > from_et):
        raise PackError(f"{name}: not an SSEP version 1 file with a valid span")
    bodies, expected = {}, HEADER.size + ENTRY.size * nbodies
    if expected > len(blob):
        raise PackError(f"{name}: body table runs past the end of the file")
    for i in range(nbodies):
        code, degree, count, segment_s, offset, reserved = ENTRY.unpack_from(blob, HEADER.size + ENTRY.size * i)
        if reserved != 0 or degree < 1 or not math.isfinite(segment_s) or segment_s <= 0 or code in bodies:
            raise PackError(f"{name}: body {code} has a bad table entry")
        if count != segment_count(from_et, to_et, segment_s):
            raise PackError(f"{name}: body {code}'s {count} segments do not tile the decade")
        rec = _record(degree)
        # Data sections are contiguous, in table order, and end exactly at the file end.
        if offset != expected or offset + rec.itemsize * count > len(blob):
            raise PackError(f"{name}: body {code}'s data offset {offset} is outside its section")
        raw = np.frombuffer(blob, dtype=rec, count=count, offset=offset)
        coeffs = np.empty((count, 3, degree + 1))
        coeffs[:, :, 0], coeffs[:, :, 1:] = raw["c0"], raw["rest"]
        bodies[code] = Block(degree, segment_s, coeffs)
        expected = offset + rec.itemsize * count
    if expected != len(blob):
        raise PackError(f"{name}: {len(blob) - expected} bytes after the last data section")
    return Decade(build, from_et, to_et, bodies)


def decades_manifest(blobs: dict[str, bytes]) -> list[dict]:
    """pack.json's `decades`: each file's coverage, size and SHA-256."""
    spans = {name: decode_decade(blob, name) for name, blob in blobs.items()}
    return [
        {"file": n, "from_et": d.from_et, "to_et": d.to_et, "bytes": len(blobs[n]), "sha256": hashlib.sha256(blobs[n]).hexdigest()}
        for n, d in spans.items()
    ]


@dataclass
class Pack:
    """The manifest (pack.json) and the decade files' bytes, in decade order."""

    manifest: dict
    decades: dict[str, bytes]
    _parsed: list[Decade] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        entries = self.manifest.get("decades", [])
        if self.manifest.get("schema") != SCHEMA or [e["file"] for e in entries] != list(self.decades) or not entries:
            raise PackError(f"the manifest is not {SCHEMA}, or its decades and the decade files differ")
        self._parsed = []
        for e in entries:
            d = decode_decade(self.decades[e["file"]], e["file"])
            if (d.from_et, d.to_et) != (e["from_et"], e["to_et"]) or (self._parsed and d.from_et != self._parsed[-1].to_et):
                raise PackError(f"{e['file']}: its span differs from pack.json or leaves a gap")
            self._parsed.append(d)
        self._codes = {b["id"]: b["naif_id"] for b in self.manifest["bodies"]}

    @property
    def coverage_et(self) -> tuple[float, float]:
        return self._parsed[0].from_et, self._parsed[-1].to_et

    def position(self, body: str, et) -> np.ndarray:
        """Position of `body` (a manifest id such as "MOON") at ET: (3,) or (3, n) km.

        A decade serves [from, to) and the last one also its end. Inside a decade, a
        time on a segment boundary belongs to the segment that starts there, and the
        decade's end to its last segment.
        """
        if body not in self._codes:
            raise PackError(f"the pack has no body {body}")
        ets = np.atleast_1d(np.asarray(et, dtype=np.float64))
        lo, hi = self.coverage_et
        outside = ~((ets >= lo) & (ets <= hi))
        if outside.any():
            raise PackError(f"ET {ets[outside][0]} is outside the pack's coverage {self.coverage_et}")
        # Each time gets exactly one decade: the last one starting at or before it.
        starts = np.array([d.from_et for d in self._parsed])
        which = np.minimum(np.searchsorted(starts, ets, side="right") - 1, len(starts) - 1)
        out = np.empty((3, ets.size))
        for k in np.unique(which):
            d, inside = self._parsed[k], which == k
            if self._codes[body] not in d.bodies:
                raise PackError(f"decade at ET {d.from_et} has no body {body}")
            degree, seg, coeffs = d.bodies[self._codes[body]]
            t = ets[inside]
            idx = np.minimum(np.floor((t - d.from_et) / seg).astype(np.int64), len(coeffs) - 1)
            t0 = d.from_et + idx * seg
            t1 = np.minimum(t0 + seg, d.to_et)
            out[:, inside] = evaluate(coeffs[idx], t0[:, None], t1[:, None], t[:, None]).T
        return out[:, 0] if np.ndim(et) == 0 else out


def write(pack: Pack, out_dir: Path) -> None:
    """Write the decade files and pack.json into `out_dir`."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for name, blob in pack.decades.items():
        (out / name).write_bytes(blob)
    (out / "pack.json").write_text(json.dumps(pack.manifest, indent=2) + "\n", encoding="utf-8")


def read(pack_dir: Path) -> Pack:
    """Read a pack, failing on any file whose size, SHA-256 or build value disagrees."""
    root = Path(pack_dir)
    manifest = json.loads((root / "pack.json").read_text(encoding="utf-8"))
    blobs = {e["file"]: (root / e["file"]).read_bytes() for e in manifest.get("decades", [])}
    for e in manifest.get("decades", []):
        if len(blobs[e["file"]]) != e["bytes"] or hashlib.sha256(blobs[e["file"]]).hexdigest() != e["sha256"]:
            raise PackError(f"{e['file']}: size or SHA-256 differs from pack.json; rebuild the pack")
    pack = Pack(manifest, blobs)
    build = fnv1a64(data_section(b) for b in blobs.values())
    if f"{build:016x}" != manifest.get("build") or any(d.build != build for d in pack._parsed):
        raise PackError("the pack build value differs from the decade files' data; rebuild the pack")
    return pack
