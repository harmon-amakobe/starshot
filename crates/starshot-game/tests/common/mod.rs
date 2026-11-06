//! What the conformance tests share: f64 bits as the fixtures store them, bodies by their
//! TypeScript names, and a `ShotAnalysis` read back from a fixture's `analysis_columns`
//! (`apps/game/src/sim/conformance.test.ts`). The struct literal names every field, so a
//! new field fails to compile here until the fixture carries it.

use serde_json::Value;
use starshot_ephemeris::{BodyId, PLANET_IDS};
use starshot_game::{Flyby, ShotAnalysis};
use starshot_physics::Termination;

/// An f64 from 16 hex digits of its bits.
pub fn bits(v: &Value) -> f64 {
    let text = v.as_str().unwrap_or_else(|| panic!("{v} is not bits"));
    f64::from_bits(u64::from_str_radix(text, 16).expect("16 hex digits"))
}

/// A body by its TypeScript name, which is lower case; null is none.
pub fn body(v: &Value) -> Option<BodyId> {
    let name = v.as_str()?;
    let mut all = PLANET_IDS.into_iter().chain([BodyId::Sun, BodyId::Moon]);
    let found = all.find(|b| b.name().eq_ignore_ascii_case(name));
    Some(found.unwrap_or_else(|| panic!("no body is called {name}")))
}

/// The TypeScript's analysis from `analysis_columns`; a flyby from `flyby_columns`.
pub fn analysis(c: &[Value]) -> ShotAnalysis {
    let number = |v: &Value| (!v.is_null()).then(|| bits(v));
    let flag = |v: &Value| v.as_bool().expect("a flag");
    let flybys = c[15].as_array().expect("flybys").iter().map(|f| Flyby {
        body: body(&f[0]).expect("a planet"),
        t: bits(&f[1]),
        distance_km: bits(&f[2]),
        relative_speed_km_s: bits(&f[3]),
    });
    use Termination::{Duration, Escape, Impact, MaxSteps, SoiReached, Sun};
    let all = [Duration, Impact, Sun, Escape, SoiReached, MaxSteps];
    let termination = all.into_iter().find(|t| c[1] == t.name());
    ShotAnalysis {
        hit: flag(&c[0]),
        termination: termination.expect("a known termination"),
        terminated_by: body(&c[2]),
        launch_et: bits(&c[3]),
        end_et: bits(&c[4]),
        flight_days: bits(&c[5]),
        target_soi_km: bits(&c[6]),
        capture_zone_km: bits(&c[7]),
        capture_zone_scale: bits(&c[8]),
        target_radius_km: bits(&c[9]),
        closest_km: bits(&c[10]),
        closest_et: bits(&c[11]),
        periapsis_km: number(&c[12]),
        arrival_speed_km_s: number(&c[13]),
        bullseye: flag(&c[14]),
        flybys: flybys.collect(),
        required_flyby_done: flag(&c[16]),
        v_inf_km_s: bits(&c[17]),
        delta_v_km_s: bits(&c[18]),
        c3: bits(&c[19]),
        beyond_ephemeris_range: flag(&c[20]),
    }
}

/// `want` with the numbers a flight moves taken from `got`: the end, the flight time,
/// the closest approach, and the periapsis, arrival speed and flyby numbers where both
/// have them. Whether each is there, and every other field, stays `want`'s, so comparing
/// the result with `got` compares those exactly; the moved numbers take the test's
/// bounds.
pub fn with_moved_numbers(want: &ShotAnalysis, got: &ShotAnalysis) -> ShotAnalysis {
    let both = |w: Option<f64>, g: Option<f64>| w.and(g).or(w);
    let flyby = |(i, w): (usize, &Flyby)| {
        let g = got.flybys.get(i).filter(|g| g.body == w.body);
        g.copied().unwrap_or(*w)
    };
    ShotAnalysis {
        end_et: got.end_et,
        flight_days: got.flight_days,
        closest_km: got.closest_km,
        closest_et: got.closest_et,
        periapsis_km: both(want.periapsis_km, got.periapsis_km),
        arrival_speed_km_s: both(want.arrival_speed_km_s, got.arrival_speed_km_s),
        flybys: want.flybys.iter().enumerate().map(flyby).collect(),
        ..want.clone()
    }
}
