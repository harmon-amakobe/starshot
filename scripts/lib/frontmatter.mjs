/**
 * Minimal YAML-frontmatter reader shared by the agent and skill checks.
 *
 * It understands exactly the shapes our files use (`key: value`, quoted scalars, inline
 * `[a, b]` lists, block `- item` lists) and reports anything else instead of guessing.
 * The bias matters: malformed frontmatter silently stops a skill or agent from
 * auto-triggering while manual invocation still works, so a lenient parser would hide
 * the exact defect the checks exist to catch. No dependency, so it runs from a bare
 * checkout before `npm ci`.
 */

/** Split a markdown file into { frontmatter: string | null, body }. */
export function splitFrontmatter(text) {
  const s = text.replace(/^﻿/, "");
  const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(s);
  if (!m) return { frontmatter: null, body: s };
  return { frontmatter: m[1], body: s.slice(m[0].length) };
}

function unquote(v) {
  const t = v.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/** Parse a frontmatter block into { values, errors }; every bad line is reported. */
export function parseFrontmatter(raw) {
  const values = {};
  const errors = [];
  let listKey = null;
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item) {
      if (!listKey) errors.push(`line ${i + 1}: list item with no key above it`);
      else values[listKey].push(unquote(item[1]));
      continue;
    }
    const pair = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(line);
    if (!pair) {
      errors.push(`line ${i + 1}: not a "key: value" pair: ${line.trim().slice(0, 60)}`);
      listKey = null;
      continue;
    }
    const [, key, rest] = pair;
    if (key in values) errors.push(`line ${i + 1}: duplicate key "${key}"`);
    if (rest === "") {
      values[key] = [];
      listKey = key;
      continue;
    }
    listKey = null;
    if (/^[>|][-+]?$/.test(rest.trim())) {
      errors.push(`line ${i + 1}: block scalars (${rest.trim()}) are not supported; use one line`);
      continue;
    }
    const inline = /^\[(.*)\]$/.exec(rest.trim());
    if (inline) {
      values[key] = inline[1].trim() === "" ? [] : inline[1].split(",").map(unquote).filter(Boolean);
      continue;
    }
    // An unquoted ": " inside a scalar is invalid YAML for strict parsers even when
    // lenient ones accept it; flag it so the file loads everywhere.
    const scalar = rest.trim();
    if (!/^["']/.test(scalar) && /:\s/.test(scalar)) {
      errors.push(`line ${i + 1}: unquoted value for "${key}" contains ": ", which strict YAML rejects; quote it`);
    }
    values[key] = unquote(rest);
  }
  return { values, errors };
}
