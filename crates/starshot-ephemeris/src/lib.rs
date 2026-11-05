//! Where the planets are, in the Rust core (D16): the port of `@starshot/ephemeris`.
//!
//! Time scales, bodies and NASA/JPL's Table 1 with its Kepler solver, behind the
//! `Ephemeris` trait the physics crate consumes. Units are km, km/s and seconds of ET
//! (TDB past J2000) in the heliocentric ecliptic J2000 frame.
//!
//! The port keeps the TypeScript operation order. Arithmetic-only paths then give the
//! same bits as the TypeScript; paths through `sin` and `cos` agree within the bounds
//! `tests/conformance_table1.rs` states. `pow` is used only for the sphere of influence,
//! and its one difference, Saturn's at 1 to 2 ulp from V8, is a row of the deviation log
//! (`docs/plans/v1-starshot/05-deviation-log.md`). Every transcendental function comes
//! from `starshot-math`, which is this crate's only dependency (D29, stage 3 of the
//! growth path).

#![forbid(unsafe_code)]

pub mod bodies;
pub mod ephemeris;
pub mod kepler;
pub mod table1;
pub mod time;
pub mod vec;

pub use bodies::{AU_KM, BodyId, BodyInfo, EARTH_ONLY_GM, PLANET_IDS, sphere_of_influence_km};
pub use ephemeris::{
    Ephemeris, State, Table1Ephemeris, orbit_path, orbital_period_seconds, planet_state,
};
pub use kepler::{ClassicalElements, solve_kepler, state_from_elements, wrap_pi};
pub use table1::{APPROX_ELEMENTS, APPROX_VALID_JD, planet_elements};
pub use time::{
    TimeError, et_from_iso, et_from_jd_tdb, et_from_unix_ms, jd_tdb_from_et, tt_minus_utc,
    unix_ms_from_et,
};
pub use vec::Vec3;
