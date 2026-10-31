import { BODIES, cross, dot, norm, sub, type BodyId, type Ephemeris, type Vec3 } from "@starshot/ephemeris";

function stumpffC(z: number): number {
  if (z > 1e-6) return (1 - Math.cos(Math.sqrt(z))) / z;
  if (z < -1e-6) return (Math.cosh(Math.sqrt(-z)) - 1) / -z;
  return 1 / 2 - z / 24 + (z * z) / 720;
}
function stumpffS(z: number): number {
  if (z > 1e-6) { const s = Math.sqrt(z); return (s - Math.sin(s)) / (s * s * s); }
  if (z < -1e-6) { const s = Math.sqrt(-z); return (Math.sinh(s) - s) / (s * s * s); }
  return 1 / 6 - z / 120 + (z * z) / 5040;
}

/**
 * Single-revolution Lambert problem by universal variables with a bracketed
 * bisection (robust rather than fast): the orbit through r1 and r2 [km] with
 * time of flight tof [s] under gravitational parameter mu. Returns null when no
 * solution exists in the bracket (e.g. a 180-degree transfer in a plane).
 */
export function lambert(r1: Vec3, r2: Vec3, tof: number, mu = BODIES.sun.gm, prograde = true): { v1: Vec3; v2: Vec3 } | null {
  const n1 = norm(r1), n2 = norm(r2);
  const cosDnu = Math.min(1, Math.max(-1, dot(r1, r2) / (n1 * n2)));
  let dnu = Math.acos(cosDnu);
  const cz = cross(r1, r2)[2];
  if ((prograde && cz < 0) || (!prograde && cz >= 0)) dnu = 2 * Math.PI - dnu;
  const A = Math.sin(dnu) * Math.sqrt((n1 * n2) / (1 - Math.cos(dnu)));
  if (!Number.isFinite(A) || Math.abs(A) < 1e-9) return null;

  const y = (z: number) => n1 + n2 + (A * (z * stumpffS(z) - 1)) / Math.sqrt(stumpffC(z));
  const F = (z: number) => {
    const yz = y(z);
    if (yz < 0) return -Infinity;
    const C = stumpffC(z);
    return Math.pow(yz / C, 1.5) * stumpffS(z) + A * Math.sqrt(yz) - Math.sqrt(mu) * tof;
  };
  let lo = -4 * Math.PI * Math.PI;
  let hi = 4 * Math.PI * Math.PI - 1e-9;
  // Move the lower bound until y(z) > 0 (needed when A > 0).
  for (let k = 0; k < 200 && y(lo) < 0; k++) lo = (lo + hi) / 2;
  let flo = F(lo);
  const fhi = F(hi);
  if (!(flo <= 0 && fhi >= 0)) {
    // Extend into the hyperbolic range for very short flights.
    for (let k = 0; k < 60 && flo > 0; k++) { lo *= 2; flo = F(lo); }
    if (!(flo <= 0 && fhi >= 0)) return null;
  }
  let z = 0;
  for (let k = 0; k < 200; k++) {
    z = (lo + hi) / 2;
    const fz = F(z);
    if (fz > 0) hi = z; else lo = z;
    if (hi - lo < 1e-12) break;
  }
  const yz = y(z);
  const f = 1 - yz / n1;
  const g = A * Math.sqrt(yz / mu);
  const gdot = 1 - yz / n2;
  const v1: Vec3 = [(r2[0] - f * r1[0]) / g, (r2[1] - f * r1[1]) / g, (r2[2] - f * r1[2]) / g];
  const v2: Vec3 = [(gdot * r2[0] - r1[0]) / g, (gdot * r2[1] - r1[1]) / g, (gdot * r2[2] - r1[2]) / g];
  return { v1, v2 };
}

export interface DirectTransfer {
  readonly launchEt: number;
  readonly tof: number;
  /** departure excess velocity relative to Earth [km/s] */
  readonly vInf: Vec3;
  readonly vInfKmS: number;
  /** arrival speed relative to the target [km/s] */
  readonly arrivalVInfKmS: number;
}

/**
 * Cheapest direct (no flyby) transfer from one body to another found on a grid
 * of launch times and flight times, by departure excess speed. Used for "par"
 * scores and the aiming hint.
 */
export function bestDirectTransfer(
  ephemeris: Ephemeris,
  from: BodyId,
  to: BodyId,
  launchEts: readonly number[],
  tofs: readonly number[],
): DirectTransfer | null {
  let best: DirectTransfer | null = null;
  for (const launchEt of launchEts) {
    const dep = ephemeris.state(from, launchEt);
    for (const tof of tofs) {
      const arr = ephemeris.state(to, launchEt + tof);
      const sol = lambert(dep.r, arr.r, tof);
      if (!sol) continue;
      const vInf = sub(sol.v1, dep.v);
      const vInfKmS = norm(vInf);
      if (!best || vInfKmS < best.vInfKmS) {
        best = { launchEt, tof, vInf, vInfKmS, arrivalVInfKmS: norm(sub(sol.v2, arr.v)) };
      }
    }
  }
  return best;
}
