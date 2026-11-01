#!/usr/bin/env node
/**
 * check-secrets.mjs: the public-repo hygiene scan.
 *
 * Starshot is a public repository, so anything committed is published: a token, a
 * personal email, an absolute path naming a person's machine, or the name of one of the
 * owner's private projects. This check scans every tracked and every untracked,
 * non-ignored text file (so it bites before the commit, not after the push), plus the
 * file paths themselves.
 *
 * Private project names come from a local, never-committed list (see
 * loadPrivateNameHashes below), so this public file does not reveal them. Text is split
 * into words and every word, and every pair of adjacent words joined with and without a
 * hyphen, is hashed and compared against that list.
 *
 * third_party/astlo/** is excluded: it is upstream content pinned byte-for-byte by
 * check-third-party-untouched.mjs (D2), so nothing can enter it through this repo.
 * python/astlo/astlo/ and python/astlo/astlo-*.dist-info/ are Mark's astlo source and
 * metadata with Starshot's fixes (D10). His own published contact addresses in those
 * files are upstream content, so only the email rule is skipped there; every other rule
 * (keys, tokens, personal paths, private names) still applies to them.
 * Findings are printed redacted, because CI logs of a public repository are public too.
 *
 * Usage: node scripts/check-secrets.mjs            scan the working tree
 *        <text> | node scripts/check-secrets.mjs --stdin   scan a commit message or PR body
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, readdirSync } from "node:fs";
import { resolve, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXCLUDE_PREFIXES = ["third_party/astlo/"];
/** Files whose emails are upstream content (D10): Mark's astlo code and wheel metadata only. */
const EMAIL_EXEMPT = [/^python\/astlo\/astlo\//, /^python\/astlo\/astlo-[^/]+\.dist-info\//];
const BINARY_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".ico", ".bmp", ".whl", ".zip", ".gz", ".tgz",
  ".woff", ".woff2", ".ttf", ".otf", ".eot", ".pdf", ".mp3", ".mp4", ".ogg", ".wav", ".webm", ".wasm", ".glb",
]);
const MAX_BYTES = 2_000_000;

