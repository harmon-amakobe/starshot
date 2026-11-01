#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Ask astlo for the Moon (Contin.lunars) and print the numeric fields as JSON.

Calls astlo's public API only. Run with the Python of a virtualenv where you
installed the astlo wheel yourself:

    MPLBACKEND=Agg <venv>/bin/python -I run_moon.py > moon.json
"""
import io, json, time, contextlib
with contextlib.redirect_stdout(io.StringIO()):   # astlo prints on import; keep stdout pure JSON
    from astlo import Contin
c = Contin()
with contextlib.redirect_stdout(io.StringIO()):
    t = time.time(); r = c.lunars('EARTH')
print(json.dumps({'unix': t, 'type': type(r).__name__, 'keys': list(r.keys()) if isinstance(r, dict) else str(r)[:300],
                  'sample': {k: v for k, v in (r.items() if isinstance(r, dict) else []) if isinstance(v, (int, float))}}, default=str))
