//! A probe's flight under the Sun and planets, as `packages/physics/src/simulate.ts`:
//! encounter detection, the energy-consistent switch-on of the home planet, and the
//! duration, impact, Sun-dive, escape, sphere-of-influence and step-limit endings.
//!
//! The port keeps the TypeScript operation order, so a flight takes the same steps
//! through the same branches unless a threshold falls within rounding of a test. The bits
//! differ: the ephemeris goes through `sin` and `cos`, `next_step` through `pow`, and each
//! length through `norm`, which is not V8's three-argument `Math.hypot` (deviation row
//! 79). PR12's next part, its conformance flights, holds this port to the TypeScript's.

use crate::dopri5::{Dopri5, State6, StepTolerance};
use crate::gravity::acceleration;
use crate::hermite::{Knot, hermite};
use starshot_ephemeris::time::SECONDS_PER_DAY as DAY;
use starshot_ephemeris::vec::norm;
use starshot_ephemeris::{AU_KM, BodyId, Ephemeris, Vec3};
use starshot_math::sqrt;

/// How many `BodyId`s there are: tables per body are indexed by `id as usize`.
pub const BODY_COUNT: usize = BodyId::Moon as usize + 1;

/// One flight's inputs. `new` fills in today's defaults; set any field after it.
#[derive(Clone, Copy)]
pub struct SimulationConfig<'a> {
    pub ephemeris: &'a dyn Ephemeris,
    /// Bodies whose gravity acts on the probe (the Sun always does). `None`: every body
    /// the ephemeris lists. The Moon has no `BodyInfo` yet (PR20), so listing it panics.
    pub attractors: Option<&'a [BodyId]>,
    /// Start time, ET (TDB seconds past J2000).
    pub t0: f64,
    /// Heliocentric start state [km, km/s].
    pub r0: Vec3,
    pub v0: Vec3,
    /// Longest flight [s].
    pub duration: f64,
    /// Stop as soon as the probe enters this body's sphere of influence.
    pub stop_at_soi_of: Option<BodyId>,
    /// Patched-conic departure: the probe starts at this body's centre with the excess
    /// velocity already added, and the body's gravity is off until the probe is two
    /// spheres of influence away (see `launch.rs`).
    pub depart_from: Option<BodyId>,
    pub rtol: f64,
    /// Position tolerance [km]; velocities get a millionth of it [km/s].
    pub atol_km: f64,
    /// Largest step [s]. Default 5 days.
    pub max_step: f64,
    /// Most accepted steps. Default 20,000.
    pub max_steps: u32,
    /// The probe is lost inside this distance from the Sun [km]. Default 10 solar radii.
    pub sun_dive_radius_km: f64,
    /// The probe has left the play area beyond this distance [km]. Default 60 au.
    pub escape_radius_km: f64,
}

impl<'a> SimulationConfig<'a> {
    /// A flight with `simulate.ts`'s defaults: every listed body pulls, no stop at a
    /// sphere of influence, no departure, rtol 1e-10 and 1 km.
    pub fn new(ephemeris: &'a dyn Ephemeris, t0: f64, r0: Vec3, v0: Vec3, duration: f64) -> Self {
        SimulationConfig {
            ephemeris,
            attractors: None,
            t0,
            r0,
            v0,
            duration,
            stop_at_soi_of: None,
            depart_from: None,
            rtol: 1e-10,
            atol_km: 1.0,
            max_step: 5.0 * DAY,
            max_steps: 20000,
            sun_dive_radius_km: 10.0 * BodyId::Sun.info().radius_km,
            escape_radius_km: 60.0 * AU_KM,
        }
    }
}

/// A local minimum of the distance to one body.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Encounter {
    pub body: BodyId,
    /// Time of closest approach, ET.
    pub t: f64,
    /// Closest distance from the body's centre [km].
    pub distance_km: f64,
    /// Relative speed then [km/s].
    pub relative_speed_km_s: f64,
    pub inside_soi: bool,
    pub impact: bool,
}

