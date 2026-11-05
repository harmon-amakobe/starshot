#!/usr/bin/env node
/**
 * The gate registry and runner: Starshot's Definition of Done, in one place.
 *
 *   node scripts/gates.mjs                  every gate (what CI runs, via npm run gates)
 *   node scripts/gates.mjs --fast           the cheap static subset (the Stop hook runs this)
 *   node scripts/gates.mjs --group code     one or more groups, comma-separated
 *   node scripts/gates.mjs --only test,build
 *   node scripts/gates.mjs --list
 *   add --verbose to print every gate's full output
 *
 * Rules the registry keeps (AGENTS.md "Definition of Done"; GATE_COMMANDS in .claude/README.md):
 *  - Every obligation that can be a script is one, registered here. A check that exists
 *    but is not registered is a gate everyone believes is running; check-guard-scan-
 *    coverage fails on that.
 *  - `fast` is a filter flag on an entry, never a second list, so nothing drifts between
 *    two places.
 *  - Exit 0 only when every selected gate passed or skipped. The last line names what
 *    failed as "failing: a, b", which is what the Stop hook reads.
 *  - A Rust gate (needsCargo) without cargo reports skip, so a contributor without Rust
 *    is not blocked; STARSHOT_REQUIRE_RUST=1 turns that into a failure, and CI sets it.
 *    A skip is never counted as a pass: the last line reads "P/N passed, S skipped".
 *  - In GitHub Actions, a failed gate is also an ::error annotation and every run appends
 *    a table to the job summary, so a red check names its gate without opening the log.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NODE = process.execPath;

/** cargo test prints one result line per suite; the summary adds them up. */
function cargoTests(output) {
  const suites = [...output.matchAll(/^test result: ok\. (\d+) passed/gm)];
  return `cargo test: ${suites.reduce((n, m) => n + Number(m[1]), 0)} passed in ${suites.length} suite(s)`;
}

