//! The bounded Moon route search, as `apps/game/src/sim/lunar-hint.ts`. A fixed integer
//! grid of launch days, burns and angles is flown through the production lunar request
//! (`lunar_request`, with the frozen lunar settings, D6). Candidates come in a fixed order
//! and the budget counts simulations, so wall time never selects a route. The grid is
//! finite: its cheapest hit claims no global optimum and does not replace the par.
//!
//! `LunarSearch` flies one candidate per step (G12, deviation row 117), so the worker that
//! drives it can yield between flights as it does today; `find_lunar_hint` drives it to the
//! end.

use crate::aim::Aim;
use crate::hint::{Hint, HintSource};
use crate::lunar::{BurnAngleError, LunarHintQuery, LunarShotRequest, lunar_request};
use crate::shot::ShotAnalysis;
use core::cmp::Ordering;
use core::fmt;
use starshot_physics::lunar::{DAY, EARTH_RADIUS, LAUNCH_ET, LunarError, ParkingOrbit};
use std::collections::BTreeSet;

/// A candidate in integers: day index, burn [milli-km/s] and signed angle [centidegrees].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Route {
    pub day: u32,
    pub burn: i32,
    pub angle: i32,
}

/// Most simulations a search may run. Whole-search dedupe leaves the grid at most 236.
pub const LUNAR_SEARCH_BUDGET: u32 = 240;
/// Names this grid and its flight order; a change to either needs a new id.
pub const LUNAR_GRID: &str = "moon-grid/1";
const REFERENCE: Route = Route {
    day: 0,
    burn: 3240,
    angle: 0,
};
const LAST_DAY: u32 = 27;
const BURNS: [i32; 2] = [3150, 3240];
const ANGLES: [i32; 3] = [-2000, 0, 2000];
const DECREASES: [i32; 6] = [50, 40, 30, 20, 10, 0];
const OFFSETS: [i32; 3] = [-500, 0, 500];
const SEEDS: usize = 4;

/// Cost order: burn, then day, then absolute angle, then signed angle.
pub fn by_cost(a: &Route, b: &Route) -> Ordering {
    let abs = |r: &Route| r.angle.abs();
    (a.burn.cmp(&b.burn))
        .then(a.day.cmp(&b.day))
        .then(abs(a).cmp(&abs(b)))
        .then(a.angle.cmp(&b.angle))
}

/// The cheapest hit of each day, cheapest first, for at most four days. The sort is
/// stable, as JavaScript's is.
pub fn seeds_of(hits: &[Route]) -> Vec<Route> {
    let mut sorted = hits.to_vec();
    sorted.sort_by(by_cost);
    let mut seeds: Vec<Route> = Vec::new();
    for hit in sorted {
        if seeds.len() < SEEDS && !seeds.iter().any(|seed| seed.day == hit.day) {
            seeds.push(hit);
        }
    }
    seeds
}

/// A seed's refinement, in flight order: lower burns, and angles either side of its own.
pub fn refinement_of(seed: Route) -> Vec<Route> {
    let around = |decrease: i32| {
        OFFSETS.map(|offset| Route {
            burn: seed.burn - decrease,
            angle: seed.angle + offset,
            ..seed
        })
    };
    DECREASES.into_iter().flat_map(around).collect()
}

/// Why a Moon guide was refused or could not fly. The first two keep the TypeScript's
/// `RangeError` texts and are raised before any flight.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LunarHintError {
    Strategy,
    Budget,
    /// No grid angle reaches it; kept so `lunar_request` is never bypassed.
    BurnAngle(BurnAngleError),
    Flight(LunarError),
}

impl fmt::Display for LunarHintError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LunarHintError::Strategy => {
                write!(f, "Moon guide strategy must be reference or search")
            }
            LunarHintError::Budget => {
                write!(f, "Moon guide budget must be an integer from 0 to 240")
            }
            LunarHintError::BurnAngle(e) => e.fmt(f),
            LunarHintError::Flight(e) => e.fmt(f),
        }
    }
}

impl std::error::Error for LunarHintError {}

impl From<BurnAngleError> for LunarHintError {
    fn from(e: BurnAngleError) -> LunarHintError {
        LunarHintError::BurnAngle(e)
    }
}

impl From<LunarError> for LunarHintError {
    fn from(e: LunarError) -> LunarHintError {
        LunarHintError::Flight(e)
    }
}

/// Flies one route through `fly` and returns it as a hit or miss guide, before its source
/// and count are set.
fn fly_route<F>(route: Route, fly: &mut F) -> Result<Hint, LunarHintError>
where
    F: FnMut(&LunarShotRequest) -> Result<ShotAnalysis, LunarError>,
{
    // Integers become ET, km/s and degrees once, so no step accumulates rounding.
    let launch_et = LAUNCH_ET + f64::from(route.day) * DAY;
    let aim = Aim {
        angle_deg: f64::from(route.angle) / 100.0,
        speed_km_s: f64::from(route.burn) / 1000.0,
    };
    // D38: the plane stays the one at LAUNCH_ET; only the date and its epoch move.
    let parking = ParkingOrbit {
        frame_et: Some(LAUNCH_ET),
        epoch_et: launch_et,
        phase_deg: 225.0,
        radius_km: EARTH_RADIUS + 200.0,
    };
    let analysis = fly(&lunar_request(launch_et, aim, parking)?)?;
    Ok(Hint {
        parking: Some(parking),
        day: route.day,
        launch_et,
        aim,
        hits: analysis.hit,
        closest_km: analysis.closest_km,
        source: HintSource::LunarGrid,
        simulations: 0,
    })
}

