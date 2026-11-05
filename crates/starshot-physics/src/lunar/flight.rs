//! The lunar flight, as `packages/physics/src/lunar/flight.ts`: the departure burn from
//! the parking orbit, flown under the Sun, Earth's centre and the Moon until the window
//! ends, the craft hits Earth or the Moon, or, when asked, it enters the approach zone.
//!
//! The port keeps the TypeScript operation order and every loop count, so a flight takes
//! the same steps through the same branches. The bits differ where the arithmetic goes
//! through `sin`, `cos`, `pow` and `norm` (deviation row 79); `tests/lunar_flight.rs`
//! holds the flights in `fixtures/conformance/lunar.json` to the TypeScript's.

use super::{
    DAY, EARTH_GM, EARTH_RADIUS, EarthMoon, FUEL_BUDGET, LAUNCH_ET, LunarError, LunarModel,
    MOON_GM, MOON_RADIUS, ParkingOrbit, departure,
};
use crate::dopri5::{Dopri5, State6, StepTolerance};
use crate::hermite::{Knot, hermite};
use crate::simulate::{js_max, js_min};
use core::f64::consts::PI;
use starshot_ephemeris::BodyId;
use starshot_ephemeris::vec::{Vec3, norm, scale, sub};
use starshot_math::{cos, pow, sin, sqrt};

/// A lunar flight's frozen integrator settings, which its preview and launch share (D6).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LunarSettings {
    pub rtol: f64,
    /// Absolute tolerance for positions [km].
    pub atol_pos: f64,
    /// Absolute tolerance for velocities [km/s].
    pub atol_vel: f64,
    /// Largest step [s].
    pub max_step: f64,
    /// Most accepted steps; ten times as many attempts is the most the solver may take.
    pub max_steps: u32,
    /// A step spans at most this fraction of the distance to Earth or the Moon, travelled
    /// at the speed relative to it.
    pub near_body_fraction: f64,
}

/// The study's settings (`flight.ts:8-9`), which the game's Moonshot flies.
pub const SETTINGS: LunarSettings = LunarSettings {
    rtol: 1e-10,
    atol_pos: 0.01,
    atol_vel: 1e-8,
    max_step: 1800.0,
    max_steps: 20000,
    near_body_fraction: 0.03,
};

/// The window a request asks for: a local Earth orbit, or the seven-day trip.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LunarScope {
    Local,
    Lunar,
}

/// One lunar flight's inputs, as `flight.ts`'s `ShotRequest`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LunarRequest {
    /// ET of the burn.
    pub launch_et: f64,
    pub parking_radius_km: f64,
    pub parking_phase_deg: f64,
    pub delta_v_km_s: f64,
    /// From prograde towards `up` [degrees].
    pub burn_angle_deg: f64,
    pub duration_seconds: f64,
    /// The zone about the Moon whose first entry the flight records [km].
    pub approach_radius_km: f64,
    pub scope: LunarScope,
    pub settings: LunarSettings,
    /// The game's orbit, so the flight leaves from the exact state its parking scene
    /// shows. None: an orbit at the launch, with the request's radius and phase.
    pub parking: Option<ParkingOrbit>,
    /// End the flight at the first entry into the approach zone.
    pub stop_at_entry: bool,
}

/// The body a flight hit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LunarImpact {
    Earth,
    Moon,
}

/// A flown lunar flight.
#[derive(Debug, Clone, PartialEq)]
pub struct LunarFlight {
    pub request: LunarRequest,
    /// Accepted steps; after an impact or a stop at entry the last one is cut short there.
    pub samples: Vec<Knot>,
    /// ET of the first entry into the approach zone.
    pub entry_et: Option<f64>,
    pub impact: Option<LunarImpact>,
    /// The closest distance to the Moon's centre [km], and its ET.
    pub closest_km: f64,
    pub closest_et: f64,
    /// The entry ET if there was one, else the ET the flight ended.
    pub end_et: f64,
    pub steps: u32,
}