/** id, group, fast, command, and the one-line reason it exists. */
export const GATES = [
  { id: "secrets", group: "hygiene", fast: true, cmd: [NODE, "scripts/check-secrets.mjs"], why: "public repo: no secrets, emails, personal paths or private names" },
  { id: "third-party", group: "hygiene", fast: true, cmd: [NODE, "scripts/check-third-party-untouched.mjs"], why: "third_party/astlo stays byte-identical (D2)" },
  { id: "licence", group: "hygiene", fast: true, cmd: [NODE, "scripts/check-licence.mjs"],
    why: "every file has a licence record; LICENSE is Apache-2.0 (D12)" },
  { id: "dependency-licences", group: "hygiene", fast: true, cmd: [NODE, "scripts/check-dependency-licences.mjs"],
    why: "every locked npm package has an allowed licence or a recorded exception (D28)" },
  { id: "assets", group: "hygiene", fast: true, cmd: [NODE, "scripts/check-assets.mjs"],
    why: "every shipped asset has a manifest entry: source, open licence, attribution, hash (D14, D15)" },
  { id: "credits", group: "hygiene", fast: true, cmd: [NODE, "scripts/gen-credits.mjs", "--check"],
    why: "CREDITS.md's game asset sections match the manifest (D15)" },
  { id: "copy", group: "hygiene", fast: true, cmd: [NODE, "scripts/check-copy-tells.mjs"], why: "the copy standard: no dashes, no AI tells, in prose, UI strings and commits (D27)" },
  { id: "commits", group: "hygiene", fast: true, cmd: [NODE, "scripts/check-commits.mjs"],
    why: "the branch's commit authors and messages carry no secret; a missing sign-off warns (D24)" },
  { id: "work", group: "hygiene", fast: true, cmd: [NODE, "scripts/sync-work.mjs", "--program", "v1-starshot", "--check"],
    why: "the program's work.yaml and its issue lock agree (D23)" },
  { id: "pr-size", group: "hygiene", fast: true, cmd: [NODE, "scripts/check-pr-size.mjs", "--self-test"],
    why: "the size check's cap, exclusions and member count; CI's pr-size job measures the PR (D30)" },
  { id: "size", group: "code", fast: true, cmd: [NODE, "scripts/check-file-size.mjs"], why: "no file over 500 code lines off the baseline; packages never import apps (D28)" },
  { id: "versions", group: "code", fast: false, cmd: [NODE, "scripts/check-versions.mjs"], why: "workspace versions, release notes and lock agree; negative release cases fail closed" },
  { id: "instruction-dedup", group: "agent-context", fast: true, cmd: [NODE, "scripts/check-instruction-dedup.mjs"], why: "adapters point at AGENTS.md, never restate it" },
  { id: "agent-frontmatter", group: "agent-context", fast: true, cmd: [NODE, "scripts/check-agent-frontmatter.mjs"], why: "agents and skills load, and the skills index is complete" },
  { id: "guard-scan-coverage", group: "agent-context", fast: true, cmd: [NODE, "scripts/check-guard-scan-coverage.mjs"], why: "no gate scans a path that moved; no check is unregistered" },
  { id: "hook-fixtures", group: "agent-context", fast: false, cmd: [NODE, "scripts/check-hook-fixtures.mjs"], why: "the hooks bite on what they must and pass what they must" },
  { id: "typecheck", group: "code", fast: false, cmd: ["npx", "tsc", "-b"], needsDeps: true, ok: "tsc -b: no type errors", why: "types agree across packages and the game" },
  { id: "test", group: "code", fast: false, cmd: ["npx", "vitest", "run"], needsDeps: true, summary: /^\s*Tests\s+.*$/m, why: "physics vs Horizons, levels' known solutions" },
  { id: "build", group: "code", fast: false, cmd: ["npm", "run", "build", "-w", "@starshot/game"], needsDeps: true, summary: /built in .*$/m, why: "the static site builds" },
  { id: "rust-fmt", group: "rust", fast: false, cmd: ["cargo", "fmt", "--all", "--check"], needsCargo: true, ok: "cargo fmt: every file formatted",
    fix: "run cargo fmt --all", why: "the Rust workspace is formatted (AC2)" },
  { id: "rust-clippy", group: "rust", fast: false, cmd: ["cargo", "clippy", "--workspace", "--all-targets", "--locked", "--", "-D", "warnings"],
    needsCargo: true, ok: "cargo clippy: no warnings", fix: "fix what cargo clippy reports",
    why: "no lint, and no f64 or f32 transcendental method in any crate (D16)" },
  { id: "rust-test", group: "rust", fast: false, cmd: ["cargo", "test", "--workspace", "--locked"], needsCargo: true, summary: cargoTests,
    fix: "run cargo test --workspace and fix the failing test", why: "the Rust tests pass, the maths golden bits included (AC2, AC6)" },
  { id: "rust-licences", group: "rust", fast: false, cmd: [NODE, "scripts/check-dependency-licences.mjs", "--cargo"], needsCargo: true,
    why: "every locked crate has an allowed licence or a recorded exception (D28)" },
];

function parseArgs(argv) {
  const opts = { fast: false, groups: null, only: null, list: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--fast") opts.fast = true;
    else if (a === "--list") opts.list = true;
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--group" || a === "--only") {
      const v = argv[++i];
      if (!v) throw new Error(`${a} needs a value`);
      opts[a === "--group" ? "groups" : "only"] = v.split(",").map((s) => s.trim()).filter(Boolean);
    } else throw new Error(`unknown argument ${a}`);
  }
  return opts;
}

function select(opts) {
  let list = GATES;
  if (opts.fast) list = list.filter((g) => g.fast);
  if (opts.groups) {
    const known = new Set(GATES.map((g) => g.group));
    for (const g of opts.groups) if (!known.has(g)) throw new Error(`unknown group ${g} (known: ${[...known].join(", ")})`);
    list = list.filter((g) => opts.groups.includes(g.group));
  }
  if (opts.only) {
    for (const id of opts.only) if (!GATES.some((g) => g.id === id)) throw new Error(`unknown gate ${id}`);
    list = list.filter((g) => opts.only.includes(g.id));
  }
  return list;
}

// GitHub's workflow-command escaping. % goes first, so the other escapes are not escaped
// again. A property such as the title also escapes the separators of the property list.
export const escapeData = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
export const escapeProperty = (s) => escapeData(s).replace(/:/g, "%3A").replace(/,/g, "%2C");
export const annotation = (id, summary) => `::error title=${escapeProperty(`gate ${id}`)}::${escapeData(summary)}`;

