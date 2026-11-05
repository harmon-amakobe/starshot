# SPDX-License-Identifier: Apache-2.0
"""The kernel download keeps only NAIF's exact file. No test reaches the network."""

import io
import urllib.request

import pytest

from ephem import KernelError, ensure_gm_kernel, ensure_kernel


def test_a_download_with_the_wrong_md5_raises_and_keeps_nothing(tmp_path, monkeypatch):
    monkeypatch.setattr(urllib.request, "urlopen", lambda url, timeout=None: io.BytesIO(b"not a kernel"))
    target = tmp_path / "de440s.bsp"
    with pytest.raises(KernelError, match="3917ee56769db332790c751e2168843d"):
        ensure_kernel(target)
    assert list(tmp_path.iterdir()) == []


def test_a_present_file_with_the_wrong_md5_raises_and_is_left_alone(tmp_path, monkeypatch):
    monkeypatch.setattr(urllib.request, "urlopen", None)  # a present file is never downloaded again
    target = tmp_path / "gm_de440.tpc"
    target.write_bytes(b"KPL/PCK edited by hand")
    with pytest.raises(KernelError, match="Delete the file"):
        ensure_gm_kernel(target)
    assert target.read_bytes() == b"KPL/PCK edited by hand"
