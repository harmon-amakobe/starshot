#!/usr/bin/env node
/**
 * sync-work.mjs: issues as code (D23).
 *
 * docs/plans/<program>/work.yaml lists a program's epics and tasks. This script makes
 * GitHub match it: the labels in .github/labels.yml, the milestone, one issue per epic
 * and task (each body ends with a hidden `<!-- starshot-work: slug -->` marker), and
 * each task as a sub-issue of its epic. Issue numbers and REST ids go into
 * work.lock.json beside the plan, so a second run updates instead of duplicating, and
 * the markers rebuild a lost lock. It never closes or deletes anything unless the YAML
 * says `state: closed` with a `reason`. REST only: GraphQL is unavailable in agent
 * sessions. The orchestrator runs it; never a builder, and never CI with a personal
 * token (D23). Every title and body passes the copy checker before any request.
 *
 * Usage:
 *   node scripts/sync-work.mjs --program <name>             dry run: print what would change
 *   node scripts/sync-work.mjs --program <name> --apply     make the changes and write the lock
 *   node scripts/sync-work.mjs --program <name> --check     offline: fail if work.yaml and the lock disagree
 *   node scripts/sync-work.mjs --check                      offline: the same for every program, one line each
 *   node scripts/sync-work.mjs --self-test                  offline: parse the fixture and print its plan
 * Options: --only <slug>, --repo <owner/repo> (default: the origin remote),
 *   --file <path> (a work.yaml outside docs/plans), --offline (plan from the lock alone),
 *   --plans-dir <path> (where the program folders are; default docs/plans).
 * Token: GITHUB_TOKEN or GH_TOKEN; without one the dry run is offline. The project steps
 * run only when that token can read the project named by `project:` in work.yaml;
 * otherwise they print what they would set.
 *
 * work.yaml uses the YAML subset scripts/lib/yaml-lite.mjs reads (mappings, sequences,
 * quoted and plain scalars, [flow, lists], | and > blocks). Its file name may carry a
 * prefix, as in 03-work.yaml; the lock is always work.lock.json in the same folder.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "./lib/yaml-lite.mjs";
import { compileRules, markdownUnits, scanUnits } from "./lib/copy-scan.mjs";
import { client, all } from "./lib/github-rest.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = "scripts/fixtures/work/work.yaml";
const PLANS_FIXTURE = "scripts/fixtures/work/plans";
const WORK_FILE = /(^|-)work\.ya?ml$/;
const MARK = (slug) => `<!-- starshot-work: ${slug} -->`;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const ENUMS = { size: ["XS", "S", "M", "L", "XL"], priority: ["p0", "p1", "p2", "p3"], actor: ["Human", "Agent", "Either"] };
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

function parseArgs(argv) {
  const o = { apply: false, check: false, selfTest: false, offline: false, program: null, only: null, repo: null, file: null, plansDir: "docs/plans" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const flag = { "--apply": "apply", "--check": "check", "--self-test": "selfTest", "--offline": "offline" }[a];
    if (flag) o[flag] = true;
    else if (["--program", "--only", "--repo", "--file"].includes(a) && argv[i + 1]) o[a.slice(2)] = argv[++i];
    else if (a === "--plans-dir" && argv[i + 1]) o.plansDir = argv[++i];
    else throw new Error(`unknown or incomplete argument ${a}`);
  }
  return o;
}

function locate(o) {
  if (o.file) return resolve(ROOT, o.file);
  if (!o.program) throw new Error("name the program with --program <name>, or a file with --file <path>");
  const dir = resolve(ROOT, o.plansDir, o.program);
  const found = existsSync(dir) ? readdirSync(dir).filter((f) => WORK_FILE.test(f)).sort() : [];
  if (found.includes("work.yaml")) return join(dir, "work.yaml");
  if (found.length !== 1) throw new Error(`${o.plansDir}/${o.program} needs exactly one work.yaml (found ${found.length})`);
  return join(dir, found[0]);
}

/** Every program folder under the plans directory that holds a work.yaml, by name. */
function programsIn(plansDir) {
  const root = resolve(ROOT, plansDir);
  if (!existsSync(root)) throw new Error(`${plansDir} does not exist`);
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && readdirSync(join(root, d.name)).some((f) => WORK_FILE.test(f)))
    .map((d) => d.name)
    .sort();
}

