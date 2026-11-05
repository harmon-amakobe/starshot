# SPDX-License-Identifier: Apache-2.0
"""NAIF kernels, downloaded once and checked against a pinned MD5 before every use. The
SPK (about 32 MB) is never committed. A mismatch is an error, never a warning: another
kernel would silently change every rail."""

from __future__ import annotations

import hashlib
import os
import shutil
import urllib.request
from pathlib import Path

NAIF = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels"
DE440S_MD5 = "3917ee56769db332790c751e2168843d"
# NAIF lists no checksum for gm_de440.tpc (12,406 bytes, dated 2022-12-14 in its
# listing); this MD5 was measured on first download and pins that exact file.
GM_DE440_MD5 = "a6bb37afab6815c9573a3ec208a8199a"


class KernelError(RuntimeError):
    """A kernel is not the file its MD5 pins."""


def file_md5(path: Path) -> str:
    digest = hashlib.md5(usedforsecurity=False)
    with Path(path).open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def _ensure(path: Path, url: str, md5: str) -> Path:
    path = Path(path)
    if path.exists():
        if (got := file_md5(path)) != md5:
            raise KernelError(f"{path} has MD5 {got}, but {url} is pinned to {md5}. Delete the file and run again.")
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_name(f"{path.name}.{os.getpid()}.part")
    try:
        with urllib.request.urlopen(url, timeout=120) as resp, part.open("wb") as out:
            shutil.copyfileobj(resp, out, 1 << 20)
        if (got := file_md5(part)) != md5:
            raise KernelError(f"{url} downloaded with MD5 {got}, expected {md5}; nothing was kept.")
        part.replace(path)
    finally:
        part.unlink(missing_ok=True)
    return path


def ensure_kernel(path: Path) -> Path:
    """de440s.bsp at `path`: downloaded from NAIF when absent, MD5-checked always."""
    return _ensure(path, f"{NAIF}/spk/planets/de440s.bsp", DE440S_MD5)


def ensure_gm_kernel(path: Path) -> Path:
    """gm_de440.tpc at `path`: downloaded from NAIF when absent, MD5-checked always."""
    return _ensure(path, f"{NAIF}/pck/gm_de440.tpc", GM_DE440_MD5)
