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
 *  4. CI runs the registry (the workflow calls npm run gates), and each job that runs it
 *     sets STARSHOT_REQUIRE_RUST, so a missing toolchain fails CI instead of skipping.
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
  licence: ["REUSE.toml", "LICENSE", "LICENSES", "package.json"],
  "dependency-licences": ["package-lock.json", "scripts/licence-allow.json"],
  assets: [
    "apps/game/assets/manifest.json", "apps/game/public",
    "apps/prototype/public/observatory/assets-manifest.json", "apps/prototype/tools/verify-assets.mjs",
  ],
  credits: ["CREDITS.md", "apps/game/assets/manifest.json"],
  copy: ["scripts/copy-tells.json", "scripts/fixtures/copy/expect.json", "docs/copy-standard.md", "README.md", "apps/game/src", ".github/ISSUE_TEMPLATE", ".github/labels.yml"],
  commits: [".git", "scripts/check-secrets.mjs"],
  work: ["docs/plans/v1-starshot/03-work.yaml", "docs/plans/v1-starshot/work.lock.json", ".github/labels.yml"],
  "pr-size": [".claude/README.md", "docs/plans/v1-starshot/00-plan.md"],
  size: ["scripts/size-baseline.json", "scripts/fixtures/size/expect.json", "apps/game/src", "packages", "scripts", "crates"],
  versions: ["package.json", "package-lock.json", "CHANGELOG.md", "scripts/release/release.test.mjs"],
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
  "rust-fmt": ["Cargo.toml", "rust-toolchain.toml", "crates/starshot-math/src"],
  "rust-clippy": ["Cargo.toml", "Cargo.lock", "clippy.toml", "crates/starshot-math/src"],
  "rust-test": ["Cargo.lock", "crates/starshot-math/tests", "fixtures/math/golden.json"],
  "rust-licences": ["Cargo.lock", "scripts/licence-allow.json"],
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
const ciText = existsSync(ci) ? readFileSync(ci, "utf8") : "";
if (ciText && !/npm run gates\b/.test(ciText)) {
  problems.push(".github/workflows/ci.yml does not run npm run gates, so CI enforces none of the registry");
}
// Jobs sit two spaces in under jobs:. The one that runs the registry must require Rust,
// in its own env or a step's; the same line in another job does not count.
const gateJobs = ciText.split(/^(?=  [\w-]+:\s*$)/m).slice(1).filter((j) => /^\s*(?:-\s*)?run:\s*npm run gates\b/m.test(j));
if (ciText && gateJobs.length === 0) problems.push(".github/workflows/ci.yml has no job with a run: npm run gates step");
for (const job of gateJobs) {
  if (!/^\s*STARSHOT_REQUIRE_RUST: "1"\s*$/m.test(job)) {
    problems.push(`.github/workflows/ci.yml: job ${job.trim().split(":")[0]} runs npm run gates without STARSHOT_REQUIRE_RUST: "1"; set it in that job`);
  }
}

if (problems.length) {
  console.error(`guard-scan-coverage: FAILED, ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
const counted = `${GATES.length} gate(s), ${rows} input path(s), ${registered.size} check script(s), ${hooks} hook script reference(s)`;
console.log(`guard-scan-coverage: ${counted} all resolve; CI runs the registry and requires Rust`);
