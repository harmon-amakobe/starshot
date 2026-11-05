#!/usr/bin/env node
/**
 * gen-credits.mjs: CREDITS.md's game asset sections, generated from the assets manifest.
 *
 * Writes the block between <!-- assets:start --> and <!-- assets:end --> in CREDITS.md
 * from apps/game/assets/manifest.json: one section per kind, one line per entry with its
 * title, attribution and licence. The in-game credits (PR37) read the same manifest, so
 * neither can drift from the other (D15). The manifest's own rules belong to
 * check-assets.mjs; this script only renders it.
 *
 * Usage:
 *   node scripts/gen-credits.mjs           rewrite the block
 *   node scripts/gen-credits.mjs --check   exit 1 when the block would change (the credits gate)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { KINDS, MANIFEST } from "./check-assets.mjs";
import { reason, runGate } from "./lib/gate-fail.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CREDITS = "CREDITS.md";
const START = "<!-- assets:start -->";
const END = "<!-- assets:end -->";
const HEADINGS = { texture: "Textures", image: "Images", audio: "Audio", font: "Fonts", data: "Data" };

/** The block, markers included, for a manifest. */
export function render(manifest) {
  const unknown = manifest.assets.filter((a) => !KINDS.includes(a.kind));
  if (unknown.length) throw new Error(`${unknown.map((a) => a.id).join(", ")}: unknown kind; node scripts/check-assets.mjs says what is wrong`);
  const lines = [START, `<!-- Generated from ${MANIFEST} by scripts/gen-credits.mjs. Edit the manifest, then run the script. -->`, ""];
  for (const kind of KINDS) {
    const entries = manifest.assets.filter((a) => a.kind === kind);
    if (!entries.length) continue;
    lines.push(`### ${HEADINGS[kind]}`, "");
    for (const a of entries) lines.push(`- ${a.title}: ${String(a.attribution).replace(/\.$/, "")}. Licence: ${a.licence}.`);
    lines.push("");
  }
  return [...lines, END].join("\n");
}

/** The text with its one marked block replaced. */
export function splice(text, block) {
  const a = text.indexOf(START);
  const b = text.indexOf(END);
  if (a < 0 || b < a || text.includes(START, a + 1) || text.includes(END, b + 1)) {
    throw new Error(`${CREDITS} needs exactly one ${START} followed by one ${END}`);
  }
  return text.slice(0, a) + block + text.slice(b + END.length);
}

/** What a run does with the file: nothing, fail (--check), or write. */
export const outcome = (current, next, check) => (next === current ? "same" : check ? "fail" : "write");

function selfTest() {
  const m = { assets: [
    { id: "f", kind: "font", title: "F", attribution: "IBM Corp.", licence: "OFL-1.1" },
    { id: "t", kind: "image", title: "T", attribution: "A", licence: "CC0-1.0" },
  ] };
  const doc = `# Credits\n\nhead\n\n${START}\nold\n${END}\n\ntail\n`;
  const once = splice(doc, render(m));
  const problems = [];
  if (splice(once, render(m)) !== once) problems.push("rendering twice changes the file");
  if (!once.startsWith("# Credits\n\nhead\n\n") || !once.endsWith(`${END}\n\ntail\n`)) problems.push("text outside the markers changed");
  if (!once.includes("- F: IBM Corp. Licence: OFL-1.1.") || once.indexOf("### Images") > once.indexOf("### Fonts")) problems.push("lines or kind order");
  const edited = once.replace("- T: A.", "- T: B.");
  if (splice(edited, render(m)) === edited) problems.push("a hand edit between the markers went unnoticed");
  if (outcome("a", "a", true) !== "same" || outcome("a", "b", true) !== "fail" || outcome("a", "b", false) !== "write") {
    problems.push("--check must fail, never write, when the block would change");
  }
  for (const bad of ["no markers", `${END}\n${START}`, `${START}\n${END}\n${START}\n${END}`]) {
    try {
      splice(bad, "");
      problems.push(`markers accepted in ${JSON.stringify(bad)}`);
    } catch {
      // expected
    }
  }
  return problems;
}

function main() {
  const check = process.argv.includes("--check");
  if (process.argv.length > 2 + Number(check)) {
    console.error("credits: unknown argument. Usage: node scripts/gen-credits.mjs [--check]");
    process.exit(2);
  }
  const problems = selfTest();
  if (problems.length) {
    console.error(`credits: self-test FAILED, so a clean result would mean nothing:\n  ✗ ${problems.join("\n  ✗ ")}`);
    process.exit(1);
  }
  let current;
  let next;
  try {
    const manifest = JSON.parse(readFileSync(resolve(ROOT, MANIFEST), "utf8"));
    current = readFileSync(resolve(ROOT, CREDITS), "utf8");
    next = splice(current, render(manifest));
  } catch (e) {
    console.error(`credits: FAILED, ${reason(e, ROOT)}; restore ${MANIFEST} and the asset markers in ${CREDITS}, then run node scripts/gen-credits.mjs`);
    process.exit(1);
  }
  const what = outcome(current, next, check);
  if (what === "same") return console.log(`credits: ${CREDITS} matches ${MANIFEST}`);
  if (what === "fail") {
    console.error(`credits: FAILED, ${CREDITS} between the asset markers differs from ${MANIFEST}; run node scripts/gen-credits.mjs and commit the result`);
    process.exit(1);
  }
  writeFileSync(resolve(ROOT, CREDITS), next);
  console.log(`credits: wrote the asset sections of ${CREDITS} from ${MANIFEST}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runGate("credits", ROOT, main, `restore ${MANIFEST} and the asset markers in ${CREDITS}, then run node scripts/gen-credits.mjs`);
}