/** One program's offline check: whether its work.yaml and lock agree, and the line to print. */
function checkProgram(o, labelNames) {
  try {
    const path = locate(o);
    const lockPath = join(dirname(path), "work.lock.json");
    const work = loadWork(path, labelNames);
    const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, "utf8")) : null;
    const { problems, note } = checkLock(work, lock);
    // Ids are never removed, so a slug the lock has and work.yaml lacks goes back into work.yaml.
    const fix = "Fix: if a slug is in the lock but not in work.yaml, restore its id in work.yaml (never remove a slug). "
      + `Otherwise the orchestrator runs node scripts/sync-work.mjs --program ${o.program ?? "<name>"} --apply (track-work skill).`;
    if (problems.length) return { ok: false, line: `sync-work: FAILED, ${relative(ROOT, path)} and its lock disagree:\n  ${problems.join("\n  ")}\n${fix}` };
    return { ok: true, line: `sync-work: ${relative(ROOT, path)} is valid, ${work.items.length} issue(s)${note ? `; ${note}` : "; the lock agrees"}` };
  } catch (e) {
    return { ok: false, line: `sync-work: FAILED, ${o.program ?? o.file}: ${e.message}` };
  }
}

export function loadLabels() {
  const list = parseYaml(read(".github/labels.yml"));
  if (!Array.isArray(list) || list.some((l) => !l?.name || !/^[0-9a-f]{6}$/i.test(String(l.color)))) throw new Error(".github/labels.yml: each label needs a name and a six-digit hex color");
  return list;
}

export function loadWork(path, labelNames) {
  const doc = parseYaml(readFileSync(path, "utf8"));
  const errors = [];
  for (const k of ["program", "milestone"]) if (typeof doc?.[k] !== "string") errors.push(`${k} must be a string`);
  const items = [];
  const seen = new Set();
  const add = (x, where, parent) => {
    if (!x || typeof x !== "object") return errors.push(`${where}: not a mapping`);
    if (!SLUG.test(String(x.id))) errors.push(`${where}: id "${x.id}" is not a lowercase slug`);
    if (seen.has(x.id)) errors.push(`${where}: id ${x.id} is used twice`);
    seen.add(x.id);
    if (typeof x.title !== "string" || !x.title.trim()) errors.push(`${x.id}: title is missing`);
    for (const l of x.labels ?? []) if (!labelNames.has(l)) errors.push(`${x.id}: label ${l} is not in .github/labels.yml`);
    for (const [k, allowed] of Object.entries(ENUMS)) if (x[k] != null && !allowed.includes(x[k])) errors.push(`${x.id}: ${k} must be one of ${allowed.join(", ")}`);
    if (x.state === "closed" && !["completed", "not_planned"].includes(x.reason)) errors.push(`${x.id}: state: closed needs reason: completed or not_planned`);
    const labels = [...(x.labels ?? [])];
    if (x.priority && !labels.includes(`priority:${x.priority}`)) labels.push(`priority:${x.priority}`);
    items.push({ slug: x.id, title: x.title, text: x.body ?? "", labels, size: x.size, priority: x.priority, actor: x.actor, spec: x.spec, dependsOn: x.depends_on ?? [], state: x.state ?? "open", reason: x.reason, parent });
  };
  for (const [k, e] of (doc?.epics ?? []).entries()) {
    add(e, `epics[${k}]`, null);
    for (const [j, t] of (e?.tasks ?? []).entries()) add(t, `${e?.id}.tasks[${j}]`, e?.id);
  }
  for (const it of items) for (const d of it.dependsOn) if (!seen.has(d)) errors.push(`${it.slug}: depends_on ${d} is not an id in this file`);
  if (!items.length) errors.push("no epics or tasks");
  if (errors.length) throw new Error(`${relative(ROOT, path)}:\n  ${errors.join("\n  ")}`);
  return { program: doc.program, milestone: doc.milestone, project: doc.project ?? null, items };
}

