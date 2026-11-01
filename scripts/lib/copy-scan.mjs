/**
 * Text extraction and matching for scripts/check-copy-tells.mjs (D27).
 *
 * Each extractor turns a source into units: { line, col, text, raw, block }. `text` keeps
 * the columns of the original line where it can, so a finding points at the real
 * character; `raw` is the untouched source line, read only for a `copy-ok:` marker;
 * units sharing a `block` form one paragraph for the sentence checks. Code, URLs and
 * comments are blanked rather than deleted, which is what keeps the columns honest.
 */

export const KINDS = ["md", "ui", "yaml", "pr", "issue", "comment", "commit"];
const COPY_OK = /copy-ok:\s*\S/;
const TRAILER = /^(?:Co-Authored-By|Claude-Session|Signed-off-by|Assisted-by):/i;
const blank = (s) => s.replace(/[^\n]/g, " ");

/** Inline code, link targets and bare URLs become spaces of the same length. */
export function stripInline(t) {
  return t
    .replace(/(`+)[^`]*?\1/g, blank)
    .replace(/(\]\()([^)]*)\)/g, (m, a, url) => `${a}${blank(url)})`)
    .replace(/^(\s*\[[^\]]+\]:\s*)(\S+)/, (m, a, url) => a + blank(url))
    .replace(/<https?:\/\/[^>]*>|https?:\/\/[^\s)>\]]+/g, blank);
}

export function markdownUnits(source) {
  const raw = source.replace(/\r\n?/g, "\n").split("\n");
  const lines = raw.join("\n").replace(/<!--[\s\S]*?-->/g, blank).split("\n");
  const out = [];
  let block = 0;
  let fence = null;
  let front = /^---\s*$/.test(lines[0] ?? "");
  for (let i = front ? 1 : 0; i < lines.length; i++) {
    const line = lines[i];
    if (front) {
      if (/^---\s*$/.test(line)) front = false;
      else if (line.trim()) out.push({ line: i + 1, col: 1, text: line, raw: raw[i], block: ++block, front: true });
      continue;
    }
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      block++;
      continue;
    }
    if (f) {
      fence = f[1];
      block++;
      continue;
    }
    const text = stripInline(line);
    if (!text.trim()) {
      block++;
      continue;
    }
    const heading = /^\s{0,3}#{1,6}\s/.test(text);
    const table = /^\s*\|/.test(text);
    if (heading || table || /^\s*(?:[-*+]|\d+[.)])\s+/.test(text)) block++;
    out.push({ line: i + 1, col: 1, text, raw: raw[i], block, heading, table });
    if (heading || table) block++;
  }
  return out;
}

/** A commit message: Markdown rules, without trailers or git's comment lines. */
export function commitUnits(message) {
  const kept = message.split(/\r?\n/).map((l) => (TRAILER.test(l) || /^#/.test(l) ? "" : l));
  return markdownUnits(kept.join("\n"));
}

/** Form, label and work-plan values: the keys a person reads, and plain list items. */
export function yamlUnits(source) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let block = 0;
  const KEY = /^(\s*(?:-\s+)?)(name|description|label|placeholder|title|body|value|about):\s*(.*)$/;
  const scalar = (v) => v.replace(/\s+#.*$/, "").trim().replace(/^(["'])([\s\S]*)\1$/, "$2");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*#/.test(line)) continue;
    const m = KEY.exec(line);
    if (m && /^[|>][-+]?\s*$/.test(m[3])) {
      const indent = m[1].length;
      block++;
      let j = i + 1;
      for (; j < lines.length && (!lines[j].trim() || lines[j].search(/\S/) > indent); j++) {
        if (lines[j].trim()) out.push({ line: j + 1, col: 1, text: stripInline(lines[j]), raw: lines[j], block });
        else block++;
      }
      i = j - 1;
      continue;
    }
    const value = m ? m[3] : /^\s*-\s+(?![\w-]+:(?:\s|$))(.+)$/.exec(line)?.[1];
    if (!value || /^[[{]/.test(value.trim())) continue;
    const text = scalar(value);
    if (text) out.push({ line: i + 1, col: Math.max(1, line.indexOf(text) + 1), text: stripInline(text), raw: line, block: ++block });
  }
  return out;
}

const TEXT_ATTRS = new Set(["aria-label", "aria-description", "aria-roledescription", "aria-valuetext", "title", "alt", "placeholder", "label"]);

/** UI strings from TS or TSX through the compiler API: literals, template text, JSX text. */
export function tsUnits(ts, source, fileName) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, /x$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const src = source.split("\n");
  const out = [];
  let block = 0;
  const push = (node, text, lead) => {
    if (!text.trim()) return;
    const s = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    const e = sf.getLineAndCharacterOfPosition(node.getEnd());
    const raw = src.slice(s.line, e.line + 1).join("\n");
    block++;
    text.split("\n").forEach((t, k) => out.push({ line: s.line + 1 + k, col: k ? 1 : s.character + 1 + lead, text: t, raw, block }));
  };
  const K = ts.SyntaxKind;
  const keyish = (n) => {
    const p = n.parent;
    if (!p) return false;
    if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isPropertySignature(p)) && p.name === n) return true;
    if (ts.isElementAccessExpression(p) || ts.isCaseClause(p) || ts.isLiteralTypeNode(p)) return true;
    return ts.isBinaryExpression(p) && [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken, K.InKeyword].includes(p.operatorToken.kind);
  };
  const visit = (n) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isLiteralTypeNode(n) || ts.isImportTypeNode(n)) return;
    if (ts.isJsxAttribute(n) && !TEXT_ATTRS.has(n.name.getText(sf))) return;
    if (ts.isCallExpression(n) && (n.expression.kind === K.ImportKeyword || /^(require|import)$/.test(n.expression.getText(sf)))) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      if (!keyish(n)) push(n, n.text, 1);
      return;
    }
    if (ts.isTemplateExpression(n)) {
      push(n.head, n.head.text, 1);
      for (const span of n.templateSpans) {
        visit(span.expression);
        push(span.literal, span.literal.text, 1);
      }
      return;
    }
    if (ts.isJsxText(n)) return push(n, n.text, 0);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** Compile the catalogue once; a bad pattern throws, which the self-test reports. */
