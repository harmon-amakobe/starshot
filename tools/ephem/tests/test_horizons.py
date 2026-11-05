# SPDX-License-Identifier: Apache-2.0
"""The Horizons client: parsing, errors inside a 200 answer, the cache and retries.

No test reaches the network: urlopen is replaced, and the sample is a real answer (the
geocentric Moon at two epochs) kept in tests/data.
"""

import io
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from ephem import HorizonsError, fetch_vectors, parse_vectors

SAMPLE = json.loads((Path(__file__).parent / "data" / "horizons_sample.json").read_text(encoding="utf-8"))
MOON = ("301", "500@399", [2451545.0, 2461344.5])


def test_sample_gives_rows_signature_and_source():
    parsed = parse_vectors(SAMPLE)
    assert (parsed["api_signature"], parsed["ephemeris_source"]) == ("1.2", "DE441")
    assert [row["jdTdb"] for row in parsed["rows"]] == [2451545.0, 2461344.5]
    assert parsed["rows"][0]["r"] == [-2.916083841877129e05, -2.749797416731504e05, 3.627119662699287e04]
    assert parsed["rows"][0]["v"] == [6.435313889889519e-01, -7.309839826871004e-01, -1.150646473918648e-02]


def test_an_error_inside_a_200_answer_raises_with_its_message():
    with pytest.raises(HorizonsError, match="out of bounds"):
        parse_vectors({"signature": {"version": "1.2"}, "error": "DXREAD: requested IOBJ= ******** is out of bounds"})
    with pytest.raises(HorizonsError, match="No ephemeris"):
        parse_vectors({"signature": {"version": "1.2"}, "result": 'header\nNo ephemeris for target "Moon" after A.D. 2500\n'})


class FakeApi:
    """urlopen stand-in: answers from a script (an int is an HTTP error) and counts calls."""

    def __init__(self, *answers):
        self.answers, self.calls = list(answers), 0

    def __call__(self, url, timeout=None):
        self.calls += 1
        answer = self.answers.pop(0)
        if isinstance(answer, int):
            raise urllib.error.HTTPError(url, answer, "busy", {}, io.BytesIO(b"busy"))
        return io.BytesIO(json.dumps(answer).encode("utf-8"))


def test_second_fetch_reads_the_cache_not_the_network(tmp_path, monkeypatch):
    api = FakeApi(SAMPLE)
    monkeypatch.setattr(urllib.request, "urlopen", api)
    first = fetch_vectors(*MOON, cache_dir=tmp_path)
    assert fetch_vectors(*MOON, cache_dir=tmp_path) == first
    assert api.calls == 1 and first["fetched_utc"].endswith("Z")
    for part in ("COMMAND=%27301%27", "CENTER=%27500%40399%27", "TLIST=%272451545.0+2461344.5%27"):
        assert part in first["query"]


def test_busy_answers_are_retried_with_backoff(tmp_path, monkeypatch):
    api, waits = FakeApi(503, 429, SAMPLE), []
    monkeypatch.setattr(urllib.request, "urlopen", api)
    monkeypatch.setattr(time, "sleep", waits.append)
    fetch_vectors(*MOON, cache_dir=tmp_path)
    assert (waits, api.calls) == ([1, 2], 3)


def test_an_error_answer_is_not_cached(tmp_path, monkeypatch):
    monkeypatch.setattr(urllib.request, "urlopen", FakeApi({"error": "bad target"}))
    with pytest.raises(HorizonsError, match="bad target"):
        fetch_vectors("999", "500@10", [2451545.0], cache_dir=tmp_path)
    assert list(tmp_path.iterdir()) == []
