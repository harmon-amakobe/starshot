import { sub, scale, norm, type Vec3 } from '@starshot/ephemeris';
import { LunarModel, LAUNCH_ET, EARTH_RADIUS, MOON_RADIUS } from '../lunar/model';
import { sampleFlight } from '../lunar/flight';
import type { ViewState, FrameReadout } from './view-types';
import type { Flight } from '../lunar/flight';
import { fitOverview, worldRect } from './overview';
import { local, displayBasis, progradeHeading, burnAngleSign, moonOrbit, approachGeometry, missionArc } from './mission-geometry';
export { local } from './mission-geometry';
import { ENGINE_FRONT_PX, ENGINE_RETRACTED_PX } from './engine-geometry';
const reducedEnvelopes = new WeakMap<Flight, number>();
export function frameGeometry(model: LunarModel, state: ViewState, aspect: number, viewport = { width: aspect * 900, height: 900 }) {
  const basis = displayBasis(model), earth = model.bodies(state.et).earth;
  const craft = state.flight ? local(sub(sampleFlight(state.flight.samples, state.et).r, earth.r), basis) : local(scale(model.basis().up, 6571), basis);
  const moon = local(model.relative(state.et).r, basis);
  const velocity = state.flight ? local(sub(sampleFlight(state.flight.samples, state.et).v, earth.v), basis) : [1, 0, 0];
  const approach = state.previewUpdating ? null : approachGeometry(model, state.flight), orbit = moonOrbit(model);
  const arc = missionArc(model, state.et, approach?.et);
  const fitPoints = [[0, 0, 0], craft, moon, ...arc, ...(approach ? [approach.craft, approach.moon] : [])];
  let height = state.heightKm, centre: Vec3;
  const rect = worldRect(viewport.width, viewport.height, state.deckHeight ?? 230);
  if (state.cameraLock) {
    height = state.cameraLock.heightKm; centre = [...state.cameraLock.centre, 0];
  } else if (state.mode === 'system' && state.aiming) {
    const fitted = fitOverview(fitPoints, viewport.width, viewport.height, rect);
    height = fitted.height; centre = fitted.centre;
  } else if (state.mode === 'system' && state.reducedMotion) {
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
    const fitted = fitOverview(fitPoints, viewport.width, viewport.height, rect);
    height = fitted.height; centre = fitted.centre;
  } else if (state.mode === 'free') {
    centre = [state.pan[0], state.pan[1], 0];
  } else {
    centre = [craft[0] + height * aspect * .17, craft[1] - height * .12, 0];
  }
  return { basis, earth, craft, moon, height, centre, rect, velocity, orbit, approach, prograde: progradeHeading(model), aimSign: burnAngleSign(model), arc };
}
export function frameReadout(frame: ReturnType<typeof frameGeometry>, state: ViewState, width: number, height: number, renderer: string): FrameReadout {
  const pixelsPerKm = height / frame.height;
  const project = (p: Vec3): [number, number] => [width / 2 + (p[0] - frame.centre[0]) * pixelsPerKm, height / 2 - (p[1] - frame.centre[1]) * pixelsPerKm];
  const physicalCraft = project(frame.craft), earth = project([0, 0, 0]), moon = project(frame.moon);
  const earthRadiusPx = Math.max(EARTH_RADIUS * pixelsPerKm, state.simplified ? 32 : 0);
  const moonRadiusPx = Math.max(MOON_RADIUS * pixelsPerKm, state.simplified ? 22 : 0);
  const dx = physicalCraft[0] - earth[0], dy = physicalCraft[1] - earth[1], gap = earthRadiusPx + 38;
  // A separated control symbol stays tied to the physical departure point with a leader.
  const distance = Math.hypot(dx, dy), separation = Math.max(0, gap - distance);
  // Radial separation preserves the visible orbital direction as well as the physical heading.
  const controlAnchor: [number, number] = separation > 0 && distance > .001 ? [earth[0] + dx / distance * gap,
    earth[1] + dy / distance * gap] : physicalCraft;
  const headingRad = state.aiming ? frame.prograde + frame.aimSign * state.angle * Math.PI / 180 : Math.atan2(frame.velocity[1]!, frame.velocity[0]!);
  const dxAxis = Math.cos(headingRad), dyAxis = -Math.sin(headingRad);
  const engineFront: [number, number] = [controlAnchor[0] - dxAxis * ENGINE_FRONT_PX, controlAnchor[1] - dyAxis * ENGINE_FRONT_PX];
  const restGrip: [number, number] = [controlAnchor[0] - dxAxis * ENGINE_RETRACTED_PX, controlAnchor[1] - dyAxis * ENGINE_RETRACTED_PX];
  // One travel budget covers the complete lesson angle range, so a charged ring stays reachable while turning.
  const travelAt = (angle: number) => {
    const x = Math.cos(angle), y = -Math.sin(angle);
    const gripX = controlAnchor[0] - x * ENGINE_RETRACTED_PX, gripY = controlAnchor[1] - y * ENGINE_RETRACTED_PX;
    const roomX = x > .1 ? (gripX - 28) / x : x < -.1 ? (width - 28 - gripX) / -x : 145;
    const roomY = y > .1 ? (gripY - 100) / y : y < -.1 ? (height - (state.deckHeight ?? 230) - 48 - gripY) / -y : 145;
    return Math.min(roomX, roomY);
  };
  const safeTravel = Math.min(...[-35, -20, 0, 20, 35].map(angle => travelAt(frame.prograde + angle * Math.PI / 180)));
  const maxEngineExtensionPx = state.engineTravel ?? Math.max(20, Math.min(145, safeTravel));
  const engineExtensionPx = (state.charge ?? 0) * maxEngineExtensionPx;
  const engineGrip: [number, number] = [restGrip[0] - dxAxis * engineExtensionPx, restGrip[1] - dyAxis * engineExtensionPx];
  const speed = Math.hypot(frame.velocity[0]!, frame.velocity[1]!);
  const enginePulse = state.flightActive ? state.reducedMotion ? .8 : .8 + Math.sin((state.visualTime ?? 0) * 7) * .12 : 0;
  return { craft: controlAnchor, physicalCraft, controlAnchor, earth, moon,
    moonDistance: norm(sub(frame.moon, frame.craft)), earthRadiusPx, moonRadiusPx,
    worldsEnlarged: earthRadiusPx > EARTH_RADIUS * pixelsPerKm + .01 || moonRadiusPx > MOON_RADIUS * pixelsPerKm + .01,
    scaleKm: frame.height * 80 / height, heightKm: frame.height, centre: [frame.centre[0], frame.centre[1]] as [number, number],
    worldRect: frame.rect, renderer, poseStage: state.poseStage ?? 'rest', charge: state.charge ?? 0, snapProgress: state.snapProgress ?? 0,
    headingRad, renderedForward: [Math.cos(headingRad), Math.sin(headingRad)] as [number, number],
    tangent: [frame.velocity[0]! / speed, frame.velocity[1]! / speed] as [number, number], enginePulse,
    engineFront, engineGrip, engineExtensionPx, maxEngineExtensionPx, sleeveLengthPx: ENGINE_RETRACTED_PX - ENGINE_FRONT_PX + engineExtensionPx,
    progradeHeadingRad: frame.prograde, aimSign: frame.aimSign, futureMoon: frame.approach ? project(frame.approach.moon) : null,
    approachPoint: frame.approach ? project(frame.approach.craft) : null, approachEt: frame.approach?.et ?? null,
    approachRadiusPx: (state.flight?.request.approachRadiusKm ?? 65000) * pixelsPerKm,
    demoCharge: state.demoCharge ?? 0, demoGrip: [0, 0] as [number, number], demoFront: [0, 0] as [number, number], demoTravelPx: 100,
    orbitCue: project(frame.arc[7]!), orbitDirection: Math.atan2(-(frame.arc[8]![1] - frame.arc[6]![1]), frame.arc[8]![0] - frame.arc[6]![0]) };
}
