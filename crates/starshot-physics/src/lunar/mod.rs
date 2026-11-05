//! The lunar flight, as `packages/physics/src/lunar/`: the constants `model.ts` exports
//! beyond the ones `LunarModel` reads, the errors, and the parking orbit with its departure
//! burn. The flight itself is PR12's. The ephemeris crate's lunar items are re-exported
//! here, as `index.ts` exports the whole model.

pub mod parking;

use core::fmt;

pub use parking::{ParkingOrbit, departure, parking_period, parking_phase, parking_state};
pub use starshot_ephemeris::lunar::{
    BASIS_PHASE_DEG, Basis, EARTH_GM, EarthMoon, LAUNCH_ET, LunarModel, MOON_GM, RailError, unit,
};

pub const DAY: f64 = starshot_ephemeris::time::SECONDS_PER_DAY;
/// Earth's radius [km] in the lunar study, not `BodyInfo`'s 6371.0084 (`model.ts:8`).
pub const EARTH_RADIUS: f64 = 6371.0;
pub const MOON_RADIUS: f64 = 1737.4;
/// The most delta-v [km/s] a departure burn may spend.
pub const FUEL_BUDGET: f64 = 3.55;
/// The Moon's Laplace sphere [km], 66182.9233882543: `384400 * (MOON_GM / EARTH_GM) ** 0.4`
/// as V8 rounds it (`model.ts:11`). `starshot_math::pow` is not a `const fn`, so the
/// value is pinned by its bits; `tests/lunar_parking.rs` checks them against both.
pub const MOON_SOI_KM: f64 = f64::from_bits(0x40f0286ec632c31c);

/// Why a lunar computation refused its input. Each keeps the TypeScript text, so a player
/// or a log reads the same words from either engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LunarError {
    /// A non-finite epoch, phase, radius or ET, or a radius at or inside Earth's
    /// (`parking.ts:19`, a `RangeError` there).
    InvalidParkingOrbit,
    /// The rail refused a date.
    Rail(RailError),
}

impl fmt::Display for LunarError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LunarError::InvalidParkingOrbit => write!(f, "Invalid parking orbit"),
            LunarError::Rail(e) => e.fmt(f),
        }
    }
}

impl std::error::Error for LunarError {}

impl From<RailError> for LunarError {
    fn from(e: RailError) -> LunarError {
        LunarError::Rail(e)
    }
}
