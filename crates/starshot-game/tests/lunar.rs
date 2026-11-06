//! The Moon shot, PR13's lunar golden cases (09-rust-supplement.md): the request the game
//! builds and the flight it scores, against `fixtures/conformance/lunar-shots.json`
//! (written by `apps/game/src/sim/conformance.test.ts`), with the assertions of
//! `apps/game/src/campaign/lunar.test.ts` and `sim/lunar-request.test.ts`. A request is
//! copies, exact arithmetic and the pinned sphere, so it matches bit for bit; a flight
//! drifts through `sin`, `cos`, `pow` and `norm`, so it takes the bounds of
//! `starshot-physics/tests/lunar_flight.rs` (deviation row 101).

mod common;

use common::{analysis, bits, with_moved_numbers};
use serde_json::{Value, json};
use starshot_ephemeris::BodyId;
use starshot_ephemeris::vec::{norm, sub};
use starshot_game::settings::lunar::SETTINGS;
use starshot_game::{Aim, LunarResult, LunarShotRequest, ShotAnalysis, lunar_request, run_lunar};
use starshot_physics::Termination;
use starshot_physics::lunar::{
    DAY, LAUNCH_ET, LunarModel, LunarRequest, LunarScope, MOON_RADIUS, MOON_SOI_KM, ParkingOrbit,
};

const SHOTS: &str = include_str!("../../../fixtures/conformance/lunar-shots.json");
const RAIL: &str = include_str!("../../../packages/ephemeris/data/moon-rail.json");

/// The Moonshot's orbit on a fresh session: 200 km up at phase 225 degrees, in the plane
/// fixed at `LAUNCH_ET` (D38).
const PARKING: ParkingOrbit = ParkingOrbit {
    frame_et: Some(LAUNCH_ET),
    epoch_et: LAUNCH_ET,
    phase_deg: 225.0,
    radius_km: 6571.0,
};

/// The refusals' orbit, the generator's `PARKING`: not the default, so the rows show that
/// a request copies the orbit's radius and phase rather than `request_for`'s.
const MOVED: ParkingOrbit = ParkingOrbit {
    frame_et: Some(LAUNCH_ET),
    epoch_et: LAUNCH_ET + 8.004,
    phase_deg: 226.5,
    radius_km: 6600.0,
};

fn model() -> LunarModel {
    let rail: Value = serde_json::from_str(RAIL).expect("the rail is valid JSON");
    let knots: Vec<f64> = serde_json::from_value(rail["knots"].clone()).expect("knots");
    LunarModel::new(&knots).expect("the committed rail is valid")
}

fn hex(x: f64) -> Value {
    Value::from(format!("{:016x}", x.to_bits()))
}

fn section(name: &str) -> Vec<Vec<Value>> {
    let file: Value = serde_json::from_str(SHOTS).expect("valid JSON");
    assert_eq!(file["schema"], "starshot.conformance-lunar-shots/1");
    serde_json::from_value(file[name].clone()).expect(name)
}

/// A request as the fixture's `request_columns`, so a whole request compares at once.
fn encode_request(q: &LunarRequest) -> Value {
    let s = &q.settings;
    let scope = match q.scope {
        LunarScope::Local => "local",
        LunarScope::Lunar => "lunar",
    };
    let parking = q.parking.map_or(Value::Null, |o| {
        let frame = o.frame_et.map_or(Value::Null, hex);
        json!([frame, hex(o.epoch_et), hex(o.phase_deg), hex(o.radius_km)])
    });
    json!([
        hex(q.launch_et),
        hex(q.parking_radius_km),
        hex(q.parking_phase_deg),
        hex(q.delta_v_km_s),
        hex(q.burn_angle_deg),
        hex(q.duration_seconds),
        hex(q.approach_radius_km),
        scope,
        hex(s.rtol),
        hex(s.atol_pos),
        hex(s.atol_vel),
        hex(s.max_step),
        hex(f64::from(s.max_steps)),
        hex(s.near_body_fraction),
        parking,
        q.stop_at_entry,
    ])
}

