# The copy standard

Decision D27. Every text a person reads follows this page: documentation, READMEs, UI
strings, issue forms, labels, work plans, issues, pull requests, comments and commit
messages. `scripts/check-copy-tells.mjs` checks it (the `copy` gate), and the
`copy-lint` workflow checks text typed straight into GitHub.

## The rules

1. **Sentence case** for headings, buttons and labels. Capitalise the first word and
   proper nouns only.
2. **Short sentences**, one idea each. Aim for 20 words or fewer; the gate warns past 35.
3. **Concrete nouns and real numbers with units.** Name the file, the planet, the date.
4. **No hype adjectives or filler adverbs.** "Powerful", "seamless" and "simply" add
   length and no meaning. Measure instead.
5. **No reflexive groups of three.** When there are two things, list two.
6. **No rhetorical setups.** Not "The twist is", "The good news", "Here's the thing" or
   "not just X, but Y". State the point.
7. **No chatbot residue**, such as "I hope this helps" or "Great question".
8. **No emoji** in docs, forms, issues, pull requests or commits. A screen reader reads
   each one aloud by its name. The game may show a symbol when it is `aria-hidden` and
   has a text twin for screen readers, as the stars in the result dialog do.
9. **No em dash (U+2014), en dash (U+2013) or horizontal bar (U+2015), anywhere.** These
   are hard failures. Write ranges as "1800 to 2050", joined names with a hyphen
   ("Earth-Moon barycentre"), and asides with a full stop, a comma, a colon or brackets.
10. **Exclamation marks:** none in docs, forms, pull requests or commits. In the game,
    at most one per screen, where it celebrates a result.
11. **Plain words.** Define a term of art the first time it appears, as the README does
    for "ephemeris".
12. **Quotes:** ASCII quotes in Markdown and code. Curly quotes and the ellipsis
    character are fine inside UI strings.

Code comments follow `AGENTS.md`: they say why, never what. The gate does not read
comments, so review carries that rule.

## What the gate flags

A `fail` finding stops the gate. A `warn` finding is printed and passes; it marks text
worth a second look, because a heuristic cannot tell a real list of three from a
reflexive one. The reason and the fix for each rule are in `scripts/copy-tells.json`.

| Rule | Level | Catches |
|---|---|---|
| `em-dash` | fail | U+2014 |
| `en-dash` | fail | U+2013 |
| `horizontal-bar` | fail | U+2015 |
| `delve` | fail | delve and its forms |
| `seamless` | fail | seamless, seamlessly |
| `leverage` | fail | leverage as a verb for use |
| `worth-noting` | fail | "it is worth noting" and similar announcements |
| `in-todays` | fail | "in today's world" and similar openers |
| `stock-metaphor` | fail | tapestry, testament to, game changer, ever-evolving |
| `empower` | fail | empower, supercharge |
| `setup-reveal` | fail | "the twist", "the good news", "here's why", "the result?" |
| `lets-dive` | fail | "let's dive in", "deep dive" |
| `chatbot-residue` | fail | "I hope this helps", "feel free to", "great question" |
| `emoji` | fail | pictographs in docs, forms, issues, pull requests and commits |
| `exclaim-prose` | fail | exclamation marks in docs, forms, pull requests and commits |
| `exclaim-ui` | warn | exclamation marks in UI strings |
| `exclaim-talk` | warn | exclamation marks in issues and comments |
| `robust` | warn | robust, robustly, robustness |
| `hype-adjective` | warn | powerful, innovative, effortless, crucial, vital and similar |
| `filler-adverb` | warn | simply, just, really, very, actually and similar, in prose |
| `connective-pile` | warn | a sentence opening with Moreover, Furthermore, Additionally |
| `not-just` | warn | "not just", "not only ... but" |
| `journey` | warn | journey and embark used for a process |
| `whether-youre` | warn | "whether you're" |
| `landscape-figure` | warn | landscape as a figure of speech (landscape phones are fine) |
| `navigate-figure` | warn | "navigate the complexities" and similar |
| `unlock-figure` | warn | "unlock the potential" (unlocking a level is fine) |
| `smart-quote-md` | warn | curly quotes in Markdown source |
| `long-sentence` | warn | a sentence over 35 words |
| `short-triplet` | warn | "a, b and c" in a sentence under 15 words |
| `title-case-heading` | warn | a heading with two or more capitalised words that are not names |

## Where it looks

- **Markdown**, every `.md` file, after removing fenced code, inline code, link targets,
  bare URLs and HTML comments.
- **UI strings** in `apps/<app>/src/**/*.ts` and `.tsx`, read with the TypeScript
  parser: string literals, template text, JSX text, and the values of `aria-label`,
  `title`, `alt`, `placeholder` and `label`. Comments, identifiers, imports, type
  literals, object keys, comparisons and test files are skipped.
- **YAML**: `.github/ISSUE_TEMPLATE/*.yml`, `.github/labels.yml` and
  `docs/plans/<program>/work.yaml`. It reads the values of `name`, `description`,
  `label`, `placeholder`, `title`, `body`, `value` and `about`, and plain list items.
- **Standard input**, with `--kind pr`, `issue`, `comment` or `commit`. The `copy-lint`
  workflow sends issue, comment and pull request bodies this way.
- **Commit messages**: in CI on a pull request, every commit since the base branch; by
  hand, any range with `--commits`. The trailers `Co-Authored-By`, `Claude-Session`,
  `Signed-off-by` and `Assisted-by` are skipped.

## What it skips

- Mark Macharia's files (`third_party/**`, `python/astlo/astlo/**` and its
  `.dist-info`), which must not change (D2, D10).
- Fixtures, lockfiles, `dist/`, `node_modules/` and the catalogue itself. This page is
  checked for the three dash rules only, because it names the other words to define
  them.
- Any line carrying `copy-ok: <reason>`. Put it in an HTML comment in Markdown or in an
  issue body, in a comment on the same line in TypeScript, and after `#` in YAML. Give a
  real reason: "quoting a rule" or "the one celebration on this screen".
- Typographic fixes to resolved decision entries are allowed; their meaning does not
  change (D27).

## Run it

```bash
node scripts/check-copy-tells.mjs                                # the tree, as the gate runs it
node scripts/check-copy-tells.mjs --files README.md docs/hosting.md
node scripts/check-copy-tells.mjs --stdin --kind pr < pr-body.md
node scripts/check-copy-tells.mjs --commits main..HEAD           # before a push
```

Each finding prints as `file:line:col rule (level)`, then the reason, the fix and the
text it found.

## Changing the catalogue

Add the rule to `scripts/copy-tells.json` (`id`, `severity`, `pattern`, `flags`, `why`,
`fix`, and optionally `scopes` and `exempt`). Then add a line that breaks it to a failing
fixture in `scripts/fixtures/copy/`, its id to `expect.json`, and a row to the table
above. The self-test fails until all three agree. Prefer `warn` for anything a person
could write for a good reason; keep `fail` for patterns with almost no honest use.
