import type { Vec3 } from '@starshot/ephemeris';

/** Satellite rails are parent-relative in all three ECLIPJ2000 coordinates. */
export function satellitePosition(parent: Vec3, relative: Vec3): Vec3 {
  return [parent[0] + relative[0], parent[1] + relative[1], parent[2] + relative[2]];
}
