import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/;
export function stable(version) {
  assert(typeof version === 'string' && STABLE.test(version), `invalid stable version: ${version}`);
  assert(version.split('.').every(n => Number.isSafeInteger(Number(n))), 'version exceeds safe arithmetic');
  return version;
}
export function bump(version, kind) {
  const parts = stable(version).split('.').map(Number);
  const index = ['major', 'minor', 'patch'].indexOf(kind);
  assert(index >= 0, `invalid bump: ${kind}`);
  parts[index]++;
  for (let i = index + 1; i < 3; i++) parts[i] = 0;
  return stable(parts.join('.'));
}
const json = path => JSON.parse(readFileSync(path, 'utf8'));
export function manifests(root) {
  const items = new Map([['', json(join(root, 'package.json'))]]);
  for (const pattern of items.get('').workspaces) {
    assert(/^(apps|packages)\/\*$/.test(pattern), `unsupported workspace pattern: ${pattern}`);
    const directory = pattern.slice(0, -2);
    for (const item of readdirSync(join(root, directory), { withFileTypes: true })) {
      if (item.isDirectory()) items.set(`${directory}/${item.name}`, json(join(root, directory, item.name, 'package.json')));
    }
  }
  return { items, lock: json(join(root, 'package-lock.json')) };
}
function rangeFor(range, version) {
  if (range === '*') return range;
  assert(/^[~^]?\d+\.\d+\.\d+$/.test(range), `unsupported internal version range: ${range}`);
  return (/^[~^]/.exec(range)?.[0] ?? '') + version;
}
export function parity({ items, lock }, requireAll = false) {
  const version = stable(items.get('').version);
  assert.equal(lock.lockfileVersion, 3, 'release tooling expects lockfile v3');
  assert.equal(lock.version, version, 'root lock version differs');
  const names = new Set([...items.values()].map(item => item.name));
  for (const [path, item] of items) {
    const locked = lock.packages[path];
    assert(locked, `missing workspace lock entry: ${path}`);
    // Two private workspaces predate the release lane. The first generated proposal versions them.
    if (item.version === undefined) assert(!requireAll && item.private && locked.version === undefined, `${path}: missing workspace version`);
    else assert.equal(stable(item.version), version, `${path}: conflicting workspace version`);
    assert.equal(locked.version, item.version, `${path}: lock version differs`);
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const [name, range] of Object.entries(item[field] ?? {})) {
        if (!names.has(name)) continue;
        assert.equal(range, rangeFor(range, version), `${path}: stale internal range for ${name}`);
        assert.equal(locked[field]?.[name], range, `${path}: lock range differs for ${name}`);
      }
    }
  }
  return version;
}
export function notes(text) {
  assert.equal((text.match(/^## \[Unreleased\]\s*$/gm) ?? []).length, 1, 'expected exactly one Unreleased heading');
  const releases = [];
  for (const line of text.split('\n').filter(line => /^## \[/.test(line) && !/^## \[Unreleased\][ \t]*$/.test(line))) {
    const match = /^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})$/.exec(line.trim());
    assert(match, `invalid release heading: ${line}`);
    stable(match[1]);
    assert(!releases.includes(match[1]), `duplicate release heading: ${match[1]}`);
    assert.equal(new Date(match[2]).toISOString().slice(0, 10), match[2], 'invalid release date');
    releases.push(match[1]);
  }
  for (let i = 1; i < releases.length; i++) {
    const previous = releases[i - 1].split('.').map(Number), next = releases[i].split('.').map(Number);
    assert((previous.map((part, index) => part - next[index]).find(value => value !== 0) ?? 0) > 0, 'release history is not descending');
  }
  const heading = /^## \[Unreleased\][ \t]*$/m.exec(text);
  const start = heading.index + heading[0].length;
  const remaining = text.slice(start);
  const end = remaining.search(/^(?:## |\[Unreleased\]:)/m);
  const section = end < 0 ? remaining : remaining.slice(0, end);
  const visible = section.replace(/<!--[^]*?-->/g, '');
  const categories = [...visible.matchAll(/^### ([^\n]+)$/gm)].map(match => match[1].trim().toLowerCase());
  assert.equal(new Set(categories).size, categories.length, 'duplicate changelog category');
  const directives = visible.split('\n').filter(line => /^\s*Bump:/i.test(line));
  assert(directives.length <= 1, 'multiple Bump lines');
  const override = directives.length ? /^Bump: (major|minor|patch)$/.exec(directives[0].trim())?.[1] : undefined;
  assert(!directives.length || override, 'Bump must be major, minor or patch');
  const clean = visible.replace(/^[ \t]*Bump:.*$/gmi, '').trim();
  const content = clean.replace(/<!--[^]*?-->/g, '').replace(/^#{1,6} .*$/gm, '').replace(/^\[.*$/gm, '').trim();
  const breaking = /^### Breaking(?: changes)?\s*$|^\s*(?:-\s*)?BREAKING CHANGE:/mi.test(clean);
  const added = /(?:^|\n)### Added[ \t]*\n([^]*?)(?=\n### |$)/.exec(clean)?.[1].trim();
  return { releases, start, end: start + (end < 0 ? remaining.length : end), clean,
    hasContent: !!content, kind: override ?? (breaking ? 'major' : added ? 'minor' : 'patch') };
}
export function preparedNotes(text, version) {
  const parsed = notes(text);
  assert.equal(parsed.releases[0], stable(version), 'candidate needs a generated release heading matching the package version');
  assert(!parsed.hasContent, 'candidate has unreleased changes; prepare a release first');
  const heading = new RegExp(`^## \\[${version.replaceAll('.', '\\.')}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm').exec(text);
  const rest = text.slice(heading.index + heading[0].length);
  return rest.split(/^(?:## |\[Unreleased\]:)/m)[0].trim();
}
export function proposal(root, date) {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(date).toISOString().startsWith(date), 'invalid proposal date');
  const source = manifests(root);
  const text = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const parsed = notes(text);
  const current = parity(source, parsed.releases.length > 0);
  if (!parsed.hasContent) return null;
  if (parsed.releases.length) assert.equal(parsed.releases[0], current, 'latest release and root version disagree');
  const version = parsed.releases.length ? bump(current, parsed.kind) : current;
  assert(!parsed.releases.includes(version), 'version already released');
  const names = new Set([...source.items.values()].map(item => item.name));
  const files = {};
  for (const [path, item] of source.items) {
    item.version = version;
    source.lock.packages[path].version = version;
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const [name, range] of Object.entries(item[field] ?? {})) {
        if (names.has(name)) item[field][name] = source.lock.packages[path][field][name] = rangeFor(range, version);
      }
    }
    files[path ? `${path}/package.json` : 'package.json'] = JSON.stringify(item, null, 2) + '\n';
  }
  source.lock.version = version;
  files['package-lock.json'] = JSON.stringify(source.lock, null, 2) + '\n';
  files['CHANGELOG.md'] = text.slice(0, parsed.start) + `\n\n## [${version}] - ${date}\n\n${parsed.clean}\n\n` + text.slice(parsed.end);
  return { version, files, notes: parsed.clean };
}
