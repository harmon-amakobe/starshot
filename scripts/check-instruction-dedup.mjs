#!/usr/bin/env node
/**
 * check-instruction-dedup.mjs: adapter instruction files point at AGENTS.md; they never
 * restate it.
 *
 * Every agent surface loads its adapter on top of AGENTS.md, so a rule present in both
 * is paid for twice per session and drifts the moment one copy is edited. On GitHub.com
 * copilot-instructions.md outranks AGENTS.md, so a stale restatement can silently win a
 * conflict with the canonical rule. This check cuts AGENTS.md into 12-word runs and
 * fails any adapter that contains one.
 *
 * Code spans, fenced blocks, URLs, link targets, frontmatter and HTML comments are cut
 * out before comparing, so shared paths and commands never manufacture a match; only
 * genuine prose overlap can reach twelve words. Adapters under .github/instructions are
 * discovered rather than listed, so a new one is covered the day it appears.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "AGENTS.md";
const RUN = 12;
const NAMED = ["CLAUDE.md", ".github/copilot-instructions.md", ".agents/AGENTS.md", "GEMINI.md"];
const SCOPED_DIR = ".github/instructions";
const BREAK = "\u0001";

function adapters() {
  const scoped = existsSync(resolve(ROOT, SCOPED_DIR))
    ? readdirSync(resolve(ROOT, SCOPED_DIR)).filter((n) => n.endsWith(".instructions.md")).map((n) => `${SCOPED_DIR}/${n}`)
    : [];
  return [...NAMED, ...scoped.sort()];
}

function segments(text) {
  let s = text;
  s = s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, BREAK);
  s = s.replace(/<!--[\s\S]*?-->/g, BREAK);
  s = s.replace(/```[\s\S]*?```/g, BREAK);
  s = s.replace(/`[^`\n]*`/g, BREAK);
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  s = s.replace(/https?:\/\/\S+/g, BREAK);
  s = s.replace(/(^|\s)[\w.-]*\/[\w./*-]+/g, `$1${BREAK}`); // bare paths
  s = s.replace(/^\s*[|#>-]/gm, (m) => m.replace(/[|#>-]/, " "));
  s = s.toLowerCase().replace(new RegExp(`[^a-z0-9${BREAK}]+`, "g"), " ");
  return s.split(BREAK).map((seg) => seg.split(" ").filter(Boolean)).filter((w) => w.length >= RUN);
}

function runs(text) {
  const out = new Set();
  for (const words of segments(text)) {
    for (let i = 0; i + RUN <= words.length; i++) out.add(words.slice(i, i + RUN).join(" "));
  }
  return out;
}

/** Overlapping matches merged into the passage they belong to. */
function passages(text, source) {
  const found = [];
  for (const words of segments(text)) {
    let start = -1;
    for (let i = 0; i <= words.length - RUN + 1; i++) {
      const hit = i + RUN <= words.length && source.has(words.slice(i, i + RUN).join(" "));
      if (hit && start === -1) start = i;
      if (!hit && start !== -1) {
        found.push(words.slice(start, i - 1 + RUN).join(" "));
        start = -1;
      }
    }
  }
  return found;
}

const srcPath = resolve(ROOT, SOURCE);
if (!existsSync(srcPath)) {
  console.error(`instruction-dedup: FAILED, ${SOURCE} is missing, so there is nothing to compare against.`);
  process.exit(1);
}
const source = runs(readFileSync(srcPath, "utf8"));
if (source.size === 0) {
  console.error(`instruction-dedup: FAILED, ${SOURCE} produced no ${RUN}-word runs; normalization is broken.`);
  process.exit(1);
}

const present = adapters().filter((a) => existsSync(resolve(ROOT, a)));
if (present.length === 0) {
  console.error("instruction-dedup: FAILED, no adapter file exists, so the check would pass vacuously.");
  process.exit(1);
}

const findings = [];
for (const rel of present) {
  for (const p of passages(readFileSync(resolve(ROOT, rel), "utf8"), source)) findings.push({ rel, p });
}
if (findings.length) {
  console.error(`instruction-dedup: FAILED, ${findings.length} passage(s) restated from ${SOURCE}:`);
  for (const { rel, p } of findings) console.error(`  ✗ ${rel}: "${p}"`);
  console.error(`Adapters carry only what is specific to their surface. Delete the restatement and point at ${SOURCE}.`);
  process.exit(1);
}
console.log(`instruction-dedup: ${present.length} adapter(s) clean against ${source.size} ${RUN}-word runs of ${SOURCE} (${present.join(", ")})`);
