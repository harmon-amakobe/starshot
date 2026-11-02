#!/bin/sh
# Stop hook: runs the fast gate subset (node scripts/gates.mjs --fast) at the end of
# each turn and reports failures, instead of letting them surface first in CI.
#
# Report-only: it always exits 0 and never returns a "block" decision, because forcing
# the model to continue on a red gate turns one failure into a loop a human must break.
# The report rides systemMessage, which every hook event accepts; the agent sees the
# same failures the next time it runs the gates.
#
# By hand: sh scripts/agent/stop-gates.sh

command -v node >/dev/null 2>&1 || exit 0
root=${CLAUDE_PROJECT_DIR:-}
[ -n "$root" ] || root=$(git rev-parse --show-toplevel 2>/dev/null)
[ -n "$root" ] && cd "$root" 2>/dev/null || exit 0
[ -f scripts/gates.mjs ] || exit 0

out=$(node scripts/gates.mjs --fast 2>&1)
rc=$?
[ "$rc" = "0" ] && exit 0

failing=$(printf '%s\n' "$out" | sed -n 's/.*failing: //p' | tail -n 1)
msg="Fast gates failed: ${failing:-the runner exited $rc}. Details come from node scripts/gates.mjs --fast."
esc() {
  printf '%s' "$1" | tr '\n\t\r' '   ' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}
printf '{"systemMessage":"%s"}\n' "$(esc "$msg")"
exit 0
