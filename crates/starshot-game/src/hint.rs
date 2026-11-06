//! The aiming hint, as `apps/game/src/sim/hint.ts`: the cheapest direct (Lambert) transfer
//! over the level's launch window, nudged with the game's own simulator until it really
//! reaches the capture zone, since the two-body Lambert aim ignores the other planets. A
//! level whose answer is a gravity assist ships a curated, test-verified shot instead. A
//! level builds its query with `hint_query_for`, so the search flies the level's own shot
//! settings (D6).
//!
//! The search is bounded by a count of simulations, never by time, so a level gives the
//! same hint on every device. Each aim is put on the controls' grid (0.01 degree, 0.001
//! km/s) before it is flown, so "Use hint" applies exactly the aim the label shows and the
//! simulator checked.

use crate::aim::{Aim, aim_from_v_inf, round_aim, v_inf_from_aim};
use crate::days::{days_between_iso, launch_et_for_day};
use crate::shot::{ShotAnalysis, ShotError, ShotTemplate, analyze_shot, simulate_shot};
use core::fmt;
use starshot_ephemeris::time::{SECONDS_PER_DAY as DAY, TimeError};
use starshot_ephemeris::{BodyId, Ephemeris, Vec3};
use starshot_physics::best_direct_transfer;
use starshot_physics::lunar::ParkingOrbit;
use std::collections::BTreeMap;

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

/// Where a hint came from, as the TypeScript union `Hint["source"]`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HintSource {
    Lambert,
    Curated,
    LunarGrid,
}

impl HintSource {
    /// The TypeScript name.
    pub fn as_str(self) -> &'static str {
        match self {
            HintSource::Lambert => "lambert",
            HintSource::Curated => "curated",
            HintSource::LunarGrid => "lunar-grid",
        }
    }
}

/// A hint for a level or the Moon.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Hint {
    /// The Moon's parking orbit; none for a planetary hint.
    pub parking: Option<ParkingOrbit>,
    /// Day index in the launch window.
    pub day: u32,
    pub launch_et: f64,
    /// On the controls' grid (0.01 degree, 0.001 km/s): exactly what "Use hint" applies.
    pub aim: Aim,
    /// The game simulation of exactly this aim reaches the capture zone (and makes any
    /// required flyby).
    pub hits: bool,
    /// Closest approach of exactly this aim to the target's centre [km].
    pub closest_km: f64,
    pub source: HintSource,
    pub simulations: u32,
}

/// Default simulation budget for the nudging search; Lambert grid solves are not counted.
pub const HINT_MAX_SIMULATIONS: u32 = 240;

/// The speed factors the nudge tries, each across every angle offset, in this order.
const SPEED_FACTORS: [f64; 6] = [1.0, 1.01, 0.99, 1.02, 0.98, 1.04];

/// Why `find_hint` could not search: a window or curated date it cannot place (a curated
/// launch before the window opens included, since a day index is never negative), or a
/// shot `simulate_shot` refuses.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum HintError {
    Date(TimeError),
    Shot(ShotError),
}

impl fmt::Display for HintError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            HintError::Date(e) => write!(f, "a hint date must be a day of the window: {e}"),
            HintError::Shot(e) => e.fmt(f),
        }
    }
}

impl std::error::Error for HintError {}

impl From<TimeError> for HintError {
    fn from(e: TimeError) -> HintError {
        HintError::Date(e)
    }
}

impl From<ShotError> for HintError {
    fn from(e: ShotError) -> HintError {
        HintError::Shot(e)
    }
}

/// `range` of `hint.ts`: `from + k * step` for k = 0, 1, ... while it stays within `to`
/// plus 1e-9. Each value is computed from k, never accumulated.
fn range(from: f64, to: f64, step: f64) -> Vec<f64> {
    let mut out = Vec::new();
    let mut k = 0.0;
    while from + k * step <= to + 1e-9 {
        out.push(from + k * step);
        k += 1.0;
    }
    out
}

/// The flights of one search, each counted once.
struct Search<'s, 'q> {
    eph: &'s dyn Ephemeris,
    q: &'s HintQuery<'q>,
    simulations: u32,
    /// Keyed by day and the aim's bits. Every aim is on the grid, which never gives -0, so
    /// equal bits are the same aims as the TypeScript's string keys. A `BTreeMap`, since a
    /// `HashMap` seeds its hasher from the system's randomness.
    seen: BTreeMap<(u32, u64, u64), ShotAnalysis>,
}

