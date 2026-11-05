//! Clenshaw's recurrence against a direct sum of Chebyshev polynomials on random
//! coefficients, and its derivative against direct and central differences; then the
//! reader's velocities against central differences of its own positions.

mod common;

use common::full_pack;
use starshot_ephemeris::RailBody;
use starshot_ephemeris::rails::{clenshaw, clenshaw_with_derivative, decade_start_et};
use starshot_math::{acos, cos};

/// xorshift64: repeatable random numbers without a dependency.
struct Rng(u64);

impl Rng {
    fn next(&mut self) -> f64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        (self.0 >> 11) as f64 / (1u64 << 53) as f64 * 2.0 - 1.0
    }
}

/// Coefficients shaped like the pack's: a large c0, then terms falling off.
fn coefficients(rng: &mut Rng, degree: usize) -> Vec<f64> {
    (0..=degree)
        .map(|k| rng.next() * if k == 0 { 1e8 } else { 1e6 / (k * k) as f64 })
        .collect()
}

#[test]
fn clenshaw_equals_the_direct_sum_within_1e_9_relative() {
    let mut rng = Rng(0x5eed_cafe_f00d_0001);
    let mut cases = 0;
    for degree in [1, 2, 8, 12, 15, 17] {
        for _ in 0..200 {
            let c = coefficients(&mut rng, degree);
            let x = if cases % 50 == 0 {
                [-1.0, 1.0][cases / 50 % 2]
            } else {
                rng.next()
            };
            // T_k(x) = cos(k arccos x): independent of any recurrence.
            let theta = acos(x);
            let direct: f64 = c
                .iter()
                .enumerate()
                .map(|(k, ck)| ck * cos(k as f64 * theta))
                .sum();
            // T_k'(x) = k U_(k-1)(x), with U from its own recurrence.
            let (mut u0, mut u1, mut slope) = (0.0, 1.0, 0.0);
            for (k, ck) in c.iter().enumerate().skip(1) {
                slope += k as f64 * ck * u1;
                (u0, u1) = (u1, 2.0 * x * u1 - u0);
            }
            let scale: f64 = c.iter().map(|ck| ck.abs()).sum();
            let slope_scale: f64 = c
                .iter()
                .enumerate()
                .map(|(k, ck)| (k * k) as f64 * ck.abs())
                .sum();
            let value = clenshaw(&c, x);
            let (same, derivative) = clenshaw_with_derivative(&c, x);
            assert_eq!(
                value.to_bits(),
                same.to_bits(),
                "the two share their value's steps"
            );
            assert!(
                (value - direct).abs() <= 1e-9 * scale,
                "degree {degree}, x {x}: {value} vs {direct}"
            );
            assert!(
                (derivative - slope).abs() <= 1e-9 * slope_scale,
                "degree {degree}, x {x}: slope"
            );
            // The central difference agrees as far as its own step allows.
            if x.abs() < 0.999 {
                let h = 1e-5;
                let central = (clenshaw(&c, x + h) - clenshaw(&c, x - h)) / (2.0 * h);
                assert!(
                    (derivative - central).abs() <= 1e-6 * slope_scale,
                    "degree {degree}, x {x}: central"
                );
            }
            cases += 1;
        }
    }
    assert_eq!(clenshaw(&[], 0.5), 0.0);
    assert_eq!(clenshaw(&[3.0], 0.5), 3.0);
}

#[test]
fn rail_velocities_are_the_derivative_of_rail_positions() {
    let pack = full_pack();
    let segment = 32.0 * 86400.0;
    let mut checked = 0;
    for k in 0..400 {
        let year = 1950 + 10 * (k % 20);
        let start = decade_start_et(year);
        let et =
            start + 86400.0 * (3.7 + 9.13 * k as f64) % (decade_start_et(year + 10) - start - 10.0);
        // Every segment edge is a multiple of 32 days from its decade's start.
        let into = (et - start) % segment;
        if into < 2.0 || segment - into < 2.0 {
            continue;
        }
        for body in RailBody::ALL {
            let s = pack.state(body, et).expect("inside coverage");
            let (a, b) = (
                pack.position(body, et - 1.0).expect("in"),
                pack.position(body, et + 1.0).expect("in"),
            );
            for axis in 0..3 {
                let central = (b[axis] - a[axis]) / 2.0;
                assert!(
                    (s.v[axis] - central).abs() < 1e-6,
                    "{body:?} at ET {et}: {} vs {central}",
                    s.v[axis]
                );
            }
        }
        checked += 1;
    }
    assert!(checked > 390, "{checked} times checked");
}
