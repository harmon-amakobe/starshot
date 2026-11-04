/**
 * The bundle checker's guards, on small builds shaped like Rolldown's real output: a clean
 * build passes, and each way the lazy Moon can break fails with its own finding. The real
 * builds are measured by `node scripts/verify-lunar-loading.mjs --dist apps/game/dist`.
 */
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { RAIL_TOKENS, cost, findings, graphs, inventory, measure } from '../../../scripts/verify-lunar-loading.mjs';

const [DIGEST, RUN] = RAIL_TOKENS as [string, string];
const rail = (digest = DIGEST, run = RUN) => `var r=new e({sourceSha256:\`${digest}\`,knots:[${run},-.5]});`;
const HTML = '<script type="module" crossorigin src="./assets/index-a.js"></script>\n'
  + '<meta name="starshot-moon-chunk" content="./assets/lunar-model-b.js">';
const worker = 'new Worker(new URL(new URL(`sim.worker-d.js`,import.meta.url).href,``+import.meta.url))';
const swFor = (paths: string[]) => 'const RELEASE = "x";\nconst INVENTORY = '
  + `${JSON.stringify(paths.map((path) => ({ path, integrity: 'sha256-x' })))};\n`;

/** The tip's shape: the entry imports a vendor chunk, starts the worker and imports the Moon
 *  lazily; the Moon chunk and the worker's lunar chunk both carry the rail and import back. */
function clean() {
  const files = new Map<string, string>([
    ['index.html', HTML],
    ['assets/index-a.js', `import{v as w}from"./vendor-c.js";${worker};import(\`./lunar-model-b.js\`)`],
    ['assets/vendor-c.js', 'export const x=1;'],
    ['assets/lunar-model-b.js', `import{t as e}from"./index-a.js";${rail()}`],
    ['assets/sim.worker-d.js', 'import(`./lunar-e.js`);import(`./lunar-hint-f.js`)'],
    ['assets/lunar-e.js', `import{a as e}from"./sim.worker-d.js";${rail()}`],
    ['assets/lunar-hint-f.js', 'import{r as e}from"./lunar-e.js";'],
  ]);
  files.set('sw.js', swFor([...files.keys()]));
  return files;
}
const edited = (path: string, change: (text: string) => string) => {
  const files = clean();
  files.set(path, change(files.get(path)!));
  return files;
};
const edit = (path: string, change: (text: string) => string) => findings(edited(path, change));
const without = (path: string) => {
  const files = clean();
  files.delete(path);
  return files;
};
const unlisted = (...paths: string[]) => edit('sw.js', () => swFor([...clean().keys()].filter((p) => !paths.includes(p))));
const ABSENT = (t: string) => `import{a as b}from"./absent-g.js";${t}`;
const UNFOUND = (t: string) => t.replace('new Worker(new URL(new URL(', 'new Worker(new URL(String(new URL(');