/// Why a flight ended.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Termination {
    Duration,
    Impact,
    Sun,
    Escape,
    SoiReached,
    MaxSteps,
}

impl Termination {
    /// The TypeScript name, as the conformance fixtures store it.
    pub fn name(self) -> &'static str {
        match self {
            Termination::Duration => "duration",
            Termination::Impact => "impact",
            Termination::Sun => "sun",
            Termination::Escape => "escape",
            Termination::SoiReached => "soi-reached",
            Termination::MaxSteps => "max-steps",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SimulationResult {
    pub samples: Vec<Knot>,
    /// Local distance minima, in time order, for approaches closer than 20 spheres of
    /// influence.
    pub encounters: Vec<Encounter>,
    /// The overall closest approach to each attractor, indexed by `BodyId as usize`.
    pub closest: [Option<Encounter>; BODY_COUNT],
    pub termination: Termination,
    pub terminated_by: Option<BodyId>,
    /// The time of the last accepted step, as `simulate.ts` returns it. After an impact or
    /// a sphere-of-influence stop the last sample is earlier, at the stop.
    pub end_time: f64,
    pub steps: u32,
}

/// `Math.min`: a NaN in either argument wins, where `f64::min` would drop it.
fn js_min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else {
        a.min(b)
    }
}

/// `Math.max`, NaN winning as in `js_min`.
fn js_max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else {
        a.max(b)
    }
}

/// Distance [km], its rate [km/s] and the relative speed [km/s] of the probe and a body.
struct Relative {
    d: f64,
    rate: f64,
    speed: f64,
}

fn relative(eph: &dyn Ephemeris, id: BodyId, t: f64, r: Vec3, v: Vec3) -> Relative {
    let s = eph.state(id, t);
    let (dx, dy, dz) = (r[0] - s.r[0], r[1] - s.r[1], r[2] - s.r[2]);
    let (ux, uy, uz) = (v[0] - s.v[0], v[1] - s.v[1], v[2] - s.v[2]);
    let d = norm([dx, dy, dz]);
    let rate = (dx * ux + dy * uy + dz * uz) / d;
    Relative {
        d,
        rate,
        speed: norm([ux, uy, uz]),
    }
}

/// Golden-section search for the distance minimum to `id` inside one step: at most 40
/// narrowings, until the bracket is 1 s wide.
fn refine_minimum(eph: &dyn Ephemeris, id: BodyId, a: &Knot, b: &Knot) -> (f64, Relative) {
    let g = (sqrt(5.0) - 1.0) / 2.0;
    let (mut lo, mut hi) = (a.t, b.t);
    let dist = |t: f64| {
        let p = hermite(a, b, t);
        relative(eph, id, t, p.r, p.v)
    };
    let (mut x1, mut x2) = (hi - g * (hi - lo), lo + g * (hi - lo));
    let (mut f1, mut f2) = (dist(x1).d, dist(x2).d);
    let mut k = 0;
    while k < 40 && hi - lo > 1.0 {
        if f1 < f2 {
            (hi, x2, f2) = (x2, x1, f1);
            x1 = hi - g * (hi - lo);
            f1 = dist(x1).d;
        } else {
            (lo, x1, f1) = (x1, x2, f2);
            x2 = lo + g * (hi - lo);
            f2 = dist(x2).d;
        }
        k += 1;
    }
    let t = (lo + hi) / 2.0;
    (t, dist(t))
}

/// The encounters so far and the closest approach to each body.
struct Approaches {
    encounters: Vec<Encounter>,
    closest: [Option<Encounter>; BODY_COUNT],
}

impl Approaches {
    fn record(&mut self, id: BodyId, soi: f64, t: f64, m: &Relative) -> Encounter {
        let e = Encounter {
            body: id,
            t,
            distance_km: m.d,
            relative_speed_km_s: m.speed,
            inside_soi: m.d < soi,
            impact: m.d < id.info().radius_km,
        };
        if m.d < 20.0 * soi {
            self.encounters.push(e);
        }
        let best = &mut self.closest[id as usize];
        if best.is_none_or(|b| e.distance_km < b.distance_km) {
            *best = Some(e);
        }
        e
    }
}

