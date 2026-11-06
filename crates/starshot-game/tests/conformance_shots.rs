//! The shot model against the TypeScript game's, through `fixtures/conformance/shots.json`
//! (written by `apps/game/src/sim/conformance.test.ts`): 30 shots that the game's own
//! builders made on every campaign level and the sandbox. Each request is read back from
//! its bits and flown through `simulate_shot`, so a dropped `rtol`, `atol_km`, `max_step`
//! or `stop_at_soi_of` changes the flight; every shot uses the default `max_steps`, which
//! `tests/shot.rs` pins. Every `ShotAnalysis` field is compared, and the step count: exactly,
//! except the numbers a flight moves and those through `pow` and `norm`, within the bounds
//! below.

mod common;

use common::{analysis, bits, body, with_moved_numbers};
use serde_json::Value;
use starshot_ephemeris::Table1Ephemeris;
use starshot_game::{
    CAMPAIGN, ShotAnalysis, ShotRequest, SimSettings, analyze_shot, launch_et_for_day,
    shot_request_for, simulate_shot,
};

const SHOTS: &str = include_str!("../../../fixtures/conformance/shots.json");
const EPH: Table1Ephemeris = Table1Ephemeris { flatten: true };

/// Each gap's name and bound: tighter than the plan's 1 km and 1e-6 days (00-plan.md,
/// PR13), and as `starshot-physics/tests/conformance_simulate.rs` holds the same flights'
/// times and distances. Measured when the fixture was written: end time 1.2e-6 s, flight
/// time 1.4e-11 days, closest and flyby distances 5.9e-5 km, closest-approach times
/// 0.46 s (the golden section's 1 s bracket), speeds 2.1e-10 km/s, and 4.9e-16 relative
/// for the sphere, excess speed, delta-v and C3, which pass through `pow` and `norm`.
const BOUNDS: [(&str, f64); 6] = [
    ("end time [s]", 1e-3),
    ("flight time [days]", 1e-8),
    ("closest distance [km]", 1e-3),
    ("closest-approach time [s]", 1.0),
    ("arrival or flyby speed [km/s]", 1e-8),
    ("relative gap of a length or speed", 1e-15),
];

/// The request from the fixture's `request_columns`.
fn request(c: &[Value]) -> ShotRequest {
    let attractors = c[1].as_array().expect("attractors");
    ShotRequest {
        target: body(&c[0]).expect("a target"),
        attractors: attractors
            .iter()
            .map(|b| body(b).expect("a planet"))
            .collect(),
        launch_et: bits(&c[2]),
        v_inf: [bits(&c[3]), bits(&c[4]), bits(&c[5])],
        max_flight_days: bits(&c[6]),
        required_flyby: body(&c[7]),
        sim: SimSettings {
            rtol: bits(&c[8]),
            atol_km: bits(&c[9]),
            max_step: bits(&c[10]),
            max_steps: c[11].as_u64().expect("an integer") as u32,
        },
        capture_zone_scale: bits(&c[12]),
    }
}

/// Each bounded gap of `got` from `want`, as (index into `BOUNDS`, gap). A field one has
/// and the other lacks fails the exact comparison, not this one.
fn gaps(got: &ShotAnalysis, want: &ShotAnalysis) -> Vec<(usize, f64)> {
    let relative = |a: f64, b: f64| if a == b { 0.0 } else { ((a - b) / b).abs() };
    let opt = |a: Option<f64>, b: Option<f64>| a.zip(b).map_or(0.0, |(a, b)| (a - b).abs());
    let mut out = vec![
        (0, (got.end_et - want.end_et).abs()),
        (1, (got.flight_days - want.flight_days).abs()),
        (2, (got.closest_km - want.closest_km).abs()),
        (2, opt(got.periapsis_km, want.periapsis_km)),
        (3, (got.closest_et - want.closest_et).abs()),
        (4, opt(got.arrival_speed_km_s, want.arrival_speed_km_s)),
    ];
    for (g, w) in got.flybys.iter().zip(&want.flybys) {
        out.extend([
            (3, (g.t - w.t).abs()),
            (2, (g.distance_km - w.distance_km).abs()),
        ]);
        out.push((4, (g.relative_speed_km_s - w.relative_speed_km_s).abs()));
    }
    for (g, w) in [
        (got.target_soi_km, want.target_soi_km),
        (got.capture_zone_km, want.capture_zone_km),
        (got.v_inf_km_s, want.v_inf_km_s),
        (got.delta_v_km_s, want.delta_v_km_s),
        (got.c3, want.c3),
    ] {
        out.push((5, relative(g, w)));
    }
    out
}

#[test]
fn shots_match_typescript() {
    let file: Value = serde_json::from_str(SHOTS).expect("valid JSON");
    assert_eq!(file["schema"], "starshot.conformance-shots/1");
    let shots = file["shots"].as_array().expect("shots");
    assert_eq!(shots.len(), 30);
    let (mut worst, mut problems) = ([0.0_f64; BOUNDS.len()], Vec::new());
    for row in shots {
        let name = row[0].as_str().expect("a name");
        let c = row[4].as_array().expect("a request");
        let start = row[2].as_str().expect("a window start");
        let day = row[3].as_u64().expect("a day") as u32;
        let launch = launch_et_for_day(start, day).expect("a launch day");
        assert_eq!(
            launch.to_bits(),
            bits(&c[2]).to_bits(),
            "{name}: launch day"
        );
        let shot = request(c);
        // The level's builder must give the request the game built (D6), attractor order too.
        if let Some(level) = CAMPAIGN.iter().find(|l| l.id.as_str() == row[1]) {
            let mine = shot_request_for(level, launch, shot.v_inf);
            assert_eq!(mine, shot, "{name}: level request");
        }
        let result = simulate_shot(&EPH, &shot).expect("the fixture's scale flies");
        let got = analyze_shot(&EPH, &shot, &result);
        let want = analysis(row[5].as_array().expect("an analysis"));
        assert_eq!(
            u64::from(result.steps),
            row[6].as_u64().expect("steps"),
            "{name}: steps"
        );
        // Debug prints every f64 so that it reads back to the same bits.
        let same = ShotAnalysis {
            target_soi_km: got.target_soi_km,
            capture_zone_km: got.capture_zone_km,
            v_inf_km_s: got.v_inf_km_s,
            delta_v_km_s: got.delta_v_km_s,
            c3: got.c3,
            ..with_moved_numbers(&want, &got)
        };
        assert_eq!(format!("{got:?}"), format!("{same:?}"), "{name}");
        for (kind, gap) in gaps(&got, &want) {
            worst[kind] = worst[kind].max(gap);
            // A NaN gap fails: `gap >= bound` alone would let it through.
            if gap.is_nan() || gap >= BOUNDS[kind].1 {
                problems.push(format!("{name}: {} off by {gap:e}", BOUNDS[kind].0));
            }
        }
    }
    for ((what, bound), gap) in BOUNDS.iter().zip(worst) {
        println!("worst {what}: {gap:e} (bound {bound:e})");
    }
    assert!(problems.is_empty(), "{problems:#?}");
}
