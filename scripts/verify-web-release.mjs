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
const metadata = JSON.parse(readFileSync(join(dist, 'release.json'), 'utf8'));
const nextVersion = `${metadata.version.split('-')[0]}-verification.next`;
const nextBuild = createHash('sha256').update(version + '-next').digest('hex').slice(0, 24);
const changedPath = 'observatory/system-orientation.json';
const oldData = readFileSync(join(dist, changedPath), 'utf8');
const newData = JSON.stringify({ ...JSON.parse(oldData), releaseVerification: 'next' });
const integrity = bytes => `sha256-${createHash('sha256').update(bytes).digest('base64')}`;
const changed = new Map([[changedPath, newData]]);
for (const entry of inventory.filter(item => item.path.startsWith('assets/') && item.path.endsWith('.js'))) {
  const text = readFileSync(join(dist, entry.path), 'utf8');
  let updated = text;
  for (const quote of ['"', "'", '`']) updated = updated.replaceAll(quote + metadata.version + quote, quote + nextVersion + quote);
  if (updated !== text) changed.set(entry.path, updated);
}
assert(changed.size > 1, 'the next fixture must change the compiled footer version');
changed.set('release.json', JSON.stringify({ ...metadata, version: nextVersion, buildId: nextBuild }));
const nextInventory = inventory.map(entry => changed.has(entry.path)
  ? { ...entry, integrity: integrity(changed.get(entry.path)) } : entry);
const nextWorker = template.replace(JSON.stringify(version), JSON.stringify(nextBuild))
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
  response.end(next && local === 'sw.js' ? nextWorker : next && changed.has(local)
    ? changed.get(local) : readFileSync(file));
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

async function waitForRegistration(page, phase, timeout = 60_000) {
  const deadline = Date.now() + timeout;
  let state;
  // Poll resolved values in Node: an async waitForFunction predicate can pass on its Promise.
  while (Date.now() < deadline) {
    state = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return { active: registration?.active?.state, waiting: registration?.waiting?.state };
    });
    if (state[phase] === (phase === 'active' ? 'activated' : 'installed')) return;
    await new Promise(ok => setTimeout(ok, 100));
  }
  assert.fail(`the worker did not reach registration state: ${phase}; last state: ${JSON.stringify(state)}`);
}

async function ready(page, target) {
  await page.goto(target, { waitUntil: 'load' });
  await page.getByRole('button', { name: /^(Play|Continue)$/ }).waitFor();
  await waitForRegistration(page, 'active');
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) {
    await page.reload({ waitUntil: 'load' });
  }
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}

async function menuLayout(page, label) {
  for (const [name, width, height] of [['phone', 390, 844], ['small-phone', 360, 640], ['landscape', 844, 390], ['desktop', 1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    const layout = await page.evaluate(() => {
      const rect = selector => {
        const box = document.querySelector(selector).getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
      };
      return { version: rect('[data-release-version]'), source: rect('.release-source>a'),
        about: rect('.release-footer>button'), author: rect('.release-author a'),
        title: rect('.entry-title h1'), actions: rect('.entry-actions'), footer: rect('.release-footer'),
        credit: document.querySelector('.release-author').textContent, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(layout.credit, 'A game by Kobe');
    assert(!layout.overflow, `${name}: no horizontal overflow`);
    assert(Math.abs(layout.version.x + layout.version.width / 2 - width / 2) < 2, `${name}: footer version is centered`);
    assert(layout.source.x < width / 2 && layout.about.x > width / 2, `${name}: source left and About right`);
    assert(layout.title.bottom < layout.actions.y, `${name}: title and Play do not overlap`);
    assert(layout.actions.bottom <= layout.footer.y, `${name}: footer clears play controls`);
    for (const box of [layout.source, layout.about, layout.author]) {
      assert(box.width >= 44 && box.height >= 44, `${name}: links and buttons retain touch targets`);
      assert(box.x >= 0 && box.y >= 0 && box.right <= width && box.bottom <= height, `${name}: controls stay in view`);
    }
    await page.screenshot({ path: join(out, `${label}-${name}-menu.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function waitForNext(context) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    // Chromium may never answer an evaluation sent while an old worker terminates.
    const active = await Promise.all(context.serviceWorkers().map(worker => Promise.race([
      worker.evaluate(expected => self.registration.active?.state === 'activated' && !self.registration.installing
        && !self.registration.waiting && RELEASE === expected, nextBuild).catch(() => false),
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
    const label = base === '/' ? 'root' : 'subpath';
    console.log(`web-release: ${base} checking first-install ownership`);
    // A first visit has no controller. Updating the worker must never take it over.
    await page.goto(target, { waitUntil: 'load' });
    await waitForRegistration(page, 'active');
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
    assert.equal(await page.locator('[data-release-version]').innerText(), `Version ${metadata.version}`);
    assert.equal(await page.locator('.entry-top').getByRole('link', { name: 'Kobe', exact: true }).getAttribute('href'), 'https://limitedsightfullvision.com');
    assert.equal(await page.locator('.release-footer').getByRole('link', { name: 'GitHub', exact: true }).getAttribute('href'), 'https://github.com/harmon-amakobe/starshot');
    assert.equal(await page.locator('.release-source').textContent(), 'View source on GitHub');
    assert.equal(await page.locator('.release-source a').count(), 1);
    assert.equal(await page.locator('.entry-top .entry-mark,.entry-top .entry-build').count(), 0);
    await menuLayout(page, label);
    await page.getByRole('button', { name: 'About and credits' }).click();
    assert.equal(await page.locator('[data-about-version]').innerText(), `Version ${metadata.version}`);
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
    await waitForRegistration(page, 'waiting');
    // Return to the menu without reloading the old compiled application.
    await page.getByRole('button', { name: 'Open main menu', exact: true }).click();
    assert.equal(await page.locator('[data-release-version]').innerText(), `Version ${metadata.version}`,
      'waiting updates cannot relabel the running game');
    const networkMetadata = await (await playContext.request.get(target + 'release.json')).json();
    assert.equal(networkMetadata.version, nextVersion, 'the server already has a different version');
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
    assert.equal(await page.locator('[data-release-version]').innerText(), `Version ${nextVersion}`,
      'the activated release displays its own compiled version');
    assert.equal(await page.evaluate(path => fetch(path).then(r => r.text()), base + changedPath), newData,
      'next launch receives the updated mutable data');
    assert(await page.evaluate(() => caches.has('unrelated-application')), 'other apps keep their caches');
    assert(await page.evaluate(name => caches.has(name), otherCache), 'other registration scopes keep their caches');
    assert(!(await page.evaluate(name => caches.has(name), cacheName)), 'obsolete scoped cache is removed');
    await playContext.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.getByRole('button', { name: /^(Play|Continue)$/ }).waitFor();
    assert.equal(await page.locator('[data-release-version]').innerText(), `Version ${nextVersion}`);
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
