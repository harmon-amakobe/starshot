import { BODIES, PLANET_IDS, type BodyId, type Vec3 } from '@starshot/ephemeris';
import type { LunarModel } from '@starshot/physics/lunar';
import { geometry, ringGeometry } from './scene-geometry';
import { bodyName, bodyRadius, type MissionBody } from '../missions';
import { EMPTY_FRAME, type SceneState, type SceneFrame } from './scene-types';
import type { SceneData } from './scene-data';
export const colours: Record<string, string> = { sun: '#fff1cf', mercury: '#b6b3ab', venus: '#e4c990', earth: '#66b9da', moon: '#ccc9bb', mars: '#de8e70', jupiter: '#d8ba9a', saturn: '#e5d1a1', uranus: '#9ed2d4', neptune: '#638ad7' };
// `model` is null until the Moon model loads: a planetary frame draws without it, a lunar one throws.
export function makeFrame(state: SceneState, width: number, height: number, data: SceneData | null, identity: number, renderer: string, model: LunarModel | null) {
  const g = geometry(state, width, height, model), unit = g.heightKm / 1000;
  const orbit = state.preferences.camera === 'free' ? state.preferences.orbit.map(n => n * (1 - state.home)) : [0, 0];
  const view = (v: Vec3): Vec3 => { const x = v[0], y = v[1] * Math.cos(orbit[0]!) - v[2] * Math.sin(orbit[0]!), z = v[1] * Math.sin(orbit[0]!) + v[2] * Math.cos(orbit[0]!); return [x * Math.cos(orbit[1]!) + z * Math.sin(orbit[1]!), y, -x * Math.sin(orbit[1]!) + z * Math.cos(orbit[1]!)]; };
  const rotatedPosition = (p: Vec3): Vec3 => view([p[0] - g.centre[0], p[1] - g.centre[1], p[2]]);
  const local = (p: Vec3) => rotatedPosition(g.plane(p));
  const projectLocal = (p: Vec3): [number, number] => [width / 2 + p[0] * height / g.heightKm, height / 2 - p[1] * height / g.heightKm];
  const project = (p: Vec3) => projectLocal(local(p));
  const direction = (p: Vec3) => view(g.direction(p));
  const headingV = state.aiming ? g.lunar ? view([Math.cos(g.prograde - state.aim.angleDeg * Math.PI / 180), Math.sin(g.prograde - state.aim.angleDeg * Math.PI / 180), 0]) : direction([Math.cos(state.aim.angleDeg * Math.PI / 180), Math.sin(state.aim.angleDeg * Math.PI / 180), 0]) : view(g.velocity);
  const heading = Math.atan2(headingV[1], headingV[0]);
  const ids = g.lunar ? ['sun', 'earth', 'moon'] as MissionBody[] : ['sun', ...PLANET_IDS] as BodyId[];
  const positions = ids.map(id => project(g.body(id).r));
  const overview = !state.focus && (!g.lunar || g.heightKm >= 2e5);
  const bodies = ids.map((id, index) => {
    const trueRadius = bodyRadius(id) * height / g.heightKm;
    const point = positions[index]!;
    const nearest = Math.min(...positions.filter((_, i) => i !== index).map(p => Math.hypot(p[0] - point[0], p[1] - point[1])));
    // Overview symbols mark centres; their separate DOM labels retain 44 px targets.
    const minimum = overview ? Math.max(1.5, Math.min(id === 'earth' || id === state.level.target ? 8 : 5, nearest * .25)) : id === 'sun' ? 24 : 12;
    const symbol = state.preferences.trueSize || g.lunar && !overview ? trueRadius : Math.max(minimum, trueRadius);
    const enlarged = state.focus ? trueRadius : symbol * (1 - state.home) + trueRadius * state.home;
    return { id, name: id === 'sun' ? 'Sol' : bodyName(id), point, radius: enlarged };
  });
  const earth = bodies.find(b => b.id === 'earth')!, target = bodies.find(b => b.id === state.level.target)!;
  const physical = projectLocal(rotatedPosition(g.craft)), ring = ringGeometry(physical, earth.point, earth.radius, heading, state, width, height, overview);
  ring.anchor = [ring.anchor[0] * (1 - state.home) + width * (width < 600 ? .58 : .72) * state.home, ring.anchor[1] * (1 - state.home) + height * (width < 600 ? .4 : .43) * state.home];
  const frame: SceneFrame = { ...EMPTY_FRAME, ready: true, renderer, identity, width, height, heightKm: g.heightKm, centre: g.centre, rotation: g.rotation,
    craft: ring.anchor, physicalCraft: physical, heading, prograde: g.prograde, visibleRect: g.rect, forward: [Math.cos(heading), Math.sin(heading)], velocity: g.velocity,
    grip: ring.grip, travel: ring.travel, ringRoom: ring.room, bodies, target: target.point, targetRadius: target.radius, targetDistance: g.targetDistance,
    intercept: g.intercept ? projectLocal(rotatedPosition(g.intercept)) : null, interceptEt: g.interceptEt, interceptHit: !!state.response?.analysis.hit,
    approachCraft: g.approachCraft ? projectLocal(rotatedPosition(g.approachCraft)) : null, captureRadius: (state.response?.analysis.captureZoneKm ?? 0) * height / g.heightKm,
    scaleKm: g.heightKm / height * 100, moonsAvailable: !!data && state.et >= data.rails.startEt && state.et <= data.rails.endEt,
    moonCount: data?.rails.moons.filter(m => m.parent === state.focus).length ?? 0 };
  return { frame, g, unit, local, direction, project, projectPlane: (p: Vec3) => projectLocal(rotatedPosition(p)), pixels: ring.pixels };
}
export type FrameGeometry = ReturnType<typeof makeFrame>;
