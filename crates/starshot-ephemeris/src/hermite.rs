//! Cubic Hermite interpolation between two knots, as `packages/physics/src/hermite.ts`.
//! It lives here because the lunar model needs it and this crate cannot depend on
//! physics; `starshot-physics` re-exports it rather than keeping a second copy (G6).
//! Arithmetic only, in the TypeScript order, so the results are the same bits.

use crate::ephemeris::State;
use crate::vec::Vec3;

/// A sampled state: time [s of ET], position [km] and velocity [km/s].
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Knot {
    pub t: f64,
    pub r: Vec3,
    pub v: Vec3,
}

/// Position and velocity at `t` from the cubic through two knots' positions and
/// velocities. Knots at the same time give the first knot's state.
pub fn hermite(a: &Knot, b: &Knot, t: f64) -> State {
    let h = b.t - a.t;
    if h == 0.0 {
        return State { r: a.r, v: a.v };
    }
    let s = (t - a.t) / h;
    let s2 = s * s;
    let s3 = s2 * s;
    let h00 = 2.0 * s3 - 3.0 * s2 + 1.0;
    let h10 = s3 - 2.0 * s2 + s;
    let h01 = -2.0 * s3 + 3.0 * s2;
    let h11 = s3 - s2;
    // Derivatives with respect to t.
    let d00 = (6.0 * s2 - 6.0 * s) / h;
    let d10 = 3.0 * s2 - 4.0 * s + 1.0;
    let d01 = (-6.0 * s2 + 6.0 * s) / h;
    let d11 = 3.0 * s2 - 2.0 * s;
    let (mut r, mut v) = ([0.0; 3], [0.0; 3]);
    for k in 0..3 {
        let (ar, br, av, bv) = (a.r[k], b.r[k], a.v[k], b.v[k]);
        r[k] = h00 * ar + h10 * h * av + h01 * br + h11 * h * bv;
        v[k] = d00 * ar + d10 * av + d01 * br + d11 * bv;
    }
    State { r, v }
}
