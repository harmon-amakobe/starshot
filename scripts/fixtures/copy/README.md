# Copy gate fixtures

`check-copy-tells.mjs` runs these before every scan. `expect.json` names each file's
kind, the path it pretends to live at, and the rules that must fire on it; a file with
an empty list must produce no finding at all. `{U+2014}` and similar escapes are expanded
when the file is read, so the banned characters never sit in the repository.
