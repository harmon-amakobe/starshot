//! The Moon shot, as `apps/game/src/sim/lunar-request.ts`, `flight-request.ts` and
//! `lunar.ts`: the request the game builds from constants alone, and the flight it flies
//! and scores. A Moon shot leaves from the game's parking orbit and stops at the first
//! entry into the Moon's real sphere of influence, which is the hit.
//! The Moon guide's query and its measured reference (`lunarHint`) live here too; the
//! bounded search is `lunar_hint.rs`.

use crate::aim::Aim;
use crate::hint::Hint;
use crate::lunar_hint::{LunarHintError, reference_hint};
use crate::settings::lunar::SETTINGS;
use crate::shot::{BULLSEYE_RADII, ShotAnalysis, ShotRequest, periapsis_km};
use core::fmt;
use starshot_ephemeris::BodyId;
use starshot_ephemeris::vec::{norm, sub};
use starshot_physics::lunar::{
    DAY, LunarError, LunarImpact, LunarModel, LunarRequest, MOON_GM, MOON_RADIUS, MOON_SOI_KM,
    ParkingOrbit, request_for, simulate_lunar,
};
use starshot_physics::{Knot, Termination};

/// The widest burn the game accepts, either side of prograde [degrees].
pub const MAX_BURN_ANGLE_DEG: f64 = 35.0;

/// A Moon shot: a lunar flight request that always carries its parking orbit and always
/// stops at the first entry into the approach zone, as the TypeScript type's `parking`
/// and `stopAtEntry: true` require. Every other field is the request's own, so a request
/// read back from its bits flies unchanged.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LunarShotRequest(LunarRequest);

impl LunarShotRequest {
    /// Sets the two fields a Moon shot always fills and keeps the rest of `request`.
    pub fn new(mut request: LunarRequest, parking: ParkingOrbit) -> Self {
        request.parking = Some(parking);
        request.stop_at_entry = true;
        LunarShotRequest(request)
    }

    pub fn request(&self) -> &LunarRequest {
        &self.0
    }
}

/// Either kind of shot the worker flies.
#[derive(Debug, Clone, PartialEq)]
pub enum FlightRequest {
    Planetary(ShotRequest),
    Lunar(LunarShotRequest),
}

/// A burn more than 35 degrees from prograde, which `lunar_request` refuses (a
/// `RangeError` in TypeScript).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BurnAngleError(pub f64);

impl fmt::Display for BurnAngleError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Burn angle must be within 35 degrees of prograde")
    }
}

impl std::error::Error for BurnAngleError {}

/// The game's Moon shot for `aim` at `launch_et` from `parking`, built from constants
/// alone so the main thread never loads the rail. The aim's angle is from prograde
/// towards `up`, and its speed the burn [km/s], which `request_for` clamps to the fuel
/// budget. The settings are the frozen lunar ones (D6).
///
/// `abs` keeps the TypeScript's two comparisons: a NaN angle passes here, as there, and
/// the flight refuses it.
pub fn lunar_request(
    launch_et: f64,
    aim: Aim,
    parking: ParkingOrbit,
) -> Result<LunarShotRequest, BurnAngleError> {
    if aim.angle_deg.abs() > MAX_BURN_ANGLE_DEG {
        return Err(BurnAngleError(aim.angle_deg));
    }
    let request = LunarRequest {
        launch_et,
        parking_radius_km: parking.radius_km,
        parking_phase_deg: parking.phase_deg,
        approach_radius_km: MOON_SOI_KM,
        settings: SETTINGS,
        ..request_for(aim.speed_km_s, aim.angle_deg)
    };
    Ok(LunarShotRequest::new(request, parking))
}

/// A flown Moon shot, as `LunarResult`. A planetary result's encounters and closest
/// approaches are always empty here (`lunar.ts`), so they are left out.
#[derive(Debug, Clone, PartialEq)]
pub struct LunarResult {
    pub samples: Vec<Knot>,
    /// The same samples relative to Earth's centre, for the parking scene.
    pub relative_samples: Vec<Knot>,
    pub steps: u32,
    pub end_time: f64,
    pub termination: Termination,
    /// Earth or the Moon.
    pub terminated_by: Option<BodyId>,
}

