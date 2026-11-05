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
 * string there; this check covers every import of those trees. For the Rust core, the
 * rules of scripts/lib/rust-rules.mjs apply: no include or #[path] in crates/ reaches
 * python/ or third_party/; no attribute, crate manifest, Cargo.toml lints entry, extra
 * clippy.toml or .cargo/config switches off the D16 fence (disallowed methods and
 * forbidden unsafe code); the list is in that file's header.
 *
 * Long lines: a .ts, .tsx, .mjs or .css file with lines over 160 characters warns, naming
 * the file and the count. Compressed lines hide a file's size, because one line can hold a
 * whole component (v1-starshot deviation 16). It never fails. A self-test on
 * scripts/fixtures/size runs first through fileFindings, the per-file function the scan
 * uses: each of the four languages must warn on a fixture with long lines and Rust must
 * not, lines of exactly 160 characters must not, and CRLF endings must not add one. So a
 * scan with no long-line warning means no file has long lines, not that the rule is off.
 *
 * Usage: node scripts/check-file-size.mjs [--update | --self-test]
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, extname, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { crateManifest, fenceFindings, rustFindings, rustSelfTest } from "./lib/rust-rules.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WARN = 300;
const FAIL = 500;
const SHAPE = { hooks: 12, state: 8, props: 10, areas: 3 };
const BASELINE = "scripts/size-baseline.json";
const EXT = new Set([".ts", ".tsx", ".rs", ".mjs", ".css"]);
// PR3c names four languages; Rust waits for crates/ (D16).
const LONG = 160;
const LONG_EXT = new Set([".ts", ".tsx", ".mjs", ".css"]);
const FIXTURES = "scripts/fixtures/size";
// The scan and the self-test share this test, so a case for a path the scan skips fails.
const measured = (f) => /^(apps|packages|scripts|crates)\//.test(f) && EXT.has(extname(f)) && !/(^|\/)(node_modules|dist|target)\//.test(f);

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

/** Lines over LONG characters, counted in code points so a symbol counts once. */
export function longLines(text) {
  let n = 0;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.length > LONG && [...line].length > LONG) n++;
  }
  return n;
}

/** The long-line warning for a file, or null when it has none or its language is not read. */
export function longLineWarning(file, text) {
  if (!LONG_EXT.has(extname(file))) return null;
  const n = longLines(text);
  return n ? `${file}: ${n} line(s) over ${LONG} characters; format it, so its code lines can be counted` : null;
}

/**
 * Each fixture case names a file, the path it pretends to live at, the long lines its warning
 * must report (0: none) and, with `crlf`, that its lines end in CRLF. Git stores the fixtures
 * with LF (.gitattributes), so CRLF is applied here. Every problem names a relative path and
 * the fix; a broken fixture fails the gate rather than throwing.
 */