/// One case: `lunar_request` on the TypeScript's inputs, held to its request bit for bit
/// (all eight are seven-day burns, so the duration is exact too), then flown.
fn fly(model: &LunarModel, row: &[Value]) -> (LunarShotRequest, LunarResult, ShotAnalysis) {
    let name = row[0].as_str().expect("a case");
    let aim = Aim {
        angle_deg: bits(&row[2]),
        speed_km_s: bits(&row[3]),
    };
    let o = row[4].as_array().expect("an orbit");
    let parking = ParkingOrbit {
        frame_et: Some(bits(&o[0])),
        epoch_et: bits(&o[1]),
        phase_deg: bits(&o[2]),
        radius_km: bits(&o[3]),
    };
    let shot = lunar_request(bits(&row[1]), aim, parking).expect("within 35 degrees");
    assert_eq!(encode_request(shot.request()), row[5], "{name}: request");
    let (result, analysis) = run_lunar(model, &shot).unwrap_or_else(|e| panic!("{name}: {e}"));
    (shot, result, analysis)
}

/// A case by name.
fn case(model: &LunarModel, name: &str) -> (LunarShotRequest, LunarResult, ShotAnalysis) {
    let rows = section("shots");
    let row = rows.iter().find(|r| r[0] == name).expect("a case");
    fly(model, row)
}

/// Steps and every exact field equal; the moved fields within PR12's flight bounds:
/// entry and end within 5 ms, closest times within 1 s, closest distances within 5e-4 km
/// and the last position within 0.1 km (row 101). A hit's closest distance is its
/// periapsis, held to the same bound, and its arrival speed within 1e-8 km/s, which no
/// flight bound covers. Measured: 2.8 ms (the graze), 0.78 s (the miss), 2.6e-4 km (the
/// impact's closest; periapses 5.3e-5 km), 0.084 km (the graze) and 2.6e-9 km/s. Every gap
/// must be finite, and the result's ending must be the analysis's.
#[test]
fn flights_match_typescript() {
    let (model, rows) = (model(), section("shots"));
    assert_eq!(rows.len(), 8);
    let mut worst = [0.0_f64; 5];
    for row in &rows {
        let name = row[0].as_str().expect("a case");
        let (_, result, got) = fly(&model, row);
        let want = analysis(row[6].as_array().expect("an analysis"));
        // Debug prints every f64 so that it reads back to the same bits.
        let same = with_moved_numbers(&want, &got);
        assert_eq!(format!("{got:?}"), format!("{same:?}"), "{name}");
        // The result ends as the analysis does, whose ending the line above holds exactly.
        assert_eq!(
            (
                result.termination,
                result.terminated_by,
                result.end_time.to_bits()
            ),
            (got.termination, got.terminated_by, got.end_et.to_bits()),
            "{name}: the result's ending"
        );
        assert_eq!(
            u64::from(result.steps),
            row[7].as_u64().expect("steps"),
            "{name}"
        );
        let [first, last] = [8, 9].map(|i| [0, 1, 2, 3, 4, 5, 6].map(|j| bits(&row[i][j])));
        let (start, end) = (result.samples[0], result.samples[result.samples.len() - 1]);
        // Sample 0 is the departure, whose position is the TypeScript's bits (row 108).
        let start_r = [first[1], first[2], first[3]].map(f64::to_bits);
        assert_eq!(start.r.map(f64::to_bits), start_r, "{name}");
        assert!(
            norm(sub(start.v, [first[4], first[5], first[6]])) < 1e-14,
            "{name}"
        );
        let opt = |a: Option<f64>, b: Option<f64>| a.zip(b).map_or(0.0, |(a, b)| (a - b).abs());
        let end_gaps = [
            got.end_et - want.end_et,
            end.t - want.end_et,
            end.t - last[0],
            (got.flight_days - want.flight_days) * DAY,
        ];
        let closest = [
            got.closest_km - want.closest_km,
            opt(got.periapsis_km, want.periapsis_km),
        ];
        let widest = |g: &[f64]| g.iter().map(|x| x.abs()).fold(0.0, f64::max);
        let gaps = [
            widest(&end_gaps),
            (got.closest_et - want.closest_et).abs(),
            widest(&closest),
            norm(sub(end.r, [last[1], last[2], last[3]])),
            opt(got.arrival_speed_km_s, want.arrival_speed_km_s),
        ];
        println!("{name:16} {:4} steps, gaps {gaps:?}", result.steps);
        // `f64::max` drops a NaN, so every gap must be finite before it folds.
        let parts = [&end_gaps[..], &closest, &gaps].concat();
        assert!(parts.iter().all(|g| g.is_finite()), "{name}: {parts:?}");
        worst = [0, 1, 2, 3, 4].map(|i| worst[i].max(gaps[i]));
    }
    println!("worst: end, closest time [s]; closest, last [km]; arrival [km/s] {worst:?}");
    let [times, closest_time, closest_km, last_km, speed] = worst;
    assert!(times < 0.005 && closest_time < 1.0, "{worst:?}");
    assert!(
        closest_km < 5e-4 && last_km < 0.1 && speed < 1e-8,
        "{worst:?}"
    );
}

