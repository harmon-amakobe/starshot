//! The DE440 rails reader (D17): `ephem.pack/1` decade files from `data/ephem/de440s-100km`,
//! evaluated with adds, multiplies and divides; no transcendental call. IEEE 754 rounds
//! each correctly and floor is exact, so every runtime gives the same bits.
//!
//! A decade file (little-endian): "SSEP", u16 version 1, u16 body count, u64 pack build
//! (FNV-1a 64 over the data sections of all decade files), f64 start and end ET; then 24
//! bytes per body (u16 code, u16 degree, u32 segment count, f64 segment length [s], u32
//! data offset, u32 reserved 0); then per body, per segment, the f64 c0 of x, y and z and
//! the f32 c1..c_degree of x, then y, then z. Segments tile the decade from its start; the
//! last ends at the decade's end and maps its own shorter span to -1 to 1. The reader
//! refuses a structurally malformed file, non-finite data and a build that differs from
//! the decades already loaded, so a bad file is an error, never a read out of bounds.
//! Content integrity (a flipped mantissa bit, a changed segment length that still tiles)
//! is the loader's job: pack.json's SHA-256 of each file covers both, and the FNV-1a
//! build covers the data sections.
//!
//! Evaluation follows `tools/ephem`'s `pack.Pack.position` and `chebyshev.evaluate` step
//! for step, in their operation order, so it gives their bits. A time on a segment or
//! decade boundary takes the later segment, except the pack's last instant, which belongs
//! to the last segment.

use crate::bodies::RailBody;
use crate::ephemeris::State;
use crate::time::days_from_civil;
use crate::vec::Vec3;
use core::fmt;

/// ET of `YYYY-01-01T00:00:00` TDB: whole days from 2000-01-01, less the 12 hours between
/// that midnight and J2000's noon, as `pack.decade_start_et`.
pub const fn decade_start_et(year: i64) -> f64 {
    ((days_from_civil(year, 1, 1) - days_from_civil(2000, 1, 1)) * 86400 - 43200) as f64
}

/// The committed pack's first decade, and the year its last decade ends.
pub const PACK_FIRST_YEAR: i64 = 1950;
pub const PACK_END_YEAR: i64 = 2150;
const DECADES: usize = ((PACK_END_YEAR - PACK_FIRST_YEAR) / 10) as usize;

const STARTS: [f64; DECADES + 1] = {
    let mut starts = [0.0; DECADES + 1];
    let mut k = 0;
    while k <= DECADES {
        starts[k] = decade_start_et(PACK_FIRST_YEAR + 10 * k as i64);
        k += 1;
    }
    starts
};

const HEADER: usize = 32;
const ENTRY: usize = 24;

/// Why a decade file was refused. Each names what was checked: the file's structure, its
/// finite data and its build against the decades already loaded. A corruption that keeps
/// all three still loads; the loader's SHA-256 check of each file catches it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PackError {
    /// Shorter than the 32-byte header.
    TooShort,
    /// The first four bytes are not "SSEP".
    BadMagic,
    /// A format version other than 1.
    BadVersion(u16),
    /// The span is not one of the pack's decades, 1950 to 2150 (ET start and end).
    NotADecade(f64, f64),
    /// The body table runs past the end of the file.
    TableOutOfBounds,
    /// A body code other than 1 to 8 and 301.
    UnknownBody(u16),
    /// The same body twice in one file.
    DuplicateBody(u16),
    /// Degree 0, a segment length that is not finite and positive, or a reserved field
    /// that is not 0.
    BadEntry(u16),
    /// The segment count does not tile the decade, or the last segment would start at or
    /// after the decade's end, leaving it a span of 0.
    SegmentCount(u16),
    /// A data section does not start where the previous one ends, or runs past the file.
    DataOffset(u16),
    /// A c0 or a widened f32 coefficient is NaN or infinite: it would load, then positions
    /// in its segment would be NaN or infinite.
    BadCoefficient(u16),
    /// Bytes after the last data section.
    TrailingBytes,
    /// The file's pack build differs from that of the decades already loaded: two
    /// builds of the pack would mix rails fitted separately.
    MixedBuilds { loaded: u64, file: u64 },
}

