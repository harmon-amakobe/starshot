//! The Rust `simulate` against the TypeScript's, through `fixtures/conformance/simulate.json`
//! (written by `packages/physics/test/conformance-simulate.test.ts`): 24 flights on Table 1,
//! flattened as the game flies them, each with its own frozen settings from the file. The
//! same aim takes the same steps through the same branches, so the step, sample and
//! encounter counts, the ending and its body are equal. Positions drift apart through
//! `sin`, `cos`, `pow` and `norm` (`src/simulate.rs`), under 0.1 m on these flights when
//! the fixture was written; the bound on the last position and on each body's closest
//! approach is 1 km.

mod common;

use common::{bits, row};
use serde_json::Value;
use starshot_ephemeris::vec::{norm, sub};
use starshot_ephemeris::{BodyId, PLANET_IDS, Table1Ephemeris};
use starshot_physics::{SimulationConfig, departure_state, simulate};

const SIMULATE: &str = include_str!("../../../fixtures/conformance/simulate.json");

/// A body from its TypeScript id.
fn body(id: &Value) -> BodyId {
    let id = id.as_str().unwrap_or_else(|| panic!("{id} is not a body"));
    let mut all = PLANET_IDS.iter().chain(&[BodyId::Sun]);
    *all.find(|b| b.name().eq_ignore_ascii_case(id))
        .unwrap_or_else(|| panic!("no body {id}"))
}

#[test]
fn twenty_four_flights_end_as_the_typescript_does() {
    let file: Value = serde_json::from_str(SIMULATE).expect("fixture is valid JSON");
    assert_eq!(file["schema"], "starshot.conformance-simulate/1");
    assert_eq!(file["ephemeris"], "table1-flattened");
    let eph = Table1Ephemeris { flatten: true };
    let flights = file["flights"].as_array().expect("flights");
    assert_eq!(flights.len(), 24);
    let (mut problems, mut worst_end, mut worst_closest) = (Vec::new(), 0.0_f64, 0.0_f64);
    for flight in flights {
        let (input, want) = (&flight["input"], &flight["output"]);
        let name = input["name"].as_str().expect("name");
        let attractors: Option<Vec<BodyId>> = input["attractors"]
            .as_array()
            .map(|list| list.iter().map(body).collect());
        let (t0, v) = (bits(&input["launchEt"]), row(&input["vInf"]));
        let start = departure_state(&eph, t0, [v[0], v[1], v[2]]);
        let mut cfg = SimulationConfig::new(&eph, t0, start.r, start.v, bits(&input["duration"]));
        cfg.attractors = attractors.as_deref();
        cfg.stop_at_soi_of = (!input["stopAtSoiOf"].is_null()).then(|| body(&input["stopAtSoiOf"]));
        cfg.depart_from = (!input["departFrom"].is_null()).then(|| body(&input["departFrom"]));
        // Null settings fly simulate's defaults, which `SimulationConfig::new` must match.
        if let Some(sim) = input["sim"].as_object() {
            cfg.rtol = bits(&sim["rtol"]);
            cfg.atol_km = bits(&sim["atolKm"]);
            cfg.max_step = bits(&sim["maxStep"]);
            cfg.max_steps = sim["maxSteps"]
                .as_u64()
                .and_then(|n| n.try_into().ok())
                .expect("u32");
        }
        let got = simulate(&cfg);

        let counts = [got.steps as usize, got.samples.len(), got.encounters.len()];
        let want_counts =
            ["steps", "samples", "encounters"].map(|k| want[k].as_u64().expect(k) as usize);
        let ending = (got.termination.name(), got.terminated_by);
        let want_by = (!want["terminatedBy"].is_null()).then(|| body(&want["terminatedBy"]));
        let want_ending = (want["termination"].as_str().expect("termination"), want_by);
        if counts != want_counts || ending != want_ending {
            problems.push(format!(
                "{name}: {ending:?} {counts:?}, TypeScript {want_ending:?} {want_counts:?}"
            ));
        }
        let (last, want_last) = (got.samples[got.samples.len() - 1], row(&want["last"]));
        let end_gap = norm(sub(last.r, [want_last[1], want_last[2], want_last[3]]));
        let mut line = format!(
            "{name:30} {:12} {:5} steps equal {:5}, end {:8.3} m",
            ending.0,
            got.steps,
            counts[0] == want_counts[0],
            end_gap * 1000.0
        );
        worst_end = worst_end.max(end_gap);
        let closest = want["closest"].as_array().expect("closest");
        if got.closest.iter().flatten().count() != closest.len() {
            problems.push(format!("{name}: closest approaches to other bodies"));
        }
        for c in closest {
            let id = body(&c[0]);
            let Some(e) = got.closest[id as usize] else {
                problems.push(format!("{name}: no closest approach to {id}"));
                continue;
            };
            let gap = (e.distance_km - bits(&c[2])).abs();
            let flags = (c[4].as_bool().expect("bool"), c[5].as_bool().expect("bool"));
            if (e.inside_soi, e.impact) != flags || gap.is_nan() || gap >= 1.0 {
                problems.push(format!(
                    "{name}: {id} closest {gap} km off, flags {flags:?}"
                ));
            }
            worst_closest = worst_closest.max(gap);
            line += &format!(", {id} {:.3} m", gap * 1000.0);
        }
        println!("{line}");
        if end_gap.is_nan() || end_gap >= 1.0 {
            problems.push(format!("{name}: last position {end_gap} km off"));
        }
        // A flight that runs out of time ends at t0 + duration exactly, in both engines.
        let on_time = last.t.to_bits() == (t0 + cfg.duration).to_bits();
        if ending.0 == "duration" && !(on_time && last.t.to_bits() == want_last[0].to_bits()) {
            problems.push(format!("{name}: ends at {}, not t0 + duration", last.t));
        }
    }
    println!(
        "worst: end {:.3} m, closest approach {:.3} m",
        worst_end * 1000.0,
        worst_closest * 1000.0
    );
    assert!(problems.is_empty(), "{problems:#?}");
}
