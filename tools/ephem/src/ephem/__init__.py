# SPDX-License-Identifier: Apache-2.0
"""Starshot's ephemeris tool: Horizons fixtures, NAIF kernels and the DE440 rails pack.

Only the names imported here are public. Tests import from `ephem` and check behaviour
and file formats, so another implementation of generate() and validate() could satisfy
them (D29).
"""

from .bodies import BODIES, BodySpec
from .chebyshev import evaluate, fit, quantise
from .conformance import conformance_text, rails_conformance
from .constants import emrat, gm_values, pack_constants
from .fixtures import EPOCHS_JD_TDB, SERIES, TARGETS, write_horizons_fixture
from .generate import FitError, KernelSource, PositionSource, generate
from .horizons import HorizonsError, fetch_vectors, parse_vectors
from .kernel import DE440S_MD5, GM_DE440_MD5, KernelError, ensure_gm_kernel, ensure_kernel
from .pack import Pack, PackError, decade_start_et
from .pack import read as read_pack
from .pack import write as write_pack
from .validate import HorizonsFixture, Report, validate, write_report
