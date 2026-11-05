#!/usr/bin/env node
/**
 * check-assets.mjs: every shipped asset has a manifest entry (D14, D15).
 *
 * apps/game/assets/manifest.json (schema assets.manifest/1) records each asset's source,
 * licence, attribution and changes, and the SHA-256 of every file's bytes. This gate
 * fails when a file under apps/game/public/ is not listed exactly once, when a listed file
 * is missing or its bytes changed, or when a licence is outside the list below. A
 * non-commercial or no-derivatives licence fails, because others may reuse the game
 * commercially (D14). An AI-generated asset fails, because D15 needs a new decision for
 * one. sw.js, manifest.webmanifest and Markdown notes are code and docs, not assets.
 * CREDITS.md is generated from the same manifest (gen-credits.mjs), so the two agree.
 *
 * The game build also ships apps/prototype/public/observatory (observatory-assets.ts).
 * Those files keep their own assets-manifest.json: each must be listed there, none may
 * carry an NC or ND licence, and the folder's own verifier must pass on their hashes.
 *
 * Usage: node scripts/check-assets.mjs
 */
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { reason, runGate } from "./lib/gate-fail.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const MANIFEST = "apps/game/assets/manifest.json";
const NOT_ASSETS = [/^apps\/game\/public\/sw\.js$/, /^apps\/game\/public\/manifest\.webmanifest$/, /\.md$/i];
export const KINDS = ["texture", "image", "audio", "font", "data"];
const LICENCES = ["CC-BY-4.0", "CC0-1.0", "LicenseRef-NASA-Media", "LicenseRef-starshot-brand", "Apache-2.0", "OFL-1.1", "CC-BY-SA-4.0"];
const REPO_PATH = /^[\w@.+-]+(\/[\w@.+-]+)*$/;
const OBSERVATORY = "apps/prototype/public/observatory/";
const OBSERVATORY_VERIFY = "apps/prototype/tools/verify-assets.mjs";

/** Every problem with a manifest, given the public files and a path-to-hash lookup. */
export function validate(manifest, publicFiles, hashOf) {
  const problems = [];
  if (manifest?.schema !== "assets.manifest/1") problems.push('schema must be "assets.manifest/1"');
  if (!Array.isArray(manifest?.assets)) return [...problems, "assets must be an array"];
  const listed = new Map();
  const ids = new Set();
  for (const [k, a] of manifest.assets.entries()) {
    const id = typeof a?.id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(a.id) ? a.id : `assets[${k}]`;
    const p = (s) => problems.push(`${id}: ${s}`);
    if (id === `assets[${k}]`) p("id must be a lowercase slug");
    else if (ids.has(id)) p("id is used twice");
    ids.add(id);
    if (!KINDS.includes(a?.kind)) p(`kind must be one of ${KINDS.join(", ")}`);
    for (const f of ["title", "attribution", "modifications"]) if (typeof a?.[f] !== "string" || !a[f].trim()) p(`${f} is missing`);
    const s = a?.source;
    if (s?.kind === "url") {
      if (!/^https:\/\/\S+$/.test(s.url ?? "")) p("source.url must be an https URL");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s.retrieved ?? "")) p("source.retrieved must be a YYYY-MM-DD date");
      if (!/^[0-9a-f]{64}$/.test(s.sha256 ?? "")) p("source.sha256 must be the SHA-256 of the download, in 64 lowercase hex digits");
    } else if (s?.kind !== "original") p('source must be { "kind": "original" } or { "kind": "url", "url", "retrieved", "sha256" }');
    const licence = String(a?.licence ?? "");
    if (/-N[CD](?=-|$)/i.test(licence)) p(`${licence} is a non-commercial or no-derivatives licence; others may reuse the game commercially (D14, D15)`);
    else if (!LICENCES.includes(licence)) p(`licence ${licence || "(missing)"} is not one of ${LICENCES.join(", ")}`);
    else if (licence === "CC-BY-SA-4.0" && a.separateDataFile !== true) {
      p("CC-BY-SA-4.0 is allowed only for a separately licensed data file (separateDataFile: true)");
    }
    if (a?.aiGenerated !== false) p(a?.aiGenerated === true ? "aiGenerated: true needs a new decision first (D15)" : "aiGenerated must be false");
    if (a?.separateDataFile !== undefined && typeof a.separateDataFile !== "boolean") p("separateDataFile must be true or false");
    // Optional tiers (PR26) are more file lists of the same shape, held to the same rules.
    const tiers = a?.tiers ?? {};
    if (typeof tiers !== "object" || Array.isArray(tiers)) p("tiers must map each tier name to a file list");
    if (!Array.isArray(a?.files) || !a.files.length) p("files must list at least one file");
    for (const [where, list] of [["files", a?.files ?? []], ...Object.entries(typeof tiers === "object" ? tiers : {}).map(([t, l]) => [`tiers.${t}`, l])]) {
      if (!Array.isArray(list)) {
        p(`${where} must be a list`);
        continue;
      }
      for (const f of list) {
        const path = f?.path;
        if (typeof path !== "string" || !REPO_PATH.test(path) || path.split("/").some((seg) => seg === "." || seg === "..")) {
          p(`${where}: ${JSON.stringify(path)} is not a repository path`);
          continue;
        }
        if (listed.has(path)) p(`${path} is listed twice (also under ${listed.get(path)})`);
        listed.set(path, id);
        const actual = hashOf(path);
        if (actual === null) p(`${path} does not exist`);
        else if (f.sha256 !== actual) p(`${path}: the manifest says sha256 ${f.sha256 ?? "(missing)"}, the file's bytes hash to ${actual}`);
      }
    }
  }
  for (const f of publicFiles) {
    if (!NOT_ASSETS.some((re) => re.test(f)) && !listed.has(f)) {
      problems.push(`${f}: no entry in ${MANIFEST} (source, licence, attribution and hash; D15)`);
    }
  }
  return problems;
}

