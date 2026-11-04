import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { flightControls } from './screen-flight-controls.mjs';

// The rail's source digest is a string the minifier keeps, so it marks the rail in any chunk.
const RAIL = JSON.parse(
  readFileSync(new URL('../../packages/ephemeris/data/moon-rail.json', import.meta.url), 'utf8'),
).sourceSha256;
const deferred = () => {
  let release;
  const promise = new Promise((done) => (release = done));
  return { promise, release };
};

// Where the reason line sits against the deck and its controls, and the panel against the rest.
function layout() {
  const box = (e) => e.getBoundingClientRect();
  const meet = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const name = (e) => e.getAttribute('aria-label') || e.textContent.trim();
  const shown = (root) => [...root.querySelectorAll('button, input, select')].filter((e) => e.getClientRects().length);
  const [wait, deck, panel, ring] = ['.c-wait', '.c-deck', '.c-moon-load', '.c-ring-handle'].map((s) => document.querySelector(s));
  const [w, d, p, r] = [box(wait), box(deck), box(panel), box(ring)];
  return {
    inside: w.left >= d.left - 0.5 && w.right <= d.right + 0.5 && w.top >= d.top - 0.5 && w.bottom <= d.bottom + 0.5,
    clipped: wait.scrollWidth > wait.clientWidth + 1,
    waitHits: shown(deck).filter((e) => meet(w, box(e))).map(name),
    panelHits: shown(document).filter((e) => !panel.contains(e) && meet(p, box(e))).map(name),
    // The disabled ring waits in the free room: below the top bar, clear of the deck, on screen.
    ringPlaced: r.top >= 60 && r.left >= 0 && r.right <= innerWidth && !meet(r, d),
    // Launch ends the footer row under the reason, with Guide before it, as once loaded.
    actionsEnd: (([f, g, l]) => f.right - l.right <= 1 && g.right <= l.left)(
      ['.c-deck-footer', '.c-actions .pill', '.c-actions .primary'].map((s) => box(document.querySelector(s)))),
  };
}