fn derivative(eph: &dyn Ephemeris, active: &[BodyId], t: f64, y: &State6, dy: &mut State6) {
    let mut acc = [0.0; 3];
    acceleration(eph, active, t, [y[0], y[1], y[2]], &mut acc);
    *dy = [y[3], y[4], y[5], acc[0], acc[1], acc[2]];
}

/// Integrates a probe's flight under the Sun and the attractors.
pub fn simulate(cfg: &SimulationConfig) -> SimulationResult {
    let eph = cfg.ephemeris;
    let listed = cfg.attractors.unwrap_or(eph.bodies());
    let attractors: Vec<BodyId> = listed
        .iter()
        .copied()
        .filter(|&b| b != BodyId::Sun)
        .collect();
    let t_end = cfg.t0 + cfg.duration;

    let mut active: Vec<BodyId> = match cfg.depart_from {
        Some(home) => attractors.iter().copied().filter(|&b| b != home).collect(),
        None => attractors.clone(),
    };
    let mut departing = cfg
        .depart_from
        .is_some_and(|home| attractors.contains(&home));
    let mut solver = Dopri5::new(StepTolerance {
        rtol: cfg.rtol,
        atol_pos: cfg.atol_km,
        atol_vel: cfg.atol_km * 1e-6,
    });

    let mut t = cfg.t0;
    let (r0, v0) = (cfg.r0, cfg.v0);
    let mut y: State6 = [r0[0], r0[1], r0[2], v0[0], v0[1], v0[2]];
    let mut samples = vec![Knot { t, r: r0, v: v0 }];
    let mut found = Approaches {
        encounters: Vec::new(),
        closest: [None; BODY_COUNT],
    };
    let (mut soi, mut prev_rate) = ([f64::NAN; BODY_COUNT], [f64::NAN; BODY_COUNT]);
    for &id in &attractors {
        soi[id as usize] = eph.soi_km(id, cfg.t0);
        // The probe starts at the home planet's centre, where the rate is 0 / 0.
        let leaving = Some(id) == cfg.depart_from;
        prev_rate[id as usize] = if leaving {
            1.0
        } else {
            relative(eph, id, t, r0, v0).rate
        };
    }
    let mut termination = Termination::Duration;
    let mut terminated_by = None;
    let mut h = js_min(cfg.max_step, DAY / 4.0);
    let mut steps = 0;

    while t < t_end {
        if steps >= cfg.max_steps {
            termination = Termination::MaxSteps;
            break;
        }
        // Cap the step near planets so a flyby can never be stepped over.
        let mut cap = js_min(cfg.max_step, t_end - t);
        let (r, v) = ([y[0], y[1], y[2]], [y[3], y[4], y[5]]);
        for &id in &active {
            let rel = relative(eph, id, t, r, v);
            if rel.d < 5.0 * soi[id as usize] {
                cap = js_min(cap, (0.02 * rel.d) / js_max(rel.speed, 1e-3));
            }
        }
        h = js_min(h, cap);
        let mut f = |t: f64, y: &State6, dy: &mut State6| derivative(eph, &active, t, y, dy);
        let err = solver.attempt(&mut f, t, &y, h);
        if err > 1.0 {
            h = Dopri5::next_step(h, err);
            continue;
        }

        let a = samples[samples.len() - 1];
        let t_new = t + h;
        let yn = solver.y_new;
        let b = Knot {
            t: t_new,
            r: [yn[0], yn[1], yn[2]],
            v: [yn[3], yn[4], yn[5]],
        };
        solver.accept();
        y = yn;
        t = t_new;
        steps += 1;
        h = Dopri5::next_step(h, err);

        // Knot that restarts the arc after the home planet's gravity switches on.
        let mut kick = None;
        if departing && let Some(home_id) = cfg.depart_from {
            let home = eph.state(home_id, t_new);
            let d = norm([b.r[0] - home.r[0], b.r[1] - home.r[1], b.r[2] - home.r[2]]);
            if d > 2.0 * soi[home_id as usize] {
                // Switch the home planet's gravity on, energy-consistently: from here
                // outward it will take back 2 mu / d of (relative speed)^2, so add that
                // now. The probe then still leaves with the excess velocity the player
                // chose, which keeps the aim consistent with a Lambert solution. The
                // bump is a second knot at the same instant, so the integrated arc that
                // ends at `b` keeps its own velocity for interpolation.
                let dv = [b.v[0] - home.v[0], b.v[1] - home.v[1], b.v[2] - home.v[2]];
                let u = norm(dv);
                let k = if u > 0.0 {
                    sqrt(u * u + (2.0 * home_id.info().gm) / d) / u
                } else {
                    1.0
                };
                let v = [
                    home.v[0] + dv[0] * k,
                    home.v[1] + dv[1] * k,
                    home.v[2] + dv[2] * k,
                ];
                kick = Some(Knot {
                    t: t_new,
                    r: b.r,
                    v,
                });
                (y[3], y[4], y[5]) = (v[0], v[1], v[2]);
                departing = false;
                active.clone_from(&attractors);
                solver.reset();
            }
        }

        // Closest approaches: the distance rate turns from negative to positive. The
        // rates are read from the step before and written to the next table, as
        // `simulate.ts`'s two maps.
        let mut stop: Option<(f64, Termination, BodyId)> = None;
        let mut next_rate = prev_rate;
        for &id in &attractors {
            let i = id as usize;
            let rel = relative(eph, id, t_new, b.r, b.v);
            next_rate[i] = rel.rate;
            if departing && Some(id) == cfg.depart_from {
                continue;
            }
            if prev_rate[i] < 0.0 && rel.rate >= 0.0 {
                let (at, m) = refine_minimum(eph, id, &a, &b);
                let e = found.record(id, soi[i], at, &m);
                if e.impact && stop.is_none_or(|s| e.t < s.0) {
                    stop = Some((e.t, Termination::Impact, id));
                }
            }
            let entered = cfg.stop_at_soi_of == Some(id) && rel.d < soi[i];
            if entered && stop.is_none_or(|s| t_new < s.0) {
                stop = Some((t_new, Termination::SoiReached, id));
            }
        }
        prev_rate = next_rate;

        if let Some((at, why, body)) = stop {
            let end = hermite(&a, &b, at);
            samples.push(Knot {
                t: at,
                r: end.r,
                v: end.v,
            });
            termination = why;
            terminated_by = Some(body);
            if why == Termination::SoiReached {
                let m = relative(eph, body, at, end.r, end.v);
                found.record(body, soi[body as usize], at, &m);
            }
            break;
        }
        samples.push(b);
        samples.extend(kick);
        let dist = norm(b.r);
        if dist < cfg.sun_dive_radius_km {
            termination = Termination::Sun;
            terminated_by = Some(BodyId::Sun);
            break;
        }
        if dist > cfg.escape_radius_km {
            termination = Termination::Escape;
            break;
        }
    }

    SimulationResult {
        samples,
        encounters: found.encounters,
        closest: found.closest,
        termination,
        terminated_by,
        end_time: t,
        steps,
    }
}

/// The probe's state at any time inside a flight: cubic Hermite between the samples
/// around `t`, the first or last sample outside them.
pub fn sample_at(result: &SimulationResult, t: f64) -> Knot {
    let s = &result.samples;
    if t <= s[0].t {
        return s[0];
    }
    let last = s[s.len() - 1];
    if t >= last.t {
        return last;
    }
    let (mut lo, mut hi) = (0, s.len() - 1);
    while hi - lo > 1 {
        let mid = (lo + hi) >> 1;
        if s[mid].t <= t {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    let p = hermite(&s[lo], &s[hi], t);
    Knot { t, r: p.r, v: p.v }
}