export function compileRules(list) {
  return list.map((r) => ({
    ...r,
    re: r.pattern ? new RegExp(r.pattern, r.flags?.includes("g") ? r.flags : `${r.flags ?? ""}g`) : null,
    scopes: new Set(r.scopes ?? KINDS),
    exemptRe: (r.exempt ?? []).map((g) => new RegExp(`^${g.split(/(\*\*\/?|\*)/).map((p) => (p.startsWith("**") ? ".*" : p === "*" ? "[^/]*" : p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))).join("")}$`)),
  }));
}

const PROPER = new Set(
  "Starshot Mark Macharia Horizons Sun Moon Earth Mercury Venus Mars Jupiter Saturn Uranus Neptune Pluto Ceres Vesta Pallas Hygiea Voyager Solar System GitHub Pages Actions Apache Creative Commons Contributor Covenant Claude Code Copilot TypeScript JavaScript React Vite Vitest Node Firebase Hosting Rust Python Termux Windows Git Bash Android Google Play Store Chromium Playwright Kobe Lambert Kepler Dormand Prince Table Kenya Nairobi Okabe Ito Keep Changelog Grand Tour First Light Morning Star Big Game Canvas WebGL Unreleased".split(" "),
);
const words = (s) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));

/** Capitalised words in a heading that are neither its first word, a sentence start nor a proper noun. */
function titleWords(heading) {
  const list = words(heading.replace(/^\s*#+\s*/, ""));
  return list.filter((w, i) => {
    if (i === 0 || /[.:?!]$/.test(list[i - 1])) return false;
    const core = w.replace(/^\W+|\W+$/g, "").replace(/['\u2019]s$/, "").split("-")[0];
    return /^[A-Z][a-z]/.test(core) && !PROPER.has(core);
  }).length;
}

/** Paragraphs split into sentences, each with the unit it starts in. */
function sentences(units) {
  const out = [];
  const groups = new Map();
  // Frontmatter values are routing strings, not prose, so only the pattern rules read them.
  for (const u of units) if (!u.heading && !u.table && !u.front) groups.set(u.block, [...(groups.get(u.block) ?? []), u]);
  for (const group of groups.values()) {
    let text = "";
    const starts = [];
    for (const u of group) {
      starts.push([text.length, u]);
      text += `${u.text.trim()} `;
    }
    let from = 0;
    for (const part of text.trim().split(/(?<=[.!?][)"'\]*_`]*)\s+/)) {
      const at = text.indexOf(part, from);
      from = at + part.length;
      const unit = starts.filter(([o]) => o <= at).at(-1)[1];
      out.push({ text: part, unit, col: unit.col + Math.max(0, unit.text.indexOf(part.slice(0, 12))) });
    }
  }
  return out;
}

const CHECKS = {
  "long-sentence": (units, r) => sentences(units).filter((s) => words(s.text).length > r.max).map((s) => ({ unit: s.unit, col: s.col, excerpt: `${words(s.text).length} words: ${s.text.slice(0, 50)}` })),
  "short-triplet": (units, r) =>
    sentences(units)
      .filter((s) => words(s.text).length < r.max && /\b[\w'-]+, [\w'-]+,? and [\w'-]+\b/.test(s.text))
      .map((s) => ({ unit: s.unit, col: s.col, excerpt: s.text.slice(0, 60) })),
  "title-case-heading": (units) =>
    units.filter((u) => u.heading && titleWords(u.text) >= 2).map((u) => ({ unit: u, col: u.col, excerpt: u.text.trim().slice(0, 60) })),
};

/** Every finding for one source. `scope` is { kind, path }; path may be null for stdin. */
export function scanUnits(units, rules, scope) {
  const findings = [];
  const ok = (u) => COPY_OK.test(u.raw ?? "");
  const live = units.filter((u) => !ok(u));
  for (const r of rules) {
    if (!r.scopes.has(scope.kind)) continue;
    if (scope.path && r.exemptRe.some((re) => re.test(scope.path))) continue;
    if (scope.only && !scope.only.has(r.id)) continue;
    const hits = [];
    if (r.check) for (const h of CHECKS[r.check](live, r)) hits.push(h);
    else
      for (const u of live) {
        r.re.lastIndex = 0;
        for (const m of u.text.matchAll(r.re)) hits.push({ unit: u, col: u.col + m.index, excerpt: u.text.slice(Math.max(0, m.index - 24), m.index + m[0].length + 24).trim() });
      }
    for (const h of hits) findings.push({ line: h.unit.line, col: h.col, id: r.id, severity: r.severity, why: r.why, fix: r.fix, excerpt: h.excerpt.replace(/\s+/g, " ") });
  }
  return findings.sort((a, b) => a.line - b.line || a.col - b.col);
}
