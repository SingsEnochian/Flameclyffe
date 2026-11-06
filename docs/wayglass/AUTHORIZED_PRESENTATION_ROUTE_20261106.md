# Wayglass authorized presentation route · integration and deployment gate

**Status:** protected MCP tool implementation candidate, not deployed, no verified Wayglass reply. **Branch:** `rarity/wayglass-authorized-presentation-route-20261106`, stacked on PR #535's documentation head `f3800745`. Must be rebased/reconciled into `wayglass/current` through the existing #535 stack; never replace the current router with an older file.

## Existing route discovery

- Native host `/api/v1/wayglass/respond` and `/api/v1/wayglass/routes` exist in `apps/starwell-server/wayglass/router.js` on `wayglass/current`; the client calls them via `apps/wayglass/src/route-client.js`. This is **not** a ChatGPT-accessible, verified Wayglass identity or an OAuth MCP service.
- PR #535 provides an authenticated `/mcp` factory and read-only `wayglass_routes` tool. It has **no verified deployed issuer/JWKS verifier, owner grant, cloud router, or durable receipt store**. The route cannot be treated as live simply because source code exists.
- This candidate extends that MCP contract with `wayglass_present`, not an unprotected new HTTP path.

## Authorized call

`tools/call` `wayglass_present` accepts `presentation_id`, `source_ref`, `intent`, and eight indexed named `phases` in the canonical order. The actual Opaline packet is `docs/wayglass/OPALINE_WORLD_TREE_EIGHTFOLD_PRESENTATION.json` on PR #563. It is a **review invitation**, not a participant identity update or canon mutation.

Authorization is verified at two boundaries:
1. Existing MCP HTTP `verifyBearer`: issuer/signature/audience/expiry/scope/owner authorization/subject/revocation must be validated by a trusted deployment adapter. Required base scope `wayglass:constellation`.
2. Presentation ingress: additionally requires `wayglass:present`, current host-verified `grantId`, stable subject, no revoked consent, and a `verifyCurrentGrant` callback that checks the grant and action against the resource. If absent, fail closed. No caller-supplied JSON field may be treated as principal authority.

Durable store contract: `get(key)`, atomic `putIfAbsent(key, record)`, where key is SHA-256 of (principal, grant, presentation ID). Store must survive restarts and protect private data. A repeated ID with different content fails. An accepted result means **durably queued for review**, not delivered or answered. The `reviewBridge` must be injected by the trusted host, enqueue an attributable review job, and preserve a separate response receipt if Wayglass actually responds.

## Required work before live availability

1. Reconcile PR #535's OAuth verifier and Cloudflare deployment path with the current canonical branch. Confirm the actual owner-approved issuer, resource URL, redirect URLs and Cloudflare Access boundaries; do not invent them.
2. Implement and test a **real** durable `store` adapter (transactional unique key, crash/restart persistence, private RLS, retention/revocation) and a host `reviewBridge` that delivers the packet to a *verified* Wayglass route or review surface. No fabricated replies.
3. Enforce per-principal rate limits, payload cap, origin/CSRF controls as appropriate to transport, audit without leaking secrets, and authorization recheck at **delivery** time. A revoked grant must fence queued messages.
4. Verify exact-head Node tests and the full MCP test suite, negative cases, 401/403, duplicate conflicts, concurrency and cold restart. Ensure `/readyz` stays 503 until real OAuth/router/store and delivery evidence exist.
5. Stage behind approved HTTPS endpoint, run OAuth 2.1 PKCE flow from an authorized client, call `tools/list` and `wayglass_present`, verify durable receipt and an independent Wayglass review/decline receipt. Only then report a live route. Production rollout and cost require owner-approved infrastructure plan.

**Feather:** halt delivery or review immediately on owner stop or revocation. Preserve history, never synthesize an answer.

**No user action needed for this draft:** the engineering branch and test fixtures are ready for integration review. The production binding is not yet authorized or verified.
