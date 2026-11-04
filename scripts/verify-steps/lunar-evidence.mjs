import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { flightControls } from './screen-flight-controls.mjs';
import asyncProof from './screen-async.mjs';

// The Moon cases the screen steps leave open: screen-restore.mjs restores a sub-day flight
// under Canvas only, screen-flight.mjs flies the outcomes and YOLO at phone portrait and
// desktop, and screen-async.mjs switches pilots at the desktop size alone.
const KEPT = ['shotKey', 'shot', 'flightShot', 'flightSummary', 'phase', 'et', 'parking', 'paused'];
const PHONE = { deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'reduce' };

/**
 * The names of the overlays drawn above a control whose boxes meet its own: the flight deck, the
 * mission pill and an open mission drawer. A box test, not the centre point, so a control half
 * under the deck fails too.
 */
export const covering = (control) =>
  control.evaluate((e) => {
    const meet = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const box = e.getBoundingClientRect();
    return ['.c-deck', '.c-mission-toggle', '.c-mission-body']
      .map((s) => document.querySelector(s))
      .filter((over) => over && !over.contains(e) && meet(box, over.getBoundingClientRect()))
      .map((over) => over.getAttribute('aria-label') || over.className);
  });

export default async (page, harness) => {
  process.env.STARSHOT_PROBE_OUT ??= mkdtempSync(join(tmpdir(), 'starshot-lunar-evidence-'));
  const { viewport, log } = harness;
  const { state, ready, button, check, pause, fine, launch, retry, pull, setMode, menu, resume } =
    flightControls(page, harness);
  const phone = viewport.startsWith('phone'), size = phone ? '844x390' : '1440x900';
  const same = (now, then, keys, label) => {
    for (const key of keys) assert.deepEqual(now[key], then[key], `${label}: ${key}`);
  };
  const reload = async () => {
    await menu();
    await page.reload();
    await page.waitForFunction(
      () => window.__starshotCampaign && !window.__starshotCampaign.hydrating && window.__starshotCampaign.previewReady,
      {}, { timeout: 30000 });
    const restored = await state();
    await resume();
    return restored;
  };
  // At 844x390 the flight deck once covered Apply guide and the result card (findings row 20).
  // Each must now lie clear of the deck and the pill; the guide is still applied by keyboard.
  const covered = async (control) => {
    const over = await covering(control);
    assert.deepEqual(over, [], `"${(await control.textContent()).trim()}" at ${size} lies under ${over}`);
  };
  const guide = async () => {
    await button('Guide').click();
    const apply = page.getByRole('button', { name: 'Apply guide', exact: true, disabled: false });
    await apply.waitFor({ timeout: 20000 });
    await covered(apply);
    await apply.press('Enter');
    await page.getByRole('region', { name: 'Mission deck' }).getByRole('button').first().click();
    await ready();
  };
  const result = () =>
    page.waitForFunction(() => window.__starshotCampaign?.phase === 'result', {}, { timeout: 25000 });
  if (phone) await page.setViewportSize({ width: 844, height: 390 });

  // 1. A paused sub-day Moon flight, then its result, each restored by a reload under WebGL.
  await button('Play').click();
  await pause();
  await guide();
  const preview = await state();
  await button('Launch').click();
  await page.waitForFunction(() => window.__starshotCampaign?.phase === 'flight');
  await button('Pause').click();
  const paused = await state();
  assert.equal(paused.flightSummary, preview.previewSummary, 'preview and launch differ');
  assert.notEqual(new Date(paused.launchIso).getUTCHours(), 0, 'the guided departure is not sub-day');
  same(await reload(), paused, KEPT, 'paused flight');
  assert.equal((await state()).renderer, 'WebGL 2');
  await check(`${size}-subday-restored`);
  await button('Resume').click();
  await result();
  const done = await state();
  assert.equal(done.score.hit, true);
  same(await reload(), done, [...KEPT, 'score', 'analysis'], 'result');
  await check(`${size}-result-restored`);
  for (const control of await page.getByRole('region', { name: 'Flight result' }).getByRole('button').all())
    await covered(control);
  // The pill once sat over the card's text at 844x390.
  assert.deepEqual(await covering(page.getByRole('region', { name: 'Flight result' })), [], `the result card at ${size}`);

  // 2. Replay flies the restored flight again from its launch, to the same analysis and score.
  await page.getByRole('region', { name: 'Flight result' }).getByRole('button', { name: 'Replay' }).click();
  const replay = await state();
  assert.equal(replay.phase, 'flight');
  // The clock runs on before the first read, so the replay is only known to restart early.
  assert(replay.et >= done.flightShot.launchEt && replay.et < (done.et + done.flightShot.launchEt) / 2);
  same(replay, done, ['shotKey', 'flightShot', 'flightSummary', 'analysis'], 'replay');
  await result();
  same(await state(), done, ['et', 'score', 'analysis', 'flightSummary'], 'replay result');
  await check(`${size}-replay-result`);
  log(`${size}: sub-day flight, result and replay kept ${KEPT.length + 2} fields under WebGL`);
  if (!phone) return;

  // 3. Short landscape: guided miss and Earth impact, then Plan and YOLO pulls, each cancelled once.
  await retry();
  await guide();
  await fine(20, 3.24);
  await ready();
  assert.equal((await launch(`${size}-moon-miss`)).score.hit, false);
  await retry();
  await guide();
  await fine(-20, 3.24);
  await ready();
  assert.equal((await launch(`${size}-earth-impact`)).analysis.terminatedBy, 'earth');
  await retry();
  await pull(`${size}-plan-cancel`, true);
  await pull(`${size}-plan`);
  await setMode('hail-mary');
  await pull(`${size}-hail-cancel`, true);
  await pull(`${size}-hail-launch`);
  await result();
  await check(`${size}-hail-result`);

  // 4. The stale-reply owner switch at phone portrait and short landscape. It makes its own
  // contexts, so the reduced-motion phone would only repeat it.
  if (viewport !== 'phone') return;
  await asyncProof(page, harness, [[390, 844], [844, 390]].map(([width, height]) => ({
    label: `phone-${width}x${height}-`,
    options: { ...PHONE, viewport: { width, height } },
  })));
};
