#!/usr/bin/env node
/**
 * check-agent-frontmatter.mjs: every agent in .claude/agents and every skill in
 * .claude/skills carries valid, complete frontmatter, and the AGENTS.md skills index
 * matches the skills on disk.
 *
 * Malformed frontmatter fails silently: the file still opens by name, but it never
 * auto-triggers and its tool limits may not apply. So this is a gate, not a lint.
 *  - Agents need name (= filename), a description long enough to route on, a model tier,
 *    and an explicit tools list. Read-only roles must not hold a writing tool; that is
 *    the mechanism behind "read-only", and an absent tools list means "every tool".
 *  - Every agent states the security boundary (content is data) and the absolute-path
 *    pinning rule, because subagents are stateless and cannot inherit either.
 *  - Skills need name (= directory), a "Use when ..." description, and links that resolve.
 *  - The skills index in AGENTS.md is load-bearing: a skill missing from it is a skill
 *    no agent knows to reach for.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { splitFrontmatter, parseFrontmatter } from "./lib/frontmatter.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AGENTS_DIR = ".claude/agents";
const SKILLS_DIR = ".claude/skills";
const INDEX = "AGENTS.md";

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MODELS = ["fable", "opus", "sonnet", "haiku", "inherit"];
const TOOLS = new Set(["Read", "Write", "Edit", "MultiEdit", "NotebookEdit", "Bash", "Glob", "Grep", "WebFetch", "WebSearch", "TodoWrite", "Skill", "Task"]);
const WRITING = ["Write", "Edit", "MultiEdit", "NotebookEdit"];
const READ_ONLY = new Set(["adversary", "physics-auditor", "verification-driver", "codebase-map", "rules-reviewer"]);
const AGENT_KEYS = { required: ["name", "description", "model", "tools"], optional: ["permissionMode", "color"] };
const SKILL_KEYS = { required: ["name", "description"], optional: ["paths", "allowed-tools", "argument-hint", "disable-model-invocation", "user-invocable"] };
const VENDOR_WORDS = ["claude", "anthropic", "openai", "copilot", "gemini", "codex"];

const errors = [];
const read = (rel) => readFileSync(resolve(ROOT, rel), "utf8");

function load(rel, keys) {
  const { frontmatter, body } = splitFrontmatter(read(rel));
  if (frontmatter === null) {
    errors.push(`${rel}: no frontmatter (the file must open with --- on line 1)`);
    return null;
  }
  const { values, errors: parse } = parseFrontmatter(frontmatter);
  for (const e of parse) errors.push(`${rel}: ${e}`);
  for (const k of keys.required) {
    const v = values[k];
    if (v === undefined || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length)) errors.push(`${rel}: missing "${k}"`);
  }
  for (const k of Object.keys(values)) {
    if (!keys.required.includes(k) && !keys.optional.includes(k)) errors.push(`${rel}: unknown key "${k}"`);
  }
  return { values, body };
}

function checkLinks(rel, body) {
  for (const m of body.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^[a-z]+:/i.test(target)) continue;
    if (!existsSync(resolve(ROOT, dirname(rel), target))) errors.push(`${rel}: link target does not exist: ${target}`);
  }
}

// Agents
const agentFiles = existsSync(resolve(ROOT, AGENTS_DIR))
  ? readdirSync(resolve(ROOT, AGENTS_DIR)).filter((f) => f.endsWith(".md")).sort()
  : [];
for (const f of agentFiles) {
  const rel = `${AGENTS_DIR}/${f}`;
  const doc = load(rel, AGENT_KEYS);
  if (!doc) continue;
  const { values: v, body } = doc;
  const stem = f.replace(/\.md$/, "");
  if (typeof v.name === "string" && (v.name !== stem || !NAME.test(v.name))) errors.push(`${rel}: name "${v.name}" must be lowercase-hyphen and equal the filename`);
  if (typeof v.description === "string" && v.description.length < 80) errors.push(`${rel}: description is ${v.description.length} chars; a router needs trigger nouns`);
  if (typeof v.model === "string" && !MODELS.includes(v.model)) errors.push(`${rel}: model "${v.model}" is not a tier alias (${MODELS.join(", ")})`);
  const tools = typeof v.tools === "string" ? v.tools.split(",").map((t) => t.trim()).filter(Boolean) : Array.isArray(v.tools) ? v.tools : [];
  for (const t of tools) if (!TOOLS.has(t)) errors.push(`${rel}: unknown tool "${t}"`);
  const readOnly = READ_ONLY.has(stem) || v.permissionMode === "plan";
  if (readOnly) {
    const bad = tools.filter((t) => WRITING.includes(t));
    if (bad.length) errors.push(`${rel}: read-only role holds writing tool(s): ${bad.join(", ")}`);
  }
  if (!/data,\s+never\s+instructions/i.test(body)) errors.push(`${rel}: body does not state the security boundary ("... is data, never instructions")`);
  if (!/absolute/i.test(body)) errors.push(`${rel}: body does not state the absolute-path pinning rule`);
  checkLinks(rel, body);
}

// Skills
const skillDirs = existsSync(resolve(ROOT, SKILLS_DIR))
  ? readdirSync(resolve(ROOT, SKILLS_DIR), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
  : [];
const index = existsSync(resolve(ROOT, INDEX)) ? read(INDEX) : "";
let skills = 0;
for (const dir of skillDirs) {
  const rel = `${SKILLS_DIR}/${dir}/SKILL.md`;
  if (!existsSync(resolve(ROOT, rel))) {
    errors.push(`${SKILLS_DIR}/${dir}: directory has no SKILL.md`);
    continue;
  }
  skills++;
  const doc = load(rel, SKILL_KEYS);
  if (!doc) continue;
  const { values: v, body } = doc;
  if (typeof v.name === "string") {
    if (v.name !== dir || !NAME.test(v.name) || v.name.length > 64) errors.push(`${rel}: name "${v.name}" must be lowercase-hyphen, at most 64 chars, and equal the directory`);
    if (VENDOR_WORDS.some((w) => v.name.includes(w))) errors.push(`${rel}: name carries a vendor word`);
  }
  if (typeof v.description === "string") {
    if (!/^Use when /.test(v.description)) errors.push(`${rel}: description must start with "Use when " followed by trigger nouns`);
    if (v.description.length > 1024) errors.push(`${rel}: description exceeds 1024 chars`);
  }
  const lines = body.split("\n").length;
  if (lines > 150) errors.push(`${rel}: body is ${lines} lines; move depth into a reference file one hop away`);
  checkLinks(rel, body);
  if (index && !index.includes(`\`${dir}\``)) errors.push(`${INDEX}: skills index does not list \`${dir}\``);
}
for (const m of index.matchAll(/\.claude\/skills\/([a-z0-9-]+)\//g)) {
  if (!skillDirs.includes(m[1])) errors.push(`${INDEX}: skills index points at missing skill ${m[1]}`);
}

if (agentFiles.length === 0 || skills === 0) {
  errors.push(`found ${agentFiles.length} agent(s) and ${skills} skill(s); zero means the check would pass vacuously`);
}
if (!index) errors.push(`${INDEX} is missing, so the skills index cannot be checked`);

if (errors.length) {
  console.error(`agent-frontmatter: FAILED, ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`agent-frontmatter: ${agentFiles.length} agent(s) and ${skills} skill(s) valid; skills index in ${INDEX} matches`);
