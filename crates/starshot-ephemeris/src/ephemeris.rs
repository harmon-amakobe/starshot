//! The interface the physics engine consumes, with Table 1 behind it as
//! `packages/ephemeris/src/ephemeris.ts`, and the DE440 rails behind it (D17).

use crate::bodies::{BodyId, EMRAT, PLANET_IDS, RailBody, sphere_of_influence_km};
use crate::kepler::{ClassicalElements, state_from_elements};
use crate::rails::RailPack;
use crate::table1::planet_elements;
use crate::vec::{Vec3, add, scale, sub};
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
///
/// # Panics
///
/// An implementation may panic for a body it cannot place, as Table 1 does for the Moon:
/// asking for one is a programming error, not input.
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

/// Anomalistic period [s] at ET, perihelion to perihelion: 2 pi over Table 1's mean
/// motion of M = L - varpi. Earth's is 365.25965 days, against the sidereal 365.25636.
pub fn orbital_period_seconds(id: BodyId, et: f64) -> f64 {
    (2.0 * PI) / planet_elements(id, et).n
}

const RAIL_BODIES: [BodyId; 10] = [
    BodyId::Sun,
    PLANET_IDS[0],
    PLANET_IDS[1],
    PLANET_IDS[2],
    PLANET_IDS[3],
    PLANET_IDS[4],
    PLANET_IDS[5],
    PLANET_IDS[6],
    PLANET_IDS[7],
    BodyId::Moon,
];

/// The Moon's share of the barycentre's offset: Earth's centre is the barycentre less
/// the geocentric Moon over 1 + EMRAT.
const MOON_SHARE: f64 = 1.0 / (1.0 + EMRAT);

/// The rails pack behind the `Ephemeris` trait (D17). Inside the pack's coverage every
/// state comes from the rails, and the decade holding the ET must be loaded: the caller
/// loads it before simulating, because a silent fallback would let the preview and a
/// server disagree. Outside coverage the planets come from Table 1 and the Moon panics.
/// `Earth` stays the Earth-Moon barycentre; `earth_centre` and the Moon split it with the
/// pack's EMRAT.
#[derive(Debug, Clone)]
pub struct RailEphemeris {
    pub pack: RailPack,
    pub flatten: bool,
    pub table1: Table1Ephemeris,
}

impl RailEphemeris {
    pub fn new(pack: RailPack, flatten: bool) -> RailEphemeris {
        RailEphemeris {
            pack,
            flatten,
            table1: Table1Ephemeris { flatten },
        }
    }

    /// The rails' state of `body`, None outside coverage. Panics for NaN, and inside
    /// coverage when the decade is not loaded.
    fn rail(&self, body: RailBody, et: f64) -> Option<State> {
        assert!(
            !et.is_nan(),
            "the rails ephemeris was asked for {body:?} at a NaN ET"
        );
        let year = RailPack::decade_year(et)?;
        let state = self.pack.state(body, et);
        Some(
            state
                .unwrap_or_else(|| panic!("decade {year} not loaded (or it has no {body:?} rail)")),
        )
    }

    /// Earth's centre and the geocentric Moon, unflattened. Panics outside coverage.
    fn earth_and_moon(&self, et: f64) -> (State, State) {
        let (Some(emb), Some(moon)) = (self.rail(RailBody::Emb, et), self.rail(RailBody::Moon, et))
        else {
            panic!(
                "no Moon rail at ET {et}: the pack covers {:?}",
                self.pack.coverage()
            );
        };
        let earth = State {
            r: sub(emb.r, scale(moon.r, MOON_SHARE)),
            v: sub(emb.v, scale(moon.v, MOON_SHARE)),
        };
        (earth, moon)
    }

    fn shaped(&self, s: State) -> State {
        if self.flatten { flat(s) } else { s }
    }

    /// Heliocentric state of Earth's centre, inside coverage only.
    pub fn earth_centre(&self, et: f64) -> State {
        self.shaped(self.earth_and_moon(et).0)
    }
}

impl Ephemeris for RailEphemeris {
    fn bodies(&self) -> &[BodyId] {
        &RAIL_BODIES
    }

    fn flattened(&self) -> bool {
        self.flatten
    }

    fn state(&self, id: BodyId, et: f64) -> State {
        let s = match (id, RailBody::of_planet(id)) {
            (BodyId::Sun, _) => return ORIGIN,
            (BodyId::Moon, _) => {
                let (earth, moon) = self.earth_and_moon(et);
                State {
                    r: add(earth.r, moon.r),
                    v: add(earth.v, moon.v),
                }
            }
            (_, Some(body)) => match self.rail(body, et) {
                Some(s) => s,
                None => return self.table1.state(id, et),
            },
            (_, None) => panic!("the rails ephemeris has no {id}"),
        };
        self.shaped(s)
    }

    /// Table 1's semi-major axis for every source, so a sphere of influence does not
    /// depend on where the positions come from. The Moon has none until PR20.
    fn soi_km(&self, id: BodyId, et: f64) -> f64 {
        self.table1.soi_km(id, et)
    }
}
