// Run with verify-game.mjs. At every checkpoint of the PR2 group's probe (screen-split.mjs and
// the flight steps it runs), records the computed style of each element in <main>, with its
// ::before and ::after boxes, and the screenshot. With STARSHOT_STYLE_BASELINE set to an earlier
// build's dist directory, it then swaps that build's stylesheets in, in the same place, and fails
// on any computed style or screenshot pixel that differs. The scene and React's frame state are
// held while it compares, since an orbit that plays between two separate runs moves labels that
// no stylesheet touches. Without the variable it only records, for evidence. Evidence goes to
// STARSHOT_PROBE_OUT, shared with screen-split.mjs, or a new temporary directory. A stylesheet
// refactor promises no visual change; this checks it.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import screenSplit from './screen-split.mjs';

// Runs in the page. Custom properties are read by name, since computed styles do not list them.
export function computedStyles() {
  const root = document.querySelector('main') ?? document.getElementById('root');
  const custom = new Set();
  const walk = (rules) => {
    for (const rule of rules) {
      for (const name of rule.style ?? []) if (name.startsWith('--')) custom.add(name);
      if (rule.cssRules) walk(rule.cssRules);
    }
  };
  for (const sheet of document.styleSheets) walk(sheet.cssRules);
  const nodes = [root, ...root.querySelectorAll('*')];
  for (const node of nodes)
    for (const name of node.style ?? []) if (name.startsWith('--')) custom.add(name);
  const names = [...new Set([...getComputedStyle(root), ...[...custom].sort()])];
  const values = new Map();
  const id = (value) => values.get(value) ?? values.set(value, values.size).get(value);
  const read = (style) => names.map((name) => id(style.getPropertyValue(name)));
  const path = (node) => {
    const steps = [];
    for (let n = node; n !== root; n = n.parentElement)
      steps.unshift([...n.parentElement.children].indexOf(n));
    return `${steps.join('.')}:${node.localName}`;
  };
  const elements = nodes.map((node) => {
    const entry = {
      key: path(node),
      class: node.getAttribute('class') ?? '',
      style: read(getComputedStyle(node)),
    };
    for (const pseudo of ['::before', '::after']) {
      const style = getComputedStyle(node, pseudo);
      if (!['none', 'normal'].includes(style.content)) entry[pseudo] = read(style);
    }
    return entry;
  });
  return { names, values: [...values.keys()], elements, size: [innerWidth, innerHeight] };
}

// Turns one record's indexed values back into text, keyed by element and property.
function expand(record) {
  const out = new Map();
  for (const element of record.elements)
    for (const box of ['style', '::before', '::after'])
      if (element[box])
        element[box].forEach((value, i) =>
          out.set(`${element.key}${box === 'style' ? '' : box} ${record.names[i]}`, {
            value: record.values[value],
            class: element.class,
          }),
        );
  return out;
}

export function styleDifferences(before, after) {
  const [b, a] = [expand(before), expand(after)];
  const differences = [];
  for (const key of new Set([...b.keys(), ...a.keys()]))
    if (b.get(key)?.value !== a.get(key)?.value)
      differences.push(
        `${key} (${a.get(key)?.class ?? b.get(key)?.class}): ${b.get(key)?.value ?? 'absent'} -> ${a.get(key)?.value ?? 'absent'}`,
      );
  return differences;
}

// Runs in the page: holds the app's animation frames, so the scene and the frame state stay put
// while the stylesheets swap, then waits out a frame already under way.
function hold() {
  const native = { raf: window.requestAnimationFrame, caf: window.cancelAnimationFrame };
  const queue = new Map();
  let next = 2 ** 30;
  window.__styleHold = { native, queue };
  window.requestAnimationFrame = (callback) => (queue.set(++next, callback), next);
  window.cancelAnimationFrame = (id) =>
    queue.delete(id) ? undefined : native.caf.call(window, id);
  return new Promise((done) => native.raf.call(window, () => native.raf.call(window, done)));
}

function release() {
  const { native, queue } = window.__styleHold;
  delete window.__styleHold;
  Object.assign(window, { requestAnimationFrame: native.raf, cancelAnimationFrame: native.caf });
  for (const callback of queue.values()) native.raf.call(window, callback);
}

