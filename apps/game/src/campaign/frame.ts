import { BODIES, PLANET_IDS, type BodyId, type Vec3 } from '@starshot/ephemeris';
import { geometry, ringGeometry, rotate, ephemeris } from './scene-geometry';
import { EMPTY_FRAME, type SceneState, type SceneFrame } from './scene-types';
import type { SceneData } from './scene-data';
export const colours: Record<string, string> = { sun: '#fff1cf', mercury: '#b6b3ab', venus: '#e4c990', earth: '#66b9da', mars: '#de8e70', jupiter: '#d8ba9a', saturn: '#e5d1a1', uranus: '#9ed2d4', neptune: '#638ad7' };
export function makeFrame(state: SceneState, width: number, height: number, data: SceneData | null, identity: number, renderer: string) {
  const g = geometry(state, width, height), unit = g.heightKm / 1000;
  const orbit = state.preferences.camera === 'free' && !state.focus ? state.preferences.orbit.map(n => n * (1 - state.home)) : [0, 0];
  const view = (v: Vec3): Vec3 => { const x = v[0], y = v[1] * Math.cos(orbit[0]!) - v[2] * Math.sin(orbit[0]!), z = v[1] * Math.sin(orbit[0]!) + v[2] * Math.cos(orbit[0]!); return [x * Math.cos(orbit[1]!) + z * Math.sin(orbit[1]!), y, -x * Math.sin(orbit[1]!) + z * Math.cos(orbit[1]!)]; };
  const rotatedPosition = (p: Vec3): Vec3 => view([p[0] - g.centre[0], p[1] - g.centre[1], p[2]]);
  const local = (p: Vec3) => rotatedPosition(rotate(p, g.rotation));
  const projectLocal = (p: Vec3): [number, number] => [width / 2 + p[0] * height / g.heightKm, height / 2 - p[1] * height / g.heightKm];
  const project = (p: Vec3) => projectLocal(local(p));
  const direction = (p: Vec3) => view(rotate(p, g.rotation));
  const headingV = state.aiming ? direction([Math.cos(state.aim.angleDeg * Math.PI / 180), Math.sin(state.aim.angleDeg * Math.PI / 180), 0]) : view(g.velocity);
  const heading = Math.atan2(headingV[1], headingV[0]);
  const bodies = (['sun', ...PLANET_IDS] as BodyId[]).map(id => {
    const trueRadius = BODIES[id].radiusKm * height / g.heightKm;
    const symbol = state.preferences.trueSize ? trueRadius : Math.max(id === 'sun' ? 24 : id === state.level.target || id === 'earth' ? 27 : 12, trueRadius);
    const enlarged = state.focus ? trueRadius : symbol * (1 - state.home) + trueRadius * state.home;
    return { id, name: id === 'sun' ? 'Sol' : BODIES[id].name, point: project(ephemeris.state(id, state.et).r), radius: enlarged };
  });
  const earth = bodies.find(b => b.id === 'earth')!, target = bodies.find(b => b.id === state.level.target)!;
  const physical = projectLocal(rotatedPosition(g.craft)), ring = ringGeometry(physical, earth.point, earth.radius, heading, state, width, height);
  ring.anchor = [ring.anchor[0] * (1 - state.home) + width * (width < 600 ? .58 : .72) * state.home, ring.anchor[1] * (1 - state.home) + height * (width < 600 ? .4 : .43) * state.home];
  const frame: SceneFrame = { ...EMPTY_FRAME, ready: true, renderer, identity, width, height, heightKm: g.heightKm, centre: g.centre, rotation: g.rotation,
    craft: ring.anchor, physicalCraft: physical, heading, forward: [Math.cos(heading), Math.sin(heading)], velocity: g.velocity,
    grip: ring.grip, travel: ring.travel, bodies, target: target.point, targetRadius: target.radius, targetDistance: g.targetDistance,
    intercept: g.intercept ? projectLocal(rotatedPosition(g.intercept)) : null, interceptEt: g.interceptEt, interceptHit: !!state.response?.analysis.hit,
    scaleKm: g.heightKm / height * 100, moonsAvailable: !!data && state.et >= data.rails.startEt && state.et <= data.rails.endEt,
    moonCount: data?.rails.moons.filter(m => m.parent === state.focus).length ?? 0 };
  return { frame, g, unit, local, direction, project, pixels: ring.pixels };
}
export type FrameGeometry = ReturnType<typeof makeFrame>;
