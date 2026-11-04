import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { flightControls } from './screen-flight-controls.mjs';
import { covering } from './lunar-evidence.mjs';

// The Moon campaign in the shell: the short-phone free room, a searched route applied and flown,
// a Moonshot hit continued into First Light by pointer, every mission drawn, and the short
// landscape cases d and e of findings row 20. Cases a to c show only while the Moon loads, so
// lunar-loading.mjs checks them.
const ORDER = { Moonshot: 'moonshot', 'First Light': 'first-light', 'Morning Star': 'morning-star', 'Big Game': 'big-game', 'Grand Tour': 'grand-tour' };

// Labelled controls a pointer can reach: those under 44 px, and each pair whose boxes meet. A
// body's label may sit on its own body's hit target, since both select that body.
function crowding() {
  const meet = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const shown = [...document.querySelectorAll('button, input, select')]
    .filter((e) => e.checkVisibility({ visibilityProperty: true }))
    .map((e) => ({ name: e.getAttribute('aria-label') || e.textContent.trim(), box: e.getBoundingClientRect() }));
  const body = (name) => /^(Inspect|Select) (.+)$/.exec(name)?.[2];
  const overlaps = [];
  for (const [i, a] of shown.entries())
    for (const b of shown.slice(i + 1))
      if (meet(a.box, b.box) && !(body(a.name) && body(a.name) === body(b.name))) overlaps.push(`${a.name} / ${b.name}`);
  const small = shown.filter(({ box }) => box.width < 44 || box.height < 44).map((e) => e.name);
  return { small, overlaps };
}

