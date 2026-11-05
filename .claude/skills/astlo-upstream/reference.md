# Benchmarking an astlo wheel against JPL (D4)

The gate: for each planet, at each epoch in
`fixtures/horizons/horizons.json`, the angle between astlo's
heliocentric position vector and Horizons' must be within that planet's arcminute
budget in `packages/ephemeris/test/ephemeris.test.ts`. Same targets (Earth-Moon
barycentre for "earth", system barycentres for the giant planets), same frame
(ecliptic and equinox of J2000), same epochs (TDB Julian dates).

## Isolation

The wheel is Mark's code. Install it only into a throwaway virtualenv outside the
repository, and never copy its source, outputs-as-code, or excerpts into Starshot's
packages or apps. (`python/astlo`, D10, is the one place his code is changed, and only
by fix commits.) The fixed build is benchmarked the same way, from
`python3 python/astlo/build_wheel.py`; its own before/after record is
`python/astlo/VERIFICATION.md`.

```bash
python3 -m venv <scratch>/astlo-venv
<scratch>/astlo-venv/bin/pip install third_party/astlo/dist/<wheel>.whl
```

## Measure

Write the comparison script in the scratch directory. For each fixture epoch:

1. Ask astlo for each planet's heliocentric state at that TDB instant, using the API its
   README documents. Record which frame astlo reports (barycentric vs heliocentric,
   ecliptic vs equatorial) and its units; convert to heliocentric ecliptic J2000 km.
   If astlo takes UTC, convert with the same leap-second rule as
   `packages/ephemeris/src/time.ts` and record that you did.
2. Read the Horizons vector for the same planet and epoch from the fixture JSON.
3. Angle = acos(dot(a, h) / (|a| |h|)), in arcminutes. Also |a| / |h| - 1.

Report a table: planet x epoch, arcminutes, radial ratio, pass/fail against the budget,
plus the wheel file name and its sha256 from `third_party/astlo.sha256`.

## Outcome

- All within budget: record the result and the conditions in `docs/decisions.md`
  (wheel, epochs, frame conversion). Using the data still needs a licence from Mark
  that permits it (D2).
- Any outside budget: it is a finding for Mark. Record it with the inputs and the
  Horizons values, or fix it in `python/astlo` as a new topic commit (D10), as in the
  skill's sections on fixes. Starshot keeps the JPL Table 1 ephemeris.
