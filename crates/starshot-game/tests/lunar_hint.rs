//! The bounded Moon route search, PR14's lunar hint golden cases (09-rust-supplement.md),
//! with the assertions of `apps/game/src/sim/lunar-hint.test.ts`. Counts come from a
//! wrapper of the production runner `run_lunar`, never from the code under test. The
//! search holds no model, so it flies only through that wrapper, and `run_lunar`
//! integrates once per call, so the wrapper's count is the integration count too.
//! TypeScript's awaited `afterFlight` becomes a plain callback here: each runs after
//! exactly one flight, which is what lets a worker yield there (G12). The searched guide
//! is re-flown through `lunar_request`, the builder the session's `finalRequest` calls. A
//! null field or a string budget, which TypeScript also refuses, cannot be built in these
//! types; the ABI's decoder meets them (PR15).

use serde_json::Value;
use starshot_ephemeris::time::unix_ms_from_et;
use starshot_game::{
    Aim, Hint, HintSource, LUNAR_GRID, LUNAR_SEARCH_BUDGET, LunarHintQuery, LunarSearch,
    LunarShotRequest, LunarStep, MOONSHOT, Route, ShotAnalysis, by_cost, find_lunar_hint,
    lunar_hint, lunar_request, refinement_of, run_lunar, seeds_of,
};
use starshot_physics::lunar::{DAY, FUEL_BUDGET, LAUNCH_ET, LunarError, LunarModel, ParkingOrbit};
use std::cell::RefCell;
use std::collections::BTreeSet;
use std::sync::OnceLock;

const RAIL: &str = include_str!("../../../packages/ephemeris/data/moon-rail.json");

fn model() -> LunarModel {
    let rail: Value = serde_json::from_str(RAIL).expect("the rail is valid JSON");
    let knots: Vec<f64> = serde_json::from_value(rail["knots"].clone()).expect("knots");
    LunarModel::new(&knots).expect("the committed rail is valid")
}

fn query(strategy: Option<&str>, budget: Option<f64>) -> LunarHintQuery<'_> {
    LunarHintQuery { strategy, budget }
}

fn search(budget: Option<f64>) -> LunarHintQuery<'static> {
    query(Some("search"), budget)
}

/// Day, burn [milli-km/s] and signed angle [centidegrees].
type Key = (u32, i32, i32);

/// A flown request read back as its integer tuple.
fn tuple_of(shot: &LunarShotRequest) -> Key {
    let q = shot.request();
    let day = (q.launch_et - LAUNCH_ET) / DAY;
    assert_eq!(day.fract(), 0.0, "whole days after LAUNCH_ET");
    let burn = (q.delta_v_km_s * 1000.0).round() as i32;
    (day as u32, burn, (q.burn_angle_deg * 100.0).round() as i32)
}

fn route_of(hint: Option<Hint>) -> Option<Key> {
    let h = hint?;
    let burn = (h.aim.speed_km_s * 1000.0).round() as i32;
    Some((h.day, burn, (h.aim.angle_deg * 100.0).round() as i32))
}

/// Every tuple in flight order: the reference, the coarse grid, then refinement, once each.
fn order() -> Vec<Key> {
    let mut order = vec![(0, 3240, 0)];
    for day in 0..=27 {
        for burn in [3150, 3240] {
            order.extend([-2000, 0, 2000].map(|angle| (day, burn, angle)));
        }
    }
    // Measured in TypeScript: the coarse hits seed days 0, 25, 26 and 27, each at 3.150
    // km/s and 0 degrees.
    for day in [0, 25, 26, 27] {
        for burn in [3100, 3110, 3120, 3130, 3140, 3150] {
            order.extend([-500, 0, 500].map(|angle| (day, burn, angle)));
        }
    }
    let mut seen = BTreeSet::new();
    order.retain(|key| seen.insert(*key));
    order
}

/// What the production runner received and returned during one search.
struct Flown {
    hint: Option<Hint>,
    shots: Vec<LunarShotRequest>,
    analyses: Vec<ShotAnalysis>,
}

