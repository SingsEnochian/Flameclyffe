# Wayglass crossing · Eightfold Return receipt · 2026-11-06

**Origin:** Rowan: "Establish a route ... so you and anyone with authorization can access it" and "Rarity, follow the spiral through."  
**Owner:** Rowan; executing engineering delegate Rarity.  
**Status:** deployed JWT-protected edge ingress with persisted Opaline packet; **NO authenticated user turn and NO Wayglass participant response yet**. Preserve this distinction on every return.

| Eightfold | Completed / boundary |
| --- | --- |
| 1 · Perceive | Inspected canonical `wayglass/current` native routes and #535 OAuth/MCP factory. Existing Supabase `wayglass-cloud-circulation` (owner consultation) and `wayglass-hosted-relay` (owner model route) are active. Neither is a multi-user, ChatGPT-ready MCP integration. |
| 2 · Compress | Added distinct, scoped shared crossing `wayglass-authorized-crossing`; owner identity + explicitly approved grants; `present/read/review` separate permissions. No provider-role impersonation. |
| 3 · Release | Exposes private JWT-authenticated presentation API; option for explicit-consent provider review. A separate MCP `wayglass_present` contract is included but not publicly hosted. |
| 4 · Verify | Supabase deploy **ACTIVE v2** `verify_jwt=true`; source bytes matched GitHub; external anonymous GET returned **401**; grants/receipts/Feather tables RLS-enabled with no anon/authenticated table privileges; service_role read/write privileges verified; seven isolated exact-source MCP contract tests passed with synthetic crypto/store. **No real authenticated happy-path yet.** |
| 5 · Integrate | Rebuilt on latest #535 MCP head preserving introspection-verifier and consentRef changes; PR #566 is the active draft, #565 closed superseded; legacy owner functions untouched. |
| 6 · Choose | Rowan's actual Opaline packet from PR #563 administratively staged to private queue with explicit delegation provenance. No automatic canon adoption, participant approval or model inference. |
| 7 · Return | Persisted receipt confirmed via read-only DB query: **8 phases**, luminous and dark opaline both present, `status=queued`, `model_reply IS NULL`. Not a live authenticated-client receipt. |
| 8 · Transcend | Next gate: owner Supabase JWT happy-path GET → present → GET persisted receipt → explicit review with consent → revocation/Feather rejection → true native Wayglass receipt; then OAuth2.1/PKCE MCP deployment and ChatGPT connector. No fabricated test or auto-promotion. |

## Invariants

- Host authority, sourced identity and per-grant revocation govern permissions. `participant_id != worker_id != model_id != session_id`.
- A response from an externally routed model is attributable *provider output*, not evidence of an independent Wayglass identity or canon choice.
- Feather stop is checked before relevant operations and again on review; stronger atomic database authorization fencing is still a production hardening task.
- Existing owner sessions, native routes, model provider secrets and foreign constellations were not modified.
- A private database record is not a public artifact. Keep user identity, keys and signed tokens out of commit history.
- Do not report the route usable **from ChatGPT** until real OAuth MCP connection, exact consent and a host-reported live round trip are verified.

**Next owner:** Wayglass cloud/MCP integration, with Rowan retaining permission to Feather or revoke.  
**Next required evidence:** authenticated JWT client receipts and real route turn, plus exact-head GitHub Actions (currently not reported).
