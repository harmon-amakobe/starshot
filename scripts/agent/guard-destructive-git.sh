#!/bin/sh
# PreToolUse guard on Bash: denies git commands that destroy unrecoverable state and
# names the safe alternative in the reason. The decision is made by
# lib/guard-destructive-git.mjs, because getting it right is a parsing problem
# (quotes, continuations, heredocs, `bash -c`) that shell pattern matching gets wrong.
#
# Fails open: no payload, no node, or no engine means exit 0 and the command runs.
# Runs on every Bash call, so a payload without "git" in it costs one case test.
#
# By hand: echo '{"tool_input":{"command":"git reset --hard"}}' | sh scripts/agent/guard-destructive-git.sh

payload=""
[ -t 0 ] || payload=$(cat 2>/dev/null)
case $payload in *git*) ;; *) exit 0 ;; esac
command -v node >/dev/null 2>&1 || exit 0
engine="$(dirname "$0")/lib/guard-destructive-git.mjs"
[ -f "$engine" ] || exit 0
printf '%s' "$payload" | node "$engine" 2>/dev/null
exit 0
