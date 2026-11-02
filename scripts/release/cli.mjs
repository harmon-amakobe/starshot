#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { proposal, stable, preparedNotes } from './versions.mjs';
import { pack, unpack, decodeArchive, digest } from './archive.mjs';
import { route, verifyIdentity, refuseDowngrade } from './policy.mjs';
import { resolveCandidate, registerCandidate, publishCandidate } from './github.mjs';
import { applyProposal } from './proposal.mjs';

const command = process.argv[2], root = resolve(process.env.RELEASE_ROOT ?? '.');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const output = (name, value) => {
  const text = String(value);
  assert(!/[\r\n]/.test(text), 'multiline workflow output denied');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${text}\n`);
  else console.log(`${name}=${text}`);
};
const config = () => read(join(root, 'firebase.json'));
const archivePath = () => resolve(process.env.ARCHIVE_PATH ?? 'package/starshot-web.json.gz');
try {
  if (command === 'plan') {
    const action = route({ repository: process.env.GITHUB_REPOSITORY, event: process.env.GITHUB_EVENT_NAME,
      ref: process.env.GITHUB_REF, target: process.env.RELEASE_TARGET, version: process.env.RELEASE_VERSION ?? '' });
    output('action', action);
    let version = '';
    if (action === 'candidate') {
      version = stable(read(join(root, 'package.json')).version);
      preparedNotes(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), version);
    } else if (action === 'promote') version = stable(process.env.RELEASE_VERSION);
    const record = version ? await resolveCandidate(version, action === 'candidate') : null;
    assert(action !== 'promote' || record, 'candidate version has not been registered');
    output('reuse', !!record);
    output('version', version);
    output('sourceCommit', record?.sourceCommit ?? process.env.GITHUB_SHA);
    output('runId', record?.runId ?? process.env.GITHUB_RUN_ID);
    output('artifactId', record?.artifactId ?? '');
    output('archiveDigest', record?.archiveDigest ?? '');
    output('buildId', record?.buildId ?? '');
    if (record) writeFileSync('candidate.json', JSON.stringify(record, null, 2) + '\n');
  } else if (command === 'propose') {
    const date = execFileSync('git', ['show', '-s', '--format=%cs', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const generated = proposal(root, date);
    const directory = resolve(process.env.PROPOSAL_OUT ?? 'proposal');
    mkdirSync(directory, { recursive: true });
    const result = generated ? { schema: 'starshot.proposal/1', repository: process.env.GITHUB_REPOSITORY,
      sourceRef: process.env.PROPOSAL_BASE ?? process.env.GITHUB_REF_NAME,
      sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), date, ...generated } : null;
    writeFileSync(join(directory, 'proposal.json'), JSON.stringify(result, null, 2) + '\n');
    output('hasProposal', !!generated);
    output('version', generated?.version ?? '');
  } else if (command === 'apply-proposal') {
    assert(process.argv[3], 'provide the downloaded proposal.json path outside the checkout');
    output('version', applyProposal(root, read(resolve(process.argv[3]))));
  } else if (command === 'pack') {
    const bytes = pack(root, config());
    const { metadata } = decodeArchive(bytes, config());
    const directory = resolve('package'); mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'starshot-web.json.gz'), bytes);
    writeFileSync(join(directory, 'release-notes.md'), metadata.kind === 'candidate'
      ? preparedNotes(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), metadata.version) : `Starshot ${metadata.version}\n`);
    for (const key of ['version', 'sourceCommit', 'buildId', 'kind']) output(key, metadata[key]);
    output('archiveDigest', digest(bytes));
  } else if (command === 'unpack') {
    const bytes = readFileSync(archivePath());
    assert.equal(digest(bytes), process.env.EXPECTED_ARCHIVE_DIGEST, 'candidate archive digest mismatch');
    const { metadata } = decodeArchive(bytes, config());
    assert.equal(metadata.version, process.env.EXPECTED_VERSION, 'unexpected game version');
    assert.equal(metadata.sourceCommit, process.env.EXPECTED_SOURCE, 'unexpected game source');
    assert.equal(metadata.buildId, process.env.EXPECTED_BUILD, 'unexpected content identity');
    assert.equal(metadata.kind, process.env.EXPECTED_KIND, 'unexpected release kind');
    unpack(bytes, config(), resolve('deploy'));
  } else if (command === 'register') {
    const bytes = readFileSync(archivePath());
    const { metadata } = decodeArchive(bytes, config());
    assert.equal(metadata.kind, 'candidate', 'not a candidate build');
    await registerCandidate(metadata, bytes, readFileSync('package/release-notes.md', 'utf8'), Number(process.env.ARTIFACT_ID));
  } else if (command === 'preflight') {
    const record = await resolveCandidate(stable(process.env.RELEASE_VERSION));
    assert(record, 'candidate missing');
    const expected = read('deploy/apps/game/dist/release.json');
    verifyIdentity(expected, record);
    const beta = await fetch('https://beta.playstarshot.com/release.json', { cache: 'no-store' });
    assert(beta.ok, 'beta metadata unavailable');
    assert.deepEqual(await beta.json(), expected, 'beta is not serving this exact candidate');
    const response = await fetch('https://playstarshot.com/release.json', { cache: 'no-store' });
    assert(response.ok, 'production metadata unavailable');
    refuseDowngrade(await response.json(), expected);
  } else if (command === 'publish') await publishCandidate(stable(process.env.RELEASE_VERSION));
  else throw new Error(`unknown release command: ${command}`);
} catch (error) { console.error(`release: ${error.message}`); process.exitCode = 1; }
