/** Keep the readable label short; the complete compiled version stays in Build details. */
export function readableVersion(version: string): string {
  const separator = version.indexOf('-');
  if (separator < 0) return `Version ${version}`;
  const base = version.slice(0, separator), prerelease = version.slice(separator + 1);
  const kind = prerelease.split('.')[0];
  const channel = kind === 'beta' ? 'Beta' : kind === 'preview' ? 'Preview' : kind === 'dev' ? 'Development' : null;
  // An unfamiliar prerelease must not look like a stable release.
  return channel ? `Version ${base} · ${channel}` : `Version ${version}`;
}
