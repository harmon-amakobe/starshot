/**
 * gate-fail.mjs: one readable failure line for a gate script.
 *
 * CI logs of a public repository are public, and a stack trace carries absolute paths
 * that name the machine it ran on. A gate that meets an unexpected error prints one line
 * instead, "<gate>: FAILED, <what happened>; <how to fix it>", with the repository root
 * cut out of the message.
 */
import { sep } from "node:path";

/** The line that explains an error, git's "fatal:" first, without the repository root. */
export function reason(error, root) {
  const lines = String(error?.stderr || error?.message || error || "unknown error").split("\n").map((l) => l.trim());
  const line = lines.find((l) => l.startsWith("fatal:")) ?? lines.find((l) => l && !l.startsWith("Command failed")) ?? "unknown error";
  return line.split(root + sep).join("").split(root).join(".");
}

/** Runs a gate's main; an unexpected throw becomes one line and exit 1. */
export function runGate(gate, root, main, fix) {
  try {
    main();
  } catch (e) {
    console.error(`${gate}: FAILED, ${reason(e, root)}; ${fix}`);
    process.exit(1);
  }
}
