/**
 * Star rules (pure, unit-tested in scoring.test.ts):
 *   1 star  - hit: the probe reaches the target's sphere of influence (or its surface);
 *   +1 star - efficient: delta-v from low Earth orbit within 110% of the level's par;
 *   +1 star - bullseye (closest approach under 10 target radii) OR, on a level with a
 *             required flyby, flying through that planet's sphere of influence on the way;
 *   using the hint caps the result at 2 stars. A miss scores 0.
 */
import type { PlanetId } from "@starshot/ephemeris";

export const PAR_TOLERANCE = 1.1;
export const HINT_STAR_CAP = 2;

export interface ScoringRules {
  /** Par delta-v from LEO [km/s]; no par means no efficiency star (sandbox). */
  readonly parDeltaVKmS?: number;
  readonly requiredFlyby?: PlanetId;
}

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
  const efficient =
    hit && rules.parDeltaVKmS !== undefined && facts.deltaVKmS <= rules.parDeltaVKmS * PAR_TOLERANCE + 1e-9;
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

/** Maximum stars a level can award (the sandbox has no par). */
export const maxStars = (rules: ScoringRules): Stars => (rules.parDeltaVKmS === undefined ? 2 : 3);
