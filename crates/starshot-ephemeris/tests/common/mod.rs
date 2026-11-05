//! Helpers the integration tests share: reading f64 bits and body names from the JSON
//! fixtures. Each test file uses only some of them.
#![allow(dead_code)]

use serde_json::Value;
use starshot_ephemeris::BodyId;
use starshot_ephemeris::vec::{Vec3, norm, sub};

/// An f64 from 16 hex digits of its bits, the form the conformance fixtures store.
pub fn bits(v: &Value) -> f64 {
    let text = v
        .as_str()
        .unwrap_or_else(|| panic!("{v} is not a string of bits"));
    assert_eq!(text.len(), 16, "{text} is not 16 hex digits");
    f64::from_bits(u64::from_str_radix(text, 16).unwrap_or_else(|e| panic!("{text}: {e}")))
}

/// A JSON number, read as correctly rounded as JavaScript reads it (float_roundtrip).
pub fn num(v: &Value) -> f64 {
    v.as_f64().unwrap_or_else(|| panic!("{v} is not a number"))
}

pub fn vec3(v: &Value) -> Vec3 {
    [num(&v[0]), num(&v[1]), num(&v[2])]
}

pub fn parse(text: &str) -> Value {
    serde_json::from_str(text).expect("fixture is valid JSON")
}

/// The TypeScript id of a planet ("earth" is the Earth-Moon barycentre).
pub fn planet(name: &str) -> BodyId {
    match name {
        "mercury" => BodyId::Mercury,
        "venus" => BodyId::Venus,
        "earth" => BodyId::Earth,
        "mars" => BodyId::Mars,
        "jupiter" => BodyId::Jupiter,
        "saturn" => BodyId::Saturn,
        "uranus" => BodyId::Uranus,
        "neptune" => BodyId::Neptune,
        other => panic!("unknown planet {other}"),
    }
}

/// Today's per-planet direction budgets against Horizons, in arcminutes
/// (`packages/ephemeris/test/ephemeris.test.ts`). A loosened budget needs a decision entry.
pub const ARCMIN_BUDGET: [(&str, f64); 8] = [
    ("mercury", 1.5),
    ("venus", 1.5),
    ("earth", 1.5),
    ("mars", 2.0),
    ("jupiter", 12.0),
    ("saturn", 15.0),
    ("uranus", 3.0),
    ("neptune", 2.0),
];

/// Length of a - b.
pub fn dist(a: Vec3, b: Vec3) -> f64 {
    norm(sub(a, b))
}
