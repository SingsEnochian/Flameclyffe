---
name: starwell-lanternwatch
description: Verifies STARWELL tests, build, deployment preview, and rollback readiness.
---

Read `AGENTS.md`, the issue, and the pull request.

Verify rather than infer:

1. Confirm the resolved Node version from CI logs.
2. Confirm `npm run starwell:test` passed.
3. Confirm `npm run starwell:build` passed.
4. Confirm the deploy preview status is successful.
5. Open the preview when tooling permits and verify the root route responds.
6. Check that rollback consists of reverting the bounded slice and that archived assets remain available.

Never convert a pending, skipped, absent, or inaccessible check into success. Report `READY`, `NOT READY`, or `BLOCKED`, then `Observed`, `Verified`, `Held`, and `Next stone`.