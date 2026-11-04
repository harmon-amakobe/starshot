#!/usr/bin/env node
/**
 * verify-game.mjs: drive the built game in headless Chromium on a phone and a desktop
 * viewport, screenshot each step, and sweep the console. The harness behind the
 * verify-game skill and the verification-driver agent, and a CI gate: the verify-game job
 * in .github/workflows/ci.yml installs Playwright globally for that run and feeds the
 * required gates check. Playwright is still not a project dependency.
 *
 *   npm run build
 *   node scripts/verify-game.mjs                       serve apps/game/dist and drive it
 *   node scripts/verify-game.mjs --base /starshot/     check subpath portability
 *   node scripts/verify-game.mjs --url http://localhost:5173/
 *   node scripts/verify-game.mjs --steps /tmp/steps.mjs   criterion-specific actions
 *
 * A steps module default-exports `async (page, { shot, viewport, log, intend })`; call
 * `await shot("02-aimed")` after each acceptance criterion, and `intend(url)` before each
 * request it fails on purpose. Screenshots and the report go
 * to a fresh directory under the OS temp dir (override with --out), never into the repo.
 * Exit 1 on any page error, horizontal overflow, or console error or failed request that a
 * step did not declare with `intend(url)`; a declared failure that never happened also fails.
 */
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join, extname, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const dist = resolve(ROOT, opt("dist", "apps/game/dist"));
const base = `/${opt("base", "/").replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");
const out = resolve(opt("out", join(tmpdir(), `starshot-verify-${Date.now()}`)));
const settleMs = Number(opt("settle", "1500"));

let chromium;
let devices;
try {
  ({ chromium, devices } = createRequire(import.meta.url)("playwright"));
} catch {
  console.error("verify-game: Playwright is not resolvable here. It is not a project dependency on purpose;");
  console.error("use a machine where require('playwright') works (NODE_PATH or a global install). Do not add it to package.json.");
  process.exit(2);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".wasm": "application/wasm", ".ico": "image/x-icon", ".txt": "text/plain" };

function serve() {
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`verify-game: ${dist}/index.html does not exist. Build first: npm run build`);
    process.exit(2);
  }
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (!url.pathname.startsWith(base)) {
      res.writeHead(404).end();
      return;
    }
    let rel = decodeURIComponent(url.pathname.slice(base.length)) || "index.html";
    let file = normalize(join(dist, rel));
    if (!file.startsWith(dist)) {
      res.writeHead(403).end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = existsSync(join(file, "index.html")) ? join(file, "index.html") : join(dist, "index.html");
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

const VIEWPORTS = [
  { name: "phone", context: { ...devices["iPhone 13"], defaultBrowserType: undefined } },
  { name: "desktop", context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  { name: "phone-reduced-motion", context: { ...devices["iPhone 13"], defaultBrowserType: undefined, reducedMotion: "reduce" } },
];

async function main() {
  mkdirSync(out, { recursive: true });
  const server = opt("url") ? null : await serve();
  const target = opt("url") ?? `http://127.0.0.1:${server.address().port}${base}`;
  const steps = opt("steps") ? (await import(pathToFileURL(resolve(opt("steps"))).href)).default : null;
  const browser = await chromium.launch();
  const report = { target, out, viewports: [] };
  let bad = 0;
  try {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext(vp.context);
      const page = await ctx.newPage();
      const r = { name: vp.name, console: [], pageErrors: [], failedRequests: [], shots: [] };
      // A step that fails a request on purpose, as lunar-loading.mjs fails the Moon chunk to test
      // Retry, calls intend(url) once per failure. Each call excuses one failed request for that
      // exact URL and one "Failed to load resource" line Chromium writes for it, counted apart as
      // their order is not fixed. A repeat, any other line from that URL or any other failure
      // still fails the run.
      const excused = { requests: new Map(), lines: new Map() };
      const spend = (pool, url) => {
        const left = pool.get(url) ?? 0;
        if (left) pool.set(url, left - 1);
        return left > 0;
      };
      page.on("console", (m) => {
        if (m.type() === "error" && m.text().startsWith("Failed to load resource") && spend(excused.lines, m.location().url)) return;
        if (m.type() === "error" || m.type() === "warning") r.console.push(`${m.type()}: ${m.text()}`);
      });
      page.on("pageerror", (e) => r.pageErrors.push(String(e?.message ?? e)));
      page.on("requestfailed", (q) => spend(excused.requests, q.url()) || r.failedRequests.push(`${q.url()} ${q.failure()?.errorText ?? ""}`));
      page.on("response", (s) => {
        if (s.status() >= 400 && !spend(excused.requests, s.url())) r.failedRequests.push(`${s.status()} ${s.url()}`);
      });
      const intend = (url) => {
        for (const pool of Object.values(excused)) pool.set(url, (pool.get(url) ?? 0) + 1);
      };
      const shot = async (label) => {
        const file = join(out, `${vp.name}-${label}.png`);
        await page.screenshot({ path: file });
        r.shots.push(file);
        return file;
      };
      await page.goto(target, { waitUntil: "load" });
      await page.waitForTimeout(settleMs);
      await shot("01-load");
      r.layout = await page.evaluate(() => ({
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        canvases: [...document.querySelectorAll("canvas")].map((c) => ({ w: c.width, h: c.height, label: c.getAttribute("aria-label") ?? c.getAttribute("role") ?? "" })),
        unnamedControls: [...document.querySelectorAll("button, [role=button], input, select, a[href]")]
          .filter((el) => !(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title") || el.textContent?.trim() || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest("label")))
          .map((el) => el.outerHTML.slice(0, 80)),
        smallTargets: [...document.querySelectorAll("button, [role=button], input, select, a[href]")]
          .map((el) => el.getBoundingClientRect())
          .filter((b) => b.width > 0 && (b.width < 44 || b.height < 44)).length,
      }));
      r.fps = await page.evaluate(
        () => new Promise((ok) => {
          let n = 0;
          const t0 = performance.now();
          const tick = () => (performance.now() - t0 < 2000 ? (n++, requestAnimationFrame(tick)) : ok(Math.round((n * 1000) / (performance.now() - t0))));
          requestAnimationFrame(tick);
        }),
      );
      try {
        writeFileSync(join(out, `${vp.name}-aria.yml`), await page.locator("body").ariaSnapshot());
      } catch (e) {
        r.ariaSnapshotError = String(e?.message ?? e);
      }
      if (steps) await steps(page, { shot, viewport: vp.name, log: (s) => console.log(`  [${vp.name}] ${s}`), intend });
      // A declared failure that never happened is a step bug, and its excuse could hide a later one.
      for (const [url, left] of excused.requests) if (left) r.failedRequests.push(`declared but never failed: ${url}`);
      const errs = r.console.filter((c) => c.startsWith("error")).length + r.pageErrors.length + r.failedRequests.length + (r.layout.overflowX ? 1 : 0);
      bad += errs;
      console.log(`${vp.name.padEnd(22)} ${errs ? "FAIL" : "ok  "} console ${r.console.length}, page errors ${r.pageErrors.length}, failed requests ${r.failedRequests.length}, overflowX ${r.layout.overflowX}, canvases ${r.layout.canvases.length}, unnamed controls ${r.layout.unnamedControls.length}, targets < 44px ${r.layout.smallTargets}, rAF ${r.fps}/s`);
      for (const line of [...r.console, ...r.pageErrors, ...r.failedRequests]) console.log(`    ${line.slice(0, 200)}`);
      report.viewports.push(r);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server?.close();
  }
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
  console.log(`verify-game: ${bad ? "FAILED" : "clean"}; screenshots and report.json in ${out}`);
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.error(`verify-game: ${e?.stack ?? e}`);
  process.exit(1);
});
