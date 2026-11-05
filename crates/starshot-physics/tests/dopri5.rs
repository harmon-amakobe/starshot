//! Two-body accuracy of the integrator alone, as the first test of
//! `packages/physics/test/physics.test.ts`, flown with `Dopri5` directly.

mod common;

use common::fly_sun_only;
use core::f64::consts::PI;
use starshot_ephemeris::vec::{Vec3, dot, norm, sub};
use starshot_ephemeris::{AU_KM, BodyId};
use starshot_math::{pow, sqrt};

#[test]
fn a_circular_1_au_orbit_closes_within_10_km_after_one_period() {
    let mu = BodyId::Sun.info().gm;
    let energy = |r: Vec3, v: Vec3| dot(v, v) / 2.0 - mu / norm(r);
    let (r0, v0) = ([AU_KM, 0.0, 0.0], [0.0, sqrt(mu / AU_KM), 0.0]);
    let period = 2.0 * PI * sqrt(pow(AU_KM, 3.0) / mu);
    let (end, steps) = fly_sun_only(0.0, r0, v0, period);
    let gap = norm(sub(end.r, r0));
    let drift = (energy(end.r, end.v) / energy(r0, v0) - 1.0).abs();
    println!("dopri5: closed within {gap:.6} km, energy drift {drift:e}, {steps} steps");
    assert!(gap < 10.0, "{gap} km from the start after one period");
    assert!(drift < 1e-7, "relative energy drift {drift}");
}
