//! The shot model: the frozen settings' tie to the TypeScript game (D6), the training
//! capture zone and its refusal, the 2050 flag, the bullseye and the flybys. The First
//! Light and sandbox shots are those of `apps/game/src/levels.test.ts`.

use serde_json::Value;
use starshot_ephemeris::time::{SECONDS_PER_DAY, et_from_iso};
use starshot_ephemeris::vec::{norm, sub};
use starshot_ephemeris::{BodyId, Ephemeris, Table1Ephemeris, Vec3};
use starshot_game::settings::{OUTER_SIM_SETTINGS, SIM_SETTINGS, SimSettings, lunar};
use starshot_game::{
    BULLSEYE_RADII, EPHEMERIS_VALID_UNTIL_ET, ShotError, ShotRequest, analyze_shot, periapsis_km,
    simulate_shot, stop_at_capture_zone,
};
use starshot_physics::simulate::BODY_COUNT;
use starshot_physics::{
    Encounter, Knot, LEO_RADIUS_KM, SimulationResult, Termination, delta_v_from_leo,
};

const SIMULATE: &str = include_str!("../../../fixtures/conformance/simulate.json");
const EPH: Table1Ephemeris = Table1Ephemeris { flatten: true };

fn bits(v: &Value) -> u64 {
    u64::from_str_radix(v.as_str().expect("hex bits"), 16).expect("16 hex digits")
}

fn key(s: &SimSettings) -> [u64; 4] {
    [
        s.rtol.to_bits(),
        s.atol_km.to_bits(),
        s.max_step.to_bits(),
        u64::from(s.max_steps),
    ]
}

#[test]
fn frozen_settings_equal_the_typescript_games() {
    // apps/game/src/sim/simulate-fixture.test.ts holds each level flight's settings in
    // this fixture to those of the request the game builds, so these equalities tie
    // settings.rs to shot.ts. Sandbox targets beyond Mars fly OUTER_SIM_SETTINGS (D6).
    let file: Value = serde_json::from_str(SIMULATE).expect("valid JSON");
    let mut seen = [false; 2];
    for flight in file["flights"].as_array().expect("flights") {
        let input = &flight["input"];
        let Some(level) = input["level"].as_str() else {
            continue;
        };
        let sim = &input["sim"];
        let got = [
            bits(&sim["rtol"]),
            bits(&sim["atolKm"]),
            bits(&sim["maxStep"]),
            sim["maxSteps"].as_u64().expect("an integer"),
        ];
        let giant = ["jupiter", "saturn", "uranus", "neptune"]
            .contains(&input["stopAtSoiOf"].as_str().expect("a target"));
        let outer = level == "sandbox" && giant;
        let want = if outer {
            OUTER_SIM_SETTINGS
        } else {
            SIM_SETTINGS
        };
        assert_eq!(got, key(&want), "{}", input["name"]);
        seen[usize::from(outer)] = true;
    }
    assert_eq!(seen, [true, true], "the fixture flies both settings");
    assert_eq!(lunar::SETTINGS, starshot_physics::lunar::SETTINGS);
}

/// A First Light shot (`levels.ts`): Mars in the 2026 window, launched on 2026-11-02.
fn first_light(v_inf: Vec3, capture_zone_scale: f64) -> ShotRequest {
    ShotRequest {
        target: BodyId::Mars,
        attractors: vec![BodyId::Earth, BodyId::Mars, BodyId::Jupiter],
        launch_et: et_from_iso("2026-11-02").expect("a date"),
        v_inf,
        max_flight_days: 400.0,
        required_flyby: None,
        sim: SIM_SETTINGS,
        capture_zone_scale,
    }
}

/// 129.60 degrees, 2.982 km/s: passes Mars at 1.11 spheres of influence.
const NEAR_MISS: Vec3 = [-1.900798, 2.29767, 0.0];
/// The level's known solution, a hit.
const KNOWN: Vec3 = [-1.815327, 2.36578, 0.0];

fn mars_km(k: &Knot) -> f64 {
    norm(sub(k.r, EPH.state(BodyId::Mars, k.t).r))
}

