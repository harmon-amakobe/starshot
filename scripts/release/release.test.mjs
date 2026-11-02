import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { spawnSync, execFileSync } from 'node:child_process';
import { bump, stable, notes, preparedNotes, manifests, parity, proposal } from './versions.mjs';
import { buildIdentity, identityFor, contentId } from './identity.mjs';
import { route, validateRecord, verifyIdentity, refuseDowngrade, successfulBuild, REPOSITORY, WORKFLOW, MAIN, PR0 } from './policy.mjs';
import { decodeArchive, digest, unpack } from './archive.mjs';
import { validateRecoveryAssets, validateRelease, releaseForTag } from './github.mjs';
import { validateProposal, applyProposal } from './proposal.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
test('publication follows a verified promotion even when upstream build is skipped', () => {
  const workflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
  const condition = workflow.match(/  publish:\n[\s\S]*?    if: >-\n([\s\S]*?)    runs-on:/)?.[1].trim();
  assert(condition, 'publication needs an explicit status condition');
  assert.match(condition, /(?:always|cancelled)\(\)/, 'override the implicit success check on skipped ancestors');
  // Evaluate the actual workflow condition with the promotion dependency results.
  const eligible = new Function('needs', 'github', 'cancelled', `return (${condition});`);
  const needs = { plan: { result: 'success', outputs: { action: 'promote' } },
    firebase: { result: 'success' }, build: { result: 'skipped' }, register: { result: 'skipped' } };
  const github = { ref: MAIN };
  assert.equal(eligible(needs, github, () => false), true);
  assert.equal(eligible(needs, github, () => true), false);
  assert.equal(eligible(needs, { ref: 'refs/heads/topic' }, () => false), false);
  for (const job of ['plan', 'firebase']) for (const result of ['failure', 'cancelled', 'skipped']) {
    const failed = structuredClone(needs); failed[job].result = result;
    assert.equal(eligible(failed, github, () => false), false, `${job}: ${result}`);
  }
  for (const action of ['preview', 'beta', 'candidate']) {
    const other = structuredClone(needs); other.plan.outputs.action = action;
    assert.equal(eligible(other, github, () => false), false, action);
  }
});

