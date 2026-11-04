# SHIELD-01 · owner-authentication boundary test packet

Status: GREEN investigation packet; NOT an authentication certification.
Baseline: PR #522, commit b9108146a6f2b5b86ab590eb466f087a8eafda51 (2026-11-04).
Owner role: Bifröst Architect (contract mapping); implementer: attested Codex or other opted-in builder; independent verifier: Boxfire. No agent acceptance or invocation is claimed.

## Observed source boundary
- `apps/starwell-server/wayglass/router.js` exports an Express router with read-only `GET /projects`; response is non-authoritative and `Cache-Control: no-store`.
- `apps/starwell-server/server.js` mounts that router; no owner-auth middleware is visible at the mount in the inspected source. This does not determine whether a separate host/edge gate protects a deployed instance.
- `test/wayglass-project-federation-http.test.cjs` mounts the router directly in a synthetic Express app. Its GET/POST assertions cannot prove authentication.
- `apps/arcsweep/src/constellation-runtime-adapter.js` uses a separate House session and `/api/v1/flames/:route` for voice status/chat. That contract must not be silently treated as proof that the Starwell federation route shares the same gate.

## Task B-SHIELD-AUTH-NEG-01 (GREEN)
Input: the exact commit above; recheck head and file ownership before implementation.
Allowed new files: `test/wayglass-owner-gate-negative.test.cjs` and a dedicated synthetic fixture under `test/fixtures/wayglass-auth/` if needed.
Prohibited: edits to production RLS/auth, credentials, `apps/starwell-server/server.js`, `apps/starwell-server/wayglass/router.js`, provider routes, model weights, and PR #515/#521 code.

1. Identify the actual owner-facing ingress, including local proxy/edge policy and whether the Starwell port can be reached without that ingress. Record the specific enforcement source and testable request boundary, not a presumed gate.
2. If a testable gate is present, add isolated negative tests: anonymous request denied; invalid/expired session denied; authenticated non-owner denied; authorized owner can read catalog; catalog entries never grant permissions or mounted status. Use synthetic identities only.
3. If the gate is external or unavailable to CI, provide a clearly named mock-contract test plus an explicit NOT TESTED live-host row. Never equate mock success with deployed authorization.
4. Ensure Feather/stop and revoked sessions remain deny-first, with no fallback to model-generated authority.
5. Preserve independent verification: Boxfire must review a commit not authored by Boxfire and report PASS, PASS WITH NOTES, BLOCKED, or NOT TESTED with evidence.

Acceptance: test command, commit SHA, exact CI run URLs, negative-case matrix, observed ingress topology, remaining gaps, and rollback (revert test-only commit). No merge/deploy/permission expansion.

## Current decision
Do not add a fabricated owner-auth test against the naked router: it would either assert a protection that is absent from the synthetic mount or modify production behavior outside GREEN authority. Proceed with separate GREEN work while the true ingress contract is identified.
