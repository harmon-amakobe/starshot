import { sampleAt, type SimulationResult } from '@starshot/physics';
import type { ShotResponse } from '../sim/protocol';
import { DAY } from '../sim/shot';
import { unitOf, type Preferences } from './session';
const nodes = [0, -0.5384693101056831, 0.5384693101056831, -0.906179845938664, 0.906179845938664];
const weights = [
  0.5688888888888889, 0.4786286704993665, 0.4786286704993665, 0.2369268850561891,
  0.2369268850561891,
];
interface Segment {
  start: number;
  end: number;
  dt: number;
  offset: number;
  length: number;
  b: number[];
  c: number[];
  d: number[];
}
/** The observatory's Hermite arc-length clock, applied to the campaign's heliocentric path. */
export function replayClock(result: SimulationResult, start: number, end: number) {
  const samples = [...result.samples.filter((s) => s.t < end), sampleAt(result, end)],
    segments: Segment[] = [];
  let total = 0;
  const speed = (s: Segment, u: number) =>
    Math.hypot(...s.b.map((b, k) => b + 2 * s.c[k]! * u + 3 * s.d[k]! * u * u));
  const integral = (s: Segment, lo: number, hi: number) =>
    ((hi - lo) / 2) *
    nodes.reduce(
      (sum, x, i) => sum + weights[i]! * speed(s, (lo + hi) / 2 + ((hi - lo) / 2) * x),
      0,
    );
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!,
      b = samples[i]!,
      dt = b.t - a.t;
    if (dt <= 0) continue;
    const s: Segment = {
      start: a.t,
      end: b.t,
      dt,
      offset: total,
      length: 0,
      b: a.v.map((v) => v * dt),
      c: a.r.map((r, k) => 3 * (b.r[k]! - r) - (2 * a.v[k]! + b.v[k]!) * dt),
      d: a.r.map((r, k) => 2 * (r - b.r[k]!) + (a.v[k]! + b.v[k]!) * dt),
    };
    s.length = integral(s, 0, 1);
    total += s.length;
    segments.push(s);
  }
  function at(value: number, key: 'start' | 'offset') {
    let lo = 0,
      hi = segments.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (segments[mid]![key] <= value) lo = mid;
      else hi = mid - 1;
    }
    return segments[lo];
  }
  function distanceAt(et: number) {
    if (et <= start) return 0;
    if (et >= end) return total;
    const s = at(et, 'start');
    return s ? s.offset + integral(s, 0, (et - s.start) / s.dt) : 0;
  }
  function etAtDistance(km: number) {
    if (km <= 0) return start;
    if (km >= total) return end;
    const s = at(km, 'offset');
    if (!s) return end;
    const target = km - s.offset;
    let lo = 0,
      hi = 1,
      u = target / s.length;
    for (let i = 0; i < 12; i++) {
      const error = integral(s, 0, u) - target;
      if (Math.abs(error) < 0.000001) break;
      if (error > 0) hi = u;
      else lo = u;
      const next = u - error / speed(s, u);
      u = Number.isFinite(next) && next > lo && next < hi ? next : (lo + hi) / 2;
    }
    return s.start + u * s.dt;
  }
  return { distanceAt, etAtDistance };
}
const clocks = new WeakMap<ShotResponse, ReturnType<typeof replayClock>>();
export function clockFor(f: ShotResponse) {
  let clock = clocks.get(f);
  if (!clock) {
    clock = replayClock(f.result, f.shot.launchEt, f.analysis.endEt);
    clocks.set(f, clock);
  }
  return clock;
}
export function stepRate(effective: number, steps: number[], direction: number) {
  return direction > 0
    ? (steps.find((n) => n > effective * (1 + 1e-10)) ?? Math.max(effective, steps.at(-1)!))
    : (steps.filter((n) => n < effective * (1 - 1e-10)).at(-1) ?? Math.min(effective, steps[0]!));
}
/** Default playback speed in ET seconds per second: any flight plays in 4 to 9 seconds. */
export const defaultRate = (f: ShotResponse) =>
  (f.analysis.endEt - f.shot.launchEt) /
  Math.max(4, Math.min(9, 2.5 + f.analysis.flightDays / 200));
/** The flight clock after `seconds` of play, clamped to the end of the flight. */
export function advanceEt(f: ShotResponse, p: Preferences, et: number, seconds: number) {
  const light = p.scientific && unitOf(p) === 'light';
  if (light && p.lightRate > 0) {
    const clock = clockFor(f);
    return clock.etAtDistance(clock.distanceAt(et) + seconds * p.lightRate * 299792.458);
  }
  const rate = light ? 1 : p.rate || defaultRate(f);
  // Default speed slows near an encounter so a flyby can be seen.
  const close = f.analysis.flybys.some((e) => Math.abs(e.t - et) < 4 * DAY);
  return Math.min(
    f.analysis.endEt,
    et + seconds * rate * (p.rate === 0 && !p.scientific && close ? 0.28 : 1),
  );
}
