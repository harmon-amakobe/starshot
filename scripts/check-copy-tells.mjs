#!/usr/bin/env node
/**
 * check-copy-tells.mjs: the copy standard as a gate (D27, docs/copy-standard.md).
 *
 * Reads the prose people see for the patterns in scripts/copy-tells.json: Markdown; UI
 * strings in apps/<app>/src through the TypeScript parser, so comments, identifiers and
 * `!` assertions are never read as prose; the YAML of issue forms, labels and work plans;
 * and text on stdin, which is how the copy-lint workflow checks issue, comment and pull
 * request bodies and the publish step checks commit messages. A `fail` finding exits 1;
 * a `warn` finding is printed and passes.
 *
 * Usage:
 *   node scripts/check-copy-tells.mjs                  the tree; with GITHUB_BASE_REF set
 *                                                      (a pull request in CI), that PR's commits too
 *   node scripts/check-copy-tells.mjs --commits <range>          commit messages only
 *   node scripts/check-copy-tells.mjs --stdin --kind pr|issue|comment|commit [--report <file>]
 *   node scripts/check-copy-tells.mjs --files <path>...           named files only
 *   add --quiet to print fail findings only
 * Exit codes: 0 clean, 1 a fail finding, 2 bad arguments, 3 the catalogue or the
 * self-test is broken.
 *
 * The self-test runs first: each rule must fire on scripts/fixtures/copy and nothing may
 * fire on the passing fixtures, so a clean result means the rules work, not that they
 * matched nothing. Without node_modules the UI strings are skipped locally and fail in CI.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compileRules, scanUnits, markdownUnits, commitUnits, yamlUnits, tsUnits } from "./lib/copy-scan.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOGUE = "scripts/copy-tells.json";
const FIXTURES = "scripts/fixtures/copy";
const STANDARD = "docs/copy-standard.md";
const MARKER = "<!-- starshot-copy-lint -->";
const STDIN_KINDS = ["pr", "issue", "comment", "commit"];
// Mark's files must not change (D2, D10); fixtures and lockfiles are data; the catalogue
// quotes every banned word by design.
const EXEMPT = [
  /^third_party\//,
  /^python\/astlo\/astlo\//,
  /^python\/astlo\/astlo-[^/]+\.dist-info\//,
  /(^|\/)fixtures\//,
  /(^|\/)(dist|node_modules)\//,
  /(^|\/)(package-lock\.json|[^/]*\.lock|work\.lock\.json)$/,
  /^scripts\/copy-tells\.json$/,
];
// The standard names the banned words to define them, so only the dash rules read it.
const DASHES_ONLY = new Map([["docs/copy-standard.md", new Set(["em-dash", "en-dash", "horizontal-bar"])]]);

const read = (rel) => readFileSync(resolve(ROOT, rel), "utf8");
const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });

function loadTs() {
  try {
    return createRequire(import.meta.url)("typescript");
  } catch {
    return null;
  }
}

function kindOf(path) {
  if (/\.md$/i.test(path)) return "md";
  if (/^apps\/[^/]+\/src\/.+\.tsx?$/.test(path) && !/\.(test|spec)\.tsx?$|\.d\.ts$/.test(path)) return "ui";
  if (/^\.github\/ISSUE_TEMPLATE\/[^/]+\.ya?ml$|^\.github\/labels\.ya?ml$|^docs\/plans\/.+\/(?:[\w.]+-)?work\.ya?ml$/.test(path)) return "yaml";
  return null;
}

function scanText(text, kind, path, rules, ts) {
  const units = kind === "ui" ? tsUnits(ts, text, path ?? "stdin.tsx") : kind === "yaml" ? yamlUnits(text) : kind === "commit" ? commitUnits(text) : markdownUnits(text);
  return scanUnits(units, rules, { kind, path, only: path ? DASHES_ONLY.get(path) : undefined });
}

/** The excerpt as a reader sees it in a comment: the banned characters named, not shown. */
function quote(s) {
  const named = s.replace(/[\u2013\u2014\u2015]/g, (c) => `[U+${c.codePointAt(0).toString(16).toUpperCase()}]`).replace(/\p{Extended_Pictographic}/gu, "[emoji]");
  return `\`${named.replace(/`/g, "'").replace(/\|/g, "\\|")}\``;
}

