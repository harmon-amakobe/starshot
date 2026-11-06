//! The campaign levels, as `apps/game/src/levels.test.ts`: each level is solvable with the
//! game's exact simulator settings, its par is real and reachable, First Light's training
//! zone is three spheres wide, and the Grand Tour really needs Jupiter. Every level,
//! sandbox and mission number is tied to `levels.ts` and `missions.ts` through
//! `fixtures/conformance/levels.json` (D6); `tests/sandbox.rs` holds the sandbox's own
//! cases. Each hint is held to the TypeScript's at several budgets through the same file;
//! the cached-ephemeris case runs the search twice, since the core keeps no cache.

use serde_json::{Value, json};
use starshot_ephemeris::BodyId::{self, Earth, Jupiter, Mars, Saturn};
use starshot_ephemeris::time::SECONDS_PER_DAY as DAY;
use starshot_ephemeris::vec::norm;
use starshot_ephemeris::{Ephemeris, PLANET_IDS, Table1Ephemeris, Vec3};
use starshot_game::LevelId::{self, BigGame, FirstLight, GrandTour, MorningStar, Sandbox};
use starshot_game::{
    Aim, CAMPAIGN, GRAND_TOUR_HINT, GRAND_TOUR_PAR_SHOT, HINT_MAX_SIMULATIONS, HINT_STAR_CAP,
    HintQuery, KnownShot, Level, LunarLevel, MISSION_ORDER, MOONSHOT, MissionId, SANDBOX_TARGETS,
    SIM_SETTINGS, ScoringRules, ShotAnalysis, ShotError, ShotFacts, ShotRequest, analyze_shot,
    days_between_iso, find_hint, framing_bodies, hint_query_for, launch_et_for_day, mission_number,
    next_mission, sandbox_level, score_shot, shot_request_for, shot_template, simulate_shot,
    v_inf_from_aim,
};
use starshot_physics::{LEO_RADIUS_KM, best_direct_transfer, delta_v_from_leo};

const LEVELS: &str = include_str!("../../../fixtures/conformance/levels.json");
const EPH: Table1Ephemeris = Table1Ephemeris { flatten: true };

/// One known solution per campaign level: a launch date and a departure excess velocity
/// [km/s], digit for digit those of `levels.test.ts`.
const KNOWN_SOLUTIONS: [(LevelId, &str, Vec3); 4] = [
    // 127.50 deg, 2.982 km/s: inside even Mars's real sphere (periapsis 0.65 SOI).
    (FirstLight, "2026-11-02", [-1.815327, 2.36578, 0.0]),
    (MorningStar, "2028-03-05", [0.799577, 2.431928, 0.0]), // 71.8 deg, 2.56 km/s
    (BigGame, "2028-12-24", [-8.698397, -0.167018, 0.0]),   // 181.1 deg, 8.70 km/s
    (GrandTour, "1977-08-20", [2.325702, 9.314028, 0.0]),   // 75.98 deg, 9.60 km/s
];

/// The excess speed [km/s] `levels.ts` rounds into each level's par.
const PAR_SPEEDS: [(LevelId, f64); 4] = [
    (FirstLight, 2.982),
    (MorningStar, 2.528),
    (BigGame, 8.693),
    (GrandTour, 9.1),
];

/// Without Jupiter, a full 10.5 km/s pull comes closest to Saturn on the window's last
/// day (also the day of the cheapest direct transfer), aimed 95 to 110 degrees: 7.5
/// Saturn spheres at best in the TypeScript's 1-degree scan of every day, refined to 0.1.
const NO_JUPITER_DAY: &str = "1977-09-09";
const NO_JUPITER_BAND: (f64, f64) = (95.0, 110.0);

fn by_id(id: LevelId) -> &'static Level<'static> {
    CAMPAIGN
        .iter()
        .find(|l| l.id == id)
        .expect("a campaign level")
}

fn launch_et(level: &Level, day: u32) -> f64 {
    launch_et_for_day(level.window.start_iso, day).expect("a launch day")
}

