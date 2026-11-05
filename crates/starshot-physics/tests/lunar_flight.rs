//! The lunar flight: today's flight tests (`packages/physics/test/lunar.test.ts:45-82`,
//! `apps/prototype/src/lunar/flight.test.ts:10-64`), then the TypeScript's flights,
//! requests and refusals in `fixtures/conformance/lunar.json` (written by
//! `packages/physics/test/conformance-lunar.test.ts`). The same request takes the same
//! steps to the same ending in both engines; times and distances drift apart through
//! `sin`, `cos`, `pow` and `norm` (`src/lunar/flight.rs`), by the bounds measured below.

mod common;

use common::{bits, lunar_model as model, lunar_section as section};
use serde_json::Value;
use starshot_ephemeris::vec::{norm, sub};
use starshot_physics::Knot;
use starshot_physics::lunar::{
    DAY, FUEL_BUDGET, LAUNCH_ET, LunarError, LunarFlight, LunarImpact, LunarModel, LunarRequest,
    LunarScope, LunarSettings, MOON_SOI_KM, ParkingOrbit, RailError, parking_state, request_for,
    sample_flight, simulate_lunar,
};

/// The game's orbit: 200 km up, phase 225 degrees, in the plane fixed at `LAUNCH_ET` (D38).
const GAME: ParkingOrbit = ParkingOrbit {
    frame_et: Some(LAUNCH_ET),
    epoch_et: LAUNCH_ET,
    phase_deg: 225.0,
    radius_km: 6571.0,
};

fn fly(model: &LunarModel, request: &LunarRequest) -> LunarFlight {
    simulate_lunar(model, request).unwrap_or_else(|e| panic!("{request:?}: {e}"))
}

/// The game's burn of 3.24 km/s from its parking orbit, recording the real sphere of
/// influence (lunar.test.ts:46, :59-62).
fn real(angle: f64, stop_at_entry: bool) -> LunarRequest {
    let mut q = request_for(3.24, angle);
    (q.parking, q.approach_radius_km, q.stop_at_entry) = (Some(GAME), MOON_SOI_KM, stop_at_entry);
    q
}

fn moon_distance(model: &LunarModel, k: &Knot) -> f64 {
    norm(sub(k.r, model.bodies(k.t).expect("inside the rail").moon.r))
}

/// Every sample's bits: `assert_eq!` on f64s would let 0.0 equal -0.0.
fn knot_bits(samples: &[Knot]) -> Vec<u64> {
    let numbers = samples.iter().flat_map(|k| [[k.t, 0.0, 0.0], k.r, k.v]);
    numbers.flatten().map(f64::to_bits).collect()
}

/// A request from the fixture's `request_columns`.
fn request(cols: &Value) -> LunarRequest {
    let (c, n) = (cols.as_array().expect("a request"), |v: &Value| bits(v));
    let parking = c[14].as_array().map(|o| ParkingOrbit {
        frame_et: (!o[0].is_null()).then(|| n(&o[0])),
        epoch_et: n(&o[1]),
        phase_deg: n(&o[2]),
        radius_km: n(&o[3]),
    });
    let scope = match c[7].as_str() {
        Some("local") => LunarScope::Local,
        Some("lunar") => LunarScope::Lunar,
        other => panic!("scope {other:?}"),
    };
    let settings = LunarSettings {
        rtol: n(&c[8]),
        atol_pos: n(&c[9]),
        atol_vel: n(&c[10]),
        max_step: n(&c[11]),
        max_steps: n(&c[12]) as u32,
        near_body_fraction: n(&c[13]),
    };
    LunarRequest {
        launch_et: n(&c[0]),
        parking_radius_km: n(&c[1]),
        parking_phase_deg: n(&c[2]),
        delta_v_km_s: n(&c[3]),
        burn_angle_deg: n(&c[4]),
        duration_seconds: n(&c[5]),
        approach_radius_km: n(&c[6]),
        scope,
        settings,
        parking,
        stop_at_entry: c[15].as_bool().expect("a stop flag"),
    }
}

#[test]
fn the_real_soi_stop_ends_at_the_first_entry() {
    let (model, q) = (model(), real(0.0, true));
    let flight = fly(&model, &q);
    let start = parking_state(&model, &GAME, LAUNCH_ET).expect("a valid orbit");
    let first = flight.samples[0].r.map(f64::to_bits);
    assert_eq!(first, start.r.map(f64::to_bits));
    let (last, before) = flight.samples.split_last().expect("samples");
    assert_eq!(Some(last.t.to_bits()), flight.entry_et.map(f64::to_bits));
    let off = (moon_distance(&model, last) - MOON_SOI_KM).abs();
    println!("real-SOI stop: {off:e} km off the sphere");
    assert!(off < 0.005, "{off} km");
    let outside = |k: &Knot| moon_distance(&model, k) >= MOON_SOI_KM;
    assert!(before.iter().all(outside));
    let rerun = fly(&model, &q);
    assert_eq!(knot_bits(&rerun.samples), knot_bits(&flight.samples));
}

