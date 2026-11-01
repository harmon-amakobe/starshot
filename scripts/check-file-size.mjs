#!/usr/bin/env node
/**
 * check-file-size.mjs: size, shape and layering, so no file grows into a god file (D28).
 *
 * Size: code lines (blank and comment-only lines excluded) of .ts, .tsx, .rs, .mjs and
 * .css files under apps/, packages/, scripts/ and crates/. Above WARN a file is reported;
 * above FAIL it fails, unless scripts/size-baseline.json lists it. A listed file fails
 * when it grows past its entry, and the baseline itself may only go down: an entry
 * raised or added since the base commit fails too. `--update` lowers entries to the
 * current counts and drops files that are back under FAIL; it never raises one.
 *
 * Shape: a .tsx file warns when two or more of these heuristics exceed their limit.
 * The limits are first estimates (D28), to be tuned once GameScreen.tsx is split:
 *   hook calls (use*( ) > 12, useState calls > 8, props of an exported component > 10,
 *   internal imports from more than 3 top-level areas (src/<dir>, or a @starshot/ package).
 *
 * Layering: packages/ never import from apps/, and nothing in apps/ or packages/
 * imports python/ or third_party/. The third-party gate also rejects any astlo path
 * string there; this check covers every import of those trees.
 *
 * Usage: node scripts/check-file-size.mjs [--update]
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, extname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WARN = 300;
const FAIL = 500;
const SHAPE = { hooks: 12, state: 8, props: 10, areas: 3 };
const BASELINE = "scripts/size-baseline.json";
const EXT = new Set([".ts", ".tsx", ".rs", ".mjs", ".css"]);

const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "pipe"] });
const read = (rel) => readFileSync(resolve(ROOT, rel), "utf8");

/** Lines that hold code: not blank, not only a // comment, not inside a block comment. */
export function codeLines(text, ext) {
  let n = 0;
  let inBlock = false;
  for (const raw of text.split("\n")) {
    let line = raw.trim();
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end < 0) continue;
      line = line.slice(end + 2).replace(/^\}/, "").trim();
      inBlock = false;
    }
    while (line.startsWith("/*") || line.startsWith("{/*")) {
      const end = line.indexOf("*/");
      if (end < 0) {
        inBlock = true;
        line = "";
        break;
      }
      line = line.slice(end + 2).replace(/^\}/, "").trim();
    }
    if (!line || (ext !== ".css" && line.startsWith("//"))) continue;
    n++;
  }
  return n;
}

