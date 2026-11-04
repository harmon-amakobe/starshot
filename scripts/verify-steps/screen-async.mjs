import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Hold actual worker replies by request ID, without changing the application worker.
// lunar-evidence.mjs passes phone sizes; alone, this step runs once, at the desktop size.
const DESKTOP = { label: '', options: { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' } };
export default async function asyncProof(page, { viewport, log }, sizes = viewport === 'desktop' ? [DESKTOP] : []) {
  if (!sizes.length) return;
  const records = [];
  for (const { label, options } of sizes)
    for (const [kind, failure] of [['launch', false], ['launch', true], ['hint', false], ['hint', true]]) {
      const context = await page.context().browser().newContext(options);
      await context.addInitScript(() => {
        const Native = window.Worker;
        window.__heldReplies = [];
        window.__holdKind = '';
        window.Worker = class extends Native {
          constructor(...args) {
            super(...args);
            this.held = new Set();
            let callback;
            Object.defineProperty(this, 'onmessage', {
              get: () => callback,
              set: (value) => {
                callback = value;
              },
            });
            this.addEventListener('message', (event) => {
              const deliver = (failure) =>
                callback?.call(
                  this,
                  failure
                    ? {
                        data: {
                          kind: 'error',
                          id: event.data.id,
                          message: 'Probe response failure',
                        },
                      }
                    : event,
                );
              if (this.held.has(event.data.id))
                window.__heldReplies.push({ id: event.data.id, deliver });
              else deliver(false);
            });
          }
          postMessage(message, ...rest) {
            if (window.__holdKind === (message.kind === 'hint' ? 'hint' : message.purpose))
              this.held.add(message.id);
            super.postMessage(message, ...rest);
          }
        };
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
          () => window.__starshotCampaign?.previewReady && !window.__starshotCampaign.hydrating,
        );
      try {
        await check.goto(page.url());
        await ready();
        await button('Profiles').click();
        await check.getByLabel('New profile', { exact: true }).fill('Other pilot');
        await button('Create profile').click();
        await ready();
        const other = await state();
        await check.getByRole('button', { name: /^Pilot 1 / }).click();
        await ready();
        await button('← Back').click();
        await button('Play').click();
        if (kind === 'launch') {
          await button('Guide').click();
          // By keyboard: at 844x390 the flight deck covers the button for a pointer.
          const apply = check.getByRole('button', { name: 'Apply guide', exact: true, disabled: false });
          await apply.waitFor({ timeout: 20000 });
          await apply.press('Enter');
          await check
            .getByRole('region', { name: 'Mission deck' })
            .getByRole('button')
            .first()
            .click();
          await ready();
        }
        await check.evaluate((value) => {
          window.__holdKind = value;
        }, kind);
        await button(kind === 'launch' ? 'Launch' : 'Guide').click();
        await check.waitForFunction(
          () => window.__heldReplies.length === 1,
          {},
          { timeout: 20000 },
        );
        const old = await state();
        await button('Open main menu').click();
        await button('Profiles').click();
        await check.getByRole('button', { name: /^Other pilot / }).click();
        await ready();
        await button('← Back').click();
        await button('Play').click();
        // A request for the new pilot stays outstanding while the stale response lands.
        await button(kind === 'launch' ? 'Launch' : 'Guide').click();
        await check.waitForFunction(
          () => window.__heldReplies.length === 2,
          {},
          { timeout: 20000 },
        );
        const before = await state();
        const notice = await check.getByRole('status').last().textContent();
        const progress = await check.evaluate(() =>
          JSON.parse(localStorage.getItem('starshot.campaign.profiles.v2')).profiles.map(
            (pilot) => ({ id: pilot.id, progress: pilot.progress, earned: pilot.earned }),
          ),
        );
        await check.evaluate((value) => window.__heldReplies.shift().deliver(value), failure);
        await check.waitForTimeout(250);
        const after = await state();
        assert.equal(after.profileId, other.profileId);
        for (const key of ['shotKey', 'phase', 'pendingRelease', 'owner', 'score', 'flightShot'])
          assert.deepEqual(after[key], before[key], `Stale ${kind} ${key}`);
        assert.equal(await check.getByRole('status').last().textContent(), notice);
        assert.deepEqual(
          await check.evaluate(() =>
            JSON.parse(localStorage.getItem('starshot.campaign.profiles.v2')).profiles.map(
              (pilot) => ({ id: pilot.id, progress: pilot.progress, earned: pilot.earned }),
            ),
          ),
          progress,
        );
        assert.equal(after.workerIdentity, old.workerIdentity);
        assert.equal(after.rendererIdentity, old.rendererIdentity);
        await check.evaluate(() => window.__heldReplies.shift().deliver(false));
        if (kind === 'launch') {
          await check.waitForFunction(() => window.__starshotCampaign?.phase === 'flight');
          assert.equal((await state()).flightSummary, before.previewSummary);
        } else await button('Apply guide').waitFor();
        assert.deepEqual(errors, []);
        const name = `${label}${kind}-${failure ? 'failure' : 'success'}-owner`;
        await check.screenshot({ path: join(process.env.STARSHOT_PROBE_OUT, `${name}.png`) });
        records.push({ name, old, before, after, progress, errors });
        log(`${name}: old reply ignored while new owner's request remained pending`);
      } finally {
        await context.close();
      }
    }
  writeFileSync(
    join(process.env.STARSHOT_PROBE_OUT, `${sizes[0].label}async-owner.json`),
    JSON.stringify(records, null, 2),
  );
}
