import { createHash } from 'node:crypto';
import { cp, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('base64');

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesBelow(join(directory, entry.name)) : [join(directory, entry.name)]));
  return groups.flat().sort();
}

/** Finish after the shared media copy, so an offline release is one coherent build. */
export async function finishRelease(output: string, repository: string) {
  for (const name of ['LICENSE', 'NOTICE.md', 'CREDITS.md']) {
    await cp(resolve(repository, name), join(output, name));
  }
  await cp(resolve(repository, 'LICENSES'), join(output, 'LICENSES'), { recursive: true });
  const template = await readFile(join(output, 'sw.js'), 'utf8');
  const inventory = await Promise.all((await filesBelow(output))
    .filter(file => !file.endsWith('.map') && !['sw.js', 'release.json'].includes(relative(output, file)))
    .map(async file => {
      const bytes = await readFile(file);
      return { path: relative(output, file).replaceAll('\\', '/'), integrity: `sha256-${sha256(bytes)}`, bytes: bytes.length };
    }));
  const version = createHash('sha256').update(JSON.stringify(inventory)).update(template)
    .update(process.env.GITHUB_SHA ?? '').digest('hex').slice(0, 24);
  const metadata = JSON.stringify({ version, commit: process.env.GITHUB_SHA ?? null,
    files: inventory.length, bytes: inventory.reduce((sum, file) => sum + file.bytes, 0) }, null, 2) + '\n';
  await writeFile(join(output, 'release.json'), metadata);
  inventory.push({ path: 'release.json', integrity: `sha256-${sha256(metadata)}`, bytes: Buffer.byteLength(metadata) });
  await writeFile(join(output, 'sw.js'), template
    .replace('__STARSHOT_RELEASE__', JSON.stringify(version))
    .replace('__STARSHOT_PRECACHE__', JSON.stringify(inventory.map(({ path, integrity }) => ({ path, integrity })))));
}
