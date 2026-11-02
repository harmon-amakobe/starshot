import type { Vec3 } from "@starshot/ephemeris";

export interface Knot {
  readonly t: number;
  readonly r: Vec3;
  readonly v: Vec3;
}

/** Cubic Hermite interpolation of position and velocity between two knots. */
export function hermite(a: Knot, b: Knot, t: number): { r: Vec3; v: Vec3 } {
  const h = b.t - a.t;
  if (h === 0) return { r: a.r, v: a.v };
  const s = (t - a.t) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  // derivatives with respect to t
  const d00 = (6 * s2 - 6 * s) / h;
  const d10 = 3 * s2 - 4 * s + 1;
  const d01 = (-6 * s2 + 6 * s) / h;
  const d11 = 3 * s2 - 2 * s;
  const r = [0, 0, 0] as [number, number, number];
  const v = [0, 0, 0] as [number, number, number];
  for (let k = 0; k < 3; k++) {
    const ar = a.r[k]!;
    const br = b.r[k]!;
    const av = a.v[k]!;
    const bv = b.v[k]!;
    r[k] = h00 * ar + h10 * h * av + h01 * br + h11 * h * bv;
    v[k] = d00 * ar + d10 * av + d01 * br + d11 * bv;
  }
  return { r, v };
}
