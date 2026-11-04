import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { flightControls } from './screen-flight-controls.mjs';

// Records every message of the app's one physics worker, as screen-async.mjs wraps it.
// The probe posts its own searches, apart from the game's Search routes control, so it can time
// them against a queued preview; lunar-campaign.mjs drives that control.
function recordWorker() {
  localStorage.clear();
  const Native = window.Worker;
  const log = (window.__lunarLog = { workers: 0, posts: [], replies: [] });
  window.Worker = class extends Native {
    constructor(...args) {
      super(...args);
      log.workers++;
      window.__lunarWorker = this;
      this.addEventListener('message', (event) => {
        log.replies.push({ at: performance.now(), data: event.data });
      });
    }
    postMessage(message, ...rest) {
      const { id, kind, purpose } = message;
      log.posts.push({ at: performance.now(), id, kind, purpose });
      super.postMessage(message, ...rest);
    }
  };
}

export default async (page, harness) => {
  process.env.STARSHOT_PROBE_OUT ??= mkdtempSync(join(tmpdir(), 'starshot-lunar-worker-'));
  const { viewport, log } = harness;
  const { state, ready, button, guide, fine, launch } = flightControls(page, harness);
  const worker = () => page.evaluate(() => window.__lunarLog);
  const post = (id, query) =>
    page.evaluate((message) => window.__lunarWorker.postMessage(message), {
      kind: 'hint',
      id,
      query: { kind: 'lunar', ...query },
    });
  const answered = (id) =>
    page.waitForFunction((id) => window.__lunarLog.replies.some((r) => r.data.id === id), id, {
      timeout: 60000,
    });
  const replyTo = async (id) => (await worker()).replies.find((r) => r.data.id === id);
  await page.addInitScript(recordWorker);
  await page.goto(page.url());
  await ready();
  await button('Play').click();
  // Prewarm: the player's guide flies the reference, then an empty search, so neither
  // module loading nor a first flight is in the timings below.
  await guide();
  await fine();
  const reference = (await worker()).replies.find((r) => r.data.kind === 'hint').data;
  const fields = (reply) => [reply.strategy, reply.grid, reply.simulations];
  assert.deepEqual(fields(reference), ['reference', 'moon-grid/1', 1]);
  assert.equal(reference.hint.source, 'curated');
  await post(900001, { strategy: 'search', budget: 0 });
  await post(900002, { strategy: 'search', budget: 241 });
  await answered(900002);
  const empty = (await replyTo(900001)).data;
  assert.deepEqual([empty.hint, ...fields(empty)], [null, 'search', 'moon-grid/1', 0]);
  assert.equal((await replyTo(900002)).data.kind, 'error');
  const before = await state();
  await post(900003, { strategy: 'search' });
  // The only aim change while the search runs: the app queues one preview for it.
  await page.getByRole('spinbutton', { name: 'Departure speed (km/s)' }).fill('3.2');
  await answered(900003);
  await ready();
  await page.waitForTimeout(250);
  const searched = await state();
  // The probe's search reply goes to no app request, so aim and guide stay as the player set them.
  assert.deepEqual(searched.aim, { angleDeg: before.aim.angleDeg, speedKmS: 3.2 });
  assert.equal(searched.hintUsed, before.hintUsed);
  const result = await launch('search-preview');
  const { workers, posts, replies } = await worker();
  assert.equal(workers, 1);
  // Each post gets exactly one reply, with the post's own id.
  assert.deepEqual(replies.map((r) => r.data.id).sort(), posts.map((p) => p.id).sort());
  const at = (id) => posts.find((p) => p.id === id).at;
  const search = await replyTo(900003);
  const during = posts.filter((p) => p.purpose === 'preview' && p.at > at(900003));
  assert.equal(during.length, 1);
  const preview = await replyTo(during[0].id);
  const flight = await replyTo(result.flightId);
  assert.ok(preview.at < search.at, 'the queued preview was answered before the search ended');
  const route = { day: search.data.hint.day, aim: search.data.hint.aim };
  assert.deepEqual(route, { day: 0, aim: { angleDeg: 0, speedKmS: 3.12 } });
  assert.deepEqual(fields(search.data), ['search', 'moon-grid/1', 236]);
  // Canonical request: preview and launch fly it to identical samples and analysis.
  assert.equal(flight.data.shot.stopAtEntry, true);
  for (const key of ['shot', 'result', 'analysis'])
    assert.deepStrictEqual(flight.data[key], preview.data[key], key);
  const idle = posts.filter((p) => p.purpose === 'preview' && p.at < at(900001)).at(-1);
  const timing = (p) => {
    const reply = replies.find((r) => r.data.id === p.id);
    const { ms, simulations } = reply.data;
    return { ...p, latencyMs: reply.at - p.at, workerMs: ms, simulations };
  };
  const record = {
    order: replies.map((r) => r.data.id),
    idlePreview: timing(idle),
    searchPreview: timing(during[0]),
    search: timing(posts.find((p) => p.id === 900003)),
    posts: posts.map(timing),
  };
  writeFileSync(
    join(process.env.STARSHOT_PROBE_OUT, `${viewport}-lunar-worker.json`),
    JSON.stringify(record, null, 2),
  );
  const ms = (value) => `${Math.round(value)} ms`;
  log(
    `preview ${ms(record.searchPreview.latencyMs)} during a ${ms(record.search.latencyMs)} ` +
      `search of 236 flights; idle preview ${ms(record.idlePreview.latencyMs)}`,
  );
};
