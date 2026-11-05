# Size gate fixtures

`check-file-size.mjs` runs these before every scan, through `fileFindings`, the same
per-file function the scan uses. Each case in `expect.json` names a fixture, the path it
pretends to live at, and how many lines over 160 characters the long-line warning must
report for it; 0 means no warning at all. The fixtures end in `.txt`, so no gate reads
them as code and the tree scan never warns about them. Every language the size gate reads
needs a case: one that warns for each of the four long-line languages, and one that stays
quiet for each other language.

- `long.txt` holds two lines over 160 characters and one of exactly 160. It warns as
  `.css`, `.ts`, `.tsx` and `.mjs`, and stays quiet as `.rs`. PR3c names four languages;
  Rust waits for crates/ (D16).
- `formatted.txt` holds lines of 160 characters or fewer, one of them with a symbol
  outside the Basic Multilingual Plane, so a count of UTF-16 units would wrongly warn.
- A case with `"crlf": true` reads its fixture with CRLF line endings. Git stores every
  text file with LF (`.gitattributes`), so the self-test adds the CR itself; a line of
  exactly 160 characters must stay under the limit with its CR.
