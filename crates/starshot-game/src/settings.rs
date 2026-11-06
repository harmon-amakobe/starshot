//! The frozen integrator settings of `apps/game/src/sim/shot.ts`. A level's aiming preview,
//! its launch, its hint search and its tests all fly one of these (D6), so they are
//! constants and nothing builds one at run time. `tests/shot.rs` ties each value to the
//! settings the TypeScript game puts in its requests.

use starshot_ephemeris::time::SECONDS_PER_DAY as DAY;

/// Integrator settings for one level, carried in every `ShotRequest`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SimSettings {
    pub rtol: f64,
    /// Position tolerance [km]; velocities get a millionth of it [km/s].
    pub atol_km: f64,
    /// Largest step [s].
    pub max_step: f64,
    pub max_steps: u32,
}

/// The campaign and the inner-planet sandbox; the TypeScript records the preview times
/// they measured.
pub const SIM_SETTINGS: SimSettings = SimSettings {
    rtol: 1e-10,
    atol_km: 1.0,
    max_step: 2.0 * DAY,
    max_steps: 20000,
};

/// Sandbox targets beyond Mars: 5 to 14 year flights to capture zones 48 to 87 million km
/// in radius, under Earth and the giants only (`apps/game/README.md` has the numbers).
pub const OUTER_SIM_SETTINGS: SimSettings = SimSettings {
    rtol: 1e-9,
    atol_km: 300.0,
    max_step: 10.0 * DAY,
    max_steps: 20000,
};

/// The Moonshot's settings. Their value stays in the physics crate, as in TypeScript
/// (`flight.ts`); the re-export gives every frozen setting one module (D6).
pub mod lunar {
    pub use starshot_physics::lunar::flight::SETTINGS;
}
