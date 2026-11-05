//! The rails reader on the committed pack: the boundary rules and malformed files.

mod common;

use common::{DECADE_FILES, full_pack};
use starshot_ephemeris::rails::decade_start_et;
use starshot_ephemeris::{PackError, RailBody, RailPack};

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
    // A moved end, which only parse's span check sees: load_decade looks up the start.
    assert_eq!(
        with(24, &(span.1 + 1.0).to_le_bytes()),
        Err(PackError::NotADecade(span.0, span.1 + 1.0))
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

/// A 2140 decade file holding only the Moon at degree 1: `segments` declared, at most
/// three written, every axis's c0 and c1 set to `c`.
fn moon_2140(segments: u32, segment_s: f64, c: (f64, f32)) -> Vec<u8> {
    let span = [2140, 2150].map(|y| decade_start_et(y).to_le_bytes());
    let mut file = [&b"SSEP\x01\0\x01\0"[..], &[0; 8], &span[0], &span[1]].concat();
    file.extend([301u16.to_le_bytes(), 1u16.to_le_bytes()].concat());
    file.extend(segments.to_le_bytes());
    file.extend(segment_s.to_le_bytes());
    // The data offset, just past the header and the one table entry; then reserved 0.
    file.extend([56u32, 0].map(u32::to_le_bytes).concat());
    for _ in 0..segments.min(3) {
        file.extend([c.0; 3].map(f64::to_le_bytes).concat());
        file.extend([c.1; 3].map(f32::to_le_bytes).concat());
    }
    file
}

#[test]
fn hand_built_decades_meet_each_guard() {
    let span = decade_start_et(2150) - decade_start_et(2140);
    let load =
        |segments, segment_s, c| RailPack::new().load_decade(&moon_2140(segments, segment_s, c));
    let zero = (0.0, 0.0);
    // u32::MAX segments: the file-end check refuses them before a 206 GB allocation.
    let tiny = span / (f64::from(u32::MAX) - 0.5);
    assert_eq!(load(u32::MAX, tiny, zero), Err(PackError::DataOffset(301)));
    assert_eq!(load(1, 0.0, zero), Err(PackError::BadEntry(301)));
    assert_eq!(
        load(1, span, (0.0, f32::NAN)),
        Err(PackError::BadCoefficient(301))
    );
    assert_eq!(
        load(1, span, (f64::INFINITY, 0.0)),
        Err(PackError::BadCoefficient(301))
    );
    // Just under half the decade tiles it in three, but the third starts at its end.
    let half = (span / 2.0).next_down();
    assert_eq!(load(3, half, zero), Err(PackError::SegmentCount(301)));
    // One segment as long as the decade: the pack's last instant is x = 1 in it, so
    // c0 + c1 = 1.5 on each axis.
    let mut pack = RailPack::new();
    pack.load_decade(&moon_2140(1, span, (1.0, 0.5)))
        .expect("one segment");
    assert_eq!(
        pack.position(RailBody::Moon, pack.coverage().1),
        Some([1.5; 3])
    );
}
