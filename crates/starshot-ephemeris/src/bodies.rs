//! Bodies and their constants, as `packages/ephemeris/src/bodies.ts`, digit for digit.

use core::fmt;

/// A body the ephemeris can place. `Earth` is the Earth-Moon barycentre, as in Table 1.
/// `Moon` is heliocentric and comes from the rails only (PR10); Table 1 has no Moon.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BodyId {
    Sun,
    Mercury,
    Venus,
    Earth,
    Mars,
    Jupiter,
    Saturn,
    Uranus,
    Neptune,
    Moon,
}

/// The planets in Table 1's order, as `PLANET_IDS`.
pub const PLANET_IDS: [BodyId; 8] = [
    BodyId::Mercury,
    BodyId::Venus,
    BodyId::Earth,
    BodyId::Mars,
    BodyId::Jupiter,
    BodyId::Saturn,
    BodyId::Uranus,
    BodyId::Neptune,
];

/// Physical constants of one body. The display colour stays in TypeScript.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BodyInfo {
    pub name: &'static str,
    /// Gravitational parameter GM [km^3/s^2]. Planets use their system value (planet
    /// plus moons), so Earth's is the Earth-Moon system's.
    pub gm: f64,
    /// Mean radius [km].
    pub radius_km: f64,
}

/// 1 astronomical unit [km] (IAU 2012).
pub const AU_KM: f64 = 149597870.7;

/// Earth's own GM without the Moon [km^3/s^2], the digits of
/// `packages/physics/src/launch.ts`. `BodyInfo` for Earth holds the Earth-Moon system.
pub const EARTH_ONLY_GM: f64 = 398600.435507;

/// GM values are JPL DE440 system values except Earth's: 403503.235502 is the DE430 and
/// DE431 Earth plus Moon (BODY3_GM of `gm_de431.tpc`), where DE440's (`gm_de440.tpc`) is
/// 403503.235625, larger by 3.06e-10 of itself. The digits stay those of `bodies.ts`,
/// which the port matches bit for bit. Radii are IAU mean radii. Sources:
/// <https://ssd.jpl.nasa.gov/astro_par.html> and
/// <https://ssd.jpl.nasa.gov/planets/phys_par.html>.
// The Sun's GM keeps every digit `bodies.ts` writes, more than an f64 holds; the compiler
// rounds the literal as JavaScript does, so the two GMs are the same bits.
#[allow(clippy::excessive_precision)]
#[rustfmt::skip]
const BODIES: [BodyInfo; 9] = [
    body("Sun", 132712440041.279419, 695700.0),
    body("Mercury", 22031.868551, 2439.4),
    body("Venus", 324858.592, 6051.8),
    body("Earth", 403503.235502, 6371.0084),
    body("Mars", 42828.375816, 3389.5),
    body("Jupiter", 126712764.1, 69911.0),
    body("Saturn", 37940584.8418, 58232.0),
    body("Uranus", 5794556.4, 25362.0),
    body("Neptune", 6836527.10058, 24622.0),
];

const fn body(name: &'static str, gm: f64, radius_km: f64) -> BodyInfo {
    BodyInfo {
        name,
        gm,
        radius_km,
    }
}

impl BodyId {
    /// The body's constants. Panics for the Moon, which `bodies.ts` does not list: its GM
    /// and radius stay in the lunar modules until it becomes an attractor (PR20).
    pub fn info(self) -> &'static BodyInfo {
        BODIES
            .get(self as usize)
            .unwrap_or_else(|| panic!("no BodyInfo for {self}"))
    }

    pub fn name(self) -> &'static str {
        if self == BodyId::Moon {
            "Moon"
        } else {
            self.info().name
        }
    }

    /// Index into Table 1 (Mercury 0 to Neptune 7), or None for a body Table 1 lacks.
    pub(crate) fn planet_index(self) -> Option<usize> {
        match self {
            BodyId::Sun | BodyId::Moon => None,
            planet => Some(planet as usize - 1),
        }
    }
}

impl fmt::Display for BodyId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.name())
    }
}

/// A body's code in an `ephem.pack/1` decade file: NAIF ids 1 to 8 for the planets'
/// system barycentres relative to the Sun, 301 for the Moon relative to Earth's centre.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RailBody {
    Mercury = 1,
    Venus = 2,
    /// The Earth-Moon barycentre, Table 1's "earth".
    Emb = 3,
    Mars = 4,
    Jupiter = 5,
    Saturn = 6,
    Uranus = 7,
    Neptune = 8,
    /// The geocentric Moon.
    Moon = 301,
}

impl RailBody {
    /// Every body of the committed pack, in its table order.
    pub const ALL: [RailBody; 9] = [
        RailBody::Mercury,
        RailBody::Venus,
        RailBody::Emb,
        RailBody::Mars,
        RailBody::Jupiter,
        RailBody::Saturn,
        RailBody::Uranus,
        RailBody::Neptune,
        RailBody::Moon,
    ];

    pub fn code(self) -> u16 {
        self as u16
    }

    pub fn from_code(code: u16) -> Option<RailBody> {
        RailBody::ALL.into_iter().find(|b| b.code() == code)
    }

    /// The rail of a planet (`Earth` is the barycentre's), or None for the Sun, which is
    /// the origin, and the Moon, whose rail is geocentric.
    pub fn of_planet(id: BodyId) -> Option<RailBody> {
        id.planet_index().map(|i| RailBody::ALL[i])
    }
}

/// The Earth-Moon mass ratio of DE440, `constants.emrat` in
/// `data/ephem/de440s-100km/pack.json` (BODY399_GM / BODY301_GM of `gm_de440.tpc`);
/// `tests/rails.rs` reads the JSON and compares the bits. It splits the rails' barycentre
/// into Earth's centre and the Moon. The lunar model keeps its own study digits
/// (`lunar::EARTH_GM`, `lunar::MOON_GM`); neither replaces the other in Band B.
pub const EMRAT: f64 = 81.30056822149722;

/// Laplace sphere-of-influence radius [km] of a body on an orbit of semi-major axis
/// `a_km` about the Sun: a * (m / M_sun)^(2/5).
pub fn sphere_of_influence_km(id: BodyId, a_km: f64) -> f64 {
    a_km * starshot_math::pow(id.info().gm / BodyId::Sun.info().gm, 0.4)
}
