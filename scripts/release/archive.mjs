import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { readFileSync, readdirSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const MAX = 64 * 1024 * 1024;
export function safePath(path) {
  assert(typeof path === 'string' && /^[A-Za-z0-9_./-]+$/.test(path), 'unsafe archive path');
  assert(!path.startsWith('/') && !path.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.')), 'unsafe archive path');
  assert(path === 'firebase.json' || path.startsWith('apps/game/dist/'), 'unexpected archive root');
  assert(!path.endsWith('.map'), 'source maps do not belong in releases');
  return path;
}
export function decodeArchive(bytes, config) {
  assert(bytes.length <= MAX, 'archive too large');
  const decoded = JSON.parse(gunzipSync(bytes, { maxOutputLength: MAX }).toString('utf8'));
  assert.equal(decoded.schema, 'starshot.static/1', 'unknown archive schema');
  assert(Array.isArray(decoded.files) && decoded.files.length > 4 && decoded.files.length < 1000, 'invalid file inventory');
  const files = new Map();
  let total = 0;
  for (const item of decoded.files) {
    assert.deepEqual(Object.keys(item).sort(), ['data', 'path'], 'unexpected archive file attributes');
    safePath(item.path);
    assert(!files.has(item.path.toLowerCase()), 'duplicate archive path');
    assert(typeof item.data === 'string' && item.data.length % 4 === 0, 'invalid encoded file');
    const data = Buffer.from(item.data, 'base64');
    // Canonical round-trip avoids a recursive regex on the large astronomy binary.
    assert.equal(data.toString('base64'), item.data, 'invalid encoded file');
    total += data.length;
    assert(total <= MAX, 'expanded archive too large');
    files.set(item.path.toLowerCase(), { path: item.path, data });
  }
  const get = path => { const item = files.get(path.toLowerCase()); assert(item, `missing ${path}`); return item.data; };
  // The trusted workflow's config is the complete allowlist: no hooks or backend targets.
  assert.deepEqual(JSON.parse(get('firebase.json')), config, 'Hosting config differs from the reviewed static config');
  for (const path of ['index.html', 'sw.js', 'release.json']) get(`apps/game/dist/${path}`);
  const metadata = JSON.parse(get('apps/game/dist/release.json'));
  assert.equal(metadata.schema, 2, 'unknown release metadata');
  assert(/^[0-9a-f]{24}$/.test(metadata.buildId), 'invalid build digest');
  return { files: [...files.values()], metadata };
}
export function pack(root, config) {
  const files = [{ path: 'firebase.json', data: Buffer.from(JSON.stringify(config, null, 2) + '\n').toString('base64') }];
  function walk(relative) {
    for (const name of readdirSync(join(root, relative)).sort()) {
      const path = relative + '/' + name;
      const stat = lstatSync(join(root, path));
      assert(!stat.isSymbolicLink(), 'release cannot contain symlinks');
      if (stat.isDirectory()) walk(path);
      else { assert(stat.isFile(), 'unexpected release file type'); safePath(path); files.push({ path, data: readFileSync(join(root, path)).toString('base64') }); }
    }
  }
  walk('apps/game/dist');
  const bytes = gzipSync(JSON.stringify({ schema: 'starshot.static/1', files }), { level: 9 });
  decodeArchive(bytes, config);
  return bytes;
}
export function unpack(bytes, config, directory) {
  const result = decodeArchive(bytes, config);
  for (const { path, data } of result.files) {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data, { flag: 'wx' });
  }
  return result.metadata;
}
