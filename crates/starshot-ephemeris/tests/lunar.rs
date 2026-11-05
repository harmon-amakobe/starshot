//! The lunar model against its JPL probes, the barycentre identity and the TypeScript
//! model (`fixtures/conformance/lunar.json`, written by
//! `packages/physics/test/conformance-lunar.test.ts`), with the rail's edges.

mod common;

use common::{bits, dist, parse};
use starshot_ephemeris::lunar::{
    BASIS_PHASE_DEG, EARTH_GM, LAUNCH_ET, LunarModel, MOON_GM, RailError,
};
use starshot_ephemeris::vec::{add, scale};
use starshot_ephemeris::{BodyId, Ephemeris, State, Table1Ephemeris};

const RAIL: &str = include_str!("../../../packages/ephemeris/data/moon-rail.json");
const LUNAR: &str = include_str!("../../../fixtures/conformance/lunar.json");
const DAY: f64 = 86400.0;

fn rail() -> (Vec<f64>, Vec<Vec<f64>>) {
    let file = parse(RAIL);
    let list = |v: &serde_json::Value| -> Vec<f64> {
        v.as_array()
            .expect("array")
            .iter()
            .map(common::num)
            .collect()
    };
    let probes = file["probes"]
        .as_array()
        .expect("probes")
        .iter()
        .map(list)
        .collect();
    (list(&file["knots"]), probes)
}

fn model() -> LunarModel {
    LunarModel::new(&rail().0).expect("the committed rail is valid")
}

#[test]
fn the_five_jpl_probes_hold_within_0_1_km_and_1_1e_5_km_per_s() {
    let (model, (_, probes)) = (model(), rail());
    assert_eq!(probes.len(), 5);
    for p in probes {
        let s = model.relative(p[0]).expect("probe inside the rail");
        assert!(dist(s.r, [p[1], p[2], p[3]]) < 0.1, "probe at {}", p[0]);
        assert!(
            dist(s.v, [p[4], p[5], p[6]]) < 0.000011,
            "probe at {}",
            p[0]
        );
    }
}

#[test]
fn earth_and_moon_recover_table_1s_barycentre() {
    let (model, eph) = (model(), Table1Ephemeris { flatten: false });
    let fraction = MOON_GM / (EARTH_GM + MOON_GM);
    let mut ets = vec![LAUNCH_ET, LAUNCH_ET + 27.0 * DAY];
    ets.extend((0..=100).map(|i| LAUNCH_ET + 7.0 * DAY * f64::from(i) / 100.0));
    for et in ets {
        let (b, emb) = (
            model.bodies(et).expect("inside"),
            eph.state(BodyId::Earth, et),
        );
        let r = add(scale(b.earth.r, 1.0 - fraction), scale(b.moon.r, fraction));
        let v = add(scale(b.earth.v, 1.0 - fraction), scale(b.moon.v, fraction));
        assert!(
            dist(r, emb.r) < 1e-6 && dist(v, emb.v) < 1e-12,
            "barycentre at {et}"
        );
    }
}

fn row_state(row: &serde_json::Value) -> State {
    State {
        r: [bits(&row[2]), bits(&row[3]), bits(&row[4])],
        v: [bits(&row[5]), bits(&row[6]), bits(&row[7])],
    }
}

