import { BODIES, norm, sub, type Vec3 } from '@starshot/ephemeris';
import { sampleAt } from '@starshot/physics';
import { parkingState, DAY, MOON_SOI_KM, type LunarModel } from '@starshot/physics/lunar';
import { bodyRadius } from '../missions';
import { worldFor } from './world';
import { routePath, planetOrbitPaths } from './orbit-path';
import type { SceneState } from './scene-types';
export { ephemeris, rotate } from './world';
// Keyed by model, then day: a day key alone would draw one model's orbit for another model.
const moonOrbits = new WeakMap<LunarModel, Map<number, readonly Vec3[]>>();
function lunarOrbit(et: number, model: LunarModel) {
  let orbits = moonOrbits.get(model);
  if (!orbits) { orbits = new Map(); moonOrbits.set(model, orbits); }
  const day = Math.floor(et / DAY); let path = orbits.get(day);
  if (!path) {
    // JPL states over the next lunar sidereal period, not a decorative ellipse.
    path = Array.from({ length: 161 }, (_, i) => model.relative(et + 27.321661 * DAY * i / 160).r);
    if (orbits.size > 32) orbits.clear(); orbits.set(day, path);
  }
  return path;
}
export function geometry(state: SceneState, width: number, height: number, model: LunarModel | null) {
  const world = worldFor(state, model), { plane, body, direction, moonModel } = world;
  const earth = plane(body('earth').r), target = plane(body(state.level.target).r), craft = plane(world.current.r);
  const landscape = height < 500 && width > 600;
  const top = Math.max(landscape ? 122 : width < 600 ? 170 : 155, (state.safeTop ?? 0) + 20);
  const bottom = Math.max(top + 44, landscape ? height - 60 : height - state.deckHeight - 62);
  const rect = state.safeRect ?? { left: landscape ? 35 : 44, right: landscape ? width - Math.min(390, width * .46) - 35 : width - (width < 600 ? 44 : 190), top, bottom };
  const parking = moonModel ? Array.from({ length: 129 }, (_, i) => plane(parkingState(moonModel,
    { ...state.parking!, epochEt: state.parking!.epochEt, phaseDeg: i * 360 / 128 }, state.parking!.epochEt).r, state.parking!.epochEt)) : [];
  const path = state.response ? routePath(state.response).map(k => world.lunar ? direction(k.r) : plane(k.r)) : [];
  const moonOrbit = moonModel ? lunarOrbit(state.et, moonModel).map(direction) : [];
  let intercept: Vec3 | null = null, approachCraft: Vec3 | null = null, interceptEt: number | null = null;
  if (state.response) {
    const a = state.response.analysis; interceptEt = a.hit ? a.endEt : a.closestEt;
    if (Number.isFinite(interceptEt)) {
      intercept = plane(body(state.level.target, interceptEt).r, interceptEt);
      approachCraft = plane(sampleAt(state.response.result, interceptEt).r, interceptEt);
    }
  }
  const points: Vec3[] = [...parking, ...path, craft];
  if (!world.lunar && (state.preferences.camera === 'system' || state.map)) {
    for (const orbit of planetOrbitPaths(state).values()) points.push(...orbit.map(p => plane(p)));
  }
  if (state.preferences.camera !== 'orbit' || !world.lunar || !parking.length) {
    points.push(earth, target);
    points.push(...moonOrbit);
    if (intercept) {
      points.push(intercept);
      const radius = state.response?.analysis.captureZoneKm ?? MOON_SOI_KM;
      points.push([intercept[0] - radius, intercept[1] - radius, 0], [intercept[0] + radius, intercept[1] + radius, 0]);
    }
    if (state.level.requiredFlyby) points.push(plane(body(state.level.requiredFlyby).r));
  }
  if (state.map && !world.lunar) points.push([0, 0, 0], plane(body('neptune').r), plane(body('uranus').r));
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const loX = Math.min(...xs), hiX = Math.max(...xs), loY = Math.min(...ys), hiY = Math.max(...ys);
  const padding = world.lunar ? 34 : 28;
  const k = Math.max((hiX - loX) / Math.max(40, rect.right - rect.left - 2 * padding), (hiY - loY) / Math.max(40, rect.bottom - rect.top - 2 * padding), world.lunar ? 1 : 100);
  let h = k * height, centre: [number, number] = [(loX + hiX) / 2 - ((rect.left + rect.right) / 2 - width / 2) * k,
    (loY + hiY) / 2 + ((rect.top + rect.bottom) / 2 - height / 2) * k];
  if (state.preferences.camera === 'follow') { h = state.preferences.heightKm; centre = [craft[0], craft[1] + ((rect.top + rect.bottom) / 2 - height / 2) * h / height]; }
  if (state.preferences.camera === 'free') { h = state.preferences.heightKm; centre = [...state.preferences.pan]; }
  if (state.focus && state.preferences.camera !== 'free') { const focus = plane(body(state.focus).r); h = state.preferences.heightKm; centre = [focus[0], focus[1] - h * .08]; }
  if (state.lock) { h = state.lock.heightKm; centre = [...state.lock.centre]; }
  if (state.home > 0) {
    const amount = state.home; h = Math.exp(Math.log(h) * (1 - amount) + Math.log(BODIES.earth.radiusKm * (width < 600 ? 7 : 6)) * amount);
    const px = width < 600 ? .57 : .73, py = width < 600 ? .38 : .48;
    const hero: [number, number] = [earth[0] - (px - .5) * h * width / height, earth[1] + (py - .5) * h];
    centre = [centre[0] * (1 - amount) + hero[0] * amount, centre[1] * (1 - amount) + hero[1] * amount];
  }
  return { ...world, heightKm: h, centre, earth, target, craft, intercept, approachCraft, interceptEt, rect, parking, moonOrbit, path,
    targetDistance: norm(sub(body(state.level.target).r, world.current.r)) };
}
export function ringGeometry(physical: [number, number], earth: [number, number], radius: number, heading: number, state: SceneState, width: number, height: number, overview = false) {
  const landscape = height < 500 && width > 600, pixels = overview ? 14 : landscape ? 15 : 22;
  const rest = 1.12 * pixels;
  const top = (state.safeRect?.top ?? Math.max(landscape ? 112 : 104, state.safeTop ?? 0)) + 28;
  const bottom = (state.safeRect?.bottom ?? (landscape ? height - 48 : height - state.deckHeight - 20)) - 28;
  const right = state.safeRect?.right ?? (landscape ? width - Math.min(390, width * .46) - 32 : width - 36);
  let anchor: [number, number] = [...physical];
  if (state.aiming && !state.parking) {
    // The campaign starts at Earth's centre. Its enlarged control symbol has a declared leader.
    const reserve = Math.min(rest + 55, Math.max(0, (bottom - top) / 2), (width - 72) / 2);
    anchor = [Math.max(36 + reserve, Math.min(right - reserve, earth[0] - (overview ? 74 : 0))), Math.max(top + reserve, Math.min(bottom - reserve, earth[1] - radius - 44))];
  }
  if (state.aiming && state.parking) {
    // At system scale the true orbit sits inside an enlarged Earth symbol. Keep its centre and show a leader.
    if (overview && Math.hypot(anchor[0] - earth[0], anchor[1] - earth[1]) < radius + 24) anchor = [earth[0] - 74, earth[1] - radius - 44];
    anchor = [Math.max(36, Math.min(right, anchor[0])), Math.max(top, Math.min(bottom, anchor[1]))];
  }
  if (state.lock) anchor = [...state.lock.anchor];
  let room = Math.min(anchor[0] - 36, right - anchor[0], anchor[1] - top, bottom - anchor[1]);
  if (state.parking) {
    const dx = -Math.cos(heading), dy = Math.sin(heading);
    room = Math.min(Math.abs(dx) < 1e-9 ? Infinity : (dx < 0 ? 36 - anchor[0] : right - anchor[0]) / dx,
      Math.abs(dy) < 1e-9 ? Infinity : (dy < 0 ? top - anchor[1] : bottom - anchor[1]) / dy);
  }
  const travel = state.lock?.travel ?? Math.max(1, Math.min(overview ? 45 : 115, room - rest));
  const distance = rest + travel * state.charge;
  return { anchor, travel, pixels, grip: [anchor[0] - Math.cos(heading) * distance, anchor[1] + Math.sin(heading) * distance] as [number, number] };
}