/// Runs a query through `find_lunar_hint` with a recording wrapper of `run_lunar`. The
/// callback must see one more flight each time, so a step never flies twice, never flies
/// before its callback and never flies once the search is done.
fn flown(model: &LunarModel, q: LunarHintQuery) -> Flown {
    let flights = RefCell::new((Vec::new(), Vec::new()));
    let mut seen_by_callback = Vec::new();
    let fly = |shot: &LunarShotRequest| -> Result<ShotAnalysis, LunarError> {
        flights.borrow_mut().0.push(*shot);
        let (_, analysis) = run_lunar(model, shot)?;
        flights.borrow_mut().1.push(analysis.clone());
        Ok(analysis)
    };
    let after = || seen_by_callback.push(flights.borrow().0.len());
    let hint = find_lunar_hint(&q, fly, after).expect("a valid query flies");
    let (shots, analyses) = flights.into_inner();
    assert_eq!(seen_by_callback, (1..=shots.len()).collect::<Vec<_>>());
    Flown {
        hint,
        shots,
        analyses,
    }
}

/// One default-budget search, shared by the tests that only read its flights.
fn full() -> &'static Flown {
    static FULL: OnceLock<Flown> = OnceLock::new();
    FULL.get_or_init(|| flown(&model(), search(None)))
}

fn debug<T: std::fmt::Debug>(x: &T) -> String {
    // Debug prints every f64 so that it reads back to the same bits.
    format!("{x:?}")
}

#[test]
fn flies_one_fixed_order_and_selects_the_same_route_every_time() {
    let full = full();
    let again = flown(&model(), search(Some(240.0)));
    let order = order();
    assert_eq!(order.len(), 236);
    assert_eq!(full.shots.iter().map(tuple_of).collect::<Vec<_>>(), order);
    assert_eq!(debug(&again.shots), debug(&full.shots));
    assert_eq!(debug(&again.analyses), debug(&full.analyses));
    assert_eq!(debug(&again.hint), debug(&full.hint));
    // Measured: 3.120 km/s prograde on day 0. The 3.240 km/s par stays the reference.
    assert_eq!(route_of(full.hint), Some((0, 3120, 0)));
    assert_eq!(full.hint.map(|h| h.simulations), Some(236));
    assert_eq!((LUNAR_SEARCH_BUDGET, LUNAR_GRID), (240, "moon-grid/1"));
}

#[test]
fn converts_each_integer_once_so_every_flown_value_is_its_label() {
    let full = full();
    for shot in &full.shots {
        let (q, (_, burn, angle)) = (shot.request(), tuple_of(shot));
        assert_eq!(
            q.delta_v_km_s.to_bits(),
            (f64::from(burn) / 1000.0).to_bits()
        );
        assert_eq!(
            q.burn_angle_deg.to_bits(),
            (f64::from(angle) / 100.0).to_bits()
        );
        // `request_for` clamps a burn above the fuel budget without saying so.
        assert!(q.delta_v_km_s < FUEL_BUDGET);
        // In the parking plane fixed at LAUNCH_ET, coasting from the shot's own launch.
        let parking = ParkingOrbit {
            frame_et: Some(LAUNCH_ET),
            epoch_et: q.launch_et,
            phase_deg: 225.0,
            radius_km: 6571.0,
        };
        assert_eq!(q.parking, Some(parking));
    }
    let aim = Aim {
        angle_deg: 0.0,
        speed_km_s: 3.12,
    };
    assert_eq!(full.hint.map(|h| h.aim), Some(aim));
    let last = full
        .shots
        .iter()
        .find(|s| tuple_of(s).0 == 27)
        .expect("day 27");
    // 2026-11-29T01:00:00.000Z: whole days after LAUNCH_ET, not `launch_et_for_day`'s 00:00.
    let ms = unix_ms_from_et(last.request().launch_et);
    assert_eq!(ms, Some(1_795_914_000_000));
}

