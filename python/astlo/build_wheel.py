#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Build the fixed astlo wheel from python/astlo/ (Python standard library only).

This script is Starshot's own code (Apache-2.0). It packages Mark Macharia's astlo source
in python/astlo/astlo/ (his code, all rights reserved, with Starshot's fixes; see
python/astlo/README.md) together with his published dist-info, into

    <outdir>/astlo-<version>-py3-none-any.whl

What it changes in the metadata, and nothing else:
  * METADATA ``Version:`` becomes <version>; the default is Mark's own version plus
    the PEP 440 local label "+starshot.1", today 12.5.5130000+starshot.1. A local
    label marks a patched downstream build, and PyPI refuses to host one, so this
    wheel cannot be mistaken for, or uploaded as, an official astlo release;
  * METADATA's description (the body after the headers) gains one first line saying
    the same in words, because the version alone is easy to overlook;
  * WHEEL ``Generator:`` names this script instead of setuptools;
  * the dist-info folder is renamed to match the version, and RECORD is written
    fresh (sha256, urlsafe base64 without padding, and size for every file).

The archive is reproducible: files are added in sorted order with a fixed
timestamp (SOURCE_DATE_EPOCH if set, else 2026-11-01 00:00:00 UTC), fixed
permissions (0644) and a fixed "created on" system, so the same source and zlib give
a byte-identical wheel (checked across runs and across Python 3.11 to 3.13).

    python3 python/astlo/build_wheel.py                    # -> python/astlo/dist/
    python3 python/astlo/build_wheel.py --outdir <folder>
    python3 python/astlo/build_wheel.py --version 12.5.5130000+starshot.2
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import os
import pathlib
import re
import sys
import time
import zipfile

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE / "astlo"
DEFAULT_EPOCH = 1793491200  # 2026-11-01T00:00:00Z
GENERATOR = "starshot python/astlo/build_wheel.py (zipfile)"
# A normalised PEP 440 version that must carry a "+starshot.N" local label: every build
# of this folder contains Starshot's changes, so none may look like Mark's own release.
VERSION_RE = re.compile(r"^\d+(\.\d+)*((a|b|rc)\d+)?(\.post\d+)?(\.dev\d+)?\+starshot\.\d+$")
LOCAL_LABEL = "+starshot.1"
NOTE = (
    "**Starshot-patched build, not an official astlo release:** Mark Macharia's astlo "
    "with Starshot's fixes (python/astlo in the Starshot repository); Mark keeps all "
    "rights to his code."
)


def source_dist_info() -> pathlib.Path:
    """Mark's dist-info folder as imported (exactly one is expected)."""
    found = sorted(HERE.glob("astlo-*.dist-info"))
    if len(found) != 1:
        sys.exit(f"build_wheel: expected one astlo-*.dist-info in {HERE.name}/, found {len(found)}")
    return found[0]


def record_hash(data: bytes) -> str:
    digest = base64.urlsafe_b64encode(hashlib.sha256(data).digest()).rstrip(b"=").decode("ascii")
    return f"sha256={digest}"


def default_version() -> str:
    """Mark's version from his METADATA, labelled: 12.5.5130000 -> 12.5.5130000+starshot.1."""
    meta = (source_dist_info() / "METADATA").read_text(encoding="utf-8")
    m = re.search(r"^Version: (\S+)$", meta, flags=re.M)
    if not m:
        sys.exit("build_wheel: METADATA has no Version: line")
    return f"{m.group(1)}{LOCAL_LABEL}"


def zip_date_time() -> tuple[int, int, int, int, int, int]:
    epoch = int(os.environ.get("SOURCE_DATE_EPOCH", DEFAULT_EPOCH))
    epoch = max(epoch, 315532800)  # zip cannot store dates before 1980-01-01
    return time.gmtime(epoch)[:6]


def with_note(meta: str) -> str:
    """METADATA with NOTE as the description's first paragraph.

    In core metadata the description is the body after the first blank line; Mark's
    has one (Markdown), and a METADATA without a body gets NOTE as its whole body.
    """
    head, sep, body = meta.partition("\n\n")
    if not sep:
        return meta.rstrip("\n") + "\n\n" + NOTE + "\n"
    return head + "\n\n" + NOTE + "\n\n" + body


def collect(version: str) -> list[tuple[str, bytes]]:
    di_src = source_dist_info()
    di = f"astlo-{version}.dist-info"
    files: list[tuple[str, bytes]] = []
    # The package: every .py file in python/astlo/astlo (never __pycache__ or editor files).
    sources = sorted(p for p in PKG.iterdir() if p.is_file() and p.suffix == ".py")
    if not any(p.name == "__init__.py" for p in sources):
        sys.exit(f"build_wheel: {PKG} has no __init__.py")
    for p in sources:
        files.append((f"astlo/{p.name}", p.read_bytes()))
    # Mark's metadata, with only the version and the description's first line (METADATA)
    # and the generator (WHEEL) changed.
    meta = (di_src / "METADATA").read_text(encoding="utf-8")
    meta, n = re.subn(r"^Version: .*$", f"Version: {version}", meta, count=1, flags=re.M)
    if n != 1:
        sys.exit("build_wheel: METADATA has no Version: line")
    meta = with_note(meta)
    wheel = (di_src / "WHEEL").read_text(encoding="utf-8")
    wheel, n = re.subn(r"^Generator: .*$", f"Generator: {GENERATOR}", wheel, count=1, flags=re.M)
    if n != 1:
        sys.exit("build_wheel: WHEEL has no Generator: line")
    files.append((f"{di}/METADATA", meta.encode("utf-8")))
    files.append((f"{di}/WHEEL", wheel.encode("utf-8")))
    for name in ("entry_points.txt", "top_level.txt"):
        files.append((f"{di}/{name}", (di_src / name).read_bytes()))
    for lic in sorted((di_src / "licenses").rglob("*")):
        if lic.is_file():
            files.append((f"{di}/licenses/{lic.relative_to(di_src / 'licenses').as_posix()}", lic.read_bytes()))
    files.sort(key=lambda f: f[0])
    record = "".join(f"{name},{record_hash(data)},{len(data)}\n" for name, data in files)
    record += f"{di}/RECORD,,\n"
    files.append((f"{di}/RECORD", record.encode("utf-8")))  # RECORD goes last, as installers expect
    return files


def build(version: str, outdir: pathlib.Path) -> pathlib.Path:
    if not VERSION_RE.match(version):
        sys.exit(f"build_wheel: {version!r} is not a normalised PEP 440 version ending {LOCAL_LABEL[:-1]}N")
    files = collect(version)
    outdir.mkdir(parents=True, exist_ok=True)
    whl = outdir / f"astlo-{version}-py3-none-any.whl"
    stamp = zip_date_time()
    with zipfile.ZipFile(whl, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in files:
            info = zipfile.ZipInfo(name, date_time=stamp)
            info.create_system = 3  # "Unix", whatever the build machine is
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, data, compresslevel=9)
    return whl


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--outdir", default=str(HERE / "dist"), help="where to write the wheel (default: python/astlo/dist)")
    ap.add_argument("--version", help="wheel version, ending +starshot.N (default: Mark's version + " + LOCAL_LABEL + ")")
    args = ap.parse_args(argv)
    whl = build(args.version or default_version(), pathlib.Path(args.outdir).resolve())
    digest = hashlib.sha256(whl.read_bytes()).hexdigest()
    print(f"{whl}\n  {whl.stat().st_size} bytes, sha256 {digest}")


if __name__ == "__main__":
    main()
