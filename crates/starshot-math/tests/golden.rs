//! Every case in `fixtures/math/golden.json` gives exactly the recorded bits on this
//! machine. CI runs it on x86_64 and arm64; PR15 adds the wasm runtimes. A failure here
//! means a platform, a compiler or a `libm` change moved a last bit (D16).

use serde_json::Value;
use starshot_math as m;

const GOLDEN: &str = include_str!("../../../fixtures/math/golden.json");

// The generator, compiled into this test so its output can be compared with the file.
#[allow(dead_code)]
#[path = "../examples/gen_golden.rs"]
mod gen_golden;

/// Every function the file must cover, each with at least 256 cases.
const FUNCTIONS: [&str; 16] = [
    "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "exp", "ln", "log10", "pow", "cbrt",
    "sinh", "cosh", "tanh", "hypot",
];

fn arg(case: &Value, key: &str) -> f64 {
    let text = case[key]
        .as_str()
        .unwrap_or_else(|| panic!("{case}: no {key}"));
    assert_eq!(text.len(), 16, "{case}: {key} is not 16 hex digits");
    f64::from_bits(u64::from_str_radix(text, 16).unwrap_or_else(|e| panic!("{case}: {e}")))
}

fn eval(case: &Value) -> f64 {
    let x = || arg(case, "x");
    let y = || arg(case, "y");
    match case["fn"].as_str().unwrap_or_default() {
        "sin" => m::sin(x()),
        "cos" => m::cos(x()),
        "tan" => m::tan(x()),
        "asin" => m::asin(x()),
        "acos" => m::acos(x()),
        "atan" => m::atan(x()),
        "atan2" => m::atan2(y(), x()),
        "exp" => m::exp(x()),
        "ln" => m::ln(x()),
        "log10" => m::log10(x()),
        "pow" => m::pow(x(), y()),
        "cbrt" => m::cbrt(x()),
        "sinh" => m::sinh(x()),
        "cosh" => m::cosh(x()),
        "tanh" => m::tanh(x()),
        "hypot" => m::hypot(x(), y()),
        other => panic!("{case}: unknown function {other:?}"),
    }
}

fn cases() -> Vec<Value> {
    let file: Value = serde_json::from_str(GOLDEN).expect("golden.json is not valid JSON");
    assert_eq!(file["schema"], "starshot.math-golden/1");
    file["cases"]
        .as_array()
        .expect("golden.json has no cases")
        .clone()
}

#[test]
fn every_output_matches_its_recorded_bits() {
    let cases = cases();
    let mut wrong = Vec::new();
    for case in &cases {
        let got = eval(case).to_bits();
        let want = arg(case, "out").to_bits();
        if got != want {
            wrong.push(format!("{case}: got {got:016x}"));
        }
    }
    let shown = wrong
        .iter()
        .take(10)
        .cloned()
        .collect::<Vec<_>>()
        .join("\n");
    assert!(
        wrong.is_empty(),
        "{} of {} cases differ:\n{shown}",
        wrong.len(),
        cases.len()
    );
}

#[test]
fn every_function_is_covered() {
    let cases = cases();
    for name in FUNCTIONS {
        let n = cases.iter().filter(|c| c["fn"] == name).count();
        assert!(n >= 256, "{name} has {n} cases, fewer than 256");
    }
}

#[test]
fn the_file_is_the_generator_output() {
    assert!(
        gen_golden::render() == GOLDEN,
        "fixtures/math/golden.json differs from the generator; regenerate it with \
         cargo run -p starshot-math --example gen_golden > fixtures/math/golden.json"
    );
}