#[test]
fn re_flies_the_selected_route_through_the_production_request_to_the_same_hit() {
    let full = full();
    let hint = full.hint.expect("a hit");
    let parking = hint.parking.expect("a Moon guide carries its orbit");
    let shot = lunar_request(hint.launch_et, hint.aim, parking).expect("within 35 degrees");
    let index = full.shots.iter().position(|s| *s == shot);
    let index = index.expect("the guide is a searched shot");
    let (_, replay) = run_lunar(&model(), &shot).expect("flies");
    assert_eq!(debug(&replay), debug(&full.analyses[index]));
    assert!(replay.hit);
    assert_eq!(replay.closest_km.to_bits(), hint.closest_km.to_bits());
}

#[test]
fn keeps_the_reference_strategy_and_par_and_flies_the_reference_first() {
    let model = model();
    let reference = lunar_hint(&model).expect("flies");
    let curated = (0, LAUNCH_ET, HintSource::Curated, 1);
    let r = &reference;
    assert_eq!((r.day, r.launch_et, r.source, r.simulations), curated);
    assert_eq!(MOONSHOT.par.delta_v_km_s, 3.24);
    // A budget bounds only the search: a reference query flies the reference once, even at 0.
    let reference_queries = [
        query(None, None),
        query(Some("reference"), None),
        query(Some("reference"), Some(0.0)),
    ];
    for q in reference_queries {
        let run = flown(&model, q);
        assert_eq!(
            (debug(&run.hint), run.shots.len()),
            (debug(&Some(reference)), 1)
        );
    }
    let one = flown(&model, search(Some(1.0)));
    let source = HintSource::LunarGrid;
    let grid = Hint {
        source,
        ..reference
    };
    assert_eq!((debug(&one.hint), one.shots.len()), (debug(&Some(grid)), 1));
}

#[test]
fn counts_every_real_simulation_at_each_budget_failed_searches_included() {
    let model = model();
    let budgets = [0, 1, 2, 167, 168, 169, 235, 239, 240];
    let runs = budgets.map(|b| flown(&model, search(Some(f64::from(b)))));
    let order = order();
    for run in &runs {
        let tuples: Vec<Key> = run.shots.iter().map(tuple_of).collect();
        assert_eq!(tuples, order[..tuples.len()]);
    }
    let counts = runs.each_ref().map(|run| run.shots.len());
    assert_eq!(counts, [0, 1, 2, 167, 168, 169, 235, 236, 236]);
    let simulations = runs
        .each_ref()
        .map(|run| run.hint.map_or(0, |h| h.simulations as usize));
    assert_eq!(simulations, counts);
    let (reference, seed, refined) = (Some((0, 3240, 0)), Some((0, 3150, 0)), Some((0, 3120, 0)));
    let routes = runs.each_ref().map(|run| route_of(run.hint));
    let want = [
        None, reference, reference, seed, seed, seed, refined, refined, refined,
    ];
    assert_eq!(routes, want);
    assert_eq!(debug(&runs[7].hint), debug(&runs[8].hint));
}

#[test]
fn rejects_invalid_budgets_and_unknown_strategies_before_any_flight() {
    let budget = "Moon guide budget must be an integer from 0 to 240";
    let strategy = "Moon guide strategy must be reference or search";
    let budgets = [-1.0, 241.0, 1.5, f64::NAN, f64::INFINITY];
    let mut cases: Vec<(LunarHintQuery, &str)> =
        budgets.map(|b| (query(None, Some(b)), budget)).to_vec();
    cases.extend(["fast", "", "Search"].map(|s| (query(Some(s), None), strategy)));
    cases.push((search(Some(-1.0)), budget));
    // The strategy is checked first.
    cases.push((query(Some("fast"), Some(-1.0)), strategy));
    let mut callbacks = 0;
    for (q, text) in cases {
        // `new` takes no runner and no model, so it cannot fly before it refuses.
        let refused = LunarSearch::new(&q).map(|_| ()).expect_err("refused");
        assert_eq!(refused.to_string(), text, "{q:?}");
        let fly = |_: &LunarShotRequest| -> Result<ShotAnalysis, LunarError> {
            panic!("a refused query flew")
        };
        let driven = find_lunar_hint(&q, fly, || callbacks += 1);
        assert_eq!(driven, Err(refused), "{q:?}");
    }
    assert_eq!(callbacks, 0);
}

