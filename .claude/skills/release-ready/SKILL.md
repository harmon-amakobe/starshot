---
name: release-ready
description: Use when changing release scripts, semantic versions, release proposals, beta staging, candidate provenance, production promotion or recovery for Starshot.
---

# Release readiness

Read D35, `docs/hosting.md` and the active versioned-release plan. Do not add a
release framework, change a protected tag or hand-edit CI-owned outputs.

1. Put user-visible changes under Unreleased and review the inferred bump. CI emits
   a proposal artifact; the owner uses `apply-proposal` on a clean source checkout.
   It rejects changed, unknown or stale files. Keep the proposal PR in the stack.
2. Run `npm run gates` and the workflow linter. Release tests include malformed
   versions, source/digest/expiry mismatches, failed builds, retries, unsafe archives
   and exact recovery assets. A positive test alone does not establish a boundary.
3. For visible changes, run `verify-game` at root and subpath and
   `verify-web-release`. Inspect phone and desktop screenshots. Confirm the footer
   and About use compiled metadata and a waiting update keeps the old label.
4. Record the successful candidate run, protected tag, source SHA, artifact id,
   digest and hosted beta evidence. Promotion resolves that candidate without a
   rebuild. Main merge, tags and commit markers do not publish production.
5. Production promotion is an explicit owner action from main. A failed downstream
   candidate job retries its original successful build. An expired artifact fails;
   do not replace its tag. Recovery through Hosting history keeps player storage.

Automatic proposal PR creation is optional and disabled. Do not enable the broader
GitHub create/approve setting, use another token, or forge CI environment variables
to apply a proposal. The read-only artifact and local validation path works without it.
Report every command's exit code and every unexecuted infrastructure or hosted check.
