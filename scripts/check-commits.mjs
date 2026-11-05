#!/usr/bin/env node
/**
 * check-commits.mjs: the secrets scan over the branch's commit identities and messages.
 *
 * A push publishes every commit message and identity, and history keeps them after a
 * later commit deletes the file they described, so the tree scan alone misses a token
 * pasted into a message or a personal address in git's settings. Every commit in
 * <base>..HEAD goes through check-secrets.mjs --stdin as "author <email>",
 * "committer <email>" and its full message; any finding fails. A commit with no
 * Signed-off-by: line only warns, because the DCO app is the enforcement (D24).
 *
 * Usage: node scripts/check-commits.mjs [--base <ref>]
 * Base: --base, else origin/$GITHUB_BASE_REF, else origin/main. On main, or without an
 * origin/main, there is no range: it passes and says so. A base that was asked for and
 * does not resolve fails, so a pull request never passes by scanning nothing.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runGate } from "./lib/gate-fail.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SECRETS = resolve(ROOT, "scripts/check-secrets.mjs");
const SIGNED_OFF = /^Signed-off-by:\s*\S.*<[^<>\s]+@[^<>\s]+>\s*$/m;
const IDENTITY = "%an <%ae>%n%cn <%ce>";
const IDENTITY_LINES = 2;
const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "pipe"] });

export const hasSignOff = (text) => SIGNED_OFF.test(text);

/**
 * One check-secrets run over every commit's text, line by line, so a finding at stdin
 * line N names the commit that owns line N, and whether it sits in an identity line. The
 * scanner reads lines one at a time, so joining the commits creates no match across two.
 */
export function scanCommits(list) {
  const lines = [];
  const owner = [];
  for (const c of list) {
    for (const [k, l] of c.text.replace(/\n+$/, "").split("\n").entries()) {
      lines.push(l);
      owner.push({ sha: c.sha, identity: k < IDENTITY_LINES });
    }
  }
  const r = spawnSync(process.execPath, [SECRETS, "--stdin"], { cwd: ROOT, input: lines.join("\n"), encoding: "utf8" });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const hits = [...output.matchAll(/<stdin>:(\d+): (.*)/g)].map(([, n, what]) => ({ ...owner[n - 1], what }));
  const findings = hits.map((h) => `commit ${String(h.sha).slice(0, 12)}${h.identity ? " (author or committer)" : ""}: ${h.what}`);
  // check-secrets says in its pass line whether the private-name list was there.
  const nameRule = /private-name rule off[^)]*|\d+ private-name hashes[^)]*/.exec(output)?.[0] ?? null;
  return { ok: r.status === 0 && !r.error, findings, identity: hits.some((h) => h.identity), message: hits.some((h) => !h.identity), nameRule, output };
}

function commitsIn(...revs) {
  return git(["log", "-z", `--format=%H%x1f%P%x1f${IDENTITY}%n%B`, ...revs])
    .split("\0")
    .filter(Boolean)
    .map((rec) => {
      const [sha, parents, ...rest] = rec.split("\x1f");
      return { sha, merge: parents.trim().split(/\s+/).length > 1, text: rest.join("\x1f") };
    });
}