impl fmt::Display for PackError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PackError::TooShort => write!(f, "decade file shorter than its 32-byte header"),
            PackError::BadMagic => write!(f, "not an SSEP decade file"),
            PackError::BadVersion(v) => write!(f, "decade file version {v}, expected 1"),
            PackError::NotADecade(a, b) => write!(f, "span {a} to {b} is not a decade of the pack"),
            PackError::TableOutOfBounds => write!(f, "body table runs past the end of the file"),
            PackError::UnknownBody(c) => write!(f, "unknown body code {c}"),
            PackError::DuplicateBody(c) => write!(f, "body {c} appears twice"),
            PackError::BadEntry(c) => write!(f, "body {c} has a bad table entry"),
            PackError::SegmentCount(c) => write!(f, "body {c}'s segments do not tile the decade"),
            PackError::DataOffset(c) => write!(f, "body {c}'s data is outside its section"),
            PackError::BadCoefficient(c) => write!(f, "body {c} has a non-finite coefficient"),
            PackError::TrailingBytes => write!(f, "bytes after the last data section"),
            PackError::MixedBuilds { loaded, file } => {
                write!(
                    f,
                    "pack build {file:016x} differs from the loaded {loaded:016x}"
                )
            }
        }
    }
}

impl std::error::Error for PackError {}

/// `N` bytes at `at`, or None past the end: every read goes through here.
fn take<const N: usize>(bytes: &[u8], at: usize) -> Option<[u8; N]> {
    bytes.get(at..at.checked_add(N)?)?.try_into().ok()
}

fn u16_at(b: &[u8], at: usize) -> Option<u16> {
    take(b, at).map(u16::from_le_bytes)
}

fn u32_at(b: &[u8], at: usize) -> Option<u32> {
    take(b, at).map(u32::from_le_bytes)
}

fn f64_at(b: &[u8], at: usize) -> Option<f64> {
    take(b, at).map(f64::from_le_bytes)
}

/// One body's rail in one decade: `count` segments of `degree + 1` coefficients per axis.
#[derive(Debug, Clone)]
struct Block {
    body: RailBody,
    degree: usize,
    segment_s: f64,
    /// `[segment][axis][k]`, c0 as stored, c1 and up widened exactly from f32.
    coeffs: Vec<f64>,
}

#[derive(Debug, Clone)]
struct Decade {
    build: u64,
    from_et: f64,
    to_et: f64,
    blocks: Vec<Block>,
}