describe('verify-lunar-loading', () => {
  it('takes its markers from the rail: the digest, and knot values the minifier keeps as written', () => {
    expect(DIGEST).toMatch(/^[0-9a-f]{64}$/);
    const values = RUN.split(',').map(Number);
    expect(values).toHaveLength(4);
    // A magnitude below 1 would be written `-.5`, and the run would never match a chunk.
    for (const value of values) expect(Math.abs(value)).toBeGreaterThanOrEqual(1);
  });

  it('passes a clean build and separates its static, worker and lazy graphs', () => {
    expect(findings(clean())).toEqual([]);
    expect(graphs(clean())).toEqual({
      entry: { paths: ['assets/index-a.js', 'assets/vendor-c.js'], missing: [] },
      workers: 1,
      worker: { paths: ['assets/sim.worker-d.js'], missing: [] },
      workerDynamic: { paths: ['assets/lunar-e.js', 'assets/lunar-hint-f.js'], missing: [] },
      moonPath: 'assets/lunar-model-b.js',
      moon: { paths: ['assets/lunar-model-b.js'], missing: [] },
    });
    // A chunk the worker loads later can load another later still.
    const nested = edited('assets/sim.worker-d.js', () => 'import(`./lunar-e.js`)');
    nested.set('assets/lunar-e.js', `${nested.get('assets/lunar-e.js')};import(\`./lunar-hint-f.js\`)`);
    expect(graphs(nested).workerDynamic.paths).toEqual(['assets/lunar-e.js', 'assets/lunar-hint-f.js']);
  });

  it('fails when the entry, or a chunk it imports statically, carries the rail', () => {
    expect(edit('assets/index-a.js', (t) => t + rail()))
      .toEqual(["The entry's static import graph carries the Moon rail in assets/index-a.js."]);
    expect(edit('assets/vendor-c.js', (t) => t + rail()))
      .toEqual(["The entry's static import graph carries the Moon rail in assets/vendor-c.js."]);
    // A named JSON import can drop the digest, and the knot run still marks the rail.
    expect(edit('assets/vendor-c.js', (t) => t + rail('0'.repeat(64))))
      .toEqual(["The entry's static import graph carries the Moon rail in assets/vendor-c.js."]);
    // The bare form, which imports for side effects only.
    expect(edit('assets/index-a.js', (t) => `import"./lunar-model-b.js";${t}`))
      .toEqual(["The entry's static import graph carries the Moon rail in assets/lunar-model-b.js."]);
    // The worker starts when the page mounts, so its static graph is first-load code too.
    expect(edit('assets/sim.worker-d.js', (t) => t + rail()))
      .toEqual(["The initial worker's static import graph carries the Moon rail in assets/sim.worker-d.js."]);
    // Bytes read as text, as the command line passes them.
    const bytes = new Map([...edited('assets/vendor-c.js', (t) => t + rail())].map(([k, v]) => [k, new TextEncoder().encode(v)]));
    expect(findings(bytes)).toEqual(["The entry's static import graph carries the Moon rail in assets/vendor-c.js."]);
  });

  it('fails when the page loads no entry or starts no worker, rather than pass with nothing checked', () => {
    expect(edit('index.html', (t) => t.replace('index-a.js', 'index-z.js'))).toEqual([
      'index.html loads no script that is in the build, so there is no entry to check.',
      'The build lacks assets/index-z.js, which index.html loads.',
    ]);
    expect(edit('assets/index-a.js', UNFOUND))
      .toEqual(['The entry starts no worker that this verifier can find, so no worker chunk is checked.']);
  });

  it('fails when a graph loads a file the build lacks', () => {
    expect(edit('assets/index-a.js', ABSENT)).toEqual(['The build lacks assets/absent-g.js, which assets/index-a.js loads.']);
    expect(findings(without('assets/sim.worker-d.js'))).toEqual([
      'The build lacks assets/sim.worker-d.js, which assets/index-a.js loads.',
      'The release inventory in sw.js lists assets/sim.worker-d.js, which is not in the build.',
    ]);
    expect(findings(without('assets/lunar-e.js'))).toEqual([
      'The build lacks assets/lunar-e.js, which assets/sim.worker-d.js loads.',
      'The build lacks assets/lunar-e.js, which assets/lunar-hint-f.js loads.',
      'The release inventory in sw.js lists assets/lunar-e.js, which is not in the build.',
    ]);
  });

  it('fails when the meta tag is missing or names a chunk that is absent or lacks the rail', () => {
    expect(edit('index.html', (t) => t.replace(/<meta[^>]*>/, '')))
      .toEqual(['index.html has no starshot-moon-chunk meta tag naming the Moon chunk.']);
    expect(findings(without('assets/lunar-model-b.js'))).toEqual([
      'The Moon chunk assets/lunar-model-b.js named in index.html is not in the build.',
      'The release inventory in sw.js lists assets/lunar-model-b.js, which is not in the build.',
    ]);
    expect(edit('assets/lunar-model-b.js', (t) => t.replace(rail(), '')))
      .toEqual([`The Moon chunk assets/lunar-model-b.js lacks the rail marker ${DIGEST.slice(0, 24)}.`]);
    // Every marker must match the real chunk, so a marker that stops matching fails here.
    expect(edit('assets/lunar-model-b.js', (t) => t.replace(RUN, '1')))
      .toEqual([`The Moon chunk assets/lunar-model-b.js lacks the rail marker ${RUN.slice(0, 24)}.`]);
  });

  it('fails when the release inventory omits a chunk of these graphs or was never written', () => {
    expect(unlisted('assets/lunar-model-b.js'))
      .toEqual(['The release inventory in sw.js does not list assets/lunar-model-b.js.']);
    // Offline, the worker needs its own lunar chunks as much as the page needs the Moon's.
    expect(unlisted('assets/lunar-e.js', 'assets/lunar-hint-f.js')).toEqual([
      'The release inventory in sw.js does not list assets/lunar-e.js.',
      'The release inventory in sw.js does not list assets/lunar-hint-f.js.',
    ]);
    expect(edit('sw.js', () => 'const INVENTORY = __STARSHOT_PRECACHE__;\n'))
      .toEqual(['sw.js holds no release inventory, so nothing is precached.']);
    expect(inventory('const INVENTORY = __STARSHOT_PRECACHE__;')).toBeNull();
  });

  it('measures each file gzipped alone at level 9', () => {
    // Numbers like the rail's, where levels 1 and 9 give different sizes.
    const chunk = Array.from({ length: 2000 }, (_, i) => (i * 7919) % 100003).join(',');
    const files = new Map([['a.js', chunk], ['b.js', chunk]]);
    const one = gzipSync(chunk, { level: 9 }).length;
    expect(cost(files, ['a.js', 'b.js'])).toEqual({ files: 2, raw: 2 * chunk.length, gzip: 2 * one });
    expect(() => cost(files, ['c.js'])).toThrow('c.js is listed but not in the build.');
    const rows = measure(clean());
    expect(rows.map((row) => [row.label, row.paths?.length])).toEqual([
      ['Critical execution JS: the entry and its static imports', 2],
      ['Initial worker JS', 1],
      ['Dynamic worker JS', 2],
      ['Lazy Moon chunk and what it adds', 1],
      ['Service-worker precache, complete', 7],
    ]);
    expect(rows[3]).toMatchObject({ rail: ['assets/lunar-model-b.js'] });
  });

  it('gives a reason instead of 0 bytes for a part that is absent, unfound or missing a file', () => {
    const why = (files: Map<string, string>) => measure(files).map((row) => (row.paths ? 'measured' : row.why));
    const base = edited('index.html', (t) => t.replace(/<meta[^>]*>/, ''));
    base.set('sw.js', 'const INVENTORY = __STARSHOT_PRECACHE__;\n');
    expect(why(base).slice(3)).toEqual(['none in this build', 'unknown, as sw.js lists no release files']);
    expect(why(without('assets/lunar-model-b.js')).slice(3)).toEqual([
      'unknown, as the build lacks assets/lunar-model-b.js, which index.html names',
      'unknown, as the build lacks assets/lunar-model-b.js, which sw.js lists',
    ]);
    expect(why(edited('assets/index-a.js', (t) => `import"./lunar-model-b.js";${t}`))[3])
      .toBe("none of its own, as the entry's static graph already holds it");
    expect(why(edited('assets/index-a.js', ABSENT))[0])
      .toBe('unknown, as the build lacks assets/absent-g.js, which assets/index-a.js loads');
    expect(why(edited('assets/index-a.js', UNFOUND)).slice(1, 3)).toEqual([
      'unknown, as the entry starts no worker that this verifier can find',
      'unknown, as the initial worker JS is unknown',
    ]);
    // A file missing from the entry leaves the Moon chunk's own cost known.
    expect(why(edited('assets/index-a.js', ABSENT))[3]).toBe('measured');
    expect(why(without('assets/lunar-e.js'))[2])
      .toBe('unknown, as the build lacks assets/lunar-e.js, which assets/sim.worker-d.js loads');
  });
});
