//! Game rules in the Rust core (D16): the port of the game's shot model
//! (`apps/game/src/sim/shot.ts`) with its aim and launch-day grid, and the replay records
//! with their physics version. Units are km, km/s and seconds of ET (TDB past J2000) in
//! the heliocentric ecliptic J2000 frame; UTC enters only as ISO dates, through
//! `et_from_iso`. The crate reads no clock and draws no random number, so the same inputs
//! give the same bits on every runtime.

#![forbid(unsafe_code)]

pub mod aim;
pub mod days;
pub mod replay;
pub mod settings;
pub mod shot;

pub use aim::{Aim, aim_from_v_inf, normalize_deg, round_aim, v_inf_from_aim};
pub use days::{add_days_iso, days_between_iso, launch_et_for_day};
pub use replay::{LunarReplay, Replay, lunar_physics_version, physics_version};
pub use settings::{OUTER_SIM_SETTINGS, SIM_SETTINGS, SimSettings};
pub use shot::{
    BULLSEYE_RADII, EPHEMERIS_VALID_UNTIL_ET, Flyby, ShotAnalysis, ShotError, ShotRequest,
    analyze_shot, periapsis_km, simulate_shot, stop_at_capture_zone,
};
