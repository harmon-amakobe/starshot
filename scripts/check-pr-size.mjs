#!/usr/bin/env node
/**
 * check-pr-size.mjs: the pull request size cap as a check (D30, PR_SIZE_CAP in
 * .claude/README.md).
 *
 * Counts every line a pull request adds and every file it changes against its base. It
 * leaves out lockfiles, fixture JSON, generated data and binary files, because nobody
 * reviews them line by line. A PR group of n specs is held to n times the cap: the check
 * warns above that and fails above twice it. n comes from --members, else from the PR
 * groups table of the plan, in the row whose Branch is the head branch and whose Base is
 * the base branch; any other pull request counts 1.
 *
 * Through the plan or ".gitattributes", a pull request cannot widen its own cap; an edit
 * to this script or ci.yml is the harness review's to catch. The plan is read from the base commit, so
 * editing its groups row changes nothing until that edit is itself merged. Attributes
 * come from the base tree, so a ".gitattributes" line such as "*.ts -diff" cannot turn
 * counted lines into excluded binary files. A fork chooses its own branch name, so CI
 * passes --members 1 for one. Nothing reads the title or the body.
 *
 * Usage:
 *   node scripts/check-pr-size.mjs [--base <ref>] [--members <n>] [--plan <path>]
 *   node scripts/check-pr-size.mjs --self-test     the cases below only (the pr-size gate)
 * Base: --base, else origin/$GITHUB_BASE_REF, else origin/main. Base branch:
 * $GITHUB_BASE_REF, else the base without "origin/". Head branch: $GITHUB_HEAD_REF, else
 * the current branch. --plan is a path inside the base commit. Needs git 2.40 or later.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runGate } from "./lib/gate-fail.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLAN = "docs/plans/v1-starshot/00-plan.md";
/** PR_SIZE_CAP per member spec. The self-test fails when .claude/README.md says otherwise. */
export const CAP = { lines: 400, files: 20 };
const EXCLUDE = ["package-lock.json", "Cargo.lock", "**/uv.lock", "**/fixtures/**/*.json", "data/ephem/**", "packages/core-wasm/pkg/**"];
const read = (rel) => readFileSync(resolve(ROOT, rel), "utf8");
const gitIn = (cwd, args, env = process.env) =>
  execFileSync("git", args, { cwd, env, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "pipe"] });
const git = (args) => gitIn(ROOT, args);

// The same glob shape REUSE.toml uses in check-licence.mjs: ** spans directories, * does not.
function globToRe(glob) {
  const body = glob.split(/(\*\*\/|\*\*|\*)/).map((p) => (
    p === "**/" ? "(?:.*/)?" : p === "**" ? ".*" : p === "*" ? "[^/]*" : p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
  ));
  return new RegExp(`^${body.join("")}$`);
}
const EXCLUDE_RE = EXCLUDE.map(globToRe);

/** `git diff --numstat -z` records. A rename or copy carries an empty path, then old and new. */
export function parseNumstat(out) {
  const parts = out.split("\0");
  const rows = [];
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    const m = /^(-|\d+)\t(-|\d+)\t([\s\S]*)$/.exec(parts[i]);
    if (!m) throw new Error(`unreadable numstat record: ${JSON.stringify(parts[i].slice(0, 80))}`);
    let path = m[3];
    if (path === "") {
      path = parts[i + 2];
      i += 2;
    }
    rows.push({ path, binary: m[1] === "-", added: m[1] === "-" ? 0 : Number(m[1]) });
  }
  return rows;
}

/** Added lines and changed files, without the excluded paths and binary files. */
export function measure(rows) {
  const sized = { lines: 0, files: 0, skipped: 0 };
  for (const r of rows) {
    if (r.binary || EXCLUDE_RE.some((re) => re.test(r.path))) sized.skipped++;
    else {
      sized.files++;
      sized.lines += r.added;
    }
  }
  return sized;
}