#[test]
fn a_graze_between_knots_is_found_and_stopped_there() {
    let model = model();
    let diagnostic = fly(&model, &real(17.33167459468716, false));
    let stopped = fly(&model, &real(17.33167459468716, true));
    let knots = &diagnostic.samples;
    let distance = |et: f64| moon_distance(&model, &sample_flight(knots, et));
    assert!(knots.iter().all(|k| distance(k.t) > MOON_SOI_KM));
    let entry = diagnostic.entry_et.expect("an entry");
    let index = knots
        .iter()
        .position(|k| k.t > entry)
        .expect("a later knot");
    assert!(index > 0 && knots[index - 1].t < entry);
    let closest = diagnostic.closest_et;
    assert!(entry < closest && closest < knots[index].t);
    let depth = MOON_SOI_KM - distance(closest);
    println!("graze: {depth} km deep, {} s after entry", closest - entry);
    assert!(depth > 0.0 && distance(entry - 0.01) > MOON_SOI_KM);
    assert_eq!(stopped.entry_et.map(f64::to_bits), Some(entry.to_bits()));
    let last = stopped.samples[stopped.samples.len() - 1];
    assert_eq!(last.t.to_bits(), entry.to_bits());
    assert!(stopped.samples.iter().all(|k| k.t <= entry));
    assert!((moon_distance(&model, &last) - MOON_SOI_KM).abs() < 0.01);
}

/// A physics case on the 65,000 km study zone (`flight.ts:32`), not a game expectation.
#[test]
fn the_study_zone_hit_miss_and_earth_impact() {
    let (model, q) = (model(), request_for(3.24, 0.0));
    let hit = fly(&model, &q);
    let days = (hit.entry_et.expect("an entry") - LAUNCH_ET) / DAY;
    println!(
        "study hit: entry {days} days, closest {} km",
        hit.closest_km
    );
    assert!((days - 1.582776944585).abs() < 5e-8, "{days} days");
    assert!(hit.impact.is_none() && hit.closest_km < 8100.0);
    assert_eq!(knot_bits(&fly(&model, &q).samples), knot_bits(&hit.samples));
    let miss = fly(&model, &request_for(3.24, 20.0));
    assert!(miss.entry_et.is_none() && miss.closest_km > 100_000.0);
    let impact = fly(&model, &request_for(3.24, -20.0));
    assert!(impact.impact == Some(LunarImpact::Earth) && impact.entry_et.is_none());
    // The graze tuned to the study zone enters it within 0.05 km (flight.test.ts:59-64).
    let graze = fly(&model, &request_for(3.24, 17.210867496829703));
    let entry = graze.entry_et.expect("an entry");
    let off = (moon_distance(&model, &sample_flight(&graze.samples, entry)) - 65000.0).abs();
    println!("study graze: entry {off:e} km off the zone");
    assert!(off < 0.05, "{off} km");
}

#[test]
fn tighter_settings_keep_the_approach() {
    let (model, q) = (model(), request_for(3.24, 0.0));
    let mut tight = q;
    let s = &mut tight.settings;
    (s.rtol, s.atol_pos, s.atol_vel, s.max_step) = (1e-12, 0.0001, 1e-10, 600.0);
    let (normal, tight) = (fly(&model, &q), fly(&model, &tight));
    let entry = (normal.entry_et.expect("an entry") - tight.entry_et.expect("an entry")).abs();
    let at = |f: &LunarFlight, et: f64| sample_flight(&f.samples, et).r;
    let ets = (0..=200).map(|i| LAUNCH_ET + 7.0 * DAY * f64::from(i) / 200.0);
    let gaps = ets.map(|et| norm(sub(at(&normal, et), at(&tight, et))));
    let worst = gaps.fold(0.0, f64::max);
    println!("tighter settings: entry {entry:e} s, 201 positions within {worst:e} km");
    assert!(entry < 0.01 && worst < 0.05);
}

#[test]
fn weak_pulls_stay_local_and_a_nan_launch_is_refused() {
    let model = model();
    for dv in [0.0, 0.05, 0.2, 0.5] {
        let q = request_for(dv, 0.0);
        let flight = fly(&model, &q);
        assert!(q.scope == LunarScope::Local && q.duration_seconds <= DAY);
        assert!(flight.steps < 1500 && flight.entry_et.is_none());
        let end = LAUNCH_ET + q.duration_seconds;
        assert!((flight.end_et - end).abs() < 5e-6, "{dv} km/s");
    }
    let mut nan = request_for(3.24, 0.0);
    nan.launch_et = f64::NAN;
    let refused = simulate_lunar(&model, &nan).err();
    assert_eq!(refused, Some(LunarError::BurnOutsideBudget));
}

