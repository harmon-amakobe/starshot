//! Two-body accuracy of the integrator alone, as the first test of
//! `packages/physics/test/physics.test.ts`, flown with `Dopri5` directly; then `reset` and
//! the error norm's NaN, which only these tests reach.

mod common;

use common::{fly_sun_only, sun_only};
use core::f64::consts::PI;
use starshot_ephemeris::vec::{Vec3, dot, norm, sub};
use starshot_ephemeris::{AU_KM, BodyId};
use starshot_math::{pow, sqrt};
use starshot_physics::{Dopri5, State6, StepTolerance};

const TOL: StepTolerance = StepTolerance {
    rtol: 1e-10,
    atol_pos: 1.0,
    atol_vel: 1e-6,
};

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

#[test]
fn reset_makes_a_used_solver_step_as_a_fresh_one() {
    let y = [AU_KM, 0.0, 0.0, 0.0, 30.0, 0.0];
    let other = [0.5 * AU_KM, 0.2 * AU_KM, 0.0, -10.0, 40.0, 1.0];
    let mut used = Dopri5::new(TOL);
    used.attempt(&mut sun_only, 0.0, &other, 86400.0);
    used.accept();
    used.reset();
    let err_used = used.attempt(&mut sun_only, 0.0, &y, 86400.0);
    let mut fresh = Dopri5::new(TOL);
    let err_fresh = fresh.attempt(&mut sun_only, 0.0, &y, 86400.0);
    assert_eq!(err_used.to_bits(), err_fresh.to_bits());
    assert_eq!(used.y_new.map(f64::to_bits), fresh.y_new.map(f64::to_bits));
}

#[test]
fn an_infinite_stage_gives_a_nan_error_as_typescript_does() {
    // x' is +inf at stage 3 and -inf at stage 4, so y_new's x is NaN and its error -inf.
    // TypeScript's Math.max keeps the NaN and the norm is NaN; f64::max would give inf.
    let mut calls = 0;
    let mut f = |_: f64, _: &State6, dy: &mut State6| {
        calls += 1;
        let x = match calls {
            3 => f64::INFINITY,
            4 => f64::NEG_INFINITY,
            _ => 1.0,
        };
        *dy = [x, 0.0, 0.0, 0.0, 0.0, 0.0];
    };
    let mut solver = Dopri5::new(TOL);
    let err = solver.attempt(&mut f, 0.0, &[1.0; 6], 1.0);
    assert!(solver.y_new[0].is_nan() && err.is_nan(), "err {err}");
}
