# SPDX-License-Identifier: Apache-2.0
"""Chebyshev fits for one segment of a rail, and the float32 quantisation of the pack.

A fit interpolates at the degree + 1 Chebyshev nodes of the first kind, where the
discrete orthogonality of T_j gives each coefficient as one weighted sum. That is close
to the best uniform fit and needs no least-squares solver, so one machine always
produces the same bits.
"""

from __future__ import annotations

from collections.abc import Callable

import numpy as np
from numpy.polynomial import chebyshev as cheb


def fit(fn: Callable[[np.ndarray], np.ndarray], t0: float, t1: float, degree: int) -> np.ndarray:
    """c_0..c_degree of `fn` on [t0, t1]; `fn` maps an array of times to values with time
    as the last axis, such as (3, n) positions, and the result is (3, degree + 1)."""
    if not t1 > t0:
        raise ValueError(f"empty segment: [{t0}, {t1}]")
    n = degree + 1
    x = np.cos(np.pi * (np.arange(n) + 0.5) / n)
    values = np.asarray(fn(0.5 * (t0 + t1) + 0.5 * (t1 - t0) * x), dtype=np.float64)
    coeffs = (2.0 / n) * (values @ cheb.chebvander(x, degree))
    coeffs[..., 0] *= 0.5
    return coeffs


def quantise(coeffs: np.ndarray) -> np.ndarray:
    """c0 stays float64 (it carries the position); c1 and above round to float32."""
    q = np.array(coeffs, dtype=np.float64)
    q[..., 1:] = q[..., 1:].astype(np.float32).astype(np.float64)
    return q


def evaluate(coeffs: np.ndarray, t0, t1, t) -> np.ndarray:
    """The fitted value at time t, by Clenshaw's recurrence. coeffs (..., degree + 1)
    broadcasts against t0, t1 and t; for one segment at n times, pass coeffs[:, None, :]
    and t of shape (n,) to get (3, n)."""
    c = np.asarray(coeffs, dtype=np.float64)
    x = (2.0 * np.asarray(t, dtype=np.float64) - (t0 + t1)) / (t1 - t0)
    b1 = np.zeros(np.broadcast_shapes(c.shape[:-1], np.shape(x)))
    b2 = np.zeros_like(b1)
    for j in range(c.shape[-1] - 1, 0, -1):
        b1, b2 = 2.0 * x * b1 - b2 + c[..., j], b1
    return x * b1 - b2 + c[..., 0]