#[test]
fn the_model_matches_typescript() {
    let (file, model) = (parse(LUNAR), model());
    assert_eq!(file["schema"], "starshot.conformance-lunar/1");
    assert_eq!(
        file["rail"]["knots"].as_u64(),
        Some(rail().0.len() as u64 / 7)
    );
    let rows = file["model"].as_array().expect("model rows");
    assert_eq!(rows.len(), 3 * 8);
    let (mut worst_r, mut worst_v) = (0.0_f64, 0.0_f64);
    for row in rows {
        let (et, want) = (bits(&row[1]), row_state(row));
        let b = model.bodies(et).expect("inside the rail");
        match row[0].as_str().expect("kind") {
            // Search and Hermite are arithmetic only: the same bits.
            "relative" => assert_eq!(model.relative(et), Ok(want), "relative at {et}"),
            // Through Table 1's sin and cos: PR9's bounds, 1 m and 1 mm/s.
            kind => {
                let got = if kind == "earth" { b.earth } else { b.moon };
                let (dr, dv) = (dist(got.r, want.r), dist(got.v, want.v));
                assert!(dr < 1e-3 && dv < 1e-6, "{kind} at {et}: {dr} km, {dv} km/s");
                (worst_r, worst_v) = (worst_r.max(dr), worst_v.max(dv));
            }
        }
    }
    println!("lunar bodies: worst {worst_r:e} km and {worst_v:e} km/s from TypeScript");
    let basis = file["basis"].as_array().expect("basis rows");
    assert_eq!(basis.len(), 9);
    let mut worst = 0.0_f64;
    for row in basis {
        let b = model.basis(bits(&row[1]), bits(&row[2])).expect("inside");
        let got = match row[0].as_str().expect("vector") {
            "right" => b.right,
            "up" => b.up,
            _ => b.normal,
        };
        for (axis, value) in got.iter().enumerate() {
            let d = (value - bits(&row[3 + axis])).abs();
            assert!(d <= 1e-15, "{} at {}: {d}", row[0], row[1]);
            worst = worst.max(d);
        }
    }
    println!("lunar basis: worst component {worst:e} from TypeScript");
    assert_eq!(model.default_basis(), model.basis(LAUNCH_ET, 225.0));
    assert_eq!((LAUNCH_ET, BASIS_PHASE_DEG), (846853269.184, 225.0));
}

#[test]
fn the_moon_moves_over_100000_km_in_8_days() {
    let (model, frozen) = (model(), LAUNCH_ET + 321.0);
    let (a, b) = (
        model.relative(frozen).expect("in"),
        model.relative(frozen + 8.0 * DAY).expect("in"),
    );
    assert!(dist(a.r, b.r) > 100_000.0);
}

#[test]
fn the_rail_refuses_dates_outside_it_and_nan() {
    let model = model();
    let (first, last) = model.dates();
    for et in [first - 1.0, last + 1e-3, f64::NEG_INFINITY, f64::INFINITY] {
        assert_eq!(model.relative(et), Err(RailError::OutsideDates), "{et}");
        assert_eq!(model.bodies(et).map(|_| ()), Err(RailError::OutsideDates));
    }
    assert_eq!(
        RailError::OutsideDates.to_string(),
        "Outside the lunar rail dates"
    );
    assert_eq!(model.relative(f64::NAN), Err(RailError::NotANumber));
    assert!(model.relative(first).is_ok() && model.relative(last).is_ok());
}

#[test]
fn a_knot_time_gives_that_knot_exactly() {
    let knots = [
        0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 10.0, 2.0, 0.0, 0.0, 3.0, 0.0, 0.0, 20.0, 9.0, 0.0, 0.0,
        5.0, 0.0, 0.0,
    ];
    let model = LunarModel::new(&knots).expect("valid");
    // An interior knot starts the later segment (s = 0); the last knot ends the last one.
    for (t, r, v) in [(0.0, 1.0, 0.0), (10.0, 2.0, 3.0), (20.0, 9.0, 5.0)] {
        assert_eq!(
            model.relative(t).map(|s| (s.r[0], s.v[0])),
            Ok((r, v)),
            "{t}"
        );
    }
}

#[test]
fn malformed_knot_arrays_are_refused() {
    let two = [
        0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 1.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0,
    ];
    assert_eq!(
        LunarModel::new(&two[..13]).map(|_| ()),
        Err(RailError::BadLength(13))
    );
    assert_eq!(
        LunarModel::new(&two[..7]).map(|_| ()),
        Err(RailError::TooFewKnots(1))
    );
    assert_eq!(
        LunarModel::new(&[]).map(|_| ()),
        Err(RailError::TooFewKnots(0))
    );
    let mut bad = two;
    bad[9] = f64::NAN;
    assert_eq!(
        LunarModel::new(&bad).map(|_| ()),
        Err(RailError::NotFinite(9))
    );
    bad = two;
    bad[7] = 0.0;
    assert_eq!(
        LunarModel::new(&bad).map(|_| ()),
        Err(RailError::NotIncreasing(1))
    );
    assert!(LunarModel::new(&two).is_ok());
}
