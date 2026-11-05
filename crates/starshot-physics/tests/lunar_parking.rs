//! The parking orbit and its departure burn: today's parking tests
//! (`packages/physics/test/lunar.test.ts:26-43`), then the TypeScript's states and
//! refusals in `fixtures/conformance/lunar.json` (written by
//! `packages/physics/test/conformance-lunar.test.ts`). Phases and positions equal the
//! TypeScript's bits. Velocities pass through `unit`'s `norm`, which differs from
//! `Math.hypot` in the last bit (G10), so they hold within 1e-14 km/s, tighter than the
//! proposed 1 mm/s; a wrong Earth GM moves them by 2e-13 km/s.

mod common;

use common::{LUNAR, bits, lunar_model as model, lunar_section as section};
use serde_json::Value;
use starshot_ephemeris::State;
use starshot_ephemeris::vec::{Vec3, norm, sub};
use starshot_math::{pow, sqrt};
use starshot_physics::lunar::{
    DAY, EARTH_GM, EARTH_RADIUS, FUEL_BUDGET, LAUNCH_ET, LunarError, LunarModel, MOON_GM,
    MOON_RADIUS, MOON_SOI_KM, ParkingOrbit, RailError, departure, parking_period, parking_phase,
    parking_state,
};

/// The game's orbit: 200 km up, phase 225 degrees, in the plane fixed at `LAUNCH_ET` (D38).
const GAME: ParkingOrbit = ParkingOrbit {
    frame_et: Some(LAUNCH_ET),
    epoch_et: LAUNCH_ET,
    phase_deg: 225.0,
    radius_km: 6571.0,
};

/// An orbit stored as frameEt (null to fall back to the epoch), epochEt, phaseDeg, radiusKm.
fn orbit(cols: &[Value]) -> ParkingOrbit {
    ParkingOrbit {
        frame_et: (!cols[0].is_null()).then(|| bits(&cols[0])),
        epoch_et: bits(&cols[1]),
        phase_deg: bits(&cols[2]),
        radius_km: bits(&cols[3]),
    }
}

/// The craft relative to Earth's centre, as lunar.test.ts's `relativeParking`.
fn relative(model: &LunarModel, orbit: &ParkingOrbit, et: f64) -> State {
    let craft = parking_state(model, orbit, et).expect("a valid orbit");
    let earth = model.bodies(et).expect("inside the rail").earth;
    State {
        r: sub(craft.r, earth.r),
        v: sub(craft.v, earth.v),
    }
}

/// Every component's bits: `assert_eq!` on f64s would let 0.0 equal -0.0.
fn state_bits(s: State) -> Vec<u64> {
    s.r.iter().chain(&s.v).map(|x| x.to_bits()).collect()
}

fn cols_bits(cols: &[Value]) -> Vec<u64> {
    cols.iter().map(|c| bits(c).to_bits()).collect()
}

fn vec_of(cols: &[Value]) -> Vec3 {
    [bits(&cols[0]), bits(&cols[1]), bits(&cols[2])]
}

#[test]
fn moon_soi_km_and_the_other_constants_are_model_ts_bits() {
    let file: Value = serde_json::from_str(LUNAR).expect("fixture is valid JSON");
    let constants = &file["physics_constants"];
    let named = [
        ("DAY", DAY),
        ("EARTH_RADIUS", EARTH_RADIUS),
        ("MOON_RADIUS", MOON_RADIUS),
        ("FUEL_BUDGET", FUEL_BUDGET),
        ("MOON_SOI_KM", MOON_SOI_KM),
    ];
    for (name, value) in named {
        assert_eq!(value.to_bits(), bits(&constants[name]).to_bits(), "{name}");
    }
    // The supplement allows 1e-9 km; libm's pow gives V8's bits here.
    let computed = 384400.0 * pow(MOON_GM / EARTH_GM, 0.4);
    println!("MOON_SOI_KM {MOON_SOI_KM} km; starshot_math::pow's {computed} km");
    assert_eq!(computed.to_bits(), MOON_SOI_KM.to_bits());
}

#[test]
fn a_parking_orbit_closes_after_one_period() {
    let (model, period) = (model(), parking_period(GAME.radius_km));
    let start = relative(&model, &GAME, LAUNCH_ET);
    let moved = norm(sub(start.r, relative(&model, &GAME, LAUNCH_ET + period).r));
    let circular = sqrt(EARTH_GM / GAME.radius_km);
    let (mut worst_r, mut worst_v) = (0.0_f64, 0.0_f64);
    for part in [0.0, 0.25, 0.5, 0.75, 1.0] {
        let s = relative(&model, &GAME, LAUNCH_ET + part * period);
        worst_r = worst_r.max((norm(s.r) - GAME.radius_km).abs());
        worst_v = worst_v.max((norm(s.v) - circular).abs());
    }
    println!("parking closure: {moved:e} km; radius off {worst_r:e} km, speed {worst_v:e} km/s");
    assert!(moved < 1e-5, "moved {moved} km in one period");
    assert!(worst_r < 5e-6, "radius off by {worst_r} km");
    assert!(worst_v < 5e-11, "speed off by {worst_v} km/s");
}