function selfTest() {
  const expect = `${FIXTURES}/expect.json`;
  const restore = `restore it with git restore ${expect}`;
  let cases;
  try {
    cases = JSON.parse(read(expect));
  } catch (e) {
    const why = e?.code === "ENOENT" ? "is missing" : e?.code ? "cannot be read" : "is not valid JSON";
    return { cases: 0, problems: [`${expect} ${why}; ${restore}`] };
  }
  if (!Array.isArray(cases) || cases.length === 0) return { cases: 0, problems: [`${expect} must be a non-empty list of cases; ${restore}`] };
  const problems = [];
  const covered = new Map();
  cases.forEach((c, i) => {
    const { file, as, long, crlf } = c ?? {};
    if (typeof file !== "string" || typeof as !== "string" || !Number.isInteger(long) || long < 0) {
      problems.push(`${expect}: case ${i + 1} needs a string file and as and a whole-number long; fix the case or ${restore}`);
      return;
    }
    const path = `${FIXTURES}/${file}`;
    let text;
    try {
      text = read(path);
    } catch {
      problems.push(`${path} is missing or unreadable; restore it with git restore ${path}, or drop case ${i + 1} from ${expect}`);
      return;
    }
    if (crlf) text = text.replaceAll("\n", "\r\n");
    if (!measured(as)) problems.push(`${as}: the scan never reads this path, so case ${i + 1} proves nothing; fix the case or the listing`);
    const got = fileFindings(as, text, {}).warnings.find((w) => w.startsWith(`${as}: `) && w.includes(` over ${LONG} characters`)) ?? null;
    const want = long ? `${as}: ${long} line(s) over ${LONG} characters` : null;
    const label = `${file} as ${as}${crlf ? " with CRLF" : ""}`;
    if (want ? !got?.startsWith(want) : got !== null) problems.push(`${label}: expected ${want ?? "no warning"}, got ${got ?? "no warning"}; fix longLines or longLineWarning, or the case`);
    const kinds = covered.get(extname(as)) ?? new Set();
    covered.set(extname(as), kinds.add(long > 0 ? "warns" : "quiet"));
  });
  for (const ext of EXT) {
    const need = LONG_EXT.has(ext) ? "warns" : "quiet";
    if (!covered.get(ext)?.has(need)) problems.push(`${expect} has no ${ext} case that ${need === "warns" ? "expects a warning" : "expects none"}; add one`);
  }
  return { cases: cases.length, problems };
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

/**
 * Every finding for one file: its code lines, size problems and warnings, long lines, shape
 * and layering. The scan and the self-test both call it, so a check dropped here fails the
 * self-test as well as going quiet in the scan.
 */
export function fileFindings(f, text, baselineFiles) {
  const problems = [];
  const warnings = [];
  const lines = codeLines(text, extname(f));
  const allowed = baselineFiles[f];
  if (allowed !== undefined) {
    if (lines > allowed) problems.push(`${f}: ${lines} code lines, above its baseline of ${allowed}; split it rather than raising the entry`);
  } else if (lines > FAIL) problems.push(`${f}: ${lines} code lines, above the ${FAIL}-line limit; split it into smaller modules`);
  else if (lines > WARN) warnings.push(`${f}: ${lines} code lines (warn above ${WARN})`);
  const long = longLineWarning(f, text);
  if (long) warnings.push(long);
  if (f.endsWith(".tsx")) {
    const s = shape(text);
    const over = Object.keys(SHAPE).filter((k) => s[k] > SHAPE[k]);
    if (over.length >= 2) warnings.push(`${f}: god-component signs: ${over.map((k) => `${k} ${s[k]} > ${SHAPE[k]}`).join(", ")}`);
  }
  if (/^(apps|packages)\//.test(f) && /\.[cm]?[jt]sx?$/.test(f)) problems.push(...layering(f, text));
  if (f.startsWith("crates/") && f.endsWith(".rs")) problems.push(...rustFindings(f, text));
  return { lines, long: long !== null, problems, warnings };
}

function baseBaseline() {
  const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "HEAD";
  try {
    return JSON.parse(git(["show", `${base}:${BASELINE}`])).files ?? {};
  } catch {
    return null; // no committed baseline yet: this change creates it
  }
}

const tested = selfTest();
const rust = rustSelfTest();
tested.problems.push(...rust.problems);
if (tested.problems.length) {
  console.error("size: self-test FAILED, so a quiet long-line or Rust rule result would mean nothing:");
  for (const p of tested.problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
if (process.argv.includes("--self-test")) {
  console.log(`size: self-test passed (${tested.cases} long-line cases, ${rust.cases} Rust rule cases)`);
  process.exit(0);
}

const listed = git(["ls-files", "-z", "--cached", "--others", "--exclude-standard"])
  .split("\0")
  .filter((f) => f && existsSync(resolve(ROOT, f)));
const files = listed.filter(measured);
const manifests = listed.filter((f) => /^crates\/[^/]+\/Cargo\.toml$/.test(f));
const baseline = existsSync(resolve(ROOT, BASELINE)) ? JSON.parse(read(BASELINE)) : { files: {} };
const problems = [];
const warnings = [];
const counts = new Map();
let longFiles = 0;

for (const f of files) {
  const found = fileFindings(f, read(f), baseline.files);
  counts.set(f, found.lines);
  if (found.long) longFiles++;
  problems.push(...found.problems);
  warnings.push(...found.warnings);
}
for (const f of manifests) problems.push(...crateManifest(f, read(f)));
problems.push(...fenceFindings(listed, read));
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
const sized = `${files.length} file(s) measured, none over ${FAIL} code lines outside the baseline (${Object.keys(baseline.files).length} entr(ies))`;
const found = `${warnings.length} warning(s); ${longFiles} file(s) with lines over ${LONG} characters`;
console.log(`size: ${sized}; ${found}; layering clean; ${manifests.length} crate manifest(s) take the workspace lints; D16 fence intact`);
