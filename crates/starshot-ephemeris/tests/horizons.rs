//! Table 1 against NASA/JPL Horizons at the fixture's five epochs (1977 to 2050), with
//! today's budgets from `packages/ephemeris/test/ephemeris.test.ts` (AC3), and that file's
//! flattened-ephemeris checks.

mod common;

use common::{ARCMIN_BUDGET, num, parse, planet, vec3};
use core::f64::consts::PI;
use starshot_ephemeris::vec::{angle_between, norm, sub};
use starshot_ephemeris::{
    AU_KM, BodyId, Ephemeris, Table1Ephemeris, et_from_jd_tdb, orbit_path, orbital_period_seconds,
    planet_elements, planet_state,
};

const FIXTURE: &str = include_str!("../../../fixtures/horizons/horizons.json");

#[test]
fn every_planet_is_within_its_budget_of_jpl_at_every_fixture_epoch() {
    let fixture = parse(FIXTURE);
    for (name, budget) in ARCMIN_BUDGET {
        let refs = fixture["states"][name]
            .as_array()
            .expect("planet in the fixture");
        assert_eq!(refs.len(), 5, "{name}: five epochs");
        let mut worst = 0.0_f64;
        for reference in refs {
            let jd = num(&reference["jdTdb"]);
            let (r, v) = (vec3(&reference["r"]), vec3(&reference["v"]));
            let s = planet_state(planet(name), et_from_jd_tdb(jd));
            let arcmin = (angle_between(s.r, r) * 180.0 * 60.0) / PI;
            worst = worst.max(arcmin);
            assert!(
                arcmin < budget,
                "{name} @ JD {jd}: {arcmin} arcmin, budget {budget}"
            );
            // Distance from the Sun within 0.2% and speed within 1%.
            assert!(
                (norm(s.r) / norm(r) - 1.0).abs() < 2e-3,
                "{name} @ JD {jd}: distance"
            );
            assert!(
                norm(sub(s.v, v)) / norm(v) < 1e-2,
                "{name} @ JD {jd}: velocity"
            );
        }
        println!("{name}: worst {worst:.4} arcmin against Horizons, budget {budget}");
    }
}

#[test]
fn flattening_projects_onto_the_ecliptic_and_keeps_the_sun_at_the_origin() {
    let eph = Table1Ephemeris { flatten: true };
    let s = eph.state(BodyId::Mars, 0.0);
    assert_eq!(
        (s.r[2].to_bits(), s.v[2].to_bits()),
        (0, 0),
        "z is +0, as the TypeScript literal"
    );
    assert_eq!(eph.state(BodyId::Sun, 0.0).r, [0.0; 3]);
    assert_eq!(eph.state(BodyId::Sun, 0.0).v, [0.0; 3]);
    assert!(eph.flattened() && !Table1Ephemeris::default().flattened());
    let unflat = Table1Ephemeris { flatten: false }.state(BodyId::Mars, 0.0);
    assert_eq!(
        (s.r[0], s.r[1], s.v[0], s.v[1]),
        (unflat.r[0], unflat.r[1], unflat.v[0], unflat.v[1])
    );
}

#[test]
fn the_table1_ephemeris_lists_the_sun_then_the_planets_in_order() {
    use BodyId::*;
    // Spelled out, not built from PLANET_IDS, so a wrong entry there shows here too.
    let listed = [
        Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune,
    ];
    assert_eq!(Table1Ephemeris::default().bodies(), listed);
}

#[test]
fn mars_has_a_sphere_of_influence_of_about_577000_km() {
    let soi = Table1Ephemeris::default().soi_km(BodyId::Mars, 0.0);
    assert!(soi > 5.6e5 && soi < 5.9e5, "{soi}");
    assert_eq!(
        Table1Ephemeris::default().soi_km(BodyId::Sun, 0.0),
        f64::INFINITY
    );
}

#[test]
fn earths_orbit_is_drawn_at_about_1_au() {
    let path = orbit_path(BodyId::Earth, 0.0, 64, false);
    assert_eq!(path.len(), 64);
    for p in path {
        assert!(norm(p) / AU_KM > 0.98 && norm(p) / AU_KM < 1.02, "{p:?}");
    }
    assert!(
        orbit_path(BodyId::Mars, 0.0, 8, true)
            .iter()
            .all(|p| p[2].to_bits() == 0)
    );
    // At ET 1e9 the elements have moved from J2000's, so a path drawn at the wrong ET misses
    // these radii. Point 0 is perihelion (M = 0) and point 32 aphelion (M = pi).
    let et = 1e9;
    let el = planet_elements(BodyId::Earth, et);
    let path = orbit_path(BodyId::Earth, et, 64, false);
    let off = |k: usize, r: f64| (norm(path[k]) / r - 1.0).abs();
    assert!(off(0, el.a * (1.0 - el.e)) < 1e-12, "perihelion first");
    assert!(off(32, el.a * (1.0 + el.e)) < 1e-12, "aphelion halfway");
    // Even steps in M make Earth's widest step in angle 0.1015 rad, at perihelion; the last
    // point closes the loop to the first.
    for (k, p) in path.iter().enumerate() {
        let step = angle_between(*p, path[(k + 1) % 64]);
        assert!(step < 0.11, "step {k}: {step} rad");
    }
    // Anomalistic, from Table 1's mean motion of M.
    let year = orbital_period_seconds(BodyId::Earth, 0.0) / 86400.0;
    assert!((year - 365.2596).abs() < 1e-3, "{year} days");
}

#[test]
#[should_panic(expected = "Table 1 has no elements for Sun")]
fn table1_refuses_a_body_it_does_not_list() {
    planet_state(BodyId::Sun, 0.0);
}

#[test]
#[should_panic(expected = "Table 1 has no elements for Moon")]
fn the_table1_ephemeris_names_a_body_it_does_not_list() {
    Table1Ephemeris::default().state(BodyId::Moon, 0.0);
}