/// One decade file, parsed and checked.
fn parse(bytes: &[u8]) -> Result<Decade, PackError> {
    let (Some(magic), Some(version), Some(count), Some(build), Some(from_et), Some(to_et)) = (
        take::<4>(bytes, 0),
        u16_at(bytes, 4),
        u16_at(bytes, 6),
        take::<8>(bytes, 8).map(u64::from_le_bytes),
        f64_at(bytes, 16),
        f64_at(bytes, 24),
    ) else {
        return Err(PackError::TooShort);
    };
    if &magic != b"SSEP" {
        return Err(PackError::BadMagic);
    }
    if version != 1 {
        return Err(PackError::BadVersion(version));
    }
    if !STARTS.windows(2).any(|w| w[0] == from_et && w[1] == to_et) {
        return Err(PackError::NotADecade(from_et, to_et));
    }
    let mut expected = HEADER + ENTRY * usize::from(count);
    if expected > bytes.len() {
        return Err(PackError::TableOutOfBounds);
    }
    let mut blocks: Vec<Block> = Vec::with_capacity(usize::from(count));
    for i in 0..usize::from(count) {
        let at = HEADER + ENTRY * i;
        let fields = (
            u16_at(bytes, at),
            u16_at(bytes, at + 2),
            u32_at(bytes, at + 4),
        );
        let more = (
            f64_at(bytes, at + 8),
            u32_at(bytes, at + 16),
            u32_at(bytes, at + 20),
        );
        let (
            (Some(code), Some(degree), Some(segments)),
            (Some(segment_s), Some(offset), Some(reserved)),
        ) = (fields, more)
        else {
            return Err(PackError::TableOutOfBounds);
        };
        let body = RailBody::from_code(code).ok_or(PackError::UnknownBody(code))?;
        if blocks.iter().any(|b| b.body == body) {
            return Err(PackError::DuplicateBody(code));
        }
        if reserved != 0 || degree < 1 || !segment_s.is_finite() || segment_s <= 0.0 {
            return Err(PackError::BadEntry(code));
        }
        if f64::from(segments) != ((to_et - from_et) / segment_s).ceil() {
            return Err(PackError::SegmentCount(code));
        }
        // The last segment's start as segment() computes it: at the decade's end, its span
        // would be 0 and x there 0 / 0. The checks above leave segments at least 1 and
        // every operand finite, so >= is the negated < without a NaN case.
        if from_et + f64::from(segments - 1) * segment_s >= to_et {
            return Err(PackError::SegmentCount(code));
        }
        // Data sections are contiguous, in table order, and end exactly at the file end.
        let (degree, segments) = (usize::from(degree), segments as usize);
        let record = 24 + 12 * degree;
        let end = record
            .checked_mul(segments)
            .and_then(|n| n.checked_add(expected));
        if offset as usize != expected || end.is_none_or(|end| end > bytes.len()) {
            return Err(PackError::DataOffset(code));
        }
        let mut coeffs = Vec::with_capacity(segments * 3 * (degree + 1));
        for s in 0..segments {
            let base = expected + s * record;
            for axis in 0..3 {
                coeffs.push(f64_at(bytes, base + 8 * axis).ok_or(PackError::DataOffset(code))?);
                for k in 0..degree {
                    let at = base + 24 + 4 * (axis * degree + k);
                    let c = take(bytes, at)
                        .map(f32::from_le_bytes)
                        .ok_or(PackError::DataOffset(code))?;
                    coeffs.push(f64::from(c));
                }
            }
        }
        if coeffs.iter().any(|c| !c.is_finite()) {
            return Err(PackError::BadCoefficient(code));
        }
        expected += record * segments;
        blocks.push(Block {
            body,
            degree,
            segment_s,
            coeffs,
        });
    }
    if expected != bytes.len() {
        return Err(PackError::TrailingBytes);
    }
    Ok(Decade {
        build,
        from_et,
        to_et,
        blocks,
    })
}

/// The sum of c_k T_k(x), by Clenshaw's recurrence in the order of `tools/ephem`'s
/// `chebyshev.evaluate`. Adds and multiplies only; the divisions that map a time to x are
/// in `RailPack::segment`.
pub fn clenshaw(c: &[f64], x: f64) -> f64 {
    let Some((&c0, rest)) = c.split_first() else {
        return 0.0;
    };
    let (mut b1, mut b2) = (0.0, 0.0);
    for &cj in rest.iter().rev() {
        (b1, b2) = (2.0 * x * b1 - b2 + cj, b1);
    }
    x * b1 - b2 + c0
}

/// The same sum and its derivative with respect to x, from the recurrence differentiated
/// term by term. The value's bits equal `clenshaw`'s: its steps are the same.
pub fn clenshaw_with_derivative(c: &[f64], x: f64) -> (f64, f64) {
    let Some((&c0, rest)) = c.split_first() else {
        return (0.0, 0.0);
    };
    let (mut b1, mut b2, mut d1, mut d2) = (0.0, 0.0, 0.0, 0.0);
    for &cj in rest.iter().rev() {
        (d1, d2) = (2.0 * b1 + 2.0 * x * d1 - d2, d1);
        (b1, b2) = (2.0 * x * b1 - b2 + cj, b1);
    }
    (x * b1 - b2 + c0, b1 + x * d1 - d2)
}

/// The loaded decades of the committed pack, `de440s-100km`: positions in km and
/// velocities in km/s, ecliptic J2000, at ET. Planets are relative to the Sun, the Moon
/// to Earth's centre.
#[derive(Debug, Clone, Default)]
pub struct RailPack {
    decades: [Option<Decade>; DECADES],
}

