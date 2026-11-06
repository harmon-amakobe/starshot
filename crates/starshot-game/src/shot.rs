//! One shot, one simulated probe flight, as `apps/game/src/sim/shot.ts`. The aiming
//! preview, the launch, the hint search and the level tests all fly a `ShotRequest`
//! through `simulate_shot`, so what the player sees is what they get (D6).
//!
//! The port keeps the TypeScript operation order. Lengths go through `norm`, which is not
//! V8's three-argument `Math.hypot` (deviation row 79), and the ephemeris through `sin`
//! and `cos`, so distances and times match the TypeScript within bounds, not to the bit.

use crate::settings::SimSettings;
use core::fmt;
use starshot_ephemeris::time::SECONDS_PER_DAY as DAY;
use starshot_ephemeris::vec::{cross, dot, norm, sub};
use starshot_ephemeris::{BodyId, Ephemeris, Vec3};
use starshot_math::sqrt;
use starshot_physics::simulate::BODY_COUNT;
use starshot_physics::{
    Encounter, Knot, LEO_RADIUS_KM, SimulationConfig, SimulationResult, Termination, c3,
    delta_v_from_leo, departure_state, hermite, simulate,
};

/// A closest approach under this many target radii earns the bullseye star.
pub const BULLSEYE_RADII: f64 = 10.0;

/// The last date of JPL's Table 1 (valid 1800 to 2050).
pub const EPHEMERIS_VALID_UNTIL_ISO: &str = "2050-01-01";
/// `et_from_iso(EPHEMERIS_VALID_UNTIL_ISO)`, which is not a `const fn`; `tests/shot.rs`
/// checks the bits. A flight that ends later is flagged, not refused.
pub const EPHEMERIS_VALID_UNTIL_ET: f64 = 1577880069.184;

/// One shot's inputs. `target` and every attractor are planets: Table 1 has no Moon.
#[derive(Debug, Clone, PartialEq)]
pub struct ShotRequest {
    pub target: BodyId,
    /// Planets whose gravity acts; `simulate_shot` adds the target when it is missing.
    pub attractors: Vec<BodyId>,
    /// Launch time, ET (TDB seconds past J2000).
    pub launch_et: f64,
    /// Hyperbolic excess velocity leaving Earth, ecliptic frame [km/s].
    pub v_inf: Vec3,
    pub max_flight_days: f64,
    pub required_flyby: Option<BodyId>,
    /// The level's integrator settings, the same for its preview and its launch (D6).
    pub sim: SimSettings,
    /// Capture-zone radius as a multiple of the target's real sphere of influence: 1
    /// everywhere but the training level, where TypeScript's optional field defaults to 1.
    /// Never below 1: the integrator stops at the real sphere, so a smaller zone would
    /// score a hit the probe never reached.
    pub capture_zone_scale: f64,
}

/// A level's shot without its launch time and aim, as `ShotTemplate`: the preview, the
/// launch, the hint search and the level tests all build their requests from one (D6).
#[derive(Debug, Clone, PartialEq)]
pub struct ShotTemplate {
    pub target: BodyId,
    pub attractors: Vec<BodyId>,
    pub max_flight_days: f64,
    pub required_flyby: Option<BodyId>,
    pub sim: SimSettings,
    pub capture_zone_scale: f64,
}

impl ShotTemplate {
    /// The request for one launch time [s ET] and excess velocity [km/s].
    pub fn request(&self, launch_et: f64, v_inf: Vec3) -> ShotRequest {
        ShotRequest {
            target: self.target,
            attractors: self.attractors.clone(),
            launch_et,
            v_inf,
            max_flight_days: self.max_flight_days,
            required_flyby: self.required_flyby,
            sim: self.sim,
            capture_zone_scale: self.capture_zone_scale,
        }
    }
}

/// Why `simulate_shot` refused a request before flying it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ShotError {
    /// A capture-zone scale below 1, or NaN (a `RangeError` in `shot.ts`).
    CaptureZoneScale(f64),
}

impl fmt::Display for ShotError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let ShotError::CaptureZoneScale(scale) = self;
        write!(
            f,
            "captureZoneScale must be at least 1 (got {scale}): the flight stops at the \
             target's real sphere of influence, so a smaller capture zone cannot be scored"
        )
    }
}

impl std::error::Error for ShotError {}

/// The capture-zone radius [km] the shot is scored against.
pub fn capture_zone_km(eph: &dyn Ephemeris, shot: &ShotRequest) -> f64 {
    eph.soi_km(shot.target, shot.launch_et) * shot.capture_zone_scale
}