function shape(text) {
  const hooks = (text.match(/\buse[A-Z]\w*\s*(?:<[^>()]*>)?\(/g) ?? []).length;
  const state = (text.match(/\buseState\s*(?:<[^>()]*>)?\(/g) ?? []).length;
  let props = 0;
  for (const m of text.matchAll(/export\s+(?:default\s+)?function\s+[A-Z]\w*\s*\(\s*\w+\s*:\s*(\w+)/g)) {
    const body = new RegExp(`(?:interface\\s+${m[1]}\\b[^{]*|type\\s+${m[1]}\\s*=\\s*)\\{([\\s\\S]*?)\\n\\}`).exec(text)?.[1] ?? "";
    props = Math.max(props, (body.match(/^\s*(?:readonly\s+)?[\w$]+\??\s*:/gm) ?? []).length);
  }
  const areas = new Set();
  for (const m of text.matchAll(/^\s*import\s[^'"]*["']([^"']+)["']/gm)) {
    const spec = m[1];
    if (spec.startsWith("@starshot/")) areas.add(spec.split("/").slice(0, 2).join("/"));
    else if (spec.startsWith(".")) areas.add(spec.replace(/^(\.\.?\/)+/, "").split("/").length > 1 ? spec.replace(/^(\.\.?\/)+/, "").split("/")[0] : "(same area)");
  }
  return { hooks, state, props, areas: areas.size };
}

function importsOf(text) {
  const out = [];
  const re = /(?:^\s*(?:import|export)\s[^'"]*?from\s*|^\s*import\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|new\s+URL\s*\(\s*)["'`]([^"'`]+)["'`]/gm;
  for (const m of text.matchAll(re)) out.push(m[1]);
  return out;
}

function layering(file, text) {
  const problems = [];
  for (const spec of importsOf(text)) {
    const target = spec.startsWith(".") ? posix.normalize(posix.join(posix.dirname(file), spec)) : spec;
    if (/^(?:\.\.\/)*(?:python|third_party)(?:\/|$)/.test(target)) problems.push(`${file}: imports ${spec}, inside python/ or third_party/ (D2, D10)`);
    if (file.startsWith("packages/") && (/^(?:\.\.\/)*apps\//.test(target) || spec === "@starshot/game" || spec.startsWith("@starshot/game/"))) {
      problems.push(`${file}: imports ${spec} from apps/; packages never depend on an app`);
    }
  }
  return problems;
}

function baseBaseline() {
  const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "HEAD";
  try {
    return JSON.parse(git(["show", `${base}:${BASELINE}`])).files ?? {};
  } catch {
    return null; // no committed baseline yet: this change creates it
  }
}

const files = git(["ls-files", "-z", "--cached", "--others", "--exclude-standard"])
  .split("\0")
  .filter((f) => /^(apps|packages|scripts|crates)\//.test(f) && EXT.has(extname(f)) && !/(^|\/)(node_modules|dist|target)\//.test(f) && existsSync(resolve(ROOT, f)));
const baseline = existsSync(resolve(ROOT, BASELINE)) ? JSON.parse(read(BASELINE)) : { files: {} };
const problems = [];
const warnings = [];
const counts = new Map();

for (const f of files) {
  const text = read(f);
  const n = codeLines(text, extname(f));
  counts.set(f, n);
  const allowed = baseline.files[f];
  if (allowed !== undefined) {
    if (n > allowed) problems.push(`${f}: ${n} code lines, above its baseline of ${allowed}; split it rather than raising the entry`);
  } else if (n > FAIL) problems.push(`${f}: ${n} code lines, above the ${FAIL}-line limit; split it into smaller modules`);
  else if (n > WARN) warnings.push(`${f}: ${n} code lines (warn above ${WARN})`);
  if (f.endsWith(".tsx")) {
    const s = shape(text);
    const over = Object.keys(SHAPE).filter((k) => s[k] > SHAPE[k]);
    if (over.length >= 2) warnings.push(`${f}: god-component signs: ${over.map((k) => `${k} ${s[k]} > ${SHAPE[k]}`).join(", ")}`);
  }
  if (/^(apps|packages)\//.test(f) && /\.[cm]?[jt]sx?$/.test(f)) problems.push(...layering(f, text));
}
const previous = baseBaseline();
for (const [f, allowed] of Object.entries(baseline.files)) {
  if (!counts.has(f)) problems.push(`${BASELINE}: ${f} no longer exists; delete its entry`);
  else if (counts.get(f) <= FAIL) warnings.push(`${f}: ${counts.get(f)} code lines, back under ${FAIL}; run --update to drop its baseline entry`);
  else if (counts.get(f) < allowed) warnings.push(`${f}: shrank to ${counts.get(f)} from ${allowed}; run --update to lock in the gain`);
  if (previous && (previous[f] === undefined || allowed > previous[f])) problems.push(`${BASELINE}: ${f} was raised or added to ${allowed}; the baseline may only go down (D28)`);
}

if (process.argv.includes("--update")) {
  const next = {};
  for (const [f, allowed] of Object.entries(baseline.files)) if (counts.get(f) > FAIL) next[f] = Math.min(allowed, counts.get(f));
  writeFileSync(resolve(ROOT, BASELINE), `${JSON.stringify({ ...baseline, files: next }, null, 2)}\n`);
  console.log(`size: wrote ${BASELINE} with ${Object.keys(next).length} entr(ies); nothing was raised`);
  process.exit(0);
}

for (const w of warnings) console.log(`  ! ${w}`);
if (problems.length) {
  console.error(`size: FAILED, ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
if (files.length === 0) {
  console.error("size: FAILED, zero files measured; the file listing is broken, so a pass would be vacuous.");
  process.exit(1);
}
console.log(`size: ${files.length} file(s) measured, none over ${FAIL} code lines outside the baseline (${Object.keys(baseline.files).length} entr(ies)); ${warnings.length} warning(s); layering clean`);
