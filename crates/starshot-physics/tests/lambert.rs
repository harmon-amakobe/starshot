//! Today's three Lambert tests (`packages/physics/test/physics.test.ts`) with today's
//! assertions. The flights are Sun-only, flown by `simulate`'s rules with `Dopri5`
//! directly. The Mars window is also checked against the TypeScript's result in
//! `fixtures/conformance/physics.json`.

mod common;

use common::{fly_sun_only, table};
use starshot_ephemeris::time::SECONDS_PER_DAY as DAY;
use starshot_ephemeris::vec::{norm, sub};
use starshot_ephemeris::{BodyId, Ephemeris, Table1Ephemeris, et_from_iso};
use starshot_physics::{best_direct_transfer, lambert};

const EPH_3D: Table1Ephemeris = Table1Ephemeris { flatten: false };
const EPH_2D: Table1Ephemeris = Table1Ephemeris { flatten: true };

fn mu_sun() -> f64 {
    BodyId::Sun.info().gm
}

#[test]
fn round_trip_integrating_the_lambert_velocity_hits_the_target_point() {
    let t0 = et_from_iso("2026-11-20").expect("date");
    let tof = 210.0 * DAY;
    let r1 = EPH_3D.state(BodyId::Earth, t0).r;
    let r2 = EPH_3D.state(BodyId::Mars, t0 + tof).r;
    let (v1, v2) = lambert(r1, r2, tof, mu_sun(), true).expect("a solution");
    let (end, _) = fly_sun_only(t0, r1, v1, tof);
    let (miss, dv) = (norm(sub(end.r, r2)), norm(sub(end.v, v2)));
    println!("lambert round trip: {miss:.3} km and {dv:e} km/s from the target");
    assert!(miss < 50.0, "missed by {miss} km");
    assert!(dv < 1e-4, "arrival velocity off by {dv} km/s");
}

#[test]
fn solves_long_transfers_such_as_earth_to_saturn_in_1977() {
    let t0 = et_from_iso("1977-08-20").expect("date");
    for days in [1000.0, 1500.0, 2500.0] {
        let tof = days * DAY;
        let r1 = EPH_2D.state(BodyId::Earth, t0).r;
        let r2 = EPH_2D.state(BodyId::Saturn, t0 + tof).r;
        let (v1, _) = lambert(r1, r2, tof, mu_sun(), true).expect("a solution");
        let (end, _) = fly_sun_only(t0, r1, v1, tof);
        let miss = norm(sub(end.r, r2)) / norm(r2);
        println!("lambert to Saturn, {days} days: relative miss {miss:e}");
        assert!(miss < 1e-6, "{days} days: relative miss {miss}");
    }
}

#[test]
fn finds_the_late_2026_mars_window_at_a_realistic_c3() {
    let start = et_from_iso("2026-10-01").expect("date");
    let launches: Vec<f64> = (0..30).map(|k| start + f64::from(k) * 4.0 * DAY).collect();
    let tofs: Vec<f64> = (0..25).map(|k| f64::from(150 + k * 10) * DAY).collect();
    let best = best_direct_transfer(&EPH_3D, BodyId::Earth, BodyId::Mars, &launches, &tofs)
        .expect("a transfer");
    let speed = best.v_inf_km_s;
    let day = (best.launch_et - start) / DAY;
    println!(
        "lambert Mars 2026: {speed} km/s, launch day {day} after 2026-10-01, {} days",
        best.tof / DAY
    );
    // Real 2026 window: C3 about 9 to 12 km^2/s^2, an excess speed of 3.0 to 3.5 km/s.
    assert!(speed > 2.6 && speed < 4.0, "{speed} km/s");
    // The TypeScript's node, and its speeds within 1e-9 relative.
    let ts = &table("best_mars_2026", 7)[0];
    assert_eq!(best.launch_et.to_bits(), ts[0].to_bits(), "launch ET");
    assert_eq!(best.tof.to_bits(), ts[1].to_bits(), "flight time");
    let rel = |a: f64, b: f64| ((a - b) / b).abs();
    let worst = [best.v_inf[0], best.v_inf[1], best.v_inf[2], speed]
        .iter()
        .zip(&ts[2..6])
        .map(|(&a, &b)| rel(a, b))
        .fold(rel(best.arrival_v_inf_km_s, ts[6]), f64::max);
    println!("lambert Mars 2026: worst relative difference from TypeScript {worst:e}");
    assert!(worst < 1e-9, "relative difference {worst}");
}