/// The game's request for a burn of `delta_v_km_s`, clamped to 0 to `FUEL_BUDGET` without
/// an error, at `burn_angle_deg` from a 200 km orbit at phase 225 degrees on `LAUNCH_ET`.
pub fn request_for(delta_v_km_s: f64, burn_angle_deg: f64) -> LunarRequest {
    let dv = js_max(0.0, js_min(FUEL_BUDGET, delta_v_km_s));
    let radius = EARTH_RADIUS + 200.0;
    let circular = sqrt(EARTH_GM / radius);
    let tangential = circular + dv * cos(burn_angle_deg * PI / 180.0);
    let radial = dv * sin(burn_angle_deg * PI / 180.0);
    let energy = (tangential * tangential + radial * radial) / 2.0 - EARTH_GM / radius;
    let axis = -EARTH_GM / (2.0 * energy);
    let lever = radius * tangential;
    let eccentricity = sqrt(js_max(
        0.0,
        1.0 + 2.0 * energy * (lever * lever) / (EARTH_GM * EARTH_GM),
    ));
    // Weak pulls need a readable local orbit preview, not seven days of repeated laps.
    // This only selects the declared window; the flight still integrates every force.
    let local = energy < 0.0 && axis * (1.0 + eccentricity) < 100000.0;
    let duration_seconds = if local {
        js_min(DAY, 4.0 * PI * sqrt(pow(axis, 3.0) / EARTH_GM))
    } else {
        7.0 * DAY
    };
    LunarRequest {
        launch_et: LAUNCH_ET,
        parking_radius_km: EARTH_RADIUS + 200.0,
        parking_phase_deg: 225.0,
        delta_v_km_s: dv,
        burn_angle_deg,
        duration_seconds,
        approach_radius_km: 65000.0,
        scope: if local {
            LunarScope::Local
        } else {
            LunarScope::Lunar
        },
        settings: SETTINGS,
        parking: None,
        stop_at_entry: false,
    }
}

