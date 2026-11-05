//! Today's `simulate` tests (`packages/physics/test/physics.test.ts`) with today's
//! assertions, the edges of a flight (its time limit, its step limit, sampling outside
//! it), and the timing budget of a live aiming preview.

use core::f64::consts::PI;
use starshot_ephemeris::time::SECONDS_PER_DAY as DAY;
use starshot_ephemeris::vec::{Vec3, add, dot, norm, scale, sub};
use starshot_ephemeris::{AU_KM, BodyId, Ephemeris, Table1Ephemeris, et_from_iso};
use starshot_math::{cos, pow, sin, sqrt};
use starshot_physics::{
    SimulationConfig, SimulationResult, Termination, best_direct_transfer, departure_state,
    lambert, sample_at, simulate,
};
use std::time::Instant;

const EPH_3D: Table1Ephemeris = Table1Ephemeris { flatten: false };
const EPH_2D: Table1Ephemeris = Table1Ephemeris { flatten: true };

fn mu_sun() -> f64 {
    BodyId::Sun.info().gm
}

fn energy(r: Vec3, v: Vec3) -> f64 {
    dot(v, v) / 2.0 - mu_sun() / norm(r)
}

fn date(iso: &str) -> f64 {
    et_from_iso(iso).expect("date")
}

/// A Sun-only circular orbit at 1 au from ET 0.
fn circular(duration: f64) -> SimulationConfig<'static> {
    let (r0, v0) = ([AU_KM, 0.0, 0.0], [0.0, sqrt(mu_sun() / AU_KM), 0.0]);
    SimulationConfig {
        attractors: Some(&[]),
        ..SimulationConfig::new(&EPH_3D, 0.0, r0, v0, duration)
    }
}

#[test]
fn a_circular_1_au_orbit_closes_within_10_km_and_ends_on_its_time_limit() {
    let period = 2.0 * PI * sqrt(pow(AU_KM, 3.0) / mu_sun());
    let res = simulate(&circular(period));
    let (start, end) = (res.samples[0], res.samples[res.samples.len() - 1]);
    let gap = norm(sub(end.r, start.r));
    let drift = (energy(end.r, end.v) / energy(start.r, start.v) - 1.0).abs();
    println!(
        "simulate: closed within {gap:.6} km, drift {drift:e}, {} steps",
        res.steps
    );
    assert_eq!(res.termination, Termination::Duration);
    assert_eq!(res.terminated_by, None);
    // The last step is cut to land on t0 + duration, not near it.
    assert_eq!(end.t.to_bits(), period.to_bits());
    assert_eq!(res.end_time.to_bits(), period.to_bits());
    assert!(gap < 10.0, "{gap} km from the start after one period");
    assert!(drift < 1e-7, "relative energy drift {drift}");
}

#[test]
fn interpolates_between_samples_smoothly() {
    let res = simulate(&circular(200.0 * DAY));
    let mid = sample_at(&res, 100.3 * DAY);
    let off = (norm(mid.r) / AU_KM - 1.0).abs();
    assert_eq!(mid.t, 100.3 * DAY);
    assert!(off < 1e-6, "radius off by {off} relative");
    // Every sample of a circular orbit is at 1 au, so the radius alone cannot tell the
    // interpolation from the nearest sample; the exact orbit can, a step being days long.
    let n = sqrt(mu_sun() / pow(AU_KM, 3.0));
    let exact = |t: f64| [AU_KM * cos(n * t), AU_KM * sin(n * t), 0.0];
    let times = (0..200).map(|k| (f64::from(k) + 0.37) * DAY);
    let gaps: Vec<f64> = times
        .map(|t| norm(sub(sample_at(&res, t).r, exact(t))))
        .collect();
    let worst = gaps.iter().copied().fold(0.0, f64::max);
    println!("simulate: sample_at within {worst:.3} km of the exact circular orbit");
    assert!(
        gaps.iter().all(|&gap| gap < 50.0),
        "{worst} km from the exact orbit"
    );
}

#[test]
fn stops_at_the_step_limit_and_samples_clamp_outside_the_flight() {
    let res = simulate(&SimulationConfig {
        max_steps: 5,
        ..circular(200.0 * DAY)
    });
    assert_eq!(res.termination, Termination::MaxSteps);
    assert_eq!((res.steps, res.samples.len()), (5, 6));
    let last = res.samples[5];
    assert_eq!(sample_at(&res, -DAY), res.samples[0]);
    assert_eq!(sample_at(&res, last.t + DAY), last);
}