// A summary is one table row: a pipe or a line break inside it would end the cell or the
// row. Backslashes are doubled first, so one in the text cannot cancel a pipe's escape.
export const tableCell = (s) => String(s).replace(/\r\n|\r|\n/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|");

// A skipped gate has ok false and skipped true, so code that forgets skips fails closed.
export const verdict = (r) => (r.ok ? "pass" : r.skipped ? "skip" : "FAIL");
const failedIds = (results) => results.filter(({ r }) => verdict(r) === "FAIL").map(({ g }) => g.id);

/** "P/N passed", with ", S skipped" when any skipped: passes alone make P. */
export function tally(results) {
  const passed = results.filter(({ r }) => r.ok).length;
  const skipped = results.filter(({ r }) => verdict(r) === "skip").length;
  return `${passed}/${results.length} passed${skipped ? `, ${skipped} skipped` : ""}`;
}

/** The job-summary section for one run: a heading that names the selection, then the table. */
export function summaryMarkdown(results, label) {
  const failed = failedIds(results);
  const lines = [`### gates (${tableCell(label)}): ${tally(results)}${failed.length ? `, failing: ${failed.join(", ")}` : ""}`, ""];
  lines.push("| Gate | Group | Result | Time | Summary |", "|---|---|---|---:|---|");
  for (const { g, r } of results) {
    lines.push(`| ${g.id} | ${g.group} | ${verdict(r)} | ${r.ms} ms | ${tableCell(r.summary)} |`);
  }
  return `${lines.join("\n")}\n\n`;
}

function selectionLabel(opts) {
  const parts = [];
  if (opts.fast) parts.push("--fast");
  if (opts.groups) parts.push(`--group ${opts.groups.join(",")}`);
  if (opts.only) parts.push(`--only ${opts.only.join(",")}`);
  return parts.join(" ") || "every gate";
}

/** Annotations and the job summary. Neither changes the exit code: the gates decide that. */
function reportToActions(results, opts) {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  for (const { g, r } of results) if (verdict(r) === "FAIL") console.log(annotation(g.id, r.summary || "failed with no output"));
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  try {
    // Append: CI runs the registry twice in one job, and the second run must not erase the first.
    appendFileSync(file, summaryMarkdown(results, selectionLabel(opts)));
  } catch (e) {
    console.log(`::warning title=gates::${escapeData(`could not write the job summary: ${e.message}`)}`);
  }
}

const tail = (text, n) => text.trimEnd().split("\n").slice(-n).join("\n");
const lastLine = (text) => text.trimEnd().split("\n").filter((l) => l.trim()).at(-1)?.trim() ?? "";

let cargo;
/** Whether cargo starts, asked once a run. Through rustup it also installs the pinned toolchain. */
const cargoFound = () => (cargo ??= spawnSync("cargo", ["--version"], { cwd: ROOT, stdio: "ignore", shell: process.platform === "win32" }).status === 0);
export const CARGO_SKIP = "cargo not found; set STARSHOT_REQUIRE_RUST=1 to fail instead";
export const CARGO_REQUIRED = "cargo not found and STARSHOT_REQUIRE_RUST=1; install Rust with rustup, which reads rust-toolchain.toml";

/** A Rust gate's result when cargo is missing, or null when it runs. */
export function cargoMissing(gate, found, env) {
  if (!gate.needsCargo || found) return null;
  if (env.STARSHOT_REQUIRE_RUST === "1") return { ok: false, ms: 0, summary: CARGO_REQUIRED, output: "" };
  return { ok: false, skipped: true, ms: 0, summary: CARGO_SKIP, output: "" };
}

/** The skip rule checks itself before any gate runs: a broken rule would let a missing cargo read as a pass. */
export function selfTest() {
  const rust = { needsCargo: true };
  const skip = cargoMissing(rust, false, {});
  const required = cargoMissing(rust, false, { STARSHOT_REQUIRE_RUST: "1" });
  const runs = [{ g: { id: "a" }, r: { ok: true } }, { g: { id: "b" }, r: skip ?? { ok: true } }];
  const problems = [];
  if (!skip || verdict(skip) !== "skip") problems.push("a missing cargo must report skip");
  if (!required || verdict(required) !== "FAIL") problems.push("a missing cargo with STARSHOT_REQUIRE_RUST=1 must fail");
  if (cargoMissing(rust, true, {}) || cargoMissing({}, false, {})) problems.push("a gate must run when cargo is found or not needed");
  if (tally(runs) !== "1/2 passed, 1 skipped" || failedIds(runs).length) problems.push(`a skip must count apart (got "${tally(runs)}")`);
  // Every gate that runs cargo skips and counts like the others, and the fast subset (the
  // Stop hook) never starts cargo.
  for (const g of GATES) {
    const cargo = g.group === "rust" || g.cmd[0] === "cargo" || g.cmd.includes("--cargo");
    if (cargo && (!g.needsCargo || g.fast)) problems.push(`${g.id} runs cargo, so it needs needsCargo and no fast flag`);
  }
  if (!GATES.some((g) => g.id === "rust-licences" && g.cmd.includes("--cargo"))) problems.push("rust-licences must check the crates (--cargo)");
  return problems;
}

function run(gate, verbose) {
  const t0 = Date.now();
  if (gate.needsDeps && !existsSync(resolve(ROOT, "node_modules"))) {
    return { ok: false, ms: 0, summary: "node_modules is missing; run npm ci first", output: "" };
  }
  const missing = cargoMissing(gate, !gate.needsCargo || cargoFound(), process.env);
  if (missing) return missing;
  const [cmd, ...args] = gate.cmd;
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32" && cmd !== NODE,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    maxBuffer: 64 << 20,
    timeout: 15 * 60 * 1000,
  });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const ok = r.status === 0 && !r.error;
  let summary = r.error ? `could not start: ${r.error.message}` : lastLine(output);
  if (ok && gate.summary) summary = (typeof gate.summary === "function" ? gate.summary(output) : gate.summary.exec(output)?.[0].trim()) ?? summary;
  if (ok && gate.ok) summary = gate.ok;
  if (!ok) summary = output.split("\n").find((l) => /error|^Diff in /i.test(l))?.trim() ?? summary;
  // The summary is a public CI annotation: no machine path, and the fix stays in the cut.
  summary = summary.split(ROOT).join(".");
  if (!ok && gate.fix) summary = `${summary.slice(0, 136 - gate.fix.length)}; ${gate.fix}`;
  if (verbose && output.trim()) console.log(output.trimEnd());
  else if (!ok && output.trim()) console.log(tail(output, 40));
  return { ok, ms: Date.now() - t0, summary: summary.slice(0, 140), output };
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`gates: ${e.message}. Usage: node scripts/gates.mjs [--fast] [--group a,b] [--only id,id] [--list] [--verbose]`);
    process.exit(2);
  }
  if (opts.list) {
    for (const g of GATES) console.log(`${g.id.padEnd(20)} ${g.group.padEnd(14)} ${g.fast ? "fast" : "    "}  ${g.why}`);
    return;
  }
  const broken = selfTest();
  if (broken.length) {
    console.error(`gates: self-test FAILED: ${broken.join("; ")}; fix cargoMissing, verdict or tally, or the GATES entry it names, in scripts/gates.mjs`);
    process.exit(2);
  }
  let gates;
  try {
    gates = select(opts);
  } catch (e) {
    console.error(`gates: ${e.message}`);
    process.exit(2);
  }
  if (!gates.length) {
    console.error("gates: the selection matched no gate");
    process.exit(2);
  }
  const results = [];
  for (const g of gates) {
    console.log(`── ${g.id} (${g.group})`);
    const r = run(g, opts.verbose);
    console.log(`   ${verdict(r)}  ${r.summary}`);
    results.push({ g, r });
  }
  console.log("\ngate                 group          result  time");
  for (const { g, r } of results) {
    console.log(`${g.id.padEnd(20)} ${g.group.padEnd(14)} ${verdict(r).padEnd(7)} ${String(r.ms).padStart(6)} ms`);
  }
  reportToActions(results, opts);
  const failed = failedIds(results);
  const total = results.reduce((s, { r }) => s + r.ms, 0);
  if (failed.length) {
    console.log(`\ngates: ${tally(results)} in ${total} ms; failing: ${failed.join(", ")}`);
    process.exit(1);
  }
  console.log(`\ngates: ${tally(results)} in ${total} ms`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
