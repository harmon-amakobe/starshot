---
name: verify-game
description: Use when a Starshot change needs proof in the running game rather than in source, such as a play-through, phone and desktop screenshots, a console sweep, reduced-motion or keyboard checks, or when a task mentions Playwright, the browser, mobile layout, screenshots, verifying a level end to end, or a hosted build.
---

# Verifying the game in a browser

The harness is `scripts/verify-game.mjs`. It serves the built site itself, opens
headless Chromium on three contexts (iPhone 13 phone, 1440x900 desktop, phone with
reduced motion), screenshots, records console errors, page errors and failed requests,
checks horizontal overflow, unlabelled controls and small touch targets, samples
frame rate, and writes an accessibility snapshot per context. Output goes to a fresh
directory under the OS temp dir, never into the repository.

Playwright is deliberately not a dependency. It must already resolve on the machine
(`node -e "require('playwright')"`); do not install browsers or add it to
`package.json`. If it is missing, report "could not verify: no browser".

## Recipe

```bash
npm run build
node scripts/verify-game.mjs                        # smoke: load, screenshots, sweep
node scripts/verify-game.mjs --base /starshot/      # portable subpath hosting
node scripts/verify-game.mjs --steps /tmp/steps.mjs # one shot() per acceptance criterion
```

A steps file lives in the temp dir, not the repo:

```js
export default async (page, { shot, viewport, log }) => {
  await page.getByRole("button", { name: /launch/i }).click();
  await page.waitForTimeout(1500);
  await shot("02-launched");            // name it after the criterion it proves
  log(await page.getByRole("status").innerText());
};
```

Prefer role and label locators: if a control cannot be found by its accessible name,
that is a finding, not a reason to use coordinates. Drag aiming can be driven with
`page.mouse` on desktop and `page.touchscreen` on the phone context.

## What a pass requires

- One screenshot per criterion, opened and looked at.
- Exit code 0: no console error, page error, failed request or horizontal overflow on
  any context. Warnings are read and reported.
- Both sides of each gate: a hit and a miss, keyboard and touch aiming, reduced motion.
- The `rAF` rate is a smoke signal only; headless Chromium is not a phone.

Report per criterion with screenshot paths and quoted console lines. The full protocol
for an independent pass is the `verification-driver` agent.
