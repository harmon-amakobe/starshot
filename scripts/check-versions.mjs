#!/usr/bin/env node
import { manifests, parity, notes } from './release/versions.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
try {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const parsed = notes(readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8'));
  const version = parity(manifests(root), parsed.releases.length > 0);
  if (parsed.releases.length && parsed.releases[0] !== version) throw new Error('latest changelog release differs from root version');
  const test = spawnSync(process.execPath, ['--test', 'scripts/release/release.test.mjs'], { cwd: root, encoding: 'utf8' });
  if (test.status !== 0) throw new Error(test.stdout + test.stderr);
  console.log(`versions: ${version}, manifests and lock agree; negative release fixtures passed`);
} catch (error) { console.error(`versions: ${error.message}`); process.exitCode = 1; }
