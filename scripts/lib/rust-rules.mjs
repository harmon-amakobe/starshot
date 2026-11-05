/**
 * rust-rules.mjs: the crates/ rules of the size gate (scripts/check-file-size.mjs, PR6).
 *
 * Layering: a Rust file reads other files only through include_str!, include_bytes!,
 * include! and #[path] (also inside cfg_attr), and none of them may reach python/ or
 * third_party/ (D2, D10). Any of the three bracket pairs and raw strings count, and a
 * concat! fails when any piece names one of those directories, whatever it is joined to.
 *
 * The D16 fence: clippy.toml's disallowed methods and the workspace's forbidden unsafe
 * code. These fail, because each would switch part of it off without touching a gate:
 *  - a Rust attribute (cfg_attr included) that allows or expects
 *    clippy::disallowed_methods, clippy::style, clippy::all, unsafe_code or warnings;
 *  - a crates/<name>/Cargo.toml without [lints] workspace = true;
 *  - a lints entry in any Cargo.toml ([workspace.lints.clippy], [lints.clippy], dotted
 *    or inline) that names disallowed_methods, style or all;
 *  - a root Cargo.toml without [workspace.lints.rust] unsafe_code = "forbid";
 *  - any clippy.toml or .clippy.toml but the root's clippy.toml, and any .cargo/config
 *    or .cargo/config.toml, since clippy and cargo read those per directory.
 * Not seen: RUSTFLAGS or CLIPPY_CONF_DIR set in a workflow, and cargo config outside the
 * repository; review and CI's clean runners cover those.
 *
 * rustSelfTest() runs the cases below through the same functions the scan uses.
 */
import { posix } from "node:path";

// A string literal at the cursor: raw (r"", r#""#, and so on) or plain with escapes.
const STRING_AT = /r(#*)"([\s\S]*?)"\1|"((?:[^"\\]|\\[\s\S])*)"/y;
const CLOSE = { "(": ")", "[": "]", "{": "}" };
const BLOCKED = /^(?:\.\.\/)*(?:python|third_party)(?:\/|$)/;
const SEGMENT = /(?:^|\/)(?:python|third_party)(?:\/|$)/;
const ALLOWS = /\b(?:allow|expect)\s*\(([^)]*)\)/g;
const GUARDED = /\b(?:clippy::(?:disallowed_methods|style|all)|unsafe_code|warnings)\b/;
const GUARDED_CLIPPY = "(?:disallowed_methods|style|all)";
const STRAY_CONFIG = /(?:^|\/)(?:\.?clippy\.toml|\.cargo\/config(?:\.toml)?)$/;

/** The literal at `i`, as [its length in the source, its text], or null. */
function stringAt(text, i) {
  if (text[i] === "r" && /\w/.test(text[i - 1] ?? "")) return null;
  STRING_AT.lastIndex = i;
  const m = STRING_AT.exec(text);
  if (!m) return null;
  const body = m[2] ?? m[3].replace(/\\\n\s*/g, "").replace(/\\(.)/g, "$1");
  return [m[0].length, body];
}

/** From the bracket at `open`, the text up to its partner, with literals skipped. */
function bracketed(text, open) {
  const stack = [];
  for (let j = open; j < text.length; j++) {
    const s = text[j] === '"' || text[j] === "r" ? stringAt(text, j) : null;
    if (s) j += s[0] - 1;
    else if (CLOSE[text[j]]) stack.push(CLOSE[text[j]]);
    else if (text[j] === stack.at(-1) && (stack.pop(), stack.length === 0)) return text.slice(open + 1, j);
  }
  return text.slice(open + 1);
}

/** Every string literal in a fragment, in order. */
function strings(text) {
  const out = [];
  for (let j = 0; j < text.length; j++) {
    const s = text[j] === '"' || text[j] === "r" ? stringAt(text, j) : null;
    if (s) {
      out.push(s[1]);
      j += s[0] - 1;
    }
  }
  return out;
}

