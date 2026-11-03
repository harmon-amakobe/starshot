import assert from 'node:assert/strict';
import { flightControls } from './screen-flight-controls.mjs';
export default async (page, harness) => {
  const { viewport } = harness;
  const {
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
  } = flightControls(page, harness);
  if (viewport.startsWith('phone')) await page.setViewportSize({ width: 390, height: 844 });
  await button('Play').click();
  await page.waitForTimeout(600);
  assert.equal((await state()).levelId, 'moonshot');
  assert.equal((await state()).preferences.releaseMode, 'plan');
  await check('02-fresh-orbit');
  await pause();
  const before = await state();
  const slider = page.getByRole('slider', { name: 'Move around orbit' });
  await slider.focus();
  await slider.press('Home');
  await slider.press('ArrowRight');
  await slider.press('End');
  await slider.press('Home');
  await page.getByRole('spinbutton', { name: 'Orbit position (degrees)' }).fill('90');
  await page.getByRole('spinbutton', { name: 'Orbit position (degrees)' }).press('Tab');
  assert.equal((await state()).et, before.et);
  await check('03-phase-controls');
  const date = page.getByLabel('Launch date (UTC)', { exact: true });
  await date.fill('2026-11-03');
  await date.press('Tab');
  assert.equal((await state()).day, 1);
  await check('04-date-change');
  await button('Play orbit').click();
  await pull('05-cancel', true);
  await pull('06-plan');
  const planned = await state();
  for (const name of ['System view', 'Zoom in', 'Zoom out', 'Craft view', 'Orbit view']) {
    await button(name).click();
    await page.waitForTimeout(100);
    assert.equal((await state()).et, planned.et);
    await check(`07-${name.replaceAll(' ', '-').toLowerCase()}`);
  }
  await expand();
  await button('Fine aim').click();
  await check('08-expanded-phone');
  if (viewport === 'phone') {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);
    await check('09-landscape-fine');
    await collapse();
    await check('10-landscape-orbit');
    await button('System view').click();
    await check('11-landscape-system');
    await button('Orbit view').click();
    await pull('12-landscape-plan');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
  }
  if (viewport === 'phone-reduced-motion') await check('13-reduced-motion-plan');
  await guide();
  await fine(20, 3.24);
  await ready();
  assert.equal((await state()).hit, false);
  const miss = await launch('14-moon-miss');
  assert.equal(miss.score.hit, false);
  await retry();
  await guide();
  await fine(-20, 3.24);
  await ready();
  assert.equal((await state()).analysis.termination, 'impact');
  const impact = await launch('15-earth-impact');
  assert.equal(impact.analysis.terminatedBy, 'earth');
  await retry();
  await guide();
  await fine(0, 3.24);
  await ready();
  assert.equal((await state()).hit, true);
  await button('System view').click();
  await check('16-moon-hit-preview');
  const hit = await launch('17-moon-hit');
  assert.equal(hit.score.hit, true);
  await button('Next mission →').click();
  await page.waitForTimeout(500);
  assert.equal((await state()).levelId, 'first-light');
  await check('18-first-light-unlocked');
  await fine(0, 0);
  await date.fill('2026-11-02');
  await date.press('Tab');
  await ready();
  assert.equal((await state()).hit, false);
  await launch('19-planet-miss');
  await retry();
  await fine((Math.atan2(2.36578, -1.815327) * 180) / Math.PI, Math.hypot(-1.815327, 2.36578));
  await ready();
  assert.equal((await state()).hit, true);
  await button('System view').click();
  await check('20-planet-full-orbits');
  await launch('21-planet-hit');
  await menu();
  await button('Levels').click();
  await button('Play Moonshot').click();
  await button('Play').click();
  await page.waitForTimeout(400);
  await pause();
  await setMode('hail-mary');
  await pull('22-hail-cancel', true);
  await pull('23-hail-launch');
  await page.waitForFunction(
    () => ['flight', 'result'].includes(window.__starshotCampaign?.phase),
    {},
    { timeout: 15000 },
  );
  await check('24-hail-flight');
  await menu();
  const saved = await state();
  await page.reload();
  await page.waitForFunction(
    () => window.__starshotCampaign && !window.__starshotCampaign.hydrating,
    {},
    { timeout: 15000 },
  );
  assert.equal((await state()).preferences.releaseMode, 'hail-mary');
  assert.equal((await state()).levelId, saved.levelId);
  await check('25-hail-persisted');
  await button('Settings').click();
  await page.getByRole('combobox', { name: 'When I release the ring' }).selectOption('plan');
  await button('← Back').click();
  await resume();
  await menu();
  await page.reload();
  await page.waitForFunction(
    () => window.__starshotCampaign && !window.__starshotCampaign.hydrating,
    {},
    { timeout: 15000 },
  );
  assert.equal((await state()).preferences.releaseMode, 'plan');
  await check('26-plan-persisted');
};