function bodyOf(it, numbers) {
  const ref = (slug) => (numbers[slug] ? `#${numbers[slug]}` : `\`${slug}\``);
  const lines = [it.text.trimEnd(), ""];
  if (it.spec) lines.push(`Spec: \`${it.spec}\``);
  const plan = [it.size && `size ${it.size}`, it.priority && `priority ${it.priority}`, it.actor && `actor ${it.actor}`].filter(Boolean);
  if (plan.length) lines.push(`Planned as ${plan.join(", ")}.`);
  if (it.dependsOn.length) lines.push(`Depends on ${it.dependsOn.map(ref).join(", ")}.`);
  lines.push("", MARK(it.slug));
  return `${lines.join("\n").replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n")}\n`;
}

/** Titles and bodies follow the copy standard (D27) before anything reaches GitHub. */
function copyProblems(work, numbers) {
  const rules = compileRules(JSON.parse(read("scripts/copy-tells.json")));
  const out = [];
  for (const it of work.items) {
    for (const [what, text] of [["title", it.title], ["body", bodyOf(it, numbers)]]) {
      for (const f of scanUnits(markdownUnits(text), rules, { kind: "issue", path: null })) {
        if (f.severity === "fail") out.push(`${it.slug} ${what}:${f.line}:${f.col} ${f.id}: ${f.fix}`);
      }
    }
  }
  return out;
}

export function checkLock(work, lock) {
  if (!lock) return { problems: [], note: "no work.lock.json yet: never synced" };
  const problems = [];
  if (lock.program !== work.program) problems.push(`the lock is for program ${lock.program}, work.yaml for ${work.program}`);
  const slugs = new Set(work.items.map((i) => i.slug));
  for (const s of slugs) if (!lock.issues?.[s]?.number) problems.push(`${s} is in work.yaml but has no issue in the lock`);
  for (const s of Object.keys(lock.issues ?? {})) if (!slugs.has(s)) problems.push(`${s} is in the lock but not in work.yaml (ids are never reused or removed)`);
  const nums = Object.values(lock.issues ?? {}).map((e) => e.number);
  if (new Set(nums).size !== nums.length) problems.push("two slugs in the lock share an issue number");
  return { problems, note: null };
}

function projectFields(it, work) {
  const area = it.labels.find((l) => l.startsWith("area:"))?.slice(5);
  return { Size: it.size, Priority: it.priority?.toUpperCase(), Area: area, Actor: it.actor, Chapter: work.milestone };
}