/// The study's measured reference, day 0 at 3.24 km/s prograde from phase 225 degrees,
/// flown once through `fly`: the curated guide `lunar_hint` returns.
pub(crate) fn reference_hint<F>(mut fly: F) -> Result<Hint, LunarHintError>
where
    F: FnMut(&LunarShotRequest) -> Result<ShotAnalysis, LunarError>,
{
    let hint = fly_route(REFERENCE, &mut fly)?;
    let source = HintSource::Curated;
    Ok(Hint {
        source,
        simulations: 1,
        ..hint
    })
}

/// What one step of a `LunarSearch` did.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LunarStep {
    /// One flight, the only one of the step.
    Flew,
    /// The guide, or none when nothing hit. No flight; every later step says the same.
    Done(Option<Hint>),
}

#[derive(Debug, Clone)]
enum Strategy {
    /// The reference, once flown.
    Reference(Option<Hint>),
    Search,
}

/// A Moon guide flown one candidate per step, as `findLunarHint`: the reference first,
/// then the coarse grid by day, burn and angle, then each seed's refinement, each tuple
/// flown at most once and every flight counted against the budget.
#[derive(Debug, Clone)]
pub struct LunarSearch {
    strategy: Strategy,
    budget: u32,
    simulations: u32,
    /// The candidates in flight order; the refinements join once the coarse grid is done.
    queue: Vec<Route>,
    next: usize,
    seeded: bool,
    seen: BTreeSet<(u32, i32, i32)>,
    hits: Vec<(Route, Hint)>,
}

impl LunarSearch {
    /// Checks the strategy and then the budget, for both strategies, before any flight:
    /// only an absent field takes its default. The budget bounds only the search, so a
    /// reference query flies once at any valid budget.
    pub fn new(query: &LunarHintQuery) -> Result<LunarSearch, LunarHintError> {
        let strategy = match query.strategy {
            None | Some("reference") => Strategy::Reference(None),
            Some("search") => Strategy::Search,
            Some(_) => return Err(LunarHintError::Strategy),
        };
        let cap = f64::from(LUNAR_SEARCH_BUDGET);
        let budget = query.budget.unwrap_or(cap);
        // `Number.isInteger`: a NaN or an infinity has a NaN fraction.
        if budget.fract() != 0.0 || !(0.0..=cap).contains(&budget) {
            return Err(LunarHintError::Budget);
        }
        let mut queue = vec![REFERENCE];
        for day in 0..=LAST_DAY {
            for burn in BURNS {
                queue.extend(ANGLES.map(|angle| Route { day, burn, angle }));
            }
        }
        Ok(LunarSearch {
            strategy,
            budget: budget as u32,
            simulations: 0,
            queue,
            next: 0,
            seeded: false,
            seen: BTreeSet::new(),
            hits: Vec::new(),
        })
    }

    /// Flies the next candidate through `fly`, the production runner or a test's wrapper
    /// of it, or finishes. A tuple already flown is skipped without a flight; a new one
    /// past the budget ends the search.
    pub fn step<F>(&mut self, mut fly: F) -> Result<LunarStep, LunarHintError>
    where
        F: FnMut(&LunarShotRequest) -> Result<ShotAnalysis, LunarError>,
    {
        match self.strategy {
            Strategy::Reference(Some(hint)) => return Ok(LunarStep::Done(Some(hint))),
            Strategy::Reference(None) => {
                self.strategy = Strategy::Reference(Some(reference_hint(&mut fly)?));
                self.simulations = 1;
                return Ok(LunarStep::Flew);
            }
            Strategy::Search => {}
        }
        let route = loop {
            let Some(&route) = self.queue.get(self.next) else {
                if self.seeded {
                    return Ok(LunarStep::Done(self.best()));
                }
                // The seeds are fixed here, so refinement hits never add seeds.
                self.seeded = true;
                let hits: Vec<Route> = self.hits.iter().map(|(route, _)| *route).collect();
                let refinements = seeds_of(&hits).into_iter().flat_map(refinement_of);
                self.queue.extend(refinements);
                continue;
            };
            if !self.seen.contains(&(route.day, route.burn, route.angle)) {
                break route;
            }
            self.next += 1;
        };
        if self.simulations >= self.budget {
            return Ok(LunarStep::Done(self.best()));
        }
        self.next += 1;
        self.seen.insert((route.day, route.burn, route.angle));
        self.simulations += 1;
        let hint = fly_route(route, &mut fly)?;
        if hint.hits {
            self.hits.push((route, hint));
        }
        Ok(LunarStep::Flew)
    }

    /// The cheapest hit so far with the flights so far; `min_by` keeps the first of equals,
    /// as a stable sort's head does.
    fn best(&self) -> Option<Hint> {
        let (_, found) = self.hits.iter().min_by(|a, b| by_cost(&a.0, &b.0))?;
        let simulations = self.simulations;
        Some(Hint {
            simulations,
            ..*found
        })
    }
}

/// The Moon guide for `query`: the measured reference by default, or the bounded search.
/// `fly` is the production runner, `run_lunar` on the game's model, or a test's wrapper of
/// it, which takes the place of TypeScript's module mock. `after_flight` runs once after
/// each flight and never before one, where a worker yields.
pub fn find_lunar_hint<F>(
    query: &LunarHintQuery,
    mut fly: F,
    mut after_flight: impl FnMut(),
) -> Result<Option<Hint>, LunarHintError>
where
    F: FnMut(&LunarShotRequest) -> Result<ShotAnalysis, LunarError>,
{
    let mut search = LunarSearch::new(query)?;
    loop {
        match search.step(&mut fly)? {
            LunarStep::Flew => after_flight(),
            LunarStep::Done(hint) => return Ok(hint),
        }
    }
}
