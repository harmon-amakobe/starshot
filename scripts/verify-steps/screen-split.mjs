// Run with verify-game.mjs. Evidence stays in STARSHOT_PROBE_OUT, outside the tree.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import flights from './screen-flight.mjs';
import restoreProof from './screen-restore.mjs';
import asyncProof from './screen-async.mjs';

export default async function screenSplit(page, harness) {
  const out = process.env.STARSHOT_PROBE_OUT ?? join(tmpdir(), 'starshot-screen-split');
  process.env.STARSHOT_PROBE_OUT = out;
  mkdirSync(out, { recursive: true });
  // Resolve aliases before writing evidence so comparisons cannot overwrite their baseline.
  if (process.env.STARSHOT_SCREEN_BASELINE)
    assert.notEqual(
      realpathSync.native(out),
      realpathSync.native(process.env.STARSHOT_SCREEN_BASELINE),
      'Baseline and output must differ',
    );
  const { viewport, shot, log } = harness;
  const state = () => page.evaluate(() => window.__starshotCampaign);
  const button = (name) => page.getByRole('button', { name, exact: true });
  const ready = () =>
    page.waitForFunction(
      () => window.__starshotCampaign?.previewReady && !window.__starshotCampaign.hydrating,
    );
  const records = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  // Fix only generated profile IDs. ET and ownership are compared without normalization.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('screen-probe-reset')) {
      localStorage.clear();
      sessionStorage.removeItem('screen-probe-reset');
    }
    let id = 0;
    crypto.randomUUID = () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`;
    const Native = window.Worker;
    window.__probeDelay = 0;
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args);
        let callback;
        Object.defineProperty(this, 'onmessage', {
          get: () => callback,
          set: (value) => {
            callback = value;
          },
        });
        this.addEventListener('message', (event) =>
          setTimeout(() => callback?.call(this, event), window.__probeDelay),
        );
      }
    };
  });
  const capture = async (name, stable = false) => {
    await page.waitForTimeout(400);
    const current = await state();
    const dom = await page.locator('main').evaluate((node) => node.outerHTML);
    const aria = await page.locator('main').ariaSnapshot();
    if (stable) {
      for (const label of ['Open main menu', 'Zoom in', 'Zoom out', 'Play orbit', 'Launch']) {
        const bounds = await button(label).boundingBox();
        assert(bounds && bounds.width >= 44 && bounds.height >= 44, `${name}: ${label} target`);
      }
      const unnamed = await page.evaluate(() =>
        [...document.querySelectorAll('button,input,select')]
          .filter(
            (node) =>
              node.getClientRects().length &&
              !(
                node.getAttribute('aria-label') ||
                node.getAttribute('aria-labelledby') ||
                node.getAttribute('title') ||
                node.textContent?.trim() ||
                node.closest('label')
              ),
          )
          .map((node) => node.outerHTML),
      );
      assert.deepEqual(unnamed, [], `${name}: labelled controls`);
    }
    records.push({ name, state: current, dom, aria, stable });
    await shot(name);
    writeFileSync(join(out, `${viewport}-screen.json`), JSON.stringify(records, null, 2));
    if (stable && process.env.STARSHOT_SCREEN_BASELINE) {
      const before = JSON.parse(
        readFileSync(join(process.env.STARSHOT_SCREEN_BASELINE, `${viewport}-screen.json`), 'utf8'),
      ).find((record) => record.name === name);
      assert(before, `Missing baseline checkpoint ${name}`);
      // Geometry animates independently of simulation; keep it in raw evidence above.
      const canonical = (value) =>
        Object.fromEntries(
          [
            'levelId',
            'target',
            'day',
            'launchIso',
            'aim',
            'shot',
            'shotKey',
            'phase',
            'et',
            'parking',
            'paused',
            'hit',
            'hintUsed',
            'stars',
            'score',
            'owner',
            'profileId',
            'hydrating',
            'visit',
            'preferences',
          ].map((key) => [key, value[key]]),
        );
      assert.deepEqual(
        canonical(current),
        canonical(before.state),
        `${name}: canonical state changed`,
      );
      assert.equal(dom, before.dom, `${name}: controlled main DOM changed`);
      assert.equal(aria, before.aria, `${name}: accessible DOM changed`);
    }
    assert.deepEqual(errors, [], `${name}: browser errors`);
    log(`${name}: ${current.levelId}, ${current.phase}, ${current.owner}`);
  };
  for (const renderer of ['webgl', 'canvas']) {
    await page.evaluate(() => sessionStorage.setItem('screen-probe-reset', 'true'));
    const url = new URL(page.url());
    if (renderer === 'canvas') url.searchParams.set('renderer', 'canvas');
    else url.searchParams.delete('renderer');
    await page.goto(url.href);
    await ready();
    const identity = await state();
    assert.equal(identity.renderer, renderer === 'canvas' ? 'Canvas 2D' : 'WebGL 2');
    const lifetime = async () => {
      const current = await state();
      assert.equal(current.workerIdentity, identity.workerIdentity, 'Worker remounted');
      assert.equal(current.rendererIdentity, identity.rendererIdentity, 'Renderer remounted');
    };
    await button('Play').click();
    await page.waitForTimeout(450);
    await button('Guide').click();
    await button('Apply guide').click({ timeout: 20000 });
    await page.getByRole('region', { name: 'Mission deck' }).getByRole('button').first().click();
    await ready();
    // Closing the mission changes the safe rectangle on the next rendered frame.
    await page.waitForTimeout(600);
    await button('System view').click();
    await capture(`${renderer}-controlled-guide`, true);
    for (const size of viewport.startsWith('phone')
      ? [
          { width: 390, height: 664 },
          { width: 844, height: 390 },
          { width: 390, height: 844 },
        ]
      : [{ width: 1440, height: 900 }]) {
      await page.setViewportSize(size);
      await capture(`${renderer}-${size.width}x${size.height}`, true);
    }
    await button('Hangar').click();
    await capture(`${renderer}-hangar`);
    await page.keyboard.press('Escape');
    await button('Open main menu').click();
    for (const name of ['Settings', 'How to play', 'Cloud demo', 'Levels', 'Profiles']) {
      await button(name).click();
      await capture(`${renderer}-${name.replaceAll(' ', '-')}`);
      await button('← Back').click();
    }
    assert(await page.locator('[data-release-version]').textContent());
    await button('Profiles').click();
    await page.getByLabel('New profile', { exact: true }).fill('Probe pilot');
    await button('Create profile').click();
    await ready();
    await lifetime();
    const second = await state();
    assert.notEqual(second.profileId, identity.profileId);
    await page.getByRole('button', { name: /^Pilot 1 / }).click();
    await ready();
    await lifetime();
    await button('← Back').click();
    await button('Continue').click();
    await page.waitForTimeout(450);
    await button('Expand flight deck').click();
    await button('Fine aim').click();
    await page.evaluate(() => {
      window.__probeDelay = 1200;
    });
    await page.getByRole('spinbutton', { name: 'Aim angle (degrees)' }).fill('-20');
    await button('Launch').click();
    assert.equal((await state()).pendingRelease, true);
    await button('Open main menu').click();
    await button('Profiles').click();
    await page.getByRole('button', { name: /^Probe pilot / }).click();
    await ready();
    await page.waitForTimeout(2800);
    assert.equal((await state()).profileId, second.profileId);
    assert.equal((await state()).phase, 'aim');
    assert.equal((await state()).pendingRelease, false);
    assert.equal((await state()).score, null);
    await lifetime();
    await capture(`${renderer}-pending-pilot-switch`);
    await page.evaluate(() => {
      window.__probeDelay = 0;
    });
    await button('← Back').click();
    await button('Levels').click();
    await page.getByRole('button', { name: /Playtest access/ }).click();
    for (const title of ['Moonshot', 'First Light', 'Morning Star', 'Big Game', 'Grand Tour']) {
      await button(`Play ${title}`).click();
      await ready();
      await lifetime();
      await capture(`${renderer}-${title.replaceAll(' ', '-')}`);
      await button('Levels').click();
    }
    await button('Sandbox Mars').click();
    await ready();
    await lifetime();
    await capture(`${renderer}-sandbox`);
  }
  // The flight scenarios also cover actual touch pulls, Plan/YOLO and exact outcomes.
  await page.evaluate(() => sessionStorage.setItem('screen-probe-reset', 'true'));
  const fresh = new URL(page.url());
  fresh.searchParams.delete('renderer');
  await page.goto(fresh.href);
  await flights(page, harness);
  await restoreProof(page, harness);
  await asyncProof(page, harness);
}
