#!/usr/bin/env node
/**
 * check-third-party-untouched.mjs: third_party/astlo must stay byte-identical to the
 * upstream originals recorded in third_party/astlo.sha256.
 *
 * Mark Macharia's astlo is "All rights reserved" (D2): it is never modified, copied into
 * our packages, or relicensed here. The edit-tool guard (guard-protected-paths) stops the
 * common path; this check is the backstop that also sees shell rewrites, line-ending
 * churn from a misconfigured editor, added files and deletions.
 *
 * The manifest uses `sha256sum` format, so `sha256sum -c third_party/astlo.sha256` from
 * the repo root verifies it without node. `--write` regenerates it and exists for one
 * situation only: a deliberate upstream sync performed through the astlo-upstream skill.
 *
 * Usage: node scripts/check-third-party-untouched.mjs [--write]
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = "third_party/astlo";
const MANIFEST = "third_party/astlo.sha256";
const D2 =
  "third_party/astlo is Mark Macharia's all-rights-reserved code (D2): never modified, copied or relicensed here.";

function files() {
  try {
    const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", DIR], { cwd: ROOT, encoding: "utf8" });
    const listed = out.split("\0").filter(Boolean);
    // A file deleted from disk is still in the index; keep it so the deletion is reported.
    return [...new Set(listed)].sort();
  } catch {
    const out = [];
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name !== ".DS_Store") out.push(relative(ROOT, p).replace(/\\/g, "/"));
      }
    };
    if (existsSync(resolve(ROOT, DIR))) walk(resolve(ROOT, DIR));
    return out.sort();
  }
}

const hashFile = (rel) => createHash("sha256").update(readFileSync(resolve(ROOT, rel))).digest("hex");

if (!existsSync(resolve(ROOT, DIR))) {
  console.error(`third-party: FAILED, ${DIR} is missing. ${D2} Restore it with: git restore --source=HEAD -- ${DIR}`);
  process.exit(1);
}

if (process.argv.includes("--write")) {
  const list = files().filter((f) => existsSync(resolve(ROOT, f)));
  writeFileSync(resolve(ROOT, MANIFEST), list.map((f) => `${hashFile(f)}  ${f}\n`).join(""));
  console.log(`third-party: wrote ${MANIFEST} for ${list.length} file(s). Commit it in the same change as the upstream sync, and nothing else in ${DIR}.`);
  process.exit(0);
}

if (!existsSync(resolve(ROOT, MANIFEST))) {
  console.error(`third-party: FAILED, ${MANIFEST} is missing, so nothing pins ${DIR}. ${D2}`);
  process.exit(1);
}

const expected = new Map();
for (const line of readFileSync(resolve(ROOT, MANIFEST), "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
  if (!m) {
    console.error(`third-party: FAILED, unreadable manifest line: ${line.slice(0, 80)}`);
    process.exit(1);
  }
  expected.set(m[2], m[1]);
}
if (expected.size === 0) {
  console.error(`third-party: FAILED, ${MANIFEST} lists no files, so the check would pass vacuously.`);
  process.exit(1);
}

const problems = [];
const present = files();
for (const [file, hash] of expected) {
  if (!existsSync(resolve(ROOT, file))) problems.push(`missing: ${file}`);
  else if (hashFile(file) !== hash) problems.push(`modified: ${file}`);
}
for (const file of present) {
  if (!expected.has(file) && existsSync(resolve(ROOT, file))) problems.push(`added: ${file}`);
}

if (problems.length) {
  console.error(`third-party: FAILED, ${problems.length} difference(s) from ${MANIFEST}:`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(`${D2}`);
  console.error(`Undo an accidental change with: git restore --source=HEAD -- ${DIR}`);
  console.error("A deliberate upstream sync follows .claude/skills/astlo-upstream/SKILL.md, which re-hashes with --write.");
  process.exit(1);
}
console.log(`third-party: ${expected.size} file(s) in ${DIR} match ${MANIFEST}`);