fn window_day(level: &Level, iso: &str) -> u32 {
    let day = days_between_iso(level.window.start_iso, iso).expect("ISO dates");
    u32::try_from(day).expect("on or after the window's start")
}

/// `shotFor`: the level's request on the window day of `launch_iso`.
fn shot_for(level: &Level, launch_iso: &str, v_inf: Vec3) -> ShotRequest {
    shot_request_for(
        level,
        launch_et(level, window_day(level, launch_iso)),
        v_inf,
    )
}

fn fly(shot: &ShotRequest) -> ShotAnalysis {
    let result = simulate_shot(&EPH, shot).expect("a zone at least the real sphere");
    analyze_shot(&EPH, shot, &result)
}

fn delta_v(v_inf_km_s: f64) -> f64 {
    delta_v_from_leo(v_inf_km_s, LEO_RADIUS_KM)
}

/// The level's scoring rules, as `campaign/use-result.ts` builds them.
fn rules(level: &Level) -> ScoringRules {
    ScoringRules {
        par_delta_v_km_s: level.par.map(|p| p.delta_v_km_s),
        par_tolerance: Some(level.par_tolerance),
        required_flyby: level.required_flyby,
    }
}

/// Flight times of 40 days and on in steps of `step` days, up to the level's limit [s].
fn flight_times(level: &Level, step: u32) -> Vec<f64> {
    let n = ((level.max_flight_days - 40.0) / f64::from(step)).floor() as u32;
    (0..=n).map(|k| f64::from(40 + step * k) * DAY).collect()
}

fn hex(x: f64) -> String {
    format!("{:016x}", x.to_bits())
}

fn name(body: BodyId) -> String {
    body.name().to_ascii_lowercase()
}

fn known_row(k: &KnownShot) -> Value {
    json!([k.launch_iso, k.v_inf.map(hex)])
}

/// A level as the generator writes it, in its `level_columns` order.
fn level_row(l: &Level) -> Value {
    let attractors: Vec<String> = l.attractors.iter().map(|&b| name(b)).collect();
    let sim = l.sim;
    json!([
        l.id.as_str(),
        l.window.start_iso,
        l.window.days,
        l.default_launch_iso,
        name(l.target),
        hex(l.max_flight_days),
        hex(l.v_inf_max_km_s),
        attractors,
        l.required_flyby.map(name),
        l.par.map(|p| hex(p.delta_v_km_s)),
        hex(l.par_tolerance),
        hex(l.capture_zone_scale),
        // maxSteps is an integer in the file, as in shots.json.
        [
            hex(sim.rtol),
            hex(sim.atol_km),
            hex(sim.max_step),
            sim.max_steps
        ],
        l.hint.as_ref().map(known_row),
        l.sandbox,
    ])
}

#[test]
fn every_level_number_equals_the_typescript_levels() {
    let file: Value = serde_json::from_str(LEVELS).expect("valid JSON");
    assert_eq!(file["schema"], "starshot.conformance-levels/1");
    assert_eq!(file["level_columns"].as_array().map(Vec::len), Some(15));
    let got: Vec<Value> = CAMPAIGN.iter().map(level_row).collect();
    assert_eq!(Some(&got), file["levels"].as_array());
    assert_eq!(known_row(&GRAND_TOUR_PAR_SHOT), file["grand_tour_par_shot"]);
}

fn names(bodies: &[BodyId]) -> Vec<String> {
    bodies.iter().map(|&b| name(b)).collect()
}

/// The Moonshot as the generator writes it, in its `moonshot_columns` order.
fn moonshot_row(m: &LunarLevel) -> Value {
    let s = m.sim;
    let sim = [
        s.rtol,
        s.atol_pos,
        s.atol_vel,
        s.max_step,
        f64::from(s.max_steps),
        s.near_body_fraction,
    ];
    json!([
        MissionId::Moonshot.as_str(),
        m.window.start_iso,
        m.window.days,
        m.default_launch_iso,
        name(m.target),
        hex(m.max_flight_days),
        hex(m.burn_cap_km_s),
        names(m.attractors),
        hex(m.par.delta_v_km_s),
        hex(m.par_tolerance),
        sim.map(hex),
    ])
}

