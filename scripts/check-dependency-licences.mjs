#!/usr/bin/env node
/**
 * check-dependency-licences.mjs: every locked dependency has an allowed licence (D12, D28).
 *
 * Reads the `packages` of package-lock.json, skips the workspace's own entries, and
 * evaluates each licence as an SPDX expression against `allowed` in
 * scripts/licence-allow.json. A missing or disallowed licence fails unless `exceptions`
 * names the package with its exact version and licence and a reason, so an upgrade or a
 * licence change gets reviewed again. A package that declares no licence is excepted as
 * NOASSERTION, with the licence its files show in the reason. An exception that no
 * package needs fails too, and so does a copyleft id in `allowed`. The Cargo part arrives
 * with the Rust workspace (PR6).
 *
 * Usage: node scripts/check-dependency-licences.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runGate } from "./lib/gate-fail.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOW = "scripts/licence-allow.json";
const json = (rel) => {
  if (!existsSync(resolve(ROOT, rel))) throw new Error(`${rel} is missing`);
  try {
    return JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));
  } catch (e) {
    throw new Error(`${rel} is not valid JSON (${e.message})`);
  }
};
// Strong and weak copyleft families, and share-alike terms. None belongs in `allowed`.
const COPYLEFT = /GPL|MPL|EPL|EUPL|CDDL|OSL|CPAL|SSPL|CECILL|ODbL|Sleepycat|-SA-|-SA$/i;
const OPERATORS = new Set(["(", ")", "AND", "OR", "WITH"]);

/**
 * Whether an SPDX expression passes: OR needs one side allowed, AND needs both, AND binds
 * tighter than OR, and brackets group. "X WITH Y" passes only when that whole phrase is
 * allowed, because an exception changes the licence's terms. Malformed text throws.
 */
export function satisfies(expr, allowed) {
  const t = expr.replace(/[()]/g, " $& ").trim().split(/\s+/).filter(Boolean);
  let i = 0;
  const fail = (why) => {
    throw new Error(`"${expr}" is not an SPDX expression: ${why}`);
  };
  const atom = () => {
    const tok = t[i++];
    if (tok === undefined) fail("it ends where a licence was expected");
    if (tok === "(") {
      const v = or();
      if (t[i++] !== ")") fail("a bracket is not closed");
      return v;
    }
    if (OPERATORS.has(tok)) fail(`${tok} where a licence was expected`);
    if (t[i] !== "WITH") return allowed.has(tok);
    const exception = t[i + 1];
    i += 2;
    if (!exception || OPERATORS.has(exception)) fail("WITH needs an exception id");
    return allowed.has(`${tok} WITH ${exception}`);
  };
  const and = () => {
    let v = atom();
    while (t[i] === "AND") {
      i++;
      const right = atom();
      v = v && right;
    }
    return v;
  };
  const or = () => {
    let v = and();
    while (t[i] === "OR") {
      i++;
      const right = and();
      v = v || right;
    }
    return v;
  };
  const v = or();
  if (i < t.length) fail(`${t[i]} is out of place`);
  return v;
}

/**
 * One expression from a lock entry, or null. Old packages give `license` as an object, or
 * `licenses` as an array. An array does not say whether it offers a choice or combines
 * terms, so it is read as AND: every licence in it must be allowed.
 */
export function normalise(entry) {
  const raw = entry.license ?? entry.licenses;
  const one = (x) => (typeof x === "string" && x.trim() ? x.trim() : typeof x?.type === "string" ? x.type : null);
  if (!Array.isArray(raw)) return one(raw);
  const ids = raw.map(one);
  if (!ids.length || !ids.every(Boolean)) return null;
  return ids.length === 1 ? ids[0] : ids.map((id) => `(${id})`).join(" AND ");
}

const globToRe = (glob) => new RegExp(`^${glob.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")}$`);

/** Problems and a licence tally for a parsed lockfile and allow-list. */
export function evaluate(lock, allow) {
  const problems = [];
  const allowed = new Set(allow.allowed ?? []);
  for (const id of allowed) {
    if (COPYLEFT.test(id)) {
      problems.push(`${ALLOW}: allowed holds ${id}, a copyleft or share-alike licence; make the package an exception instead`);
    }
  }
  const exceptions = (allow.exceptions ?? []).map((x) => ({ ...x, used: false }));
  for (const x of exceptions) {
    const complete = ["package", "version", "licence", "reason"].every((k) => typeof x[k] === "string" && x[k].trim());
    if (!complete) problems.push(`${ALLOW}: an exception needs package, version, licence and reason (${JSON.stringify(x.package)})`);
  }
  const ws = lock.packages?.[""]?.workspaces;
  const patterns = (Array.isArray(ws) ? ws : ws?.packages ?? []).map(globToRe);
  const isWorkspace = (key) => key === "" || patterns.some((re) => re.test(key));
  const tally = new Map();
  let checked = 0;
  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    if (isWorkspace(key) || (entry.link && isWorkspace(entry.resolved ?? ""))) continue;
    checked++;
    const name = entry.name ?? key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length);
    const licence = normalise(entry);
    const recorded = licence ?? "NOASSERTION";
    tally.set(recorded, (tally.get(recorded) ?? 0) + 1);
    let ok = false;
    let why = licence ? `${licence} does not pass the allow-list` : "it declares no licence";
    try {
      ok = licence !== null && satisfies(licence, allowed);
    } catch (e) {
      why = e.message;
    }
    if (ok) continue;
    const x = exceptions.find((e) => e.package === name && e.version === entry.version && e.licence === recorded);
    if (x) x.used = true;
    else {
      problems.push(`${name}@${entry.version} (${key}): ${why}; add an exception to ${ALLOW} with its version, `
        + "licence (NOASSERTION when it declares none) and a reason, or drop the package");
    }
  }
  for (const x of exceptions) {
    if (!x.used) problems.push(`${ALLOW}: the exception for ${x.package}@${x.version} (${x.licence}) matches no package that needs it; remove it`);
  }
  if (checked === 0) problems.push("package-lock.json lists no dependency, so a pass would be vacuous");
  return { problems, tally, checked, excepted: exceptions.filter((x) => x.used).length };
}