/** The first table under the "PR groups" heading, or null when it does not parse. */
export function groupsTable(plan) {
  const at = plan.search(/^### PR groups\b/m);
  if (at < 0) return null;
  const lines = plan.slice(at).split("\n").slice(1);
  const start = lines.findIndex((l) => l.startsWith("|"));
  const table = [];
  for (const l of lines.slice(start < 0 ? lines.length : start)) {
    if (!l.startsWith("|")) break;
    table.push(l.split("|").slice(1, -1).map((c) => c.trim()));
  }
  const [head = [], , ...rows] = table;
  const cols = { members: head.indexOf("Members"), branch: head.indexOf("Branch"), base: head.indexOf("Base") };
  return Object.values(cols).some((i) => i < 0) || !rows.length ? null : { cols, rows };
}

// A cell's first code span: "`main` at `7f325a6`" reads as main.
const firstCode = (cell) => (/`([^`]+)`/.exec(cell ?? "")?.[1] ?? cell ?? "").trim();
const prIds = (cell) => new Set(cell.match(/\bPR\d+[a-z]?\b/g) ?? []);

/** n: the distinct PRnn ids in the Members cell of the row with this head and this base. */
export function membersFor(plan, branch, baseBranch) {
  const t = groupsTable(plan);
  if (!t) return { n: 1, why: "the plan's PR groups table did not parse" };
  const row = t.rows.find((r) => firstCode(r[t.cols.branch]) === branch);
  if (!row) return { n: 1, why: `${branch || "a detached head"} is not a branch in the PR groups table` };
  const rowBase = firstCode(row[t.cols.base]);
  if (rowBase !== baseBranch) return { n: 1, why: `the row for ${branch} bases on ${rowBase}, not on ${baseBranch}` };
  return { n: Math.max(1, prIds(row[t.cols.members]).size), why: `the PR groups row for ${branch} on ${rowBase}: ${row[t.cols.members]}` };
}

/** The size of base...HEAD in a repository, with attributes and the plan taken from the base. */
export function measureRepo(cwd, base, { head, baseBranch, members = null, plan = PLAN, env = process.env }) {
  const sized = measure(parseNumstat(gitIn(cwd, [`--attr-source=${base}`, "diff", "--numstat", "-z", "-M", `${base}...HEAD`], env)));
  if (members) return { sized, members: { n: members, why: "--members" } };
  let text;
  try {
    text = gitIn(cwd, ["show", `${base}:${plan}`], env);
  } catch {
    return { sized, members: { n: 1, why: `${plan} is not in ${base}` } };
  }
  return { sized, members: membersFor(text, head, baseBranch) };
}

/** A throwaway repository whose HEAD tries both tricks: a "-diff" attribute and a bigger row. */
function trickRepo() {
  const dir = mkdtempSync(join(tmpdir(), "starshot-pr-size-"));
  // Without GIT_* variables, a run inside a git hook cannot reach the real repository.
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_"))),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  const g = (...args) =>
    gitIn(dir, ["-c", "user.name=pr-size self-test", "-c", "user.email=self-test@example.com", "-c", "commit.gpgsign=false", ...args], env);
  const row = (members) => "### PR groups\n\n| Group | Members | Branch | Base | Session |\n|---|---|---|---|---|\n"
    + `| T | ${members} | \`codex/t\` | \`codex/b\` | x |\n`;
  try {
    g("init", "-q");
    mkdirSync(join(dir, dirname(PLAN)), { recursive: true });
    writeFileSync(join(dir, PLAN), row("PR1, PR2"));
    g("add", "-A");
    g("commit", "-q", "--no-verify", "-m", "base");
    const base = g("rev-parse", "HEAD").trim();
    writeFileSync(join(dir, PLAN), row("PR1, PR2, PR3, PR4"));
    writeFileSync(join(dir, ".gitattributes"), "*.ts -diff\n");
    writeFileSync(join(dir, "a.ts"), "one\ntwo\nthree\n");
    g("add", "-A");
    g("commit", "-q", "--no-verify", "-m", "head");
    return measureRepo(dir, base, { head: "codex/t", baseBranch: "codex/b", env });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** ok, warn above n times the cap, fail above twice that. */
export function verdict({ lines, files }, n) {
  const warn = { lines: n * CAP.lines, files: n * CAP.files };
  const fail = { lines: 2 * warn.lines, files: 2 * warn.files };
  const level = lines > fail.lines || files > fail.files ? "fail" : lines > warn.lines || files > warn.files ? "warn" : "ok";
  return { level, warn, fail };
}

function selfTest() {
  const problems = [];
  const expect = (cond, what) => cond || problems.push(what);
  const cap = /\| `PR_SIZE_CAP` \|[^|\n]*?(\d+) added lines or (\d+) changed files/.exec(read(".claude/README.md"));
  expect(cap && Number(cap[1]) === CAP.lines && Number(cap[2]) === CAP.files,
    `CAP (${CAP.lines} lines, ${CAP.files} files) differs from PR_SIZE_CAP in .claude/README.md`);
  const rows = parseNumstat([
    "3\t1\tsrc/a.ts", "0\t0\t", "old/b.ts", "new/b.ts", "-\t-\tart/c.png", "900\t0\tpackage-lock.json",
    "50\t2\tscripts/fixtures/work/d.json", "40\t0\tdata/ephem/e.json", "7\t0\tdocs/fixtures.md", "",
  ].join("\0"));
  expect(rows[1]?.path === "new/b.ts" && rows[1].added === 0, "a rename is read by its new path, with zero added lines");
  const sized = measure(rows);
  expect(sized.lines === 10 && sized.files === 3 && sized.skipped === 4,
    `measure counted ${JSON.stringify(sized)}, expected 10 lines in 3 files with 4 skipped`);
  const plan = ["### PR groups (D30)", "", "| Group | Members | Branch | Base | Session |", "|---|---|---|---|---|",
    "| PR4 after PR3c | PR4, PR5 | `codex/a` | `codex/z` at `abc1234` | A4 |", "| PR3a plan | PR3a | `codex/b` | `codex/a` | A1 |",
    "| D39 checkpoint | Owner ruling, issue #27 | `codex/c` | `codex/b` | A1 |", "| Master review | Whole stack | `codex/m` | `codex/c` | last |",
    "", "| Other | PR7, PR8, PR9 | `codex/x` | `codex/m` | z |"].join("\n");
  const n = (b, on) => membersFor(plan, b, on).n;
  expect(n("codex/a", "codex/z") === 2 && n("codex/b", "codex/a") === 1,
    "members: PR4, PR5 counts 2, PR3a counts 1, and ids outside the Members cell do not count");
  expect(n("codex/a", "main") === 1, "members: a row counts only for a pull request onto its own Base");
  expect(n("codex/c", "codex/b") === 1 && n("codex/m", "codex/c") === 1 && n("codex/unlisted", "codex/z") === 1 && n("", "codex/z") === 1,
    "members: a checkpoint, the master review, an unlisted branch and a detached head count 1");
  expect(n("codex/x", "codex/m") === 1, "members: only the first table after the heading counts");
  const real = existsSync(resolve(ROOT, PLAN)) ? groupsTable(read(PLAN)) : null;
  expect(real?.rows.some((r) => prIds(r[real.cols.members]).size > 1), `${PLAN}: its PR groups table does not parse, so every pull request would count 1`);
  const tricked = trickRepo();
  expect(tricked.sized.lines === 5 && tricked.sized.files === 3,
    `a "-diff" attribute added by the pull request hid lines: counted ${JSON.stringify(tricked.sized)}, expected 5 lines in 3 files`);
  expect(tricked.members.n === 2, `a groups row edited by the pull request changed n to ${tricked.members.n}; it is read from the base`);
  const level = (lines, files, k) => verdict({ lines, files }, k).level;
  expect(level(800, 40, 2) === "ok" && level(801, 1, 2) === "warn" && level(1, 41, 2) === "warn", "verdict: warns just above n times the cap");
  expect(level(1600, 80, 2) === "warn" && level(1601, 1, 2) === "fail" && level(1, 81, 2) === "fail", "verdict: fails just above twice that");
  expect(level(401, 1, 1) === "warn" && level(801, 1, 1) === "fail", "verdict: one member keeps the plain cap");
  return problems;
}

function parseArgs(argv) {
  const o = { base: null, members: null, plan: null, selfTest: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--self-test") o.selfTest = true;
    else if (["--base", "--members", "--plan"].includes(a) && argv[i + 1]) o[a.slice(2)] = argv[++i];
    else throw new Error(`unknown or incomplete argument ${a}`);
  }
  if (o.members !== null && !/^[1-9]\d*$/.test(o.members)) throw new Error(`--members needs a whole number of at least 1, not ${o.members}`);
  return o;
}

function main() {
  let o;
  try {
    o = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`pr-size: ${e.message}. See the usage in scripts/check-pr-size.mjs.`);
    process.exit(2);
  }
  const problems = selfTest();
  if (problems.length) {
    console.error(`pr-size: self-test FAILED, so a measurement would mean nothing:\n  ✗ ${problems.join("\n  ✗ ")}`);
    process.exit(1);
  }
  if (o.selfTest) {
    console.log(`pr-size: self-test passed (cap ${CAP.lines} lines or ${CAP.files} files per member, exclusions, renames, `
      + "member count from the base's plan, attributes from the base, thresholds)");
    return;
  }
  const base = o.base ?? (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/main");
  try {
    git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
  } catch {
    console.error(`pr-size: FAILED, cannot resolve the base ${base}; fetch it, or check out with fetch-depth: 0.`);
    process.exit(1);
  }
  const head = process.env.GITHUB_HEAD_REF || git(["branch", "--show-current"]).trim();
  const baseBranch = process.env.GITHUB_BASE_REF || base.replace(/^origin\//, "");
  const { sized, members } = measureRepo(ROOT, base, { head, baseBranch, members: o.members ? Number(o.members) : null, plan: o.plan ?? PLAN });
  const v = verdict(sized, members.n);
  console.log(`pr-size: ${sized.lines} added line(s) in ${sized.files} file(s) against ${base} `
    + `(${sized.skipped} excluded: lockfiles, fixture JSON, generated data, binaries)`);
  console.log(`pr-size: n = ${members.n} member(s), from ${members.why}; `
    + `warns above ${v.warn.lines} lines or ${v.warn.files} files, fails above ${v.fail.lines} lines or ${v.fail.files} files`);
  const actions = process.env.GITHUB_ACTIONS === "true";
  if (v.level === "ok") return console.log("pr-size: inside the cap");
  const limit = v.level === "fail" ? v.fail : v.warn;
  const message = `${sized.lines} lines in ${sized.files} files is above ${limit.lines} lines or ${limit.files} files for ${members.n} member(s) (D30)`;
  if (v.level === "warn") return console.log(`${actions ? "::warning title=pr-size::" : "  ! pr-size: "}${message}; say why in the pull request`);
  console.error(`${actions ? "::error title=pr-size::" : "pr-size: FAILED, "}${message}; split the pull request`);
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runGate("pr-size", ROOT, main, "fetch the base with full history (fetch-depth: 0), use git 2.40 or later, and keep .claude/README.md");
}
