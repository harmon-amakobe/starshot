#!/usr/bin/env node
// Optional repository writes only. This script never runs application dependencies or cloud auth.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { api } from './github.mjs';
import { proposal, stable } from './versions.mjs';
import { REPOSITORY } from './policy.mjs';
import { validateProposal } from './proposal.mjs';

try {
  assert.equal(process.env.RELEASE_PR_AUTOMATION_ENABLED, 'true', 'automatic proposal publication is disabled');
  assert.equal(process.env.GITHUB_REF, 'refs/heads/main', 'proposal publisher must run from main');
  const supplied = JSON.parse(readFileSync('proposal/proposal.json', 'utf8'));
  assert.equal(supplied.schema, 'starshot.proposal/1', 'invalid proposal');
  assert.equal(supplied.repository, REPOSITORY, 'wrong proposal repository');
  assert(/^(?:starshot|codex)\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(supplied.sourceRef), 'proposal must target an integration branch');
  const source = resolve('source');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(), supplied.sourceCommit, 'source checkout moved');
  const generated = validateProposal(source, supplied);
  const current = await api(`/git/ref/heads/${encodeURIComponent(supplied.sourceRef)}`);
  assert.equal(current.object.sha, supplied.sourceCommit, 'integration branch advanced; prepare again');
  const branch = `codex/release-${stable(supplied.version)}`;
  const prior = await api(`/git/ref/heads/${encodeURIComponent(branch)}`, { missing: true });
  if (!prior) {
    const parent = await api(`/git/commits/${supplied.sourceCommit}`);
    const tree = await api('/git/trees', { method: 'POST', body: { base_tree: parent.tree.sha,
      tree: Object.entries(generated.files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })) } });
    const bot = { name: 'github-actions[bot]', email: '41898282+github-actions[bot]@users.noreply.github.com' };
    const owner = { name: 'Harmon Amakobe', email: '73005556+harmon-amakobe@users.noreply.github.com' };
    const commit = await api('/git/commits', { method: 'POST', body: {
      message: `chore(release): prepare Starshot ${generated.version}\n\nSigned-off-by: ${owner.name} <${owner.email}>\nCo-Authored-By: GitHub Actions release generator <${bot.email}>`,
      tree: tree.sha, parents: [supplied.sourceCommit], author: owner, committer: bot,
    } });
    await api('/git/refs', { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: commit.sha } });
  } else {
    const commit = await api(`/git/commits/${prior.object.sha}`);
    assert.equal(commit.parents[0]?.sha, supplied.sourceCommit, 'existing proposal belongs to another base; do not overwrite it');
    const parent = await api(`/git/commits/${supplied.sourceCommit}`);
    const expected = await api('/git/trees', { method: 'POST', body: { base_tree: parent.tree.sha,
      tree: Object.entries(generated.files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })) } });
    assert.equal(commit.tree.sha, expected.sha, 'existing proposal changed; do not overwrite it');
  }
  const pulls = await api(`/pulls?head=harmon-amakobe:${encodeURIComponent(branch)}&base=${encodeURIComponent(supplied.sourceRef)}&state=open`);
  if (!pulls.length) await api('/pulls', { method: 'POST', body: { title: `Prepare Starshot ${generated.version}`,
    head: branch, base: supplied.sourceRef, body: `CI generated versions and release notes from Unreleased.\n\nPart of #6\n\nReview the generated diff and approve the GitHub Actions run before merging. No production deployment is triggered by this PR.` } });
  console.log(`release proposal ready: ${branch} -> ${supplied.sourceRef}`);
} catch (error) { console.error(`release proposal: ${error.message}`); process.exitCode = 1; }
