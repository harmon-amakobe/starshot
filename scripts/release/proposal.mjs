import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { proposal } from './versions.mjs';
import { REPOSITORY } from './policy.mjs';

export function validateProposal(root, supplied, { clean = false } = {}) {
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(supplied?.schema, 'starshot.proposal/1', 'invalid proposal');
  assert.equal(supplied.repository, REPOSITORY, 'wrong proposal repository');
  assert(/^(?:starshot|codex)\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(supplied.sourceRef), 'proposal must target an integration branch');
  assert.equal(git(['rev-parse', 'HEAD']), supplied.sourceCommit, 'proposal source differs from HEAD; prepare again');
  if (clean) assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '', 'apply-proposal requires a clean checkout');
  assert.equal(git(['show', '-s', '--format=%cs', 'HEAD']), supplied.date, 'proposal date differs from source date');
  const generated = proposal(root, supplied.date);
  assert.deepEqual(generated, { version: supplied.version, files: supplied.files, notes: supplied.notes }, 'proposal differs from CI generation');
  return generated;
}
export function applyProposal(root, supplied) {
  const generated = validateProposal(root, supplied, { clean: true });
  // The regenerated allowlist and exact bytes are checked before any file is written.
  for (const [path, text] of Object.entries(generated.files)) writeFileSync(join(root, path), text);
  return generated.version;
}
