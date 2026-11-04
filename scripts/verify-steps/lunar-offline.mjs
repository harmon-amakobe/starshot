import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { flightControls } from './screen-flight-controls.mjs';

// Run at / and at --base /starshot/: the release service worker serves a Moon session offline.
// The desktop context also measures, in fresh contexts, what a first visit fetches and what
// the worker serves (findings rows 21 and 22 of 06-resumption.md).
const KEPT = ['shotKey', 'shot', 'flightShot', 'flightSummary', 'phase', 'et', 'parking', 'paused'];

// The worker installs on the first visit but claims no page, so a reload is the first
// controlled load. Poll resolved values in Node, as verify-web-release.mjs does.
async function install(page) {
  for (let i = 0; i < 600; i++) {
    const state = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state);
    if (state === 'activated') return;
    await page.waitForTimeout(100);
  }
  assert.fail('the release worker never activated');
}

// Each URL once, from the Navigation and Resource Timing of the page and its workers. A
// worker-served response has deliveryType 'cache-storage'; Chromium adds 300 header bytes to
// each network transferSize. A response whose sizes both read 0 is listed as unknown, never 0.
const timeline = () => ['navigation', 'resource'].flatMap((type) => performance.getEntriesByType(type)).map((e) => ({
  url: e.name.split('?')[0], initiator: e.initiatorType, transfer: e.transferSize, body: e.encodedBodySize,
  served: e.deliveryType === 'cache-storage',
}));
const entries = async (page) =>
  [await page.evaluate(timeline), ...(await Promise.all(page.workers().map((w) => w.evaluate(timeline))))].flat();
function costs(list, before = new Set()) {
  const seen = new Map();
  for (const entry of list) if (!before.has(entry.url) && !seen.has(entry.url)) seen.set(entry.url, entry);
  const sum = { network: {}, served: { count: 0, body: 0 }, httpCache: 0, unknown: [] };
  for (const e of seen.values()) {
    const name = e.url.split('/').slice(-2).join('/');
    if (!e.transfer && !e.body) sum.unknown.push(name);
    else if (e.served) (sum.served.count++, (sum.served.body += e.body));
    else if (!e.transfer) sum.httpCache++;
    else {
      const row = (sum.network[e.initiator] ??= { count: 0, transfer: 0, body: 0, files: [] });
      row.count++, (row.transfer += e.transfer), (row.body += e.body), row.files.push(name);
    }
  }
  return { urls: new Set([...before, ...seen.keys()]), sum };
}

async function measure(page, base, out) {
  const browser = page.context().browser(), report = {};
  const open = async (storage) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (storage) await context.addInitScript((s) => {
      if (!sessionStorage.getItem('seeded')) for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      sessionStorage.setItem('seeded', 'true');
    }, storage);
    const tab = await context.newPage();
    await tab.goto(base);
    return { context, tab, c: flightControls(tab, { shot: async () => {}, viewport: 'measure', log: () => {} }) };
  };
  // Costs since `before`, once the scene is drawn, its preview ready and a fixed 1.5 s has passed.
  // A request later than that counts toward the next load, not this one (findings row 25).
  const settle = async ({ tab, c }, before) => {
    await c.ready();
    await tab.waitForFunction(() => window.__starshotCampaign?.renderer !== '');
    await tab.waitForTimeout(1500);
    const { urls, sum } = costs(await entries(tab), before);
    sum.modulepreload = await tab.evaluate(() => document.querySelectorAll('link[rel=modulepreload]').length);
    return { urls, sum };
  };
  // The service worker's own Resource Timing holds its install fetches.
  const installed = async ({ context, tab }) => {
    await install(tab);
    return costs(await context.serviceWorkers()[0].evaluate(timeline)).sum;
  };
  // A fresh pilot starts on Moonshot, so a first visit loads the Moon at the menu.
  const fresh = await open();
  await fresh.c.button('Play').click();
  report.firstVisitMoon = (await settle(fresh)).sum;
  report.install = await installed(fresh);
  await fresh.c.menu();
  await fresh.c.button('Levels').click();
  await fresh.tab.getByRole('button', { name: /Playtest access/ }).click();
  await fresh.c.button('Play First Light').click();
  await fresh.c.button('Play').click();
  await fresh.c.ready();
  await fresh.c.menu();
  const storage = await fresh.tab.evaluate(() => ({ ...localStorage }));
  await fresh.context.close();
  // A saved planetary pilot on a cold cache, then its first Moonshot, then a controlled reload.
  const saved = await open(storage);
  await saved.c.button('Continue').click();
  const planet = await settle(saved);
  report.firstPlanetary = planet.sum;
  report.planetaryInstall = await installed(saved);
  await saved.c.menu();
  await saved.c.button('Levels').click();
  await saved.c.button('Play Moonshot').click();
  await saved.c.button('Play').click();
  report.thenMoon = (await settle(saved, planet.urls)).sum;
  await saved.tab.reload();
  await saved.c.button('Continue').click();
  report.controlledReload = (await settle(saved)).sum;
  await saved.context.close();
  writeFileSync(join(out, `costs-${new URL(base).pathname.replaceAll('/', '_')}.json`), JSON.stringify(report, null, 2));
  return report;
}

