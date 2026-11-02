# CLAUDE.md

Claude Code reads this file; the import below brings in the shared agreement. What
follows the divider is true of Claude Code alone.

<!-- Shared rules live in AGENTS.md only. scripts/check-instruction-dedup.mjs fails the
     gates if this file repeats a twelve-word run from it. -->

@AGENTS.md

---

## The hooks already in place

`.claude/settings.json` wires five POSIX `sh` scripts from `scripts/agent/`. The table
of what each enforces, and what none of them can see, is in `.claude/README.md`.

- Before your first turn, a line of repository facts arrives from `open-gate.sh`. If
  your own probing disagrees with it, that disagreement is the thing to investigate.
- A denied Bash or edit call carries the reason and the safe alternative. Take the
  alternative; do not rephrase the command to slip past the parser.
- After each Edit or Write, `snapshot-ref.sh` records a restore point silently.
- When a turn ends, `stop-gates.sh` runs the fast gates and shows the person any
  failure. Run `npm run gates:fast` yourself to see the detail.

## Getting a file back

```bash
git for-each-ref --sort=-refname refs/snapshots      # newest first; names are <epoch>-<pid>
git show refs/snapshots/<epoch>-<pid>:path/to/file   # inspect
git restore --source=refs/snapshots/<epoch>-<pid> -- path/to/file
```

Snapshots include files that were never committed, and are pruned after seven days. A
file rewritten by a shell command is captured only when a later Edit or Write fires.

## Subagents

Spawn roster agents by their type name (`executor`, `adversary`, `physics-auditor`,
`verification-driver`, ...) so their model tier and tool limits apply; reach for
`general-purpose` only when no roster type fits. Harness worktrees under
`.claude/worktrees/` branch from `main`, not from your stack tip, so check the base
before building there.

## Windows, Git Bash and Termux

Hooks are plain `sh`. On Windows, Claude Code needs Git for Windows anyway and runs
hook commands through its bash. If `sh` cannot be found, a hook fails to start, which
does not block the tool call; CI is then the only enforcement left. Run repository scripts as `sh scripts/agent/<name>.sh` or
`node scripts/<name>.mjs` rather than through PowerShell. Prefer the Write and Edit
tools over PowerShell redirection, which can add a byte-order mark and CRLF endings.
On Android, Termux with `git`, `nodejs-lts` and `python` runs the same scripts.
