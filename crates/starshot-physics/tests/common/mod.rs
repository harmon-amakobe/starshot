//! What the integration tests share: the conformance fixture's bits, and a Sun-only flight
//! flown with `Dopri5` directly until `simulate` is ported (PR12). Each test file uses only
//! some of it.
#![allow(dead_code)]

use serde_json::Value;
use starshot_ephemeris::time::SECONDS_PER_DAY as DAY;
use starshot_ephemeris::{State, Table1Ephemeris, Vec3};
use starshot_physics::lunar::LunarModel;
use starshot_physics::{Dopri5, State6, StepTolerance, acceleration};

pub const PHYSICS: &str = include_str!("../../../../fixtures/conformance/physics.json");
pub const LUNAR: &str = include_str!("../../../../fixtures/conformance/lunar.json");
const RAIL: &str = include_str!("../../../../packages/ephemeris/data/moon-rail.json");

/// The lunar model on the committed Moon rail.
pub fn lunar_model() -> LunarModel {
    let rail: Value = serde_json::from_str(RAIL).expect("the rail is valid JSON");
    let knots: Vec<f64> = serde_json::from_value(rail["knots"].clone()).expect("knots");
    LunarModel::new(&knots).expect("the committed rail is valid")
}

/// A section of `lunar.json` as rows of JSON values.
pub fn lunar_section(name: &str) -> Vec<Vec<Value>> {
    let file: Value = serde_json::from_str(LUNAR).expect("fixture is valid JSON");
    serde_json::from_value(file[name].clone()).expect(name)
}

/// An f64 from 16 hex digits of its bits, the form the conformance fixtures store.
pub fn bits(v: &Value) -> f64 {
    let text = v.as_str().unwrap_or_else(|| panic!("{v} is not bits"));
    assert_eq!(text.len(), 16, "{text} is not 16 hex digits");
    f64::from_bits(u64::from_str_radix(text, 16).unwrap_or_else(|e| panic!("{text}: {e}")))
}

/// A list of bits as f64s.
pub fn row(v: &Value) -> Vec<f64> {
    v.as_array().expect("a row").iter().map(bits).collect()
}

/// A section of `physics.json` as rows of `width` numbers each.
pub fn table(name: &str, width: usize) -> Vec<Vec<f64>> {
    let file: Value = serde_json::from_str(PHYSICS).expect("fixture is valid JSON");
    assert_eq!(file["schema"], "starshot.conformance-physics/1");
    let rows: Vec<Vec<f64>> = file[name].as_array().expect(name).iter().map(row).collect();
    assert!(rows.iter().all(|r| r.len() == width), "{name} rows");
    rows
}

/// The lambert section: prograde, the inputs, and the velocities or None.
pub fn lambert_cases() -> Vec<(bool, Vec<f64>, Option<Vec<f64>>)> {
    let file: Value = serde_json::from_str(PHYSICS).expect("fixture is valid JSON");
    let rows = file["lambert"].as_array().expect("lambert");
    let case = |r: &Value| {
        let out = (!r[2].is_null()).then(|| row(&r[2]));
        (r[0].as_bool().expect("prograde"), row(&r[1]), out)
    };
    rows.iter().map(case).collect()
}

/// The Sun's pull alone, as `simulate` builds its derivative.
pub fn sun_only(t: f64, y: &State6, dy: &mut State6) {
    let (eph, mut a) = (Table1Ephemeris::default(), [0.0; 3]);
    acceleration(&eph, &[], t, [y[0], y[1], y[2]], &mut a);
    *dy = [y[3], y[4], y[5], a[0], a[1], a[2]];
}

/// The end state and step count of a Sun-only flight from (`t0`, `r0`, `v0`) for
/// `duration` seconds, by `simulate`'s rules with no attractors: rtol 1e-10, 1 km and
/// 1e-6 km/s, a first step of 6 hours, steps of at most 5 days, the last cut to land at
/// t0 + duration.
pub fn fly_sun_only(t0: f64, r0: Vec3, v0: Vec3, duration: f64) -> (State, u32) {
    let tol = StepTolerance {
        rtol: 1e-10,
        atol_pos: 1.0,
        atol_vel: 1e-6,
    };
    let mut solver = Dopri5::new(tol);
    let (t_end, max_step) = (t0 + duration, 5.0 * DAY);
    let (mut t, mut h, mut steps) = (t0, max_step.min(DAY / 4.0), 0);
    let mut y = [r0[0], r0[1], r0[2], v0[0], v0[1], v0[2]];
    while t < t_end {
        h = h.min(max_step.min(t_end - t));
        let err = solver.attempt(&mut sun_only, t, &y, h);
        if err > 1.0 {
            h = Dopri5::next_step(h, err);
            continue;
        }
        solver.accept();
        y = solver.y_new;
        t += h;
        steps += 1;
        h = Dopri5::next_step(h, err);
    }
    let [rx, ry, rz, vx, vy, vz] = y;
    let end = State {
        r: [rx, ry, rz],
        v: [vx, vy, vz],
    };
    (end, steps)
}
