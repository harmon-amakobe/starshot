//! The Mars 2026 Lambert minimum on a 1-day grid, flattened as the game flies it (register
//! R29, deviation 9). First Light's par source quotes this flight time, 323 days; D11's
//! 326 days is the best node of the 8-day grid in the simulate test.

use starshot_ephemeris::time::SECONDS_PER_DAY as DAY;
use starshot_ephemeris::{BodyId, Table1Ephemeris, et_from_iso};
use starshot_physics::best_direct_transfer;

#[test]
fn the_minimum_is_launch_2026_11_02_after_323_days_at_2_982_km_per_s() {
    let eph = Table1Ephemeris { flatten: true };
    let day0 = et_from_iso("2026-11-02").expect("date");
    let launches: Vec<f64> = (-10..=10).map(|k| day0 + f64::from(k) * DAY).collect();
    let tofs: Vec<f64> = (300..=340).map(|d| f64::from(d) * DAY).collect();
    let best = best_direct_transfer(&eph, BodyId::Earth, BodyId::Mars, &launches, &tofs)
        .expect("a transfer");
    let (day, flight) = ((best.launch_et - day0) / DAY, best.tof / DAY);
    let speed = best.v_inf_km_s;
    println!("lambert fine: launch day {day:+} from 2026-11-02, {flight} days, {speed} km/s");
    assert_eq!(best.launch_et, day0, "launch 2026-11-02");
    assert_eq!(best.tof, 323.0 * DAY, "323 days");
    assert!((speed - 2.982).abs() < 0.001, "{speed} km/s");
}
