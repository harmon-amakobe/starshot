//! Table 1 checked densely against the rails (register R18): every 432,000 s (5 days)
//! from 1950-01-01 to 2050-01-01 TDB, each planet's direction within today's arcminute
//! budget against Horizons. Table 1's "earth" is the barycentre, as is the rails' EMB.

mod common;

use common::{ARCMIN_BUDGET, full_pack, planet};
use core::f64::consts::PI;
use starshot_ephemeris::rails::decade_start_et;
use starshot_ephemeris::time::SECONDS_PER_DAY;
use starshot_ephemeris::vec::angle_between;
use starshot_ephemeris::{RailBody, planet_state};

const STEP_S: f64 = 5.0 * SECONDS_PER_DAY;

#[test]
fn table1_directions_stay_within_budget_of_the_rails_from_1950_to_2050() {
    let pack = full_pack();
    let (from, to) = (decade_start_et(1950), decade_start_et(2050));
    let steps = ((to - from) / STEP_S) as usize;
    assert_eq!(steps, 7305);
    for (name, budget) in ARCMIN_BUDGET {
        let id = planet(name);
        let body = RailBody::of_planet(id).expect("a planet has a rail");
        let (mut worst, mut worst_et) = (0.0_f64, from);
        for k in 0..=steps {
            let et = from + STEP_S * k as f64;
            let rail = pack.position(body, et).expect("inside coverage");
            let arcmin = (angle_between(planet_state(id, et).r, rail) * 180.0 * 60.0) / PI;
            assert!(
                arcmin < budget,
                "{name} at ET {et}: {arcmin} arcmin, budget {budget}"
            );
            if arcmin > worst {
                (worst, worst_et) = (arcmin, et);
            }
        }
        println!("{name}: worst {worst:.4} arcmin at ET {worst_et}, budget {budget}");
    }
}
