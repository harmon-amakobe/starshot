/**
 * The bounded Moon route search. A fixed integer grid of launch days, burns and angles is
 * flown through the production lunar request and runner. Candidates come in a fixed order
 * and the budget counts simulations, so wall time never selects a route. The grid is
 * finite: its cheapest hit claims no global optimum and does not replace the par.
 */
import { DAY, EARTH_RADIUS, LAUNCH_ET } from '@starshot/physics/lunar';
import type { LunarHintQuery } from './flight-request';
import type { Hint } from './hint';
import { lunarHint, runLunar } from './lunar';
import { lunarRequest } from './lunar-request';

/** A candidate in integers: day index, burn [milli-km/s] and signed angle [centidegrees]. */
export interface Route { readonly day: number; readonly burn: number; readonly angle: number }
/** Most simulations a search may run. Whole-search dedupe leaves the grid at most 236. */
export const LUNAR_SEARCH_BUDGET = 240;
/** Names this grid and its flight order; a change to either needs a new id. */
export const LUNAR_GRID = 'moon-grid/1';
const REFERENCE: Route = { day: 0, burn: 3240, angle: 0 };
const LAST_DAY = 27;
const BURNS = [3150, 3240];
const ANGLES = [-2000, 0, 2000];
const DECREASES = [50, 40, 30, 20, 10, 0];
const OFFSETS = [-500, 0, 500];
const SEEDS = 4;

/** Cost order: burn, then day, then absolute angle, then signed angle. */
export const byCost = (a: Route, b: Route): number =>
  a.burn - b.burn || a.day - b.day || Math.abs(a.angle) - Math.abs(b.angle) || a.angle - b.angle;

/** The cheapest hit of each day, cheapest first, for at most four days. */
export function seedsOf<R extends Route>(hits: readonly R[]): R[] {
  const seeds: R[] = [];
  for (const hit of [...hits].sort(byCost)) {
    if (seeds.length < SEEDS && !seeds.some((seed) => seed.day === hit.day)) seeds.push(hit);
  }
  return seeds;
}

/** A seed's refinement, in flight order: lower burns, and angles either side of its own. */
export function refinementOf({ day, burn, angle }: Route): Route[] {
  return DECREASES.flatMap((decrease) =>
    OFFSETS.map((offset) => ({ day, burn: burn - decrease, angle: angle + offset })),
  );
}

type Found = Route & { readonly hint: Omit<Hint, 'simulations'> };

/**
 * Omitted strategy means the measured reference, exactly as `lunarHint` flies it. The budget
 * is validated for both strategies but bounds only the search. `afterFlight` runs, awaited,
 * after each simulation, so a worker can yield there.
 */
export async function findLunarHint(
  query: LunarHintQuery,
  afterFlight: () => unknown = () => {},
): Promise<Hint | null> {
  // Only an absent field takes the default: a null from a message is malformed.
  const strategy = query.strategy === undefined ? 'reference' : query.strategy;
  const budget = query.budget === undefined ? LUNAR_SEARCH_BUDGET : query.budget;
  if (strategy !== 'reference' && strategy !== 'search') {
    throw new RangeError('Moon guide strategy must be reference or search');
  }
  if (!Number.isInteger(budget) || budget < 0 || budget > LUNAR_SEARCH_BUDGET) {
    throw new RangeError('Moon guide budget must be an integer from 0 to 240');
  }
  if (strategy === 'reference') {
    const hint = lunarHint();
    await afterFlight();
    return hint;
  }
  let simulations = 0;
  const seen = new Set<string>();
  const hits: Found[] = [];
  /** False once the budget refuses a new tuple; a tuple already flown is never flown again. */
  const evaluate = async (route: Route): Promise<boolean> => {
    const key = `${route.day}|${route.burn}|${route.angle}`;
    if (seen.has(key)) return true;
    if (simulations >= budget) return false;
    seen.add(key);
    simulations++;
    // Integers become ET, km/s and degrees once, so no step accumulates rounding.
    const launchEt = LAUNCH_ET + route.day * DAY;
    const aim = { angleDeg: route.angle / 100, speedKmS: route.burn / 1000 };
    // D38: the plane stays the one at LAUNCH_ET; only the date and its epoch move.
    const radiusKm = EARTH_RADIUS + 200;
    const parking = { frameEt: LAUNCH_ET, epochEt: launchEt, phaseDeg: 225, radiusKm };
    const { analysis } = runLunar(lunarRequest(launchEt, aim, parking));
    if (analysis.hit) {
      const { closestKm } = analysis;
      const hint = { day: route.day, launchEt, aim, parking, hits: true, closestKm };
      hits.push({ ...route, hint: { ...hint, source: 'lunar-grid' } });
    }
    await afterFlight();
    return true;
  };
  const best = (): Hint | null => {
    const found = [...hits].sort(byCost)[0];
    return found ? { ...found.hint, simulations } : null;
  };
  if (!(await evaluate(REFERENCE))) return best();
  for (let day = 0; day <= LAST_DAY; day++) {
    for (const burn of BURNS) {
      for (const angle of ANGLES) {
        if (!(await evaluate({ day, burn, angle }))) return best();
      }
    }
  }
  // The seeds are fixed here, so refinement hits never add seeds.
  for (const seed of seedsOf(hits)) {
    for (const route of refinementOf(seed)) {
      if (!(await evaluate(route))) return best();
    }
  }
  return best();
}