impl Search<'_, '_> {
    fn launch_et_of(&self, day: u32) -> Result<f64, TimeError> {
        launch_et_for_day(self.q.window_start_iso, day)
    }

    /// The aim on the controls' grid, under the speed cap.
    fn on_grid(&self, aim: Aim) -> Aim {
        let r = round_aim(aim);
        if r.speed_km_s > self.q.v_inf_max_km_s {
            let speed_km_s = (self.q.v_inf_max_km_s * 1000.0).floor() / 1000.0;
            round_aim(Aim { speed_km_s, ..r })
        } else {
            r
        }
    }

    fn success(&self, a: &ShotAnalysis) -> bool {
        a.hit && (self.q.shot.required_flyby.is_none() || a.required_flyby_done)
    }

    /// Flies an aim once; an aim already flown on that day comes back uncounted.
    fn try_shot(&mut self, day: u32, aim: Aim) -> Result<ShotAnalysis, HintError> {
        let key = (day, aim.angle_deg.to_bits(), aim.speed_km_s.to_bits());
        if let Some(known) = self.seen.get(&key) {
            return Ok(known.clone());
        }
        self.simulations += 1;
        let shot = self
            .q
            .shot
            .request(self.launch_et_of(day)?, v_inf_from_aim(aim));
        let a = analyze_shot(self.eph, &shot, &simulate_shot(self.eph, &shot)?);
        self.seen.insert(key, a.clone());
        Ok(a)
    }

    fn hint_of(
        &self,
        day: u32,
        aim: Aim,
        a: &ShotAnalysis,
        source: HintSource,
    ) -> Result<Hint, HintError> {
        Ok(Hint {
            parking: None,
            day,
            launch_et: self.launch_et_of(day)?,
            aim,
            hits: self.success(a),
            closest_km: a.closest_km,
            source,
            simulations: self.simulations,
        })
    }
}

/// The level's hint, as `findHint`: its curated shot, checked by one flight at any budget;
/// else the cheapest Lambert transfer's day and aim, nudged in the angle and then the
/// speed until a flight hits, then moved to the middle of its hitting band while the
/// budget allows. With no hit, the closest miss; with no flight allowed, the rounded
/// Lambert aim itself, flown once. None when no Lambert transfer exists. The centre of a
/// band is flown even when the budget has just run out, so a search may run one flight
/// over it, as in TypeScript.
pub fn find_hint(eph: &dyn Ephemeris, q: &HintQuery) -> Result<Option<Hint>, HintError> {
    let max_simulations = q.max_simulations.unwrap_or(HINT_MAX_SIMULATIONS);
    let mut s = Search {
        eph,
        q,
        simulations: 0,
        seen: BTreeMap::new(),
    };
    if let Some(curated) = q.curated {
        let day = days_between_iso(q.window_start_iso, curated.launch_iso)?;
        let day = u32::try_from(day).map_err(|_| TimeError::Range)?;
        let aim = s.on_grid(aim_from_v_inf(curated.v_inf));
        let a = s.try_shot(day, aim)?;
        return s.hint_of(day, aim, &a, HintSource::Curated).map(Some);
    }
    let Some((day, base)) = lambert_aim(eph, q)? else {
        return Ok(None);
    };

    let offsets = range(0.05, 3.0, 0.05).into_iter().flat_map(|x| [x, -x]);
    let angle_offsets: Vec<f64> = [0.0].into_iter().chain(offsets).collect();
    let mut closest: Option<(Aim, ShotAnalysis)> = None;
    // TypeScript breaks only the inner loop once the budget is spent, and each later outer
    // pass breaks again before flying; leaving both loops at once is the same search.
    'nudge: for f in SPEED_FACTORS {
        for &da in &angle_offsets {
            if s.simulations >= max_simulations {
                break 'nudge;
            }
            let nudged = Aim {
                angle_deg: base.angle_deg + da,
                speed_km_s: base.speed_km_s * f,
            };
            let aim = s.on_grid(nudged);
            let a = s.try_shot(day, aim)?;
            if s.success(&a) {
                // Prefer the middle of the hitting band, if the budget allows finding it.
                let band = centre_of_band(aim, |x| {
                    if s.simulations >= max_simulations {
                        return Ok(false);
                    }
                    let x = s.on_grid(x);
                    let b = s.try_shot(day, x)?;
                    Ok(s.success(&b))
                })?;
                let centre = s.on_grid(band);
                let c = s.try_shot(day, centre)?;
                let lambert = HintSource::Lambert;
                return if s.success(&c) {
                    s.hint_of(day, centre, &c, lambert).map(Some)
                } else {
                    s.hint_of(day, aim, &a, lambert).map(Some)
                };
            }
            // A NaN never replaces the closest, as with TypeScript's `<`.
            if closest
                .as_ref()
                .is_none_or(|(_, b)| a.closest_km < b.closest_km)
            {
                closest = Some((aim, a));
            }
        }
    }
    let (aim, a) = match closest {
        Some(found) => found,
        None => {
            let aim = s.on_grid(base);
            (aim, s.try_shot(day, aim)?)
        }
    };
    s.hint_of(day, aim, &a, HintSource::Lambert).map(Some)
}