#[test]
fn builds_the_hint_from_the_selected_tuple_here_off_day_0_and_off_prograde() {
    // A controlled runner: only day 26 at 3.240 km/s and -20 degrees hits, so no field
    // defaults. A real analysis carries the fields it leaves alone.
    let template = full().analyses[0].clone();
    let fly = |shot: &LunarShotRequest| -> Result<ShotAnalysis, LunarError> {
        let hit = tuple_of(shot) == (26, 3240, -2000);
        Ok(ShotAnalysis {
            hit,
            closest_km: 1234.0,
            ..template.clone()
        })
    };
    let mut stepper = LunarSearch::new(&search(Some(240.0))).expect("valid");
    let hint = loop {
        if let LunarStep::Done(hint) = stepper.step(fly).expect("flies") {
            break hint;
        }
    };
    let launch_et = LAUNCH_ET + 26.0 * DAY;
    let parking = ParkingOrbit {
        frame_et: Some(LAUNCH_ET),
        epoch_et: launch_et,
        phase_deg: 225.0,
        radius_km: 6571.0,
    };
    let aim = Aim {
        angle_deg: -20.0,
        speed_km_s: 3.24,
    };
    // One reference, 167 coarse and 17 refinement flights: the seed itself is not flown again.
    let route = Hint {
        parking: Some(parking),
        day: 26,
        launch_et,
        aim,
        hits: true,
        closest_km: 1234.0,
        source: HintSource::LunarGrid,
        simulations: 185,
    };
    assert_eq!(hint, Some(route));
    // A finished search stays finished and flies nothing more.
    let refused = |_: &LunarShotRequest| -> Result<ShotAnalysis, LunarError> {
        panic!("a finished search flew")
    };
    assert_eq!(stepper.step(refused), Ok(LunarStep::Done(hint)));
}

#[test]
fn sorts_seeds_and_refines_as_the_typescript_lists() {
    let r = |day, burn, angle| Route { day, burn, angle };
    // Burn, then day, then absolute angle, then signed angle.
    let mut routes = [
        r(0, 3240, 0),
        r(0, 3150, 0),
        r(2, 3100, 0),
        r(1, 3100, -2000),
        r(1, 3100, 500),
        r(1, 3100, -500),
    ];
    routes.sort_by(by_cost);
    let sorted = [
        r(1, 3100, -500),
        r(1, 3100, 500),
        r(1, 3100, -2000),
        r(2, 3100, 0),
        r(0, 3150, 0),
        r(0, 3240, 0),
    ];
    assert_eq!(routes, sorted);
    // The cheapest hit of each day, for at most four days.
    let hits = [
        r(3, 3150, 0),
        r(0, 3240, 0),
        r(0, 3150, 500),
        r(1, 3150, 0),
        r(2, 3150, 0),
        r(4, 3100, 0),
        r(0, 3150, 0),
    ];
    let seeds = [r(4, 3100, 0), r(0, 3150, 0), r(1, 3150, 0), r(2, 3150, 0)];
    assert_eq!(seeds_of(&hits), seeds);
    assert_eq!(seeds_of(&hits[1..3]), [r(0, 3150, 500)]);
    // Below the seed burn, and either side of the seed angle.
    let burns = [3190, 3200, 3210, 3220, 3230, 3240];
    let want = burns.map(|burn| [-2500, -2000, -1500].map(|angle| r(5, burn, angle)));
    assert_eq!(refinement_of(r(5, 3240, -2000)), want.concat());
}
