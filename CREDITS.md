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

None shipped yet.

## Moon

None shipped yet.

## Sun

None shipped yet.

## Stars

None shipped yet. The starfield is drawn by code (`apps/game/src/render/starfield.ts`).

## Music

None shipped yet. Sound effects will be generated in code (D15).

## Fonts

None shipped yet. The game uses the fonts already on the player's device.

## Notice

- NASA does not endorse this game. No NASA insignia are used.
- An entry here records the source and licence of an asset. It does not mean its
  author endorses Starshot.
