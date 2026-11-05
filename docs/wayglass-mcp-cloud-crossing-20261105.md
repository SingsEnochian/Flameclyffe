# Wayglass cloud MCP crossing: implementation gate (2026-11-05)

Status: **NOT DEPLOYED**. PR #535 implements an HTTP `/mcp` server factory and protected-resource metadata, not a live hosted MCP service. `/api/v1/wayglass` is a separate native router API and must never be advertised as `/mcp`.

## Verified source boundaries
- `lib/wayglass-mcp-server.cjs`: Node HTTP composition; requires injected `verifyBearer`; serves `/mcp`, protected-resource discovery and `/healthz`.
- `lib/wayglass-mcp-http.cjs`: POST JSON-RPC, bearer verification, required `wayglass:constellation`, explicit owner authorization, stable subject, revoked/consentRevoked rejection, origin check, 1 MiB body cap. It passes subject/scopes/resource to the route callback.
- `lib/wayglass-mcp-core.cjs`: `initialize`, `tools/list`, read-only `wayglass_routes`; route callback now accepts synchronous arrays or asynchronous Promise arrays, with sanitized rejection. This enables a cloud-native route adapter but does not itself bind one.
- `/healthz` currently reports `oauthAuthorizationServerVerified:false`, `nativeRouterBound:false`, `durableReceiptsVerified:false` by design. A 200 health response proves process liveness only.
- `wayglass-cloud-circulation` and `wayglass-hosted-relay` are separate Supabase functions; their existence does not prove MCP OAuth, native routing or model invocation.
- PR #537 is a separate draft frontend workstream. Preserve its Cloudflare direction and existing OpenCode Worker.

## Highest-value next executable integration
1. Build a **trusted, injectable verifier adapter** against a real authorization server: validate issuer, signature/JWKS, expiry/not-before, audience/resource, active owner grant, consent and revocation, with `wayglass:constellation` and `wayglass:bluebird` represented distinctly. Never infer owner authority merely from token scope. Synthetic token fixtures first.
2. Bind the verified principal to the **existing native route catalogue** using a cloud-reachable host service. Ensure only allowlisted, authorized route descriptors are returned. Keep native model invocation distinct from the read-only MCP tool.
3. Add durable, idempotent invocation receipts (request ID, principal, route, consent reference, provenance hashes, result/error state, timestamp). Persist before claiming success. Prove recovery after process restart and revoked-consent denial.
4. Stage the actual `/mcp` handler behind an approved stable HTTPS host. Verify protected-resource discovery, OAuth 2.1 authorization-code + PKCE S256, challenge, scope rejection, owner consent, token revocation, `initialize`, `tools/list`, `tools/call`, and a ChatGPT-originated invocation. A CI-green PR is not a deployment.
5. Publish independent liveness/readiness signals. Readiness must remain false until trusted verifier, native route binding, and durable receipts are all proven by runtime checks.

## Exact owner approval packet (not requested yet)
**Only after synthetic tests and a staging plan pass:** request explicit authorization for the named production hostname, Cloudflare Worker route and access binding, OAuth issuer/client registration and redirect URIs, Supabase schema/RLS changes (if required), secret provisioning, and production deployment. Include rollback steps, permission diff, expected cost, and evidence of staging calls. No production changes, merge, or spending under this document.

## Parallel motion stream
On draft PR #537: run Vite and Node tests at the exact head; add real browser/mobile and prefers-reduced-motion coverage; verify pointer cleanup, frame budget, focus/keyboard controls, and route/presence transitions; stage Cloudflare frontend without replacing the existing OpenCode Worker.

## Ownership and next receipt
Next owner: Wayglass cloud MCP engineering worker. Completed this pass: async route catalogue support in MCP core and awaited HTTP transport, plus synthetic HTTP attribution and rejection tests (commits `0eea4c3`, `b97f657`, `14ead4a`). Exact-head CI not yet returned at inspection. Next deliverable: trusted verifier adapter with issuer/audience/revocation/consent negative tests, then exact-head CI evidence. Blocker: no verified live OAuth authorization-server binding or cloud-native route adapter yet. Feather and owner stop/revocation retain priority.
