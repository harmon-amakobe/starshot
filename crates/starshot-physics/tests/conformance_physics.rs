//! The Rust physics against the TypeScript, through `fixtures/conformance/physics.json`
//! (written by `packages/physics/test/conformance.test.ts`). Hermite, launch, gravity and
//! Sun-only integrator steps are arithmetic only, so every bit is equal. `next_step` goes
//! through `pow` and `lambert` through `norm`, `acos`, `sin`, `pow` and their kin, so they
//! hold within 1e-15 and 1e-9 relative.

mod common;

use common::{lambert_cases, sun_only, table};
use starshot_ephemeris::vec::{Vec3, norm, sub};
use starshot_ephemeris::{BodyId, Ephemeris, State, Table1Ephemeris};
use starshot_physics::{
    Dopri5, Knot, State6, StepTolerance, acceleration, c3, delta_v_from_leo, hermite, lambert,
};

/// Whether two lists hold the same f64 bits.
fn same_bits(a: &[f64], b: &[f64]) -> bool {
    a.len() == b.len() && a.iter().zip(b).all(|(x, y)| x.to_bits() == y.to_bits())
}

#[test]
fn hermite_and_launch_match_typescript_bit_for_bit() {
    let rows = table("hermite", 21);
    let knot = |r: &[f64]| Knot {
        t: r[0],
        r: [r[1], r[2], r[3]],
        v: [r[4], r[5], r[6]],
    };
    for r in &rows {
        let s = hermite(&knot(&r[0..7]), &knot(&r[7..14]), r[14]);
        assert!(same_bits(&[s.r, s.v].concat(), &r[15..]), "hermite {r:?}");
    }
    let launch = table("launch", 4);
    for r in &launch {
        let out = [delta_v_from_leo(r[0], r[1]), c3(r[0])];
        assert!(same_bits(&out, &r[2..]), "launch {r:?}");
    }
    let (h, l) = (rows.len(), launch.len());
    println!("bit for bit: {h} hermite and {l} launch rows");
}

/// The planets where the TypeScript found them, so the planet terms are arithmetic only.
struct Frozen([Vec3; 4]);

const PLANETS: [BodyId; 4] = [BodyId::Earth, BodyId::Mars, BodyId::Jupiter, BodyId::Saturn];

impl Ephemeris for Frozen {
    fn bodies(&self) -> &[BodyId] {
        &PLANETS
    }
    fn flattened(&self) -> bool {
        false
    }
    fn state(&self, id: BodyId, _: f64) -> State {
        let i = PLANETS.iter().position(|&p| p == id).expect("stored");
        State {
            r: self.0[i],
            v: [0.0; 3],
        }
    }
    fn soi_km(&self, _: BodyId, _: f64) -> f64 {
        f64::INFINITY
    }
}

#[test]
fn gravity_matches_typescript_bit_for_bit_with_the_indirect_terms() {
    let rows = table("acceleration", 22);
    // The Sun is listed too: it must add nothing.
    let attractors = [BodyId::Sun, PLANETS[0], PLANETS[1], PLANETS[2], PLANETS[3]];
    for row in &rows {
        let (et, r) = (row[0], [row[1], row[2], row[3]]);
        let mut a = [0.0; 3];
        acceleration(&Table1Ephemeris::default(), &[], et, r, &mut a);
        assert!(same_bits(&a, &row[4..7]), "Sun only at {r:?}");
        let p = |i: usize| [row[i], row[i + 1], row[i + 2]];
        let frozen = Frozen([p(7), p(10), p(13), p(16)]);
        acceleration(&frozen, &attractors, et, r, &mut a);
        assert!(same_bits(&a, &row[19..]), "with planets at {r:?}");
    }
    let n = rows.len();
    println!("bit for bit: {n} acceleration rows, Sun only and with planets");
}

#[test]
fn integrator_steps_match_typescript_bit_for_bit() {
    let rows = table("dopri5", 26);
    for r in &rows {
        let tol = StepTolerance {
            rtol: r[0],
            atol_pos: r[1],
            atol_vel: r[2],
        };
        let (t, h, push, y0) = (r[3], r[4], r[5], r[6..12].try_into().expect("6"));
        // The Sun's pull, plus a push along x growing with t where `push` is not 0.
        let mut f = |t: f64, y: &State6, dy: &mut State6| {
            sun_only(t, y, dy);
            dy[3] += push * t;
        };
        let mut solver = Dopri5::new(tol);
        let err1 = solver.attempt(&mut f, t, &y0, h);
        let y1 = solver.y_new;
        assert!(same_bits(&[&[err1][..], &y1].concat(), &r[12..19]), "{r:?}");
        // After `accept`, the second step starts from the first's last stage.
        solver.accept();
        let err2 = solver.attempt(&mut f, t + h, &y1, h);
        let y2 = solver.y_new;
        assert!(same_bits(&[&[err2][..], &y2].concat(), &r[19..]), "{r:?}");
    }
    let n = rows.len();
    println!("bit for bit: {n} two-step dopri5 rows");
}

#[test]
fn next_step_matches_typescript_within_1e_15_relative() {
    let rows = table("next_step", 3);
    let (mut worst, mut equal, mut nan) = (0.0_f64, 0, 0);
    for r in &rows {
        let next = Dopri5::next_step(r[0], r[1]);
        // A NaN must stay NaN; its sign bit is the engine's (V8 writes fff8..., Rust 7ff8...),
        // and f64::max would drop it from `worst`.
        assert_eq!(next.is_nan(), r[2].is_nan(), "next_step(_, {})", r[1]);
        if next.is_nan() {
            nan += 1;
            continue;
        }
        worst = worst.max(((next - r[2]) / r[2]).abs());
        equal += usize::from(next.to_bits() == r[2].to_bits());
    }
    let n = rows.len();
    println!("next_step: worst {worst:e} relative, {equal} of {n} bit for bit, {nan} NaN");
    assert!(worst < 1e-15, "next_step differs by {worst} relative");
}

#[test]
fn lambert_matches_typescript_within_1e_9_relative() {
    // Each velocity's difference over its length.
    let off = |a: Vec3, b: Vec3| norm(sub(a, b)) / norm(b);
    let cases = lambert_cases();
    let (mut worst, mut equal) = (0.0_f64, 0);
    for (prograde, input, expected) in &cases {
        let (r1, r2) = (
            [input[2], input[3], input[4]],
            [input[5], input[6], input[7]],
        );
        let got = lambert(r1, r2, input[1], input[0], *prograde);
        let (Some((v1, v2)), Some(want)) = (got, expected) else {
            assert_eq!(got.is_none(), expected.is_none(), "{input:?}");
            equal += 1;
            continue;
        };
        let (w1, w2) = ([want[0], want[1], want[2]], [want[3], want[4], want[5]]);
        worst = worst.max(off(v1, w1)).max(off(v2, w2));
        equal += usize::from(same_bits(&[v1, v2].concat(), want));
    }
    let n = cases.len();
    println!("lambert: worst {worst:e} relative, {equal} of {n} bit for bit");
    assert!(worst < 1e-9, "lambert differs by {worst} relative");
}