#[test]
fn the_sandbox_missions_and_framing_equal_the_typescript() {
    let file: Value = serde_json::from_str(LEVELS).expect("valid JSON");
    assert_eq!(json!(names(&SANDBOX_TARGETS)), file["sandbox_targets"]);
    let framing: Vec<Vec<String>> = CAMPAIGN.iter().map(|l| names(&framing_bodies(l))).collect();
    assert_eq!(json!(framing), file["campaign_framing"]);
    // Every planet on one day, Earth too, and each side of both clamps.
    let rows = file["sandbox"].as_array().expect("sandbox rows");
    assert_eq!(rows.len(), 13);
    for row in rows {
        let today = row[0].as_str().expect("a day");
        let target = PLANET_IDS.into_iter().find(|&b| row[1][4] == name(b));
        let level = sandbox_level(target.expect("a planet"), today).expect("a planet on a day");
        assert_eq!(level_row(&level), row[1], "{today}");
        assert_eq!(json!(names(&framing_bodies(&level))), row[2], "{today}");
    }
    let sandbox = MissionId::Level(Sandbox);
    let missions = MISSION_ORDER.iter().chain([&sandbox]).map(|&id| {
        let next = next_mission(id).map(|m| m.id().as_str());
        json!([id.as_str(), mission_number(id), next])
    });
    let missions: Vec<Value> = missions.collect();
    assert_eq!(Some(&missions), file["missions"].as_array());
    assert_eq!(moonshot_row(&MOONSHOT), file["moonshot"]);
}

#[test]
fn each_par_is_its_reference_speed_rounded_as_levels_ts_rounds_it() {
    for (id, v_inf_km_s) in PAR_SPEEDS {
        // Positive, where `f64::round` is `Math.round`.
        let want = (delta_v(v_inf_km_s) * 100.0).round() / 100.0;
        let par = by_id(id).par.expect("a campaign par").delta_v_km_s;
        assert_eq!(par.to_bits(), want.to_bits(), "{id:?}");
    }
}

#[test]
fn every_known_solution_reaches_its_target() {
    for (id, launch_iso, v_inf) in KNOWN_SOLUTIONS {
        let level = by_id(id);
        assert!(window_day(level, launch_iso) <= level.window.days, "{id:?}");
        assert!(norm(v_inf) <= level.v_inf_max_km_s, "{id:?}");
        let a = fly(&shot_for(level, launch_iso, v_inf));
        assert!(
            a.hit && a.flight_days <= level.max_flight_days,
            "{id:?}: {a:?}"
        );
        assert!(
            level.required_flyby.is_none() || a.required_flyby_done,
            "{id:?}"
        );
    }
}

#[test]
fn default_launch_dates_sit_inside_their_windows() {
    for level in &CAMPAIGN {
        assert!(window_day(level, level.default_launch_iso) <= level.window.days);
        assert!(level.attractors.contains(&level.target) && level.attractors.contains(&Earth));
        assert_eq!(level.sim, SIM_SETTINGS, "{:?}", level.id);
    }
}

#[test]
fn requests_and_hint_queries_carry_the_level() {
    let v_inf = [1.0, 2.0, 0.0];
    for level in &CAMPAIGN {
        let et = launch_et(level, 3);
        let shot = ShotRequest {
            target: level.target,
            attractors: level.attractors.to_vec(),
            launch_et: et,
            v_inf,
            max_flight_days: level.max_flight_days,
            required_flyby: level.required_flyby,
            sim: level.sim,
            capture_zone_scale: level.capture_zone_scale,
        };
        assert_eq!(shot_request_for(level, et, v_inf), shot);
        let query = HintQuery {
            shot: shot_template(level),
            window_start_iso: level.window.start_iso,
            window_days: level.window.days,
            v_inf_max_km_s: level.v_inf_max_km_s,
            curated: level.hint,
            max_simulations: None,
        };
        assert_eq!(hint_query_for(level), query);
    }
    assert_eq!(by_id(GrandTour).hint, Some(GRAND_TOUR_HINT));
}

