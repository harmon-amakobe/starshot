import type { SimulationResult, Knot } from '@starshot/physics';
import type { ShotRequest as LunarRequest, ParkingOrbit } from '@starshot/physics/lunar';
import type { HintQuery } from './hint';
import type { ShotRequest } from './shot';

/** Lunar burns are heliocentric ECLIPJ2000 states [km, km/s] at ET [TDB s]. */
export interface LunarShotRequest extends LunarRequest {
  readonly kind: 'lunar';
  readonly target: 'moon';
  readonly parking: ParkingOrbit;
  readonly stopAtEntry: true;
}
export type FlightRequest = ShotRequest | LunarShotRequest;
export const isLunar = (shot: FlightRequest): shot is LunarShotRequest => 'kind' in shot && shot.kind === 'lunar';
export type LunarResult = Omit<SimulationResult, 'terminatedBy'> & {
  readonly terminatedBy?: 'earth' | 'moon';
  /** Same accepted knots relative to Earth's centre, prepared off the UI thread. */
  readonly relativeSamples: readonly Knot[];
};
export type FlightResult<S extends FlightRequest> = S extends LunarShotRequest ? LunarResult : SimulationResult;
export type FlightHintQuery = HintQuery | { readonly kind: 'lunar' };
