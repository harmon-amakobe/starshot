//! 3-vectors, as `packages/ephemeris/src/vec.ts`. Units are named where each is used
//! (km or km/s). Each function keeps the TypeScript operation order, so the results are
//! the same bits.

/// A 3-vector `[x, y, z]`.
pub type Vec3 = [f64; 3];

pub fn add(a: Vec3, b: Vec3) -> Vec3 {
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

pub fn sub(a: Vec3, b: Vec3) -> Vec3 {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

pub fn scale(a: Vec3, k: f64) -> Vec3 {
    [a[0] * k, a[1] * k, a[2] * k]
}

pub fn dot(a: Vec3, b: Vec3) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/// Length. TypeScript calls a three-argument `Math.hypot`, which `libm` lacks and each
/// engine implements its own way; this is the square root of `x*x + y*y + z*z` in that
/// order (09-rust-supplement.md, G10). It differs from V8's `Math.hypot(x, y, z)` in 35 to
/// 39 percent of random vectors, by 1 unit in the last place in nearly all of them and by
/// 3 at most (3 million vectors, Node 22, 2026-11-05). No Starshot length comes near the
/// overflow that `hypot` guards against.
pub fn norm(a: Vec3) -> f64 {
    starshot_math::sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
}

pub fn cross(a: Vec3, b: Vec3) -> Vec3 {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

/// Angle between two vectors in radians, 0 when either is zero. The cosine is clamped to
/// -1 to 1 first, because rounding can carry it just past either end. `f64::clamp` keeps
/// a NaN as NaN, as `Math.min` and `Math.max` do; `f64::max` would turn it into -1.
pub fn angle_between(a: Vec3, b: Vec3) -> f64 {
    let d = norm(a) * norm(b);
    if d == 0.0 {
        return 0.0;
    }
    starshot_math::acos((dot(a, b) / d).clamp(-1.0, 1.0))
}
