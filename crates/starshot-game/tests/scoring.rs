//! The star rules, as the `scoreShot` cases of `apps/game/src/scoring.test.ts`, plus the
//! Moonshot's score from the lunar golden cases (09-rust-supplement.md, PR13 and PR14).

use starshot_ephemeris::BodyId;
use starshot_game::{
    DEFAULT_PAR_TOLERANCE, HINT_STAR_CAP, PAR_TOLERANCE, ScoringRules, ShotFacts, max_stars,
    par_limit_km_s, score_shot,
};

const BASE: ShotFacts = ShotFacts {
    hit: true,
    delta_v_km_s: 3.7,
    bullseye: false,
    required_flyby_done: false,
    hint_used: false,
};

const MARS: ScoringRules = ScoringRules {
    par_delta_v_km_s: Some(3.66),
    par_tolerance: None,
    required_flyby: None,
};

fn stars(rules: &ScoringRules, facts: ShotFacts) -> u8 {
    score_shot(rules, &facts).stars
}

#[test]
fn a_miss_scores_zero_whatever_else_happened() {
    let facts = ShotFacts {
        hit: false,
        delta_v_km_s: 3.0,
        bullseye: true,
        ..BASE
    };
    let s = score_shot(&MARS, &facts);
    assert_eq!((s.stars, s.efficient, s.bullseye), (0, false, false));
    // A stray flyby without a hit is no star either.
    let tour = ScoringRules {
        required_flyby: Some(BodyId::Jupiter),
        ..MARS
    };
    let flown = ShotFacts {
        required_flyby_done: true,
        ..facts
    };
    assert_eq!(score_shot(&tour, &flown).uncapped_stars, 0);
    assert!(!score_shot(&tour, &flown).flyby);
    // Nor does a flyby count on a level that requires none.
    let stray = ShotFacts {
        required_flyby_done: true,
        ..BASE
    };
    assert!(!score_shot(&MARS, &stray).flyby);
}

#[test]
fn one_star_for_a_hit_and_a_second_within_110_percent_of_par() {
    let at = |delta_v_km_s| {
        stars(
            &MARS,
            ShotFacts {
                delta_v_km_s,
                ..BASE
            },
        )
    };
    assert_eq!(at(4.5), 1);
    assert_eq!(at(3.66 * 1.1), 2);
    assert_eq!(at(3.66 * 1.1 + 0.001), 1);
    // The 1e-9 km/s slack is absolute and its edge counts, as scoring.ts has it.
    assert_eq!(at(3.66 * 1.1 + 1e-9), 2);
    assert_eq!(at(3.66 * 1.1 + 2e-9), 1);
    // A NaN delta-v or tolerance earns no efficiency star.
    assert_eq!(at(f64::NAN), 1);
    let nan = ScoringRules {
        par_tolerance: Some(f64::NAN),
        ..MARS
    };
    assert!(!score_shot(&nan, &BASE).efficient);
    assert_eq!(par_limit_km_s(&MARS), Some(3.66 * 1.1));
}

#[test]
fn the_scoring_default_is_the_levels_default() {
    // `scoring.ts` and `levels.ts` each declare 1.1; the core keeps one value for both.
    assert_eq!((PAR_TOLERANCE, DEFAULT_PAR_TOLERANCE), (1.1, 1.1));
}

#[test]
fn a_tighter_per_level_tolerance_is_honoured() {
    let tour = ScoringRules {
        par_delta_v_km_s: Some(6.56),
        par_tolerance: Some(1.05),
        required_flyby: Some(BodyId::Jupiter),
    };
    let efficient = |rules: &ScoringRules, delta_v_km_s| {
        score_shot(
            rules,
            &ShotFacts {
                delta_v_km_s,
                ..BASE
            },
        )
        .efficient
    };
    assert!(efficient(&tour, 6.56 * 1.05));
    assert!(!efficient(&tour, 6.56 * 1.05 + 0.001));
    // The default 110% would still have given the star.
    let default = ScoringRules {
        par_tolerance: None,
        ..tour
    };
    assert!(efficient(&default, 6.56 * 1.05 + 0.001));
}

#[test]
fn a_bullseye_earns_the_third_star() {
    let s = score_shot(
        &MARS,
        &ShotFacts {
            bullseye: true,
            ..BASE
        },
    );
    assert_eq!((s.stars, s.skill, s.flyby), (3, true, false));
}

#[test]
fn the_required_flyby_earns_the_third_star_on_flyby_levels_only() {
    let tour = ScoringRules {
        par_delta_v_km_s: Some(6.7),
        par_tolerance: None,
        required_flyby: Some(BodyId::Jupiter),
    };
    let flown = |required_flyby_done| ShotFacts {
        delta_v_km_s: 6.8,
        required_flyby_done,
        ..BASE
    };
    let s = score_shot(&tour, &flown(true));
    assert_eq!((s.stars, s.flyby, s.skill), (3, true, true));
    assert_eq!(stars(&tour, flown(false)), 2);
    // A stray flyby on a level that does not ask for one is not a skill star.
    let stray = ShotFacts {
        required_flyby_done: true,
        ..BASE
    };
    assert_eq!(stars(&MARS, stray), 2);
}

#[test]
fn a_hinted_shot_keeps_two_stars_and_says_so() {
    assert_eq!(HINT_STAR_CAP, 2);
    let hinted = ShotFacts {
        bullseye: true,
        hint_used: true,
        ..BASE
    };
    let s = score_shot(&MARS, &hinted);
    assert_eq!((s.stars, s.uncapped_stars, s.hint_capped), (2, 3, true));
    let costly = ShotFacts {
        delta_v_km_s: 9.0,
        hint_used: true,
        ..BASE
    };
    let s = score_shot(&MARS, &costly);
    assert_eq!((s.stars, s.hint_capped), (1, false));
}

#[test]
fn no_par_means_no_efficiency_star() {
    let sandbox = ScoringRules::default();
    let facts = ShotFacts {
        delta_v_km_s: 0.1,
        bullseye: true,
        ..BASE
    };
    let s = score_shot(&sandbox, &facts);
    assert_eq!((s.stars, s.efficient), (2, false));
    assert_eq!(par_limit_km_s(&sandbox), None);
    assert_eq!((max_stars(&sandbox), max_stars(&MARS)), (2, 3));
}

#[test]
fn the_moonshot_reference_burn_earns_three_stars() {
    // `campaign/use-result.ts` scores the Moonshot with its par burn, 3.24 km/s
    // (`missions.ts`), at the levels' default tolerance. The reference burn hits and is a
    // bullseye (`campaign/lunar.test.ts`; tests/lunar.rs flies it), and its delta-v is the
    // raw burn.
    let moonshot = ScoringRules {
        par_delta_v_km_s: Some(3.24),
        par_tolerance: Some(DEFAULT_PAR_TOLERANCE),
        required_flyby: None,
    };
    let reference = ShotFacts {
        delta_v_km_s: 3.24,
        bullseye: true,
        ..BASE
    };
    let s = score_shot(&moonshot, &reference);
    assert_eq!((s.stars, s.efficient, s.skill), (3, true, true));
}
