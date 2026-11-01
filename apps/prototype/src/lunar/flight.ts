import { BODIES, add, sub, scale, norm, type Vec3 } from '@starshot/ephemeris';
import { Dopri5, hermite, type Knot, type Derivative } from '@starshot/physics';
import { LunarModel, DAY, EARTH_GM, MOON_GM, EARTH_RADIUS, MOON_RADIUS, LAUNCH_ET, FUEL_BUDGET } from './model';

export interface LunarSettings { rtol: number; atolPos: number; atolVel: number; maxStep: number; maxSteps: number; nearBodyFraction: number; }
export const SETTINGS: Readonly<LunarSettings> = Object.freeze({ rtol: 1e-10, atolPos: .01, atolVel: 1e-8,
  maxStep: 1800, maxSteps: 20000, nearBodyFraction: .03 });
export interface ShotRequest {
  launchEt: number; parkingRadiusKm: number; parkingPhaseDeg: number;
  deltaVKmS: number; burnAngleDeg: number; durationSeconds: number; approachRadiusKm: number;
  scope: 'local' | 'lunar';
  settings: typeof SETTINGS;
}
export function requestFor(deltaVKmS: number, burnAngleDeg: number): ShotRequest {
  const dv = Math.max(0, Math.min(FUEL_BUDGET, deltaVKmS)), radius = EARTH_RADIUS + 200;
  const circular = Math.sqrt(EARTH_GM / radius), tangential = circular + dv * Math.cos(burnAngleDeg * Math.PI / 180);
  const radial = dv * Math.sin(burnAngleDeg * Math.PI / 180);
  const energy = (tangential ** 2 + radial ** 2) / 2 - EARTH_GM / radius;
  const axis = -EARTH_GM / (2 * energy);
  const eccentricity = Math.sqrt(Math.max(0, 1 + 2 * energy * (radius * tangential) ** 2 / EARTH_GM ** 2));
  // Weak pulls need a readable local orbit preview, not seven days of repeated laps.
  // This only selects the declared simulation window; the worker still integrates every force.
  const local = energy < 0 && axis * (1 + eccentricity) < 100000;
  const durationSeconds = local ? Math.min(DAY, 4 * Math.PI * Math.sqrt(axis ** 3 / EARTH_GM)) : 7 * DAY;
  return Object.freeze({ launchEt: LAUNCH_ET, parkingRadiusKm: EARTH_RADIUS + 200, parkingPhaseDeg: 225,
    deltaVKmS: dv, burnAngleDeg, scope: local ? 'local' : 'lunar',
    durationSeconds, approachRadiusKm: 65000, settings: SETTINGS });
}
export interface Flight {
  request: ShotRequest; samples: Knot[]; entryEt: number | null;
  impact: 'earth' | 'moon' | null; closestKm: number; endEt: number; steps: number;
}
export function sampleFlight(samples: readonly Knot[], et: number) {
  let lo = 0, hi = samples.length - 1;
  if (et <= samples[0]!.t) return samples[0]!;
  if (et >= samples[hi]!.t) return samples[hi]!;
  while (hi - lo > 1) { const mid = (hi + lo) >> 1; if (samples[mid]!.t <= et) lo = mid; else hi = mid; }
  return hermite(samples[lo]!, samples[hi]!, et);
}
export function simulateLunar(model: LunarModel, request: ShotRequest): Flight {
  const { launchEt, parkingRadiusKm, parkingPhaseDeg, deltaVKmS, settings } = request;
  if (![deltaVKmS, request.burnAngleDeg, launchEt, parkingRadiusKm, parkingPhaseDeg, request.durationSeconds].every(Number.isFinite)
    || deltaVKmS < 0 || deltaVKmS > FUEL_BUDGET || parkingRadiusKm <= EARTH_RADIUS || request.durationSeconds <= 0) {
    throw new Error('The departure burn is outside the collector fuel budget');
  }
  const basis = model.basis(launchEt, parkingPhaseDeg), home = model.bodies(launchEt).earth;
  const beta = request.burnAngleDeg * Math.PI / 180;
  const burn = add(scale(basis.right, deltaVKmS * Math.cos(beta)), scale(basis.up, deltaVKmS * Math.sin(beta)));
  const r = add(home.r, scale(basis.up, parkingRadiusKm));
  const v = add(home.v, add(scale(basis.right, Math.sqrt(EARTH_GM / parkingRadiusKm)), burn));
  const y = new Float64Array([...r, ...v]);
  const derivative: Derivative = (et, state, out) => {
    const position: Vec3 = [state[0]!, state[1]!, state[2]!];
    const acceleration = [...scale(position, -BODIES.sun.gm / norm(position) ** 3)];
    const bodies = model.bodies(et);
    // Indirect terms keep the force heliocentric. The EMB is never added as another mass.
    for (const [body, gm] of [[bodies.earth, EARTH_GM], [bodies.moon, MOON_GM]] as const) {
      const d = sub(body.r, position), distance = norm(d), solarDistance = norm(body.r);
      for (let i = 0; i < 3; i++) acceleration[i]! += gm * (d[i]! / distance ** 3 - body.r[i]! / solarDistance ** 3);
    }
    for (let i = 0; i < 3; i++) { out[i] = state[i + 3]!; out[i + 3] = acceleration[i]!; }
  };
  const solver = new Dopri5(derivative, settings);
  const samples: Knot[] = [{ t: launchEt, r, v }];
  let et = launchEt, h = 1, steps = 0, attempts = 0, entryEt: number | null = null;
  let impact: Flight['impact'] = null, closestKm = Infinity;
  const distanceAt = (knot: { r: Vec3 }, time: number, body: 'earth' | 'moon') => norm(sub(knot.r, model.bodies(time)[body].r));
  const crossing = (a: Knot, b: Knot, body: 'earth' | 'moon', radius: number) => {
    let lo = a.t, hi = b.t;
    for (let i = 0; i < 50 && hi - lo > .001; i++) {
      const mid = (lo + hi) / 2;
      if (distanceAt(hermite(a, b, mid), mid, body) < radius) hi = mid; else lo = mid;
    }
    return hi;
  };
  const entryInSegment = (a: Knot, b: Knot, body: 'earth' | 'moon', radius: number): number | null => {
    if (distanceAt(b, b.t, body) < radius) return crossing(a, b, body, radius);
    // Near-body steps span at most 3% of range. Refine a near-boundary minimum so
    // a grazing crossing between accepted knots has the same result as the drawn path.
    if (Math.min(distanceAt(a, a.t, body), distanceAt(b, b.t, body)) > radius * 1.1) return null;
    let lo = a.t, hi = b.t;
    for (let i = 0; i < 30; i++) {
      const left = lo + (hi - lo) / 3, right = hi - (hi - lo) / 3;
      if (distanceAt(hermite(a, b, left), left, body) < distanceAt(hermite(a, b, right), right, body)) hi = right; else lo = left;
    }
    const et = (lo + hi) / 2, minimum = { t: et, ...hermite(a, b, et) };
    return distanceAt(minimum, et, body) < radius ? crossing(a, minimum, body, radius) : null;
  };
  while (et < launchEt + request.durationSeconds && steps < settings.maxSteps) {
    if (++attempts > settings.maxSteps * 10) throw new Error('The flight solver could not settle');
    const bodies = model.bodies(et), position: Vec3 = [y[0]!, y[1]!, y[2]!], velocity: Vec3 = [y[3]!, y[4]!, y[5]!];
    h = Math.min(h, settings.maxStep, launchEt + request.durationSeconds - et,
      ...(['earth', 'moon'] as const).map(body => settings.nearBodyFraction * norm(sub(position, bodies[body].r)) / Math.max(.001, norm(sub(velocity, bodies[body].v)))));
    const error = solver.attempt(et, y, h);
    if (error > 1) { h = Dopri5.nextStep(h, error); continue; }
    solver.accept(); y.set(solver.yNew); et += h; steps++;
    const next: Knot = { t: et, r: [y[0]!, y[1]!, y[2]!], v: [y[3]!, y[4]!, y[5]!] };
    const previous = samples.at(-1)!;
    samples.push(next);
    const moonDistance = distanceAt(next, et, 'moon');
    closestKm = Math.min(closestKm, moonDistance);
    if (entryEt === null) entryEt = entryInSegment(previous, next, 'moon', request.approachRadiusKm);
    for (const [body, radius] of [['earth', EARTH_RADIUS], ['moon', MOON_RADIUS]] as const) {
      const impactEt = entryInSegment(previous, next, body, radius);
      if (impactEt !== null) {
        impact = body;
        et = impactEt;
        samples[samples.length - 1] = { t: et, ...hermite(previous, next, et) };
        break;
      }
    }
    if (impact) break;
    h = Dopri5.nextStep(h, error);
  }
  if (steps >= settings.maxSteps) throw new Error('The flight exceeded its integration budget');
  const minimumIndex = samples.reduce((best, sample, i) => distanceAt(sample, sample.t, 'moon') < distanceAt(samples[best]!, samples[best]!.t, 'moon') ? i : best, 0);
  if (minimumIndex > 0 && minimumIndex < samples.length - 1) {
    let lo = samples[minimumIndex - 1]!.t, hi = samples[minimumIndex + 1]!.t;
    for (let i = 0; i < 32; i++) {
      const left = lo + (hi - lo) / 3, right = hi - (hi - lo) / 3;
      if (distanceAt(sampleFlight(samples, left), left, 'moon') < distanceAt(sampleFlight(samples, right), right, 'moon')) hi = right; else lo = left;
    }
    const closestEt = (lo + hi) / 2;
    closestKm = Math.min(closestKm, distanceAt(sampleFlight(samples, closestEt), closestEt, 'moon'));
  }
  return { request, samples, entryEt, impact, closestKm, endEt: entryEt ?? et, steps };
}
