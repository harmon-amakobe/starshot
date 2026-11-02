import assert from 'node:assert/strict';
import { stable, SEMVER, notes, bump, preparedNotes } from './versions.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export function contentId(inventory, template, identity) {
  return createHash('sha256').update(JSON.stringify(inventory)).update(template)
    .update(JSON.stringify(identity)).update(identity.sourceCommit ?? '').digest('hex').slice(0, 24);
}

export function identityFor(root, env = process.env) {
  const current = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  const text = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  if (env.STARSHOT_BUILD_KIND === 'candidate') preparedNotes(text, current);
  const parsed = notes(text);
  const base = env.STARSHOT_BUILD_KIND === 'candidate' || !parsed.releases.length || !parsed.hasContent ? current : bump(current, parsed.kind);
  return buildIdentity(base, env);
}

export function buildIdentity(base, env = process.env) {
  stable(base);
  const kind = env.STARSHOT_BUILD_KIND ?? 'development';
  assert(['development', 'preview', 'beta', 'candidate'].includes(kind), 'invalid build kind');
  const sourceCommit = env.GITHUB_SHA ?? null;
  if (sourceCommit) assert(/^[0-9a-f]{40}$/.test(sourceCommit), 'invalid source commit');
  let version = `${base}-dev`;
  if (kind !== 'development') {
    assert(sourceCommit && /^[1-9]\d*$/.test(env.GITHUB_RUN_ID ?? '') && /^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'CI build identity missing');
    version = kind === 'candidate' ? base : `${base}-${kind}.${env.GITHUB_RUN_ID}.${env.GITHUB_RUN_ATTEMPT}`;
  }
  assert(SEMVER.test(version), 'invalid generated semantic version');
  return { version, kind, sourceCommit };
}
