import { sub, dot, scale, norm, type Vec3 } from '@starshot/ephemeris';
import { LunarModel, LAUNCH_ET, type Basis } from '../lunar/model';
import { sampleFlight } from '../lunar/flight';
import type { ViewState } from './view-types';
import type { Flight } from '../lunar/flight';
const reducedEnvelopes = new WeakMap<Flight, number>();
export const local = (v: Vec3, basis: Basis): Vec3 => [dot(v, basis.right), dot(v, basis.up), dot(v, basis.normal)];
export function frameGeometry(model: LunarModel, state: ViewState, aspect: number) {
  const basis = model.basis(), earth = model.bodies(state.et).earth;
  const craft = state.flight ? local(sub(sampleFlight(state.flight.samples, state.et).r, earth.r), basis) : local(scale(basis.up, 6571), basis);
  const moon = local(model.relative(state.et).r, basis);
  let height = state.heightKm, centre: Vec3;
  if (state.mode === 'system' && state.reducedMotion) {
    let radius = state.flight ? reducedEnvelopes.get(state.flight) : undefined;
    if (radius === undefined) {
      radius = norm(model.relative(LAUNCH_ET).r) + 68000;
      if (state.flight) {
        for (const knot of state.flight.samples) {
          if (knot.t > state.flight.endEt) break;
          radius = Math.max(radius, norm(sub(knot.r, model.bodies(knot.t).earth.r)) + 10000, norm(model.relative(knot.t).r) + 68000);
        }
        reducedEnvelopes.set(state.flight, radius);
      }
    }
    // The complete envelope is fixed for this request, so reduced motion never refits the camera in flight.
    height = radius * 2.35 / Math.min(1, aspect);
    centre = [0, -height * .08, 0];
  } else if (state.mode === 'system') {
    const lowX = Math.min(-7000, moon[0] - 68000, craft[0]), highX = Math.max(7000, moon[0] + 68000, craft[0]);
    const lowY = Math.min(-7000, moon[1] - 68000, craft[1]), highY = Math.max(7000, moon[1] + 68000, craft[1]);
    height = Math.max((highX - lowX) / aspect, highY - lowY) * 1.5;
    centre = [(lowX + highX) / 2, (lowY + highY) / 2 - height * .08, 0];
  } else if (state.mode === 'free') {
    centre = [state.pan[0], state.pan[1], 0];
  } else {
    centre = [craft[0] + height * aspect * .17, craft[1] - height * .12, 0];
  }
  return { basis, earth, craft, moon, height, centre };
}
