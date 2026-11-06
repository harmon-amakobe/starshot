//! The launch-day grid, as the end of `apps/game/src/sim/shot.ts`: launches happen at
//! 00:00 UTC on whole days of a level's window. Dates are counted in integers
//! (`days_from_civil`), so no rounding enters, and a date reaches physics only through
//! `et_from_iso`.

use starshot_ephemeris::time::{TimeError, days_from_civil, et_from_iso};

/// The day number from 1970-01-01 of an ISO text's first 10 characters, which `shot.ts`
/// slices off. A date `et_from_iso` refuses errs the same way here.
fn day_number(iso: &str) -> Result<i64, TimeError> {
    let date = iso.get(..10).ok_or(TimeError::Format)?;
    et_from_iso(date)?;
    let field = |from: usize, to: usize| date[from..to].parse().map_err(|_| TimeError::Format);
    Ok(days_from_civil(field(0, 4)?, field(5, 7)?, field(8, 10)?))
}

/// The proleptic Gregorian date of a day number from 1970-01-01: the inverse of
/// `days_from_civil` (H. Hinnant's civil_from_days).
fn civil_from_days(z: i64) -> (i64, i64, i64) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    (yoe + era * 400 + i64::from(month <= 2), month, day)
}

/// An ISO date plus `days` whole days, as an ISO date (UTC), like `addDaysIso`. Errs
/// outside years 0 to 9999, where JavaScript would print a six-digit year.
pub fn add_days_iso(iso: &str, days: i64) -> Result<String, TimeError> {
    let day = day_number(iso)?.checked_add(days);
    let years = days_from_civil(0, 1, 1)..=days_from_civil(9999, 12, 31);
    let Some(day) = day.filter(|d| years.contains(d)) else {
        return Err(TimeError::Range);
    };
    let (year, month, day) = civil_from_days(day);
    Ok(format!("{year:04}-{month:02}-{day:02}"))
}

/// Whole days from one ISO date to another (UTC), like `daysBetweenIso`.
pub fn days_between_iso(from_iso: &str, to_iso: &str) -> Result<i64, TimeError> {
    Ok(day_number(to_iso)? - day_number(from_iso)?)
}

/// The launch ET of day `day` of a window that opens on `start_iso`: 00:00 UTC that day,
/// like `launchEtForDay`.
pub fn launch_et_for_day(start_iso: &str, day: u32) -> Result<f64, TimeError> {
    et_from_iso(&add_days_iso(start_iso, i64::from(day))?)
}
