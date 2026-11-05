//! The rails reader on the committed pack: against Horizons within the 150 km budget
//! (AC4, D17), against `tools/ephem`'s own evaluation (`fixtures/conformance/rails.json`)
//! bit for bit (the spec asks 1 m), the pack's recorded constants, the boundary rules
//! and malformed files.

mod common;

use common::{DECADE_FILES, bits, dist, fnv1a64, full_pack, num, parse, planet, rail_body, vec3};
use starshot_ephemeris::rails::{PACK_END_YEAR, PACK_FIRST_YEAR, decade_start_et};
use starshot_ephemeris::{
    BodyId, EMRAT, Ephemeris, PackError, RailBody, RailEphemeris, RailPack, Table1Ephemeris,
    et_from_jd_tdb,
};

const PACK_JSON: &str = include_str!("../../../data/ephem/de440s-100km/pack.json");
const HORIZONS: &str = include_str!("../../../fixtures/horizons/horizons.json");
const RAILS: &str = include_str!("../../../fixtures/conformance/rails.json");

/// AC4 and D17: every body within 150 km of JPL, the geocentric Moon included.
const BUDGET_KM: f64 = 150.0;
/// The reader's velocity budgets against Horizons [km/s] (PR10 edge cases): PR8 fitted and
/// checked positions only. Measured at the five epochs on 2026-11-05: planets up to
/// 8.5e-4 (Mars), Earth's centre 1.3e-4, the Moon 5.6e-3; PR8's physics audit found the
/// Moon's differentiated fit up to 6.36e-3 between them. Earth's centre takes the planets'.
const PLANET_VELOCITY_KMS: f64 = 2e-3;
const MOON_VELOCITY_KMS: f64 = 1e-2;

#[test]
fn the_pack_matches_its_manifest_build_emrat_and_coverage() {
    let manifest = parse(PACK_JSON);
    // G8: the FNV-1a 64 of every decade file's data section, in order, is pack.json's
    // `build`, and every header carries it.
    let build = DECADE_FILES.iter().fold(0xcbf2_9ce4_8422_2325, |h, file| {
        let bodies = usize::from(u16::from_le_bytes([file[6], file[7]]));
        fnv1a64(h, &file[32 + 24 * bodies..])
    });
    assert_eq!(
        format!("{build:016x}"),
        manifest["build"].as_str().expect("build")
    );
    let pack = full_pack();
    assert_eq!(pack.pack_build(), Some(build));
    assert_eq!(
        EMRAT.to_bits(),
        num(&manifest["constants"]["emrat"]).to_bits()
    );
    let (from, to) = pack.coverage();
    assert_eq!(
        (from, to),
        (
            decade_start_et(PACK_FIRST_YEAR),
            decade_start_et(PACK_END_YEAR)
        )
    );
    for body in manifest["bodies"].as_array().expect("bodies") {
        assert_eq!(
            (from, to),
            (num(&body["coverage_et"][0]), num(&body["coverage_et"][1]))
        );
        assert_eq!(
            rail_body(body["id"].as_str().expect("id")).code(),
            body["naif_id"].as_u64().expect("naif") as u16
        );
    }
    let decades = manifest["decades"].as_array().expect("decades");
    for (k, d) in decades.iter().enumerate() {
        let year = PACK_FIRST_YEAR + 10 * k as i64;
        assert_eq!(d["file"], format!("{year}.bin"));
        assert_eq!(
            (num(&d["from_et"]), num(&d["to_et"])),
            (decade_start_et(year), decade_start_et(year + 10))
        );
        assert_eq!(d["bytes"].as_u64(), Some(DECADE_FILES[k].len() as u64));
    }
}