/** The observatory files the game ships: listed in their own manifest, open licences, verified. */
export function observatoryProblems(files, manifest, verifier) {
  const listed = new Set(manifest.assets.map((a) => a.file));
  const problems = files
    .filter((f) => f !== "assets-manifest.json" && !listed.has(f))
    .map((f) => `${OBSERVATORY}${f}: no entry in its assets-manifest.json (D15)`);
  for (const a of manifest.assets) {
    if (/-N[CD](?=-|$)/i.test(a.licence ?? "")) {
      problems.push(`${OBSERVATORY}${a.file}: ${a.licence} is a non-commercial or no-derivatives licence (D14)`);
    }
  }
  if (verifier.status !== 0) problems.push(`${OBSERVATORY_VERIFY} failed: ${verifier.why}`);
  return problems;
}

function selfTest() {
  const problems = [];
  const obs = (files, licence, status = 0) => observatoryProblems(files, { assets: [{ file: "a.jpg", licence }] }, { status, why: "a.jpg hash" });
  if (obs(["a.jpg", "assets-manifest.json"], "CC-BY-4.0").length) problems.push("a listed observatory file should pass");
  const unlisted = obs(["a.jpg", "b.jpg"], "CC-BY-4.0").some((x) => x.endsWith("b.jpg: no entry in its assets-manifest.json (D15)"));
  if (!unlisted || !obs(["a.jpg"], "CC-BY-4.0", 1).length || !obs(["a.jpg"], "CC-BY-NC-4.0").length) {
    problems.push("an unlisted observatory file, a failed verifier and an NC licence should each fail");
  }
  const H = "a".repeat(64);
  const files = { "apps/game/public/a.png": H, "apps/game/public/sw.js": H, "apps/game/public/manifest.webmanifest": H, "apps/game/public/brand/README.md": H };
  const entry = (over) => ({
    id: "a", kind: "image", title: "A", files: [{ path: "apps/game/public/a.png", sha256: H }], source: { kind: "original" },
    licence: "CC-BY-4.0", attribution: "X", modifications: "None", aiGenerated: false, ...over,
  });
  const run = (assets, list = ["apps/game/public/a.png"]) => validate({ schema: "assets.manifest/1", assets }, list, (path) => files[path] ?? null);
  if (run([entry({})], Object.keys(files)).length) problems.push("a valid entry, sw.js, manifest.webmanifest and a Markdown note should pass");
  if (run([entry({ licence: "CC-BY-SA-4.0", separateDataFile: true, kind: "data" })]).length) {
    problems.push("CC-BY-SA-4.0 with separateDataFile: true should pass");
  }
  const cases = [
    [[entry({ licence: "CC-BY-NC-4.0" })], "non-commercial"], [[entry({ licence: "CC-BY-ND-4.0" })], "no-derivatives"],
    [[entry({ licence: "GPL-3.0" })], "is not one of"], [[entry({ licence: "CC-BY-SA-4.0" })], "separateDataFile: true"],
    [[entry({ aiGenerated: true })], "new decision"], [[entry({ aiGenerated: undefined })], "aiGenerated must be false"],
    [[entry({ files: [{ path: "apps/game/public/a.png", sha256: "b".repeat(64) }] })], "hash to"],
    [[entry({ files: [{ path: "apps/game/public/gone.png", sha256: H }] })], "does not exist"],
    [[entry({}), entry({ id: "b" })], "listed twice"], [[entry({ tiers: { "4k": [{ path: "apps/game/public/a.png", sha256: H }] } })], "listed twice"],
    [[entry({ source: { kind: "url", url: "http://example.com/a", retrieved: "2026", sha256: "z" } })], "https URL"],
    [[entry({ files: [{ path: "../a.png", sha256: H }] })], "not a repository path"],
  ];
  for (const [assets, text] of cases) if (!run(assets).some((x) => x.includes(text))) problems.push(`expected a failure naming "${text}"`);
  const unlistedPublic = run([entry({})], ["apps/game/public/a.png", "apps/game/public/b.ogg"]);
  if (!unlistedPublic.some((x) => x.startsWith("apps/game/public/b.ogg: no entry"))) problems.push("an unlisted public file should fail");
  return problems;
}