export default async (page, harness) => {
  process.env.STARSHOT_PROBE_OUT ??= mkdtempSync(join(tmpdir(), 'starshot-lunar-campaign-'));
  const { viewport, log } = harness;
  const { state, ready, button, check, pause, expand, collapse, menu, launch, retry } = flightControls(page, harness);
  const phone = viewport.startsWith('phone');
  // The polite status line, polled: a reply's notice lands a render after its control changes.
  const announced = (pattern) =>
    page.waitForFunction((source) => new RegExp(source).test(document.querySelector('[role=status][aria-live=polite]')?.textContent ?? ''),
      pattern.source, { timeout: 30000 });
  const toggle = () => page.getByRole('region', { name: 'Mission deck' }).getByRole('button').first();
  const clear = async (control, size) => {
    const over = await covering(control);
    assert.deepEqual(over, [], `"${(await control.textContent()).trim()}" at ${size} lies under ${over}`);
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
  // WebGL keeps no readable buffer after a frame, so the world is judged from a screenshot with
  // everything else hidden on black: lit pixels, and distinct colours at 4 bits per channel.
  const drawn = async () => {
    const style = await page.addStyleTag({ content: 'body *{visibility:hidden}.c-world,.c-world canvas'
      + '{visibility:visible}html,body{background:#000!important}.starfield{display:none}' });
    const png = (await page.screenshot()).toString('base64');
    await style.evaluate((node) => node.remove());
    return page.evaluate(async (data) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const px = context.getImageData(0, 0, image.width, image.height).data, colours = new Set();
      let lit = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i] + px[i + 1] + px[i + 2] > 30) lit++;
        colours.add(((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4));
      }
      return { lit, colours: colours.size };
    }, png);
  };
  // The frame a mission was left on, so a count is never taken from the previous mission's drawing.
  const frameKey = () => page.evaluate(() => JSON.stringify([window.__starshotCampaign?.heightKm, window.__starshotCampaign?.centre]));
  const visible = async (title, id, before) => {
    await page.waitForFunction(([id, before]) => {
      const s = window.__starshotCampaign;
      return s?.levelId === id && s.renderer && JSON.stringify([s.heightKm, s.centre]) !== before;
    }, [id, before], { timeout: 20000 });
    // Two more animation frames, so both canvases hold the new mission's drawing.
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const scene = await drawn();
    log(`${title}: ${(await state()).renderer}, ${scene.lit} lit pixels, ${scene.colours} colours`);
    assert(scene.lit > 2000 && scene.colours > 12, `${title} drew no visible scene`);
  };
  const size = () => `${page.viewportSize().width}x${page.viewportSize().height}`;

  await button('Play').click();
  await page.waitForTimeout(600);
  assert.equal((await state()).levelId, 'moonshot');

  // 1. Short, default and narrow phones: Fine aim and the System view leave the ring at least
  // 160 px of free room, with every labelled control at 44 px or more and no two overlapping.
  if (phone)
    for (const [width, height] of [[390, 664], [390, 844], [360, 640], [360, 780]]) {
      await page.setViewportSize({ width, height });
      await expand();
      await button('Fine aim').click();
      await button('System view').click();
      await page.waitForTimeout(600);
      const { ringRoom, travel } = await state();
      log(`${width}x${height}: ${ringRoom} px of free room and ${travel} px of travel with Fine aim and System`);
      assert(ringRoom >= 160, `${width}x${height}: ${ringRoom} px of free room`);
      // The System view caps travel at 45 px, and the 390 px phones reach it. At 360 px the anchor,
      // 52 px above Earth, can bound it along an upward heading, so there it must only not collapse.
      if (width === 390) assert.equal(travel, 45, `${width}x${height}: ring travel`);
      else assert(travel > 1, `${width}x${height}: ring travel ${travel}`);
      assert.deepEqual(await page.evaluate(crowding), { small: [], overlaps: [] }, `${width}x${height}`);
      await check(`${width}x${height}-fine-system`);
      await collapse();
      await button('Orbit view').click();
    }
  await page.setViewportSize(phone ? { width: 390, height: 664 } : { width: 1440, height: 900 });

  // 2. The bounded search fills its own slot and changes nothing; Apply searched route sets the
  // route and the guide cap, and the launch flies exactly its preview.
  await pause();
  await ready();
  const before = await state();
  if ((await toggle().getAttribute('aria-expanded')) !== 'true') await toggle().click();
  // The phones press by pointer. The desktop presses by keyboard: focus stays on the busy
  // button, and Tab reaches Apply searched route once the route is in.
  const start = button('Search routes');
  if (phone) await start.click();
  else {
    await start.focus();
    await page.keyboard.press('Enter');
  }
  const apply = page.getByRole('button', { name: 'Apply searched route', exact: true, disabled: false });
  await apply.waitFor({ timeout: 30000 });
  await announced(/^Searched route ready after \d+ flights\./);
  const searched = await state();
  for (const key of ['aim', 'hintUsed', 'et', 'parking', 'shotKey']) assert.deepEqual(searched[key], before[key], key);
  for (const name of ['Search routes', 'Apply searched route']) {
    const target = await button(name).boundingBox();
    assert(target.width >= 44 && target.height >= 44, `${name} is smaller than 44 px`);
  }
  await check(`${size()}-searched`);
  const focused = (control) => control.evaluate((e) => e === document.activeElement);
  if (phone) await apply.click();
  else {
    assert(await focused(start), 'Search routes lost focus while it searched');
    await page.keyboard.press('Tab');
    assert(await focused(apply), 'Tab does not reach Apply searched route');
    await page.keyboard.press('Enter');
  }
  await announced(/^Searched route applied\. Target approach lined up\.$/);
  await toggle().click();
  await ready();
  const applied = await state();
  assert.deepEqual([applied.aim, applied.hintUsed, applied.paused], [{ angleDeg: 0, speedKmS: 3.12 }, true, true]);
  const flown = await launch(`${size()}-searched-route`);
  assert.equal(flown.score.hit, true);
  assert(flown.score.stars <= 2, 'a searched route earned more than 2 stars');
  await retry();

  // 3. Short landscape: Apply guide, the result card and Next mission lie clear of the deck and
  // the pill. A pointer then continues from a Moonshot hit into First Light, at 844x390 and on
  // the desktop.
  if (phone) await page.setViewportSize({ width: 844, height: 390 });
  await pause();
  await button('Guide').click();
  const guide = page.getByRole('button', { name: 'Apply guide', exact: true, disabled: false });
  await guide.waitFor({ timeout: 20000 });
  await clear(guide, size());
  await guide.click();
  // The drawer stays open: the launch must close it, or it covers the result card's buttons.
  const hit = await launch(`${size()}-guided-hit`);
  assert.equal(hit.score.hit, true);
  const card = page.getByRole('region', { name: 'Flight result' });
  for (const control of await card.getByRole('button').all()) await clear(control, size());
  const pill = await page.evaluate(() => {
    const [a, b] = ['.c-mission-toggle', '.c-result'].map((s) => document.querySelector(s).getBoundingClientRect());
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  });
  assert.equal(pill, false, `the mission pill overlaps the result card at ${size()}`);
  const left = await frameKey();
  await card.getByRole('button', { name: 'Next mission →' }).click();
  await visible(`${size()} First Light after Next mission`, 'first-light', left);
  await check(`${size()}-next-first-light`);

  // 4. Every mission in order draws a visible scene through the same shell.
  for (const [title, id] of Object.entries(ORDER)) {
    const before = await frameKey();
    await pick(title);
    await visible(`${size()} ${title}`, id, before);
  }
  await check(`${size()}-grand-tour`);
};
