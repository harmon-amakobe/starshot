import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../public/', import.meta.url);
const meta = JSON.parse(await fs.readFile(new URL('observatory/satellite-data.json', root), 'utf8'));
const raw = await fs.readFile(new URL('observatory/satellite-states.bin', root));
const moon = meta.moons.find(body => body.id === 'moon');
const data = new Float64Array(raw.buffer, raw.byteOffset, raw.byteLength / 8);
const result = { source: meta.source, frame: meta.frame, units: meta.units,
  sourceSha256: createHash('sha256').update(raw).digest('hex'),
  probes: moon.probes, knots: Array.from(data.slice(moon.offset, moon.offset + moon.count * 7)) };
const output = new URL('../../../packages/ephemeris/data/', import.meta.url);
await fs.mkdir(output, { recursive: true });
await fs.writeFile(new URL('moon-rail.json', output), JSON.stringify(result) + '\n');
console.log(`Extracted ${moon.count} unchanged Moon knots and ${moon.probes.length} JPL probes.`);
