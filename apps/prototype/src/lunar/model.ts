import { createEphemeris, add, sub, scale, cross, norm, type State, type Vec3 } from '@starshot/ephemeris';
import { hermite, type Knot } from '@starshot/physics';

export const DAY = 86400;
export const EARTH_GM = 398600.43550702266;
export const MOON_GM = 4902.8001184575496;
export const EARTH_RADIUS = 6371;
export const MOON_RADIUS = 1737.4;
export const FUEL_BUDGET = 3.55;
export const LAUNCH_ET = 846853269.184;
export const unit = (v: Vec3): Vec3 => scale(v, 1 / norm(v));
export interface RailData { knots: number[]; probes: number[][]; }
export interface Basis { right: Vec3; up: Vec3; normal: Vec3; }

export class LunarModel {
  private readonly ephemeris = createEphemeris({ flatten: false });
  private readonly cache = new Map<number, { earth: State; moon: State }>();
  constructor(readonly rail: RailData) {}
  relative(et: number): State {
    const a = this.rail.knots;
    let lo = 0, hi = a.length / 7 - 1;
    if (et < a[0]! || et > a[hi * 7]!) throw new Error('Outside the lunar rail dates');
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (a[mid * 7]! <= et) lo = mid; else hi = mid; }
    const knot = (i: number): Knot => ({ t: a[i * 7]!,
      r: [a[i * 7 + 1]!, a[i * 7 + 2]!, a[i * 7 + 3]!],
      v: [a[i * 7 + 4]!, a[i * 7 + 5]!, a[i * 7 + 6]!] });
    return hermite(knot(lo), knot(hi), et);
  }
  bodies(et: number) {
    const cached = this.cache.get(et);
    if (cached) return cached;
    const emb = this.ephemeris.state('earth', et), relative = this.relative(et);
    const fraction = MOON_GM / (EARTH_GM + MOON_GM);
    const earth = { r: sub(emb.r, scale(relative.r, fraction)), v: sub(emb.v, scale(relative.v, fraction)) };
    const result = { earth, moon: { r: add(earth.r, relative.r), v: add(earth.v, relative.v) } };
    if (this.cache.size > 24) this.cache.clear();
    this.cache.set(et, result);
    return result;
  }
  basis(et = LAUNCH_ET, phaseDeg = 225): Basis {
    const relative = this.relative(et), first = unit(relative.r);
    const normal = unit(cross(relative.r, relative.v)), second = cross(normal, first);
    const phase = phaseDeg * Math.PI / 180;
    const up = add(scale(first, Math.cos(phase)), scale(second, Math.sin(phase)));
    const right = add(scale(first, -Math.sin(phase)), scale(second, Math.cos(phase)));
    return { right, up, normal: cross(right, up) };
  }
}