/// Flies a Moon shot and scores it as `runLunar`: a hit is an entry into the Moon's
/// sphere; for a hit, the closest distance is the two-body periapsis about the Moon at
/// the stop, and a periapsis under ten Moon radii is the bullseye. `delta_v_km_s` is the
/// burn itself, with no conversion from an excess speed.
pub fn run_lunar(
    model: &LunarModel,
    shot: &LunarShotRequest,
) -> Result<(LunarResult, ShotAnalysis), LunarError> {
    let request = shot.request();
    let flight = simulate_lunar(model, request)?;
    let last = flight.samples[flight.samples.len() - 1];
    let moon = model.bodies(last.t)?.moon;
    let (r, v) = (sub(last.r, moon.r), sub(last.v, moon.v));
    let hit = flight.entry_et.is_some();
    let periapsis = hit.then(|| periapsis_km(r, v, MOON_GM));
    let termination = match (flight.impact, hit) {
        (Some(_), _) => Termination::Impact,
        (None, true) => Termination::SoiReached,
        (None, false) => Termination::Duration,
    };
    let terminated_by = match flight.impact {
        Some(LunarImpact::Earth) => Some(BodyId::Earth),
        Some(LunarImpact::Moon) => Some(BodyId::Moon),
        None => hit.then_some(BodyId::Moon),
    };
    let relative = |k: &Knot| -> Result<Knot, LunarError> {
        let earth = model.bodies(k.t)?.earth;
        let (r, v) = (sub(k.r, earth.r), sub(k.v, earth.v));
        Ok(Knot { t: k.t, r, v })
    };
    let relative_samples = flight
        .samples
        .iter()
        .map(relative)
        .collect::<Result<_, _>>()?;
    let analysis = ShotAnalysis {
        hit,
        termination,
        terminated_by,
        launch_et: request.launch_et,
        end_et: last.t,
        flight_days: (last.t - request.launch_et) / DAY,
        target_soi_km: MOON_SOI_KM,
        capture_zone_km: MOON_SOI_KM,
        capture_zone_scale: 1.0,
        target_radius_km: MOON_RADIUS,
        closest_km: periapsis.unwrap_or(flight.closest_km),
        closest_et: if hit { last.t } else { flight.closest_et },
        periapsis_km: periapsis,
        arrival_speed_km_s: hit.then(|| norm(v)),
        bullseye: periapsis.is_some_and(|p| p < BULLSEYE_RADII * MOON_RADIUS),
        flybys: Vec::new(),
        required_flyby_done: false,
        v_inf_km_s: 0.0,
        delta_v_km_s: request.delta_v_km_s,
        c3: 0.0,
        beyond_ephemeris_range: false,
    };
    let result = LunarResult {
        samples: flight.samples,
        relative_samples,
        steps: flight.steps,
        end_time: last.t,
        termination,
        terminated_by,
    };
    Ok((result, analysis))
}

/// A Moon guide request, as `LunarHintQuery`: no strategy means the measured reference,
/// and no budget 240 simulations. The fields hold a message's values as sent, so
/// `LunarSearch::new` refuses a malformed one before any flight instead of a type
/// dropping it.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct LunarHintQuery<'a> {
    /// `reference` or `search`.
    pub strategy: Option<&'a str>,
    /// An integer from 0 to 240.
    pub budget: Option<f64>,
}

/// The study's measured reference, re-flown at the same control precision on every
/// request, as `lunarHint`: day 0 at `LAUNCH_ET`, 3.24 km/s prograde from phase 225
/// degrees, a curated guide after one flight.
pub fn lunar_hint(model: &LunarModel) -> Result<Hint, LunarHintError> {
    reference_hint(|shot| run_lunar(model, shot).map(|(_, a)| a))
}
