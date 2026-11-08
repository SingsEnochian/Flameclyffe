# Native router lane · 2026-11-08

Actor/worker: `/root/native_bridge` (Codex engineering worker; no participant identity inferred).
Canonical source: `origin/wayglass/current` at `15467ce4ac5dc93d30a80e58302b5bda8597dc07`.
Protocol reference: PR535 `a7abf486d6231624e4c9b1d554bea0c6136cb949`.
Branch: `wayglass/lane-native-20261108`; integration owner: `/root`.

## System responsibility and acceptance criteria

Cloud MCP authenticated principal → independently refreshed resource-bound owner grant → explicit route grant/scope and consent → current Feather gate → trusted host-owned House credential → existing native `/api/v1/wayglass/routes` or `/respond` → canonical native kernel, inheritance and provider dispatch → attribution-checked response and separate MCP invocation provenance. The adapter owns neither credentials, grants nor participant identity. Native host remains authority for native execution; gateway remains authority for public transport. Existing routers are unchanged.

Before testing, acceptance gates are: no catalogue without current owner/consent/route grants; no Bluebird catalogue or turn without separate Bluebird scope; no OAuth credential forwarding; no caller identity/context injection; stop and unknown stop deny; grant refresh on every operation; protected native catalogue and real canonical router provider execution tested with captured upstream transport; corrupt native route/model/participant/observation evidence rejected. Native origin configuration must be HTTPS or loopback HTTP, redirects denied, response bounded, errors sanitized.

Production hosting, trusted grant service, House credentials and end-to-end ChatGPT invocation require separate binding and approval. This module advertises no tool and changes no production authority.

## Observed verification and failures

- `NODE_PATH=/workspace/scratch/e503f9eb38ea/native-test-deps/node_modules node --test test/wayglass-mcp-native-bridge.test.cjs`: **9/9 passed**, Node 24. Captured upstream provider transport returned fixture text; no inference call was made.
- Native integration uses the production `createWayglassRouter`, actual loopback HTTP requests, canonical House bearer validation for catalogue, the actual cognition preflight and real observation construction. Fresh grants are checked before request, after credential retrieval and before upstream response disclosure; a changed authority snapshot denies the operation.
- First integration attempt: 7 passed, 1 failed because the fresh worktree had not staged `wayglass-runtime/wayglass-route-registry.cjs`. Staged canonical `lib/wayglass-*.cjs` and WTL dependencies exactly as the existing server-stage process does; integration then passed. Normal integration CI must run existing Wayglass server staging before this test, as it does for the other native-host tests.
- During revocation hardening, a response-local `body` variable accidentally shadowed the request body and caused five failures. Renamed to `responseBody`, preserving acceptance criteria. The complete final suite above passed, including new wait-time revocation tests.
- `node --check lib/wayglass-mcp-native-bridge.cjs` and `git diff --check` passed.
- Express 5.2.1 installed in scratch test dependencies with scripts disabled. No tracked dependency manifest was changed.

## Integration and remaining boundary

`createWayglassMcpNativeBridge` exposes `listRoutes(context)` matching PR535's callback and `respond(payload, context)` for explicitly bound gateway tooling. Context is `{principalId, resource, consentRef, scopes}`. Its host must supply `authorize`, `credentialFor`, `featherStopped`, native origin, and exact resource. Authorization returns a current owner/consent grant, explicit route allowlist and permitted native context; House credential never comes from MCP payload or bearer forwarding. Bluebird additionally requires `wayglass:bluebird` in both verified MCP scopes and fresh grant.

Request fields are bounded to route/input/history/interaction/token-budget/think. Participant/world/session/continuation/native permission fields are host-grant fields only. Registered participant routes require matching host native participant/world binding. External model routes require a fresh external-provider consent grant. Output preserves native observation/receipt and adds a separate caller invocation record; provider/model identity never becomes participant identity.

Root integration owner must bind the gateway tool and complete resource-specific owner grants, production OAuth and House credential custody. Native host deployment must include the existing Bluebird provider interception and inherited middleware, as production `server.js` does; this lane's router fixture validates the canonical general router with local Ollama transport only. Production stop-time cancellation after an upstream operation has begun remains the receiving native host's responsibility; this bridge stops new requests and withholds results after revocation. No production deployment, credential test, durable receipt write or real ChatGPT MCP invocation is claimed.