#[test]
fn a_pass_inside_the_training_zone_is_a_hit_cut_where_it_enters() {
    let zone = first_light(NEAR_MISS, 3.0);
    let cut = simulate_shot(&EPH, &zone).expect("scale 3 flies");
    let a = analyze_shot(&EPH, &zone, &cut);
    assert!(a.hit && a.capture_zone_scale == 3.0);
    assert_eq!(
        (a.termination, a.terminated_by),
        (Termination::SoiReached, Some(BodyId::Mars))
    );
    assert_eq!(a.capture_zone_km, 3.0 * a.target_soi_km);
    let end = cut.samples[cut.samples.len() - 1];
    let mars = EPH.state(BodyId::Mars, end.t).r;
    let ratio = starshot_math::hypot(end.r[0] - mars[0], end.r[1] - mars[1]) / a.capture_zone_km;
    // Just inside: the 1 ms bisection resolves the radius to about 1.5e-9 of itself.
    assert!(ratio < 1.0 && ratio > 1.0 - 1e-8, "{ratio}");

    // Up to the cut, the flight is the real-zone flight, step for step.
    let real = first_light(NEAR_MISS, 1.0);
    let full = simulate_shot(&EPH, &real).expect("scale 1 flies");
    // The TypeScript's step count for this aim (fixtures/conformance/simulate.json), so
    // the request's settings reach the integrator.
    assert_eq!(full.steps, 447);
    let n = cut.samples.len() - 1;
    assert_eq!(cut.samples[..n], full.samples[..n]);
    assert_eq!(cut.steps, full.steps);
    let b = analyze_shot(&EPH, &real, &full);
    assert!(!b.hit && b.closest_km / b.target_soi_km > 1.0 && b.closest_km / b.target_soi_km < 3.0);
    let c = full.closest[BodyId::Mars as usize].expect("a Mars pass");
    assert_eq!((b.closest_km, b.closest_et), (c.distance_km, c.t));
    // A zone 1 km wider than the pass holds no sample, so only the refined closest
    // approach finds the dip; the cut still ends just inside. It closes at 4.7 m/s
    // there, so the 1 ms bisection resolves about 5e-6 km.
    let dip = c.distance_km + 1.0;
    assert!(full.samples.iter().all(|k| mars_km(k) > dip));
    let cut = stop_at_capture_zone(&EPH, full.clone(), BodyId::Mars, dip);
    let d = mars_km(&cut.samples[cut.samples.len() - 1]);
    assert!(cut.termination == Termination::SoiReached && d < dip && d > dip - 1e-5);
    // A zone the flight never crosses changes nothing.
    assert_eq!(
        stop_at_capture_zone(&EPH, full.clone(), BodyId::Mars, 1.0),
        full
    );
}

#[test]
fn a_zone_smaller_than_the_real_sphere_is_refused() {
    for scale in [0.5, 0.0, f64::NAN, f64::NEG_INFINITY, 1.0f64.next_down()] {
        let err = simulate_shot(&EPH, &first_light(NEAR_MISS, scale)).expect_err("refused");
        let ShotError::CaptureZoneScale(got) = err;
        assert_eq!(got.to_bits(), scale.to_bits());
    }
    let err = simulate_shot(&EPH, &first_light(NEAR_MISS, 0.5)).expect_err("refused");
    assert!(
        err.to_string()
            .starts_with("captureZoneScale must be at least 1 (got 0.5): ")
    );
    assert!(simulate_shot(&EPH, &first_light(NEAR_MISS, 1.0)).is_ok());
}

#[test]
fn the_request_settings_reach_the_integrator() {
    let fly = |sim: SimSettings| {
        let shot = ShotRequest {
            sim,
            ..first_light(KNOWN, 1.0)
        };
        simulate_shot(&EPH, &shot).expect("flies")
    };
    // The known solution stops at the real sphere after the TypeScript's 273 steps.
    let hit = fly(SIM_SETTINGS);
    assert_eq!(
        (hit.termination, hit.terminated_by, hit.steps),
        (Termination::SoiReached, Some(BodyId::Mars), 273)
    );
    let capped = fly(SimSettings {
        max_steps: 50,
        ..SIM_SETTINGS
    });
    assert_eq!(
        (capped.termination, capped.steps),
        (Termination::MaxSteps, 50)
    );
    // At the frozen 1 km atol, rtol leaves this flight's samples unchanged from 1e-10 to
    // 1e-6, so it shows only under a tighter atol: 380 steps at 1e-12 against 275 at 1e-10.
    let tight = SimSettings {
        rtol: 1e-12,
        atol_km: 1e-6,
        ..SIM_SETTINGS
    };
    let base = fly(SimSettings {
        rtol: 1e-10,
        ..tight
    })
    .steps;
    assert!(fly(tight).steps > base + 50);
}