/** The copy-lint bot's comment; the self-test holds it to the same rules. */
export function renderComment(findings, kind) {
  const what = { pr: "pull request description", issue: "issue", comment: "comment", commit: "commit message" }[kind] ?? "text";
  const fails = findings.filter((f) => f.severity === "fail");
  const out = [MARKER];
  out.push(
    fails.length
      ? `**Copy check:** ${fails.length} problem(s) in this ${what} break the copy standard in \`docs/copy-standard.md\` (D27).`
      : `**Copy check:** this ${what} meets the copy standard in \`docs/copy-standard.md\`.`,
  );
  if (findings.length) {
    out.push("", "| Line | Rule | Level | Found | Fix |", "|---|---|---|---|---|");
    for (const f of findings) out.push(`| ${f.line} | \`${f.id}\` | ${f.severity} | ${quote(f.excerpt)} | ${f.fix} |`);
  }
  out.push(
    "",
    fails.length
      ? "Edit the text to fix the rows marked fail. Rows marked warn are suggestions. This comment updates after each edit."
      : "Rows marked warn, if any, are suggestions. This comment updates after each edit.",
    "A line that has to keep a flagged word can carry `copy-ok: <reason>` in an HTML comment.",
  );
  return `${out.join("\n")}\n`;
}

function selfTest(rules, ts) {
  const problems = [];
  const notes = [];
  let expect;
  try {
    expect = JSON.parse(read(`${FIXTURES}/expect.json`));
  } catch (e) {
    return { problems: [`cannot read ${FIXTURES}/expect.json: ${e.message}`], notes };
  }
  const fired = new Set();
  for (const [file, spec] of Object.entries(expect)) {
    if (spec.kind === "ui" && !ts) {
      notes.push(`${file} skipped (no typescript in node_modules)`);
      continue;
    }
    const text = read(`${FIXTURES}/${file}`).replace(/\{U\+([0-9A-F]{4,6})\}/g, (m, h) => String.fromCodePoint(parseInt(h, 16)));
    const ids = new Set(scanText(text, spec.kind, spec.as ?? null, rules, ts).map((f) => f.id));
    for (const id of ids) fired.add(id);
    for (const id of spec.expect) if (!ids.has(id)) problems.push(`${file}: rule ${id} did not fire`);
    for (const id of ids) if (!spec.expect.includes(id)) problems.push(`${file}: rule ${id} fired, and the fixture does not expect it`);
  }
  for (const r of rules) if (!fired.has(r.id) && (ts || ![...r.scopes].every((k) => k === "ui"))) problems.push(`rule ${r.id} fires on no fixture, so nothing proves it works`);
  const standard = existsSync(resolve(ROOT, STANDARD)) ? read(STANDARD) : "";
  for (const r of rules) if (!standard.includes(`\`${r.id}\``)) problems.push(`rule ${r.id} is not listed in ${STANDARD}`);
  const sample = [{ line: 3, col: 7, id: "em-dash", severity: "fail", fix: rules[0].fix, excerpt: "aim \u2014 then launch" }];
  for (const body of [renderComment(sample, "pr"), renderComment([], "issue")]) {
    const bad = scanText(body, "comment", null, rules, ts).filter((f) => f.severity === "fail");
    if (bad.length) problems.push(`the bot comment breaks its own rules: ${bad.map((f) => f.id).join(", ")}`);
  }
  return { problems, notes };
}

function treeFiles() {
  return git(["ls-files", "-z", "--cached", "--others", "--exclude-standard"])
    .split("\0")
    .filter((f) => f && !EXEMPT.some((re) => re.test(f)) && kindOf(f) && existsSync(resolve(ROOT, f)));
}

function commitMessages(range) {
  return git(["log", "--no-merges", "--format=%H%x1f%B%x1e", range])
    .split("\x1e")
    .map((s) => s.replace(/^\s+/, ""))
    .filter(Boolean)
    .map((s) => ({ sha: s.split("\x1f")[0].trim(), body: s.split("\x1f")[1] ?? "" }));
}

