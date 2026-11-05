# SPDX-License-Identifier: Apache-2.0
"""Chebyshev fits are exact on polynomials, and quantisation stays inside float32's bound."""

import numpy as np

from ephem import evaluate, fit, quantise

T0, T1 = -1.0e8, -1.0e8 + 32 * 86400.0


def cubic(t):
    s = (t - T0) / 86400.0  # days into the segment, so the terms have kilometre sizes
    return np.stack([2.0e6 + 3.0e4 * s - 50.0 * s**2 + 0.7 * s**3, -1.5e6 + 9.0 * s**2, 4.0e3 - 0.2 * s**3])


def test_a_cubic_is_fitted_exactly():
    coeffs = fit(cubic, T0, T1, 3)
    ts = np.linspace(T0, T1, 101)
    assert coeffs.shape == (3, 4)
    assert np.max(np.abs(evaluate(coeffs[:, None, :], T0, T1, ts) - cubic(ts))) < 1e-9 * 2.0e6
    # A higher degree adds only coefficients that are zero to rounding.
    high = fit(cubic, T0, T1, 9)
    assert np.max(np.abs(high[:, 4:])) < 1e-6


def test_quantisation_error_stays_under_the_float32_bound():
    rng = np.random.default_rng(7)
    coeffs = rng.normal(scale=[[3.0e8, 1.0e8, 2.0e6, 4.0e4, 900.0, 12.0, 0.3]], size=(3, 7))
    q = quantise(coeffs)
    assert np.array_equal(q[:, 0], coeffs[:, 0])  # c0 keeps every float64 bit
    rest = np.abs(q[:, 1:] - coeffs[:, 1:])
    assert np.all(rest <= np.abs(coeffs[:, 1:]) * 2.0**-24)
    # So the value moves by no more than the sum of those bounds, anywhere in the segment.
    ts = np.linspace(T0, T1, 257)
    moved = np.abs(evaluate(q[:, None, :], T0, T1, ts) - evaluate(coeffs[:, None, :], T0, T1, ts))
    bound = np.sum(np.abs(coeffs[:, 1:]), axis=1, keepdims=True) * 2.0**-24
    assert np.all(moved <= bound * (1 + 1e-9) + 1e-6)
