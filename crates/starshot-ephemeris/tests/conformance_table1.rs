//! The Rust ephemeris against the TypeScript one, through `fixtures/conformance/table1.json`
//! (written by `packages/ephemeris/test/conformance.test.ts`). States go through `sin` and
//! `cos`, so they hold within 1 m and 1 mm/s; time is arithmetic only, so its bits and
//! milliseconds are equal.

mod common;

use common::{bits, dist, parse, planet};
use starshot_ephemeris::{et_from_iso, et_from_unix_ms, planet_state, unix_ms_from_et};

const TABLE1: &str = include_str!("../../../fixtures/conformance/table1.json");

#[test]
fn planet_states_match_typescript_within_1_m_and_1_mm_per_s() {
    let file = parse(TABLE1);
    assert_eq!(file["schema"], "starshot.conformance-table1/1");
    let rows = file["states"].as_array().expect("states");
    assert_eq!(rows.len(), 8 * 40);
    let (mut worst_r, mut worst_v, mut equal) = (0.0_f64, 0.0_f64, 0);
    for row in rows {
        let name = row[0].as_str().expect("body name");
        let s = planet_state(planet(name), bits(&row[1]));
        let r = [bits(&row[2]), bits(&row[3]), bits(&row[4])];
        let v = [bits(&row[5]), bits(&row[6]), bits(&row[7])];
        let (dr, dv) = (dist(s.r, r), dist(s.v, v));
        assert!(
            dr < 1e-3,
            "{name} at {}: position differs by {dr} km",
            row[1]
        );
        assert!(
            dv < 1e-6,
            "{name} at {}: velocity differs by {dv} km/s",
            row[1]
        );
        (worst_r, worst_v) = (worst_r.max(dr), worst_v.max(dv));
        equal += usize::from(s.r == r && s.v == v);
    }
    println!(
        "table1: worst {worst_r:e} km and {worst_v:e} km/s; {equal} of {} states equal bit for bit",
        rows.len()
    );
}

#[test]
fn time_conversions_match_typescript_bit_for_bit() {
    let file = parse(TABLE1);
    let utc = file["utc"].as_array().expect("utc");
    assert_eq!(utc.len(), 40);
    for row in utc {
        assert_eq!(
            unix_ms_from_et(bits(&row[0])),
            row[1].as_i64(),
            "dateFromEt at {}",
            row[0]
        );
    }
    let iso = file["iso"].as_array().expect("iso");
    assert_eq!(iso.len(), 20);
    for row in iso {
        let text = row[0].as_str().expect("ISO text");
        let et = et_from_iso(text).unwrap_or_else(|e| panic!("{text}: {e}"));
        assert_eq!(et.to_bits(), bits(&row[1]).to_bits(), "etFromIso({text})");
        assert_eq!(
            unix_ms_from_et(et),
            row[2].as_i64(),
            "dateFromEt(etFromIso({text}))"
        );
    }
    let unix = file["unix"].as_array().expect("unix");
    assert_eq!(unix.len(), 200);
    for row in unix {
        let ms = row[0].as_i64().expect("whole ms");
        let et = et_from_unix_ms(ms);
        assert_eq!(et.to_bits(), bits(&row[1]).to_bits(), "etFromDate({ms})");
        assert_eq!(
            unix_ms_from_et(et),
            row[2].as_i64(),
            "dateFromEt(etFromDate({ms}))"
        );
    }
}
