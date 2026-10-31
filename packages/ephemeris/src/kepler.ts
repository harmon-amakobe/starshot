import type { Vec3 } from "./vec.js";

const TWO_PI = Math.PI * 2;

/** Wrap an angle to (-pi, pi]. */
export function wrapPi(x: number): number {
  let y = x % TWO_PI;
  if (y > Math.PI) y -= TWO_PI;
  else if (y <= -Math.PI) y += TWO_PI;
  return y;
}

/**
 * Solve Kepler's equation M = E - e sin E for the eccentric anomaly E (radians)
 * with Newton's method. Converges for 0 <= e < 1 (tested to e = 0.99).
 */
export function solveKepler(meanAnomaly: number, e: number): number {
  const M = wrapPi(meanAnomaly);
  let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1);
  for (let k = 0; k < 60; k++) {
    const f = E - e * Math.sin(E) - M;
    const dE = f / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-14) break;
  }
  return E;
}

export interface ClassicalElements {
  /** semi-major axis [km] */
  a: number;
  e: number;
  /** inclination, longitude of ascending node, argument of perihelion, mean anomaly [rad] */
  i: number;
  node: number;
  argPeri: number;
  M: number;
  /** mean motion [rad/s] */
  n: number;
}

/**
 * Position [km] and velocity [km/s] from classical elements, in the frame the
 * angles are referred to (here: ecliptic and equinox of J2000).
 */
export function stateFromElements(el: ClassicalElements): { r: Vec3; v: Vec3 } {
  const { a, e, i, node, argPeri, M, n } = el;
  const E = solveKepler(M, e);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const sq = Math.sqrt(1 - e * e);
  const xp = a * (cosE - e);
  const yp = a * sq * sinE;
  const Edot = n / (1 - e * cosE);
  const vxp = -a * sinE * Edot;
  const vyp = a * sq * cosE * Edot;

  const cO = Math.cos(node);
  const sO = Math.sin(node);
  const cw = Math.cos(argPeri);
  const sw = Math.sin(argPeri);
  const ci = Math.cos(i);
  const si = Math.sin(i);
  const r11 = cw * cO - sw * sO * ci;
  const r12 = -sw * cO - cw * sO * ci;
  const r21 = cw * sO + sw * cO * ci;
  const r22 = -sw * sO + cw * cO * ci;
  const r31 = sw * si;
  const r32 = cw * si;
  return {
    r: [r11 * xp + r12 * yp, r21 * xp + r22 * yp, r31 * xp + r32 * yp],
    v: [r11 * vxp + r12 * vyp, r21 * vxp + r22 * vyp, r31 * vxp + r32 * vyp],
  };
}