/// The cheapest Lambert transfer's window day and aim: a coarse grid of about 50 launch
/// days by 160 flight times at most, then a fine grid around its best node.
fn lambert_aim(eph: &dyn Ephemeris, q: &HintQuery) -> Result<Option<(u32, Aim)>, HintError> {
    // Grid days are whole numbers from 0 to the window's last, so `as u32` is exact.
    let launch_ets = |days: &[f64]| -> Result<Vec<f64>, TimeError> {
        let et = |&d: &f64| launch_et_for_day(q.window_start_iso, d as u32);
        days.iter().map(et).collect()
    };
    let in_seconds = |days: Vec<f64>| -> Vec<f64> { days.into_iter().map(|d| d * DAY).collect() };
    let (target, window) = (q.shot.target, f64::from(q.window_days));
    let max_flight_days = q.shot.max_flight_days;
    let day_step = (window / 50.0).ceil().max(2.0);
    let tof_step = (max_flight_days / 160.0).ceil().max(5.0);
    let coarse_days = launch_ets(&range(0.0, window, day_step))?;
    let tofs = in_seconds(range(40.0, max_flight_days * 0.95, tof_step));
    let earth = BodyId::Earth;
    let Some(coarse) = best_direct_transfer(eph, earth, target, &coarse_days, &tofs) else {
        return Ok(None);
    };
    let start = launch_et_for_day(q.window_start_iso, 0)?;
    // Launch ETs sit whole days apart, give or take a leap second, and after the start, so
    // `round` is `Math.round` here.
    let coarse_day = ((coarse.launch_et - start) / DAY).round();
    let fine_days = range(
        (coarse_day - day_step).max(0.0),
        window.min(coarse_day + day_step),
        1.0,
    );
    let tof_days = coarse.tof / DAY;
    let fine_tofs = range(
        (tof_days - 2.0 * tof_step).max(20.0),
        max_flight_days.min(tof_days + 2.0 * tof_step),
        (tof_step / 5.0).max(1.0),
    );
    let (fine_days, fine_tofs) = (launch_ets(&fine_days)?, in_seconds(fine_tofs));
    let fine = best_direct_transfer(eph, earth, target, &fine_days, &fine_tofs);
    let best = fine.unwrap_or(coarse);
    let day = ((best.launch_et - start) / DAY).round() as u32;
    Ok(Some((day, aim_from_v_inf(best.v_inf))))
}

/// Middle of the run of hitting angles around a hitting aim: 0.1 degree steps, up to 3
/// degrees each way, summed as TypeScript sums them.
fn centre_of_band(
    aim: Aim,
    mut hits: impl FnMut(Aim) -> Result<bool, HintError>,
) -> Result<Aim, HintError> {
    let step = 0.1;
    let (mut lo, mut hi) = (0.0, 0.0);
    while hi < 3.0
        && hits(Aim {
            angle_deg: aim.angle_deg + hi + step,
            ..aim
        })?
    {
        hi += step;
    }
    while lo < 3.0
        && hits(Aim {
            angle_deg: aim.angle_deg - lo - step,
            ..aim
        })?
    {
        lo += step;
    }
    Ok(Aim {
        angle_deg: aim.angle_deg + (hi - lo) / 2.0,
        ..aim
    })
}