function parseArgs(argv) {
  const o = { stdin: false, kind: null, report: null, commits: null, files: null, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--stdin") o.stdin = true;
    else if (a === "--quiet") o.quiet = true;
    else if (a === "--kind" || a === "--report" || a === "--commits") {
      if (!argv[i + 1]) throw new Error(`${a} needs a value`);
      o[a.slice(2)] = argv[++i];
    } else if (a === "--files") {
      o.files = argv.slice(i + 1);
      break;
    } else throw new Error(`unknown argument ${a}`);
  }
  if (o.stdin && !STDIN_KINDS.includes(o.kind)) throw new Error(`--stdin needs --kind ${STDIN_KINDS.join("|")}`);
  return o;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`copy: ${e.message}. See the usage in scripts/check-copy-tells.mjs.`);
    process.exit(2);
  }
  let rules;
  try {
    rules = compileRules(JSON.parse(read(CATALOGUE)));
  } catch (e) {
    console.error(`copy: FAILED, ${CATALOGUE} does not load: ${e.message}`);
    process.exit(3);
  }
  const ts = loadTs();
  const { problems, notes } = selfTest(rules, ts);
  // Only the tree scan reads UI strings; the copy-lint workflow runs --stdin without npm ci.
  if (!ts && process.env.CI && !opts.stdin && !opts.commits) problems.push("typescript is missing from node_modules in CI, so UI strings would go unchecked; run npm ci first");
  if (problems.length) {
    // Exit 3, not 1: the copy-lint workflow reads 1 as "the text breaks the standard".
    console.error("copy: self-test FAILED, so a clean result would mean nothing:");
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(3);
  }

  const findings = [];
  const counts = { md: 0, ui: 0, yaml: 0, commit: 0, stdin: 0 };
  const scan = (label, text, kind, path) => {
    counts[kind in counts ? kind : "stdin"]++;
    for (const f of scanText(text, kind, path, rules, ts)) findings.push({ ...f, label });
  };
  let range = opts.commits;
  if (opts.stdin) {
    scan("<stdin>", readFileSync(0, "utf8"), opts.kind, null);
  } else if (!range) {
    for (const f of opts.files ?? treeFiles()) {
      const kind = kindOf(f);
      if (!kind) continue;
      if (kind === "ui" && !ts) {
        notes.push("UI strings skipped: typescript is not installed (npm ci)");
        continue;
      }
      scan(f, read(f), kind, f);
    }
    if (process.env.GITHUB_BASE_REF) range = `origin/${process.env.GITHUB_BASE_REF}..HEAD`;
  }
  if (range) {
    const base = range.split("..")[0];
    try {
      git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
    } catch {
      console.error(`copy: FAILED, cannot resolve ${base} for the commit scan; check out with fetch-depth: 0.`);
      process.exit(1);
    }
    for (const c of commitMessages(range)) scan(`commit ${c.sha.slice(0, 12)}`, c.body, "commit", null);
  }

  if (opts.report) writeFileSync(opts.report, renderComment(findings, opts.kind ?? "pr"));
  const fails = findings.filter((f) => f.severity === "fail");
  const warns = findings.length - fails.length;
  // Warnings first, so the tail the gate runner shows on failure holds the failures.
  for (const f of [...findings.filter((x) => x.severity !== "fail"), ...fails]) {
    if (opts.quiet && f.severity !== "fail") continue;
    console.log(`  ${f.severity === "fail" ? "✗" : "!"} ${f.label}:${f.line}:${f.col} ${f.id} (${f.severity}) ${f.why} Fix: ${f.fix} Found: "${f.excerpt.slice(0, 80)}"`);
  }
  for (const n of [...new Set(notes)]) console.log(`  note: ${n}`);
  const scanned = Object.entries(counts).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(", ") || "nothing";
  if (counts.md + counts.ui + counts.yaml + counts.commit + counts.stdin === 0 && !range) {
    console.error("copy: FAILED, zero texts scanned; the file listing is broken, so a pass would be vacuous.");
    process.exit(1);
  }
  if (fails.length) {
    console.error(`copy: FAILED, ${fails.length} fail and ${warns} warn finding(s) in ${scanned}; see docs/copy-standard.md (D27)`);
    process.exit(1);
  }
  console.log(`copy: no fail findings in ${scanned}; ${warns} warning(s); ${rules.length} rules, self-test passed`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
