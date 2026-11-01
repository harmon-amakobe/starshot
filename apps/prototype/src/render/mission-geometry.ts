import { cross, dot, sub, type Vec3 } from '@starshot/ephemeris';
import { LunarModel, LAUNCH_ET, DAY, unit, type Basis } from '../lunar/model';
import { sampleFlight, type Flight } from '../lunar/flight';

export const local = (v: Vec3, basis: Basis): Vec3 => [dot(v, basis.right), dot(v, basis.up), dot(v, basis.normal)];
const displays = new WeakMap<LunarModel, Basis>();
const orbits = new WeakMap<LunarModel, Vec3[]>();
const approaches = new WeakMap<Flight, { craft: Vec3; moon: Vec3; et: number }>();

export function displayBasis(model: LunarModel) {
  let basis = displays.get(model);
  if (!basis) {
    const relative = model.relative(LAUNCH_ET), right = unit(relative.r), normal = unit(cross(relative.r, relative.v));
    basis = { right, up: cross(normal, right), normal }; displays.set(model, basis);
  }
  return basis;
}
export function progradeHeading(model: LunarModel) {
  const direction = local(model.basis().right, displayBasis(model));
  return Math.atan2(direction[1], direction[0]);
}
export function burnAngleSign(model: LunarModel) { return Math.sign(dot(model.basis().normal, displayBasis(model).normal)); }
export function moonOrbit(model: LunarModel) {
  let points = orbits.get(model);
  if (!points) {
    const last = model.rail.knots[model.rail.knots.length - 7]!, end = Math.min(last, LAUNCH_ET + 28 * DAY);
    points = Array.from({ length: 225 }, (_, i) => local(model.relative(LAUNCH_ET + (end - LAUNCH_ET) * i / 224).r, displayBasis(model)));
    orbits.set(model, points);
  }
  return points;
}
export function approachGeometry(model: LunarModel, flight: Flight | null) {
  if (!flight?.entryEt) return null;
  let approach = approaches.get(flight);
  if (!approach) {
    const et = flight.entryEt, basis = displayBasis(model);
    approach = { et, craft: local(sub(sampleFlight(flight.samples, et).r, model.bodies(et).earth.r), basis),
      moon: local(model.relative(et).r, basis) };
    approaches.set(flight, approach);
  }
  return approach;
}
export function missionArc(model: LunarModel, et: number, approachEt?: number) {
  const end = Math.max(et + DAY, approachEt ?? LAUNCH_ET + 2 * DAY);
  return Array.from({ length: 17 }, (_, i) => local(model.relative(et + (end - et) * i / 16).r, displayBasis(model)));
}
