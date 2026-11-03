import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { flightControls } from './screen-flight-controls.mjs';

export default async (page, harness) => {
  process.env.STARSHOT_PROBE_OUT ??= mkdtempSync(join(tmpdir(), 'starshot-lunar-precision-'));
  const { viewport } = harness;
  const { state, ready, button, check, guide, fine, launch, retry, collapse } = flightControls(page, harness);
  await page.addInitScript(() => localStorage.clear());
  for (const renderer of ['webgl', 'canvas']) {
    if (viewport.startsWith('phone')) await page.setViewportSize({ width: 390, height: 844 });
    const url = new URL(page.url());
    url.searchParams.set('renderer', renderer);
    await page.goto(url.href);
    await ready();
    assert.equal((await state()).renderer, renderer === 'webgl' ? 'WebGL 2' : 'Canvas 2D');
    await button('Play').click();
    await guide();
    await fine(17.33167459468716, 3.24);
    await ready();
    const preview = await state();
    assert.equal(preview.hit, true);
    assert.equal(preview.shot.burnAngleDeg, 17.33167459468716);
    const result = await launch(`${renderer}-real-soi-graze`);
    assert.deepEqual(result.flightShot, preview.previewShot);
    assert.equal(result.analysis.termination, 'soi-reached');
    await retry();
    const date = page.getByLabel('Launch date (UTC)', { exact: true });
    await date.fill('2026-11-26');
    await date.press('Tab');
    await ready();
    await collapse();
    await button('System view').click();
    const sizes = viewport.startsWith('phone')
      ? [{ width: 390, height: 844 }, { width: 844, height: 390 }]
      : [{ width: 1440, height: 900 }];
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);
      const label = `${renderer}-${size.width}x${size.height}`;
      await check(`${label}-primary-enlarged`);
      await button('Scientific').click();
      assert.equal((await state()).preferences.trueSize, true);
      await check(`${label}-primary-physical`);
      await button('Simplified').click();
      await button('Inspect Earth').click();
      await button('View closer').click();
      await page.waitForTimeout(250);
      if (renderer === 'webgl') {
        if (size === sizes[0]) {
          const moonData = page.waitForResponse(response => response.url().endsWith('satellite-states.bin'));
          await button('Major moons off').click();
          assert.equal((await moonData).ok(), true);
        } else await button('Major moons off').click();
        await page.waitForTimeout(400);
        await button('Zoom out').click();
        await button('Zoom out').click();
        const frameMoons = async () => {
          const view = await state(), landscape = size.width > size.height;
          const x = size.width * (landscape ? .28 : .5), y = size.height * .46;
          const dx = x - (view.projectedOrigin[0] + view.projectedTarget[0]) / 2;
          const dy = y - (view.projectedOrigin[1] + view.projectedTarget[1]) / 2;
          await page.mouse.move(size.width * .45, size.height * .5);
          await page.mouse.down();
          await page.mouse.move(size.width * .45 + dx, size.height * .5 + dy, { steps: 8 });
          await page.mouse.up();
          await page.waitForTimeout(150);
          const [mx, my] = (await state()).projectedTarget;
          assert(mx > 0 && mx < size.width * (landscape ? .53 : 1) && my > 65 && my < size.height * .75);
        };
        await frameMoons();
        assert.equal(await button('Major moons on').getAttribute('aria-pressed'), 'true');
        await check(`${label}-focused-moon`);
        await page.keyboard.down('Shift');
        await page.mouse.move(size.width / 2, size.height / 2);
        await page.mouse.down();
        await page.mouse.move(size.width / 2 + 60, size.height / 2 + 40, { steps: 8 });
        await page.mouse.up();
        await page.keyboard.up('Shift');
        assert.equal((await state()).camera, 'free');
        assert.notDeepEqual((await state()).preferences.orbit, [0, 0]);
        await frameMoons();
        await check(`${label}-focused-free`);
        await button('Major moons on').click();
        await check(`${label}-primary-restored`);
      } else {
        assert.equal(await page.getByText('Moon close-ups are unavailable in this view.').count(), 1);
        await check(`${label}-canvas-primary`);
      }
      await button('Close planet focus').click();
    }
  }
};
