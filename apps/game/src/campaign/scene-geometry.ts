import { BODIES, createEphemeris, norm, sub, type Vec3 } from '@starshot/ephemeris';
import { sampleAt } from '@starshot/physics';
import { cachedEphemeris } from '../sim/shot';
import type { SceneState } from './scene-types';
export const ephemeris = cachedEphemeris(createEphemeris({ flatten: true }));
export const rotate = (p: Vec3, angle: number): Vec3 => [
  p[0] * Math.cos(angle) + p[1] * Math.sin(angle),
  -p[0] * Math.sin(angle) + p[1] * Math.cos(angle),
  p[2],
];
export function geometry(state: SceneState, width: number, height: number) {
  const earthLaunch = ephemeris.state('earth', state.launchEt).r,
    targetLaunch = ephemeris.state(state.level.target, state.launchEt).r;
  const rotation = Math.atan2(targetLaunch[1] - earthLaunch[1], targetLaunch[0] - earthLaunch[0]);
  const earth = rotate(ephemeris.state('earth', state.et).r, rotation),
    target = rotate(ephemeris.state(state.level.target, state.et).r, rotation);
  const current = state.response
    ? sampleAt(state.response.result, state.aiming ? state.launchEt : state.et)
    : ephemeris.state('earth', state.launchEt);
  const craft = rotate(current.r, rotation),
    velocity = rotate(current.v, rotation);
  const landscape = height < 500 && width > 600;
  const top = Math.max(landscape ? 88 : width < 600 ? 185 : 155, (state.safeTop ?? 0) + 50),
    bottom = Math.max(top + 60, height - state.deckHeight - (landscape ? 30 : 65));
  const rect = {
    left: landscape ? 185 : width < 600 ? 94 : 200,
    right: width - (width < 600 ? 74 : 120),
    top,
    bottom,
  };
  const points: Vec3[] = [earth, target];
  if (state.level.requiredFlyby)
    points.push(rotate(ephemeris.state(state.level.requiredFlyby, state.et).r, rotation));
  let intercept: Vec3 | null = null,
    interceptEt: number | null = null;
  if (state.response) {
    const a = state.response.analysis;
    interceptEt = a.hit ? a.endEt : a.closestEt;
    if (Number.isFinite(interceptEt))
      intercept = rotate(ephemeris.state(state.level.target, interceptEt).r, rotation);
    if (intercept && a.hit) points.push(intercept);
  }
  if (!state.aiming) points.push(craft);
  if (state.map)
    points.push(
      [0, 0, 0],
      rotate(ephemeris.state('neptune', state.et).r, rotation),
      rotate(ephemeris.state('uranus', state.et).r, rotation),
    );
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const loX = Math.min(...xs),
    hiX = Math.max(...xs),
    loY = Math.min(...ys),
    hiY = Math.max(...ys);
  const k = Math.max(
    (hiX - loX) / Math.max(55, rect.right - rect.left),
    (hiY - loY) / Math.max(60, rect.bottom - rect.top),
    1e5,
  );
  let h = k * height,
    centre: [number, number] = [
      (loX + hiX) / 2 - ((rect.left + rect.right) / 2 - width / 2) * k,
      (loY + hiY) / 2 + ((rect.top + rect.bottom) / 2 - height / 2) * k,
    ];
  if (state.preferences.camera === 'follow') {
    h = state.preferences.heightKm;
    centre = [craft[0], craft[1] - h * 0.1];
  }
  if (state.preferences.camera === 'free') {
    h = state.preferences.heightKm;
    centre = [...state.preferences.pan];
  }
  if (state.lock) {
    h = state.lock.heightKm;
    centre = [...state.lock.centre];
  }
  if (state.focus) {
    const focus = rotate(ephemeris.state(state.focus, state.et).r, rotation);
    h = state.preferences.heightKm;
    centre = [focus[0], focus[1] - h * 0.08];
  }
  if (state.home > 0) {
    const amount = state.home,
      near = earth;
    h = Math.exp(
      Math.log(h) * (1 - amount) + Math.log(BODIES.earth.radiusKm * (width < 600 ? 7 : 6)) * amount,
    );
    const px = width < 600 ? 0.57 : 0.73,
      py = width < 600 ? 0.38 : 0.48;
    const hero: [number, number] = [
      near[0] - ((px - 0.5) * h * width) / height,
      near[1] + (py - 0.5) * h,
    ];
    centre = [
      centre[0] * (1 - amount) + hero[0] * amount,
      centre[1] * (1 - amount) + hero[1] * amount,
    ];
  }
  return {
    heightKm: h,
    centre,
    rotation,
    earth,
    target,
    craft,
    velocity,
    intercept,
    interceptEt,
    rect,
    targetDistance: norm(sub(ephemeris.state(state.level.target, state.et).r, current.r)),
  };
}
export function ringGeometry(
  physical: [number, number],
  earth: [number, number],
  radius: number,
  heading: number,
  state: SceneState,
  width: number,
  height: number,
) {
  const landscape = height < 500 && width > 600,
    pixels = landscape ? 15 : 22;
  const rest = 1.12 * pixels;
  const top = Math.max(landscape ? 76 : 104, state.safeTop ?? 0) + 28,
    bottom = height - state.deckHeight - (landscape ? 12 : 20) - 28;
  let anchor: [number, number] = [...physical];
  if (state.aiming) {
    // The campaign starts at Earth's centre. Its enlarged control symbol has a declared leader.
    const reserve = Math.min(rest + 55, Math.max(0, (bottom - top) / 2), (width - 72) / 2);
    anchor = [
      Math.max(36 + reserve, Math.min(width - 36 - reserve, earth[0])),
      Math.max(top + reserve, Math.min(bottom - reserve, earth[1] - radius - 44)),
    ];
  }
  if (state.lock) anchor = [...state.lock.anchor];
  const room = Math.min(
    anchor[0] - 36,
    width - 36 - anchor[0],
    anchor[1] - top,
    bottom - anchor[1],
  );
  const travel = state.lock?.travel ?? Math.max(1, Math.min(115, room - rest));
  const distance = rest + travel * state.charge;
  return {
    anchor,
    travel,
    pixels,
    grip: [anchor[0] - Math.cos(heading) * distance, anchor[1] + Math.sin(heading) * distance] as [
      number,
      number,
    ],
  };
}
