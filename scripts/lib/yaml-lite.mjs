/**
 * The YAML subset that docs/plans/<program>/work.yaml and .github/labels.yml use, with
 * no dependency so it runs before npm ci.
 *
 * Supported: block mappings and sequences by indentation, "- key: value" items, plain,
 * single- and double-quoted scalars, numbers, true/false/null, flow sequences such as
 * [a, "b c"], block scalars (| and >, with - or + chomping) and # comments. Anything
 * else (anchors, flow mappings, multi-document files, tabs) is an error with a line
 * number, because a guess here would create or edit the wrong issue.
 */

const indentOf = (s) => s.length - s.trimStart().length;
const blankOrComment = (s) => !s.trim() || /^\s*#/.test(s);

/** Drop a trailing " # comment" that sits outside quotes. */
function stripComment(v) {
  let quote = null;
  for (let k = 0; k < v.length; k++) {
    const c = v[k];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "#" && (k === 0 || /\s/.test(v[k - 1]))) return v.slice(0, k).trimEnd();
  }
  return v.trimEnd();
}

function splitFlow(inner) {
  const parts = [];
  let cur = "";
  let quote = null;
  for (const c of inner) {
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === ",") {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

export function parseYaml(source) {
  const raw = source.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  const fail = (msg) => {
    throw new Error(`line ${i + 1}: ${msg}`);
  };
  const skip = () => {
    while (i < raw.length && blankOrComment(raw[i])) i++;
  };
  if (raw.some((l) => /^\t|^ *\t/.test(l))) {
    i = raw.findIndex((l) => /^ *\t/.test(l));
    fail("tabs are not allowed for indentation");
  }

  function scalar(text) {
    const v = stripComment(text).trim();
    if (v === "" || v === "~" || v === "null") return null;
    if (v === "true" || v === "false") return v === "true";
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (v.startsWith('"')) {
      try {
        return JSON.parse(v);
      } catch {
        fail(`bad double-quoted string: ${v}`);
      }
    }
    if (v.startsWith("'")) {
      if (!v.endsWith("'") || v.length < 2) fail(`unclosed single-quoted string: ${v}`);
      return v.slice(1, -1).replace(/''/g, "'");
    }
    if (v.startsWith("[")) {
      if (!v.endsWith("]")) fail(`a flow sequence must close on its line: ${v}`);
      return splitFlow(v.slice(1, -1)).map((p) => scalar(p));
    }
    if (/^[{&*!|>@`]/.test(v)) fail(`unsupported YAML: ${v}`);
    return v;
  }

  function blockScalar(parentIndent, style) {
    const lines = [];
    let own = null;
    while (i < raw.length) {
      const l = raw[i];
      if (!l.trim()) {
        lines.push("");
        i++;
        continue;
      }
      const li = indentOf(l);
      if (li <= parentIndent || (own !== null && li < own)) break;
      own ??= li;
      lines.push(l.slice(own));
      i++;
    }
    const keep = style.includes("+");
    if (!keep) while (lines.length && lines.at(-1) === "") lines.pop();
    let text = style.startsWith(">") ? lines.join("\n").replace(/([^\n])\n(?=[^\n])/g, "$1 ") : lines.join("\n");
    if (!style.includes("-")) text += "\n";
    return text;
  }

  function node(minIndent) {
    skip();
    if (i >= raw.length || indentOf(raw[i]) < minIndent) return null;
    const ind = indentOf(raw[i]);
    return /^\s*-(\s|$)/.test(raw[i]) ? sequence(ind) : mapping(ind);
  }

  function sequence(ind) {
    const out = [];
    for (skip(); i < raw.length; skip()) {
      const li = indentOf(raw[i]);
      if (li < ind) break;
      if (li > ind) fail("unexpected indentation inside a sequence");
      const t = raw[i].trimStart();
      if (!/^-(\s|$)/.test(t)) break;
      const rest = t.slice(1).trimStart();
      if (!rest || rest.startsWith("#")) {
        i++;
        out.push(node(ind + 1));
      } else if (/^[\w.-]+:(\s|$)/.test(rest)) {
        raw[i] = " ".repeat(ind + 2) + rest;
        out.push(mapping(ind + 2));
      } else {
        i++;
        out.push(scalar(rest));
      }
    }
    return out;
  }

  function mapping(ind) {
    const out = {};
    for (skip(); i < raw.length; skip()) {
      const li = indentOf(raw[i]);
      if (li < ind) break;
      if (li > ind) fail("unexpected indentation inside a mapping");
      const t = raw[i].trimStart();
      if (/^-(\s|$)/.test(t)) break;
      const m = /^([\w.-]+|"[^"]*"|'[^']*'):(?:\s+(.*))?$/.exec(t);
      if (!m) fail(`expected "key: value", found: ${t.slice(0, 60)}`);
      const key = m[1].replace(/^["']|["']$/g, "");
      if (Object.hasOwn(out, key)) fail(`duplicate key "${key}"`);
      const rest = stripComment(m[2] ?? "").trim();
      i++;
      if (/^[|>][-+]?$/.test(rest)) out[key] = blockScalar(ind, rest);
      else if (rest) out[key] = scalar(m[2]);
      else {
        skip();
        const nested = i < raw.length && (indentOf(raw[i]) > ind || (indentOf(raw[i]) === ind && /^\s*-(\s|$)/.test(raw[i])));
        out[key] = nested ? node(indentOf(raw[i])) : null;
      }
    }
    return out;
  }

  const doc = node(0);
  skip();
  if (i < raw.length) fail(`unexpected content: ${raw[i].trim().slice(0, 60)}`);
  return doc;
}