/// Flies the shot exactly as the game does: a patched-conic departure from Earth, stopped
/// at the target's sphere of influence, then cut at a larger training zone.
pub fn simulate_shot(
    eph: &dyn Ephemeris,
    shot: &ShotRequest,
) -> Result<SimulationResult, ShotError> {
    let scale = shot.capture_zone_scale;
    if scale.is_nan() || scale < 1.0 {
        return Err(ShotError::CaptureZoneScale(scale));
    }
    let mut attractors = shot.attractors.clone();
    if !attractors.contains(&shot.target) {
        attractors.push(shot.target);
    }
    let start = departure_state(eph, shot.launch_et, shot.v_inf);
    let duration = shot.max_flight_days * DAY;
    let mut cfg = SimulationConfig::new(eph, shot.launch_et, start.r, start.v, duration);
    cfg.attractors = Some(&attractors);
    cfg.stop_at_soi_of = Some(shot.target);
    cfg.depart_from = Some(BodyId::Earth);
    cfg.rtol = shot.sim.rtol;
    cfg.atol_km = shot.sim.atol_km;
    cfg.max_step = shot.sim.max_step;
    cfg.max_steps = shot.sim.max_steps;
    let result = simulate(&cfg);
    Ok(if scale > 1.0 {
        let radius = capture_zone_km(eph, shot);
        stop_at_capture_zone(eph, result, shot.target, radius)
    } else {
        result
    })
}

/// Cuts a flight where it first crosses a training zone of `radius_km` about `target`,
/// which is larger than the sphere of influence the integrator stops at: bisection on the
/// Hermite interpolant the integrator uses for its own stop. The probe crosses the zone
/// before the real sphere, so everything up to the cut is the untouched simulation. A
/// flight that never crosses it comes back unchanged.
pub fn stop_at_capture_zone(
    eph: &dyn Ephemeris,
    result: SimulationResult,
    target: BodyId,
    radius_km: f64,
) -> SimulationResult {
    let s = &result.samples;
    let distance = |t: f64, r: Vec3| norm(sub(r, eph.state(target, t).r));
    let mut t_inside = s[1..]
        .iter()
        .find(|k| distance(k.t, k.r) < radius_km)
        .map_or(f64::INFINITY, |k| k.t);
    // A dip inside between two samples shows up as a refined closest approach.
    for e in &result.encounters {
        if e.body == target && e.distance_km < radius_km && e.t < t_inside {
            t_inside = e.t;
        }
    }
    if !t_inside.is_finite() {
        return result;
    }
    let mut i = 1;
    while i < s.len() - 1 && s[i].t < t_inside {
        i += 1;
    }
    let (a, b) = (s[i - 1], s[i]);
    let (mut lo, mut hi) = (a.t, t_inside);
    let mut k = 0;
    while k < 60 && hi - lo > 1e-3 {
        let mid = (lo + hi) / 2.0;
        if distance(mid, hermite(&a, &b, mid).r) < radius_km {
            hi = mid;
        } else {
            lo = mid;
        }
        k += 1;
    }
    let end = hermite(&a, &b, hi);
    let tgt = eph.state(target, hi);
    let d = norm(sub(end.r, tgt.r));
    let entry = Encounter {
        body: target,
        t: hi,
        distance_km: d,
        relative_speed_km_s: norm(sub(end.v, tgt.v)),
        inside_soi: d < eph.soi_km(target, s[0].t),
        impact: d < target.info().radius_km,
    };
    let mut encounters = result.encounters.clone();
    encounters.retain(|e| e.t <= hi);
    encounters.push(entry);
    let mut closest: [Option<Encounter>; BODY_COUNT] = [None; BODY_COUNT];
    for e in &encounters {
        let best = &mut closest[e.body as usize];
        if best.is_none_or(|b| e.distance_km < b.distance_km) {
            *best = Some(*e);
        }
    }
    let mut samples = s[..i].to_vec();
    samples.push(Knot {
        t: hi,
        r: end.r,
        v: end.v,
    });
    SimulationResult {
        samples,
        encounters,
        closest,
        termination: Termination::SoiReached,
        terminated_by: Some(target),
        end_time: hi,
        steps: result.steps,
    }
}

/// A pass inside another planet's sphere of influence.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Flyby {
    pub body: BodyId,
    /// Time of closest approach, ET.
    pub t: f64,
    pub distance_km: f64,
    pub relative_speed_km_s: f64,
}

