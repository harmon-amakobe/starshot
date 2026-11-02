#!/usr/bin/env node
/**
 * Decision engine for scripts/agent/guard-destructive-git.sh (PreToolUse on Bash).
 *
 * Reads the hook payload on stdin and prints one structured deny, or nothing. It refuses
 * the git commands that destroy state nothing else can recover (uncommitted work, the
 * snapshot refs, shared history on main, a secret about to be staged) and lets every
 * ordinary workflow command through. Each reason names the safe alternative, because a
 * denial without a way forward gets worked around.
 *
 * Long options match by unambiguous prefix, as git itself does: `git reset --har` runs.
 * Any parse failure exits 0 silently, so a broken guard can never brick the shell tool.
 * It is a guard, not a sandbox; the gaps are named in .claude/README.md.
 *
 * Run by hand:
 *   echo '{"tool_input":{"command":"git reset --hard"}}' | node scripts/agent/lib/guard-destructive-git.mjs
 */
import { spawnSync } from "node:child_process";
import { splitCommands, commandStart } from "./shell-words.mjs";

// Exact normalized commands that are allowed despite a rule below. Empty on purpose:
// add one command at a time, with a dated reason, only after it was genuinely needed.
const ALLOWED_EXACT = new Set([]);

const PROTECTED = new Set(["main", "master", "gh-pages"]);
const WIPE_PATHS = new Set([".", "./", ":/", ":/.", "*", "**"]);
const SECRET_NAME = [
  /(^|\/)\.env(\.(?!example$)[^/]+)?$/i,
  /\.(pem|key|p12|pfx|keystore|jks)$/i,
  /(^|\/)service-account[^/]*\.json$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
];

const OPTS = {
  reset: ["hard", "soft", "mixed", "merge", "keep", "quiet", "patch", "no-refresh", "recurse-submodules", "pathspec-from-file"],
  clean: ["force", "dry-run", "quiet", "exclude", "interactive"],
  checkout: ["force", "detach", "merge", "orphan", "track", "no-track", "patch", "quiet", "progress", "ours", "theirs", "conflict", "recurse-submodules", "pathspec-from-file"],
  switch: ["force", "discard-changes", "create", "force-create", "detach", "merge", "quiet", "track", "no-track", "orphan", "guess", "no-guess"],
  restore: ["staged", "worktree", "source", "patch", "quiet", "ours", "theirs", "merge", "conflict", "overlay", "no-overlay", "pathspec-from-file"],
  push: ["force", "force-with-lease", "force-if-includes", "all", "mirror", "prune", "delete", "tags", "follow-tags", "set-upstream", "atomic", "dry-run", "quiet", "verbose", "porcelain", "repo", "no-verify", "verify", "push-option", "signed"],
  branch: ["delete", "force", "move", "copy", "list", "all", "remotes", "verbose", "quiet", "set-upstream-to", "unset-upstream", "contains", "merged", "no-merged", "sort", "format", "show-current", "track", "no-track"],
  add: ["all", "force", "update", "dry-run", "verbose", "patch", "intent-to-add", "no-all", "ignore-removal", "chmod", "pathspec-from-file"],
  rebase: ["onto", "abort", "continue", "skip", "quit", "interactive", "root", "autosquash", "update-refs", "exec", "strategy", "edit-todo"],
  "update-ref": ["delete", "no-deref", "stdin", "create-reflog"],
  worktree: ["force", "detach", "checkout", "no-checkout", "lock", "reason", "quiet", "expire", "porcelain", "verbose"],
  gc: ["prune", "aggressive", "auto", "quiet", "force", "keep-largest-pack", "no-prune"],
};
const VALUE_OPTS = {
  restore: new Set(["-s", "--source"]),
  rebase: new Set(["--onto", "--exec", "-x", "--strategy", "-s", "-X", "--strategy-option"]),
  checkout: new Set(["-b", "-B", "--orphan", "--conflict"]),
  switch: new Set(["-c", "-C", "--create", "--force-create", "--orphan"]),
  branch: new Set(["--set-upstream-to", "-u", "--sort", "--format", "--contains", "--merged", "--no-merged"]),
  push: new Set(["--repo", "--push-option", "-o", "--receive-pack", "--exec"]),
};