const source = manifests(root);
// Bootstrap fixtures must still pass after CI versions every private workspace.
const fixture = structuredClone(source);
const names = new Set([...fixture.items.values()].map(item => item.name));
for (const [path, data] of fixture.items) {
  data.version = '0.1.0';
  fixture.lock.packages[path].version = '0.1.0';
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, range] of Object.entries(data[field] ?? {})) if (names.has(name) && range !== '*') {
      data[field][name] = fixture.lock.packages[path][field][name] = range.replace(/\d+\.\d+\.\d+/, '0.1.0');
    }
  }
}
fixture.lock.version = '0.1.0';
for (const path of ['packages/presentation', 'apps/prototype']) {
  delete fixture.items.get(path).version;
  delete fixture.lock.packages[path].version;
}
const changelog = '# Changes\n\nWrite under `## [Unreleased]`.\n\n## [Unreleased]\n\n### Added\n- A new mission.\n';
function scratch(t, text = changelog) {
  const directory = mkdtempSync(join(tmpdir(), 'starshot-release-tests-'));
  t.after(() => {
    assert(resolve(directory).startsWith(resolve(tmpdir()) + '/'.replace('/', process.platform === 'win32' ? '\\' : '/') + 'starshot-release-tests-'));
    rmSync(directory, { recursive: true, force: true });
  });
  for (const [path, data] of fixture.items) {
    const file = join(directory, path, 'package.json'); mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 2));
  }
  writeFileSync(join(directory, 'package-lock.json'), JSON.stringify(fixture.lock));
  writeFileSync(join(directory, 'CHANGELOG.md'), text);
  return directory;
}
test('semantic arithmetic and strict version inputs', () => {
  assert.equal(bump('1.9.9', 'patch'), '1.9.10');
  assert.equal(bump('1.9.9', 'minor'), '1.10.0');
  assert.equal(bump('1.9.9', 'major'), '2.0.0');
  for (const bad of ['01.2.3', 'v1.2.3', '1.2', '1.2.3-beta.1', '9007199254740992.0.0', '1.2.3\n']) assert.throws(() => stable(bad));
  assert.throws(() => bump('1.2.3', 'feature'));
});
test('notes infer changes and reject ambiguous inputs', () => {
  assert.equal(notes(changelog).kind, 'minor');
  assert.equal(notes(changelog.replace('### Added', '### Fixed')).kind, 'patch');
  assert.equal(notes(changelog.replace('### Added', '### Breaking changes')).kind, 'major');
  assert.equal(notes(changelog.replace('### Added', 'Bump: patch\n\n### Added')).kind, 'patch');
  assert.equal(notes(changelog.replace('### Added\n- A new mission.', '### Added\n<!-- empty -->\n### Fixed\n- A repair.')).kind, 'patch');
  assert.equal(notes(changelog.replace('### Added', '<!-- Bump: major -->\n### Fixed')).kind, 'patch');
  assert.equal(notes('# Changelog\n## [Unreleased]\n### Added\n<!-- empty -->').hasContent, false);
  for (const bad of [
    changelog + '\n## [Unreleased]\n', changelog.replace('### Added', 'Bump: patch\nBump: minor'),
    changelog.replace('### Added', 'Bump: banana'), changelog + '\n## [v0.1.0] - 2026-11-02\n',
    changelog + '\n## [0.1.0] - 2026-02-30\n', changelog + '\n### Added\n- duplicate\n',
    changelog + '\n## [0.1.0] - 2026-11-02\n## [0.1.0] - 2026-11-02\n',
  ]) assert.throws(() => notes(bad));
});
test('initial proposal preserves baseline, intro and notes; retry is empty', t => {
  const directory = scratch(t);
  const generated = proposal(directory, '2026-11-02');
  assert.equal(generated.version, '0.1.0');
  assert.match(generated.files['CHANGELOG.md'], /Write under `## \[Unreleased\]`\./);
  assert.match(generated.files['CHANGELOG.md'], /^## \[0.1.0\] - 2026-11-02$/m);
  for (const [path, text] of Object.entries(generated.files)) writeFileSync(join(directory, path), text);
  parity(manifests(directory), true);
  assert.equal(proposal(directory, '2026-11-02'), null);
  assert.equal(preparedNotes(generated.files['CHANGELOG.md'], '0.1.0'), '### Added\n- A new mission.');
  assert.throws(() => preparedNotes(changelog, '0.1.0'));
  writeFileSync(join(directory, 'CHANGELOG.md'), generated.files['CHANGELOG.md'].replace(/^## \[Unreleased\]$/m, '## [Unreleased]\n\n### Fixed\n- A repair.'));
  assert.equal(proposal(directory, '2026-11-03').version, '0.1.1');
});
test('real repository notes accept pending or prepared state', () => {
  const text = readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), parsed = notes(text);
  if (parsed.hasContent) assert(proposal(root, '2026-11-02').notes.length > 0);
  else {
    assert.equal(proposal(root, '2026-11-02'), null);
    assert(preparedNotes(text, source.items.get('').version).length > 0);
  }
});
test('parity rejects conflicting manifests, lock entries and internal ranges', () => {
  parity(structuredClone(fixture));
  const mutations = [
    value => { value.items.get('apps/game').version = '0.9.0'; },
    value => { value.lock.version = '0.9.0'; },
    value => { delete value.lock.packages['apps/game']; },
    value => { value.lock.packages['apps/game'].version = '0.9.0'; },
    value => { value.items.get('apps/game').dependencies['@starshot/physics'] = '^0.2.0'; },
    value => { value.lock.packages['apps/game'].dependencies['@starshot/physics'] = '^0.1.0'; },
  ];
  for (const mutate of mutations) { const value = structuredClone(fixture); mutate(value); assert.throws(() => parity(value)); }
  assert.throws(() => parity(structuredClone(fixture), true), 'unversioned private workspaces require first CI proposal');
});
test('compiled identity separates semantic version, channel and source', () => {
  assert.equal(buildIdentity('0.1.0', {}).version, '0.1.0-dev');
  const env = { STARSHOT_BUILD_KIND: 'beta', GITHUB_SHA: 'a'.repeat(40), GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' };
  assert.equal(buildIdentity('0.2.0', env).version, '0.2.0-beta.123.1');
  assert.notEqual(buildIdentity('0.2.0', env).version, buildIdentity('0.2.0', { ...env, GITHUB_RUN_ATTEMPT: '2' }).version);
  assert.equal(buildIdentity('0.2.0', { ...env, STARSHOT_BUILD_KIND: 'candidate' }).version, '0.2.0');
  assert.throws(() => buildIdentity('0.2.0', { STARSHOT_BUILD_KIND: 'candidate' }));
});
test('different bytes under one planned version have different cache identities', () => {
  const identity = buildIdentity('0.1.0', {}), inventory = [{ path: 'data.json', integrity: 'first' }];
  const first = contentId(inventory, 'worker', identity);
  assert.equal(first, contentId(inventory, 'worker', identity));
  assert.notEqual(first, contentId([{ ...inventory[0], integrity: 'second' }], 'worker', identity));
  assert.notEqual(first, contentId(inventory, 'updated worker', identity));
  assert.notEqual(first, contentId(inventory, 'worker', { ...identity, sourceCommit: 'a'.repeat(40) }));
});
test('snapshot base follows prepared version until there are pending notes', t => {
  const directory = scratch(t), generated = proposal(directory, '2026-11-02');
  for (const [path, text] of Object.entries(generated.files)) writeFileSync(join(directory, path), text);
  const env = { STARSHOT_BUILD_KIND: 'beta', GITHUB_SHA: 'a'.repeat(40), GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' };
  assert.equal(identityFor(directory, env).version, '0.1.0-beta.123.1');
  for (const [category, expected] of [['Fixed', '0.1.1'], ['Added', '0.2.0']]) {
    writeFileSync(join(directory, 'CHANGELOG.md'), generated.files['CHANGELOG.md'].replace(/^## \[Unreleased\]$/m, `## [Unreleased]\n\n### ${category}\n- A change.`));
    assert.equal(identityFor(directory, env).version, `${expected}-beta.123.1`);
  }
});
test('routing rejects forks, tags, markers, production pushes and other events', () => {
  const good = { repository: REPOSITORY, event: 'workflow_dispatch', ref: MAIN, target: 'promote', version: '0.1.0' };
  assert.equal(route(good), 'promote');
  assert.equal(route({ repository: REPOSITORY, event: 'push', ref: PR0 }), 'beta');
  for (const ref of [MAIN, PR0, 'refs/heads/codex/topic']) for (const target of ['beta', 'preview']) assert.equal(route({ ...good, ref, target, version: '' }), target);
  assert.equal(route({ ...good, target: 'candidate', version: '' }), 'candidate');
  for (const changed of [{ repository: 'fork/starshot' }, { event: 'pull_request' }, { event: 'push' },
    { ref: 'refs/tags/starshot-v0.1.0' }, { ref: PR0 }, { target: '[release]' }, { version: '0.1.0-beta.1' }, { version: '1.2.3; echo bad' }]) assert.throws(() => route({ ...good, ...changed }));
  const workflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
  assert(!/branches: \[main/.test(workflow));
  assert(!/pull_request_target:|workflow_run:|pages: write/.test(workflow));
  const prepare = readFileSync(join(root, '.github/workflows/prepare-release.yml'), 'utf8');
  assert(prepare.includes("vars.RELEASE_PR_AUTOMATION_ENABLED == 'true'"));
  for (const flag of ['', 'false', 'TRUE']) {
    const result = spawnSync(process.execPath, ['scripts/release/publish-proposal.mjs'], { cwd: root,
      env: { ...process.env, RELEASE_PR_AUTOMATION_ENABLED: flag }, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /automatic proposal publication is disabled/);
  }
});
function provenance() {
  const sha = 'a'.repeat(40), hash = 'b'.repeat(64);
  const record = { schema: 'starshot.candidate/1', repository: REPOSITORY, workflow: WORKFLOW, sourceRef: MAIN,
    sourceCommit: sha, version: '0.1.0', buildId: 'c'.repeat(24), runId: 1, runAttempt: 1, buildJobId: 2,
    artifactId: 3, artifactDigest: `sha256:${hash}`, archiveDigest: hash, notesDigest: hash };
  const evidence = { version: '0.1.0', tagCommit: sha, ancestor: true,
    run: { id: 1, repository: { full_name: REPOSITORY }, head_branch: 'main', head_sha: sha, path: WORKFLOW, event: 'workflow_dispatch', status: 'completed', conclusion: 'success' },
    attempt: { run_attempt: 1, head_sha: sha },
    job: { id: 2, run_id: 1, run_attempt: 1, head_sha: sha, name: 'build', status: 'completed', conclusion: 'success', started_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:10:00Z' },
    artifact: { id: 3, name: 'web-release-1', workflow_run: { id: 1, head_sha: sha }, digest: `sha256:${hash}`, expired: false,
      expires_at: '2099-01-01T00:00:00Z', created_at: '2026-01-01T00:09:00Z' } };
  return { record, evidence };
}
test('promotion provenance fails closed on source, digest, expiry and failed verification', () => {
  const { record, evidence } = provenance();
  validateRecord(record, evidence);
  for (const mutate of [
    value => { value.run.head_sha = 'd'.repeat(40); }, value => { value.artifact.digest = 'sha256:' + 'd'.repeat(64); },
    value => { value.artifact.expired = true; }, value => { value.artifact.expires_at = '2020-01-01'; },
    value => { value.tagCommit = 'd'.repeat(40); }, value => { value.run.repository.full_name = 'fork/starshot'; },
    value => { value.run.path = '.github/workflows/ci.yml'; }, value => { value.run.conclusion = 'failure'; },
    value => { value.job.conclusion = 'failure'; }, value => { value.job.conclusion = 'skipped'; },
    value => { value.job.run_attempt = 2; }, value => { value.artifact.created_at = '2026-01-02'; },
    value => { value.ancestor = false; }, value => { value.artifact.id = 4; },
  ]) { const changed = structuredClone(evidence); mutate(changed); assert.throws(() => validateRecord(record, changed)); }
  // A failed downstream job can retry with the same successful build, never a failed build.
  validateRecord(record, { ...evidence, run: { ...evidence.run, conclusion: null }, allowIncomplete: true });
  assert.throws(() => validateRecord({ ...record, version: '0.1.0-beta.1' }, evidence));
  verifyIdentity({ kind: 'candidate', version: record.version, sourceCommit: record.sourceCommit, buildId: record.buildId }, record);
  assert.throws(() => verifyIdentity({ kind: 'candidate', version: record.version, sourceCommit: record.sourceCommit, buildId: 'd'.repeat(24) }, record));
});
test('registration retries locate the original artifact build across attempts', () => {
  const { evidence } = provenance();
  const later = { ...evidence.job, id: 20, run_attempt: 2, started_at: '2026-01-02T00:00:00Z', completed_at: '2026-01-02T00:10:00Z' };
  assert.equal(successfulBuild([later, evidence.job], evidence.artifact, evidence.run.head_sha).run_attempt, 1);
  assert.throws(() => successfulBuild([later], evidence.artifact, evidence.run.head_sha));
  assert.throws(() => successfulBuild([evidence.job, evidence.job], evidence.artifact, evidence.run.head_sha));
});
test('publication checks the complete recovery set and every digest', () => {
  const { record } = provenance(), candidateHash = digest(Buffer.from(JSON.stringify(record, null, 2) + '\n'));
  const sums = `${record.archiveDigest}  starshot-web.json.gz\n${candidateHash}  candidate.json\n${record.notesDigest}  release-notes.md\n`;
  const list = [['starshot-web.json.gz', record.archiveDigest], ['candidate.json', candidateHash],
    ['release-notes.md', record.notesDigest], ['SHA256SUMS', digest(Buffer.from(sums))]]
    .map(([name, hash]) => ({ name, digest: `sha256:${hash}`, state: 'uploaded' }));
  validateRecoveryAssets(record, list);
  for (const index of [0, 1, 2, 3]) {
    const changed = structuredClone(list); changed[index].digest = 'sha256:' + 'f'.repeat(64);
    assert.throws(() => validateRecoveryAssets(record, changed));
  }
  assert.throws(() => validateRecoveryAssets(record, list.slice(1)));
  assert.throws(() => validateRecoveryAssets(record, [...list, { name: 'unreviewed.exe', digest: 'sha256:' + 'f'.repeat(64) }]));
  assert.throws(() => validateRecoveryAssets(record, [...list, list[0]]));
  assert.throws(() => validateRecoveryAssets(record, list.map(item => ({ ...item, state: 'starter' }))));
});
test('publication rejects draft title, notes or release-type mutation', () => {
  const { record } = provenance(), body = 'Reviewed release notes';
  record.notesDigest = digest(Buffer.from(body));
  const candidateHash = digest(Buffer.from(JSON.stringify(record, null, 2) + '\n'));
  const sums = `${record.archiveDigest}  starshot-web.json.gz\n${candidateHash}  candidate.json\n${record.notesDigest}  release-notes.md\n`;
  const assets = [['starshot-web.json.gz', record.archiveDigest], ['candidate.json', candidateHash],
    ['release-notes.md', record.notesDigest], ['SHA256SUMS', digest(Buffer.from(sums))]]
    .map(([name, hash]) => ({ name, digest: `sha256:${hash}`, state: 'uploaded' }));
  const release = { name: 'Starshot 0.1.0', tag_name: 'starshot-v0.1.0', body, prerelease: false, assets };
  validateRelease(record, release);
  for (const changed of [{ name: 'Wrong title' }, { body: 'Unreviewed notes' }, { body: null }, { prerelease: true }, { tag_name: 'starshot-v0.2.0' }]) {
    assert.throws(() => validateRelease(record, { ...release, ...changed }));
  }
});
test('draft lookup supports retries and rejects ambiguous release records', async t => {
  const token = process.env.GH_TOKEN; process.env.GH_TOKEN = 'fixture';
  t.after(() => { if (token === undefined) delete process.env.GH_TOKEN; else process.env.GH_TOKEN = token; });
  let records = [{ id: 1, tag_name: 'starshot-v0.1.0', draft: true }];
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, `https://api.github.com/repos/${REPOSITORY}/releases?per_page=100&page=1`);
    return { ok: true, status: 200, json: async () => records };
  });
  assert.equal((await releaseForTag('starshot-v0.1.0')).draft, true);
  assert.equal(await releaseForTag('starshot-v0.2.0'), null);
  records = [...records, { ...records[0], id: 2 }];
  await assert.rejects(releaseForTag('starshot-v0.1.0'), /multiple releases/);
});
test('owner apply accepts only an exact proposal for a clean source checkout', t => {
  const directory = scratch(t), git = args => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  git(['init', '--quiet']); git(['config', 'core.autocrlf', 'false']); git(['add', '.']);
  git(['-c', 'user.name=Release fixture', '-c', 'user.email=fixture@example.com', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'fixture']);
  const date = git(['show', '-s', '--format=%cs', 'HEAD']);
  const supplied = { schema: 'starshot.proposal/1', repository: REPOSITORY, sourceRef: 'starshot/pr0-bootstrap', sourceCommit: git(['rev-parse', 'HEAD']), date, ...proposal(directory, date) };
  validateProposal(directory, supplied, { clean: true });
  assert.throws(() => applyProposal(directory, { ...supplied, sourceCommit: 'f'.repeat(40) }));
  assert.throws(() => applyProposal(directory, { ...supplied, files: { ...supplied.files, '../escape': 'bad' } }));
  assert.throws(() => applyProposal(directory, { ...supplied, notes: 'mutated notes' }));
  writeFileSync(join(directory, 'unknown.txt'), 'dirty');
  assert.throws(() => applyProposal(directory, supplied));
  rmSync(join(directory, 'unknown.txt'));
  assert.equal(applyProposal(directory, supplied), '0.1.0');
  parity(manifests(directory), true);
  assert.throws(() => applyProposal(directory, supplied), 'a repeat cannot overwrite a dirty prepared checkout');
});
test('promotion retries do not become rollback or version reuse', () => {
  const current = { schema: 2, version: '0.2.0', sourceCommit: 'a'.repeat(40), buildId: 'b'.repeat(24) };
  refuseDowngrade(current, current);
  refuseDowngrade({ ...current, version: '0.1.0' }, current);
  assert.throws(() => refuseDowngrade(current, { ...current, version: '0.1.0' }));
  assert.throws(() => refuseDowngrade(current, { ...current, buildId: 'c'.repeat(24) }));
  assert.throws(() => refuseDowngrade(current, { ...current, sourceCommit: 'c'.repeat(40) }));
});
const config = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));
function archiveFixture() {
  return { schema: 'starshot.static/1', files: [
    ['firebase.json', JSON.stringify(config)], ['apps/game/dist/index.html', '<html></html>'],
    ['apps/game/dist/sw.js', 'worker'], ['apps/game/dist/assets/test.js', 'script'],
    ['apps/game/dist/release.json', JSON.stringify({ schema: 2, version: '0.1.0', kind: 'candidate', sourceCommit: 'a'.repeat(40), buildId: 'b'.repeat(24) })],
  ].map(([path, text]) => ({ path, data: Buffer.from(text).toString('base64') })) };
}
const encode = value => gzipSync(JSON.stringify(value));
test('static archive accepts an astronomy asset larger than 11 MB', () => {
  const value = archiveFixture(), data = Buffer.alloc(12 * 1024 * 1024, 173);
  value.files.push({ path: 'apps/game/dist/observatory/satellite-states.bin', data: data.toString('base64') });
  const decoded = decodeArchive(encode(value), config);
  assert.equal(decoded.files.at(-1).data.length, data.length);
  assert.equal(digest(decoded.files.at(-1).data), digest(data));
});
test('static archive rejects traversal, symlinks, duplicates, hooks and config changes', t => {
  const valid = archiveFixture(), bytes = encode(valid);
  assert.equal(decodeArchive(bytes, config).metadata.version, '0.1.0');
  for (const path of ['../escape', '/absolute', 'C:/file', 'apps\\game\\dist\\x', 'scripts/run.mjs', 'apps/game/dist/../secret', 'apps/game/dist/.env']) {
    const value = structuredClone(valid); value.files.push({ path, data: '' }); assert.throws(() => decodeArchive(encode(value), config));
  }
  for (const mutate of [
    value => value.files.push(value.files[1]), value => { value.files[1].link = '../'; },
    value => { value.files[0].data = Buffer.from(JSON.stringify({ ...config, predeploy: 'echo bad' })).toString('base64'); },
    value => { value.files = value.files.filter(file => !file.path.endsWith('sw.js')); },
    value => { value.files[1].data = '?not-base64'; },
  ]) { const value = structuredClone(valid); mutate(value); assert.throws(() => decodeArchive(encode(value), config)); }
  const directory = scratch(t), out = join(directory, 'extracted');
  unpack(bytes, config, out);
  assert.equal(readFileSync(join(out, 'apps/game/dist/sw.js'), 'utf8'), 'worker');
  assert.throws(() => unpack(bytes, config, out), 'extraction never overwrites existing files');
  const changed = archiveFixture(); changed.files[1].data = Buffer.from('different').toString('base64');
  assert.notEqual(digest(encode(changed)), digest(bytes));
  assert.throws(() => decodeArchive(gzipSync(Buffer.alloc(65 * 1024 * 1024)), config), 'bounded decompression rejects bombs');
});
