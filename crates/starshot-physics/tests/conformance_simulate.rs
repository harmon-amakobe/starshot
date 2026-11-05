//! The Rust `simulate` against the TypeScript's, through `fixtures/conformance/simulate.json`
//! (written by `packages/physics/test/conformance-simulate.test.ts`): 24 flights on Table 1,
//! flattened as the game flies them, each with its own frozen settings from the file. The
//! same aim takes the same steps through the same branches, so the step, sample and
//! encounter counts, the ending and its body are equal. Positions drift apart through
//! `sin`, `cos`, `pow` and `norm` (`src/simulate.rs`).
//!
//! The bounds sit above the worst gaps measured when the fixture was written (end position
//! 0.081 m, end velocity 0.268 m/s, end time 3.2 microseconds, closest distance 0.031 m,
//! closest-approach time 0.839 s, relative speed 0.106 m/s), and below two porting bugs
//! they must catch: a stop knot taken at the step's end instead of the interpolated stop
//! moves an impact's end 42.4 m, and a golden section stopped at a 60 s bracket moves a
//! closest approach 9.15 m and its time 14 s. The closest-approach time is held to the
//! golden section's own 1 s bracket.

mod common;

use common::{bits, row};
use serde_json::Value;
use starshot_ephemeris::vec::{norm, sub};
use starshot_ephemeris::{BodyId, PLANET_IDS, Table1Ephemeris};
use starshot_physics::{SimulationConfig, departure_state, simulate};

const SIMULATE: &str = include_str!("../../../fixtures/conformance/simulate.json");

/// Each gap's name and bound, indexed by the constants below.
const BOUNDS: [(&str, f64); 6] = [
    ("end position [km]", 1e-3),
    ("end velocity [km/s]", 1e-3),
    ("end time [s]", 1e-3),
    ("closest distance [km]", 1e-3),
    ("closest-approach time [s]", 1.0),
    ("closest relative speed [km/s]", 1e-3),
];
const END_R: usize = 0;
const END_V: usize = 1;
const END_T: usize = 2;
const CLOSE_D: usize = 3;
const CLOSE_T: usize = 4;
const CLOSE_V: usize = 5;

/// The worst gap of each kind over the flights, and every flight that broke a bound.
#[derive(Default)]
struct Gaps {
    worst: [f64; BOUNDS.len()],
    problems: Vec<String>,
}

impl Gaps {
    fn check(&mut self, kind: usize, flight: &str, gap: f64) {
        self.worst[kind] = self.worst[kind].max(gap);
        let (what, bound) = BOUNDS[kind];
        // A NaN gap fails: `gap >= bound` alone would let it through.
        if gap.is_nan() || gap >= bound {
            self.problems
                .push(format!("{flight}: {what} off by {gap}, bound {bound}"));
        }
    }
}

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
    let mut g = Gaps::default();
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
            g.problems.push(format!(
                "{name}: {ending:?} {counts:?}, TypeScript {want_ending:?} {want_counts:?}"
            ));
        }
        let (last, w) = (got.samples[got.samples.len() - 1], row(&want["last"]));
        let end_gap = norm(sub(last.r, [w[1], w[2], w[3]]));
        g.check(END_R, name, end_gap);
        g.check(END_V, name, norm(sub(last.v, [w[4], w[5], w[6]])));
        // After an impact or a sphere-of-influence stop the last sample is the stop, earlier
        // than the end time; both times are held, for every ending.
        g.check(END_T, name, (last.t - w[0]).abs());
        g.check(END_T, name, (got.end_time - bits(&want["endTime"])).abs());
        let mut line = format!(
            "{name:30} {:12} {:5} steps equal {:5}, end {:8.3} m",
            ending.0,
            got.steps,
            counts[0] == want_counts[0],
            end_gap * 1000.0
        );
        let closest = want["closest"].as_array().expect("closest");
        if got.closest.iter().flatten().count() != closest.len() {
            g.problems
                .push(format!("{name}: closest approaches to other bodies"));
        }
        for c in closest {
            let id = body(&c[0]);
            let Some(e) = got.closest[id as usize] else {
                g.problems
                    .push(format!("{name}: no closest approach to {id}"));
                continue;
            };
            let gap = (e.distance_km - bits(&c[2])).abs();
            g.check(CLOSE_D, name, gap);
            g.check(CLOSE_T, name, (e.t - bits(&c[1])).abs());
            g.check(CLOSE_V, name, (e.relative_speed_km_s - bits(&c[3])).abs());
            let flags = (c[4].as_bool().expect("bool"), c[5].as_bool().expect("bool"));
            if (e.inside_soi, e.impact) != flags {
                g.problems.push(format!("{name}: {id} flags {flags:?}"));
            }
            line += &format!(", {id} {:.3} m", gap * 1000.0);
        }
        println!("{line}");
        // A flight that runs out of time ends at t0 + duration exactly, in both engines.
        let on_time = last.t.to_bits() == (t0 + cfg.duration).to_bits();
        if ending.0 == "duration" && !(on_time && last.t.to_bits() == w[0].to_bits()) {
            g.problems
                .push(format!("{name}: ends at {}, not t0 + duration", last.t));
        }
    }
    for ((what, bound), worst) in BOUNDS.iter().zip(g.worst) {
        println!("worst {what}: {worst:.3e}, bound {bound:e}");
    }
    assert!(g.problems.is_empty(), "{:#?}", g.problems);
}