#[test]
fn a_new_epoch_keeps_the_fixed_frame_and_the_phase_still_moves() {
    let model = model();
    let frozen = LAUNCH_ET + 321.0;
    let later = frozen + 8.0 * DAY;
    let next = ParkingOrbit {
        epoch_et: later,
        phase_deg: parking_phase(&GAME, frozen),
        ..GAME
    };
    let before = relative(&model, &GAME, frozen);
    let after = relative(&model, &next, later);
    // lunar.test.ts allows 1e-7 km and 1e-12 km/s; the Rust gives the same bits.
    assert_eq!(state_bits(before), state_bits(after));
    let moon_at = |et| model.relative(et).expect("inside the rail").r;
    let moon = norm(sub(moon_at(frozen), moon_at(later)));
    let quarter = later + parking_period(next.radius_km) / 4.0;
    let craft = norm(sub(after.r, relative(&model, &next, quarter).r));
    println!("re-dated: the Moon moves {moon} km, the craft {craft} km in a quarter period");
    assert!(moon > 100_000.0, "the Moon moved {moon} km");
    assert!(craft > 9000.0, "the craft moved {craft} km");
}

#[test]
fn parking_states_match_typescript() {
    let (model, rows) = (model(), section("parking"));
    assert_eq!(rows.len(), 11);
    let (mut equal, mut worst) = (0, 0.0_f64);
    for row in &rows {
        let (orbit, et) = (orbit(&row[..4]), bits(&row[4]));
        let phase = parking_phase(&orbit, et);
        assert_eq!(phase.to_bits(), bits(&row[5]).to_bits(), "phase at {et}");
        let got = parking_state(&model, &orbit, et).expect("a valid orbit");
        let (got_bits, want) = (state_bits(got), cols_bits(&row[6..12]));
        assert_eq!(got_bits[..3], want[..3], "r at {et}");
        worst = worst.max(norm(sub(got.v, vec_of(&row[9..12]))));
        equal += usize::from(got_bits == want);
    }
    let n = rows.len();
    println!("parking: {equal} of {n} states bit for bit, velocities within {worst:e} km/s");
    assert!(worst < 1e-14, "{worst} km/s");
}

#[test]
fn departures_match_typescript_and_start_at_the_parking_position() {
    let (model, rows) = (model(), section("departure"));
    assert_eq!(rows.len(), 7);
    let (mut equal, mut worst) = (0, 0.0_f64);
    for row in &rows {
        let orbit = orbit(&row[..4]);
        let (et, dv, angle) = (bits(&row[4]), bits(&row[5]), bits(&row[6]));
        let got = departure(&model, &orbit, et, dv, angle).expect("a valid departure");
        // The flight's first sample is the displayed parking position (lunar.test.ts:48).
        let parked = parking_state(&model, &orbit, et).expect("a valid orbit");
        let (got_bits, want) = (state_bits(got), cols_bits(&row[7..13]));
        assert_eq!(got_bits[..3], state_bits(parked)[..3], "parked r at {et}");
        assert_eq!(got_bits[..3], want[..3], "r at {et}");
        worst = worst.max(norm(sub(got.v, vec_of(&row[10..13]))));
        equal += usize::from(got_bits == want);
    }
    let n = rows.len();
    println!("departure: {equal} of {n} states bit for bit, velocities within {worst:e} km/s");
    assert!(worst < 1e-14, "{worst} km/s");
}

/// Each refusal's text and kind. Past the rail's last knot, the rail horizon, both functions
/// return the rail's own `OutsideDates`; PR12 adds the flight's horizon at launch plus
/// duration.
#[test]
fn refusals_keep_the_typescript_text() {
    let (model, rows) = (model(), section("errors"));
    assert_eq!(rows.len(), 10);
    for row in &rows {
        let (orbit, et) = (orbit(&row[1..5]), bits(&row[5]));
        let got = match row[0].as_str() {
            Some("parkingState") => parking_state(&model, &orbit, et),
            Some("departure") => departure(&model, &orbit, et, 3.24, 0.0),
            other => panic!("unknown function {other:?}"),
        };
        let message = row[6].as_str().expect("a message");
        let want = match message {
            "Invalid parking orbit" => LunarError::InvalidParkingOrbit,
            _ => LunarError::Rail(RailError::OutsideDates),
        };
        assert_eq!(got, Err(want), "{row:?}");
        assert_eq!(want.to_string(), message);
    }
}
