//! The circular parking orbit and the departure burn from it, as
//! `packages/physics/src/lunar/parking.ts` and `flight.ts:52-58`. States are heliocentric
//! ecliptic J2000 [km, km/s], circular relative to Earth's moving centre.

use super::{EARTH_GM, EARTH_RADIUS, LunarError, LunarModel};
use core::f64::consts::PI;
use starshot_ephemeris::State;
use starshot_ephemeris::vec::{add, scale};
use starshot_math::{cos, pow, sin, sqrt};

/// A circular orbit in the Moon's plane, an initial condition and never a rotating basis.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ParkingOrbit {
    /// The ET whose lunar plane holds the orbit, or None for `epoch_et`'s. The game fixes
    /// it at `LAUNCH_ET` (D38), so a new date does not rotate the craft with the Moon.
    pub frame_et: Option<f64>,
    /// The coasting epoch: the ET at which the craft is at `phase_deg`.
    pub epoch_et: f64,
    pub phase_deg: f64,
    pub radius_km: f64,
}

/// The period [s] of a circular orbit of `radius_km` about Earth's centre.
pub fn parking_period(radius_km: f64) -> f64 {
    2.0 * PI * sqrt(pow(radius_km, 3.0) / EARTH_GM)
}

/// The phase [degrees, 0 to 360] the orbit reaches at `et`. Rust's `%` truncates as
/// JavaScript's does, so the double wrap gives the same bits before the epoch too.
pub fn parking_phase(orbit: &ParkingOrbit, et: f64) -> f64 {
    let turns = (et - orbit.epoch_et) / parking_period(orbit.radius_km);
    ((orbit.phase_deg + turns * 360.0) % 360.0 + 360.0) % 360.0
}

/// The craft on its parking orbit at `et`: Earth's centre plus the radius along `up`, and
/// Earth's velocity plus the circular speed along `right`. `frame_et` is not checked, as
/// `parking.ts` does not check it; the rail refuses one outside its dates.
pub fn parking_state(
    model: &LunarModel,
    orbit: &ParkingOrbit,
    et: f64,
) -> Result<State, LunarError> {
    let checked = [orbit.epoch_et, orbit.phase_deg, orbit.radius_km, et];
    if !checked.iter().all(|x| x.is_finite()) || orbit.radius_km <= EARTH_RADIUS {
        return Err(LunarError::InvalidParkingOrbit);
    }
    let frame = orbit.frame_et.unwrap_or(orbit.epoch_et);
    let basis = model.basis(frame, parking_phase(orbit, et))?;
    let earth = model.bodies(et)?.earth;
    let circular = sqrt(EARTH_GM / orbit.radius_km);
    Ok(State {
        r: add(earth.r, scale(basis.up, orbit.radius_km)),
        v: add(earth.v, scale(basis.right, circular)),
    })
}

/// The craft at `launch_et` just after its burn of `delta_v_km_s`, `burn_angle_deg` from
/// prograde towards `up`: the first sample of a lunar flight. The burn is not checked
/// here; `simulate_lunar` (PR12) refuses one outside the fuel budget first
/// (`flight.ts:47-50`).
pub fn departure(
    model: &LunarModel,
    parking: &ParkingOrbit,
    launch_et: f64,
    delta_v_km_s: f64,
    burn_angle_deg: f64,
) -> Result<State, LunarError> {
    // flight.ts:53 turns the mean motion times the elapsed time into degrees, unwrapped,
    // where parking_phase counts periods, so the burn's frame can differ from the parking
    // state's in the last bits. Both the formula and its place before parking_state stay,
    // so the rail is read in the TypeScript's order.
    let motion = sqrt(EARTH_GM / pow(parking.radius_km, 3.0));
    let phase = parking.phase_deg + (launch_et - parking.epoch_et) * motion * 180.0 / PI;
    let basis = model.basis(parking.frame_et.unwrap_or(parking.epoch_et), phase)?;
    let initial = parking_state(model, parking, launch_et)?;
    let beta = burn_angle_deg * PI / 180.0;
    let burn = add(
        scale(basis.right, delta_v_km_s * cos(beta)),
        scale(basis.up, delta_v_km_s * sin(beta)),
    );
    Ok(State {
        r: initial.r,
        v: add(initial.v, burn),
    })
}