#[test]
fn flights_past_2050_are_flagged_not_refused() {
    assert_eq!(
        et_from_iso("2050-01-01").map(f64::to_bits),
        Ok(EPHEMERIS_VALID_UNTIL_ET.to_bits())
    );
    let late = ShotRequest {
        target: BodyId::Neptune,
        attractors: vec![
            BodyId::Earth,
            BodyId::Jupiter,
            BodyId::Saturn,
            BodyId::Uranus,
            BodyId::Neptune,
        ],
        launch_et: et_from_iso("2047-06-01").expect("a date"),
        // vInfFromAim at 200 degrees and 3 km/s, as V8 computes it.
        v_inf: [-2.8190778623577253, -1.026060429977006, 0.0],
        max_flight_days: 5000.0,
        required_flyby: None,
        sim: OUTER_SIM_SETTINGS,
        capture_zone_scale: 1.0,
    };
    let flown = simulate_shot(&EPH, &late).expect("flies");
    assert_eq!(flown.steps, 546, "the TypeScript's count");
    let a = analyze_shot(&EPH, &late, &flown);
    assert!(a.end_et > EPHEMERIS_VALID_UNTIL_ET && a.beyond_ephemeris_range);
    let known = first_light(KNOWN, 3.0);
    let a = analyze_shot(&EPH, &known, &simulate_shot(&EPH, &known).expect("flies"));
    assert!(a.hit && !a.beyond_ephemeris_range);
    // The flag starts strictly after the limit.
    let at = |t: f64| flight(t, [0.0; 3], [0.0; 3], Termination::Duration, vec![]);
    assert!(!analyze_shot(&EPH, &known, &at(EPHEMERIS_VALID_UNTIL_ET)).beyond_ephemeris_range);
    assert!(
        analyze_shot(&EPH, &known, &at(EPHEMERIS_VALID_UNTIL_ET.next_up())).beyond_ephemeris_range
    );
}

/// A made-up flight from the launch to a last sample at `t`, so the analysis can be
/// checked against states with a known answer.
fn flight(
    t: f64,
    r: Vec3,
    v: Vec3,
    termination: Termination,
    encounters: Vec<Encounter>,
) -> SimulationResult {
    let ended_at_mars = matches!(termination, Termination::SoiReached | Termination::Impact);
    let start = Knot {
        t: et_from_iso("2026-11-02").expect("a date"),
        r: [0.0; 3],
        v: [0.0; 3],
    };
    SimulationResult {
        samples: vec![start, Knot { t, r, v }],
        encounters,
        closest: [None; BODY_COUNT],
        termination,
        terminated_by: ended_at_mars.then_some(BodyId::Mars),
        end_time: t,
        steps: 1,
    }
}

/// A last sample at the periapsis of a hyperbola of `rp` km about Mars, at `t`.
fn at_periapsis(t: f64, rp: f64) -> (Vec3, Vec3) {
    let mars = EPH.state(BodyId::Mars, t);
    let vp = 1.5 * starshot_math::sqrt(2.0 * BodyId::Mars.info().gm / rp);
    (
        [mars.r[0] + rp, mars.r[1], 0.0],
        [mars.v[0], mars.v[1] + vp, 0.0],
    )
}

