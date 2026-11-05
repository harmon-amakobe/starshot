//! Bodies and vectors, as `packages/ephemeris/src/bodies.ts` and `vec.ts`. The digits are
//! written out rather than read from the TypeScript, which PR17 deletes.

use core::f64::consts::PI;
use starshot_ephemeris::vec::{angle_between, cross, norm};
use starshot_ephemeris::{AU_KM, BodyId, EARTH_ONLY_GM, planet_elements, sphere_of_influence_km};

#[test]
#[allow(clippy::excessive_precision)] // the Sun's GM as bodies.ts writes it
fn every_body_has_the_typescript_digits_in_enum_order() {
    use BodyId::*;
    // Name, GM [km^3/s^2] and radius [km] from bodies.ts:25-33.
    let rows: [(BodyId, &str, f64, f64); 9] = [
        (Sun, "Sun", 132712440041.279419, 695700.0),
        (Mercury, "Mercury", 22031.868551, 2439.4),
        (Venus, "Venus", 324858.592, 6051.8),
        (Earth, "Earth", 403503.235502, 6371.0084),
        (Mars, "Mars", 42828.375816, 3389.5),
        (Jupiter, "Jupiter", 126712764.1, 69911.0),
        (Saturn, "Saturn", 37940584.8418, 58232.0),
        (Uranus, "Uranus", 5794556.4, 25362.0),
        (Neptune, "Neptune", 6836527.10058, 24622.0),
    ];
    for (i, (id, name, gm, radius_km)) in rows.into_iter().enumerate() {
        let info = id.info();
        assert_eq!((id as usize, info.name, id.name()), (i, name, name));
        assert_eq!(
            (info.gm.to_bits(), info.radius_km.to_bits()),
            (gm.to_bits(), radius_km.to_bits()),
            "{name}"
        );
    }
    assert_eq!(AU_KM, 149597870.7);
    assert_eq!(
        EARTH_ONLY_GM, 398600.435507,
        "packages/physics/src/launch.ts:4"
    );
    // ephemeris.test.ts: about 577,000 km, from Table 1's semi-major axis at J2000.
    let soi = sphere_of_influence_km(Mars, planet_elements(Mars, 0.0).a);
    assert!(soi > 5.6e5 && soi < 5.9e5, "{soi}");
}

#[test]
#[should_panic(expected = "no BodyInfo for Moon")]
fn the_moon_has_no_body_info() {
    BodyId::Moon.info();
}

#[test]
fn cross_is_right_handed_norm_exact_and_angle_clamped() {
    assert_eq!(cross([1.0, 0.0, 0.0], [0.0, 1.0, 0.0]), [0.0, 0.0, 1.0]);
    assert_eq!(cross([1.0, 2.0, 3.0], [4.0, 5.0, 6.0]), [-3.0, 6.0, -3.0]);
    assert_eq!(norm([3.0, 4.0, 12.0]), 13.0);
    // norm(a) is sqrt(3) rounded, and its square is 2.9999999999999996, so the cosine is
    // 1 + 2.2e-16 before the clamp, and acos of that is NaN.
    let a = [1.0, 1.0, 1.0];
    assert_eq!(angle_between(a, a), 0.0);
    assert_eq!(angle_between(a, [-1.0, -1.0, -1.0]), PI);
    assert_eq!(angle_between(a, [0.0; 3]), 0.0);
}
