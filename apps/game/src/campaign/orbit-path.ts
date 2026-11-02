import { hermite, type Knot } from '@starshot/physics';
import type { FlightResponse } from '../sim/protocol';
import { orbitPath, PLANET_IDS, type PlanetId, type Vec3 } from '@starshot/ephemeris';
import type { SceneState } from './scene-types';
const cache = new WeakMap<FlightResponse, readonly Knot[]>();
const orbitCache = new Map<string, Map<PlanetId, readonly Vec3[]>>();
export function planetOrbitPaths(state: SceneState) {
  const key = `${state.level.id}:${state.level.target}:${state.map}:${Math.floor(state.et / 86400)}`;
  let paths = orbitCache.get(key);
  if (!paths) {
    paths = new Map();
    const ids = state.parking ? [] : state.map ? PLANET_IDS : [...new Set(['earth', state.level.target, ...(state.level.requiredFlyby ? [state.level.requiredFlyby] : [])])];
    for (const id of ids) paths.set(id as PlanetId, orbitPath(id as PlanetId, state.et, 160, { flatten: true }));
    if (orbitCache.size > 24) orbitCache.clear(); orbitCache.set(key, paths);
  }
  return paths;
}
/** Preserve all three coordinates. The Moon's plane is not the ecliptic. */
export function routePath(response: FlightResponse): readonly Knot[] {
  let path = cache.get(response); if (path) return path;
  const samples = 'relativeSamples' in response.result ? response.result.relativeSamples : response.result.samples;
  const points: Knot[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i]!, b = samples[i + 1]!;
    for (let j = 0; j < 4; j++) { const t = a.t + (b.t - a.t) * j / 4; points.push({ t, ...hermite(a, b, t) }); }
  }
  points.push(samples.at(-1)!); cache.set(response, points); return points;
}
