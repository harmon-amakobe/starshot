//! Lambert transfers and the cheapest direct transfer on a grid, as
//! `packages/physics/src/lambert.ts`. The operation order is the TypeScript's, but `norm`,
//! `acos`, `sin`, `cos`, `sinh`, `cosh` and `pow` may differ from V8's in the last bit, so
//! the velocities agree within 1e-9 relative (`tests/conformance_physics.rs`).

use core::f64::consts::PI;
use starshot_ephemeris::vec::{Vec3, cross, dot, norm, sub};
use starshot_ephemeris::{BodyId, Ephemeris};
use starshot_math::{acos, cos, cosh, pow, sin, sinh, sqrt};

fn stumpff_c(z: f64) -> f64 {
    // 2 sin^2(x/2) instead of 1 - cos x: no cancellation as z nears 4 pi^2.
    if z > 1e-6 {
        let h = sin(sqrt(z) / 2.0);
        return (2.0 * h * h) / z;
    }
    if z < -1e-6 {
        return (cosh(sqrt(-z)) - 1.0) / -z;
    }
    1.0 / 2.0 - z / 24.0 + (z * z) / 720.0
}

fn stumpff_s(z: f64) -> f64 {
    if z > 1e-6 {
        let s = sqrt(z);
        return (s - sin(s)) / (s * s * s);
    }
    if z < -1e-6 {
        let s = sqrt(-z);
        return (sinh(s) - s) / (s * s * s);
    }
    1.0 / 6.0 - z / 120.0 + (z * z) / 5040.0
}

/// The single-revolution Lambert problem by universal variables with a bracketed
/// bisection, robust rather than fast: the orbit through `r1` and `r2` [km] in `tof`
/// seconds under `mu` [km^3/s^2], going prograde (counterclockwise seen from ecliptic
/// north) or not. Returns the velocities [km/s] at both ends, or None when the bracket
/// holds no solution, as for a transfer of 180 degrees, whose plane is undefined.
pub fn lambert(r1: Vec3, r2: Vec3, tof: f64, mu: f64, prograde: bool) -> Option<(Vec3, Vec3)> {
    let (n1, n2) = (norm(r1), norm(r2));
    // clamp keeps a NaN, as Math.min and Math.max do.
    let cos_dnu = (dot(r1, r2) / (n1 * n2)).clamp(-1.0, 1.0);
    let mut dnu = acos(cos_dnu);
    let cz = cross(r1, r2)[2];
    if (prograde && cz < 0.0) || (!prograde && cz >= 0.0) {
        dnu = 2.0 * PI - dnu;
    }
    let a = sin(dnu) * sqrt((n1 * n2) / (1.0 - cos(dnu)));
    // A is in km; near a 180-degree transfer the plane is undefined, so give up.
    if !a.is_finite() || a.abs() < 1e-6 * sqrt(n1 * n2) {
        return None;
    }

    let y = |z: f64| n1 + n2 + (a * (z * stumpff_s(z) - 1.0)) / sqrt(stumpff_c(z));
    // The time-of-flight equation times sqrt(mu): increasing in z, zero at the answer.
    let time_gap = |z: f64| {
        let yz = y(z);
        if yz < 0.0 {
            return f64::NEG_INFINITY;
        }
        let c = stumpff_c(z);
        pow(yz / c, 1.5) * stumpff_s(z) + a * sqrt(yz) - sqrt(mu) * tof
    };
    let mut lo = -4.0 * PI * PI;
    let mut hi = 4.0 * PI * PI * (1.0 - 1e-9);
    // Move the lower bound until y(z) > 0 (needed when A > 0).
    let mut k = 0;
    while k < 200 && y(lo) < 0.0 {
        lo = (lo + hi) / 2.0;
        k += 1;
    }
    let mut flo = time_gap(lo);
    let mut fhi = time_gap(hi);
    // The time of flight tends to infinity as z nears 4 pi^2; step back while the upper
    // end is not finite and positive (one revolution only).
    let mut k = 0;
    while k < 60 && !(fhi.is_finite() && fhi > 0.0) {
        hi = lo + (hi - lo) * 0.999;
        fhi = time_gap(hi);
        k += 1;
    }
    if !(flo <= 0.0 && fhi >= 0.0) {
        // Extend into the hyperbolic range for very short flights.
        let mut k = 0;
        while k < 60 && flo > 0.0 {
            lo *= 2.0;
            flo = time_gap(lo);
            k += 1;
        }
        if !(flo <= 0.0 && fhi >= 0.0) {
            return None;
        }
    }
    let mut z = 0.0;
    for _ in 0..200 {
        z = (lo + hi) / 2.0;
        if time_gap(z) > 0.0 {
            hi = z;
        } else {
            lo = z;
        }
        if hi - lo < 1e-12 {
            break;
        }
    }
    let yz = y(z);
    let f = 1.0 - yz / n1;
    let g = a * sqrt(yz / mu);
    let gdot = 1.0 - yz / n2;
    let v1 = [
        (r2[0] - f * r1[0]) / g,
        (r2[1] - f * r1[1]) / g,
        (r2[2] - f * r1[2]) / g,
    ];
    let v2 = [
        (gdot * r2[0] - r1[0]) / g,
        (gdot * r2[1] - r1[1]) / g,
        (gdot * r2[2] - r1[2]) / g,
    ];
    Some((v1, v2))
}

/// A direct transfer (no flyby) from one body to another.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DirectTransfer {
    pub launch_et: f64,
    /// Time of flight [s].
    pub tof: f64,
    /// Departure excess velocity relative to the body left [km/s].
    pub v_inf: Vec3,
    pub v_inf_km_s: f64,
    /// Arrival speed relative to the target [km/s].
    pub arrival_v_inf_km_s: f64,
}

/// The direct transfer with the least departure excess speed on a grid of launch ETs and
/// flight times [s], prograde under the Sun; on a tie the earlier node stays. None when
/// no node solves. The game's pars and aiming hint come from it.
pub fn best_direct_transfer(
    eph: &dyn Ephemeris,
    from: BodyId,
    to: BodyId,
    launch_ets: &[f64],
    tofs: &[f64],
) -> Option<DirectTransfer> {
    let mu = BodyId::Sun.info().gm;
    let mut best: Option<DirectTransfer> = None;
    for &launch_et in launch_ets {
        let dep = eph.state(from, launch_et);
        for &tof in tofs {
            let arr = eph.state(to, launch_et + tof);
            let Some((v1, v2)) = lambert(dep.r, arr.r, tof, mu, true) else {
                continue;
            };
            let v_inf = sub(v1, dep.v);
            let v_inf_km_s = norm(v_inf);
            if best.is_none_or(|b| v_inf_km_s < b.v_inf_km_s) {
                best = Some(DirectTransfer {
                    launch_et,
                    tof,
                    v_inf,
                    v_inf_km_s,
                    arrival_v_inf_km_s: norm(sub(v2, arr.v)),
                });
            }
        }
    }
    best
}
