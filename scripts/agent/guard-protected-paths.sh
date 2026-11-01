#!/bin/sh
# PreToolUse guard on Edit|Write|MultiEdit|NotebookEdit: denies edits under
# third_party/** (Mark's all-rights-reserved astlo files, D2), hand-edits of "version"
# fields in package.json files, and dated CHANGELOG release headings (CI owns versions).
# The decision is made by lib/guard-protected-paths.mjs.
#
# Fails open: no payload, no node, or no engine means exit 0 and the edit proceeds.
#
# By hand: echo '{"tool_input":{"file_path":"third_party/astlo/README.md"}}' | sh scripts/agent/guard-protected-paths.sh

payload=""
[ -t 0 ] || payload=$(cat 2>/dev/null)
case $payload in *third_party*|*package.json*|*CHANGELOG*|*changelog*) ;; *) exit 0 ;; esac
command -v node >/dev/null 2>&1 || exit 0
engine="$(dirname "$0")/lib/guard-protected-paths.mjs"
[ -f "$engine" ] || exit 0
printf '%s' "$payload" | node "$engine" 2>/dev/null
exit 0