/// A simulated shot, summarised for the HUD, scoring and tests.
#[derive(Debug, Clone, PartialEq)]
pub struct ShotAnalysis {
    /// Reached the target's sphere of influence, or hit its surface.
    pub hit: bool,
    pub termination: Termination,
    pub terminated_by: Option<BodyId>,
    pub launch_et: f64,
    /// When the flight ends (capture, impact, loss or time-out), ET.
    pub end_et: f64,
    pub flight_days: f64,
    /// The target's real sphere-of-influence radius [km].
    pub target_soi_km: f64,
    /// The radius the shot is scored against [km]: the sphere times `capture_zone_scale`.
    pub capture_zone_km: f64,
    pub capture_zone_scale: f64,
    pub target_radius_km: f64,
    /// Closest approach to the target's centre [km] and when; for a hit, the predicted
    /// periapsis.
    pub closest_km: f64,
    pub closest_et: f64,
    /// Patched-conic periapsis of the arrival hyperbola [km], for hits; 0 for an impact.
    pub periapsis_km: Option<f64>,
    /// Speed relative to the target on arrival [km/s], for hits.
    pub arrival_speed_km_s: Option<f64>,
    pub bullseye: bool,
    /// Passes inside another planet's sphere of influence before the flight ends.
    pub flybys: Vec<Flyby>,
    pub required_flyby_done: bool,
    pub v_inf_km_s: f64,
    pub delta_v_km_s: f64,
    pub c3: f64,
    /// The flight runs past Table 1's validity (2050), where positions are extrapolated.
    pub beyond_ephemeris_range: bool,
}

/// `Math.max(0, x)`: a NaN stays NaN, where `f64::max` would drop it.
fn js_max0(x: f64) -> f64 {
    if x.is_nan() { x } else { x.max(0.0) }
}

/// Periapsis [km] of the two-body orbit with relative state (`r`, `v`) about a body of
/// GM `mu`.
pub fn periapsis_km(r: Vec3, v: Vec3, mu: f64) -> f64 {
    let h = norm(cross(r, v));
    let energy = dot(v, v) / 2.0 - mu / norm(r);
    let e = sqrt(js_max0(1.0 + (2.0 * energy * h * h) / (mu * mu)));
    (h * h) / mu / (1.0 + e)
}

/// Summarises a flight of `shot` for the HUD, scoring and tests.
pub fn analyze_shot(
    eph: &dyn Ephemeris,
    shot: &ShotRequest,
    result: &SimulationResult,
) -> ShotAnalysis {
    let target = shot.target;
    let info = target.info();
    let last = result.samples[result.samples.len() - 1];
    let end_et = last.t;
    let target_soi_km = eph.soi_km(target, shot.launch_et);
    let ended_at_target = matches!(
        result.termination,
        Termination::SoiReached | Termination::Impact
    );
    let hit = ended_at_target && result.terminated_by == Some(target);
    let at_end = eph.state(target, end_et);

    let (closest_km, closest_et, periapsis, arrival_speed) = if hit {
        let (r_rel, v_rel) = (sub(last.r, at_end.r), sub(last.v, at_end.v));
        let p = if result.termination == Termination::Impact {
            0.0
        } else {
            periapsis_km(r_rel, v_rel, info.gm)
        };
        (p, end_et, Some(p), Some(norm(v_rel)))
    } else {
        let c = result.closest[target as usize];
        let (km, et) = c.map_or((f64::INFINITY, end_et), |c| (c.distance_km, c.t));
        // The minimum may sit at the very end of the flight, still closing in.
        let d_end = norm(sub(last.r, at_end.r));
        let (km, et) = if d_end < km {
            (d_end, end_et)
        } else {
            (km, et)
        };
        (km, et, None, None)
    };

    // `!(e.t > end_et)` is shot.ts's test: it keeps a NaN time, where `<=` would drop it.
    #[allow(clippy::neg_cmp_op_on_partial_ord)]
    let flybys: Vec<Flyby> = result
        .encounters
        .iter()
        .filter(|e| e.inside_soi && e.body != target && e.body != BodyId::Sun && !(e.t > end_et))
        .map(|e| Flyby {
            body: e.body,
            t: e.t,
            distance_km: e.distance_km,
            relative_speed_km_s: e.relative_speed_km_s,
        })
        .collect();
    let required_flyby_done = shot
        .required_flyby
        .is_some_and(|b| flybys.iter().any(|f| f.body == b));
    let v_inf_km_s = norm(shot.v_inf);
    ShotAnalysis {
        hit,
        termination: result.termination,
        terminated_by: result.terminated_by,
        launch_et: shot.launch_et,
        end_et,
        flight_days: (end_et - shot.launch_et) / DAY,
        target_soi_km,
        capture_zone_km: target_soi_km * shot.capture_zone_scale,
        capture_zone_scale: shot.capture_zone_scale,
        target_radius_km: info.radius_km,
        closest_km,
        closest_et,
        periapsis_km: periapsis,
        arrival_speed_km_s: arrival_speed,
        bullseye: hit && closest_km < BULLSEYE_RADII * info.radius_km,
        flybys,
        required_flyby_done,
        v_inf_km_s,
        delta_v_km_s: delta_v_from_leo(v_inf_km_s, LEO_RADIUS_KM),
        c3: c3(v_inf_km_s),
        beyond_ephemeris_range: end_et > EPHEMERIS_VALID_UNTIL_ET,
    }
}