#[test]
fn every_body_is_within_150_km_of_horizons_at_every_epoch() {
    let fixture = parse(HORIZONS);
    let pack = full_pack();
    let eph = RailEphemeris::new(pack.clone(), false);
    let mut cases: Vec<(&str, &serde_json::Value, f64)> = [
        "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune",
    ]
    .into_iter()
    .map(|name| (name, &fixture["states"][name], PLANET_VELOCITY_KMS))
    .collect();
    cases.push(("moon", &fixture["geocentric"]["moon"], MOON_VELOCITY_KMS));
    cases.push((
        "earth centre",
        &fixture["heliocentric_extra"]["earth"],
        PLANET_VELOCITY_KMS,
    ));
    for (what, refs, velocity_kms) in cases {
        let refs = refs.as_array().expect("epochs");
        assert_eq!(
            refs.len(),
            5,
            "{what}: every fixture epoch is inside coverage"
        );
        let (mut worst_r, mut worst_v) = (0.0_f64, 0.0_f64);
        for reference in refs {
            let et = et_from_jd_tdb(num(&reference["jdTdb"]));
            let s = match what {
                "moon" => pack.state(RailBody::Moon, et).expect("Moon loaded"),
                "earth centre" => eph.earth_centre(et),
                name => eph.state(planet(name), et),
            };
            let (dr, dv) = (
                dist(s.r, vec3(&reference["r"])),
                dist(s.v, vec3(&reference["v"])),
            );
            assert!(dr < BUDGET_KM, "{what} at ET {et}: {dr} km from Horizons");
            assert!(
                dv < velocity_kms,
                "{what} at ET {et}: {dv} km/s from Horizons"
            );
            (worst_r, worst_v) = (worst_r.max(dr), worst_v.max(dv));
        }
        println!("{what}: worst {worst_r:.3} km and {worst_v:.3e} km/s against Horizons");
    }
}

#[test]
fn the_reader_reproduces_tools_ephem_bit_for_bit() {
    let file = parse(RAILS);
    assert_eq!(file["schema"], "starshot.conformance-rails/1");
    assert_eq!(file["pack"]["build"], parse(PACK_JSON)["build"]);
    let pack = full_pack();
    let points = file["points"].as_array().expect("points");
    assert_eq!(points.len(), 2719);
    let (mut worst, mut equal) = (0.0_f64, 0);
    for p in points {
        let body = rail_body(p[0].as_str().expect("body"));
        let et = bits(&p[1]);
        let want = [bits(&p[2]), bits(&p[3]), bits(&p[4])];
        let got = pack.position(body, et).expect("inside coverage");
        let d = dist(got, want);
        assert!(d < 1e-3, "{body:?} at ET {et}: {d} km from tools/ephem");
        assert_eq!(
            pack.state(body, et).map(|s| s.r),
            Some(got),
            "state and position share bits"
        );
        (worst, equal) = (worst.max(d), equal + usize::from(got == want));
    }
    println!(
        "rails.json: worst {worst:e} km; {equal} of {} points equal bit for bit",
        points.len()
    );
    // Tighter than the 1 m the spec asks: evaluation is adds and multiplies in the
    // tool's order (D16), so every point is the same bits as numpy's.
    assert_eq!(
        equal,
        points.len(),
        "points that differ from tools/ephem in a bit"
    );
}

#[test]
fn boundaries_nan_and_coverage_follow_the_rules() {
    let (from, to) = RailPack::new().coverage();
    let edge = decade_start_et(2020);
    let mut later = RailPack::new();
    later.load_decade(DECADE_FILES[7]).expect("2020");
    let mut earlier = RailPack::new();
    earlier.load_decade(DECADE_FILES[6]).expect("2010");
    // A decade edge belongs to the decade that starts there.
    assert!(
        later.position(RailBody::Moon, edge).is_some()
            && earlier.position(RailBody::Moon, edge).is_none()
    );
    assert_eq!(RailPack::decade_year(edge), Some(2020));
    assert_eq!(RailPack::decade_year(edge - 1e-6), Some(2010));
    // The pack's last instant belongs to the last segment; past it there is nothing.
    let pack = full_pack();
    assert_eq!(RailPack::decade_year(to), Some(2140));
    assert!(pack.position(RailBody::Neptune, to).is_some());
    for et in [f64::NAN, to + 1e-6, from - 1e-6, f64::INFINITY] {
        assert_eq!(pack.position(RailBody::Mars, et), None, "{et}");
        assert!(!pack.is_loaded(et));
    }
}

#[test]
fn outside_coverage_the_planets_are_table_1() {
    let eph = RailEphemeris::new(RailPack::new(), true);
    let et = decade_start_et(1950) - 86400.0;
    for id in [BodyId::Mars, BodyId::Earth] {
        assert_eq!(
            eph.state(id, et),
            Table1Ephemeris { flatten: true }.state(id, et)
        );
    }
    assert_eq!(
        eph.soi_km(BodyId::Mars, 0.0),
        Table1Ephemeris::default().soi_km(BodyId::Mars, 0.0)
    );
}

#[test]
#[should_panic(expected = "decade 2020 not loaded")]
fn inside_coverage_an_unloaded_decade_panics() {
    let mut pack = RailPack::new();
    pack.load_decade(DECADE_FILES[6]).expect("2010");
    RailEphemeris::new(pack, false).state(BodyId::Mars, decade_start_et(2021));
}

