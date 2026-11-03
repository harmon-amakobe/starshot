import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Every fixture is installed in a new harness context, never a player's browser.
export default async function restoreProof(page, { viewport, log }) {
  const out = process.env.STARSHOT_PROBE_OUT;
  const prior = JSON.parse(readFileSync(join(out, `${viewport}-criteria.json`), 'utf8'));
  const old = prior.find((record) => record.name === '21-planet-hit-result').state;
  const date = new Date(old.launchIso);
  date.setUTCDate(date.getUTCDate() - old.day);
  const preferences = structuredClone(old.preferences);
  delete preferences.releaseMode;
  const progress = { version: 1, levels: { 'first-light': { stars: 3 } } };
  const fixture = {
    version: 1,
    selected: 'legacy-check',
    playtest: false,
    profiles: [
      {
        id: 'legacy-check',
        name: 'Legacy check',
        progress,
        session: {
          levelId: old.levelId,
          target: old.target,
          windowStart: date.toISOString().slice(0, 10),
          day: old.day,
          aim: old.aim,
          phase: old.phase,
          et: old.et,
          paused: old.paused,
          hintUsed: old.hintUsed,
          entered: true,
          preferences,
        },
      },
    ],
  };
  const context = await page
    .context()
    .browser()
    .newContext({
      viewport: viewport.startsWith('phone')
        ? { width: 390, height: 664 }
        : { width: 1440, height: 900 },
      reducedMotion: viewport.includes('reduced') ? 'reduce' : 'no-preference',
    });
  const check = await context.newPage(),
    errors = [];
  check.on('pageerror', (error) => errors.push(error.message));
  check.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const button = (name) => check.getByRole('button', { name, exact: true });
  const state = () => check.evaluate(() => window.__starshotCampaign);
  const ready = () =>
    check.waitForFunction(
      () =>
        window.__starshotCampaign &&
        !window.__starshotCampaign.hydrating &&
        window.__starshotCampaign.previewReady,
    );
  const capture = async (name) => {
    const value = {
      state: await state(),
      dom: await check.locator('main').evaluate((node) => node.outerHTML),
      errors,
    };
    writeFileSync(join(out, `${viewport}-${name}.json`), JSON.stringify(value, null, 2));
    await check.screenshot({ path: join(out, `${viewport}-${name}.png`) });
    assert.deepEqual(errors, []);
  };
  try {
    await check.addInitScript(
      ({ fixture, progress }) => {
        if (sessionStorage.getItem('legacy-seeded')) return;
        localStorage.setItem('starshot.campaign.profiles.v1', JSON.stringify(fixture));
        localStorage.setItem('starshot.progress.v1', JSON.stringify(progress));
        sessionStorage.setItem('legacy-seeded', 'true');
      },
      { fixture, progress },
    );
    const url = new URL(page.url());
    url.searchParams.set('renderer', 'canvas');
    await check.goto(url.href);
    await ready();
    const restored = await state();
    assert.equal(restored.renderer, 'Canvas 2D');
    assert.equal(restored.preferences.releaseMode, 'plan');
    assert.equal(restored.phase, 'result');
    assert.equal(restored.et, old.et);
    assert.equal(restored.hit, true);
    await button('Levels').click();
    assert(await button('Play Morning Star').isEnabled());
    await button('← Back').click();
    await button('Continue').click();
    await check.waitForTimeout(500);
    await capture('legacy-result');
    await button('Replay').click();
    await button('Pause').click();
    if (await button('Expand flight deck').count()) await button('Expand flight deck').click();
    const timeline = check.getByRole('slider', { name: 'Flight timeline' });
    await timeline.focus();
    await timeline.press('Home');
    await timeline.press('ArrowRight');
    assert.equal((await state()).paused, true);
    await button('Solar system').click();
    const map = await state();
    assert.equal(map.map, true);
    // Map bodies overlap on short phones; prove the labelled keyboard path too.
    await button('Inspect Earth').focus();
    await button('Inspect Earth').press('Enter');
    await button('View closer').click();
    assert.equal((await state()).focus, 'earth');
    await button('Close planet focus').click();
    assert.equal((await state()).focus, null);
    await button('Mission view').click();
    await capture('replay-map-focus');
    await button('Open main menu').click();
    await button('Levels').click();
    await button('Play Moonshot').click();
    await button('Play').click();
    await button('Guide').click();
    await button('Apply guide').click({ timeout: 20000 });
    await check.getByRole('region', { name: 'Mission deck' }).getByRole('button').first().click();
    await ready();
    const preview = await state();
    await button('Launch').click();
    await check.waitForFunction(() => window.__starshotCampaign?.phase === 'flight');
    await button('Pause').click();
    const paused = await state();
    assert.equal(paused.flightSummary, preview.previewSummary);
    assert.equal(paused.paused, true);
    assert.notEqual(new Date(paused.launchIso).getUTCHours(), 0);
    await button('Open main menu').click();
    const persisted = await check.evaluate(() =>
      JSON.parse(localStorage.getItem('starshot.campaign.profiles.v2')),
    );
    await check.reload();
    await ready();
    const resumed = await state();
    for (const key of ['shotKey', 'shot', 'flightShot', 'phase', 'et', 'parking', 'paused']) {
      assert.deepEqual(resumed[key], paused[key], `Restored lunar ${key}`);
    }
    const stored = await check.evaluate(() => ({
      v1: localStorage.getItem('starshot.campaign.profiles.v1'),
      progress: localStorage.getItem('starshot.progress.v1'),
      v2: JSON.parse(localStorage.getItem('starshot.campaign.profiles.v2')),
    }));
    assert.equal(stored.v1, JSON.stringify(fixture));
    assert.equal(stored.progress, JSON.stringify(progress));
    assert.deepEqual(stored.v2.profiles[0].progress, persisted.profiles[0].progress);
    await capture('canvas-subday-restored');
    await button('Continue').click();
    await button('Resume').click();
    await check.waitForFunction(
      () => window.__starshotCampaign?.phase === 'result',
      {},
      { timeout: 25000 },
    );
    assert.equal((await state()).score.hit, true);
    await capture('canvas-hit');
    await check
      .getByRole('region', { name: 'Flight result' })
      .getByRole('button', { name: 'Try again', exact: true })
      .click();
    if (await button('Pause orbit').count()) await button('Pause orbit').click();
    await button('Guide').click();
    await button('Apply guide').click();
    await check.getByRole('region', { name: 'Mission deck' }).getByRole('button').first().click();
    if (await button('Expand flight deck').count()) await button('Expand flight deck').click();
    await button('Fine aim').click();
    await check.getByRole('spinbutton', { name: 'Aim angle (degrees)' }).fill('-20');
    await ready();
    const impact = await state();
    await button('Launch').click();
    await check.waitForFunction(
      () => window.__starshotCampaign?.phase === 'result',
      {},
      { timeout: 25000 },
    );
    assert.equal((await state()).flightSummary, impact.previewSummary);
    assert.equal((await state()).analysis.terminatedBy, 'earth');
    await capture('canvas-impact');
    log(
      'Legacy keys preserved; v1 result/access and exact paused lunar flight restored; Canvas hit and impact passed',
    );
  } finally {
    await context.close();
  }
}
