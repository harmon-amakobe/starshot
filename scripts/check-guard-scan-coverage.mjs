#!/usr/bin/env node
/**
 * check-guard-scan-coverage.mjs: no gate passes because it is looking at nothing.
 *
 * A scanning check whose input path moved finds zero files and reports green forever,
 * and a passing check looks exactly like a working one. This check asserts, from a bare
 * checkout:
 *  1. every gate's input paths exist and are non-empty (the COVERAGE table);
 *  2. every gate script in scripts/gates.mjs exists, and every scripts/check-*.mjs is
 *     registered there (a written-but-unregistered check is a false sense of safety);
 *  3. every hook script .claude/settings.json runs exists;
 *  4. CI runs the registry (the workflow calls npm run gates).
 * A row is added in the same change that adds a gate.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GATES } from "./gates.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const COVERAGE = {
  secrets: ["AGENTS.md", "packages", "scripts", ".claude"],
  "third-party": ["third_party/astlo", "third_party/astlo.sha256", "third_party/astlo/LICENSE"],
  licence: ["REUSE.toml", "LICENSE", "LICENSES", "CREDITS.md", "package.json"],
  copy: ["scripts/copy-tells.json", "scripts/fixtures/copy/expect.json", "docs/copy-standard.md", "README.md", "apps/game/src", ".github/ISSUE_TEMPLATE", ".github/labels.yml"],
  size: ["scripts/size-baseline.json", "apps/game/src", "packages", "scripts"],
  "instruction-dedup": ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"],
  "agent-frontmatter": [".claude/agents", ".claude/skills", "AGENTS.md"],
  "guard-scan-coverage": [".claude/settings.json", ".github/workflows/ci.yml"],
  "hook-fixtures": [
    "scripts/agent/guard-destructive-git.sh",
    "scripts/agent/guard-protected-paths.sh",
    "scripts/agent/open-gate.sh",
    "scripts/agent/snapshot-ref.sh",
    "scripts/agent/stop-gates.sh",
  ],
  typecheck: ["tsconfig.json", "tsconfig.base.json", "packages/ephemeris/tsconfig.json", "packages/physics/tsconfig.json"],
  test: ["vitest.config.ts", "packages/ephemeris/test", "packages/physics/test", "packages/ephemeris/test/fixtures/horizons.json"],
  build: ["apps/game/package.json"],
};

const problems = [];
const nonEmpty = (rel) => {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return false;
  const st = statSync(abs);
  return st.isDirectory() ? readdirSync(abs).length > 0 : st.size > 0;
};

let rows = 0;
for (const gate of GATES) {
  const roots = COVERAGE[gate.id];
  if (!roots) {
    problems.push(`gate "${gate.id}" has no COVERAGE row; add its input paths here`);
    continue;
  }
  for (const r of roots) {
    rows++;
    if (!nonEmpty(r)) problems.push(`gate "${gate.id}": input ${r} is missing or empty`);
  }
  const script = gate.cmd.find((a) => /\.m?js$/.test(a));
  if (script && !existsSync(resolve(ROOT, script))) problems.push(`gate "${gate.id}": script ${script} does not exist`);
}
for (const id of Object.keys(COVERAGE)) {
  if (!GATES.some((g) => g.id === id)) problems.push(`COVERAGE row "${id}" names no registered gate`);
}

const registered = new Set(GATES.flatMap((g) => g.cmd).filter((a) => /^scripts\/check-.*\.mjs$/.test(a)));
for (const f of readdirSync(resolve(ROOT, "scripts")).filter((f) => /^check-.*\.mjs$/.test(f))) {
  if (!registered.has(`scripts/${f}`)) problems.push(`scripts/${f} exists but is not registered in scripts/gates.mjs`);
}

const settingsPath = resolve(ROOT, ".claude/settings.json");
let hooks = 0;
if (existsSync(settingsPath)) {
  let settings;
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf8"));
  } catch (e) {
    problems.push(`.claude/settings.json is not valid JSON: ${e.message}`);
  }
  for (const entries of Object.values(settings?.hooks ?? {})) {
    for (const entry of entries) {
      for (const h of entry.hooks ?? []) {
        for (const m of String(h.command ?? "").matchAll(/scripts\/agent\/[\w.-]+\.sh/g)) {
          hooks++;
          if (!existsSync(resolve(ROOT, m[0]))) problems.push(`.claude/settings.json runs ${m[0]}, which does not exist`);
        }
      }
    }
  }
  if (hooks === 0) problems.push(".claude/settings.json wires no scripts/agent hook; the harness is not installed");
}

const ci = resolve(ROOT, ".github/workflows/ci.yml");
if (existsSync(ci) && !/npm run gates\b/.test(readFileSync(ci, "utf8"))) {
  problems.push(".github/workflows/ci.yml does not run npm run gates, so CI enforces none of the registry");
}

if (problems.length) {
  console.error(`guard-scan-coverage: FAILED, ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(`guard-scan-coverage: ${GATES.length} gate(s), ${rows} input path(s), ${registered.size} check script(s), ${hooks} hook script reference(s) all resolve; CI runs the registry`);
