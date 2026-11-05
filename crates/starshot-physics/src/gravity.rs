//! Gravity on the probe, as `packages/physics/src/gravity.ts`. Arithmetic only, in the
//! TypeScript order, so for the same planet positions it gives the same bits.

use starshot_ephemeris::{BodyId, Ephemeris, Vec3};
use starshot_math::sqrt;

/// Writes to `out` the acceleration [km/s^2] of a massless probe at heliocentric position
/// `r` [km] and ET `et`. The heliocentric frame is not inertial, so each attractor adds
/// its direct pull less the indirect term, the pull it gives the Sun. The Sun always
/// pulls; listing it in `attractors` adds nothing.
pub fn acceleration(eph: &dyn Ephemeris, attractors: &[BodyId], et: f64, r: Vec3, out: &mut Vec3) {
    let mu_sun = BodyId::Sun.info().gm;
    let rr = r[0] * r[0] + r[1] * r[1] + r[2] * r[2];
    let k_sun = -mu_sun / (rr * sqrt(rr));
    let mut ax = k_sun * r[0];
    let mut ay = k_sun * r[1];
    let mut az = k_sun * r[2];
    for &id in attractors {
        if id == BodyId::Sun {
            continue;
        }
        let mu = id.info().gm;
        let p = eph.state(id, et).r;
        let dx = p[0] - r[0];
        let dy = p[1] - r[1];
        let dz = p[2] - r[2];
        let d2 = dx * dx + dy * dy + dz * dz;
        let kd = mu / (d2 * sqrt(d2));
        let p2 = p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
        let kp = mu / (p2 * sqrt(p2));
        ax += kd * dx - kp * p[0];
        ay += kd * dy - kp * p[1];
        az += kd * dz - kp * p[2];
    }
    *out = [ax, ay, az];
}
