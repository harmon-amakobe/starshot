/**
 * Star rules (pure, unit-tested in scoring.test.ts):
 *   1 star  - hit: the probe reaches the target's sphere of influence (or its surface);
 *   +1 star - efficient: delta-v from low Earth orbit within the level's par tolerance
 *             (110% of par by default, tighter on the Grand Tour);
 *   +1 star - bullseye (closest approach under 10 target radii) OR, on a level with a
 *             required flyby, flying through that planet's sphere of influence on the way;
 *   using the hint caps the result at 2 stars. A miss scores 0.
 */
import type { PlanetId } from "@starshot/ephemeris";

/** Default efficiency tolerance: delta-v up to 110% of par earns the star. */
export const PAR_TOLERANCE = 1.1;
export const HINT_STAR_CAP = 2;

export interface ScoringRules {
  /** Par delta-v from LEO [km/s]; no par means no efficiency star (sandbox). */
  readonly parDeltaVKmS?: number;
  /** Efficiency star up to par x parTolerance; default PAR_TOLERANCE. */
  readonly parTolerance?: number;
  readonly requiredFlyby?: PlanetId;
}

/** Highest delta-v [km/s] that still earns the efficiency star, if the level has a par. */
export const parLimitKmS = (rules: ScoringRules): number | undefined =>
  rules.parDeltaVKmS === undefined ? undefined : rules.parDeltaVKmS * (rules.parTolerance ?? PAR_TOLERANCE);

export interface ShotFacts {
  readonly hit: boolean;
  readonly deltaVKmS: number;
  readonly bullseye: boolean;
  readonly requiredFlybyDone: boolean;
  readonly hintUsed: boolean;
}

export type Stars = 0 | 1 | 2 | 3;

export interface Score {
  readonly stars: Stars;
  readonly hit: boolean;
  readonly efficient: boolean;
  readonly bullseye: boolean;
  readonly flyby: boolean;
  /** The third-star condition was met (bullseye or required flyby). */
  readonly skill: boolean;
  /** The hint removed a star the shot would otherwise have earned. */
  readonly hintCapped: boolean;
  /** Earned stars before the hint cap. */
  readonly uncappedStars: Stars;
}

export function scoreShot(rules: ScoringRules, facts: ShotFacts): Score {
  const hit = facts.hit;
  const limit = parLimitKmS(rules);
  const efficient = hit && limit !== undefined && facts.deltaVKmS <= limit + 1e-9;
  const bullseye = hit && facts.bullseye;
  const flyby = hit && rules.requiredFlyby !== undefined && facts.requiredFlybyDone;
  const skill = bullseye || flyby;
  const uncapped = (hit ? 1 : 0) + (efficient ? 1 : 0) + (skill ? 1 : 0);
  const stars = facts.hintUsed ? Math.min(uncapped, HINT_STAR_CAP) : uncapped;
  return {
    stars: stars as Stars,
    hit,
    efficient,
    bullseye,
    flyby,
    skill,
    hintCapped: stars < uncapped,
    uncappedStars: uncapped as Stars,
  };
}
