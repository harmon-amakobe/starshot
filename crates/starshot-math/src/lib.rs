//! The only place Starshot's transcendental functions live (D16).
//!
//! `f64::sin` and its relatives call the platform's maths library, whose last bit
//! differs between x86_64, arm64 and the browser engines. A flight integrated for
//! years turns that bit into a different orbit, so a replay or a score would not match
//! from one device to the next. These wrappers call the `libm` crate instead: Rust
//! ports of C maths routines (most name FreeBSD's msun as their origin) built from
//! basic IEEE operations. It is pinned to one release with its hardware paths turned
//! off (`Cargo.toml`), so every runtime runs the same code. `fixtures/math/golden.json`
//! records the bits and `tests/golden.rs` checks them on the machine that runs it.
//!
//! Every other crate calls these functions; `clippy.toml` rejects the `f64` and `f32`
//! methods. Square roots stay on `f64::sqrt`, which IEEE 754 defines exactly.

#![forbid(unsafe_code)]

/// Degrees to radians: multiply an angle in degrees by this.
pub const DEG: f64 = core::f64::consts::PI / 180.0;

// One line per function, so the list reads as a table: our name, its arguments in call
// order, and the libm function it forwards to unchanged.
macro_rules! forward {
    ($($(#[$doc:meta])* fn $name:ident($($arg:ident),+) = $libm:ident;)+) => {$(
        $(#[$doc])*
        #[inline]
        pub fn $name($($arg: f64),+) -> f64 {
            libm::$libm($($arg),+)
        }
    )+};
}

forward! {
    /// Sine of `x` radians.
    fn sin(x) = sin;
    /// Cosine of `x` radians.
    fn cos(x) = cos;
    /// Tangent of `x` radians.
    fn tan(x) = tan;
    /// Arcsine in radians, for `x` in -1 to 1.
    fn asin(x) = asin;
    /// Arccosine in radians, for `x` in -1 to 1.
    fn acos(x) = acos;
    /// Arctangent in radians.
    fn atan(x) = atan;
    /// The angle of the point (`x`, `y`) in radians, from -pi to pi. `y` comes first, as
    /// in `Math.atan2`.
    fn atan2(y, x) = atan2;
    /// Hyperbolic sine.
    fn sinh(x) = sinh;
    /// Hyperbolic cosine.
    fn cosh(x) = cosh;
    /// Hyperbolic tangent.
    fn tanh(x) = tanh;
    /// e raised to `x`.
    fn exp(x) = exp;
    /// Natural logarithm, as `Math.log`.
    fn ln(x) = log;
    /// Base-10 logarithm.
    fn log10(x) = log10;
    /// `x` raised to `y`, as `Math.pow` and the `**` operator.
    fn pow(x, y) = pow;
    /// Cube root, defined for negative `x` too.
    fn cbrt(x) = cbrt;
    /// The length of (`x`, `y`) without overflow or underflow on the way.
    fn hypot(x, y) = hypot;
}

/// Square root. IEEE 754 requires it to be correctly rounded, so the hardware
/// instruction gives the same bits everywhere and needs no wrapper from `libm`.
#[inline]
pub fn sqrt(x: f64) -> f64 {
    x.sqrt()
}

#[cfg(test)]
mod tests {
    use core::f64::consts::{PI, SQRT_2};

    #[test]
    fn deg_and_sqrt() {
        assert_eq!(180.0 * super::DEG, PI);
        assert_eq!(super::sqrt(2.0).to_bits(), SQRT_2.to_bits());
        assert_eq!(super::sqrt(-0.0).to_bits(), (-0.0f64).to_bits());
    }
}
