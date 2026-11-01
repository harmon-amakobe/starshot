#!/bin/sh
# PostToolUse on Edit|Write: records a restore point after every edit batch as
# refs/snapshots/<epoch>-<pid>, and prunes restore points older than 7 days.
#
# Platform checkpoints cover the lead session's own edits; this covers subagents and
# scripts. The snapshot is built in a private index (GIT_INDEX_FILE) rather than with
# `git stash create`, because stash create records tracked files only, so a brand-new
# file (the thing most worth recovering) would never reach a restore point, and it
# fails outright when the real index holds an intent-to-add entry. `git add -A` into a
# private index captures new files, honours .gitignore, and never touches .git/index
# or the working tree. An unchanged tree writes no new ref.
#
# Gap: a file rewritten by a shell command reaches a restore point only at the next
# Edit or Write. Silent by contract: PostToolUse output would be a per-edit token tax.
#
# Recover: git for-each-ref refs/snapshots
#          git show <ref>:<path>
#          git restore --source=<ref> -- <path>

RETENTION_DAYS=${SNAPSHOT_RETENTION_DAYS:-7}

command -v git >/dev/null 2>&1 || exit 0
payload=""
[ -t 0 ] || payload=$(cat 2>/dev/null)

# The edited file decides which worktree to snapshot; the project dir is the fallback.
file=$(printf '%s' "$payload" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1 | sed 's/\\\\/\//g')
dir=""
if [ -n "$file" ]; then
  dir=$(dirname "$file")
  while [ -n "$dir" ] && [ "$dir" != "/" ] && [ "$dir" != "." ] && [ ! -d "$dir" ]; do dir=$(dirname "$dir"); done
fi
[ -n "$dir" ] && [ -d "$dir" ] || dir=${CLAUDE_PROJECT_DIR:-.}
cd "$dir" 2>/dev/null || exit 0
top=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$top" 2>/dev/null || exit 0
gitdir=$(git rev-parse --absolute-git-dir 2>/dev/null) || exit 0
git rev-parse --verify --quiet HEAD >/dev/null 2>&1 || exit 0

now=$(date +%s 2>/dev/null)
case $now in '' | *[!0-9]*) exit 0 ;; esac

idx="$gitdir/starshot-snapshot.index"
[ -f "$idx" ] || GIT_INDEX_FILE="$idx" git read-tree HEAD >/dev/null 2>&1
if GIT_INDEX_FILE="$idx" git add -A >/dev/null 2>&1; then
  tree=$(GIT_INDEX_FILE="$idx" git write-tree 2>/dev/null)
  last=$(git for-each-ref --sort=-refname --count=1 --format='%(refname)' refs/snapshots/ 2>/dev/null)
  lasttree=""
  [ -n "$last" ] && lasttree=$(git rev-parse --verify --quiet "$last^{tree}" 2>/dev/null)
  if [ -n "$tree" ] && [ "$tree" != "$lasttree" ]; then
    label=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || echo detached)
    snap=$(GIT_AUTHOR_NAME=snapshot GIT_AUTHOR_EMAIL=snapshot@localhost \
      GIT_COMMITTER_NAME=snapshot GIT_COMMITTER_EMAIL=snapshot@localhost \
      git commit-tree "$tree" -p HEAD -m "snapshot $label $now ${top##*/}" 2>/dev/null)
    [ -n "$snap" ] && git update-ref "refs/snapshots/$now-$$" "$snap" >/dev/null 2>&1
  fi
fi

cutoff=$((now - RETENTION_DAYS * 86400))
git for-each-ref --format='%(refname)' refs/snapshots/ 2>/dev/null | while IFS= read -r ref; do
  leaf=${ref##*/}
  epoch=${leaf%%-*}
  case $epoch in '' | *[!0-9]*) continue ;; esac
  [ "$epoch" -lt "$cutoff" ] && git update-ref -d "$ref" >/dev/null 2>&1
done
exit 0