#[test]
fn every_hint_is_on_the_grid_deterministic_and_reaches_its_target() {
    for level in &CAMPAIGN {
        let query = hint_query_for(level);
        let hint = find_hint(&EPH, &query).expect("a valid query");
        let hint = hint.expect("a hint");
        assert!(hint.hits && hint.simulations <= HINT_MAX_SIMULATIONS + 1);
        // Exactly what the label shows and "Use hint" applies: 0.01 degree, 0.001 km/s,
        // from 0 to under 360 (positive, where `f64::round` is `Math.round`).
        let Aim {
            angle_deg,
            speed_km_s,
        } = hint.aim;
        assert_eq!((angle_deg * 100.0).round() / 100.0, angle_deg);
        assert_eq!((speed_km_s * 1000.0).round() / 1000.0, speed_km_s);
        assert!((0.0..360.0).contains(&angle_deg) && speed_km_s <= level.v_inf_max_km_s);
        let a = fly(&shot_request_for(
            level,
            hint.launch_et,
            v_inf_from_aim(hint.aim),
        ));
        assert!(a.hit && (level.required_flyby.is_none() || a.required_flyby_done));
        // Flown with the hint, the shot keeps at most the cap, and says when it bit.
        let score = score_shot(&rules(level), &ShotFacts::from_analysis(&a, true));
        let capped = score.uncapped_stars > HINT_STAR_CAP;
        assert!(score.stars <= HINT_STAR_CAP && score.hint_capped == capped);
        // Same level, same hint: no clock is involved.
        assert_eq!(find_hint(&EPH, &query), Ok(Some(hint)), "{:?}", level.id);
    }
}

#[test]
fn the_hint_budget_is_a_simulation_count() {
    // With none, the rounded Lambert aim itself comes back, checked by one flight.
    let level = by_id(MorningStar);
    let query = HintQuery {
        max_simulations: Some(0),
        ..hint_query_for(level)
    };
    let hint = find_hint(&EPH, &query).expect("valid").expect("a transfer");
    assert_eq!(hint.simulations, 1);
    let a = fly(&shot_request_for(
        level,
        hint.launch_et,
        v_inf_from_aim(hint.aim),
    ));
    assert_eq!(hint.hits, a.hit);
}

#[test]
fn every_hint_equals_the_typescript_hint_at_each_budget() {
    let file: Value = serde_json::from_str(LEVELS).expect("valid JSON");
    let rows = file["hints"].as_array().expect("hint rows");
    assert_eq!(rows.len(), 18);
    let mut worst = 0.0_f64;
    for row in rows {
        let level = CAMPAIGN.iter().find(|l| row[0] == l.id.as_str());
        let level = level.expect("a campaign level");
        let max_simulations = row[1].as_u64().map(|n| u32::try_from(n).expect("a count"));
        let mut query = HintQuery {
            max_simulations,
            ..hint_query_for(level)
        };
        // A flyby the level never makes, so the nudge runs its whole order to the budget.
        if let Some(flyby) = row[10].as_str() {
            let planet = PLANET_IDS.into_iter().find(|&b| name(b) == flyby);
            query.shot.required_flyby = Some(planet.expect("a planet"));
        }
        let h = find_hint(&EPH, &query).expect("valid").expect("a hint");
        let (a, s) = (h.aim.angle_deg, h.aim.speed_km_s);
        let bits = [h.launch_et, a, s].map(hex);
        let got = json!([
            row[0],
            row[1],
            h.day,
            bits,
            h.hits,
            h.source.as_str(),
            h.simulations
        ]);
        let want = json!([
            row[0],
            row[1],
            row[2],
            [row[3], row[4], row[5]],
            row[6],
            row[8],
            row[9]
        ]);
        assert_eq!(got, want);
        let closest = row[7].as_str().expect("bits");
        let closest = f64::from_bits(u64::from_str_radix(closest, 16).expect("hex"));
        // `f64::max` would drop a NaN gap; `<` fails it.
        let gap = (h.closest_km - closest).abs();
        assert!(gap < 1e-3, "{row}: {gap} km");
        worst = worst.max(gap);
    }
    // Measured: 6.6e-6 km at most, from `norm` and the ephemeris's `sin` and `cos`.
    println!("widest closest-approach gap {worst:e} km");
}

