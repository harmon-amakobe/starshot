import { createReadStream, existsSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** Keep the credited media in one source directory while both apps use it. */
export function observatoryAssets(): Plugin {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../prototype/public/observatory');
  let output = '';
  const mime: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', json: 'application/json', js: 'text/javascript', bin: 'application/octet-stream' };
  return {
    name: 'starshot-observatory-assets',
    configResolved(config) { output = resolve(config.root, config.build.outDir, 'observatory'); },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/observatory/')) { next(); return; }
        const path = resolve(root, decodeURIComponent(url.pathname.slice('/observatory/'.length)));
        if (!path.startsWith(root + sep) || !existsSync(path)) { next(); return; }
        res.setHeader('Content-Type', mime[path.split('.').at(-1)!] ?? 'application/octet-stream');
        createReadStream(path).on('error', next).pipe(res);
      });
    },
    async closeBundle() { await cp(root, output, { recursive: true }); },
  };
}
