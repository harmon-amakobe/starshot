#!/usr/bin/env node
/**
 * verify-lunar-loading.mjs: the Moon rail stays out of the first page load (the entry and the
 * worker it starts), and what each part of a production build costs.
 *
 *   node scripts/verify-lunar-loading.mjs --dist apps/game/dist [--measure-only]
 *
 * Exit 1 when the entry or the initial worker, or a chunk in either static import graph,
 * carries the rail; when the page loads no script, a graph loads a file the build lacks, or
 * the entry starts no worker; when the `starshot-moon-chunk` meta tag is missing or the chunk
 * it names is absent or lacks the rail; or when sw.js has no release inventory, or it omits a
 * chunk of these graphs or lists a file the build lacks. `--measure-only` prints the same
 * findings and exits 0, so a build from before the lazy Moon, such as the cleanup base, can
 * still be measured. A directory without index.html exits 1; bad arguments exit 2.
 *
 * A verifier, not a gate: it reads a production build, which `npm run gates` builds only as
 * its last step. `apps/game/src/verify-lunar-loading.test.ts` runs its pure functions there.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, posix, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const rail = JSON.parse(readFileSync(new URL('../packages/ephemeris/data/moon-rail.json', import.meta.url), 'utf8'));
/**
 * Strings that mark the rail in a built chunk: its source digest, and a run of the first four
 * knot values, which survives even if a named JSON import drops the digest. These values are
 * above 1 in magnitude, so the minifier spells them as JSON does. Any marker flags a chunk;
 * the Moon chunk must hold every marker, which proves each still matches what the build writes.
 */
export const RAIL_TOKENS = [rail.sourceSha256, rail.knots.slice(0, 4).join(',')];

