# Credits

Every asset the game ships is listed here with its source, its licence and the credit
its licence asks for (D15). Starshot's own original art, audio and screenshots are
CC BY 4.0 (D12); assets from elsewhere keep their own licence. The licence gate
(`scripts/check-licence.mjs`) fails when a file under `apps/game/public/art/` or
`apps/game/public/audio/` has no entry here. When the assets manifest lands, this page
and the in-game credits are generated from it.

Starshot began as a fork of astlo by Mark Macharia
([@iamnothimbutwe](https://github.com/iamnothimbutwe)). No astlo code or data ships in
the game; see [NOTICE.md](NOTICE.md).

Planet positions come from NASA/JPL's approximate planetary elements, checked against
NASA/JPL Horizons; see [NOTICE.md](NOTICE.md#nasajpl-data).

## Planet textures

The isolated observatory study ships these Solar System Scope / INOVE textures,
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Source: [Solar System Scope textures](https://www.solarsystemscope.com/textures/).
Each is resized to 1024 x 512 JPEG, projected onto a sphere and lit at runtime.

| File under `apps/prototype/public/observatory/` | World |
| --- | --- |
| `earth-1k.jpg` | Earth |
| `mercury-1k.jpg` | Mercury |
| `venus-1k.jpg` | Venus |
| `mars-1k.jpg` | Mars |
| `jupiter-1k.jpg` | Jupiter |
| `saturn-1k.jpg` | Saturn |
| `uranus-1k.jpg` | Uranus |
| `neptune-1k.jpg` | Neptune |

## Moon

`apps/prototype/public/observatory/moon-1k.jpg` is the original 1k image from the
[2019 CGI Moon kit](https://svs.gsfc.nasa.gov/4720/).
Credit: NASA's Scientific Visualization Studio / LRO / LROC.
It follows [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/),
not Starshot's original-media licence. Projection and lighting happen at runtime.

## Sun

The observatory uses procedural illustrative granulation, sunspots and prominences.
No solar image is shipped. NAIF supplies the physical radius and reference orientation.

## Stars

None shipped yet. The starfield is drawn by code (`apps/game/src/render/starfield.ts`).

## Music

None shipped yet. Sound effects will be generated in code (D15).

## Fonts

The observatory ships `ibm-plex-mono-400.woff2`, `ibm-plex-mono-500.woff2` and
`ibm-plex-mono-700.woff2` under `apps/prototype/public/observatory/`.
[IBM Plex Mono](https://github.com/IBM/plex) is copyright 2017 IBM Corp., with
Reserved Font Name Plex, under OFL-1.1. These are lossless WOFF2 conversions of the
complete upstream TTFs. Licence text is in `LICENSES/OFL-1.1.txt` and the build's notice.

## Prototype data and icons

The observatory's `satellite-data.json`, `satellite-states.bin` and
`system-orientation.json` contain cached [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)
vectors and [NAIF PCK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc)
constants. NASA/JPL-Caltech produced the source data. Starshot contributors assembled
and last modified the derived files. The recorded flight and its model bundle are
generated from this repository's Apache-2.0 source, not third-party astlo code.

The local `system-icons.js` shim uses adapted basic control glyphs.
[Lucide and Feather notices](https://lucide.dev/license) are retained conservatively
in `LICENSES/LicenseRef-Lucide-Feather.txt` and the build's `NOTICE.txt`.

The full source URLs, changes, byte lengths and SHA-256 hashes are recorded in
`apps/prototype/public/observatory/assets-manifest.json`. The detailed image manifest
also retains original-download hashes. No NASA, IBM, Lucide or INOVE endorsement is implied.

## Notice

- NASA does not endorse this game. No NASA insignia are used.
- An entry here records the source and licence of an asset. It does not mean its
  author endorses Starshot.
