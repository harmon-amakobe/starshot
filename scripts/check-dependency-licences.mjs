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
 * package needs fails too, and so does a copyleft id in `allowed`.
 *
 * With --cargo it checks the crates instead (the rust-licences gate, PR6): it reads
 * `cargo metadata --locked`, skips the workspace's own crates and judges every other
 * package the same way. A Cargo exception carries "ecosystem": "cargo"; any ecosystem but
 * npm and cargo fails. Each mode uses and reports only its own exceptions. Without cargo
 * the registry skips or fails rust-licences like the other Rust gates, so the npm gate
 * stays fast and never starts cargo.
 *
 * Usage: node scripts/check-dependency-licences.mjs [--cargo]
 */
import { execFileSync } from "node:child_process";
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

/**
 * Problems and a licence tally for a parsed lockfile and allow-list. Only the exceptions of
 * `ecosystem` apply, so each part reports its own unused ones; exceptions name npm by default.
 */
export function evaluate(lock, allow, ecosystem = "npm") {
  const problems = [];
  const allowed = new Set(allow.allowed ?? []);
  for (const id of allowed) {
    if (COPYLEFT.test(id)) {
      problems.push(`${ALLOW}: allowed holds ${id}, a copyleft or share-alike licence; make the package an exception instead`);
    }
  }
  for (const x of allow.exceptions ?? []) {
    if (!["npm", "cargo"].includes(x.ecosystem ?? "npm")) problems.push(`${ALLOW}: ${x.package} names ecosystem ${x.ecosystem}; use npm or cargo`);
  }
  const exceptions = (allow.exceptions ?? []).filter((x) => (x.ecosystem ?? "npm") === ecosystem).map((x) => ({ ...x, used: false }));
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
        + `licence (NOASSERTION when it declares none) and a reason${ecosystem === "npm" ? "" : ` (with "ecosystem": "${ecosystem}")`}, or drop the package`);
    }
  }
  for (const x of exceptions) {
    if (!x.used) problems.push(`${ALLOW}: the exception for ${x.package}@${x.version} (${x.licence}) matches no package that needs it; remove it`);
  }
  if (checked === 0) problems.push(`${ecosystem === "npm" ? "package-lock.json" : "cargo metadata"} lists no dependency, so a pass would be vacuous`);
  return { problems, tally, checked, excepted: exceptions.filter((x) => x.used).length };
}

/**
 * The Cargo part: `cargo metadata` in the lockfile's shape, without the workspace's own
 * crates, through the same evaluator. An old "MIT/Apache-2.0" licence field means OR.
 */
export function evaluateCargo(meta, allow) {
  const members = new Set(meta.workspace_members ?? []);
  const packages = (meta.packages ?? []).filter((p) => !members.has(p.id)).map((p) => [
    p.id.replace(/^path\+file:\/\/[^#]*/, "path"), // no machine path in the output
    { name: p.name, version: p.version, license: p.license?.replace(/\s*\/\s*/g, " OR ") },
  ]);
  return evaluate({ packages: Object.fromEntries(packages) }, allow, "cargo");
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
  const meta = { workspace_members: ["w"], packages: [
    { id: "w", name: "w", version: "0.0.0", license: "GPL-3.0" }, { id: "a", name: "a", version: "1.0.0", license: "MIT/Apache-2.0" },
    { id: "b", name: "b", version: "1.0.0", license: null }, { id: "x", name: "x", version: "1.0.0", license: "MPL-2.0" },
  ] };
  const c = evaluateCargo(meta, { allowed: ["MIT"], exceptions: [
    { ecosystem: "cargo", package: "x", version: "1.0.0", licence: "MPL-2.0", reason: "r" },
    { package: "b", version: "1.0.0", licence: "NOASSERTION", reason: "r" },
  ] });
  if (c.checked !== 3 || c.excepted !== 1 || c.problems.length !== 1 || !c.problems[0].startsWith("b@1.0.0")) {
    problems.push(`evaluateCargo: member skip, slash as OR, or an exception kept to its ecosystem (${c.problems.join(" | ")})`);
  }
  const odd = evaluate({ packages: { "node_modules/m": { version: "1.0.0", license: "MIT" } } }, { allowed: ["MIT"], exceptions: [
    { ecosystem: "pip", package: "p", version: "1.0.0", licence: "MIT", reason: "r" },
  ] });
  if (!odd.problems.some((p) => p.includes("names ecosystem pip"))) problems.push("evaluate: an exception for an ecosystem but npm or cargo must fail");
  return problems;
}

function main(cargo) {
  const gate = cargo ? "rust-licences" : "dependency-licences";
  const problems = selfTest();
  if (problems.length) {
    console.error(`${gate}: self-test FAILED, so a clean result would mean nothing:\n  ✗ ${problems.join("\n  ✗ ")}`);
    process.exit(1);
  }
  const allow = json(ALLOW);
  const result = cargo
    ? evaluateCargo(JSON.parse(execFileSync("cargo", ["metadata", "--format-version", "1", "--locked"], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32",
    })), allow)
    : evaluate(json("package-lock.json"), allow);
  const tally = [...result.tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([l, n]) => `${l} ${n}`).join(", ");
  if (result.problems.length) {
    console.error(`${gate}: FAILED, ${result.problems.length} problem(s):`);
    for (const p of result.problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log(`${gate}: ${result.checked} locked ${cargo ? "crate" : "package"}(s) pass, ${result.excepted} by exception; licences: ${tally}`);
}

// Imported for its evaluator, it runs nothing; run as a script, it is the gate.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cargo = process.argv.includes("--cargo");
  const fix = cargo ? "restore Cargo.lock (cargo update --workspace) and install Rust with rustup" : "restore package-lock.json with npm install";
  runGate(cargo ? "rust-licences" : "dependency-licences", ROOT, () => main(cargo), `${fix}, and keep ${ALLOW} valid JSON with allowed and exceptions`);
}
