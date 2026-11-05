//! The launch model, as `packages/physics/test/physics.test.ts`.

use starshot_ephemeris::vec::{norm, sub};
use starshot_ephemeris::{BodyId, Ephemeris, Table1Ephemeris, et_from_iso};
use starshot_physics::{LEO_RADIUS_KM, c3, delta_v_from_leo, departure_state};

#[test]
fn about_3_2_km_per_s_from_leo_to_escape() {
    // Today's 6,571 km, not a corrected Earth radius: pars depend on it.
    assert_eq!(LEO_RADIUS_KM, 6571.0);
    let escape = delta_v_from_leo(0.0, LEO_RADIUS_KM);
    // toBeCloseTo(3.23, 1): within 0.05.
    assert!((escape - 3.23).abs() < 0.05, "{escape} km/s to escape");
    assert!(delta_v_from_leo(3.3, LEO_RADIUS_KM) > 3.5);
    assert_eq!(c3(3.0), 9.0);
}

#[test]
fn starts_at_earth_moving_at_earths_velocity_plus_the_excess() {
    let eph = Table1Ephemeris { flatten: false };
    let t0 = et_from_iso("2026-11-20").expect("date");
    let s = departure_state(&eph, t0, [0.0, 3.0, 0.0]);
    let earth = eph.state(BodyId::Earth, t0);
    assert_eq!(norm(sub(s.r, earth.r)), 0.0);
    // toBeCloseTo(3, 12): within 5e-13 km/s.
    let excess = norm(sub(s.v, earth.v));
    assert!((excess - 3.0).abs() < 5e-13, "excess {excess} km/s");
}
