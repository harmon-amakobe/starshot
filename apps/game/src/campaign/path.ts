import { hermite, type SimulationResult } from '@starshot/physics';

export interface PathData {
  /** [t, x, y] triples (ET, km, km). */
  readonly pts: Float64Array;
  readonly count: number;
}

/** Densify the integrator knots with cubic Hermite so the drawn curve is smooth. */
export function buildPath(result: SimulationResult, subdiv = 3): PathData {
  const s = result.samples;
  const n = Math.max(1, (s.length - 1) * subdiv + 1);
  const pts = new Float64Array(n * 3);
  let k = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i]!;
    const b = s[i + 1]!;
    for (let j = 0; j < subdiv; j++) {
      const t = a.t + ((b.t - a.t) * j) / subdiv;
      const p = j === 0 ? a : hermite(a, b, t);
      pts[k++] = t;
      pts[k++] = p.r[0];
      pts[k++] = p.r[1];
    }
  }
  const last = s[s.length - 1]!;
  pts[k++] = last.t;
  pts[k++] = last.r[0];
  pts[k++] = last.r[1];
  return { pts, count: k / 3 };
}
