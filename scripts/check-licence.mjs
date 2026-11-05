#!/usr/bin/env node
/**
 * check-licence.mjs: every file has a licence record, and the records agree (D12).
 *
 * Fails when a tracked file matches no [[annotations]] path in REUSE.toml, when a licence
 * named there has no text in LICENSES/ (or a text there is never named), when LICENSE is
 * not the Apache-2.0 text, or when a package.json declares another licence. Shipped media
 * are check-assets.mjs's rule (D15), one gate per rule. An in-file SPDX
 * header that disagrees with REUSE.toml is a warning: the header wins under REUSE's default
 * precedence, so it is a record to fix, not a file without one.
 *
 * Usage: node scripts/check-licence.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(resolve(ROOT, rel), "utf8");
const [problems, warnings] = [[], []];

// The TOML subset REUSE.toml uses: [[annotations]] tables of strings and string arrays.
function parseReuse(text) {
  const tables = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("version")) continue;
    if (t === "[[annotations]]") tables.push({});
    else {
      const m = /^([\w-]+)\s*=\s*(.+)$/.exec(t);
      if (!m || !tables.length) throw new Error(`REUSE.toml: unreadable line: ${t}`);
      tables.at(-1)[m[1]] = JSON.parse(m[2]);
    }
  }
  return tables.map((a) => ({ ...a, path: [a.path].flat(), re: [a.path].flat().map(globToRe) }));
}
function globToRe(glob) {
  const body = glob.split(/(\*\*\/|\*\*|\*)/).map((p) => (p === "**/" ? "(?:.*/)?" : p === "**" ? ".*" : p === "*" ? "[^/]*" : p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")));
  return new RegExp(`^${body.join("")}$`);
}

const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" })
  .split("\0")
  .filter((f) => f && existsSync(resolve(ROOT, f)) && statSync(resolve(ROOT, f)).size > 0);

let annotations = [];
try {
  annotations = parseReuse(read("REUSE.toml"));
} catch (e) {
  problems.push(`REUSE.toml: ${e.message}`);
}
const licenceFiles = existsSync(resolve(ROOT, "LICENSES")) ? readdirSync(resolve(ROOT, "LICENSES")).map((f) => f.replace(/\.txt$/, "")) : [];
const named = new Set(annotations.map((a) => a["SPDX-License-Identifier"]));
for (const id of named) if (!licenceFiles.includes(id)) problems.push(`REUSE.toml names ${id}, but LICENSES/${id}.txt is missing`);
for (const id of licenceFiles) if (!named.has(id)) problems.push(`LICENSES/${id}.txt is never named in REUSE.toml; remove it or label the files it covers`);

// REUSE's own exclusions: licence texts, root licence files, REUSE.toml itself.
const excluded = (f) => f.startsWith("LICENSES/") || f === "REUSE.toml" || /^(LICENSE|LICENCE|COPYING)([.-][^/]*)?$/.test(basename(f));
let covered = 0;
for (const f of files.filter((x) => !excluded(x))) {
  const hit = annotations.findLast((a) => a.re.some((re) => re.test(f)));
  if (!hit) {
    problems.push(`${f}: no [[annotations]] path in REUSE.toml covers it`);
    continue;
  }
  covered++;
  if (hit["SPDX-License-Identifier"].startsWith("LicenseRef-astlo") || !/\.(py|[cm]?[jt]sx?|rs|sh|css|toml|ya?ml)$/.test(f)) continue;
  const header = /SPDX-License-Identifier:\s*([\w.+-]+)/.exec(read(f).split("\n").slice(0, 20).join("\n"));
  if (header && header[1] !== hit["SPDX-License-Identifier"]) warnings.push(`${f}: header says ${header[1]}, REUSE.toml says ${hit["SPDX-License-Identifier"]}`);
}

const licence = existsSync(resolve(ROOT, "LICENSE")) ? read("LICENSE") : "";
const head = licence.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 2).join(" | ");
if (head !== "Apache License | Version 2.0, January 2004") problems.push(`LICENSE does not open with the Apache-2.0 text (found "${head.slice(0, 60)}"); D12`);
else if (existsSync(resolve(ROOT, "LICENSES/Apache-2.0.txt")) && read("LICENSES/Apache-2.0.txt") !== licence) problems.push("LICENSE and LICENSES/Apache-2.0.txt differ; both hold the published text unchanged");

const manifests = files.filter((f) => basename(f) === "package.json" && !f.startsWith("third_party/") && !f.includes("/fixtures/"));
for (const f of manifests) {
  const declared = JSON.parse(read(f)).license;
  if (declared !== "Apache-2.0") problems.push(`${f}: "license" is ${JSON.stringify(declared)}, not "Apache-2.0" (D12)`);
}

for (const w of warnings) console.log(`  ! ${w}`);
if (covered === 0) problems.push("zero files checked; the file listing is broken, so a pass would be vacuous");
if (problems.length) {
  console.error(`licence: FAILED, ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error("Fix the record, not the check: label new paths in REUSE.toml and keep LICENSE as published (D12).");
  process.exit(1);
}
console.log(`licence: ${covered} file(s) covered by ${annotations.length} REUSE.toml annotation(s); ${licenceFiles.length} licence text(s); `
  + `${manifests.length} package.json Apache-2.0; ${warnings.length} header warning(s)`);
