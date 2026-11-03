import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// JSON baselines omit optional undefined object fields; keep numeric values exact.
function definedFields(value) {
  if (Array.isArray(value)) return value.map(definedFields);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, definedFields(item)]),
    );
  return value;
}

export function flightControls(page, { shot, viewport, log }) {
  const out = process.env.STARSHOT_PROBE_OUT;
  mkdirSync(out, { recursive: true });
  const records = [],
    messages = [];
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) messages.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`));
  const state = () => page.evaluate(() => window.__starshotCampaign);
  const ready = () =>
    page.waitForFunction(() => window.__starshotCampaign?.previewReady, {}, { timeout: 15000 });
  const button = (name) => page.getByRole('button', { name, exact: true });
  const check = async (name, details = {}) => {
    const s = await state();
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      controls: [...document.querySelectorAll('button,input,select')]
        .filter((e) => e.getClientRects().length)
        .map((e) => {
          const b = e.getBoundingClientRect(),
            hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
          return {
            name: e.getAttribute('aria-label') || e.textContent?.trim(),
            x: b.x,
            y: b.y,
            w: b.width,
            h: b.height,
            disabled: e.disabled,
            hit: !!hit && (e === hit || e.contains(hit)),
          };
        }),
    }));
    const dom = await page.locator('main').evaluate((node) => node.outerHTML);
    if (name.endsWith('-result') && process.env.STARSHOT_SCREEN_BASELINE) {
      const before = JSON.parse(
        readFileSync(
          join(process.env.STARSHOT_SCREEN_BASELINE, viewport + '-criteria.json'),
          'utf8',
        ),
      ).find((record) => record.name === name).state;
      for (const key of [
        'shotKey',
        'shot',
        'flightShot',
        'previewSummary',
        'flightSummary',
        'analysis',
        'score',
        'et',
        'phase',
        'parking',
        'owner',
      ])
        assert.deepEqual(definedFields(s[key]), before[key], name + ': ' + key);
    }
    records.push({ name, state: s, dom, layout, messages: [...messages], details });
    await shot(name);
    writeFileSync(
      join(out, `${viewport}-${name}-aria.yml`),
      await page.locator('body').ariaSnapshot(),
    );
    writeFileSync(join(out, `${viewport}-criteria.json`), JSON.stringify(records, null, 2));
    log(
      JSON.stringify({
        name,
        phase: s.phase,
        paused: s.paused,
        et: s.et,
        camera: s.camera,
        mode: s.preferences.releaseMode,
        aim: s.aim,
        hit: s.hit,
        termination: s.analysis?.termination,
        overflow: layout.overflow,
        console: messages.length,
        ...details,
      }),
    );
    assert.equal(layout.overflow, false, `${name}: horizontal overflow`);
  };
  const pause = async () => {
    if (await button('Pause orbit').count()) await button('Pause orbit').click();
  };
  const expand = async () => {
    if (await button('Expand flight deck').count()) await button('Expand flight deck').click();
  };
  const collapse = async () => {
    if (await button('Collapse flight deck').count()) await button('Collapse flight deck').click();
  };
  const fine = async (angle, speed) => {
    await expand();
    await button('Fine aim').click();
    if (angle !== undefined)
      await page.getByRole('spinbutton', { name: 'Aim angle (degrees)' }).fill(String(angle));
    if (speed !== undefined)
      await page.getByRole('spinbutton', { name: 'Departure speed (km/s)' }).fill(String(speed));
  };
  const menu = async () => {
    await button('Open main menu').click();
    await page.getByRole('dialog', { name: 'Starshot main menu' }).waitFor();
  };
  const resume = async () => {
    await button('Continue').click();
    await page.waitForTimeout(450);
  };
  const setMode = async (mode) => {
    await menu();
    await button('Settings').click();
    await page.getByRole('combobox', { name: 'When I release the ring' }).selectOption(mode);
    await button('← Back').click();
    await resume();
    assert.equal((await state()).preferences.releaseMode, mode);
  };
  const guide = async () => {
    await button('Guide').click();
    await button('Apply guide').click({ timeout: 15000 });
    await page.getByRole('region', { name: 'Mission deck' }).getByRole('button').first().click();
    await ready();
  };
  const launch = async (label) => {
    await ready();
    const s = await state();
    await button('Launch').click();
    await page.waitForFunction(
      () => ['flight', 'result'].includes(window.__starshotCampaign?.phase),
      {},
      { timeout: 15000 },
    );
    const f = await state();
    assert.equal(f.flightSummary, s.previewSummary, `${label}: preview/flight mismatch`);
    await check(`${label}-flight`);
    await page.waitForFunction(
      () => window.__starshotCampaign?.phase === 'result',
      {},
      { timeout: 25000 },
    );
    await check(`${label}-result`);
    return await state();
  };
  const retry = async () => {
    await page
      .getByRole('region', { name: 'Flight result' })
      .getByRole('button', { name: 'Try again', exact: true })
      .click();
    await pause();
  };
  const pull = async (label, cancel = false) => {
    await collapse();
    await button('Orbit view').click();
    await page.waitForTimeout(200);
    const before = await state(),
      ring = page.getByRole('button', { name: /Pull engine ring to aim/ }),
      b = await ring.boundingBox(),
      x = b.x + b.width / 2,
      y = b.y + b.height / 2;
    const touch = viewport.startsWith('phone');
    let cdp;
    if (touch) {
      cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down();
    }
    const start = await state();
    assert.equal(
      await page.locator('.campaign-shell').getAttribute('data-pulling'),
      'true',
      `${label}: ring did not receive pointer`,
    );
    await page.waitForTimeout(500);
    const held = await state();
    assert.equal(held.et, start.et);
    assert.deepEqual(held.physicalCraft, start.physicalCraft);
    const dx = x - held.displayCraft[0],
      dy = y - held.displayCraft[1],
      d = Math.hypot(dx, dy) || 1,
      mx = x + (dx / d) * 35,
      my = y + (dy / d) * 35;
    if (touch)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: mx, y: my }],
      });
    else await page.mouse.move(mx, my, { steps: 5 });
    await page.waitForTimeout(150);
    const final = await state();
    await check(`${label}-held`);
    if (touch) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: cancel ? 'touchCancel' : 'touchEnd',
        touchPoints: [],
      });
      await cdp.detach();
    } else {
      if (cancel) await page.keyboard.press('Escape');
      await page.mouse.up();
    }
    await page.waitForTimeout(200);
    const after = await state();
    assert.equal(await page.locator('.campaign-shell').getAttribute('data-pulling'), 'false');
    if (cancel) {
      assert.equal(after.phase, 'aim');
      assert.deepEqual(after.aim, before.aim);
      assert.equal(after.paused, before.paused);
    } else if (before.preferences.releaseMode === 'plan') {
      assert.equal(after.phase, 'aim');
      assert.equal(after.paused, true);
      assert.equal(after.et, start.et);
      assert.deepEqual(after.aim, final.aim);
      assert.equal(after.pendingRelease, false);
    }
    await check(`${label}-released`);
    return { start, final, after };
  };

  return {
    state,
    ready,
    button,
    check,
    pause,
    expand,
    collapse,
    fine,
    menu,
    resume,
    setMode,
    guide,
    launch,
    retry,
    pull,
  };
}
