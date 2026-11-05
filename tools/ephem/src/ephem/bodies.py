# SPDX-License-Identifier: Apache-2.0
"""The bodies of the DE440 rails pack and their fit parameters (the 100 km tier).

These are the plan's measured settings (PR8): each quantised fit stays inside 100 km,
under the 150 km test budget (D17). Planets are system barycentres relative to the Sun,
as JPL's Table 1 describes them; the Moon is geocentric.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BodySpec:
    name: str
    target: int  # NAIF id; also the body code in the decade files
    center: int  # NAIF id
    center_name: str
    segment_days: int
    degree: int

    @property
    def segment_s(self) -> float:
        return self.segment_days * 86400.0


BODIES: tuple[BodySpec, ...] = (
    BodySpec("MERCURY", 1, 10, "SUN", 32, 12),
    BodySpec("VENUS", 2, 10, "SUN", 256, 15),
    BodySpec("EMB", 3, 10, "SUN", 256, 12),
    BodySpec("MARS", 4, 10, "SUN", 512, 17),
    BodySpec("JUPITER", 5, 10, "SUN", 512, 8),
    BodySpec("SATURN", 6, 10, "SUN", 512, 8),
    BodySpec("URANUS", 7, 10, "SUN", 512, 8),
    BodySpec("NEPTUNE", 8, 10, "SUN", 512, 8),
    BodySpec("MOON", 301, 399, "EARTH", 32, 15),
)
