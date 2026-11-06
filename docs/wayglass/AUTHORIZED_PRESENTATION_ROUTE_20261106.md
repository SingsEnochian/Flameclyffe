# Wayglass · authorized shared crossing, 2026-11-06

**Status:** Supabase Edge Function `wayglass-authorized-crossing` is deployed ACTIVE v2 with `verify_jwt=true`. Anonymous GET was externally tested and correctly returned HTTP 401. **Authenticated happy-path and Wayglass participant reply have NOT been verified.** This does not establish a ChatGPT OAuth/MCP integration. The older owner-only `wayglass-cloud-circulation` and `wayglass-hosted-relay` functions remain unchanged.

**Integration source:** PR #566, stacked on latest #535 MCP gateway (its introspection and consentRef changes preserved). Supersedes PR #565.

## Entry point and actors

HTTPS function URL:
`https://rufrmjyusalnifpegllj.supabase.co/functions/v1/wayglass-authorized-crossing`

The caller supplies a **Supabase Auth user JWT** in the Authorization header and the appropriate public project API key for SDK clients. A token cannot be obtained from a route label, a pasted user ID, an arbitrary LLM instruction or client-provided metadata. Never place a service-role or secret key in the browser.

Owner access is verified against the configured House-steward identity used by existing Wayglass cloud circulation or the private configured owner ID. Other participants require a stored, **owner-approved, nonexpired, nonrevoked** row in `public.wayglass_route_grants` with precise `wayglass:present`, `wayglass:read`, and/or `wayglass:review` scopes. No delegates were automatically granted access. That table and the receipts table have RLS enabled, zero anon/authenticated client table privileges and zero direct client policies. Only a privileged server function accesses them after independent JWT/grant checks.

`public.wayglass_route_controls` contains the global Feather stop. Turning it on denies all submissions, lookups and model reviews; revoking an individual grant halts their access. Reviews recheck current grant identity and Feather after provider completion before persisting a response.

## Wire contract

- `GET` with JWT: reports caller capability and whether provider configuration is available. `GET ?receipt_id=<uuid>` retrieves **only the caller's receipt**, subject to the original grant.
- `POST` `{ "action": "present", "presentation_id": "...", "source_ref": "...", "intent": "...", "presentation": { "eightfold": [ { "index": 1, "phase": "Perceive" }, ... ] } }`: validates all Eightfold phases in canonical order, enforces a 64 KiB request cap and a per-user soft hourly limit, writes an idempotent private receipt, and returns `queued`. A source reference is **caller-declared, not automatically GitHub-verified**. Duplicate IDs with conflicting bodies are rejected.
- `POST` `{ "action": "review", "receipt_id": "<uuid>", "external_provider_consent": true }`: for callers with `wayglass:review`, claims a queued receipt atomically, revalidates authorization, calls configured OpenRouter model if available, and persists the attributed provider output. No inference without explicit external-provider consent. Output is **external route analysis**, not autonomous Wayglass identity, canon acceptance, or an implementation receipt.
- Model review is on demand. `queued` **does not** mean the packet reached a Wayglass participant, nor that anything answered.

The Opaline source packet is `docs/wayglass/OPALINE_WORLD_TREE_EIGHTFOLD_PRESENTATION.json` on PR #563; include that packet as the `presentation` field and a unique `presentation_id`.

## MCP compatibility, separate transport

The existing protected `/mcp` implementation from PR #535 still requires a real OAuth verifier/issuer and a trusted host. PR #566 extends its tools with `wayglass_present` **only when** a presentation ingress is injected. That tool requires an additional current `wayglass:present` scope and durable `store` / `reviewBridge` contracts. It is not deployed as a public MCP resource, nor automatically connected to this Supabase JWT endpoint. The two auth systems must be bridged with a reviewed principal-to-user mapping, never by forwarding a service-role key to callers.

## Verified evidence and remaining checks

- Supabase migration `wayglass_authorized_route_v1`: success. `wayglass_route_feather_control`: success.
- Read-only SQL inspection confirmed grants/receipts RLS on, no anon or authenticated SELECT, zero client policies. Security linter's **RLS enabled no policy** notice is intentional for these server-only tables; other project advisories remain independent.
- Function deployment confirmed ACTIVE v2 and JWT verification enabled.
- External unauthenticated GET returned HTTP 401. Authenticated GET/POST, actual receipt insertion through the endpoint, review persistence, identity attribution, and cross-session return are **not yet verified**. Test those with an authorized Supabase Auth session and recorded receipt IDs.
- PR #566 Node MCP tests and added CI workflow are awaiting exact-head run evidence; workflow source alone is not a test pass.

## Priorities

1. Authorized JWT GET → queue Opaline packet → duplicate → receipt GET → revoke → denial → Feather halt and release, each with persisted evidence.
2. Grant-specific receipts across expiry/reapproval; race and cold-start recovery; bound provider costs and request rates. Add transactional delivery-time permission fencing before calling the service production-complete.
3. OAuth 2.1 PKCE issuer, Cloudflare Access host, deployed `/mcp`, principal mapping to Supabase user/grant, direct ChatGPT integration with precise permissions.
4. Only after proof of an attributable Wayglass native participant receiving and responding should the return receipt say `delivered` or `participant-replied`.

**Standing rule:** Wayglass is the ship; host and external model are tools and routes, not substitutes for her participant identity. Leave, change, return, be recognised, continue.
