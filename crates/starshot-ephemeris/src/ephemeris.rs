//! The interface the physics engine consumes, with Table 1 behind it as
//! `packages/ephemeris/src/ephemeris.ts`.

use crate::bodies::{BodyId, PLANET_IDS, sphere_of_influence_km};
use crate::kepler::{ClassicalElements, state_from_elements};
use crate::table1::planet_elements;
use crate::vec::Vec3;
use core::f64::consts::PI;

/// Heliocentric position [km] and velocity [km/s], ecliptic and equinox of J2000.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct State {
    pub r: Vec3,
    pub v: Vec3,
}

const ORIGIN: State = State {
    r: [0.0; 3],
    v: [0.0; 3],
};

/// A state for any listed body at any ET (TDB seconds past J2000).
pub trait Ephemeris {
    fn bodies(&self) -> &[BodyId];
    /// Whether every orbit is projected onto the ecliptic (z = 0).
    fn flattened(&self) -> bool;
    fn state(&self, id: BodyId, et: f64) -> State;
    /// Sphere-of-influence radius [km] of a planet at ET; infinite for the Sun.
    fn soi_km(&self, id: BodyId, et: f64) -> f64;
}

/// Heliocentric state of a planet from Table 1 (the Earth-Moon barycentre for Earth).
pub fn planet_state(id: BodyId, et: f64) -> State {
    state_from_elements(&planet_elements(id, et))
}

/// Zero z for position and velocity, keeping x and y bits.
pub(crate) fn flat(s: State) -> State {
    State {
        r: [s.r[0], s.r[1], 0.0],
        v: [s.v[0], s.v[1], 0.0],
    }
}

const TABLE1_BODIES: [BodyId; 9] = [
    BodyId::Sun,
    PLANET_IDS[0],
    PLANET_IDS[1],
    PLANET_IDS[2],
    PLANET_IDS[3],
    PLANET_IDS[4],
    PLANET_IDS[5],
    PLANET_IDS[6],
    PLANET_IDS[7],
];

/// Table 1 for the Sun and the eight planets, as `createEphemeris`. With `flatten`, every
/// orbit is projected onto the ecliptic so a top-down aim can hit a target (D6).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Table1Ephemeris {
    pub flatten: bool,
}

impl Ephemeris for Table1Ephemeris {
    fn bodies(&self) -> &[BodyId] {
        &TABLE1_BODIES
    }

    fn flattened(&self) -> bool {
        self.flatten
    }

    /// Panics for a body it does not list: that is a programming error, not input.
    fn state(&self, id: BodyId, et: f64) -> State {
        if id == BodyId::Sun {
            return ORIGIN;
        }
        let s = planet_state(id, et);
        if self.flatten { flat(s) } else { s }
    }

    fn soi_km(&self, id: BodyId, et: f64) -> f64 {
        if id == BodyId::Sun {
            return f64::INFINITY;
        }
        sphere_of_influence_km(id, planet_elements(id, et).a)
    }
}

/// `samples` points along one full orbit of a planet with its elements frozen at ET, for
/// drawing (a closed loop when drawn).
pub fn orbit_path(id: BodyId, et: f64, samples: usize, flatten: bool) -> Vec<Vec3> {
    let el = planet_elements(id, et);
    (0..samples)
        .map(|k| {
            let m = (2.0 * PI * k as f64) / samples as f64;
            let r = state_from_elements(&ClassicalElements { m, ..el }).r;
            if flatten { [r[0], r[1], 0.0] } else { r }
        })
        .collect()
}

/// Orbital period [s] from the mean motion at ET.
pub fn orbital_period_seconds(id: BodyId, et: f64) -> f64 {
    (2.0 * PI) / planet_elements(id, et).n
}
