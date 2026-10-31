import { BODIES, type BodyId, type Ephemeris, type Vec3 } from "@starshot/ephemeris";

/**
 * Acceleration [km/s^2] of a massless probe at heliocentric position r [km] and
 * time et, in the (non-inertial) heliocentric frame: the Sun's direct pull plus
 * each planet's direct pull and the "indirect" term for the Sun being
 * accelerated by that planet.
 */
export function acceleration(
  ephemeris: Ephemeris,
  attractors: readonly BodyId[],
  et: number,
  r: Vec3,
  out: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  const muSun = BODIES.sun.gm;
  const rr = r[0] * r[0] + r[1] * r[1] + r[2] * r[2];
  const kSun = -muSun / (rr * Math.sqrt(rr));
  let ax = kSun * r[0];
  let ay = kSun * r[1];
  let az = kSun * r[2];
  for (const id of attractors) {
    if (id === "sun") continue;
    const mu = BODIES[id].gm;
    const p = ephemeris.state(id, et).r;
    const dx = p[0] - r[0];
    const dy = p[1] - r[1];
    const dz = p[2] - r[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    const kd = mu / (d2 * Math.sqrt(d2));
    const p2 = p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
    const kp = mu / (p2 * Math.sqrt(p2));
    ax += kd * dx - kp * p[0];
    ay += kd * dy - kp * p[1];
    az += kd * dz - kp * p[2];
  }
  out[0] = ax;
  out[1] = ay;
  out[2] = az;
  return out;
}