impl RailPack {
    /// A pack with no decade loaded.
    pub fn new() -> RailPack {
        RailPack::default()
    }

    /// Checks and loads one decade file; loading a decade again replaces it.
    pub fn load_decade(&mut self, bytes: &[u8]) -> Result<(), PackError> {
        let decade = parse(bytes)?;
        if let Some(loaded) = self.pack_build()
            && loaded != decade.build
        {
            return Err(PackError::MixedBuilds {
                loaded,
                file: decade.build,
            });
        }
        // parse() accepts only decade starts; if that ever changes, refuse, never drop.
        let k = STARTS[..DECADES]
            .iter()
            .position(|&s| s == decade.from_et)
            .ok_or(PackError::NotADecade(decade.from_et, decade.to_et))?;
        self.decades[k] = Some(decade);
        Ok(())
    }

    /// The build every loaded decade shares, or None before the first load.
    pub fn pack_build(&self) -> Option<u64> {
        self.decades.iter().flatten().map(|d| d.build).next()
    }

    /// The pack's span, 1950-01-01 to 2150-01-01 TDB as ET, whatever is loaded.
    pub fn coverage(&self) -> (f64, f64) {
        (STARTS[0], STARTS[DECADES])
    }

    /// The decade holding `et`: the last that starts at or before it, the final one
    /// keeping the pack's last instant. None for NaN or a time outside coverage.
    fn decade_index(et: f64) -> Option<usize> {
        if !(STARTS[0]..=STARTS[DECADES]).contains(&et) {
            return None;
        }
        Some(STARTS[1..DECADES].iter().take_while(|&&s| s <= et).count())
    }

    /// First year of the decade holding `et`, for messages; None outside coverage.
    pub fn decade_year(et: f64) -> Option<i64> {
        RailPack::decade_index(et).map(|k| PACK_FIRST_YEAR + 10 * k as i64)
    }

    /// Whether the decade holding `et` is loaded; false outside coverage.
    pub fn is_loaded(&self, et: f64) -> bool {
        RailPack::decade_index(et).is_some_and(|k| self.decades[k].is_some())
    }

    /// The coefficients of `body` at `et` with the segment's x in -1 to 1 and its span.
    fn segment(&self, body: RailBody, et: f64) -> Option<(&[f64], usize, f64, f64)> {
        let d = self.decades[RailPack::decade_index(et)?].as_ref()?;
        let b = d.blocks.iter().find(|b| b.body == body)?;
        let n = b.degree + 1;
        let count = b.coeffs.len() / (3 * n);
        // pack.Pack.position: floor, capped at the last segment; t1 capped at the end.
        let index = (((et - d.from_et) / b.segment_s).floor() as usize).min(count - 1);
        let t0 = d.from_et + index as f64 * b.segment_s;
        let t1 = (t0 + b.segment_s).min(d.to_et);
        let x = (2.0 * et - (t0 + t1)) / (t1 - t0);
        Some((&b.coeffs[index * 3 * n..(index + 1) * 3 * n], n, x, t1 - t0))
    }

    /// Position [km] of `body` at `et`; None outside coverage, for NaN, or when the
    /// decade or the body is not loaded.
    pub fn position(&self, body: RailBody, et: f64) -> Option<Vec3> {
        let (c, n, x, _) = self.segment(body, et)?;
        Some([
            clenshaw(&c[..n], x),
            clenshaw(&c[n..2 * n], x),
            clenshaw(&c[2 * n..], x),
        ])
    }

    /// Position [km] and velocity [km/s]: the series' derivative scaled by 2 / span.
    /// The position's bits equal `position`'s.
    pub fn state(&self, body: RailBody, et: f64) -> Option<State> {
        let (c, n, x, span) = self.segment(body, et)?;
        let (mut r, mut v) = ([0.0; 3], [0.0; 3]);
        for axis in 0..3 {
            let (f, df) = clenshaw_with_derivative(&c[axis * n..(axis + 1) * n], x);
            (r[axis], v[axis]) = (f, df * (2.0 / span));
        }
        Some(State { r, v })
    }
}