export default async (page, harness) => {
  process.env.STARSHOT_PROBE_OUT ??= mkdtempSync(join(tmpdir(), 'starshot-lunar-loading-'));
  const { viewport, log, intend } = harness;
  const { state, ready, button, check, menu, expand, collapse } = flightControls(page, harness);
  const base = new URL('.', page.url()).href, size = page.viewportSize();
  const text = async (url) => (await page.request.get(url)).text();

  // The served entry carries no rail; exactly one of its lazy imports does, and the build's
  // retry meta names that chunk.
  const html = await text(base);
  const entry = new URL(/<script type="module"[^>]*src="([^"]+)"/.exec(html)[1], base).href;
  const entryText = await text(entry);
  assert(!entryText.includes(RAIL), 'the entry chunk carries the Moon rail');
  const lazy = [];
  for (const [, file] of entryText.matchAll(/import\(`(\.\/[^`$]+\.js)`\)/g)) {
    const url = new URL(file, entry).href;
    if ((await text(url)).includes(RAIL)) lazy.push(url);
  }
  assert.equal(lazy.length, 1, 'one lazy chunk carries the Moon rail');
  const [chunk] = lazy;
  assert.equal(new URL(/name="starshot-moon-chunk" content="([^"]+)"/.exec(html)[1], base).href, chunk);

  // The release worker would answer the chunk from its cache, where page.route never sees it.
  // Offline behaviour belongs to the Evidence part, so this probe's pages run without it.
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
  });
  await page.addInitScript(() => {
    delete Navigator.prototype.serviceWorker;
    if (sessionStorage.getItem('lunar-loading-reset')) {
      localStorage.clear();
      sessionStorage.removeItem('lunar-loading-reset');
    }
  });
  const requests = [];
  let hold = null, failNext = false;
  await page.route((url) => url.href.split('?')[0] === chunk, async (route) => {
    const url = route.request().url();
    requests.push(url);
    if (failNext) {
      failNext = false;
      intend(url);
      return route.abort();
    }
    await hold?.promise;
    return route.continue();
  });
  const fresh = async (renderer = 'webgl') => {
    requests.length = 0;
    await page.evaluate(() => sessionStorage.setItem('lunar-loading-reset', 'true'));
    await page.goto(renderer === 'canvas' ? `${base}?renderer=canvas` : base);
    await button('Play').click();
    await page.waitForTimeout(900);
  };
  const pick = async (title) => {
    await menu();
    await button('Levels').click();
    const access = page.getByRole('button', { name: /Playtest access/ });
    if ((await access.getAttribute('aria-pressed')) !== 'true') await access.click();
    await button(`Play ${title}`).click();
    await button('Play').click();
    await page.waitForTimeout(900);
  };
  const live = () => page.locator('[role=status][aria-live=polite]').textContent();
  const focused = () => page.evaluate(() => document.activeElement !== document.body);
  const ring = page.getByRole('button', { name: /Pull engine ring to aim/ });
  // WebGL keeps no readable buffer after a frame, so both canvases are judged from a screenshot
  // with everything else hidden on black: the count of lit pixels.
  const lit = async () => {
    const style = await page.addStyleTag({ content: 'body *{visibility:hidden}.c-world,.c-world canvas'
      + '{visibility:visible}html,body{background:#000!important}.starfield{display:none}' });
    const png = (await page.screenshot()).toString('base64');
    await style.evaluate((node) => node.remove());
    return page.evaluate(async (data) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, image.height).data;
      return pixels.filter((v, i) => i % 4 === 0 && v + pixels[i + 1] + pixels[i + 2] > 30).length;
    }, png);
  };

  // 1. A fresh profile starts on Moonshot while the chunk is held: nothing drawn, time held.
  const heldStart = async (renderer) => {
    hold = deferred();
    await fresh(renderer);
    await ready();
    // Reduced motion parks the orbit; set it coasting, so only the wait can hold lunar time.
    if (await button('Play orbit').count()) await button('Play orbit').click();
    const start = await state();
    await page.waitForTimeout(700);
    const later = await state();
    assert.equal(start.levelId, 'moonshot');
    assert.equal(start.paused, false, 'a fresh Moonshot coasts, so only the wait holds its time');
    assert.equal(later.et, start.et, 'lunar time advanced while the model loads');
    assert.equal(later.renderer, '', 'a frame was drawn without the model');
    assert.equal(requests.length, 1);
    return start;
  };
  // 5. A planetary level draws while the load is held; Moonshot then waits blank.
  const heldReturn = async (renderer) => {
    hold = deferred();
    await fresh(renderer);
    await pick('First Light');
    const planet = await state();
    assert.equal(planet.levelId, 'first-light');
    assert.equal(planet.renderer, renderer === 'canvas' ? 'Canvas 2D' : 'WebGL 2', 'a planetary level waited for the Moon');
    assert((await lit()) > 0, 'the screenshot sees no planetary drawing');
    await ready();
    assert(await button('Launch').isEnabled());
    await pick('Moonshot');
    assert.equal((await state()).renderer, '', 'the planetary frame stayed up as Moonshot');
    assert.equal(await lit(), 0, 'the planetary drawing stayed on a canvas');
    await check(`${renderer}-return-held`);
    hold.release();
    await page.waitForFunction(() => window.__starshotCampaign?.renderer !== '');
  };
  const before = await heldStart('webgl');

  // 2. Pull, Enter on the ring, Launch and Guide do nothing; the reason is visible and announced.
  assert.equal(await live(), 'Loading the Moon.');
  assert(await page.locator('.c-wait').isVisible());
  assert.equal(await page.locator('.c-target-cue').count(), 0, 'the target cue points at an undrawn Moon');
  for (const control of [ring, button('Launch'), button('Guide')]) assert(await control.isDisabled());
  assert(await focused(), 'focus fell to the page body while loading');
  await ring.focus();
  await page.keyboard.press('Enter');
  assert(await focused(), 'focus fell to the page body after Enter');
  for (const name of ['Launch', 'Guide']) await button(name).dispatchEvent('click');
  const grip = await ring.boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + 60, grip.y + 60, { steps: 5 });
  assert.equal(await page.locator('.campaign-shell').getAttribute('data-pulling'), 'false');
  await page.mouse.up();
  const held = await state();
  assert.deepEqual([held.phase, held.pendingRelease, held.et, held.hintUsed], ['aim', false, before.et, false]);
  assert.deepEqual(held.aim, before.aim);
  await check('loading-controls');

  // 3. The reason line stays inside the deck and clear of its controls at each size, collapsed
  // and expanded. 200% zoom is approximated by halving the desktop viewport in CSS pixels.
  const sizes = viewport.startsWith('phone')
    ? [[390, 844], [390, 664], [360, 780], [360, 640], [844, 390]]
    : [[1440, 900], [720, 450]];
  // The reason waits in a slot the deck already has, so its height is the same once loaded.
  const heights = new Map();
  const eachPage = async (visit) => {
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      for (const pageName of ['collapsed', 'Overview', 'Fine aim', 'Telemetry']) {
        if (pageName === 'collapsed') await collapse();
        else {
          await expand();
          await button(pageName).click();
        }
        await page.waitForTimeout(150);
        await visit(`${width}x${height}-${pageName.replace(' ', '-')}`, pageName);
      }
    }
    await collapse();
    await page.setViewportSize(size);
  };
  const deckHeight = () => page.evaluate(() => document.querySelector('.c-deck').getBoundingClientRect().height);
  await eachPage(async (label, pageName) => {
    const box = await page.evaluate(layout);
    log(JSON.stringify({ label, ...box }));
    assert.deepEqual(box, { inside: true, clipped: false, waitHits: [], panelHits: [], ringPlaced: true, actionsEnd: true }, label);
    heights.set(label, await deckHeight());
    if (pageName === 'collapsed' || pageName === 'Fine aim') await check(`wait-${label}`);
  });

  // The held load finishes into a usable Moonshot, with every deck as tall as while it waited.
  hold.release();
  await page.waitForFunction(() => window.__starshotCampaign?.renderer !== '');
  assert(await button('Launch').isEnabled());
  assert.equal(await live(), '');
  await eachPage(async (label) => assert.equal(await deckHeight(), heights.get(label), `${label}: deck height`));

  // 4. A failed first request shows the error; Retry by keyboard asks again under a new URL.
  hold = null;
  failNext = true;
  await fresh();
  await page.getByText('The Moon could not load.').first().waitFor();
  assert.equal(await live(), 'The Moon could not load.');
  assert(await button('Launch').isDisabled());
  const retry = button('Retry loading the Moon'), target = await retry.boundingBox();
  assert(target.width >= 44 && target.height >= 44, 'Retry is smaller than 44 px');
  await check('load-failed');
  await retry.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__starshotCampaign?.renderer !== '');
  assert.deepEqual(requests, [chunk, `${chunk}?retry=1`]);
  assert(await button('Launch').isEnabled());
  assert(await focused(), 'focus fell to the page body after Retry');
  await check('load-retried');

  // 5, continued: once loaded, Moonshot reuses the model with no further request.
  await heldReturn('webgl');
  await pick('First Light');
  await pick('Moonshot');
  await ready();
  assert(await button('Launch').isEnabled());
  assert.deepEqual(requests, [chunk], 'the model was requested again');

  // 6. A saved planetary pilot starts no load; the chunk is asked for once Moonshot opens.
  await pick('First Light');
  requests.length = 0;
  await page.reload();
  await page.getByRole('button', { name: /^(Play|Continue)$/ }).click();
  await page.waitForTimeout(1500);
  assert.equal((await state()).levelId, 'first-light');
  assert.deepEqual(requests, [], 'a planetary pilot loaded the Moon chunk');
  await pick('Moonshot');
  await page.waitForFunction(() => window.__starshotCampaign?.renderer !== '');
  assert.deepEqual(requests, [chunk]);
  await check('opened-later');

  // 7. The Canvas 2D renderer (D19) draws planets behind the home menu too, so only the scene's
  // clear blanks them: cases 1 and 5 again under ?renderer=canvas.
  await heldStart('canvas');
  hold.release();
  await page.waitForFunction(() => window.__starshotCampaign?.renderer === 'Canvas 2D');
  await heldReturn('canvas');
};