#[test]
fn reaches_mars_within_1_25_spheres_of_influence_with_the_2026_lambert_aim() {
    let start = date("2026-10-15");
    let launches: Vec<f64> = (0..20).map(|k| start + f64::from(k) * 3.0 * DAY).collect();
    let tofs: Vec<f64> = (0..30).map(|k| f64::from(150 + k * 8) * DAY).collect();
    let best = best_direct_transfer(&EPH_2D, BodyId::Earth, BodyId::Mars, &launches, &tofs)
        .expect("a transfer");
    let s0 = departure_state(&EPH_2D, best.launch_et, best.v_inf);
    let res = simulate(&SimulationConfig {
        stop_at_soi_of: Some(BodyId::Mars),
        depart_from: Some(BodyId::Earth),
        ..SimulationConfig::new(&EPH_2D, best.launch_et, s0.r, s0.v, best.tof * 1.3)
    });
    // The two-body minimum (2.98 km/s, 326 days) misses by about 1.14 spheres of influence
    // in the full simulator, because the planets perturb it (D11).
    let closest = res.closest[BodyId::Mars as usize].expect("a Mars approach");
    let ratio = closest.distance_km / EPH_2D.soi_km(BodyId::Mars, best.launch_et);
    println!("simulate: Mars 2026 Lambert aim passes at {ratio:.4} spheres of influence");
    assert!(ratio < 1.25, "{ratio} spheres of influence");
}

#[test]
fn switches_earths_gravity_on_energy_consistently_exactly_once() {
    let (t0, duration) = (date("2026-11-20"), 20.0 * DAY);
    let s0 = departure_state(&EPH_2D, t0, [0.0, 3.2, 0.0]);
    let run = |attractors: &[BodyId]| {
        simulate(&SimulationConfig {
            attractors: Some(attractors),
            depart_from: Some(BodyId::Earth),
            ..SimulationConfig::new(&EPH_2D, t0, s0.r, s0.v, duration)
        })
    };
    let (on, off) = (run(&[BodyId::Earth]), run(&[]));
    // The kick is a second knot at the same instant; there is exactly one.
    let s = &on.samples;
    let kicks: Vec<usize> = (1..s.len()).filter(|&i| s[i - 1].t == s[i].t).collect();
    assert_eq!(kicks.len(), 1, "kicks at {kicks:?}");
    let (before, after) = (s[kicks[0] - 1], s[kicks[0]]);
    // Until the switch the two runs are the same flight.
    let twin = off.samples[kicks[0] - 1];
    assert_eq!(before.t, twin.t);
    assert!(norm(sub(before.r, twin.r)) < 1e-6);
    let earth = EPH_2D.state(BodyId::Earth, before.t);
    let d = norm(sub(before.r, earth.r));
    assert!(
        d > 2.0 * EPH_2D.soi_km(BodyId::Earth, t0),
        "switched at {d} km"
    );
    let (u0, u1) = (norm(sub(before.v, earth.v)), norm(sub(after.v, earth.v)));
    // (speed after)^2 - 2 mu / d is (speed before)^2: the energy Earth takes back on the
    // way out is added once, so the probe still leaves at the excess speed.
    let gm = BodyId::Earth.info().gm;
    let off_by = ((u1 * u1 - (2.0 * gm) / d) / (u0 * u0) - 1.0).abs();
    println!("simulate: switch-on at {d:.0} km, energy off by {off_by:e}");
    assert!(off_by < 1e-12, "energy off by {off_by}");
    let end = s[s.len() - 1];
    assert_eq!(
        end.t.to_bits(),
        (t0 + duration).to_bits(),
        "ends on t0 + duration"
    );
}

