//! Kepler's equation, as `packages/ephemeris/test/ephemeris.test.ts` (kepler solver).

use core::f64::consts::PI;
use starshot_ephemeris::{solve_kepler, wrap_pi};
use starshot_math::sin;

#[test]
fn satisfies_m_equals_e_minus_e_sin_e_across_eccentricities() {
    let mut checked = 0;
    for e in [0.0, 0.0167, 0.2056, 0.6, 0.9, 0.99] {
        // The TypeScript loop adds 0.37 to M each pass, rounding as it goes; so does this.
        let mut m = -3.1;
        while m <= 3.1 {
            let big_e = solve_kepler(m, e);
            // toBeCloseTo(M, 10): within 5e-11.
            assert!((big_e - e * sin(big_e) - m).abs() < 5e-11, "e {e}, M {m}");
            m += 0.37;
            checked += 1;
        }
    }
    assert_eq!(checked, 6 * 17);
}

#[test]
fn holds_to_1e_14_densely_in_m_up_to_e_0_999999() {
    // Beyond the TypeScript test: dense in M at high e, where the start rule and the
    // iteration cap decide whether Newton's method settles.
    for e in [0.9, 0.99, 0.999999] {
        for k in 0..=2000 {
            let m = -PI + (2.0 * PI * f64::from(k)) / 2000.0;
            let big_e = solve_kepler(m, e);
            let residual = (big_e - e * sin(big_e) - wrap_pi(m)).abs();
            assert!(residual < 1e-14, "e {e}, M {m}: residual {residual}");
        }
    }
}

#[test]
fn wraps_angles_to_minus_pi_exclusive_to_pi_inclusive() {
    assert_eq!(wrap_pi(PI), PI);
    assert_eq!(wrap_pi(-PI), PI);
    assert_eq!(wrap_pi(3.0 * PI), PI, "fmod leaves exactly pi, which stays");
    assert_eq!(wrap_pi(1.5 * PI), 1.5 * PI - 2.0 * PI);
    assert_eq!(wrap_pi(-0.25), -0.25);
}
