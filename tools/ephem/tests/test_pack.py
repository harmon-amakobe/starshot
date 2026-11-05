# SPDX-License-Identifier: Apache-2.0
"""The decade file format, written here independently from the plan's byte layout.

Each synthetic segment holds only c0 = (segment index, decade year, body code), so a
lookup names the segment it used and the decade-edge rules can be checked exactly.
"""

import hashlib
import json
import math
import struct

import numpy as np
import pytest

from ephem import Pack, PackError, decade_start_et, read_pack, write_pack

# Code, degree, segment length. 913 days tiles 2010 to 2020 (3,652 days) exactly, so the
# pack's last instant falls on a segment end rather than inside a shorter last segment.
BODIES = [(301, 3, 32 * 86400.0), (2, 2, 256 * 86400.0), (5, 1, 913 * 86400.0)]
NAMES = {301: "MOON", 2: "VENUS", 5: "JUPITER"}
EDGE = decade_start_et(2010)


def decade_file(year: int, build: int) -> bytes:
    start, end = decade_start_et(year), decade_start_et(year + 10)
    table, data, offset = b"", b"", 32 + 24 * len(BODIES)
    for code, degree, seg in BODIES:
        count = math.ceil((end - start) / seg)
        block = b"".join(struct.pack(f"<3d{3 * degree}f", i, year, code, *[0.0] * 3 * degree) for i in range(count))
        table += struct.pack("<HHIdII", code, degree, count, seg, offset, 0)
        data, offset = data + block, offset + len(block)
    return struct.pack("<4sHHQdd", b"SSEP", 1, len(BODIES), build, start, end) + table + data


def synthetic_pack() -> Pack:
    h = 0xCBF29CE484222325  # FNV-1a 64 over both data sections, in decade order
    for byte in b"".join(decade_file(y, 0)[32 + 24 * len(BODIES) :] for y in (2000, 2010)):
        h = ((h ^ byte) * 0x100000001B3) % 2**64
    blobs = {f"{y}.bin": decade_file(y, h) for y in (2000, 2010)}
    decades = [
        {"file": f"{y}.bin", "from_et": decade_start_et(y), "to_et": decade_start_et(y + 10), "bytes": len(b), "sha256": hashlib.sha256(b).hexdigest()}
        for y, b in zip((2000, 2010), blobs.values(), strict=True)
    ]
    bodies = [{"id": NAMES[code], "naif_id": code} for code, _, _ in BODIES]
    return Pack({"schema": "ephem.pack/1", "id": "synthetic", "bodies": bodies, "build": f"{h:016x}", "decades": decades}, blobs)


def where(pack, body, et):
    return tuple(int(v) for v in pack.position(body, et))


def test_decade_start_is_tdb_midnight_on_january_first():
    assert (decade_start_et(1950), decade_start_et(2000), decade_start_et(2150)) == (-1577880000.0, -43200.0, 4733553600.0)


def test_round_trip_keeps_every_byte_and_header_field(tmp_path):
    pack = synthetic_pack()
    write_pack(pack, tmp_path)
    back = read_pack(tmp_path)
    assert back.decades == pack.decades
    blob = (tmp_path / "2010.bin").read_bytes()
    magic, version, count, build, start, end = struct.unpack_from("<4sHHQdd", blob, 0)
    assert (magic, version, count, f"{build:016x}") == (b"SSEP", 1, 3, back.manifest["build"])
    assert (start, end) == (EDGE, decade_start_et(2020))
    assert struct.unpack_from("<HHIdII", blob, 32) == (301, 3, 115, 2764800.0, 104, 0)
    assert struct.unpack_from("<HHIdII", blob, 56) == (2, 2, 15, 256 * 86400.0, 104 + 115 * (24 + 36), 0)
    offset = 104 + 115 * 60 + 15 * (24 + 24)
    assert struct.unpack_from("<HHIdII", blob, 80) == (5, 1, 4, 913 * 86400.0, offset, 0)
    assert len(blob) == offset + 4 * (24 + 12)


