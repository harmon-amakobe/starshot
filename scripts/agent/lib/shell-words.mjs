/**
 * A small shell-command splitter for the PreToolUse guards.
 *
 * The guards decide on parsed words, not on substrings, because a substring test both
 * over-blocks (`git commit -m "never git reset --hard"`) and under-blocks
 * (`git reset \<newline> --hard`). This splitter handles the shapes agents actually type:
 * quotes, backslash escapes, line continuations, `;` `&&` `||` `|` `&` and newlines as
 * command boundaries, `$( )` and backticks as nested commands, heredoc bodies (skipped,
 * since they are data), redirections, comments, and `sh -c` / `bash -c` / `eval`
 * payloads (re-split so a wrapped command is judged like a bare one).
 *
 * It is not a full shell parser and does not try to be: variable expansion, aliases and
 * functions are invisible to it. The accepted gaps are listed in .claude/README.md.
 */

const SHELLS = new Set(["sh", "bash", "dash", "zsh", "ksh", "ash"]);
export const WRAPPERS = new Set(["env", "command", "builtin", "exec", "nohup", "time", "sudo", "nice", "timeout", "stdbuf", "xargs"]);
export const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * Split a command line into simple commands, each an array of words.
 * Returns { commands: string[][], unbalanced: boolean }.
 */
export function splitCommands(src, depth = 0) {
  const commands = [];
  let words = [];
  let word = "";
  let inWord = false;
  let quote = null; // "'" | '"' | null
  let skipNextWord = false; // the operand of a redirection
  const heredocs = []; // pending delimiters: { delim, strip }
  let unbalanced = false;

  const endWord = () => {
    if (inWord) {
      if (skipNextWord) skipNextWord = false;
      else words.push(word);
    }
    word = "";
    inWord = false;
  };
  const endCommand = () => {
    endWord();
    if (words.length) commands.push(words);
    words = [];
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (quote === "'") {
      if (c === "'") quote = null;
      else word += c;
      i += 1;
      continue;
    }
    if (quote === '"') {
      if (c === '"') {
        quote = null;
        i += 1;
        continue;
      }
      if (c === "\\" && next !== undefined && '$`"\\\n'.includes(next)) {
        if (next !== "\n") word += next;
        i += 2;
        continue;
      }
      word += c;
      i += 1;
      continue;
    }

    if (c === "\\") {
      if (next === "\n") {
        i += 2;
        continue;
      }
      if (next !== undefined) word += next;
      inWord = true;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      inWord = true;
      i += 1;
      continue;
    }
    if (c === "#" && !inWord) {
      while (i < src.length && src[i] !== "\n") i += 1;
      continue;
    }
    if (c === "\n") {
      endCommand();
      i += 1;
      // Heredoc bodies start on the line after their operator and are data, not commands.
      while (heredocs.length) {
        const { delim, strip } = heredocs.shift();
        for (;;) {
          if (i >= src.length) break;
          const eol = src.indexOf("\n", i);
          const line = src.slice(i, eol === -1 ? src.length : eol);
          i = eol === -1 ? src.length : eol + 1;
          if ((strip ? line.replace(/^\t+/, "") : line) === delim) break;
        }
      }
      continue;
    }
    if (c === ";" || c === "&" || c === "|" || c === "(" || c === ")") {
      endCommand();
      i += c === next && (c === "&" || c === "|" || c === ";") ? 2 : 1;
      continue;
    }
    if (c === "$" && next === "(") {
      endCommand();
      i += 2;
      continue;
    }
    if (c === "`") {
      endCommand();
      i += 1;
      continue;
    }
    if (c === "<" && next === "<" && src[i + 2] !== "<") {
      endWord();
      i += 2;
      let strip = false;
      if (src[i] === "-") {
        strip = true;
        i += 1;
      }
      while (src[i] === " " || src[i] === "\t") i += 1;
      let delim = "";
      while (i < src.length && !/[\s;&|<>()]/.test(src[i])) {
        if (src[i] !== "'" && src[i] !== '"' && src[i] !== "\\") delim += src[i];
        i += 1;
      }
      if (delim) heredocs.push({ delim, strip });
      continue;
    }
    if (c === ">" || c === "<") {
      // A redirection: drop it and its target, so `> log.txt` never reads as an argument.
      const fdPrefix = /^\d+$/.test(word) && inWord;
      if (fdPrefix) {
        word = "";
        inWord = false;
      } else {
        endWord();
      }
      i += 1;
      while (src[i] === ">" || src[i] === "<" || src[i] === "&" || src[i] === "|") i += 1;
      if (/\d|-/.test(src[i] ?? "") && src[i - 1] === "&") {
        while (/[\d-]/.test(src[i] ?? "")) i += 1;
        continue;
      }
      skipNextWord = true;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      endWord();
      i += 1;
      continue;
    }
    word += c;
    inWord = true;
    i += 1;
  }
  if (quote) unbalanced = true;
  endCommand();

  // Re-split payloads that re-enter a shell, so `bash -c "git reset --hard"` is judged.
  const out = [];
  for (const cmd of commands) {
    out.push(cmd);
    if (depth >= 3) continue;
    const start = commandStart(cmd);
    const head = cmd[start];
    if (head === undefined) continue;
    let payload = null;
    if (SHELLS.has(head.replace(/^.*\//, ""))) {
      const ci = cmd.findIndex((w, k) => k > start && /^-[A-Za-z]*c[A-Za-z]*$/.test(w));
      if (ci !== -1 && cmd[ci + 1] !== undefined) payload = cmd[ci + 1];
    } else if (head === "eval") {
      payload = cmd.slice(start + 1).join(" ");
    }
    if (payload) {
      const inner = splitCommands(payload, depth + 1);
      out.push(...inner.commands);
      if (inner.unbalanced) unbalanced = true;
    }
  }
  return { commands: out, unbalanced };
}

/** Index of the real command word, skipping VAR=value prefixes and wrapper commands. */
export function commandStart(words) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (ASSIGNMENT.test(w)) {
      i += 1;
      continue;
    }
    if (WRAPPERS.has(w)) {
      i += 1;
      while (i < words.length && (words[i].startsWith("-") || ASSIGNMENT.test(words[i]) || /^\d+[smhd]?$/.test(words[i]))) i += 1;
      continue;
    }
    return i;
  }
  return words.length;
}