#[test]
#[should_panic(expected = "no Moon rail")]
fn outside_coverage_the_moon_panics() {
    RailEphemeris::new(full_pack(), false).state(BodyId::Moon, decade_start_et(2150) + 1.0);
}

#[test]
#[should_panic(expected = "NaN ET")]
fn a_nan_et_panics() {
    RailEphemeris::new(full_pack(), false).state(BodyId::Venus, f64::NAN);
}

#[test]
fn the_moon_and_earths_centre_split_the_barycentre_with_emrat() {
    let eph = RailEphemeris::new(full_pack(), true);
    let et = 846853269.184;
    let (moon, earth, emb) = (
        eph.state(BodyId::Moon, et),
        eph.earth_centre(et),
        eph.state(BodyId::Earth, et),
    );
    assert_eq!(
        (moon.r[2], earth.r[2], emb.v[2]),
        (0.0, 0.0, 0.0),
        "flattened"
    );
    let back = (earth.r[0] * EMRAT + moon.r[0]) / (EMRAT + 1.0);
    assert!(
        (back - emb.r[0]).abs() < 1e-6,
        "the barycentre comes back within 1 mm"
    );
    assert!(eph.bodies().contains(&BodyId::Moon) && eph.flattened());
}

#[test]
fn malformed_files_are_refused_never_read() {
    let good = DECADE_FILES[7];
    let with = |at: usize, bytes: &[u8]| {
        let mut file = good.to_vec();
        file[at..at + bytes.len()].copy_from_slice(bytes);
        RailPack::new().load_decade(&file)
    };
    let span = (decade_start_et(2020), decade_start_et(2030));
    assert_eq!(
        RailPack::new().load_decade(&good[..31]),
        Err(PackError::TooShort)
    );
    assert_eq!(with(0, b"SSEQ"), Err(PackError::BadMagic));
    assert_eq!(with(4, &2u16.to_le_bytes()), Err(PackError::BadVersion(2)));
    assert_eq!(
        with(16, &(span.0 + 1.0).to_le_bytes()),
        Err(PackError::NotADecade(span.0 + 1.0, span.1))
    );
    assert_eq!(
        with(6, &u16::MAX.to_le_bytes()),
        Err(PackError::TableOutOfBounds)
    );
    assert_eq!(
        with(32, &9u16.to_le_bytes()),
        Err(PackError::UnknownBody(9))
    );
    assert_eq!(
        with(56, &1u16.to_le_bytes()),
        Err(PackError::DuplicateBody(1))
    );
    assert_eq!(with(34, &0u16.to_le_bytes()), Err(PackError::BadEntry(1)));
    assert_eq!(with(52, &1u32.to_le_bytes()), Err(PackError::BadEntry(1)));
    assert_eq!(
        with(40, &f64::NAN.to_le_bytes()),
        Err(PackError::BadEntry(1))
    );
    assert_eq!(
        with(36, &7u32.to_le_bytes()),
        Err(PackError::SegmentCount(1))
    );
    assert_eq!(with(48, &0u32.to_le_bytes()), Err(PackError::DataOffset(1)));
    assert_eq!(
        RailPack::new().load_decade(&good[..good.len() - 1]),
        Err(PackError::DataOffset(301))
    );
    assert_eq!(
        RailPack::new().load_decade(&[good, &[0]].concat()),
        Err(PackError::TrailingBytes)
    );
    let mut pack = full_pack();
    assert_eq!(
        with(8, &1u64.to_le_bytes()),
        Ok(()),
        "a lone decade loads with any build"
    );
    let mut other = good.to_vec();
    other[8..16].copy_from_slice(&1u64.to_le_bytes());
    let loaded = pack.pack_build().expect("loaded");
    assert_eq!(
        pack.load_decade(&other),
        Err(PackError::MixedBuilds { loaded, file: 1 })
    );
    // Truncated anywhere and with any header byte flipped: an error or a load, never a panic.
    for len in (0..good.len()).step_by(97).chain(0..300) {
        assert!(
            RailPack::new().load_decade(&good[..len]).is_err(),
            "{len} bytes"
        );
    }
    for at in 0..32 + 24 * 9 {
        for flip in [0x01, 0x80, 0xff] {
            let mut file = good.to_vec();
            file[at] ^= flip;
            let _ = RailPack::new().load_decade(&file);
        }
    }
}
