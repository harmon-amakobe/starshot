#!/usr/bin/env node
/**
 * Decision engine for scripts/agent/guard-protected-paths.sh (PreToolUse on
 * Edit|Write|MultiEdit|NotebookEdit). Prints one structured deny, or nothing.
 *
 * Two boundaries, both enforced here because prose alone does not hold at the end of a
 * long session:
 *  - third_party/** is Mark Macharia's all-rights-reserved astlo code plus the manifest
 *    that pins it (D2). It is never edited in this repository.
 *  - "version" fields in package.json files, and dated CHANGELOG release headings, are
 *    owned by CI (AGENTS.md). Dependency ranges are not version fields and stay editable.
 *
 * It matches the edit tool's path, so a file rewritten through the shell never reaches
 * it; check-third-party-untouched.mjs is the backstop that sees those.
 * Any parse failure exits 0: a broken guard must never brick the edit tools.
 */
import { existsSync, readFileSync } from "node:fs";

const deny = (reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
    }) + "\n",
  );
  process.exit(0);
};

const THIRD_PARTY_REASON =
  "third_party/** holds Mark Macharia's all-rights-reserved astlo files and the manifest that pins them (D2); nothing under it is edited in this repository. A fix for astlo goes into python/astlo as a one-topic commit (D10, .claude/skills/astlo-upstream/SKILL.md), and only the owner talks to Mark about it. A deliberate upstream sync follows the same skill, which regenerates the manifest with node scripts/check-third-party-untouched.mjs --write.";
const VERSION_REASON =
  "Version fields belong to CI (AGENTS.md, CI owns versions). Describe the change under ## [Unreleased] in CHANGELOG.md instead; the release lane derives the bump from it. Dependency ranges are not version fields and remain editable.";
const CHANGELOG_REASON =
  "Dated release headings in CHANGELOG.md are written by the release lane at merge, not by hand. Put the entry under ## [Unreleased].";

function versionOf(text) {
  if (typeof text !== "string") return null;
  try {
    const v = JSON.parse(text)?.version;
    return typeof v === "string" ? v : null;
  } catch {
    const m = /"version"\s*:\s*"([^"]*)"/.exec(text);
    return m ? m[1] : null;
  }
}
const RELEASE_HEADING = /^##\s*\[?v?\d+\.\d+\.\d+/m;

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let p;
  try {
    p = JSON.parse(input);
  } catch {
    process.exit(0);
  }
  const ti = p?.tool_input ?? {};
  const file = String(ti.file_path ?? ti.notebook_path ?? "").replace(/\\/g, "/");
  if (!file) process.exit(0);

  if (!/\/node_modules\//.test(file) && (/(^|\/)third_party\//.test(file) || /(^|\/)third_party$/.test(file))) {
    deny(THIRD_PARTY_REASON);
  }

  // Each edit as [before, after]. Write compares against the file on disk.
  const pairs = [];
  if (typeof ti.content === "string") {
    const before = existsSync(file) ? readFileSync(file, "utf8") : null;
    pairs.push([before ?? "", ti.content]);
  }
  if (typeof ti.old_string === "string" || typeof ti.new_string === "string") pairs.push([ti.old_string ?? "", ti.new_string ?? ""]);
  if (Array.isArray(ti.edits)) for (const e of ti.edits) pairs.push([e?.old_string ?? "", e?.new_string ?? ""]);

  const base = file.split("/").pop() ?? "";
  if (base === "package-lock.json") {
    const full = existsSync(file) ? readFileSync(file, "utf8") : "{}";
    const owned = text => {
      const lock = JSON.parse(text);
      return JSON.stringify([lock.version, ...Object.entries(lock.packages ?? {})
        .filter(([path]) => !path.includes("node_modules"))
        .map(([path, item]) => [path, item.version])]);
    };
    for (const [before, after] of pairs) {
      try {
        const original = before === full || !existsSync(file) ? before || "{}" : full;
        const updated = before === full || !existsSync(file) ? after : full.replace(before, after);
        if (owned(original) !== owned(updated)) deny(VERSION_REASON);
      } catch { /* The tool or JSON parser reports malformed edits; ordinary dependency changes stay editable. */ }
    }
  }
  if (base === "package.json" && !/\/node_modules\//.test(file)) {
    for (const [before, after] of pairs) {
      // A Write of a whole file compares the top-level field; a partial edit compares the
      // "version" key it touches. Either way, a value that changes is a hand bump.
      if (versionOf(before) !== versionOf(after)) deny(VERSION_REASON);
    }
  }
  if (/^CHANGELOG\.md$/i.test(base)) {
    for (const [before, after] of pairs) {
      const headings = text => text.split("\n").filter(line => RELEASE_HEADING.test(line));
      if (JSON.stringify(headings(before)) !== JSON.stringify(headings(after))) deny(CHANGELOG_REASON);
    }
  }
  process.exit(0);
});