#[test]
fn direct_pars_are_the_windows_cheapest_lambert_transfer() {
    for level in CAMPAIGN.iter().filter(|l| l.required_flyby.is_none()) {
        let launches: Vec<f64> = (0..=level.window.days)
            .map(|k| launch_et(level, k))
            .collect();
        let tofs = flight_times(level, 4);
        let best = best_direct_transfer(&EPH, Earth, level.target, &launches, &tofs)
            .expect("a direct transfer");
        let par = level.par.expect("a campaign par").delta_v_km_s;
        let gap = (delta_v(best.v_inf_km_s) / par - 1.0).abs();
        assert!(gap < 0.01, "{:?}: {gap}", level.id);
        // Three stars are reachable: the known solution earns the efficiency star.
        let known = KNOWN_SOLUTIONS.iter().find(|k| k.0 == level.id);
        let &(_, _, v_inf) = known.expect("a known solution");
        assert!(delta_v(norm(v_inf)) <= par * level.par_tolerance);
    }
}

#[test]
fn first_light_counts_a_pass_inside_three_spheres_as_a_hit() {
    let level = by_id(FirstLight);
    for other in &CAMPAIGN {
        let scale = if other.id == FirstLight { 3.0 } else { 1.0 };
        assert_eq!(other.capture_zone_scale, scale, "{:?}", other.id);
    }
    // 129.60 deg, 2.982 km/s: passes Mars at 1.11 spheres of influence.
    let near_miss = shot_for(level, "2026-11-02", [-1.900798, 2.29767, 0.0]);
    let result = simulate_shot(&EPH, &near_miss).expect("scale 3 flies");
    let a = analyze_shot(&EPH, &near_miss, &result);
    assert!(a.hit && a.capture_zone_scale == 3.0);
    assert!((a.capture_zone_km - 3.0 * a.target_soi_km).abs() < 5e-7);
    // The flight ends where it enters the zone.
    let end = result.samples[result.samples.len() - 1];
    let mars = EPH.state(Mars, end.t).r;
    let ratio = starshot_math::hypot(end.r[0] - mars[0], end.r[1] - mars[1]) / a.capture_zone_km;
    assert!((ratio - 1.0).abs() < 5e-5, "{ratio}");
    let facts = ShotFacts::from_analysis(&a, false);
    assert!(score_shot(&rules(level), &facts).hit);

    // A zone smaller than the real sphere is refused, not mis-scored.
    for capture_zone_scale in [0.5, 0.0, f64::NAN] {
        let shot = ShotRequest {
            capture_zone_scale,
            ..near_miss.clone()
        };
        let refused = simulate_shot(&EPH, &shot);
        assert!(matches!(refused, Err(ShotError::CaptureZoneScale(_))));
    }
    // The same shot misses the real-size zone.
    let real = fly(&ShotRequest {
        capture_zone_scale: 1.0,
        ..near_miss
    });
    let spheres = real.closest_km / real.target_soi_km;
    assert!(!real.hit && spheres > 1.0 && spheres < 3.0, "{spheres}");
}

