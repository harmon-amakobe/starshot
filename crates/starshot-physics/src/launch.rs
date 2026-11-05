//! The patched-conic launch, as `packages/physics/src/launch.ts`.

use starshot_ephemeris::vec::{Vec3, add};
use starshot_ephemeris::{BodyId, EARTH_ONLY_GM, Ephemeris, State};
use starshot_math::sqrt;

/// The radius [km] of a 200 km low Earth parking orbit: today's 6371 plus 200, kept so
/// every delta-v and par equals the TypeScript's.
pub const LEO_RADIUS_KM: f64 = 6371.0 + 200.0;

/// The heliocentric start state of a probe that leaves Earth with excess velocity `v_inf`
/// [km/s]. The escape hyperbola takes less than a day of a months-long flight, so the
/// probe starts at Earth's centre (Table 1's Earth-Moon barycentre) at Earth's velocity
/// plus `v_inf`, and the simulation switches Earth's gravity on once it is clear. The
/// aim then agrees with a Lambert solution.
pub fn departure_state(eph: &dyn Ephemeris, et: f64, v_inf: Vec3) -> State {
    let earth = eph.state(BodyId::Earth, et);
    State {
        r: earth.r,
        v: add(earth.v, v_inf),
    }
}

/// Delta-v [km/s] of one burn from a circular parking orbit of `parking_radius_km` (the
/// game passes `LEO_RADIUS_KM`) to escape with excess speed `v_inf_km_s`.
pub fn delta_v_from_leo(v_inf_km_s: f64, parking_radius_km: f64) -> f64 {
    let v_circ = sqrt(EARTH_ONLY_GM / parking_radius_km);
    sqrt(v_inf_km_s * v_inf_km_s + (2.0 * EARTH_ONLY_GM) / parking_radius_km) - v_circ
}

/// Characteristic energy C3 [km^2/s^2], the excess speed squared, by which launch
/// vehicles are rated.
pub fn c3(v_inf_km_s: f64) -> f64 {
    v_inf_km_s * v_inf_km_s
}