/** What a run would do, from the lock alone: no network. */
export function offlinePlan(work, lock, labels) {
  const numbers = Object.fromEntries(Object.entries(lock?.issues ?? {}).map(([s, e]) => [s, e.number]));
  const rows = [["labels", "ensure", "", `${labels.length} from .github/labels.yml`], ["milestone", "ensure", "", work.milestone]];
  for (const it of work.items) {
    const n = numbers[it.slug];
    rows.push([it.slug, n ? "update" : "create", n ? `#${n}` : "new", it.state === "closed" ? `then close as ${it.reason}` : it.title]);
    if (it.parent) rows.push([it.slug, "link", "", `sub-issue of ${numbers[it.parent] ? `#${numbers[it.parent]}` : it.parent}`]);
    if (work.project) rows.push([it.slug, "project", "", `would add to project ${work.project}; ${fmtFields(projectFields(it, work))}`]);
  }
  return rows;
}
const fmtFields = (f) => Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(", ");

async function sync(work, lock, labels, o, token) {
  const req = client(token);
  const base = `/repos/${o.repo}`;
  const rows = [];
  const act = async (row, fn) => {
    rows.push([...row.slice(0, 3), `${o.apply ? "" : "would: "}${row[3]}`]);
    return o.apply ? fn() : null;
  };
  const remote = new Map((await all(req, `${base}/labels?per_page=100`)).map((l) => [l.name, l]));
  for (const l of labels) {
    const want = { color: String(l.color).toLowerCase(), description: l.description ?? "" };
    const have = remote.get(l.name);
    if (have && (have.color !== want.color || (have.description ?? "") !== want.description)) await act([l.name, "label", "", "update colour or description"], () => req("PATCH", `${base}/labels/${encodeURIComponent(l.name)}`, want));
    else if (!have && l.from && remote.has(l.from)) await act([l.name, "label", "", `rename from ${l.from}`], () => req("PATCH", `${base}/labels/${encodeURIComponent(l.from)}`, { new_name: l.name, ...want }));
    else if (!have) await act([l.name, "label", "", "create"], () => req("POST", `${base}/labels`, { name: l.name, ...want }));
  }
  const milestones = await all(req, `${base}/milestones?state=all&per_page=100`);
  let milestone = milestones.find((m) => m.title === work.milestone)?.number;
  if (!milestone) milestone = (await act(["milestone", "create", "", work.milestone], () => req("POST", `${base}/milestones`, { title: work.milestone })))?.data?.number;
  const issues = (await all(req, `${base}/issues?state=all&per_page=100`)).filter((i) => !i.pull_request);
  const byMarker = new Map();
  for (const i of issues) for (const m of (i.body ?? "").matchAll(/<!-- starshot-work: ([a-z0-9-]+) -->/g)) byMarker.set(m[1], i);
  const byNumber = new Map(issues.map((i) => [i.number, i]));
  const next = { program: work.program, issues: {} };
  for (const it of work.items) {
    const found = byNumber.get(lock?.issues?.[it.slug]?.number) ?? byMarker.get(it.slug);
    const { item_id, fields } = lock?.issues?.[it.slug] ?? {};
    if (found) next.issues[it.slug] = { number: found.number, id: found.id, node_id: found.node_id, ...(item_id ? { item_id } : {}), ...(fields ? { fields } : {}) };
  }
  const numbers = () => Object.fromEntries(Object.entries(next.issues).map(([s, e]) => [s, e.number]));
  for (const it of work.items.filter((x) => !o.only || x.slug === o.only || x.slug === work.items.find((y) => y.slug === o.only)?.parent)) {
    const entry = next.issues[it.slug];
    const want = { title: it.title, body: bodyOf(it, numbers()), labels: it.labels, milestone: milestone ?? null };
    if (!entry) {
      const r = await act([it.slug, "create", "new", it.title], () => req("POST", `${base}/issues`, want));
      if (r) next.issues[it.slug] = { number: r.data.number, id: r.data.id, node_id: r.data.node_id };
    } else {
      const have = byNumber.get(entry.number);
      const same = have && have.title === want.title && (have.body ?? "") === want.body && have.milestone?.number === want.milestone && [...have.labels.map((l) => l.name)].sort().join() === [...want.labels].sort().join();
      if (!same) await act([it.slug, "update", `#${entry.number}`, "title, body, labels or milestone"], () => req("PATCH", `${base}/issues/${entry.number}`, want));
    }
    const num = next.issues[it.slug]?.number;
    if (it.state === "closed" && num && byNumber.get(num)?.state !== "closed") await act([it.slug, "close", `#${num}`, it.reason], () => req("PATCH", `${base}/issues/${num}`, { state: "closed", state_reason: it.reason }));
  }
  for (const it of work.items.filter((x) => x.parent && next.issues[x.slug] && next.issues[x.parent])) {
    const parent = next.issues[it.parent].number;
    const kids = await all(req, `${base}/issues/${parent}/sub_issues?per_page=100`);
    if (!kids.some((k) => k.id === next.issues[it.slug].id)) await act([it.slug, "link", `#${next.issues[it.slug].number}`, `sub-issue of #${parent}`], () => req("POST", `${base}/issues/${parent}/sub_issues`, { sub_issue_id: next.issues[it.slug].id }));
  }
  if (work.project) await syncProject(work, next, o, req, act, rows);
  return { rows, next };
}

async function syncProject(work, next, o, req, act, rows) {
  const owner = o.repo.split("/")[0];
  const base = `/users/${owner}/projectsV2/${work.project}`;
  const v = { version: "2026-03-10" };
  const probe = await req("GET", `${base}/fields?per_page=100`, null, { ...v, allow: [401, 403, 404] });
  for (const it of work.items) {
    const wanted = projectFields(it, work);
    if (!probe.data || !next.issues[it.slug]) {
      const why = probe.data ? "once the issue exists" : "the token cannot reach the project";
      rows.push([it.slug, "project", "", `would add to project ${work.project}; ${fmtFields(wanted)} (${why})`]);
      continue;
    }
    const entry = next.issues[it.slug];
    if (!entry.item_id) {
      const r = await act([it.slug, "project", `#${entry.number}`, `add to project ${work.project}`], () => req("POST", `${base}/items`, { type: "Issue", id: entry.id }, v));
      if (r) entry.item_id = r.data.id ?? r.data.value?.id;
    }
    const fields = [];
    for (const [name, value] of Object.entries(wanted)) {
      const field = probe.data.find((f) => f.name === name);
      const option = field?.options?.find((x) => (x.name?.raw ?? x.name) === value);
      if (value && option) fields.push({ id: field.id, value: option.id });
    }
    // The lock records what was last set, so a person's later edit on the board stands
    // until work.yaml itself changes.
    const set = fmtFields(wanted);
    if (fields.length && entry.item_id && entry.fields !== set) {
      const r = await act([it.slug, "project", `#${entry.number}`, set], () => req("PATCH", `${base}/items/${entry.item_id}`, { fields }, v));
      if (r) entry.fields = set;
    }
  }
}

function printRows(rows) {
  const w = [0, 1, 2].map((k) => Math.max(...rows.map((r) => String(r[k]).length), 4));
  for (const r of rows) console.log(`  ${String(r[0]).padEnd(w[0])}  ${String(r[1]).padEnd(w[1])}  ${String(r[2]).padEnd(w[2])}  ${r[3]}`);
}

function repoFromRemote() {
  const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: ROOT, encoding: "utf8" }).trim();
  const m = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url);
  if (!m) throw new Error(`cannot read owner/repo from the origin remote; pass --repo <owner/repo>`);
  return `${m[1]}/${m[2]}`;
}