#[test]
fn the_grand_tour_par_shot_is_a_jupiter_assisted_hit_worth_three_stars() {
    let tour = by_id(GrandTour);
    let shot = shot_for(
        tour,
        GRAND_TOUR_PAR_SHOT.launch_iso,
        GRAND_TOUR_PAR_SHOT.v_inf,
    );
    let a = fly(&shot);
    assert!(a.hit && a.required_flyby_done && a.flight_days <= tour.max_flight_days);
    let par = tour.par.expect("a par").delta_v_km_s;
    assert_eq!((a.delta_v_km_s * 100.0).round() / 100.0, par);
    let score = score_shot(&rules(tour), &ShotFacts::from_analysis(&a, false));
    assert_eq!(score.stars, 3);
    let facts = ShotFacts::from_analysis(&a, true);
    let want = (
        a.hit,
        a.delta_v_km_s,
        a.bullseye,
        a.required_flyby_done,
        true,
    );
    let got = (
        facts.hit,
        facts.delta_v_km_s,
        facts.bullseye,
        facts.required_flyby_done,
        facts.hint_used,
    );
    assert_eq!(got, want);
}

#[test]
fn the_grand_tour_efficiency_star_is_earned_not_automatic_under_the_cap() {
    let tour = by_id(GrandTour);
    assert_eq!(tour.par_tolerance, 1.05);
    let efficient = |v_inf_km_s: f64| {
        let pull = ShotFacts {
            hit: true,
            delta_v_km_s: delta_v(v_inf_km_s),
            bullseye: false,
            required_flyby_done: true,
            hint_used: false,
        };
        score_shot(&rules(tour), &pull).efficient
    };
    assert!(!efficient(tour.v_inf_max_km_s));
    // The known 9.60 km/s solution is just inside; the curated 9.80 km/s hint is not.
    assert!(efficient(9.6));
    assert!(!efficient(9.8));
}

#[test]
fn no_direct_transfer_to_saturn_fits_under_the_cap() {
    let tour = by_id(GrandTour);
    let launches: Vec<f64> = (0..=tour.window.days).map(|k| launch_et(tour, k)).collect();
    let tofs = flight_times(tour, 5);
    let best = best_direct_transfer(&EPH, Earth, Saturn, &launches, &tofs).expect("a minimum");
    // A finite minimum (15.12 km/s, 1977-09-09, 1,498 days), far above the 10.5 km/s cap.
    let v = best.v_inf_km_s;
    assert!(v > 15.0 && v < 15.3 && v > tour.v_inf_max_km_s, "{v}");
}

/// A full pull on `day` at `angle_deg` with every attractor but Jupiter.
fn without_jupiter(tour: &Level, day: u32, angle_deg: f64) -> ShotAnalysis {
    let aim = Aim {
        angle_deg,
        speed_km_s: tour.v_inf_max_km_s,
    };
    let mut shot = shot_request_for(tour, launch_et(tour, day), v_inf_from_aim(aim));
    shot.attractors.retain(|&b| b != Jupiter);
    fly(&shot)
}

#[test]
fn without_jupiter_a_full_pull_stays_over_5_saturn_spheres_away() {
    let tour = by_id(GrandTour);
    let soi_saturn = EPH.soi_km(Saturn, launch_et(tour, 0));
    // The most promising day, the window's last, across the band at 0.1 degree.
    let day = window_day(tour, NO_JUPITER_DAY);
    assert_eq!(day, tour.window.days);
    let (from, to) = NO_JUPITER_BAND;
    let steps = ((to - from) * 10.0) as u32;
    // Every pass beyond 5 spheres is the nearest beyond them, and a NaN fails as in
    // TypeScript, where `f64::min` would skip it.
    for k in 0..=steps {
        let a = without_jupiter(tour, day, from + f64::from(k) / 10.0);
        assert!(!a.hit && a.closest_km > 5.0 * soi_saturn, "{k}: {a:?}");
    }
    // Mid-window, in every direction at 2 degree steps.
    for k in 0..180 {
        let a = without_jupiter(tour, 15, f64::from(2 * k));
        assert!(a.closest_km > 5.0 * soi_saturn, "{k}: {a:?}");
    }
}
