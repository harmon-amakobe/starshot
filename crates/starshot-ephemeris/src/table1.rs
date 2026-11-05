//! NASA/JPL "Keplerian Elements for Approximate Positions of the Major Planets", Table 1
//! (E M Standish), valid 1800 AD to 2050 AD, referred to the mean ecliptic and equinox of
//! J2000. Source: <https://ssd.jpl.nasa.gov/planets/approx_pos.html>.
//!
//! Copied digit for digit from `packages/ephemeris/src/elements.ts`; diff the two lists
//! before changing either. Each row: a (au), e, I (deg), L (deg), longitude of perihelion
//! (deg), longitude of the ascending node (deg), then the same quantities' rates per
//! Julian century. "earth" is the Earth-Moon barycentre, as in the source table.

use crate::bodies::{AU_KM, BodyId};
use crate::kepler::ClassicalElements;
use crate::time::{DAYS_PER_JULIAN_CENTURY, SECONDS_PER_DAY};
use starshot_math::DEG;

/// Semi-major axis [au], eccentricity, inclination [deg], mean longitude [deg],
/// longitude of perihelion [deg] and longitude of the ascending node [deg].
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ElementSet {
    pub a: f64,
    pub e: f64,
    pub i: f64,
    pub l: f64,
    pub varpi: f64,
    pub node: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PlanetElements {
    pub epoch: ElementSet,
    pub rate_per_century: ElementSet,
}

const fn row(a: f64, e: f64, i: f64, l: f64, varpi: f64, node: f64) -> ElementSet {
    ElementSet {
        a,
        e,
        i,
        l,
        varpi,
        node,
    }
}

const fn planet(epoch: ElementSet, rate_per_century: ElementSet) -> PlanetElements {
    PlanetElements {
        epoch,
        rate_per_century,
    }
}

/// Table 1, Mercury to Neptune, in `PLANET_IDS` order.
#[rustfmt::skip]
pub const APPROX_ELEMENTS: [PlanetElements; 8] = [
    planet(row(0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593),
           row(0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081)),
    planet(row(0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255),
           row(0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418)),
    planet(row(1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0),
           row(0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0)),
    planet(row(1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891),
           row(0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343)),
    planet(row(5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909),
           row(-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106)),
    planet(row(9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448),
           row(-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794)),
    planet(row(19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503),
           row(-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589)),
    planet(row(30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574),
           row(0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664)),
];

/// First and last Julian dates (TDB) for which JPL publishes Table 1's accuracy.
pub const APPROX_VALID_JD: (f64, f64) = (2378496.5, 2469807.5);

const SECONDS_PER_CENTURY: f64 = DAYS_PER_JULIAN_CENTURY * SECONDS_PER_DAY;

/// Classical elements of a planet at ET, following JPL's recipe, as `planetElements`.
/// Panics for a body Table 1 does not list: that is a programming error, not input.
pub fn planet_elements(id: BodyId, et: f64) -> ClassicalElements {
    let index = id
        .planet_index()
        .unwrap_or_else(|| panic!("Table 1 has no elements for {id}"));
    let PlanetElements {
        epoch,
        rate_per_century: rate,
    } = APPROX_ELEMENTS[index];
    let t = et / SECONDS_PER_CENTURY;
    let a = (epoch.a + rate.a * t) * AU_KM;
    let e = epoch.e + rate.e * t;
    let i = (epoch.i + rate.i * t) * DEG;
    let l = (epoch.l + rate.l * t) * DEG;
    let varpi = (epoch.varpi + rate.varpi * t) * DEG;
    let node = (epoch.node + rate.node * t) * DEG;
    // Mean motion of the mean anomaly M = L - varpi, from the published rates.
    let n = ((rate.l - rate.varpi) * DEG) / SECONDS_PER_CENTURY;
    ClassicalElements {
        a,
        e,
        i,
        node,
        arg_peri: varpi - node,
        m: l - varpi,
        n,
    }
}
