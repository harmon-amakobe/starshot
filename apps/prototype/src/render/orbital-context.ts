import { add, scale, sub, type Vec3 } from '@starshot/ephemeris';
import { sampleFlight, type Flight } from '../lunar/flight';
import type { LunarModel } from '../lunar/model';
import { displayBasis, local } from './mission-geometry';
export interface RoutePoint { t: number; p: Vec3; }
const routes = new WeakMap<Flight, RoutePoint[]>();
export function routePoints(model: LunarModel, flight: Flight) {
  let points = routes.get(flight);
  if (!points) {
    const basis = displayBasis(model), start = flight.request.launchEt;
    points = Array.from({ length: 701 }, (_, i) => {
      const t = start + (flight.endEt - start) * (i / 700) ** 2;
      return { t, p: local(sub(sampleFlight(flight.samples, t).r, model.bodies(t).earth.r), basis) };
    });
    routes.set(flight, points);
  }
  return points;
}
export function parkingOrbit(model: LunarModel, radius: number) {
  const departure = model.basis(), display = displayBasis(model);
  return Array.from({ length: 129 }, (_, i) => {
    const angle = i / 128 * Math.PI * 2;
    return local(add(scale(departure.up, Math.cos(angle) * radius), scale(departure.right, Math.sin(angle) * radius)), display);
  });
}
