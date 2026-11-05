//! Kepler's equation and the state on an ellipse, as `packages/ephemeris/src/kepler.ts`,
//! with the same iteration and operation order.

use crate::ephemeris::State;
use core::f64::consts::PI;
use starshot_math::{cos, sin, sqrt};

const TWO_PI: f64 = PI * 2.0;

/// Wrap an angle to (-pi, pi].
pub fn wrap_pi(x: f64) -> f64 {
    // `%` on f64 is IEEE fmod with the dividend's sign, exactly JavaScript's `%`.
    let mut y = x % TWO_PI;
    if y > PI {
        y -= TWO_PI;
    } else if y <= -PI {
        y += TWO_PI;
    }
    y
}

/// Solve Kepler's equation M = E - e sin E for the eccentric anomaly E [rad] by Newton's
/// method. Converges for 0 <= e < 1 (tested to e = 0.99).
pub fn solve_kepler(mean_anomaly: f64, e: f64) -> f64 {
    let m = wrap_pi(mean_anomaly);
    // `Math.PI * Math.sign(M || 1)`: 0, -0 and NaN all start at +pi.
    let mut big_e = if e < 0.8 {
        m
    } else if m < 0.0 {
        -PI
    } else {
        PI
    };
    for _ in 0..60 {
        let f = big_e - e * sin(big_e) - m;
        let de = f / (1.0 - e * cos(big_e));
        big_e -= de;
        if de.abs() < 1e-14 {
            break;
        }
    }
    big_e
}

/// Classical elements: a [km], e, and i, node, argument of perihelion and mean anomaly
/// [rad], with the mean motion n [rad/s].
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ClassicalElements {
    pub a: f64,
    pub e: f64,
    pub i: f64,
    pub node: f64,
    pub arg_peri: f64,
    pub m: f64,
    pub n: f64,
}

/// Position [km] and velocity [km/s] from classical elements, in the frame the angles are
/// referred to (here the ecliptic and equinox of J2000).
pub fn state_from_elements(el: &ClassicalElements) -> State {
    let ClassicalElements {
        a,
        e,
        i,
        node,
        arg_peri,
        m,
        n,
    } = *el;
    let big_e = solve_kepler(m, e);
    let cos_e = cos(big_e);
    let sin_e = sin(big_e);
    let sq = sqrt(1.0 - e * e);
    let xp = a * (cos_e - e);
    let yp = a * sq * sin_e;
    let e_dot = n / (1.0 - e * cos_e);
    let vxp = -a * sin_e * e_dot;
    let vyp = a * sq * cos_e * e_dot;

    let c_o = cos(node);
    let s_o = sin(node);
    let cw = cos(arg_peri);
    let sw = sin(arg_peri);
    let ci = cos(i);
    let si = sin(i);
    let r11 = cw * c_o - sw * s_o * ci;
    let r12 = -sw * c_o - cw * s_o * ci;
    let r21 = cw * s_o + sw * c_o * ci;
    let r22 = -sw * s_o + cw * c_o * ci;
    let r31 = sw * si;
    let r32 = cw * si;
    State {
        r: [
            r11 * xp + r12 * yp,
            r21 * xp + r22 * yp,
            r31 * xp + r32 * yp,
        ],
        v: [
            r11 * vxp + r12 * vyp,
            r21 * vxp + r22 * vyp,
            r31 * vxp + r32 * vyp,
        ],
    }
}