function selfTest() {
  const problems = [];
  const allowed = new Set(["MIT", "Apache-2.0"]);
  const cases = [["MIT", true], ["GPL-3.0", false], ["MIT OR GPL-3.0", true], ["MIT AND GPL-3.0", false], ["MIT AND Apache-2.0", true],
    ["(MIT OR GPL-3.0) AND Apache-2.0", true], ["(MIT AND GPL-3.0) OR MPL-2.0", false], ["GPL-3.0 OR MIT AND Apache-2.0", true],
    ["GPL-3.0 OR MIT AND MPL-2.0", false], ["GPL-3.0 AND MIT OR Apache-2.0", true], ["Apache-2.0 WITH LLVM-exception", false], ["((MIT))", true]];
  for (const [expr, want] of cases) if (satisfies(expr, allowed) !== want) problems.push(`${expr} should ${want ? "pass" : "fail"}`);
  for (const bad of ["", "MIT OR", "(MIT", "MIT)", "AND MIT", "MIT WITH", "MIT Apache-2.0"]) {
    try {
      satisfies(bad, allowed);
      problems.push(`"${bad}" should be rejected as malformed`);
    } catch {
      // expected
    }
  }
  const forms = [
    [{ license: { type: "MIT" } }, "MIT"],
    [{ licenses: [{ type: "MIT" }, { type: "GPL-2.0" }] }, "(MIT) AND (GPL-2.0)"],
    [{ licenses: ["ISC"] }, "ISC"],
    [{}, null],
    [{ license: [] }, null],
  ];
  for (const [entry, want] of forms) if (normalise(entry) !== want) problems.push(`normalise(${JSON.stringify(entry)}) should be ${want}`);
  const lock = { packages: {
    "": { workspaces: ["apps/*"] }, "apps/a": {}, "node_modules/a": { link: true, resolved: "apps/a" },
    "node_modules/x": { version: "1.0.0", license: "MPL-2.0" }, "node_modules/y": { version: "2.0.0" },
  } };
  const r = evaluate(lock, { allowed: ["MIT", "MPL-2.0"], exceptions: [{ package: "z", version: "1.0.0", licence: "MIT", reason: "r" }] });
  const has = (s) => r.problems.some((p) => p.includes(s));
  if (r.checked !== 2 || !has("allowed holds MPL-2.0") || !has("y@2.0.0") || !has("declares no licence") || !has("exception for z@1.0.0")) {
    problems.push(`evaluate: workspace skip, copyleft, missing licence or stale exception (${r.problems.join(" | ")})`);
  }
  const except = (version) => evaluate(lock, { allowed: ["MIT"], exceptions: [
    { package: "x", version, licence: "MPL-2.0", reason: "r" },
    { package: "y", version: "2.0.0", licence: "NOASSERTION", reason: "r" },
  ] });
  if (except("1.0.0").problems.length || !except("1.0.1").problems.some((p) => p.startsWith("x@1.0.0"))) {
    problems.push("evaluate: an exception passes only its exact package, version and licence");
  }
  return problems;
}

function main() {
  const problems = selfTest();
  if (problems.length) {
    console.error(`dependency-licences: self-test FAILED, so a clean result would mean nothing:\n  ✗ ${problems.join("\n  ✗ ")}`);
    process.exit(1);
  }
  const result = evaluate(json("package-lock.json"), json(ALLOW));
  const tally = [...result.tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([l, n]) => `${l} ${n}`).join(", ");
  if (result.problems.length) {
    console.error(`dependency-licences: FAILED, ${result.problems.length} problem(s):`);
    for (const p of result.problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log(`dependency-licences: ${result.checked} locked package(s) pass, ${result.excepted} by exception; licences: ${tally}`);
}

// Imported for its evaluator, it runs nothing; run as a script, it is the gate.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runGate("dependency-licences", ROOT, main, `restore package-lock.json with npm install, and keep ${ALLOW} valid JSON with allowed and exceptions`);
}