/// Each refusal by its TypeScript text. Past the rail, the check at launch plus duration
/// refuses before any step, even for a flight that would hit Earth inside the rail.
#[test]
fn refusals_keep_the_typescript_text() {
    let (model, rows) = (model(), section("flight_errors"));
    assert_eq!(rows.len(), 13);
    let errors = [
        LunarError::BurnOutsideBudget,
        LunarError::SolverUnsettled,
        LunarError::StepBudgetExceeded,
        LunarError::Rail(RailError::OutsideDates),
    ];
    let mut seen = [false; 4];
    for row in &rows {
        let (name, message) = (&row[0], row[2].as_str().expect("a message"));
        let at = errors.iter().position(|e| e.to_string() == message);
        let at = at.unwrap_or_else(|| panic!("{name}: no error says {message}"));
        let got = simulate_lunar(&model, &request(&row[1]));
        assert_eq!(got.err(), Some(errors[at]), "{name}");
        seen[at] = true;
    }
    assert_eq!(seen, [true; 4]);
}

#[test]
fn request_for_matches_typescript_and_clamps_the_burn() {
    for row in &section("requests") {
        let (dv, angle) = (bits(&row[0]), bits(&row[1]));
        let (got, want) = (request_for(dv, angle), request(&row[2]));
        // Debug prints each f64 so that it reads back to the same bits, and any NaN as NaN:
        // V8's `Math.max` gives its NaN the sign bit, Rust's has it clear.
        assert_eq!(format!("{got:?}"), format!("{want:?}"));
    }
    // flight.ts:20 clamps without an error.
    assert_eq!(request_for(-1.0, 0.0).delta_v_km_s.to_bits(), 0);
    assert_eq!(request_for(5.0, 0.0).delta_v_km_s, FUEL_BUDGET);
}

/// Each flight's steps, ending and entry equal the TypeScript's. Its entry and end times
/// hold within 5 ms, inside the 0.01 s of `flight.test.ts:53`, except the study graze's:
/// it crosses its zone so slowly that 0.3 m is 0.03 s, so the crossing is held in distance
/// as well. A closest approach is flat to millimetres for a second or more, so the
/// TypeScript's closest time is held in distance (deviation row 101).
#[test]
fn flights_match_typescript() {
    let (model, rows) = (model(), section("flights"));
    assert_eq!(rows.len(), 12);
    // Entry and end, and closest times [s]; closest, last position, the zone at the
    // TypeScript's entry, and the closest distance at its closest time [km].
    let mut worst = [0.0_f64; 6];
    for row in &rows {
        let (name, q) = (row[0].as_str().expect("a case"), request(&row[1]));
        let flight = fly(&model, &q);
        let want_entry = (!row[2].is_null()).then(|| bits(&row[2]));
        let impact = flight.impact.map(|b| format!("{b:?}").to_lowercase());
        let steps = Some(u64::from(flight.steps));
        let got = (flight.entry_et.is_some(), impact.as_deref(), steps);
        let want = (want_entry.is_some(), row[3].as_str(), row[7].as_u64());
        assert_eq!(got, want, "{name}: entry, impact and steps");
        // t, r and v of the first and last samples.
        let [first, last] = [8, 9].map(|i| [0, 1, 2, 3, 4, 5, 6].map(|j| bits(&row[i][j])));
        let (got_first, got_last) = (flight.samples[0], flight.samples[flight.samples.len() - 1]);
        // Sample 0 is the departure, whose position is the TypeScript's bits (PR11).
        let want_r = [first[1], first[2], first[3]].map(f64::to_bits);
        assert_eq!(got_first.r.map(f64::to_bits), want_r, "{name}");
        assert!(norm(sub(got_first.v, [first[4], first[5], first[6]])) < 1e-14);
        let moon_at = |et: f64| moon_distance(&model, &sample_flight(&flight.samples, et));
        let entry = want_entry.map_or(0.0, |w| (flight.entry_et.unwrap_or(f64::NAN) - w).abs());
        let zone = want_entry.map_or(0.0, |w| (moon_at(w) - q.approach_radius_km).abs());
        let (closest_et, end) = (bits(&row[5]), (flight.end_et - bits(&row[6])).abs());
        let gaps = [
            entry.max(end).max((got_last.t - last[0]).abs()),
            (flight.closest_et - closest_et).abs(),
            (flight.closest_km - bits(&row[4])).abs(),
            norm(sub(got_last.r, [last[1], last[2], last[3]])),
            zone,
            (moon_at(closest_et) - flight.closest_km).abs(),
        ];
        println!("{name:20} {:5} steps, gaps {gaps:?}", flight.steps);
        assert!(gaps.iter().all(|g| g.is_finite()), "{name}: {gaps:?}");
        assert!(gaps[0] < 0.005 || name == "study graze", "{name}: {gaps:?}");
        worst = [0, 1, 2, 3, 4, 5].map(|i| worst[i].max(gaps[i]));
    }
    println!("worst {worst:?}");
    // Measured: the graze's 0.031 s; 2.9e-4 km, 0.084 km (5 ms of heliocentric speed at
    // a stop), 5.9e-4 km (the 1 ms bisection) and 1.8e-5 km.
    let [times, _, closest_km, last_km, zone, flat] = worst;
    assert!(
        times < 0.05 && closest_km < 1e-3 && last_km < 0.1,
        "{worst:?}"
    );
    assert!(zone < 1e-3 && flat < 5e-5, "{worst:?}");
}
