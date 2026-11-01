#!/usr/bin/env node
/**
 * check-hook-fixtures.mjs: the harness hooks, executed against planted cases.
 *
 * A guard proven only by passing is unproven: it may be passing because it checks
 * nothing. Each case below feeds a real hook payload to the real script and asserts the
 * outcome in both directions, the commands that must be denied and the everyday ones
 * that must run. Repository-state cases run in throwaway git repos under the OS temp
 * directory, never in this working tree.
 *
 * Hooks run through `sh` when it exists (as Claude Code runs them); without a POSIX shell
 * the node engines are called directly and the run says so.
 */
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AGENT = join(ROOT, "scripts/agent");
const hasSh = spawnSync("sh", ["-c", "exit 0"]).status === 0;
const failures = [];
let cases = 0;

function hook(script, payload, env = {}) {
  const engine = { "guard-destructive-git.sh": "lib/guard-destructive-git.mjs", "guard-protected-paths.sh": "lib/guard-protected-paths.mjs" }[script];
  const [cmd, args] = hasSh ? ["sh", [join(AGENT, script)]] : [process.execPath, [join(AGENT, engine ?? script)]];
  const r = spawnSync(cmd, args, {
    input: payload === null ? "" : JSON.stringify(payload),
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 60_000,
  });
  return { status: r.status, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
const denied = (out) => {
  try {
    return JSON.parse(out).hookSpecificOutput?.permissionDecision === "deny";
  } catch {
    return false;
  }
};
function expect(label, cond, detail = "") {
  cases++;
  if (!cond) failures.push(`${label}${detail ? `: ${detail}` : ""}`);
}

const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=fixture", "-c", "user.email=fixture@example.com", ...args], { cwd, encoding: "utf8" }).trim();
function repo(branch) {
  const dir = mkdtempSync(join(tmpdir(), "starshot-hook-"));
  git(dir, "init", "-q");
  git(dir, "checkout", "-q", "-b", branch);
  writeFileSync(join(dir, "README.md"), "fixture\n");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0", description: "a" }, null, 2) + "\n");
  git(dir, "add", "README.md", "package.json");
  git(dir, "commit", "-q", "-m", "init");
  return dir;
}

const onMain = repo("main");
writeFileSync(join(onMain, "server.pem"), "not a real key\n");
const onFeat = repo("feat");
writeFileSync(join(onFeat, "notes.md"), "notes\n");

try {
  // ── destructive-git: must deny ─────────────────────────────────────────────
  const DENY = [
    ["git reset --hard", onFeat],
    ["git reset --har HEAD~1", onFeat],
    ["git reset \\\n  --hard", onFeat],
    ["cd sub && git reset --hard origin/feat", onFeat],
    ["FOO=1 git -C . clean -fd", onFeat],
    ["git clean --force", onFeat],
    ["git checkout -- .", onFeat],
    ["git checkout --force feat", onFeat],
    ["git restore .", onFeat],
    ["git switch --discard-changes main", onFeat],
    ["git push --force origin feat", onFeat],
    ["git push -f", onFeat],
    ["git push origin +feat", onFeat],
    ["git push --mirror", onFeat],
    ["git push --all origin", onFeat],
    ["git push origin --delete main", onFeat],
    ["git push origin :main", onFeat],
    ["git push --force-with-lease origin main", onFeat],
    ["git branch -D main", onFeat],
    ["git rebase origin/main main", onFeat],
    ["git rebase feat", onMain],
    ["git add -A", onMain],
    ["git add -f .env", onFeat],
    ["git add .env.local", onFeat],
    ["git stash drop", onFeat],
    ["git stash clear", onFeat],
    ["git update-ref -d refs/snapshots/1700000000-1", onFeat],
    ["git worktree remove --force ../other", onFeat],
    ['bash -c "git push --force origin feat"', onFeat],
    ["eval git reset --hard", onFeat],
    ["echo $(git reset --hard)", onFeat],
    ["git gc --prune=now", onFeat],
    ["git filter-branch --tree-filter true", onFeat],
  ];
  for (const [command, cwd] of DENY) {
    const r = hook("guard-destructive-git.sh", { tool_name: "Bash", tool_input: { command }, cwd });
    expect(`destructive-git should deny: ${JSON.stringify(command)}`, denied(r.out), r.out || r.err || "no output");
  }

  // ── destructive-git: must allow ────────────────────────────────────────────
  const ALLOW = [
    ["git status --short", onFeat],
    ["git reset --soft HEAD~1", onFeat],
    ["git reset HEAD README.md", onFeat],
    ["git clean -n", onFeat],
    ["git clean -fn", onFeat],
    ["git checkout -b new-branch", onFeat],
    ["git checkout -- README.md", onFeat],
    ["git restore --staged .", onFeat],
    ["git restore README.md", onFeat],
    ["git push origin feat", onFeat],
    ["git push -u origin feat", onFeat],
    ["git push --force-with-lease origin feat", onFeat],
    ["git push --force-with-lease", onFeat],
    ["git branch -D old-feature", onFeat],
    ["git rebase main", onFeat],
    ["git rebase --abort", onMain],
    ["git add -A", onFeat],
    ["git add README.md notes.md", onFeat],
    ["git stash push -m wip", onFeat],
    ["git log --oneline -5 | head", onFeat],
    ['git commit -m "never run git reset --hard here"', onFeat],
    ["echo 'git push --force' > notes.txt", onFeat],
    ["cat <<'EOF'\ngit reset --hard\nEOF", onFeat],
    ["npm run gates", onFeat],
    ["git -C ../x status", onFeat],
  ];
  for (const [command, cwd] of ALLOW) {
    const r = hook("guard-destructive-git.sh", { tool_name: "Bash", tool_input: { command }, cwd });
    expect(`destructive-git should allow: ${JSON.stringify(command)}`, r.status === 0 && !denied(r.out), r.out);
  }
  const noise = hook("guard-destructive-git.sh", null);
  expect("destructive-git exits 0 on an empty payload", noise.status === 0 && !noise.out);
  const junk = hook("guard-destructive-git.sh", "git {not json");
  expect("destructive-git exits 0 on unparsable input", junk.status === 0 && !denied(junk.out));

  // ── protected paths ────────────────────────────────────────────────────────
  const env = { CLAUDE_PROJECT_DIR: ROOT };
  const P_DENY = [
    ["Edit", { file_path: join(ROOT, "third_party/astlo/README.md"), old_string: "a", new_string: "b" }],
    ["Write", { file_path: join(ROOT, "third_party/astlo.sha256"), content: "x" }],
    ["Write", { file_path: join(ROOT, "third_party/new-file.txt"), content: "x" }],
    ["Edit", { file_path: join(ROOT, "package.json"), old_string: '"version": "0.1.0"', new_string: '"version": "0.2.0"' }],
    ["Edit", { file_path: join(ROOT, "packages/physics/package.json"), old_string: '"version": "0.1.0",', new_string: "" }],
    ["MultiEdit", { file_path: join(ROOT, "apps/game/package.json"), edits: [{ old_string: "x", new_string: "y" }, { old_string: '"version": "0.1.0"', new_string: '"version": "1.0.0"' }] }],
    ["Write", { file_path: join(onFeat, "package.json"), content: JSON.stringify({ name: "fixture", version: "1.1.0", description: "a" }) }],
    ["Edit", { file_path: join(ROOT, "CHANGELOG.md"), old_string: "## [Unreleased]", new_string: "## [Unreleased]\n\n## [0.2.0] - 2026-11-01" }],
  ];
  for (const [tool, input] of P_DENY) {
    const r = hook("guard-protected-paths.sh", { tool_name: tool, tool_input: input, cwd: ROOT }, env);
    expect(`protected-paths should deny ${tool} ${input.file_path.replace(ROOT, "<repo>").replace(onFeat, "<tmp>")}`, denied(r.out), r.out || r.err || "no output");
  }
  const P_ALLOW = [
    ["Edit", { file_path: join(ROOT, "apps/game/src/main.ts"), old_string: "a", new_string: "b" }],
    ["Edit", { file_path: join(ROOT, "package.json"), old_string: '"vitest": "^5.0.5"', new_string: '"vitest": "^5.1.0"' }],
    ["Write", { file_path: join(onFeat, "packages/new-pkg/package.json"), content: JSON.stringify({ name: "new", version: "0.1.0" }) }],
    ["Write", { file_path: join(onFeat, "package.json"), content: JSON.stringify({ name: "fixture", version: "1.0.0", description: "b" }) }],
    ["Edit", { file_path: join(ROOT, "CHANGELOG.md"), old_string: "## [Unreleased]", new_string: "## [Unreleased]\n\n### Added\n- a level" }],
    ["Edit", { file_path: join(ROOT, "docs/third-party-notes.md"), old_string: "a", new_string: "b" }],
  ];
  for (const [tool, input] of P_ALLOW) {
    const r = hook("guard-protected-paths.sh", { tool_name: tool, tool_input: input, cwd: ROOT }, env);
    expect(`protected-paths should allow ${tool} ${input.file_path.replace(ROOT, "<repo>").replace(onFeat, "<tmp>")}`, r.status === 0 && !denied(r.out), r.out);
  }

  if (hasSh) {
    // ── open gate: one JSON line, fast, factual ──────────────────────────────
    const t0 = Date.now();
    const g = hook("open-gate.sh", null, env);
    const ms = Date.now() - t0;
    let ctx = "";
    try {
      const j = JSON.parse(g.out);
      ctx = j.hookSpecificOutput?.hookEventName === "SessionStart" ? j.hookSpecificOutput.additionalContext ?? "" : "";
    } catch {
      ctx = "";
    }
    expect("open-gate prints one valid SessionStart JSON line", g.status === 0 && g.out.split("\n").length === 1 && ctx.includes("branch"), g.out.slice(0, 200));
    expect("open-gate finishes within 3 s (target under 1 s)", ms < 3000, `${ms} ms`);

    // ── snapshot-ref: captures an untracked new file, prunes old refs ────────
    git(onFeat, "update-ref", "refs/snapshots/1000000000-1", "HEAD");
    writeFileSync(join(onFeat, "brand-new.ts"), "export const x = 1;\n");
    const s = hook("snapshot-ref.sh", { tool_name: "Write", tool_input: { file_path: join(onFeat, "brand-new.ts") } }, { CLAUDE_PROJECT_DIR: "" });
    const refs = git(onFeat, "for-each-ref", "--format=%(refname)", "refs/snapshots/").split("\n").filter(Boolean);
    expect("snapshot-ref is silent and exits 0", s.status === 0 && s.out === "", s.out);
    expect("snapshot-ref writes a ref", refs.length === 1 && refs[0] !== "refs/snapshots/1000000000-1", refs.join(", "));
    let captured = "";
    try {
      captured = refs[0] ? git(onFeat, "show", `${refs[0]}:brand-new.ts`) : "";
    } catch {
      captured = "";
    }
    expect("snapshot-ref captures an untracked new file", captured.includes("export const x"));
    expect("snapshot-ref prunes refs older than 7 days", !refs.includes("refs/snapshots/1000000000-1"));
    expect("snapshot-ref leaves the real index alone", git(onFeat, "diff", "--cached", "--name-only") === "");

    // ── stop hook: report-only ───────────────────────────────────────────────
    const st = hook("stop-gates.sh", null, env);
    let valid = st.out === "";
    if (!valid) {
      try {
        valid = typeof JSON.parse(st.out).systemMessage === "string";
      } catch {
        valid = false;
      }
    }
    expect("stop-gates exits 0 and prints nothing or one systemMessage JSON line", st.status === 0 && valid, st.out.slice(0, 200));
  }
} finally {
  for (const d of [onMain, onFeat]) if (existsSync(d)) rmSync(d, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`hook-fixtures: FAILED, ${failures.length} of ${cases} case(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`hook-fixtures: ${cases} case(s) pass${hasSh ? "" : " (no sh found: guard engines run directly; open-gate, snapshot and stop cases skipped)"}`);