#[test]
fn the_bullseye_is_a_hit_under_ten_target_radii() {
    assert_eq!(BULLSEYE_RADII, 10.0);
    let shot = first_light(NEAR_MISS, 1.0);
    let t = shot.launch_et + 300.0 * SECONDS_PER_DAY;
    let radius = BodyId::Mars.info().radius_km;
    for (radii, bullseye) in [(9.9, true), (10.1, false)] {
        let (r, v) = at_periapsis(t, radii * radius);
        let a = analyze_shot(
            &EPH,
            &shot,
            &flight(t, r, v, Termination::SoiReached, vec![]),
        );
        assert!(
            a.hit && (a.closest_km / (radii * radius) - 1.0).abs() < 1e-9,
            "{a:?}"
        );
        assert_eq!(
            (a.bullseye, a.periapsis_km, a.closest_et),
            (bullseye, Some(a.closest_km), t)
        );
        // Relative to Mars, the probe passes at 1.5 times the escape speed.
        let escape = starshot_math::sqrt(2.0 * BodyId::Mars.info().gm / (radii * radius));
        assert!((a.arrival_speed_km_s.expect("a hit") / escape - 1.5).abs() < 1e-12);
    }
    let (r, v) = at_periapsis(t, 2.0 * radius);
    let impact = analyze_shot(&EPH, &shot, &flight(t, r, v, Termination::Impact, vec![]));
    assert!(impact.hit && impact.bullseye && impact.periapsis_km == Some(0.0));
    // The same impact on another planet is no hit on the target.
    let elsewhere = SimulationResult {
        terminated_by: Some(BodyId::Earth),
        ..flight(t, r, v, Termination::Impact, vec![])
    };
    assert!(!analyze_shot(&EPH, &shot, &elsewhere).hit);
    // Inside ten radii without reaching the zone is a miss, and no bullseye.
    let miss = analyze_shot(&EPH, &shot, &flight(t, r, v, Termination::Duration, vec![]));
    assert!(!miss.hit && !miss.bullseye && miss.periapsis_km.is_none());
    assert!((miss.closest_km / (2.0 * radius) - 1.0).abs() < 1e-12);
}

#[test]
fn flybys_count_other_planets_inside_their_spheres_before_the_end() {
    let t = et_from_iso("2027-06-01").expect("a date");
    let pass = |body, dt: f64, inside_soi| Encounter {
        body,
        t: t + dt,
        distance_km: 1e5,
        relative_speed_km_s: 5.0,
        inside_soi,
        impact: false,
    };
    let encounters = vec![
        pass(BodyId::Jupiter, -9.0, true),
        pass(BodyId::Jupiter, -8.0, false),
        pass(BodyId::Mars, -7.0, true),
        pass(BodyId::Sun, -6.0, true),
        pass(BodyId::Venus, 1.0, true),
    ];
    let (r, v) = at_periapsis(t, 1e5);
    let result = flight(t, r, v, Termination::SoiReached, encounters);
    let mut shot = ShotRequest {
        required_flyby: Some(BodyId::Jupiter),
        ..first_light([3.0, 4.0, 0.0], 1.0)
    };
    let a = analyze_shot(&EPH, &shot, &result);
    assert_eq!(a.flybys.len(), 1);
    assert_eq!(
        (a.flybys[0].body, a.flybys[0].t),
        (BodyId::Jupiter, t - 9.0)
    );
    assert!(a.required_flyby_done);
    assert_eq!((a.v_inf_km_s, a.c3), (5.0, 25.0));
    assert_eq!(a.delta_v_km_s, delta_v_from_leo(5.0, LEO_RADIUS_KM));
    assert_eq!(
        (a.launch_et, a.flight_days),
        (shot.launch_et, (t - shot.launch_et) / SECONDS_PER_DAY)
    );
    shot.required_flyby = Some(BodyId::Venus);
    assert!(!analyze_shot(&EPH, &shot, &result).required_flyby_done);
}

#[test]
fn periapsis_of_two_body_states() {
    let mu = BodyId::Mars.info().gm;
    // A radial fall has no angular momentum, so its periapsis is the centre.
    assert_eq!(periapsis_km([1e5, 0.0, 0.0], [-3.0, 0.0, 0.0], mu), 0.0);
    // A circular orbit is its own periapsis. Its eccentricity is the square root of a
    // rounding error, about 1e-8, so the bound is loose.
    let circular = starshot_math::sqrt(mu / 1e4);
    let rp = periapsis_km([0.0, 1e4, 0.0], [-circular, 0.0, 0.0], mu);
    assert!((rp / 1e4 - 1.0).abs() < 1e-7, "{rp}");
}