// Rolldown writes `import{a as b}from"./x.js"`, `import"./x.js"` or `export{a}from"./x.js"`
// for a static edge. A dynamic import has a bracket after `import`, so it never matches here.
const STATIC = /\b(?:import|export)\s*(?:[\w$*{][^'"`();]*?\bfrom\s*)?(["'`])(\.{1,2}\/[^'"`$]+)\1/g;
// Only a literal specifier resolves here. The planetary pages build theirs from a variable,
// so those requests are left to the browser part.
const DYNAMIC = /\bimport\(\s*(["'`])(\.{1,2}\/[^'"`$]+)\1\s*\)/g;
// Vite writes a module worker as `new Worker(new URL(new URL("x.js", import.meta.url)...`.
const WORKER = /\bWorker\(\s*(?:new URL\(\s*)+(["'`])([^'"`$]+\.js)\1/g;
// The page runs its scripts before the player picks anything. A module preload only fetches,
// so it is a transfer cost for the browser part, not execution.
const PAGE = /<script\b[^>]*?\bsrc="([^"]+\.js)"/g;
const MOON_META = /<meta\s+name="starshot-moon-chunk"\s+content="([^"]+)"/;
// apps/game/release-build.ts replaces the template's placeholder with one JSON line.
const INVENTORY = /^const INVENTORY = (.*);$/m;

// Bytes are decoded as UTF-8; String() on a plain Uint8Array would give its numbers.
const text = (files, path) => { const v = files.get(path); return v == null ? '' : typeof v === 'string' ? v : new TextDecoder().decode(v); };
const from = (path, spec) => posix.normalize(posix.join(posix.dirname(path), spec));
/** `[importer, imported]` for each match of `pattern` in the file at `path`. */
const edges = (files, path, pattern) => [...text(files, path).matchAll(pattern)].map((m) => [path, from(path, m.at(-1))]);
const carries = (files, path, tokens) => path.endsWith('.js') && tokens.some((t) => text(files, path).includes(t));

/** Every file reached by static imports from the `seeds` edges, short of the files in `loaded`,
 *  and each edge whose file the build lacks. A missing file is reported, never sized as 0: it
 *  could hold the rail, and the page would fail to load it. */
function closure(files, seeds, loaded = []) {
  const seen = new Set(loaded), missing = new Set();
  const queue = [...seeds];
  while (queue.length) {
    const [parent, path] = queue.shift();
    if (!files.has(path)) missing.add(`${path}, which ${parent} loads`);
    else if (!seen.has(path)) {
      seen.add(path);
      queue.push(...edges(files, path, STATIC));
    }
  }
  return { paths: [...seen].filter((path) => !loaded.includes(path)), missing: [...missing] };
}

/** What a graph can load later: its dynamic imports, their static graphs, and theirs in turn. */
function later(files, start) {
  const reached = new Set(start), missing = new Set();
  let frontier = start;
  while (frontier.length) {
    const next = closure(files, frontier.flatMap((path) => edges(files, path, DYNAMIC)), [...reached]);
    for (const edge of next.missing) missing.add(edge);
    frontier = next.paths;
    for (const path of frontier) reached.add(path);
  }
  return { paths: [...reached].filter((path) => !start.includes(path)), missing: [...missing] };
}

/** The paths the release inventory precaches, or null when sw.js holds no inventory. */
export function inventory(sw) {
  const line = INVENTORY.exec(sw);
  if (!line) return null;
  try {
    return JSON.parse(line[1]).map((entry) => entry.path);
  } catch {
    // The unbuilt template still reads `__STARSHOT_PRECACHE__`, which is not JSON.
    return null;
  }
}

/** The chunk graphs of a build, keyed by dist-relative path with forward slashes. Each graph
 *  holds its `paths` and the `missing` edges to files the build lacks. */
export function graphs(files) {
  const html = text(files, 'index.html');
  const entry = closure(files, [...html.matchAll(PAGE)].map((m) => ['index.html', from('index.html', m[1])]));
  const starts = entry.paths.flatMap((path) => edges(files, path, WORKER));
  const worker = closure(files, starts);
  const named = MOON_META.exec(html)?.[1];
  const moonPath = named ? from('index.html', named) : null;
  // The Moon chunk imports the entry back, so count only what opening a Moon level adds.
  const moon = closure(files, files.has(moonPath) ? [['index.html', moonPath]] : [], entry.paths);
  return { entry, workers: starts.length, worker, workerDynamic: later(files, worker.paths), moonPath, moon };
}

/** Each broken promise of the lazy Moon, as a sentence; an empty list means the build is sound. */
export function findings(files, tokens = RAIL_TOKENS) {
  const g = graphs(files), { entry, moonPath } = g;
  const parts = [entry, g.worker, g.workerDynamic, g.moon];
  // The worker starts when the page mounts, so its static graph is first-load code too.
  const problems = [...entry.paths.map((path) => ['entry', path]), ...g.worker.paths.map((path) => ['initial worker', path])]
    .filter(([, path]) => carries(files, path, tokens))
    .map(([graph, path]) => `The ${graph}'s static import graph carries the Moon rail in ${path}.`);
  // With no entry or no worker, the checks below would pass while looking at nothing.
  if (!entry.paths.length) problems.push('index.html loads no script that is in the build, so there is no entry to check.');
  else if (!g.workers) problems.push('The entry starts no worker that this verifier can find, so no worker chunk is checked.');
  problems.push(...new Set(parts.flatMap((part) => part.missing).map((edge) => `The build lacks ${edge}.`)));
  if (!moonPath) problems.push('index.html has no starshot-moon-chunk meta tag naming the Moon chunk.');
  else if (!files.has(moonPath)) problems.push(`The Moon chunk ${moonPath} named in index.html is not in the build.`);
  else {
    const absent = tokens.filter((token) => !text(files, moonPath).includes(token));
    if (absent.length) problems.push(`The Moon chunk ${moonPath} lacks the rail marker ${absent[0].slice(0, 24)}.`);
  }
  const listed = inventory(text(files, 'sw.js'));
  if (!listed) problems.push('sw.js holds no release inventory, so nothing is precached.');
  else {
    // Offline play needs every chunk these graphs load: the worker's lunar chunks as well as the Moon's.
    for (const path of new Set(parts.flatMap((part) => part.paths))) {
      if (!listed.includes(path)) problems.push(`The release inventory in sw.js does not list ${path}.`);
    }
    // The worker's install fetches every listed file, so one the build lacks fails the whole release.
    for (const path of listed.filter((path) => !files.has(path))) {
      problems.push(`The release inventory in sw.js lists ${path}, which is not in the build.`);
    }
  }
  return problems;
}

/** Raw and gzip bytes. Each file is compressed alone with zlib's gzipSync at level 9, as a
 *  server sends each response; a browser's real transfer can differ, so it is not claimed. */
export function cost(files, paths) {
  let raw = 0, gzip = 0;
  for (const path of paths) {
    if (!files.has(path)) throw new Error(`${path} is listed but not in the build.`);
    raw += Buffer.byteLength(files.get(path));
    gzip += gzipSync(files.get(path), { level: 9 }).length;
  }
  return { files: paths.length, raw, gzip };
}

/** One row per measured part. A part that is absent, or unknown because a file is missing,
 *  has null `paths` and says why: a 0 here would read as a measurement. */
export function measure(files, tokens = RAIL_TOKENS) {
  const g = graphs(files), listed = inventory(text(files, 'sw.js'));
  const laterWhy = g.worker.paths.length ? 'none in this build' : 'unknown, as the initial worker JS is unknown';
  const moonWhy = !g.moonPath ? 'none in this build'
    : files.has(g.moonPath) ? "none of its own, as the entry's static graph already holds it"
      : `unknown, as the build lacks ${g.moonPath}, which index.html names`;
  const precache = listed && {
    paths: listed,
    missing: listed.filter((path) => !files.has(path)).map((path) => `${path}, which sw.js lists`),
  };
  return [
    ['Critical execution JS: the entry and its static imports', g.entry, 'unknown, as index.html loads no script'],
    ['Initial worker JS', g.worker, 'unknown, as the entry starts no worker that this verifier can find'],
    ['Dynamic worker JS', g.workerDynamic, laterWhy],
    ['Lazy Moon chunk and what it adds', g.moon, moonWhy],
    ['Service-worker precache, complete', precache, 'unknown, as sw.js lists no release files'],
  ].map(([label, part, empty]) => {
    if (part?.missing.length) return { label, paths: null, why: `unknown, as the build lacks ${part.missing[0]}` };
    if (!part?.paths.length) return { label, paths: null, why: empty };
    const { paths } = part;
    return { label, paths, rail: paths.filter((path) => carries(files, path, tokens)), ...cost(files, paths) };
  });
}

// Only a browser sees requests built at run time and what the network sent. The Evidence
// browser part measures them; a 0 here would read as a measurement.
const BROWSER = [
  'Planetary page requests, whose URLs are built at run time',
  'Transfer bytes and request initiators, with cached responses counted once',
];

function readBuild(dist) {
  const files = new Map();
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).forEach((entry) => entry.isDirectory()
    ? walk(join(dir, entry.name))
    : files.set(relative(dist, join(dir, entry.name)).replaceAll('\\', '/'), readFileSync(join(dir, entry.name))));
  walk(dist);
  return files;
}

function main(argv) {
  const at = argv.indexOf('--dist');
  if (at < 0 || !argv[at + 1]) {
    console.error('usage: node scripts/verify-lunar-loading.mjs --dist apps/game/dist [--measure-only]');
    return 2;
  }
  const dist = resolve(argv[at + 1]);
  const files = readBuild(dist);
  if (!files.has('index.html')) {
    console.error(`verify-lunar-loading: ${dist} has no index.html; run npm run build first.`);
    return 1;
  }
  const n = (value) => value.toLocaleString('en-US');
  console.log(`verify-lunar-loading: ${dist}`);
  console.log(`Rail markers from moon-rail.json: ${RAIL_TOKENS.map((t) => t.slice(0, 24)).join(' and ')}`);
  console.log('Bytes are raw / gzip, each file gzipped alone by node zlib gzipSync at level 9.');
  for (const row of measure(files)) {
    if (!row.paths) {
      console.log(`- ${row.label}: ${row.why}`);
      continue;
    }
    console.log(`- ${row.label}: ${n(row.raw)} / ${n(row.gzip)} bytes in ${row.files} file${row.files === 1 ? '' : 's'}; rail in ${row.rail.join(', ') || 'none'}`);
    if (row.paths.length <= 8) for (const path of row.paths) console.log(`    ${path}`);
  }
  for (const label of BROWSER) console.log(`- ${label}: unknown here; the Evidence browser part measures it`);
  const problems = findings(files);
  if (!problems.length) {
    console.log('verify-lunar-loading: ok; no rail in the entry or initial worker graph, the Moon chunk carries it, and every chunk is precached');
    return 0;
  }
  const head = argv.includes('--measure-only') ? 'measure only, not enforced' : 'FAILED';
  console.error(`verify-lunar-loading: ${head}, ${problems.length} finding(s):`);
  for (const problem of problems) console.error(`  x ${problem}`);
  return argv.includes('--measure-only') ? 0 : 1;
}

// Imported by the test, the module only defines; run as a script, it checks the build.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