function selfTest(labels) {
  const problems = [];
  const work = loadWork(resolve(ROOT, FIXTURE), new Set(labels.map((l) => l.name)));
  const lock = JSON.parse(read(FIXTURE.replace("work.yaml", "work.lock.json")));
  const by = Object.fromEntries(work.items.map((i) => [i.slug, i]));
  const expect = (cond, what) => cond || problems.push(what);
  expect(work.program === "fixture-program" && work.project === 7 && work.items.length === 5, "program, project or item count");
  expect(by["fx-share"]?.parent === "fx-epic" && by["fx-share"].dependsOn.join() === "fx-seed", "fx-share parent or depends_on");
  expect(by["fx-seed"]?.labels.includes("priority:p2") && by["fx-help"]?.labels.filter((l) => l === "priority:p3").length === 1, "priority labels");
  expect(by["fx-help"]?.state === "closed" && by["fx-help"].reason === "not_planned", "fx-help closed as not planned");
  expect(by["fx-epic"]?.text.includes("\n\nDone when"), "block scalar paragraphs");
  const body = bodyOf(by["fx-share"], { "fx-seed": 12 });
  expect(body.includes("Depends on #12.") && body.trimEnd().endsWith(MARK("fx-share")), "issue body: dependency and marker");
  expect(copyProblems(work, {}).length === 0, "the fixture should pass the copy checker");
  const broken = { ...work, items: [{ ...by["fx-seed"], title: `Seed ${String.fromCodePoint(0x2014)} daily` }] };
  expect(copyProblems(broken, {}).some((p) => p.includes("em-dash")), "a title with an em dash should fail the copy checker");
  expect(checkLock(work, lock).problems.length === 3, "the fixture lock should miss three slugs");
  const rows = offlinePlan(work, lock, labels);
  expect(rows.some((r) => r[0] === "fx-seed" && r[1] === "update" && r[2] === "#12") && rows.some((r) => r[0] === "fx-share" && r[1] === "create"), "offline plan");
  // Through the command line, as the work gate and CI call it: two fixture programs, one
  // whose lock names a slug its work.yaml lacks. Checking every program must name it.
  const run = (...args) =>
    spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args, "--plans-dir", PLANS_FIXTURE], { cwd: ROOT, encoding: "utf8" });
  const one = run("--check", "--program", "agrees");
  expect(one.status === 0 && one.stdout.includes("agrees/work.yaml is valid"), `--check --program agrees should pass (exit ${one.status})`);
  const every = run("--check");
  const named = /drifts\/work\.yaml and its lock disagree[\s\S]*dr-gone/.test(every.stderr);
  expect(every.status === 1 && every.stdout.includes("agrees/work.yaml is valid") && named,
    `--check over every program should pass agrees and fail naming drifts (exit ${every.status})`);
  console.log(`sync-work: dry run of ${FIXTURE}, offline:`);
  printRows(rows);
  return problems;
}

