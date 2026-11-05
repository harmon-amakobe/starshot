//! Prints `fixtures/math/golden.json`: the exact output bits of every `starshot_math`
//! function over fixed inputs. From the repository root:
//!
//! ```text
//! cargo run -p starshot-math --example gen_golden > fixtures/math/golden.json
//! ```
//!
//! The inputs come only from IEEE arithmetic (`+`, `-`, `*`, `/` and an integer
//! conversion) on literal constants, never from a function under test, so every machine
//! makes the same inputs. `tests/golden.rs` checks the outputs on each platform and
//! that this program still prints the file byte for byte.

use starshot_math as m;

/// Zero of both signs and one of both signs, kept where the result is a number.
const SPECIALS: [f64; 4] = [0.0, -0.0, 1.0, -1.0];

/// The smallest subnormal of both signs, a subnormal in the middle and the smallest
/// normal number, kept where the result is a number.
const TINY: [f64; 4] = [5e-324, -5e-324, 1e-310, 2.2250738585072014e-308];

/// Pairs of these test that atan2 and hypot scale without overflow or underflow.
const SCALE: [f64; 4] = [1e300, -1e300, 1e-300, -1e-300];

/// The TypeScript core raises to -0.2 (dopri5.ts), 0.4 (bodies.ts and lunar/model.ts),
/// 1.5 (lambert.ts), 2 (dopri5.ts and lunar/flight.ts) and 3 (lunar/flight.ts and
/// lunar/parking.ts). The plan also names 2/3, which no code uses yet.
const POW_Y: [f64; 6] = [-0.2, 0.4, 1.5, 2.0 / 3.0, 2.0, 3.0];

/// `n` evenly spaced points from `lo` to `hi`, both included.
fn span(lo: f64, hi: f64, n: u32) -> Vec<f64> {
    let last = f64::from(n - 1);
    (0..n)
        .map(|i| lo + (hi - lo) * f64::from(i) / last)
        .collect()
}

/// Ten points in each of `count` decades from `lo` (1, 1.9, 2.8 ... 9.1 times the
/// decade's start), then the end. Each decade starts ten times the previous one, so
/// small and large inputs get as many cases as each other.
fn decades(lo: f64, count: u32) -> Vec<f64> {
    let mut start = lo;
    let mut points = Vec::new();
    for _ in 0..count {
        points.extend((0..10).map(|j| start * (1.0 + 9.0 * f64::from(j) / 10.0)));
        start *= 10.0;
    }
    points.push(start);
    points
}

/// Every pair of `a` with `b`.
fn pairs(a: &[f64], b: &[f64]) -> Vec<(f64, f64)> {
    a.iter()
        .flat_map(|&x| b.iter().map(move |&y| (x, y)))
        .collect()
}

fn hex(v: f64) -> String {
    format!("{:016x}", v.to_bits())
}

/// One case per line. A range input must give a number: its function is defined
/// there. A special value that gives NaN is left out, because NaN's sign and payload
/// bits are not the same on every platform.
fn case(cases: &mut Vec<String>, name: &str, args: &[(&str, f64)], out: f64, special: bool) {
    if out.is_nan() {
        assert!(special, "{name}{args:?} gave NaN inside its range");
        return;
    }
    let args: String = args
        .iter()
        .map(|(k, v)| format!("\"{k}\": \"{}\", ", hex(*v)))
        .collect();
    cases.push(format!(
        "    {{ \"fn\": \"{name}\", {args}\"out\": \"{}\" }}",
        hex(out)
    ));
}

/// The range inputs, then the special and tiny values.
fn unary(cases: &mut Vec<String>, name: &str, f: fn(f64) -> f64, inputs: &[f64]) {
    for &x in inputs {
        case(cases, name, &[("x", x)], f(x), false);
    }
    for x in SPECIALS.into_iter().chain(TINY) {
        case(cases, name, &[("x", x)], f(x), true);
    }
}

/// A 16 by 16 grid over -1e3 to 1e3, then the special and scaling pairs. `keys` name
/// the arguments in call order: atan2 takes `y` first.
fn binary(cases: &mut Vec<String>, name: &str, keys: [&str; 2], f: fn(f64, f64) -> f64) {
    let axis = span(-1e3, 1e3, 16);
    let grid = pairs(&axis, &axis).into_iter().map(|p| (p, false));
    let special = [pairs(&SPECIALS, &SPECIALS), pairs(&SCALE, &SCALE)].concat();
    for ((a, b), special) in grid.chain(special.into_iter().map(|p| (p, true))) {
        let args = [(keys[0], a), (keys[1], b)];
        case(cases, name, &args, f(a, b), special);
    }
}

/// The whole file, as `main` prints it.
pub fn render() -> String {
    let mut c = Vec::new();
    let trig = [span(-7.0, 7.0, 256), span(-1e4, 1e4, 256)].concat();
    unary(&mut c, "sin", m::sin, &trig);
    unary(&mut c, "cos", m::cos, &trig);
    unary(&mut c, "tan", m::tan, &trig);
    unary(&mut c, "asin", m::asin, &span(-1.0, 1.0, 256));
    unary(&mut c, "acos", m::acos, &span(-1.0, 1.0, 256));
    unary(&mut c, "atan", m::atan, &span(-1e3, 1e3, 256));
    binary(&mut c, "atan2", ["y", "x"], m::atan2);
    unary(&mut c, "exp", m::exp, &span(-700.0, 700.0, 256));
    let logs = [span(1e-6, 1e12, 256), decades(1e-12, 24)].concat();
    unary(&mut c, "ln", m::ln, &logs);
    unary(&mut c, "log10", m::log10, &logs);
    let bases = [span(1e-6, 1e6, 256), decades(1e-12, 18)].concat();
    for y in POW_Y {
        for &x in &bases {
            case(&mut c, "pow", &[("x", x), ("y", y)], m::pow(x, y), false);
        }
        for x in SPECIALS.into_iter().chain(TINY) {
            case(&mut c, "pow", &[("x", x), ("y", y)], m::pow(x, y), true);
        }
    }
    unary(&mut c, "cbrt", m::cbrt, &span(-1e9, 1e9, 256));
    unary(&mut c, "sinh", m::sinh, &span(-20.0, 20.0, 256));
    unary(&mut c, "cosh", m::cosh, &span(-20.0, 20.0, 256));
    unary(&mut c, "tanh", m::tanh, &span(-20.0, 20.0, 256));
    binary(&mut c, "hypot", ["x", "y"], m::hypot);
    let mut text = String::from("{\n  \"schema\": \"starshot.math-golden/1\",\n");
    text.push_str("  \"generator\": \"cargo run -p starshot-math --example gen_golden\",\n");
    text.push_str("  \"cases\": [\n");
    text.push_str(&c.join(",\n"));
    text.push_str("\n  ]\n}\n");
    text
}

fn main() {
    print!("{}", render());
}