#[test]
fn detects_a_jupiter_flyby_and_the_energy_it_gives() {
    let (t0, tof) = (date("1977-08-20"), 700.0 * DAY);
    let jup = EPH_2D.state(BodyId::Jupiter, t0 + tof);
    // Aim 25 Jupiter radii outside Jupiter's orbit: a near miss, not a hit.
    let outward = (25.0 * BodyId::Jupiter.info().radius_km) / norm(jup.r);
    let aim = add(jup.r, scale(jup.r, outward));
    let earth = EPH_2D.state(BodyId::Earth, t0);
    let (v1, _) = lambert(earth.r, aim, tof, mu_sun(), true).expect("a solution");
    let res = simulate(&SimulationConfig {
        attractors: Some(&[BodyId::Jupiter]),
        ..SimulationConfig::new(&EPH_2D, t0, earth.r, v1, tof + 200.0 * DAY)
    });
    let flyby = res
        .encounters
        .iter()
        .find(|e| e.body == BodyId::Jupiter && e.inside_soi)
        .expect("a flyby inside Jupiter's sphere of influence");
    assert!(!flyby.impact);
    let before = sample_at(&res, flyby.t - 60.0 * DAY);
    let after = sample_at(&res, flyby.t + 60.0 * DAY);
    let (e0, e1) = (energy(before.r, before.v), energy(after.r, after.v));
    let swap = (e1 - e0).abs() / e0.abs();
    println!(
        "simulate: Jupiter flyby at {:.0} km swaps {swap:.3} of the energy",
        flyby.distance_km
    );
    // A close flyby swaps a large share of orbital energy with the planet.
    assert!(swap > 0.05, "{swap}");
}

#[test]
fn stops_on_impact_when_aimed_straight_at_a_planet() {
    let (t0, tof) = (date("2026-11-20"), 220.0 * DAY);
    let earth = EPH_2D.state(BodyId::Earth, t0);
    let mars = EPH_2D.state(BodyId::Mars, t0 + tof);
    let (v1, _) = lambert(earth.r, mars.r, tof, mu_sun(), true).expect("a solution");
    let res = simulate(&SimulationConfig {
        attractors: Some(&[BodyId::Mars]),
        ..SimulationConfig::new(&EPH_2D, t0, earth.r, v1, tof * 1.2)
    });
    assert_eq!(res.termination, Termination::Impact);
    assert_eq!(res.terminated_by, Some(BodyId::Mars));
}

/// A straight pass by Mars at 50 km/s, aimed `miss` km from its centre, from 100,000 km
/// out. Mars bends a pass this fast by under 1 percent.
fn pass_by_mars(miss: f64) -> SimulationResult {
    let t = date("2026-11-20");
    let mars = EPH_2D.state(BodyId::Mars, t + 2000.0);
    let r0 = add(sub(mars.r, scale(mars.v, 2000.0)), [miss, 0.0, -100_000.0]);
    let cfg = SimulationConfig {
        attractors: Some(&[BodyId::Mars]),
        ..SimulationConfig::new(&EPH_2D, t, r0, add(mars.v, [0.0, 0.0, 50.0]), 4000.0)
    };
    simulate(&cfg)
}

#[test]
fn an_impact_is_a_pass_inside_the_surface_radius() {
    let radius = BodyId::Mars.info().radius_km;
    let (hit, miss) = (pass_by_mars(0.8 * radius), pass_by_mars(1.2 * radius));
    let near = |res: &SimulationResult| res.closest[BodyId::Mars as usize].expect("a pass");
    let (h, m) = (near(&hit), near(&miss));
    println!(
        "simulate: passes at {:.3} and {:.3} radii",
        h.distance_km / radius,
        m.distance_km / radius
    );
    assert_eq!(
        (hit.termination, hit.terminated_by),
        (Termination::Impact, Some(BodyId::Mars))
    );
    assert!(h.impact && h.distance_km < radius);
    assert_eq!(miss.termination, Termination::Duration);
    assert!(!m.impact && m.distance_km > radius);
}

#[test]
fn a_three_year_preview_takes_under_400_ms() {
    let t0 = date("2026-11-20");
    let s0 = departure_state(&EPH_2D, t0, [-1.5, 3.5, 0.0]);
    let cfg = SimulationConfig {
        rtol: 1e-8,
        atol_km: 50.0,
        depart_from: Some(BodyId::Earth),
        ..SimulationConfig::new(&EPH_2D, t0, s0.r, s0.v, 3.0 * 365.0 * DAY)
    };
    let clock = Instant::now();
    let res = simulate(&cfg);
    let ms = clock.elapsed().as_secs_f64() * 1000.0;
    println!(
        "simulate: 3-year preview, {} steps in {ms:.2} ms",
        res.steps
    );
    assert!(res.steps > 10);
    assert!(ms < 400.0, "{ms} ms");
}