async function main() {
  let o;
  try {
    o = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`sync-work: ${e.message}. See the usage in scripts/sync-work.mjs.`);
    process.exit(2);
  }
  const labels = loadLabels();
  if (o.selfTest) {
    const problems = selfTest(labels);
    if (problems.length) {
      console.error(`sync-work: self-test FAILED: ${problems.join("; ")}`);
      process.exit(1);
    }
    console.log("sync-work: self-test passed (parser, schema, bodies, copy check, lock check, offline plan, every-program check)");
    return;
  }
  if (o.check) {
    const labelNames = new Set(labels.map((l) => l.name));
    // No program named: every program folder, so a second program's drift cannot hide.
    const programs = o.program || o.file ? [o.program] : programsIn(o.plansDir);
    if (!programs.length) {
      console.error(`sync-work: FAILED, no program folder under ${o.plansDir} holds a work.yaml, so a pass would be vacuous`);
      process.exit(1);
    }
    const results = programs.map((program) => checkProgram({ ...o, program }, labelNames));
    for (const r of results) (r.ok ? console.log : console.error)(r.line);
    if (results.some((r) => !r.ok)) process.exit(1);
    return;
  }
  const path = locate(o);
  const lockPath = join(dirname(path), "work.lock.json");
  const work = loadWork(path, new Set(labels.map((l) => l.name)));
  const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, "utf8")) : null;
  const copy = copyProblems(work, Object.fromEntries(Object.entries(lock?.issues ?? {}).map(([s, e]) => [s, e.number])));
  if (copy.length) {
    console.error(`sync-work: FAILED, text that breaks the copy standard (docs/copy-standard.md):\n  ${copy.join("\n  ")}`);
    process.exit(1);
  }
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (o.offline || !token) {
    if (o.apply) {
      console.error("sync-work: --apply needs GITHUB_TOKEN or GH_TOKEN and no --offline");
      process.exit(2);
    }
    console.log(`sync-work: offline plan for ${relative(ROOT, path)}${token ? "" : " (no token)"}:`);
    printRows(offlinePlan(work, lock, labels).filter((r) => !o.only || r[0] === o.only));
    return;
  }
  o.repo ??= repoFromRemote();
  const { rows, next } = await sync(work, lock, labels, o, token);
  console.log(`sync-work: ${o.apply ? "applied to" : "dry run against"} ${o.repo}, ${relative(ROOT, path)}:`);
  printRows(rows.length ? rows : [["all", "unchanged", "", "nothing to do"]]);
  if (o.apply) {
    writeFileSync(lockPath, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`sync-work: wrote ${relative(ROOT, lockPath)}; commit it with the plan`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`sync-work: FAILED, ${e.message}`);
    process.exit(1);
  });
}