// The owner's private-project names are NOT stored in this public repo, not even
// hashed (short names can be brute-forced from their hashes). They are read at runtime
// from a local, never-committed list: the file .git/info/private-names (one name per
// line) and/or the STARSHOT_PRIVATE_NAMES environment variable (comma-separated, e.g.
// from a CI secret). Without either, this one rule is off and the summary says so.
function loadPrivateNameHashes() {
  const names = [];
  try {
    const gitDir = execFileSync("git", ["rev-parse", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).trim();
    const file = resolve(ROOT, gitDir, "info", "private-names");
    names.push(...readFileSync(file, "utf8").split(/\r?\n/));
  } catch {
    // no local list
  }
  names.push(...(process.env.STARSHOT_PRIVATE_NAMES ?? "").split(","));
  const hashes = new Set();
  for (const raw of names) {
    const name = raw.trim().toLowerCase();
    if (!name || name.startsWith("#")) continue;
    for (const form of new Set([name, name.replace(/[\s_-]+/g, ""), name.replace(/[\s_]+/g, "-")])) {
      hashes.add(createHash("sha256").update(form).digest("hex"));
    }
  }
  return hashes;
}
const PRIVATE_NAME_HASHES = loadPrivateNameHashes();
// Self-test canary: a nonsense token whose hash proves the word pipeline works.
const CANARY_HASH = "33b18f41a75a816c0ff56568ec0348220f8090f12b48a5cbb4a6ca1cef11e2d8";

const ALLOWED_EMAILS = new Set(["noreply@anthropic.com", "noreply@github.com", "git@github.com"]);
const ALLOWED_EMAIL_SUFFIXES = ["@users.noreply.github.com", "@example.com", "@example.org", "@example.net"];
const ALLOWED_EMAIL_LOCALS = new Set(["noreply", "no-reply"]);

/** Content rules. `sample` builds a positive example at runtime for the self-test. */
const RULES = [
  { id: "private-key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/g, sample: () => "-----BEGIN " + "PRIVATE KEY-----" },
  { id: "aws-access-key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, sample: () => "AKIA" + "Q".repeat(16) },
  { id: "google-api-key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g, sample: () => "AIza" + "x".repeat(35) },
  { id: "gcp-service-account", re: /"type"\s*:\s*"service_account"|"private_key_id"\s*:/g, sample: () => '"type": "service' + '_account"' },
  { id: "google-oauth-secret", re: /\bGOCSPX-[0-9A-Za-z_-]{20,}/g, sample: () => "GOCSPX-" + "a".repeat(24) },
  { id: "firebase-config", re: /\b[a-z0-9-]+\.(?:firebaseapp\.com|firebaseio\.com|appspot\.com)\b|\bmessagingSenderId\s*[:=]/g, sample: () => "demo-app.firebase" + "app.com" },
  { id: "stripe-secret", re: /\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}|\bwhsec_[0-9A-Za-z]{20,}/g, sample: () => "sk_" + "live_" + "a".repeat(24) },
  { id: "github-token", re: /\bgh[pousr]_[0-9A-Za-z]{36,}\b|\bgithub_pat_[0-9A-Za-z_]{22,}/g, sample: () => "ghp_" + "a".repeat(36) },
  { id: "slack-token", re: /\bxox[abprs]-[0-9A-Za-z-]{10,}|hooks\.slack\.com\/services\/T[0-9A-Z]+/g, sample: () => "xoxb-" + "1234567890-abc" },
  { id: "npm-token", re: /\bnpm_[0-9A-Za-z]{36}\b|_authToken\s*=\s*[^\s$]/g, sample: () => "npm_" + "a".repeat(36) },
  { id: "llm-api-key", re: /\bsk-(?:ant-|proj-)?[0-9A-Za-z_-]{32,}/g, sample: () => "sk-ant-" + "a".repeat(40) },
  { id: "jwt", re: /\beyJ[0-9A-Za-z_-]{10,}\.eyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}/g, sample: () => "eyJ" + "a".repeat(12) + ".eyJ" + "b".repeat(12) + "." + "c".repeat(12) },
  { id: "credential-in-url", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@"'`]+:[^\s/@"'`]+@[^\s/]+/gi, sample: () => "https://user:hunter2" + "@" + "host.invalid" },
  {
    id: "personal-path",
    re: /(?<![A-Za-z0-9])[A-Za-z]:[\\/]+(?![\\/])(?:[Uu]sers|repos|dev|src|code|projects|Documents)[\\/]+[^\s"'`<>\\/]+|(?<![\w.~-])\/(?:mnt\/)?[a-zA-Z]\/(?:[Uu]sers|repos)\/[^\s"'`<>/]+|(?<![\w.~-])\/Users\/(?!Shared\b)[A-Za-z0-9._-]+|(?<![\w.~-])\/home\/[a-z_][a-z0-9_.-]*|\/data\/data\/com\.termux\/files\/(?:home)\b/g,
    sample: () => "/home/" + "someone/x",
  },
];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const SECRET_FILES = [
  /(^|\/)\.env(\.(?!example$)[^/]+)?$/i,
  /\.(pem|key|p12|pfx|keystore|jks)$/i,
  /(^|\/)service-account[^/]*\.json$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
];

const sha = (s) => createHash("sha256").update(s).digest("hex");
const hashCache = new Map();
function isPrivate(token, extra) {
  let h = hashCache.get(token);
  if (h === undefined) hashCache.set(token, (h = sha(token)));
  return PRIVATE_NAME_HASHES.has(h) || (extra !== undefined && extra === h);
}
/** First private-name token in a line, or null. */
function privateToken(line, extra) {
  const words = line.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.length >= 4 && isPrivate(w, extra)) return w;
    const n = words[i + 1];
    if (n !== undefined && w.length + n.length >= 4) {
      if (isPrivate(w + n, extra)) return w + n;
      if (isPrivate(`${w}-${n}`, extra)) return `${w}-${n}`;
    }
  }
  return null;
}
const redact = (s) => (s.length <= 4 ? "****" : `${s.slice(0, 4)}…(${s.length} chars)`);
const redactName = (s) => `${s[0]}${"*".repeat(Math.max(2, s.length - 1))}`;
const redactEmail = (s) => `${s[0]}***@${s.split("@")[1]}`;

function emailAllowed(e) {
  const lower = e.toLowerCase();
  if (ALLOWED_EMAILS.has(lower)) return true;
  if (ALLOWED_EMAIL_SUFFIXES.some((s) => lower.endsWith(s))) return true;
  if (ALLOWED_EMAIL_LOCALS.has(lower.split("@")[0])) return true;
  // Retina asset names such as icon@2x.png match the email shape; they are not addresses.
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(lower);
}

function scanText(label, text, findings, extra, { emails = true } = {}) {
  const lines = text.split(/\r?\n/);
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      const m = rule.re.exec(line);
      if (m) findings.push(`${label}:${n + 1}: ${rule.id} (${redact(m[0])})`);
    }
    EMAIL.lastIndex = 0;
    for (const m of emails ? line.matchAll(EMAIL) : []) {
      if (!emailAllowed(m[0])) findings.push(`${label}:${n + 1}: email address (${redactEmail(m[0])})`);
    }
    const t = privateToken(line, extra);
    if (t) findings.push(`${label}:${n + 1}: private project name (${redactName(t)})`);
  }
}

