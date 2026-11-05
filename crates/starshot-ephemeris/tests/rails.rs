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