export default async (page, harness) => {
  const out = (process.env.STARSHOT_PROBE_OUT ??= mkdtempSync(join(tmpdir(), 'starshot-lunar-offline-')));
  const { viewport, log } = harness;
  const { state, button, check, pause, guide, menu, resume } = flightControls(page, harness);
  const base = new URL('.', page.url()).href;
  const served = new Map();
  page.on('response', (r) => served.set(r.url().split('?')[0], r.fromServiceWorker()));
  await install(page);
  served.clear();

  // 6. Row 21: a page.route handler on every URL, through the first controlled load. A request
  // the worker passes to the network is the control that the handler was live.
  const routed = [];
  await page.route('**/*', (route) => (routed.push(route.request().url()), route.continue()));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller && window.__starshotCampaign?.previewReady);
  await page.evaluate(() => fetch('./route-control.txt'));
  await page.unroute('**/*');
  const chunk = new URL(await page.locator('meta[name=starshot-moon-chunk]').getAttribute('content'), base).href;
  const workerServed = [...served].filter(([, sw]) => sw).map(([url]) => url);
  assert(workerServed.includes(chunk), 'the worker did not serve the Moon chunk');
  assert.deepEqual(routed, [`${base}route-control.txt`], 'page.route saw a worker-served request');
  log(`row 21: page.route saw 0 of ${workerServed.length} worker-served responses and 1 network control`);

  // 5. Install, fly a guided Moon launch and pause it, then go offline and restore it.
  await button('Play').click();
  await pause();
  await guide();
  await button('Launch').click();
  await page.waitForFunction(() => window.__starshotCampaign?.phase === 'flight');
  await button('Pause').click();
  const paused = await state();
  await menu();
  served.clear();
  await page.context().setOffline(true);
  await page.reload();
  await page.waitForFunction(
    () => window.__starshotCampaign && !window.__starshotCampaign.hydrating && window.__starshotCampaign.previewReady,
    {}, { timeout: 30000 });
  const restored = await state();
  for (const key of KEPT) assert.deepEqual(restored[key], paused[key], `offline ${key}`);
  assert.equal(served.get(chunk), true, 'the Moon chunk was not served by the worker offline');
  assert.deepEqual([...served].filter(([, sw]) => !sw), [], 'an offline response bypassed the worker');
  await resume();
  await check('offline-restored');
  await button('Resume').click();
  await page.waitForFunction(() => window.__starshotCampaign?.phase === 'result', {}, { timeout: 25000 });
  assert.equal((await state()).score.hit, true);
  await check('offline-hit');
  await page.context().setOffline(false);
  log(`offline: ${served.size} responses, all from the worker; Moon session restored and hit`);

  // 7. Row 22: first-visit, planetary and Moon costs, measured once per base.
  if (viewport === 'desktop')
    log(`costs: ${JSON.stringify(await measure(page, base, out), (key, value) => (key === 'files' ? undefined : value))}`);
};
