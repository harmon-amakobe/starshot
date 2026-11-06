//! Game rules in the Rust core (D16): the port of the game's shot model
//! (`apps/game/src/sim/shot.ts`) and its frozen settings. Units are km, km/s and seconds of
//! ET (TDB past J2000) in the heliocentric ecliptic J2000 frame. The crate reads no clock
//! and draws no random number, so the same inputs give the same bits on every runtime.

#![forbid(unsafe_code)]

pub mod settings;
pub mod shot;

pub use settings::{OUTER_SIM_SETTINGS, SIM_SETTINGS, SimSettings};
pub use shot::{
    BULLSEYE_RADII, EPHEMERIS_VALID_UNTIL_ET, Flyby, ShotAnalysis, ShotError, ShotRequest,
    analyze_shot, periapsis_km, simulate_shot, stop_at_capture_zone,
};
