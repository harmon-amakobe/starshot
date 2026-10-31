/**
 * NASA/JPL "Keplerian Elements for Approximate Positions of the Major
 * Planets", Table 1 (E M Standish), valid 1800 AD - 2050 AD, referred to the
 * mean ecliptic and equinox of J2000.
 * Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 *
 * Each row: [a (au), e, I (deg), L (deg), long.peri (deg), long.node (deg)],
 * followed by the same quantities' rates per Julian century.
 * "earth" is the Earth-Moon barycenter, as in the source table.
 *
 * JPL's stated accuracy for this table over 1800-2050 is tens of arcseconds
 * for the inner planets and up to about 10 arcminutes for Jupiter and Saturn,
 * which is ample for a game and a map.
 */
export type PlanetId =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export interface ElementSet {
  /** semi-major axis [au], eccentricity, inclination [deg], mean longitude [deg], longitude of perihelion [deg], longitude of ascending node [deg] */
  readonly a: number;
  readonly e: number;
  readonly i: number;
  readonly L: number;
  readonly varpi: number;
  readonly node: number;
}

export interface PlanetElements {
  readonly epoch: ElementSet;
  readonly ratePerCentury: ElementSet;
}

const row = (a: number, e: number, i: number, L: number, varpi: number, node: number): ElementSet => ({
  a, e, i, L, varpi, node,
});

export const APPROX_ELEMENTS: Readonly<Record<PlanetId, PlanetElements>> = {
  mercury: {
    epoch: row(0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593),
    ratePerCentury: row(0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081),
  },
  venus: {
    epoch: row(0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255),
    ratePerCentury: row(0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418),
  },
  earth: {
    epoch: row(1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0),
    ratePerCentury: row(0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0),
  },
  mars: {
    epoch: row(1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891),
    ratePerCentury: row(0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343),
  },
  jupiter: {
    epoch: row(5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909),
    ratePerCentury: row(-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106),
  },
  saturn: {
    epoch: row(9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448),
    ratePerCentury: row(-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794),
  },
  uranus: {
    epoch: row(19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503),
    ratePerCentury: row(-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589),
  },
  neptune: {
    epoch: row(30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574),
    ratePerCentury: row(0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664),
  },
};

/** First and last Julian dates (TDB) for which JPL publishes Table 1 accuracy. */
export const APPROX_VALID_JD = { start: 2378496.5, end: 2469807.5 } as const;