function selfTest() {
  const problems = [];
  const token = `ghp_${"b".repeat(36)}`;
  const planted = { sha: "a".repeat(40), text: `Ann <ann@example.com>\nfix: a thing\n\nkey ${token}\n` };
  const clean = { sha: "c".repeat(40), text: "Bo <bo@example.com>\ndocs: a thing\n\nSigned-off-by: Bo <bo@example.com>\n" };
  const both = scanCommits([clean, planted]);
  if (both.ok || !both.findings.some((f) => f.startsWith("commit aaaaaaaaaaaa: ") && f.includes("github-token"))) {
    problems.push("a token planted in a commit message was not found, or not traced to its commit");
  }
  if (!scanCommits([clean]).ok) problems.push("a clean commit message failed the scan");
  if (hasSignOff(planted.text) || !hasSignOff(clean.text)) problems.push("Signed-off-by: detection");
  // Built in pieces, so this file does not hold the personal-looking address itself.
  const committer = scanCommits([{ sha: "d".repeat(40), text: `Bo <bo@example.com>\nCy <cy${"@"}personal-mail.net>\nfix: a thing\n` }]);
  if (committer.ok || !committer.identity || committer.message) {
    problems.push("a personal committer address was not found, or not traced to the identity lines");
  }
  // The author and the committer are scanned too: they open each commit's text.
  const [head] = commitsIn("-1", "HEAD");
  // A literal format, not IDENTITY, so a change to IDENTITY cannot also change the answer.
  const scanned = head?.text.split("\n").slice(0, IDENTITY_LINES).join("\n");
  if (scanned !== git(["log", "-1", "--format=%an <%ae>%n%cn <%ce>", "HEAD"]).trim()) {
    problems.push("the author and committer lines do not open the text that is scanned");
  }
  return problems;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length && (args[0] !== "--base" || !args[1] || args.length > 2)) {
    console.error("commits: unknown argument. Usage: node scripts/check-commits.mjs [--base <ref>]");
    process.exit(2);
  }
  const problems = selfTest();
  if (problems.length) {
    console.error(`commits: self-test FAILED, so a clean result would mean nothing:\n  ✗ ${problems.join("\n  ✗ ")}`);
    process.exit(1);
  }
  const asked = args[1] ?? (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null);
  const base = asked ?? "origin/main";
  try {
    git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
  } catch {
    if (asked) {
      console.error(`commits: FAILED, cannot resolve the base ${base}; fetch it, or check out with fetch-depth: 0.`);
      process.exit(1);
    }
    console.log(`commits: no ${base} here, so there is no range to scan; nothing checked`);
    return;
  }
  // On a pull request, Actions checks out GitHub's test merge commit, whose author nobody
  // can amend; scan the pull request's own head instead. Merges a contributor made stay in.
  const testMerge = process.env.GITHUB_EVENT_NAME === "pull_request" && commitsIn("-1", "HEAD")[0]?.merge;
  const tip = testMerge ? "HEAD^2" : "HEAD";
  const list = commitsIn(`${base}..${tip}`);
  if (!list.length) return console.log(`commits: no commits in ${base}..${tip}, so nothing to scan (on ${base} itself, this is expected)`);
  const scan = scanCommits(list);
  // A merge commit made by GitHub for a pull request has no sign-off and needs none.
  const unsigned = list.filter((c) => !c.merge && !hasSignOff(c.text));
  for (const c of unsigned) {
    const message = `commit ${c.sha.slice(0, 12)} has no Signed-off-by: line; the DCO check flags it once the DCO app is installed (D24)`;
    console.log(process.env.GITHUB_ACTIONS === "true" ? `::warning title=commits::${message}` : `  ! ${message}`);
  }
  if (!scan.ok) {
    console.error(`commits: FAILED, the secrets scan found a problem in ${base}..${tip}:`);
    for (const f of scan.findings) console.error(`  ✗ ${f}`);
    if (!scan.findings.length) console.error(scan.output.trimEnd());
    if (scan.identity) {
      console.error("Author or committer: set user.email to your GitHub noreply address (GitHub, Settings, Emails), then run "
        + "git commit --amend --reset-author, or for a branch git rebase --exec 'git commit --amend --no-edit --reset-author' <base>. "
        + "For an orchestrator commit, redo the stacked-pr publish recipe instead, which keeps the owner as author (D24).");
    }
    if (scan.message || !scan.findings.length) {
      console.error("Message: reword the commit before it is pushed (git commit --amend, or a rebase); rotate any real credential.");
    }
    process.exit(1);
  }
  console.log(`commits: ${list.length} commit(s) in ${base}..${tip} clean `
    + `(authors, committers and messages; ${scan.nameRule ?? "private-name rule state not reported"}); ${unsigned.length} without a sign-off`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runGate("commits", ROOT, main, "run it in a git checkout with at least one commit, and pass --base <ref> to scan a branch");
}
