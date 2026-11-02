import assert from 'node:assert/strict';
import { REPOSITORY, WORKFLOW, MAIN, validateRecord, successfulBuild } from './policy.mjs';
import { stable } from './versions.mjs';
import { digest } from './archive.mjs';

const base = `https://api.github.com/repos/${REPOSITORY}`;
export async function api(path, { method = 'GET', body, missing = false } = {}) {
  assert(process.env.GH_TOKEN, 'GitHub token missing');
  const response = await fetch(base + path, { method, headers: {
    Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (missing && response.status === 404) return null;
  assert(response.ok, `GitHub ${method} ${path}: ${response.status}`);
  return response.status === 204 ? null : response.json();
}
export async function tagRecord(version) {
  const tag = `starshot-v${stable(version)}`;
  const ref = await api(`/git/ref/tags/${tag}`, { missing: true });
  if (!ref) return null;
  assert.equal(ref.object.type, 'tag', 'candidate requires a protected annotated tag');
  const object = await api(`/git/tags/${ref.object.sha}`);
  assert.equal(object.object.type, 'commit', 'candidate tag must point directly to a commit');
  assert(object.message.length < 8192, 'candidate tag message too large');
  return { record: JSON.parse(object.message), commit: object.object.sha };
}
export async function releaseForTag(tagName) {
  const matches = [];
  // The by-tag endpoint omits drafts. Only the isolated write jobs call this lookup.
  for (let page = 1; page <= 10; page++) {
    const releases = await api(`/releases?per_page=100&page=${page}`);
    matches.push(...releases.filter(release => release.tag_name === tagName));
    if (releases.length < 100) {
      assert(matches.length <= 1, 'multiple releases use the candidate tag');
      return matches[0] ?? null;
    }
  }
  assert.fail('too many releases for bounded draft lookup');
}
export async function resolveCandidate(version, allowIncomplete = false) {
  const tagged = await tagRecord(version);
  if (!tagged) return null;
  const r = tagged.record;
  for (const key of ['runId', 'runAttempt', 'artifactId', 'buildJobId']) assert(Number.isSafeInteger(r[key]) && r[key] > 0, `invalid candidate ${key}`);
  assert(/^[0-9a-f]{40}$/.test(r.sourceCommit), 'invalid candidate SHA');
  const [run, attempt, job, artifact, comparison] = await Promise.all([
    api(`/actions/runs/${r.runId}`), api(`/actions/runs/${r.runId}/attempts/${r.runAttempt}`),
    api(`/actions/jobs/${r.buildJobId}`), api(`/actions/artifacts/${r.artifactId}`),
    api(`/compare/${r.sourceCommit}...main`),
  ]);
  // A downstream failure can reuse its original successful build during the same run's retry.
  const incomplete = allowIncomplete && Number(process.env.GITHUB_RUN_ID) === r.runId;
  return validateRecord(r, { version, run, attempt, job, artifact, tagCommit: tagged.commit,
    ancestor: ['ahead', 'identical'].includes(comparison.status), allowIncomplete: incomplete });
}
export async function registerCandidate(metadata, archive, notes, artifactId) {
  const version = stable(metadata.version);
  let existing = await tagRecord(version);
  let record;
  if (existing) {
    record = await resolveCandidate(version, true);
    assert.equal(record.archiveDigest, digest(archive), 'candidate version is already bound to another archive');
    assert.equal(record.notesDigest, digest(Buffer.from(notes)), 'candidate notes already bound to other bytes');
  } else {
    const runId = Number(process.env.GITHUB_RUN_ID);
    const artifact = await api(`/actions/artifacts/${artifactId}`);
    const run = await api(`/actions/runs/${runId}`);
    const jobs = [];
    for (let page = 1; page <= 10; page++) {
      const result = await api(`/actions/runs/${runId}/jobs?filter=all&per_page=100&page=${page}`);
      jobs.push(...result.jobs);
      if (jobs.length >= result.total_count) break;
      assert(page < 10, 'too many build jobs to resolve safely');
    }
    const job = successfulBuild(jobs, artifact, metadata.sourceCommit), runAttempt = job.run_attempt;
    assert.equal(artifact.workflow_run.head_sha, metadata.sourceCommit, 'artifact source mismatch');
    record = { schema: 'starshot.candidate/1', repository: REPOSITORY, workflow: WORKFLOW,
      sourceRef: MAIN, sourceCommit: metadata.sourceCommit, version, buildId: metadata.buildId,
      runId, runAttempt, buildJobId: job.id, artifactId, artifactDigest: artifact.digest,
      archiveDigest: digest(archive), notesDigest: digest(Buffer.from(notes)) };
    const attempt = await api(`/actions/runs/${runId}/attempts/${runAttempt}`);
    const comparison = await api(`/compare/${metadata.sourceCommit}...main`);
    validateRecord(record, { version, run, artifact, attempt, job, tagCommit: metadata.sourceCommit,
      ancestor: ['ahead', 'identical'].includes(comparison.status), allowIncomplete: true });
    const tag = await api('/git/tags', { method: 'POST', body: { tag: `starshot-v${version}`,
      message: JSON.stringify(record), object: metadata.sourceCommit, type: 'commit' } });
    await api('/git/refs', { method: 'POST', body: { ref: `refs/tags/starshot-v${version}`, sha: tag.sha } });
  }
  const tagName = `starshot-v${version}`;
  let release = await releaseForTag(tagName);
  if (!release) release = await api('/releases', { method: 'POST', body: {
    tag_name: tagName, target_commitish: record.sourceCommit, name: `Starshot ${version}`, body: notes,
    draft: true, prerelease: false, make_latest: 'false',
  } });
  assert.equal(release.tag_name, tagName, 'wrong release tag');
  const assets = {
    'starshot-web.json.gz': archive,
    'candidate.json': Buffer.from(JSON.stringify(record, null, 2) + '\n'),
    'release-notes.md': Buffer.from(notes),
  };
  assets['SHA256SUMS'] = Buffer.from(Object.entries(assets).map(([name, bytes]) => `${digest(bytes)}  ${name}\n`).join(''));
  for (const [name, bytes] of Object.entries(assets)) {
    const prior = release.assets.find(item => item.name === name);
    if (prior) {
      assert.equal(prior.digest, `sha256:${digest(bytes)}`, `existing recovery asset differs: ${name}`);
      continue;
    }
    assert(release.draft, 'published release is missing immutable recovery assets');
    const url = `https://uploads.github.com/repos/${REPOSITORY}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`;
    const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`,
      'Content-Type': 'application/octet-stream', 'X-GitHub-Api-Version': '2022-11-28' }, body: bytes });
    assert(response.ok, `recovery upload failed: ${name} (${response.status})`);
  }
  return record;
}
export async function publishCandidate(version) {
  const record = await resolveCandidate(version);
  assert(record, 'candidate missing');
  const release = await releaseForTag(`starshot-v${stable(version)}`);
  assert(release, 'candidate recovery release missing');
  validateRelease(record, release);
  const response = await fetch('https://playstarshot.com/release.json', { cache: 'no-store' });
  assert(response.ok, 'production metadata unavailable');
  const live = await response.json();
  assert.equal(live.version, record.version, 'production version differs');
  assert.equal(live.sourceCommit, record.sourceCommit, 'production source differs');
  assert.equal(live.buildId, record.buildId, 'production content differs');
  if (release.draft) await api(`/releases/${release.id}`, { method: 'PATCH', body: { draft: false, make_latest: 'true' } });
}
export function validateRelease(record, release) {
  assert.equal(release.tag_name, `starshot-v${record.version}`, 'release tag differs');
  assert.equal(release.name, `Starshot ${record.version}`, 'release title differs');
  assert.equal(release.prerelease, false, 'stable release cannot be marked prerelease');
  assert.equal(typeof release.body, 'string', 'release notes missing');
  assert.equal(digest(Buffer.from(release.body)), record.notesDigest, 'release body differs from reviewed notes');
  validateRecoveryAssets(record, release.assets);
}
export function validateRecoveryAssets(record, list) {
  const assets = new Map(list.map(item => [item.name, item]));
  assert.equal(assets.size, 4, 'release must contain the exact recovery asset set');
  assert.equal(list.length, assets.size, 'duplicate recovery assets');
  assert(list.every(asset => asset.state === 'uploaded'), 'recovery upload is incomplete');
  for (const name of ['starshot-web.json.gz', 'candidate.json', 'release-notes.md', 'SHA256SUMS']) {
    assert(assets.get(name)?.digest?.startsWith('sha256:'), `recovery asset missing: ${name}`);
  }
  assert.equal(assets.get('starshot-web.json.gz').digest, `sha256:${record.archiveDigest}`, 'recovery archive differs');
  assert.equal(assets.get('candidate.json').digest, `sha256:${digest(Buffer.from(JSON.stringify(record, null, 2) + '\n'))}`, 'recovery provenance differs');
  assert.equal(assets.get('release-notes.md').digest, `sha256:${record.notesDigest}`, 'recovery notes differ');
  const checksums = `${record.archiveDigest}  starshot-web.json.gz\n${digest(Buffer.from(JSON.stringify(record, null, 2) + '\n'))}  candidate.json\n${record.notesDigest}  release-notes.md\n`;
  assert.equal(assets.get('SHA256SUMS').digest, `sha256:${digest(Buffer.from(checksums))}`, 'recovery checksums differ');
}