/// The craft at `et`: cubic Hermite between the samples around it, the first or last
/// sample outside them.
pub fn sample_flight(samples: &[Knot], et: f64) -> Knot {
    let (mut lo, mut hi) = (0, samples.len() - 1);
    if et <= samples[0].t {
        return samples[0];
    }
    if et >= samples[hi].t {
        return samples[hi];
    }
    while hi - lo > 1 {
        let mid = (hi + lo) >> 1;
        if samples[mid].t <= et {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    knot_at(&samples[lo], &samples[hi], et)
}

fn knot_at(a: &Knot, b: &Knot, t: f64) -> Knot {
    let p = hermite(a, b, t);
    Knot { t, r: p.r, v: p.v }
}

/// The Sun's pull, and Earth's and the Moon's each less its pull on the Sun: the indirect
/// part keeps the force heliocentric. The barycentre is never added as another mass.
fn derivative(bodies: &EarthMoon, state: &State6, out: &mut State6) {
    let position = [state[0], state[1], state[2]];
    let sun = BodyId::Sun.info().gm;
    let mut acceleration = scale(position, -sun / pow(norm(position), 3.0));
    for (body, gm) in [(bodies.earth, EARTH_GM), (bodies.moon, MOON_GM)] {
        let d = sub(body.r, position);
        let (distance, solar) = (pow(norm(d), 3.0), pow(norm(body.r), 3.0));
        for i in 0..3 {
            acceleration[i] += gm * (d[i] / distance - body.r[i] / solar);
        }
    }
    let [ax, ay, az] = acceleration;
    *out = [state[3], state[4], state[5], ax, ay, az];
}

/// The distance [km] from `body`'s centre at `et` to `r`.
fn distance_at(model: &LunarModel, r: Vec3, et: f64, body: LunarImpact) -> Result<f64, LunarError> {
    let bodies = model.bodies(et)?;
    let centre = match body {
        LunarImpact::Earth => bodies.earth.r,
        LunarImpact::Moon => bodies.moon.r,
    };
    Ok(norm(sub(r, centre)))
}

/// The first ET inside `radius` of `body` between `a`, outside, and `b`, inside: at most
/// 50 halvings, until the bracket is 1 ms wide; the inside end.
fn crossing(
    model: &LunarModel,
    (a, b): (&Knot, &Knot),
    body: LunarImpact,
    radius: f64,
) -> Result<f64, LunarError> {
    let (mut lo, mut hi) = (a.t, b.t);
    let mut i = 0;
    while i < 50 && hi - lo > 0.001 {
        let mid = (lo + hi) / 2.0;
        if distance_at(model, hermite(a, b, mid).r, mid, body)? < radius {
            hi = mid;
        } else {
            lo = mid;
        }
        i += 1;
    }
    Ok(hi)
}

/// The ET the step from `a` to `b` enters `radius` of `body`, if it does.
fn entry_in_segment(
    model: &LunarModel,
    (a, b): (&Knot, &Knot),
    body: LunarImpact,
    radius: f64,
) -> Result<Option<f64>, LunarError> {
    let at = |t: f64| distance_at(model, hermite(a, b, t).r, t, body);
    let end = distance_at(model, b.r, b.t, body)?;
    if end < radius {
        return crossing(model, (a, b), body, radius).map(Some);
    }
    // Near-body steps span at most 3% of range. Refine a near-boundary minimum so a
    // grazing crossing between accepted knots has the same result as the drawn path.
    if js_min(distance_at(model, a.r, a.t, body)?, end) > radius * 1.1 {
        return Ok(None);
    }
    let (mut lo, mut hi) = (a.t, b.t);
    for _ in 0..30 {
        let (left, right) = (lo + (hi - lo) / 3.0, hi - (hi - lo) / 3.0);
        if at(left)? < at(right)? {
            hi = right;
        } else {
            lo = left;
        }
    }
    let minimum = knot_at(a, b, (lo + hi) / 2.0);
    if distance_at(model, minimum.r, minimum.t, body)? < radius {
        return crossing(model, (a, &minimum), body, radius).map(Some);
    }
    Ok(None)
}

/// Flies `request` on `model`'s Earth and Moon. Refuses a burn outside the fuel budget or a
/// non-finite input before anything else, then a window that leaves the rail.
pub fn simulate_lunar(
    model: &LunarModel,
    request: &LunarRequest,
) -> Result<LunarFlight, LunarError> {
    let (launch_et, settings) = (request.launch_et, &request.settings);
    let (dv, duration) = (request.delta_v_km_s, request.duration_seconds);
    let checked = [
        dv,
        request.burn_angle_deg,
        launch_et,
        request.parking_radius_km,
        request.parking_phase_deg,
        duration,
    ];
    if !checked.iter().all(|x| x.is_finite())
        || !(0.0..=FUEL_BUDGET).contains(&dv)
        || request.parking_radius_km <= EARTH_RADIUS
        || duration <= 0.0
    {
        return Err(LunarError::BurnOutsideBudget);
    }
    // The window's end and the launch bound every later rail read.
    let end_of_window = launch_et + duration;
    model.relative(end_of_window)?;
    let parking = request.parking.unwrap_or(ParkingOrbit {
        frame_et: None,
        epoch_et: launch_et,
        phase_deg: request.parking_phase_deg,
        radius_km: request.parking_radius_km,
    });
    let start = departure(model, &parking, launch_et, dv, request.burn_angle_deg)?;
    let mut y: State6 = [
        start.r[0], start.r[1], start.r[2], start.v[0], start.v[1], start.v[2],
    ];
    let mut solver = Dopri5::new(StepTolerance {
        rtol: settings.rtol,
        atol_pos: settings.atol_pos,
        atol_vel: settings.atol_vel,
    });
    let mut samples = vec![Knot {
        t: launch_et,
        r: start.r,
        v: start.v,
    }];
    let (mut et, mut h, mut steps, mut attempts) = (launch_et, 1.0, 0, 0_u64);
    let (mut entry_et, mut impact) = (None, None);
    while et < end_of_window && steps < settings.max_steps {
        attempts += 1;
        if attempts > u64::from(settings.max_steps) * 10 {
            return Err(LunarError::SolverUnsettled);
        }
        let bodies = model.bodies(et)?;
        let (position, velocity) = ([y[0], y[1], y[2]], [y[3], y[4], y[5]]);
        h = js_min(h, js_min(settings.max_step, end_of_window - et));
        for body in [bodies.earth, bodies.moon] {
            let speed = norm(sub(velocity, body.v));
            let cap =
                settings.near_body_fraction * norm(sub(position, body.r)) / js_max(0.001, speed);
            h = js_min(h, cap);
        }
        // The rail cannot refuse a stage inside the checked window; a refusal still ends
        // the flight, as the TypeScript throws, and is never flown.
        let mut rail = Ok(());
        let mut f = |t: f64, state: &State6, out: &mut State6| {
            rail = rail.and(model.bodies(t).map(|b| derivative(&b, state, out)));
        };
        let error = solver.attempt(&mut f, et, &y, h);
        rail?;
        if error > 1.0 {
            h = Dopri5::next_step(h, error);
            continue;
        }
        y = solver.y_new;
        solver.accept();
        et += h;
        steps += 1;
        let next = Knot {
            t: et,
            r: [y[0], y[1], y[2]],
            v: [y[3], y[4], y[5]],
        };
        let (previous, last) = (samples[samples.len() - 1], samples.len());
        samples.push(next);
        let segment = (&previous, &next);
        if entry_et.is_none() {
            let zone = request.approach_radius_km;
            entry_et = entry_in_segment(model, segment, LunarImpact::Moon, zone)?;
        }
        for (body, radius) in [
            (LunarImpact::Earth, EARTH_RADIUS),
            (LunarImpact::Moon, MOON_RADIUS),
        ] {
            if let Some(hit) = entry_in_segment(model, segment, body, radius)? {
                (impact, et) = (Some(body), hit);
                samples[last] = knot_at(&previous, &next, et);
                break;
            }
        }
        if let Some(entry) = entry_et
            && request.stop_at_entry
            && (impact.is_none() || entry < et)
        {
            (impact, et) = (None, entry);
            samples[last] = knot_at(&previous, &next, et);
            break;
        }
        if impact.is_some() {
            break;
        }
        h = Dopri5::next_step(h, error);
    }
    if steps >= settings.max_steps {
        return Err(LunarError::StepBudgetExceeded);
    }
    // flight.ts also keeps a running minimum over the knots and a second one after the
    // search below; the final assignment overwrites both, so neither is ported.
    let moon = |k: &Knot| distance_at(model, k.r, k.t, LunarImpact::Moon);
    let (mut minimum_index, mut minimum) = (0, moon(&samples[0])?);
    for (i, sample) in samples.iter().enumerate().skip(1) {
        let d = moon(sample)?;
        if d < minimum {
            (minimum_index, minimum) = (i, d);
        }
    }
    let at = |t: f64| distance_at(model, sample_flight(&samples, t).r, t, LunarImpact::Moon);
    let mut closest_et = samples[minimum_index].t;
    if minimum_index > 0 && minimum_index < samples.len() - 1 {
        let (mut lo, mut hi) = (samples[minimum_index - 1].t, samples[minimum_index + 1].t);
        for _ in 0..32 {
            let (left, right) = (lo + (hi - lo) / 3.0, hi - (hi - lo) / 3.0);
            if at(left)? < at(right)? {
                hi = right;
            } else {
                lo = left;
            }
        }
        closest_et = (lo + hi) / 2.0;
    }
    let closest_km = at(closest_et)?;
    Ok(LunarFlight {
        request: *request,
        samples,
        entry_et,
        impact,
        closest_km,
        closest_et,
        end_et: entry_et.unwrap_or(et),
        steps,
    })
}