/** Layering and lint-switch problems for one Rust file under crates/. */
export function rustFindings(file, text) {
  const problems = [];
  const refs = [];
  for (const m of text.matchAll(/\b(include_str|include_bytes|include)\s*!\s*([([{])/g)) {
    const arg = bracketed(text, m.index + m[0].length - 1);
    const manifest = /\benv\s*!\s*[([{]\s*"CARGO_MANIFEST_DIR"/.test(arg);
    const pieces = strings(arg.replace(/\benv\s*!\s*[([{]\s*"[^"]*"\s*[)\]}]/g, ""));
    refs.push({ what: `${m[1]}!`, pieces, concat: /\bconcat\s*!/.test(arg), manifest });
  }
  // Attributes, cfg_attr included: a path, or a lint switched off. Only attributes are
  // read, so an ordinary .expect("...") call is never taken for one.
  for (const m of text.matchAll(/#!?\s*\[/g)) {
    const attr = bracketed(text, m.index + m[0].length - 1);
    for (const p of attr.matchAll(/\bpath\s*=\s*/g)) {
      const s = stringAt(attr, p.index + p[0].length);
      if (s) refs.push({ what: "#[path]", pieces: [s[1]], concat: false, manifest: false });
    }
    for (const a of attr.matchAll(ALLOWS)) {
      if (GUARDED.test(a[1])) problems.push(`${file}: ${a[0]} switches off a D16 guard; remove it and fix the code it hid`);
    }
  }
  for (const r of refs) {
    const joined = r.pieces.join("");
    const from = r.manifest ? file.split("/").slice(0, 2).join("/") : posix.dirname(file);
    const blocked = BLOCKED.test(posix.normalize(posix.join(from, joined))) || (r.concat && r.pieces.some((p) => SEGMENT.test(p)));
    if (blocked) problems.push(`${file}: ${r.what} reaches ${joined}, inside python/ or third_party/ (D2, D10)`);
  }
  return problems;
}

/** A crate manifest must take the workspace lints. */
export function crateManifest(file, text) {
  const lints = /^\[lints\][ \t]*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(text);
  if (lints && /^\s*workspace\s*=\s*true\s*$/m.test(lints[1])) return [];
  return [`${file}: needs a [lints] table with workspace = true, so the workspace's forbid(unsafe_code) applies (D16)`];
}

/** Any clippy or cargo config but the root's clippy.toml: either could switch the fence off. */
export function strayConfig(file) {
  if (file === "clippy.toml" || !STRAY_CONFIG.test(file)) return [];
  return [`${file}: a second clippy or cargo config can switch off the D16 fence; delete it and keep clippy.toml at the root only`];
}

/** Each key = value of a TOML text as [dotted path from the root, value]; comments dropped. */
function tomlEntries(text) {
  const entries = [];
  let table = "";
  const unquote = (k) => k.split(/\s*\.\s*/).map((part) => part.replace(/^"(.*)"$/, "$1")).join(".");
  for (const raw of text.split("\n")) {
    const line = raw.replace(/^((?:[^"#]|"(?:[^"\\]|\\.)*")*)#.*$/, "$1").trim();
    const header = /^\[\[?\s*([^\]]+?)\s*\]\]?$/.exec(line);
    if (header) table = unquote(header[1]);
    const kv = /^((?:"[^"]*"|[\w-]+)(?:\s*\.\s*(?:"[^"]*"|[\w-]+))*)\s*=\s*(.*)$/.exec(line);
    if (kv) entries.push([table ? `${table}.${unquote(kv[1])}` : unquote(kv[1]), kv[2]]);
  }
  return entries;
}

/** A Cargo.toml may not lower a guarded clippy lint, and the root keeps unsafe code forbidden. */
export function manifestLints(file, text) {
  const problems = [];
  const entries = tomlEntries(text);
  const named = new RegExp(`^(?:workspace\\.)?lints\\.clippy\\.${GUARDED_CLIPPY}$`);
  const inline = new RegExp(`^(?:workspace\\.)?lints(?:\\.clippy)?$`);
  const inlineNamed = new RegExp(`\\b${GUARDED_CLIPPY}\\s*=`);
  for (const [path, value] of entries) {
    if (named.test(path) || (inline.test(path) && value.startsWith("{") && inlineNamed.test(value))) {
      problems.push(`${file}: ${path} sets a lint that holds clippy::disallowed_methods; leave it at its default (D16)`);
    }
  }
  const forbid = entries.some(([path, value]) => (path === "workspace.lints.rust.unsafe_code" && value === '"forbid"')
    || (path === "workspace.lints.rust" && /\bunsafe_code\s*=\s*"forbid"/.test(value)));
  if (file === "Cargo.toml" && !forbid) problems.push('Cargo.toml: needs [workspace.lints.rust] unsafe_code = "forbid" (D16)');
  return problems;
}

/** The fence over a whole file listing: stray configs, every Cargo.toml, and a root one. */
export function fenceFindings(listed, read) {
  const problems = listed.flatMap((f) => [...strayConfig(f), ...(/(^|\/)Cargo\.toml$/.test(f) ? manifestLints(f, read(f)) : [])]);
  const crates = listed.some((f) => /^crates\/[^/]+\/Cargo\.toml$/.test(f));
  if (crates && !listed.includes("Cargo.toml")) problems.push("Cargo.toml is missing, so no workspace lints reach the crates (D16)");
  return problems;
}

// Each case is a Rust line as if in crates/demo/src/lib.rs, and how many problems it raises.
const RUST_CASES = [
  ['include_str!("../../../python/x.py")', 1],
  ['include_bytes!["../../../third_party/x.bin"]', 1],
  ['include!{"../../../python/x.rs"}', 1],
  ['include_str!(r"../../../python/x.txt")', 1],
  ['include_str!(r#"../../../third_party/x"#)', 1],
  ['include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../python/x"))', 1],
  ['include_str!(concat!("../../../pyth", "on/x"))', 1],
  ['include_bytes!(concat!(env!("OUT_DIR"), "/third_party/x"))', 1],
  ['#[path = "../../../python/x.rs"] mod a;', 1],
  ['#[path = r"../../../third_party/x.rs"] mod b;', 1],
  ['#[cfg_attr(all(unix, test), path = r#"../../../python/y.rs"#)] mod c;', 1],
  ["#[allow(clippy::disallowed_methods)] fn f() {}", 1],
  ["#![allow(dead_code, unsafe_code)]", 1],
  ['include_str!("../../../fixtures/math/golden.json")', 0],
  ['#[path = "../examples/gen.rs"] mod d;', 0],
  ["#[allow(dead_code)] fn g() {}", 0],
  ['#[cfg_attr(test, expect(clippy::all))] fn h() {}', 1],
  ['fn k() { x.expect("no warnings"); }', 0],
  ["#![allow(warnings)]", 1],
  ["#[expect(clippy::style)] fn m() {}", 1],
];
const MANIFEST_CASES = [
  ['[package]\nname = "x"\n\n[lints]\nworkspace = true\n', 0],
  ['[package]\nname = "x"\n', 1],
  ["[lints]\nworkspace = false\n", 1],
];
const ROOT_OK = '[workspace.lints.rust]\nunsafe_code = "forbid"\n';
// Each case is a file, its text and how many problems manifestLints and strayConfig raise.
const CONFIG_CASES = [
  ["Cargo.toml", ROOT_OK, 0],
  ["Cargo.toml", `${ROOT_OK}\n[workspace.lints.clippy]\ndisallowed_methods = "allow"\n`, 1],
  ["Cargo.toml", `${ROOT_OK}[workspace.lints]\nclippy = { all = "allow" }\n`, 1],
  ["Cargo.toml", `${ROOT_OK}[workspace.lints]\nclippy = { pedantic = "warn" } # not all = "allow"\n`, 0],
  ["Cargo.toml", `${ROOT_OK}[workspace.lints.clippy]\n# style = "allow" stays a comment\npedantic = "warn" # all = "allow"\n`, 0],
  ["Cargo.toml", '[workspace.lints.rust]\nunsafe_code = "deny"\n', 1],
  ["Cargo.toml", "[workspace]\nmembers = []\n", 1],
  ["crates/demo/Cargo.toml", '[lints.clippy]\nstyle = "allow"\n', 1],
  ["crates/demo/Cargo.toml", '[lints]\nclippy.disallowed_methods = "allow"\n', 1],
  ["crates/demo/Cargo.toml", '[lints]\n"clippy"."all" = "allow" # quoted\n', 1],
  ["crates/demo/Cargo.toml", '[lints.clippy]\npedantic = "warn"\n', 0],
  ["clippy.toml", "", 0],
  [".clippy.toml", "", 1],
  ["crates/demo/clippy.toml", "", 1],
  ["crates/demo/.clippy.toml", "", 1],
  [".cargo/config.toml", "", 1],
  [".cargo/config", "", 1],
  ["crates/demo/.cargo/config.toml", "", 1],
];

/** Problems with the rules themselves, and the number of cases run. */
export function rustSelfTest() {
  const problems = [];
  for (const [text, want] of RUST_CASES) {
    const got = rustFindings("crates/demo/src/lib.rs", text).length;
    if (got !== want) problems.push(`rust rule case ${text}: ${got} problem(s), expected ${want}; fix scripts/lib/rust-rules.mjs`);
  }
  for (const [text, want] of MANIFEST_CASES) {
    const got = crateManifest("crates/demo/Cargo.toml", text).length;
    if (got !== want) problems.push(`manifest case ${JSON.stringify(text)}: ${got} problem(s), expected ${want}; fix crateManifest`);
  }
  for (const [file, text, want] of CONFIG_CASES) {
    const got = (file.endsWith("Cargo.toml") ? manifestLints(file, text) : strayConfig(file)).length;
    if (got !== want) problems.push(`config case ${file} ${JSON.stringify(text)}: ${got} problem(s), expected ${want}; fix manifestLints or strayConfig`);
  }
  const files = { "Cargo.toml": ROOT_OK, "crates/demo/Cargo.toml": "[lints]\nworkspace = true\n" };
  const fence = (listed, root = ROOT_OK) => fenceFindings(listed, (f) => (f === "Cargo.toml" ? root : files[f] ?? "")).length;
  const all = Object.keys(files);
  const caught = [fence([...all, "crates/demo/clippy.toml"]), fence(["crates/demo/Cargo.toml"]), fence(all, "[workspace]\n")];
  if (fence(all) !== 0 || caught.some((n) => n !== 1)) {
    problems.push("fenceFindings: a clean listing passes; a stray clippy.toml, no root Cargo.toml or a root without the forbid fails");
  }
  return { cases: RUST_CASES.length + MANIFEST_CASES.length + CONFIG_CASES.length + 3, problems };
}