def test_segment_lookup_at_decade_and_segment_edges():
    pack, seg = synthetic_pack(), 32 * 86400.0
    start = decade_start_et(2000)
    assert where(pack, "MOON", start) == (0, 2000, 301)
    assert where(pack, "MOON", start + seg - 1.0) == (0, 2000, 301)
    assert where(pack, "MOON", start + seg) == (1, 2000, 301)
    # A decade boundary belongs to the decade that starts there; the instant before it
    # is the previous decade's last, shorter segment.
    assert where(pack, "MOON", EDGE) == (0, 2010, 301)
    assert where(pack, "MOON", EDGE - 1.0) == (114, 2000, 301)
    assert where(pack, "JUPITER", EDGE - 1.0) == (4, 2000, 5)
    # The pack's own end is served by its last segment, also when it ends exactly there.
    assert where(pack, "MOON", decade_start_et(2020)) == (114, 2010, 301)
    assert where(pack, "JUPITER", decade_start_et(2020)) == (3, 2010, 5)
    many = pack.position("VENUS", np.array([EDGE - 1.0, EDGE, EDGE + 256 * 86400.0]))
    assert many[0].tolist() == [14, 0, 1]
    for outside in (start - 1.0, decade_start_et(2020) + 1.0):
        with pytest.raises(PackError, match="outside"):
            pack.position("MOON", outside)


def poke(at, fmt, value):  # damage one field of 2000.bin
    return lambda m, b: b.update({"2000.bin": b["2000.bin"][:at] + struct.pack(fmt, value) + b["2000.bin"][at + struct.calcsize(fmt) :]})


INTEGRITY = {
    "build in a header": (poke(8, "<Q", 1), "build value"),
    "build in pack.json": (lambda m, b: m.update(build="0" * 16), "build value"),
    "magic": (poke(0, "<4s", b"SSEQ"), "not an SSEP"),
    "version": (poke(4, "<H", 2), "not an SSEP"),
    "segment count": (poke(32 + 4, "<I", 116), "do not tile"),
    "reserved field": (poke(32 + 20, "<I", 1), "bad table entry"),
    "offset not contiguous": (poke(32 + 16, "<I", 104 + 60), "data offset"),
    "offset past the end": (poke(32 + 16, "<I", 1 << 20), "data offset"),
    "truncated": (lambda m, b: b.update({"2000.bin": b["2000.bin"][:-1]}), "data offset"),
    "trailing bytes": (lambda m, b: b.update({"2000.bin": b["2000.bin"] + b"\0"}), "after the last"),
    "span against pack.json": (lambda m, b: m["decades"][0].update(to_et=EDGE + 1.0), "span differs"),
    "decades out of order": (lambda m, b: m["decades"].reverse(), "leaves a gap"),
    "schema": (lambda m, b: m.update(schema="ephem.pack/2"), "is not ephem.pack/1"),
}


@pytest.mark.parametrize(("damage", "message"), INTEGRITY.values(), ids=INTEGRITY)
def test_each_integrity_check_rejects_its_own_damage(tmp_path, damage, message):
    manifest, blobs = json.loads(json.dumps(synthetic_pack().manifest)), dict(synthetic_pack().decades)
    damage(manifest, blobs)
    for e in manifest["decades"]:  # fresh sizes and hashes, so only the damaged check can fire
        e |= {"bytes": len(blobs[e["file"]]), "sha256": hashlib.sha256(blobs[e["file"]]).hexdigest()}
        (tmp_path / e["file"]).write_bytes(blobs[e["file"]])
    (tmp_path / "pack.json").write_text(json.dumps(manifest))
    with pytest.raises(PackError, match=message):
        read_pack(tmp_path)


def test_read_rejects_a_changed_byte(tmp_path):
    write_pack(synthetic_pack(), tmp_path)
    blob = (tmp_path / "2000.bin").read_bytes()
    (tmp_path / "2000.bin").write_bytes(blob[:-1] + bytes([blob[-1] ^ 1]))
    with pytest.raises(PackError, match="SHA-256"):
        read_pack(tmp_path)