function hashOf(path) {
  const abs = resolve(ROOT, path);
  if (!existsSync(abs) || !statSync(abs).isFile()) return null;
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

const json = (rel) => {
  if (!existsSync(resolve(ROOT, rel))) throw new Error(`${rel} is missing`);
  try {
    return JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));
  } catch (e) {
    throw new Error(`${rel} is not valid JSON (${e.message})`);
  }
};
const tracked = (dir) => {
  const args = ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", dir];
  const out = execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return out.split("\0").filter((f) => f && existsSync(resolve(ROOT, f)));
};

// gen-credits.mjs imports the manifest's path and kinds, so the check runs only as a script.
function main() {
  const problems = selfTest();
  if (problems.length) {
    console.error(`assets: self-test FAILED, so a clean result would mean nothing:\n  ✗ ${problems.join("\n  ✗ ")}`);
    process.exit(1);
  }
  const manifest = json(MANIFEST);
  const publicFiles = tracked("apps/game/public");
  const observatory = tracked(OBSERVATORY).map((f) => f.slice(OBSERVATORY.length));
  const v = spawnSync(process.execPath, [OBSERVATORY_VERIFY], { cwd: ROOT, encoding: "utf8" });
  const assertion = /(?:AssertionError \[ERR_ASSERTION\]|Error): ([^\n]*)/.exec(v.stderr ?? "")?.[1];
  const why = reason({ message: assertion ?? v.error?.message ?? `exit ${v.status}` }, ROOT);
  const observatoryManifest = json(`${OBSERVATORY}assets-manifest.json`);
  const found = [...validate(manifest, publicFiles, hashOf), ...observatoryProblems(observatory, observatoryManifest, { status: v.status, why })];
  if (found.length) {
    console.error(`assets: FAILED, ${found.length} problem(s) with shipped assets:`);
    for (const p of found) console.error(`  ✗ ${p}`);
    console.error("Each asset needs an entry with its source, licence, attribution and the sha256 of each file; see CONTRIBUTING.md, Adding an asset.");
    process.exit(1);
  }
  const count = manifest.assets.reduce((n, a) => n + a.files.length + Object.values(a.tiers ?? {}).flat().length, 0);
  const shipped = observatory.filter((f) => f !== "assets-manifest.json").length;
  console.log(`assets: ${manifest.assets.length} entr(ies), ${count} file(s) hashed; ${publicFiles.length} file(s) under apps/game/public, `
    + `every asset among them listed once; ${shipped} observatory file(s) listed in their manifest and verified`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runGate("assets", ROOT, main, "restore the manifests and the files they name; see CONTRIBUTING.md, Adding an asset");
}