// Runs in the page: with a baseline, disables this build's sheets and puts the baseline's text
// where they were; with null, undoes that. Relative URLs resolve as they would from its file.
// A swap starts transitions from the old values, which would hide a changed declaration, so
// every animation is finished first. A swapped sheet registers its font faces anew, so styles
// are read once those fonts load.
async function useSheets(baseline) {
  const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
  document.getElementById('style-identity-baseline')?.remove();
  for (const link of links) link.disabled = baseline !== null;
  if (baseline !== null) {
    const style = document.createElement('style');
    const from = new URL(baseline.href, document.baseURI);
    style.id = 'style-identity-baseline';
    style.textContent = baseline.css.replace(
      /url\((['"]?)(?![a-z]+:|\/)([^'")]+)\1\)/g,
      (_, quote, url) => `url(${quote}${new URL(url, from).href}${quote})`,
    );
    links.at(-1).after(style);
  }
  // getAnimations() brings style up to date, so it lists the transitions the swap just started.
  for (const animation of document.getAnimations()) {
    try {
      animation.finish();
    } catch {
      // An endless animation cannot finish; the steady screenshots then report it.
    }
  }
  void document.body.offsetHeight;
  await document.fonts.ready;
}

/** The stylesheets a built dist directory links from its index.html, in order. */
export function stylesheetOf(dist) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const hrefs = [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  assert(hrefs.length > 0, `${dist}/index.html links no stylesheet`);
  return {
    href: hrefs[0],
    hrefs,
    css: hrefs.map((href) => readFileSync(join(dist, href), 'utf8')).join('\n'),
  };
}

// Chromium can show a just-invalidated page in an interim raster for a frame or two (seen as up
// to 6 pixels two levels apart with nothing else changed), so a screenshot counts once the next
// one, 150 ms later, is byte for byte the same.
async function steadyShot(page, first) {
  let last = first ?? (await page.screenshot());
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(150);
    const next = await page.screenshot();
    if (next.equals(last)) return { png: next, steady: true };
    last = next;
  }
  return { png: last, steady: false };
}

/**
 * One checkpoint: this build's styles and steady screenshot, the baseline's on the same held
 * frame, then this build's again. A worker reply can still change a readout's text during the
 * hold, so the baseline's pixels must equal this build's on one side of the swap or the other.
 * A pixel difference with equal styles tries again; a real stylesheet change keeps it every time.
 */
export async function compareSheets(page, baseline, takeShot) {
  for (let attempt = 1; ; attempt++) {
    await page.evaluate(hold);
    try {
      const after = await page.evaluate(computedStyles);
      const file = await takeShot();
      const shown = await steadyShot(page, readFileSync(file));
      await page.evaluate(useSheets, baseline);
      const before = await page.evaluate(computedStyles);
      const base = await steadyShot(page);
      await page.evaluate(useSheets, null);
      const again = await steadyShot(page);
      const recheck = await page.evaluate(computedStyles);
      const moved = styleDifferences(after, recheck);
      const unsettled = [
        !shown.steady && 'this build never held still',
        !base.steady && 'the baseline never held still',
        !again.steady && 'this build never held still after the swap back',
        moved.length && `styles moved during the hold: ${moved.slice(0, 3).join('; ')}`,
      ].filter(Boolean);
      const settled = unsettled.length === 0;
      const png = again.png.equals(base.png) ? again.png : shown.png;
      const decided = png.equals(base.png) || styleDifferences(before, after).length > 0;
      if ((settled && decided) || attempt === 4) {
        const result = { after, before, file, png, beforePng: base.png, attempt };
        return { ...result, settled, unsettled };
      }
    } finally {
      await page.evaluate(release);
    }
    await page.waitForTimeout(500);
  }
}

export default async function styleIdentity(page, harness) {
  process.env.STARSHOT_PROBE_OUT ??= mkdtempSync(join(tmpdir(), 'starshot-style-identity-'));
  const out = process.env.STARSHOT_PROBE_OUT;
  const baseline = process.env.STARSHOT_STYLE_BASELINE
    ? stylesheetOf(process.env.STARSHOT_STYLE_BASELINE)
    : null;
  mkdirSync(out, { recursive: true });
  const { viewport, log } = harness;
  if (baseline) {
    // A baseline that is this build's own sheet would pass every checkpoint and prove nothing.
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.href),
    );
    const texts = await Promise.all(
      hrefs.map(async (href) => (await page.request.get(href)).text()),
    );
    const name = (href) => href.split('/').pop();
    log(
      `comparing ${hrefs.map(name).join(', ')} with the baseline's ${baseline.hrefs.map(name).join(', ')}`,
    );
    assert.notEqual(
      texts.join('\n'),
      baseline.css,
      "STARSHOT_STYLE_BASELINE holds this build's own stylesheet; point it at the earlier build's dist",
    );
  }
  const names = [];
  // A checkpoint can repeat a name, so files carry their position as well.
  const shot = async (name) => {
    const id = `${viewport}-${String(names.push(name)).padStart(3, '0')}-${name}`;
    writeFileSync(join(out, `${viewport}-checkpoints.json`), JSON.stringify(names));
    if (!baseline) {
      const record = { name, ...(await page.evaluate(computedStyles)) };
      const file = await harness.shot(name);
      writeFileSync(join(out, `${id}.png`), readFileSync(file));
      writeFileSync(join(out, `${id}.json`), JSON.stringify(record));
      log(`${name}: ${record.elements.length} elements recorded`);
      return file;
    }
    const r = await compareSheets(page, baseline, () => harness.shot(name));
    const differences = styleDifferences(r.before, r.after);
    // Equal PNG bytes mean equal pixels; unequal bytes fail, which errs on the side of caution.
    const same = r.png.equals(r.beforePng);
    writeFileSync(join(out, `${id}.png`), r.png);
    writeFileSync(join(out, `${id}.json`), JSON.stringify({ name, ...r.after }));
    if (!same) writeFileSync(join(out, `${id}-baseline.png`), r.beforePng);
    if (differences.length)
      writeFileSync(join(out, `${id}-differences.json`), JSON.stringify(differences, null, 2));
    log(
      `${name}: ${r.after.elements.length} elements, ${differences.length} style differences, pixels ${same ? 'same' : 'different'}, attempt ${r.attempt}`,
    );
    assert(r.settled, `${id}: the page kept changing (${r.unsettled.join(', ')})`);
    assert.deepEqual(
      differences.slice(0, 10),
      [],
      `${id}: computed styles changed (${differences.length})`,
    );
    assert(same, `${id}: the screenshot changed`);
    return r.file;
  };
  await screenSplit(page, { ...harness, shot });
}