function selfTest() {
  const problems = [];
  for (const rule of RULES) {
    const f = [];
    scanText("self-test", `x ${rule.sample()} y`, f);
    if (!f.some((x) => x.includes(rule.id))) problems.push(`rule ${rule.id} does not match its own sample`);
  }
  const f = [];
  scanText("self-test", "contact " + "someone" + "@" + "personal.example-mail.net", f);
  if (!f.length) problems.push("email detection did not fire on a personal address");
  // The D10 email exemption covers Mark's astlo files only, never Starshot's files beside them.
  const exempt = (p) => EMAIL_EXEMPT.some((re) => re.test(p));
  if (!exempt("python/astlo/astlo/__init__.py") || !exempt("python/astlo/astlo-12.5.5130000.dist-info/METADATA")) {
    problems.push("the astlo email exemption does not cover Mark's files");
  }
  for (const p of ["python/astlo/README.md", "python/astlo/bench/hz.py", "python/astlo/tests/x.py", "python/astlo/astlo-x/y", "packages/astlo/astlo/z"]) {
    if (exempt(p)) problems.push(`the astlo email exemption also covers ${p}`);
  }
  const g = [];
  scanText("self-test", "notes about ZqxHygieneCanary here", g, CANARY_HASH);
  if (!g.some((x) => x.includes("private project name"))) problems.push("hashed-name detection did not fire on the canary");
  return problems;
}

function listFiles() {
  try {
    const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
    return [...new Set(out.split("\0").filter(Boolean))];
  } catch {
    // No git: walk the tree, skipping what .gitignore would normally hide.
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if ([".git", "node_modules", "dist", "coverage", ".vite"].includes(e.name)) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else out.push(relative(ROOT, p).replace(/\\/g, "/"));
      }
    };
    walk(ROOT);
    return out;
  }
}

const problems = selfTest();
if (problems.length) {
  console.error("secrets: self-test FAILED, so a clean result would mean nothing:");
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}

const findings = [];
let scanned = 0;
if (process.argv.includes("--stdin")) {
  scanText("<stdin>", readFileSync(0, "utf8"), findings);
  scanned = 1;
} else {
  for (const rel of listFiles()) {
    if (EXCLUDE_PREFIXES.some((p) => rel.startsWith(p))) continue;
    if (SECRET_FILES.some((re) => re.test(rel))) findings.push(`${rel}: a file shaped like a secret is in the tree`);
    scanText(`${rel} (path)`, rel, findings);
    if (BINARY_EXT.has(extname(rel).toLowerCase())) continue;
    let buf;
    try {
      const abs = resolve(ROOT, rel);
      if (statSync(abs).size > MAX_BYTES) continue;
      buf = readFileSync(abs);
    } catch {
      continue; // deleted in the working tree but still in the index
    }
    if (buf.subarray(0, 8000).includes(0)) continue;
    scanned++;
    scanText(rel, buf.toString("utf8"), findings, undefined, { emails: !EMAIL_EXEMPT.some((re) => re.test(rel)) });
  }
  if (scanned === 0) {
    console.error("secrets: FAILED, zero files scanned; the file listing is broken, so a pass would be vacuous.");
    process.exit(1);
  }
}

if (findings.length) {
  console.error(`secrets: FAILED, ${findings.length} finding(s) in a public repository:`);
  for (const f of findings) console.error(`  ✗ ${f}`);
  console.error("Remove the value (rotate it if it was a credential), use a placeholder such as <name> or");
  console.error("an @example.com address, and rephrase private names. See .claude/rubrics/public-repo-hygiene.md.");
  process.exit(1);
}
const nameRule = PRIVATE_NAME_HASHES.size > 0 ? `${PRIVATE_NAME_HASHES.size} private-name hashes from the local list` : "private-name rule off: no local list";
console.log(`secrets: ${scanned} file(s) clean (${RULES.length} rules, emails, personal paths, ${nameRule})`);