function longMatches(arg, subcommand) {
  if (!arg.startsWith("--")) return [];
  const name = arg.slice(2).split("=")[0];
  if (!name) return [];
  const names = OPTS[subcommand] ?? [];
  if (names.includes(name)) return [name];
  return names.filter((n) => n.startsWith(name));
}
const hasLong = (args, sub, canon) => args.some((a) => longMatches(a, sub).includes(canon));
const hasShort = (args, letter) => args.some((a) => /^-[A-Za-z]/.test(a) && !a.startsWith("--") && a.slice(1).includes(letter));

function positionals(args, valueOpts) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") continue;
    if (a.startsWith("-") && a !== "-") {
      if (valueOpts?.has(a)) i += 1;
      continue;
    }
    out.push(a);
  }
  return out;
}

const bare = (ref) => String(ref ?? "").replace(/^\+/, "").replace(/^refs\/heads\//, "").replace(/^(origin|upstream)\//, "");
const isProtected = (ref) => PROTECTED.has(bare(ref));

function git(cwd, args) {
  const r = spawnSync("git", args, { cwd: cwd || undefined, encoding: "utf8", timeout: 3000 });
  return r.status === 0 ? r.stdout.trim() : "";
}
const currentBranch = (cwd) => git(cwd, ["symbolic-ref", "--quiet", "--short", "HEAD"]);

function secretCandidates(cwd) {
  const out = git(cwd, ["ls-files", "--others", "--exclude-standard", "--full-name"]);
  return out ? out.split("\n").filter((p) => SECRET_NAME.some((re) => re.test(p))) : [];
}

/** Returns a deny reason for one simple command, or null. */
function judge(words, baseCwd) {
  let i = commandStart(words);
  if (words[i] !== "git") return null;
  let cwd = baseCwd;
  i += 1;
  while (i < words.length && words[i].startsWith("-")) {
    const opt = words[i];
    if (opt === "-C") {
      const dir = words[i + 1];
      if (dir) cwd = /^([A-Za-z]:)?[\\/]/.test(dir) || !cwd ? dir : `${cwd}/${dir}`;
      i += 2;
      continue;
    }
    if (opt === "-c" || opt === "--git-dir" || opt === "--work-tree" || opt === "--namespace") {
      i += 2;
      continue;
    }
    i += 1;
  }
  const sub = words[i];
  const args = words.slice(i + 1);
  if (!sub) return null;

  switch (sub) {
    case "reset":
      if (hasLong(args, "reset", "hard")) {
        return "git reset --hard discards every uncommitted change, and no commit holds them. To drop specific edits use git restore -p <path>; to undo a commit use git revert <sha> or git reset --soft <sha>. Post-edit restore points are listed by git for-each-ref refs/snapshots.";
      }
      return null;

    case "clean": {
      const force = hasLong(args, "clean", "force") || hasShort(args, "f");
      const dry = hasLong(args, "clean", "dry-run") || hasShort(args, "n");
      if (force && !dry) {
        return "git clean -f deletes untracked files permanently; nothing in git can bring them back. List them with git clean -n, then delete the specific paths by name with rm.";
      }
      return null;
    }

    case "checkout": {
      if (hasLong(args, "checkout", "force") || hasShort(args, "f")) {
        return "git checkout --force overwrites every uncommitted change in the tree. Commit or stash the work first (git stash push -m <note>), then switch.";
      }
      for (const p of positionals(args, VALUE_OPTS.checkout)) {
        if (WIPE_PATHS.has(p)) {
          return `git checkout ${p} discards every uncommitted change in the tree at once. Discard reviewed hunks with git restore -p <path>, or name the single file: git restore <path>.`;
        }
      }
      const bi = args.indexOf("-B");
      if (bi !== -1 && isProtected(args[bi + 1])) {
        return `git checkout -B ${args[bi + 1]} resets a protected branch to the current commit. Create a work branch instead: git switch -c <branch>.`;
      }
      return null;
    }

    case "switch": {
      if (hasLong(args, "switch", "discard-changes") || hasLong(args, "switch", "force") || hasShort(args, "f")) {
        return "git switch --discard-changes throws away every uncommitted change. Commit or stash first (git stash push -m <note>), then switch.";
      }
      const ci = args.indexOf("-C");
      if (ci !== -1 && isProtected(args[ci + 1])) {
        return `git switch -C ${args[ci + 1]} resets a protected branch. Create a work branch instead: git switch -c <branch>.`;
      }
      return null;
    }

    case "restore": {
      const staged = hasLong(args, "restore", "staged") || hasShort(args, "S");
      const worktree = hasLong(args, "restore", "worktree") || hasShort(args, "W");
      if (staged && !worktree) return null;
      for (const p of positionals(args, VALUE_OPTS.restore)) {
        if (WIPE_PATHS.has(p)) {
          return `git restore ${p} discards every uncommitted change in the tree at once. Name the files to revert, or review hunks with git restore -p <path>.`;
        }
      }
      return null;
    }

    case "push": {
      for (const a of args) {
        for (const c of longMatches(a, "push")) {
          if (c === "all" || c === "mirror" || c === "prune") {
            return `git push --${c} publishes or deletes refs in bulk, which is how local work branches and snapshot refs leak and how remote branches disappear. Push one branch by name: git push origin <branch>.`;
          }
        }
      }
      const lease = hasLong(args, "push", "force-with-lease") || hasLong(args, "push", "force-if-includes");
      const force = hasLong(args, "push", "force") || hasShort(args, "f");
      if (force) {
        return "git push --force overwrites remote history for every other clone and for CI. On your own work branch use git push --force-with-lease origin <branch>; main and gh-pages never take a forced push.";
      }
      let del = hasLong(args, "push", "delete") || hasShort(args, "d");
      const refs = positionals(args, VALUE_OPTS.push).slice(1);
      for (const raw of refs) {
        if (raw.startsWith("+")) {
          return `git push ${raw} is a forced push written as a refspec. Drop the leading +, or use --force-with-lease on your own work branch.`;
        }
        const dest = raw.includes(":") ? raw.slice(raw.lastIndexOf(":") + 1) : raw;
        const real = dest === "HEAD" ? currentBranch(cwd) : dest;
        if (raw.startsWith(":")) del = true;
        if (del && isProtected(real)) {
          return `Deleting ${real} on the remote removes a protected branch that the site and every stack build on. Delete only your own work branches.`;
        }
        if (lease && isProtected(real)) {
          return `A lease-checked forced push still rewrites ${real}, a protected branch. Push a work branch and open a pull request against ${real} instead.`;
        }
      }
      if (lease && refs.length === 0) {
        const cur = currentBranch(cwd);
        if (!cur || isProtected(cur)) {
          return `A forced push without a refspec targets the checked-out branch, which reads as ${cur || "unknown"} here. Name your work branch explicitly: git push --force-with-lease origin <branch>.`;
        }
      }
      return null;
    }

    case "branch": {
      const del = hasLong(args, "branch", "delete") || hasShort(args, "D") || hasShort(args, "d");
      const move = hasLong(args, "branch", "move") || hasLong(args, "branch", "copy") || hasLong(args, "branch", "force") ||
        hasShort(args, "M") || hasShort(args, "m") || hasShort(args, "C") || hasShort(args, "c") || hasShort(args, "f");
      if (!del && !move) return null;
      for (const p of positionals(args, VALUE_OPTS.branch)) {
        if (!isProtected(p)) continue;
        return del
          ? `git branch -D ${p} deletes a protected branch. Delete your own work branches by name instead.`
          : `This git branch command moves or force-resets ${p}, a protected branch. Work on a branch of your own.`;
      }
      return null;
    }

    case "rebase": {
      const control = ["abort", "continue", "skip", "quit", "edit-todo"].some((c) => hasLong(args, "rebase", c));
      if (control) return null;
      const pos = positionals(args, VALUE_OPTS.rebase);
      if (pos.length >= 2 && isProtected(pos[1])) {
        return `This rebase rewrites ${pos[1]}, a protected branch. Rebase your work branch onto it instead: git switch <work-branch> && git rebase ${pos[1]}.`;
      }
      const cur = currentBranch(cwd);
      if (cur && isProtected(cur)) {
        return `The checked-out branch is ${cur}, so this rebase would rewrite shared history. Switch to a work branch first: git switch -c <branch>.`;
      }
      return null;
    }

    case "add": {
      const pos = positionals(args);
      const named = pos.filter((p) => SECRET_NAME.some((re) => re.test(p)));
      if (named.length) {
        return `git add would stage ${named.join(", ")}, a file shaped like a secret. This repository is public and secrets never enter it; keep the file local (it is covered by .gitignore) and stage other files by name.`;
      }
      const bulk = hasLong(args, "add", "all") || hasShort(args, "A") || pos.some((p) => WIPE_PATHS.has(p));
      if (bulk) {
        const found = secretCandidates(cwd);
        if (found.length) {
          return `git add of the whole tree would stage ${found.slice(0, 5).join(", ")}, which look like secrets. This repository is public. Stage files by name (git add <path> ...) or add the secret's pattern to .gitignore.`;
        }
      }
      return null;
    }

    case "stash": {
      const verb = positionals(args)[0];
      if (verb === "drop" || verb === "clear") {
        return `git stash ${verb} discards stashed work that no commit holds. Inspect it with git stash show -p, then apply it and commit what you keep.`;
      }
      return null;
    }

    case "update-ref": {
      const del = hasLong(args, "update-ref", "delete") || hasShort(args, "d");
      const pos = positionals(args);
      if (del && pos.some((p) => p.startsWith("refs/snapshots/"))) {
        return "refs/snapshots/* are the post-edit restore points; the snapshot hook prunes them after 7 days. Deleting one by hand only loses history.";
      }
      if (pos.length && isProtected(pos[0])) {
        return `git update-ref ${pos[0]} moves or deletes a protected branch without a commit or a reason in the reflog. Work on a branch of your own.`;
      }
      return null;
    }

    case "worktree": {
      if (positionals(args)[0] === "remove" && (hasLong(args, "worktree", "force") || hasShort(args, "f"))) {
        return "git worktree remove --force deletes another working tree including its uncommitted work. Run it without --force; it refuses while the tree is dirty, which is the check you want.";
      }
      return null;
    }

    case "reflog":
      if (positionals(args)[0] === "expire" || positionals(args)[0] === "delete") {
        return "Expiring the reflog removes the record that recovers lost commits. Leave the reflog alone; git gc expires old entries on its own schedule.";
      }
      return null;

    case "gc":
      if (args.some((a) => /^--prune=now$/.test(a))) {
        return "git gc --prune=now deletes unreachable objects immediately, including work only the reflog or a snapshot still points at. Run plain git gc instead.";
      }
      return null;

    case "filter-branch":
    case "filter-repo":
      return `git ${sub} rewrites the whole history. That is the owner's call, made outside an agent session; describe what needs removing in your report instead.`;

    default:
      return null;
  }
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }
  const cmd = payload?.tool_input?.command;
  if (typeof cmd !== "string" || !cmd.includes("git")) process.exit(0);
  const cwd = typeof payload.cwd === "string" ? payload.cwd.replace(/\\/g, "/") : "";
  let parsed;
  try {
    parsed = splitCommands(cmd);
  } catch {
    process.exit(0);
  }
  for (const words of parsed.commands) {
    if (ALLOWED_EXACT.has(words.join(" "))) continue;
    let reason = null;
    try {
      reason = judge(words, cwd);
    } catch {
      reason = null;
    }
    if (!reason) continue;
    if (parsed.unbalanced) reason += " (The command has an unclosed quote, so it may have been split differently than intended.)";
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
      }) + "\n",
    );
    break;
  }
  process.exit(0);
});
