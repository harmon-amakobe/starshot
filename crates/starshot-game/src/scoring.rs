//! Star rules, as `apps/game/src/scoring.ts`:
//!
//! - 1 star for a hit: the probe reaches the target's capture zone (or its surface);
//! - 1 more for efficiency: delta-v from low Earth orbit up to par times the level's par
//!   tolerance (110% by default, tighter on the Grand Tour);
//! - 1 more for skill: a bullseye (closest approach under 10 target radii) or, on a level
//!   that asks for one, the required flyby on the way.
//!
//! A shot flown with the hint keeps at most 2 stars. A miss scores 0.

use crate::levels::DEFAULT_PAR_TOLERANCE;
use crate::shot::ShotAnalysis;
use starshot_ephemeris::BodyId;

/// The default efficiency tolerance: delta-v up to 110% of par earns the star. The
/// TypeScript writes 1.1 twice, here (`scoring.ts`) and as `levels.ts`'s
/// `DEFAULT_PAR_TOLERANCE`; the core takes the levels' value, so the two cannot drift.
pub const PAR_TOLERANCE: f64 = DEFAULT_PAR_TOLERANCE;
/// The most stars a shot flown with the hint can keep.
pub const HINT_STAR_CAP: u8 = 2;

/// What a level scores against.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct ScoringRules {
    /// Par delta-v from low Earth orbit [km/s]; without one there is no efficiency star
    /// (the sandbox).
    pub par_delta_v_km_s: Option<f64>,
    /// The efficiency star's limit is par times this; none means `PAR_TOLERANCE`.
    pub par_tolerance: Option<f64>,
    pub required_flyby: Option<BodyId>,
}

/// The highest delta-v [km/s] that still earns the efficiency star, if the level has a
/// par.
pub fn par_limit_km_s(rules: &ScoringRules) -> Option<f64> {
    let tolerance = rules.par_tolerance.unwrap_or(PAR_TOLERANCE);
    rules.par_delta_v_km_s.map(|par| par * tolerance)
}

/// What a flown shot did, as the score reads it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ShotFacts {
    pub hit: bool,
    pub delta_v_km_s: f64,
    pub bullseye: bool,
    pub required_flyby_done: bool,
    pub hint_used: bool,
}

impl ShotFacts {
    /// The facts of an analysed shot, as the game takes them from its result.
    pub fn from_analysis(a: &ShotAnalysis, hint_used: bool) -> Self {
        ShotFacts {
            hit: a.hit,
            delta_v_km_s: a.delta_v_km_s,
            bullseye: a.bullseye,
            required_flyby_done: a.required_flyby_done,
            hint_used,
        }
    }
}

/// A shot's stars and the reasons for each.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Score {
    /// 0 to 3, after the hint cap.
    pub stars: u8,
    pub hit: bool,
    pub efficient: bool,
    pub bullseye: bool,
    pub flyby: bool,
    /// The third star's condition was met: a bullseye or the required flyby.
    pub skill: bool,
    /// The hint took away a star the shot would otherwise have earned.
    pub hint_capped: bool,
    /// The stars earned before the hint cap.
    pub uncapped_stars: u8,
}

/// Scores one shot. Nothing counts without a hit. The 1e-9 km/s slack keeps a shot flown
/// exactly at the limit from losing the star to rounding.
pub fn score_shot(rules: &ScoringRules, facts: &ShotFacts) -> Score {
    let hit = facts.hit;
    let limit = par_limit_km_s(rules);
    let efficient = hit && limit.is_some_and(|l| facts.delta_v_km_s <= l + 1e-9);
    let bullseye = hit && facts.bullseye;
    let flyby = hit && rules.required_flyby.is_some() && facts.required_flyby_done;
    let skill = bullseye || flyby;
    let uncapped = u8::from(hit) + u8::from(efficient) + u8::from(skill);
    let stars = if facts.hint_used {
        uncapped.min(HINT_STAR_CAP)
    } else {
        uncapped
    };
    Score {
        stars,
        hit,
        efficient,
        bullseye,
        flyby,
        skill,
        hint_capped: stars < uncapped,
        uncapped_stars: uncapped,
    }
}

/// The most stars a level can award: 2 without a par (the sandbox), else 3.
pub fn max_stars(rules: &ScoringRules) -> u8 {
    if rules.par_delta_v_km_s.is_none() {
        2
    } else {
        3
    }
}
