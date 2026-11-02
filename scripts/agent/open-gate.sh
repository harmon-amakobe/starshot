#!/bin/sh
# SessionStart open gate. States the repository's condition before the first turn, so
# the session starts from facts instead of from a ritual it may skip: branch and head,
# tracking ref, clean or dirty, unpushed commits, distance from main, stashes, worktrees
# (the single-writer rule), snapshot refs, node against .nvmrc, and node_modules.
#
# Detectors live at session OPEN because a close step can never report its own failure.
# Contract: exactly one JSON line on stdout, factual phrasing, well under a second, and
# exit 0 always. A broken gate must never block a session.
#
# By hand: sh scripts/agent/open-gate.sh

esc() {
  printf '%s' "$1" | tr '\n\t\r' '   ' | tr -d '\000-\010\013\014\016-\037' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}
emit() {
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"},"systemMessage":"%s"}\n' "$(esc "$1")" "$(esc "$2")"
  exit 0
}

if ! command -v git >/dev/null 2>&1; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Open gate: git is not on PATH, so no repository state was read."},"systemMessage":"Open gate: git not found."}'
  exit 0
fi
root=${CLAUDE_PROJECT_DIR:-}
[ -n "$root" ] || root=$(git rev-parse --show-toplevel 2>/dev/null)
[ -n "$root" ] && cd "$root" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null) || branch="(detached HEAD)"
head=$(git log -1 --format='%h %s' 2>/dev/null | cut -c1-90)
[ -n "$head" ] || head="(no commits yet)"

changed=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$changed" = "0" ]; then tree="working tree clean"; else tree="$changed changed or untracked path(s)"; fi

upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null) || upstream=""
if [ -n "$upstream" ]; then
  n=$(git rev-list --count "$upstream..HEAD" 2>/dev/null || echo "?")
  push="tracking $upstream, $n commit(s) not pushed"
  unpushed=$n
else
  n=$(git rev-list --count HEAD --not --remotes 2>/dev/null || echo "?")
  push="no upstream set, $n commit(s) on no remote branch"
  unpushed=$n
fi

base=""
for b in origin/main main; do
  if git rev-parse --verify --quiet "$b" >/dev/null 2>&1; then
    a=$(git rev-list --count "$b..HEAD" 2>/dev/null || echo "?")
    base="$a commit(s) ahead of $b"
    break
  fi
done
[ -n "$base" ] || base="no main branch found locally"

stashes=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
trees=$(git worktree list 2>/dev/null | wc -l | tr -d ' ')
snaps=$(git for-each-ref --format='x' refs/snapshots/ 2>/dev/null | wc -l | tr -d ' ')

want=$(tr -d ' \r\n' < .nvmrc 2>/dev/null)
if command -v node >/dev/null 2>&1; then
  have=$(node --version 2>/dev/null)
  case $have in "v${want:-x}"|"v${want:-x}".*) nodestate="node $have matches .nvmrc ($want)" ;; *) nodestate="node $have, while .nvmrc asks for ${want:-unset}" ;; esac
else
  have=""
  nodestate="node is not on PATH; gates and hooks that need it are skipped"
fi
if [ -d node_modules ]; then deps="node_modules present"; else deps="node_modules absent (npm ci installs it; typecheck, test and build need it)"; fi

ctx="Repository state at session open: branch $branch at $head; $tree; $push; $base; $stashes stash entr(ies); $trees worktree(s); $snaps snapshot ref(s); $nodestate; $deps."
[ "$trees" -gt 1 ] 2>/dev/null && ctx="$ctx More than one worktree exists; each has at most one writing agent."
[ "$stashes" -gt 0 ] 2>/dev/null && ctx="$ctx Stash entries can hold work stranded by an earlier session (git stash list)."
msg="Open gate: $branch, $tree, $unpushed unpushed, ${have:-no node}, $deps."
emit "$ctx" "$msg"
