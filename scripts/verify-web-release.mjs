#!/usr/bin/env node
// Exercise the built worker, offline startup and a coherent two-release transition.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = resolve(root, 'apps/game/dist');
const outFlag = process.argv.indexOf('--out');
const out = resolve(outFlag >= 0 ? process.argv[outFlag + 1] : join(tmpdir(), `starshot-web-release-${Date.now()}`));
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright');
const template = readFileSync(join(dist, 'sw.js'), 'utf8');
const version = JSON.parse(/^const RELEASE = (.*);$/m.exec(template)[1]);
const inventory = JSON.parse(/^const INVENTORY = (.*);$/m.exec(template)[1]);
const changedPath = 'observatory/system-orientation.json';
const oldData = readFileSync(join(dist, changedPath), 'utf8');
const newData = JSON.stringify({ ...JSON.parse(oldData), releaseVerification: 'next' });
const integrity = bytes => `sha256-${createHash('sha256').update(bytes).digest('base64')}`;
const nextInventory = inventory.map(entry => entry.path === changedPath
  ? { ...entry, integrity: integrity(newData) } : entry);
const nextWorker = template.replace(JSON.stringify(version), JSON.stringify(`${version}-next`))
  .replace(JSON.stringify(inventory), JSON.stringify(nextInventory));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
let next = false;
const watchdog = setTimeout(() => { console.error('web-release: lifecycle verification timed out'); process.exit(1); }, 180_000);
watchdog.unref();

const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const base = pathname.startsWith('/starshot/') ? '/starshot/' : '/';
  let local;
  try { local = decodeURIComponent(pathname.slice(base.length)) || 'index.html'; }
  catch { response.writeHead(400).end(); return; }
  const file = resolve(dist, local);
  if (!file.startsWith(dist + sep) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end('Missing'); return;
  }
  response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache' });
  response.end(next && local === 'sw.js' ? nextWorker : next && local === changedPath
    ? newData : readFileSync(file));
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

async function ready(page, target) {
  await page.goto(target, { waitUntil: 'load' });
  await page.getByRole('button', { name: /^(Play|Continue)$/ }).waitFor();
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active?.state === 'activated';
  }, null, { timeout: 60_000 });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) {
    await page.reload({ waitUntil: 'load' });
  }
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}

async function waitForNext(context) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    // Chromium may never answer an evaluation sent while an old worker terminates.
    const active = await Promise.all(context.serviceWorkers().map(worker => Promise.race([
      worker.evaluate(() => self.registration.active?.state === 'activated' && !self.registration.installing
        && !self.registration.waiting && RELEASE.endsWith('-next')).catch(() => false),
      new Promise(ok => setTimeout(() => ok(false), 1000)),
    ])));
    if (active.some(Boolean)) return;
    await new Promise(ok => setTimeout(ok, 100));
  }
  assert.fail('the next worker did not activate');
}

try {
  for (const base of ['/', '/starshot/']) {
    next = false;
    const context = await browser.newContext();
    let page = await context.newPage();
    const target = origin + base;
    const label = base === '/' ? 'root' : 'mirror';
    console.log(`web-release: ${base} checking first-install ownership`);
    // A first visit has no controller. Updating the worker must never take it over.
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForFunction(async () =>
      (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated',
    null, { timeout: 60_000 });
    assert.equal(await page.evaluate(() => navigator.serviceWorker.controller), null);
    next = true;
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
    await waitForNext(context);
    assert.equal(await page.evaluate(() => navigator.serviceWorker.controller), null,
      'a new worker must not claim an uncontrolled old-build page');
    await context.close();
    console.log(`web-release: ${base} first-install ownership passed`);
    next = false;
    const playContext = await browser.newContext();
    page = await playContext.newPage();
    await ready(page, target);
    console.log(`web-release: ${base} installed release ready`);
    await page.getByRole('button', { name: 'About and credits' }).click();
    await page.getByRole('navigation', { name: 'Credits and support' }).waitFor();
    await page.getByRole('navigation', { name: 'Credits and support' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(out, `${label}-credits.png`) });
    await page.getByRole('button', { name: 'Back', exact: false }).click();
    const cacheName = `starshot-release:${target}:${version}`;
    assert(await page.evaluate(name => caches.has(name), cacheName), 'version cache installed');
    const otherScope = `${origin}${base === '/' ? '/other-game/' : '/'}`;
    const otherCache = `starshot-release:${otherScope}:retained`;
    await page.evaluate(async name => {
      await caches.open('unrelated-application');
      await caches.open(name);
    }, otherCache);
    await playContext.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.getByRole('button', { name: /^(Play|Continue)$/ }).click();
    await page.getByRole('button', { name: /^Pull engine ring to aim/ }).waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Launch', exact: true }).click();
    await page.getByRole('slider', { name: 'Flight timeline' }).waitFor();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    console.log(`web-release: ${base} offline flight launched`);
    await page.screenshot({ path: join(out, `${label}-offline-game.png`) });
    assert.equal(await page.evaluate(path => fetch(path).then(r => r.text()), base + changedPath), oldData,
      'the required observatory data is available offline');
    await playContext.setOffline(false);
    next = true;
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.waiting,
      null, { timeout: 60_000 });
    assert.equal(await page.evaluate(path => fetch(path).then(r => r.text()), base + changedPath), oldData,
      'a waiting release must not replace data under an active flight');
    const worker = playContext.serviceWorkers().find(candidate => candidate.url() === target + 'sw.js'
      && candidate !== null);
    assert(worker, 'the worker runs in the real browser');
    await page.close();
    // With no clients left the next worker can activate without interrupting a game.
    await waitForNext(playContext);
    console.log(`web-release: ${base} next worker active`);
    page = await playContext.newPage();
    await ready(page, target);
    assert.equal(await page.evaluate(path => fetch(path).then(r => r.text()), base + changedPath), newData,
      'next launch receives the updated mutable data');
    assert(await page.evaluate(() => caches.has('unrelated-application')), 'other apps keep their caches');
    assert(await page.evaluate(name => caches.has(name), otherCache), 'other registration scopes keep their caches');
    assert(!(await page.evaluate(name => caches.has(name), cacheName)), 'obsolete scoped cache is removed');
    await playContext.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.getByRole('button', { name: /^(Play|Continue)$/ }).waitFor();
    assert.equal(await page.evaluate(path => fetch(path).then(r => r.text()), base + changedPath), newData);
    await page.screenshot({ path: join(out, `${label}-updated-offline.png`) });
    await playContext.close();
    console.log(`web-release: ${base} first offline launch, flight, update isolation, new data and cache ownership passed`);
  }
  console.log(`web-release: screenshots ${out}`);
} catch (error) {
  console.error(error);
  throw error;
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(ok => server.close(ok));
  clearTimeout(watchdog);
}
