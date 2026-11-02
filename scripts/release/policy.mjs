import assert from 'node:assert/strict';
import { stable } from './versions.mjs';

export const REPOSITORY = 'harmon-amakobe/starshot';
export const WORKFLOW = '.github/workflows/release.yml';
export const MAIN = 'refs/heads/main';
export const PR0 = 'refs/heads/starshot/pr0-bootstrap';
export function route({ repository, event, ref, target, version = '' }) {
  assert.equal(repository, REPOSITORY, 'wrong repository');
  if (event === 'push') {
    assert.equal(ref, PR0, 'only the current integration branch auto-deploys beta');
    return 'beta';
  }
  assert.equal(event, 'workflow_dispatch', 'only explicit actions or the integration push can deploy');
  assert(['preview', 'beta', 'candidate', 'promote'].includes(target), 'unknown release action');
  assert(/^refs\/heads\/(?:main|(?:starshot|codex)\/[A-Za-z0-9][A-Za-z0-9/_-]*)$/.test(ref), 'untrusted branch');
  if (['candidate', 'promote'].includes(target)) assert.equal(ref, MAIN, 'candidates and promotion require main');
  if (target === 'promote') stable(version);
  else assert.equal(version, '', 'a version is accepted only for promotion');
  return target;
}
export function validateRecord(record, { version, run, artifact, attempt, job, tagCommit, ancestor, allowIncomplete = false }) {
  assert.equal(record.schema, 'starshot.candidate/1', 'unknown candidate schema');
  assert.equal(record.repository, REPOSITORY, 'wrong candidate repository');
  assert.equal(record.workflow, WORKFLOW, 'wrong candidate workflow');
  assert.equal(record.sourceRef, MAIN, 'candidate is not from main');
  assert.equal(record.version, stable(version), 'candidate version mismatch');
  assert(/^[0-9a-f]{40}$/.test(record.sourceCommit), 'invalid candidate commit');
  assert.equal(tagCommit, record.sourceCommit, 'tag/source mismatch');
  assert(ancestor, 'candidate source is not on main');
  assert.equal(run.id, record.runId, 'wrong workflow run');
  assert.equal(run.repository?.full_name, REPOSITORY, 'wrong workflow repository');
  assert.equal(run.head_branch, 'main', 'wrong source branch');
  assert.equal(run.head_sha, record.sourceCommit, 'wrong source SHA');
  assert.equal(run.path, WORKFLOW, 'wrong source workflow');
  assert.equal(run.event, 'workflow_dispatch', 'candidate was not explicitly requested');
  assert.equal(attempt.run_attempt, record.runAttempt, 'wrong run attempt');
  assert.equal(attempt.head_sha, record.sourceCommit, 'wrong attempt SHA');
  assert.equal(job.id, record.buildJobId, 'wrong verification job');
  assert.equal(job.run_id, record.runId, 'verification belongs to another run');
  assert.equal(job.run_attempt, record.runAttempt, 'verification belongs to another attempt');
  assert.equal(job.head_sha, record.sourceCommit, 'verification source differs');
  assert.equal(job.name, 'build', 'not the verified build job');
  assert.equal(job.status, 'completed', 'verification is unfinished');
  assert.equal(job.conclusion, 'success', 'original build did not pass');
  assert(Date.parse(artifact.created_at) >= Date.parse(job.started_at) && Date.parse(artifact.created_at) <= Date.parse(job.completed_at), 'artifact was not uploaded by the recorded build');
  if (!allowIncomplete) {
    assert.equal(run.status, 'completed', 'source workflow is unfinished');
    assert.equal(run.conclusion, 'success', 'source workflow is not successful');
  }
  assert.equal(artifact.id, record.artifactId, 'wrong artifact id');
  assert.equal(artifact.name, `web-release-${record.runAttempt}`, 'wrong artifact name');
  assert.equal(artifact.workflow_run?.id, record.runId, 'artifact belongs to another run');
  assert.equal(artifact.workflow_run?.head_sha, record.sourceCommit, 'artifact source differs');
  assert.equal(artifact.digest, record.artifactDigest, 'artifact digest differs');
  assert(!artifact.expired && Date.parse(artifact.expires_at) > Date.now(), 'candidate artifact expired');
  assert(/^sha256:[0-9a-f]{64}$/.test(record.artifactDigest), 'invalid artifact digest');
  assert(/^[0-9a-f]{64}$/.test(record.archiveDigest), 'invalid archive digest');
  assert(/^[0-9a-f]{64}$/.test(record.notesDigest), 'invalid notes digest');
  assert(/^[0-9a-f]{24}$/.test(record.buildId), 'invalid build identity');
  return record;
}
export function successfulBuild(jobs, artifact, sourceCommit) {
  const matching = jobs.filter(job => job.name === 'build' && job.status === 'completed' && job.conclusion === 'success'
    && job.run_id === artifact.workflow_run.id && job.head_sha === sourceCommit
    && artifact.name === `web-release-${job.run_attempt}`
    && Date.parse(artifact.created_at) >= Date.parse(job.started_at)
    && Date.parse(artifact.created_at) <= Date.parse(job.completed_at));
  assert.equal(matching.length, 1, 'artifact must belong to exactly one successful build');
  return matching[0];
}
export function refuseDowngrade(live, candidate) {
  if (!live || live.schema !== 2 || !/^\d+\.\d+\.\d+$/.test(live.version)) return;
  const left = stable(live.version).split('.').map(Number), right = stable(candidate.version).split('.').map(Number);
  const difference = left.map((value, index) => value - right[index]).find(value => value !== 0) ?? 0;
  assert(difference <= 0, 'promotion cannot roll back a newer live release');
  if (!difference) {
    assert.equal(live.sourceCommit, candidate.sourceCommit, 'version already serves another source');
    assert.equal(live.buildId, candidate.buildId, 'version already serves different bytes');
  }
}
export function verifyIdentity(metadata, record) {
  assert.equal(metadata.kind, 'candidate', 'only prepared candidates may be promoted');
  assert.equal(metadata.version, record.version, 'game version differs');
  assert.equal(metadata.sourceCommit, record.sourceCommit, 'game source differs');
  assert.equal(metadata.buildId, record.buildId, 'game content differs');
}
