//! The aiming hint's inputs, as the types of `apps/game/src/sim/hint.ts`. A level builds its
//! query with `hint_query_for`, so the search flies the level's own shot settings (D6).
//! The search itself, `find_hint`, joins with the hint part of PR14.

use crate::shot::ShotTemplate;
use starshot_ephemeris::Vec3;

/// A curated, test-verified shot for a level whose answer is not a direct transfer.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct KnownShot {
    /// Launch date (00:00 UTC), inside the level's window.
    pub launch_iso: &'static str,
    /// Departure excess velocity, ecliptic frame [km/s].
    pub v_inf: Vec3,
}

/// One hint search: the level's shot, its launch window and speed cap, and any curated
/// shot, which the search checks instead of searching.
#[derive(Debug, Clone, PartialEq)]
pub struct HintQuery<'a> {
    pub shot: ShotTemplate,
    pub window_start_iso: &'a str,
    pub window_days: u32,
    pub v_inf_max_km_s: f64,
    pub curated: Option<KnownShot>,
    /// Most game simulations the search may run; none means the default budget. A count,
    /// never a time, so every device gets the same hint.
    pub max_simulations: Option<u32>,
}