#[test]
fn a_hit_a_miss_and_an_earth_impact() {
    let model = model();
    let (_, result, hit) = case(&model, "hit");
    assert!(hit.hit && hit.bullseye && hit.delta_v_km_s == 3.24);
    assert_eq!(result.end_time.to_bits(), hit.end_et.to_bits());
    let periapsis = hit.periapsis_km.expect("a hit has a periapsis");
    assert!(hit.closest_km == periapsis && periapsis < 10.0 * MOON_RADIUS);
    let (_, _, miss) = case(&model, "miss");
    assert!(!miss.hit && !miss.bullseye && miss.closest_km > 100_000.0);
    let (_, result, impact) = case(&model, "Earth impact");
    assert_eq!(impact.terminated_by, Some(BodyId::Earth));
    assert!(!impact.hit && impact.termination == Termination::Impact);
    assert_eq!(result.terminated_by, Some(BodyId::Earth));
}

#[test]
fn the_real_soi_graze_stops_at_its_entry() {
    let model = model();
    let (shot, result, graze) = case(&model, "real-SOI graze");
    let q = shot.request();
    assert_eq!(q.launch_et, LAUNCH_ET);
    assert_eq!(q.parking, Some(PARKING));
    assert!(q.approach_radius_km == MOON_SOI_KM && q.stop_at_entry);
    assert!(graze.hit && graze.termination == Termination::SoiReached);
    let last = result.samples[result.samples.len() - 1];
    assert_eq!(last.t.to_bits(), graze.end_et.to_bits());
    let moon = model.bodies(last.t).expect("inside the rail").moon;
    let off = norm(sub(last.r, moon.r)) - MOON_SOI_KM;
    assert!(off.abs() < 0.01, "{off} km");
}

#[test]
fn a_sub_day_launch_flies_alike_twice() {
    let model = model();
    let (shot, result, analysis) = case(&model, "sub-day launch");
    assert_eq!(shot.request().launch_et, LAUNCH_ET + 8.004);
    // Debug prints every f64 so that it reads back to the same bits.
    let again = run_lunar(&model, &shot).expect("flies");
    assert_eq!(format!("{again:?}"), format!("{:?}", (&result, &analysis)));
    // The relative samples are the same knots less Earth's centre.
    let (end, relative) = (result.samples.len() - 1, &result.relative_samples);
    let earth = model
        .bodies(result.samples[end].t)
        .expect("in the rail")
        .earth;
    assert_eq!(relative.len(), result.samples.len());
    assert_eq!(relative[end].r, sub(result.samples[end].r, earth.r));
    assert_eq!(relative[end].v, sub(result.samples[end].v, earth.v));
}

#[test]
fn a_sub_day_request_matches_typescript() {
    // `fly` holds the request to the TypeScript's bit for bit.
    let (shot, ..) = case(&model(), "sub-day request");
    assert_eq!(shot.request().launch_et, LAUNCH_ET + 321.0);
    assert_eq!(shot.request().parking, Some(PARKING));
}

#[test]
fn burns_beyond_35_degrees_are_refused_with_the_typescript_text() {
    let rows = section("refusals");
    assert_eq!(rows.len(), 5);
    for row in &rows {
        let angle_deg = bits(&row[0]);
        let aim = Aim {
            angle_deg,
            speed_km_s: 3.24,
        };
        match (lunar_request(LAUNCH_ET, aim, MOVED), row[2].as_str()) {
            (Err(e), Some(text)) => {
                assert_eq!(e.to_string(), text);
                assert_eq!(e.0.to_bits(), angle_deg.to_bits());
            }
            // A NaN angle passes, as in TypeScript; the flight refuses it.
            (Ok(shot), None) => {
                assert_eq!(encode_request(shot.request()), row[1], "{angle_deg}");
                assert_eq!(shot.request().settings, SETTINGS);
            }
            (got, want) => panic!("{angle_deg}: {got:?}, expected {want:?}"),
        }
    }
}
