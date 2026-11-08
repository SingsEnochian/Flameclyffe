# OAuth/native integration independent review

Worker `/root/oauth`, integration owner `/root`. Review source `4c03458ef52ad1e883886346f0397bb2a365e5ff`, canonical ancestry `15467ce4ac5dc93d30a80e58302b5bda8597dc07`. Worktree/branch: `lane-oauth-review` / `wayglass/lane-oauth-review-20261108`. Scope approved by root: native bridge authorization races, bounded trusted-adapter waits, and invalid-token OAuth challenge. No production mutation, external inference, deployment, participant decision or credential exposure.

## Findings and acceptance before repair

P1: `grantFor` validated a shared authorizer response before awaiting Feather, then copied it after that await. A grant revoked during the final Feather wait could pass refresh binding because authority flags were omitted from the binding. Confirmed reproduction against the integrated source: third Feather callback set `grant.revoked=true` and returned false; catalogue still resolved with one route, `revoked:true`, `stopChecks:3`. Acceptance: mutable grant changes during initial/final stop checks deny dispatch/disclosure; original fixed-scope semantics remain.

P2: a null/inactive result from the strict verifier was treated as insufficient scope with HTTP403 and no `WWW-Authenticate`, preventing clients from distinguishing an invalid/expired token for refresh. Acceptance: null/inactive token receives401 + resource metadata and invalid_token; active insufficient scope or missing owner grant stays403. Old403 expectations for actual null verifier output are corrected deliberately, preserving denial.

P2: native authorizer, credential and Feather callbacks could hang before bounded upstream fetch began. Acceptance: optional `adapterTimeoutMs` defaults5000 (range1–30000), AbortSignal supplied as second options argument, timeout/unknown denies without upstream call. Uncooperative callback work cannot be forcibly terminated; trusted adapters must honour cancellation and own no unchecked external side effects.

## Repair

The bridge snapshots the authorizer result immediately, validates the snapshot, and revalidates/compares the original response after the Feather await. Full authority flags join subject/grant/resource/consent/scopes/routes/context/provider-consent in refresh binding. This detects shared-object mutation without silently accepting later authority. Each trusted callback wait is bounded and receives AbortSignal. The receiving native host still must enforce its own atomic current-grant/Feather gate at its actual effect: separate network services cannot make a global atomic authorization decision merely by repeated reads.

The HTTP gateway now distinguishes invalid/inactive tokens from active insufficient scopes. OAuth challenge contains existing protected-resource discovery plus invalid_token. No new privilege is granted.

## Execution evidence

First review run: 27 passed, 2 failed because the independent worktree lacked Express dependencies, not because of assertion failure. Kept source unchanged, linked the already installed canonical host dependencies into this worktree and reran the same tests; final result below. The original P1 reproduction and failure cause are preserved here.

Second setup run again had27 pass/2 failed: Express was available, but this fresh worktree lacked the generated `wayglass-runtime` host modules. Recreated only those staged runtime dependencies from this worktree's source (same copy responsibility as server-stage), without publishing frontend assets. Final unchanged four-file test command passed **29/29, 0 failed** on Node24.22.1:

`node --test test/wayglass-mcp-http.test.cjs test/wayglass-mcp-native-bridge.test.cjs test/wayglass-mcp-integrated.test.cjs test/wayglass-mcp-respond.test.cjs`

Dependency search used the existing installed host dependency directory; no dependency manifest changed. The actual native Express router/kernel ran with captured provider transport; no external model inference is claimed. Syntax and diff checks passed. Generated staging files and dependency links are excluded from the review commit.
