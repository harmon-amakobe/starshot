import { createEphemeris, dot, sub, type Vec3 } from '@starshot/ephemeris';
import { sampleAt } from '@starshot/physics';
import { parkingState, type LunarModel } from '@starshot/physics/lunar';
import { cachedEphemeris } from '../sim/shot';
import { isLunarLevel, type MissionBody } from '../missions';
import type { SceneState } from './scene-types';
export const ephemeris = cachedEphemeris(createEphemeris({ flatten: true }));
export const rotate = (p: Vec3, angle: number): Vec3 => [p[0] * Math.cos(angle) + p[1] * Math.sin(angle), -p[0] * Math.sin(angle) + p[1] * Math.cos(angle), p[2]];

/** The Moon model a frame reads. Without it there is no Moon to draw, and no approximate one stands in. */
function loaded(model: LunarModel | null): LunarModel {
  if (!model) throw new Error('The Moon model has not loaded, so the Moon cannot be drawn.');
  return model;
}

// The caller passes the Moon model, or null before it loads, so drawing never decides when the
// rail loads. A planetary frame draws without it; a lunar frame, or a planetary Moon read, throws.
export function worldFor(state: SceneState, model: LunarModel | null) {
  const lunar = isLunarLevel(state.level), moonModel = lunar ? loaded(model) : null;
  const body = (id: MissionBody, et = state.et) => moonModel && (id === 'earth' || id === 'moon') ? moonModel.bodies(et)[id] : id === 'moon' ? loaded(model).bodies(et).moon : ephemeris.state(id, et);
  const earthLaunch = body('earth', state.launchEt).r, targetLaunch = body(state.level.target, state.launchEt).r;
  const rotation = lunar ? 0 : Math.atan2(targetLaunch[1] - earthLaunch[1], targetLaunch[0] - earthLaunch[0]);
  const basis = moonModel ? moonModel.basis(state.parking!.frameEt ?? state.parking!.epochEt, 0) : null;
  const direction = (p: Vec3): Vec3 => basis ? [dot(p, basis.up), dot(p, basis.right), -dot(p, basis.normal)] : rotate(p, rotation);
  const plane = (p: Vec3, et = state.et): Vec3 => direction(lunar ? sub(p, body('earth', et).r) : p);
  const current = state.aiming && moonModel ? parkingState(moonModel, state.parking!, state.et)
    : state.response ? sampleAt(state.response.result, state.aiming ? state.launchEt : state.et) : body('earth', state.launchEt);
  const relativeVelocity = lunar ? sub(current.v, body('earth').v) : current.v;
  const velocity = direction(relativeVelocity);
  const prograde = Math.atan2(velocity[1], velocity[0]);
  return { lunar, moonModel, body, rotation, direction, plane, current, velocity, prograde };
}
