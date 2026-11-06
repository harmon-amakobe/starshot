//! Game rules in the Rust core (D16): the port of the game's shot model
//! (`apps/game/src/sim/shot.ts`) with its aim and launch-day grid, the Moon shot
//! (`apps/game/src/sim/lunar.ts`), the replay records with their physics version, the
//! campaign levels, the sandbox and the requests replays fly (`levels.ts`), the missions
//! (`missions.ts`), the star rules (`scoring.ts`) and the hints (`hint.ts`,
//! `lunar-hint.ts`).
//! Units are km, km/s and seconds of ET (TDB past J2000) in the heliocentric ecliptic
//! J2000 frame; UTC enters only as ISO dates, through `et_from_iso`. The crate reads no
//! clock and draws no random number, so the same inputs give the same bits on every
//! runtime.

#![forbid(unsafe_code)]

pub mod aim;
pub mod days;
pub mod hint;
pub mod levels;
pub mod lunar;
pub mod lunar_hint;
pub mod replay;
pub mod scoring;
pub mod settings;
pub mod shot;

pub use aim::{Aim, aim_from_v_inf, normalize_deg, round_aim, v_inf_from_aim};
pub use days::{add_days_iso, days_between_iso, launch_et_for_day};
pub use hint::{
    HINT_MAX_SIMULATIONS, Hint, HintError, HintQuery, HintSource, KnownShot, find_hint,
};
pub use levels::{
    CAMPAIGN, DEFAULT_PAR_TOLERANCE, GRAND_TOUR_HINT, GRAND_TOUR_PAR_SHOT, LaunchWindow, Level,
    LevelError, LevelId, LunarLevel, MISSION_ORDER, MOONSHOT, Mission, MissionId, Par,
    SANDBOX_TARGETS, framing_bodies, hint_query_for, lunar_replay_request, mission, mission_number,
    next_mission, replay_request, sandbox_level, sandbox_start_iso, shot_request_for,
    shot_template,
};
pub use lunar::{
    BurnAngleError, FlightRequest, LunarHintQuery, LunarResult, LunarShotRequest,
    MAX_BURN_ANGLE_DEG, lunar_hint, lunar_request, run_lunar,
};
pub use lunar_hint::{
    LUNAR_GRID, LUNAR_SEARCH_BUDGET, LunarHintError, LunarSearch, LunarStep, Route, by_cost,
    find_lunar_hint, refinement_of, seeds_of,
};
pub use replay::{LunarReplay, Replay, lunar_physics_version, physics_version};
pub use scoring::{
    HINT_STAR_CAP, PAR_TOLERANCE, Score, ScoringRules, ShotFacts, max_stars, par_limit_km_s,
    score_shot,
};
pub use settings::{OUTER_SIM_SETTINGS, SIM_SETTINGS, SimSettings};
pub use shot::{
    BULLSEYE_RADII, EPHEMERIS_VALID_UNTIL_ET, Flyby, ShotAnalysis, ShotError, ShotRequest,
    ShotTemplate, analyze_shot, periapsis_km, simulate_shot, stop_at_capture_zone,
};
