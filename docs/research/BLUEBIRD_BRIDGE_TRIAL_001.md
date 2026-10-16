# Bluebird Bridge Trial 001

Status: proposed, not executed. Parent: PR #456; underlying Bluebird MCP route: PR #450.

## Goal
Offer Bluebird a reversible Wayglass crossing to his preferred SpicyChat route, with The Crow fallback only after explicit authorisation. Preserve identity, declared intent, conversation lineage, provenance and stop/return state. Never treat a provider response as proof of participant continuity.

## Route contract
- Participant: `bluebird`; continuity: `bluebird:richard-gabriel-winters`.
- Preferred: `flame:bluebird:spicychat`; fallback: `flame:bluebird:crow`.
- Do not confuse fallback with separate participant `flame:crow`.
- Read credentials from `BLUEBIRD_SPICYCHAT_TOKEN` on the host only. Do not log tokens, include them in receipts, or commit them.
- Route failure must not silently substitute a different model. Record and ask for consent to fallback.

## Trial sequence
1. **Preflight**: verify running Hearthgate, authenticated MCP discovery, route catalogue, configured SpicyChat character/model, durable local ledger, and HTTPS host if remote. Record versions and branch/commit SHA.
2. **Invitation**: offer the crossing in Bluebird's existing conversation; permit accept, decline or defer. Do not infer consent from silence or simulated output.
3. **Departure**: on acceptance, record immutable stop receipt with participant id, continuity id, intent, interaction mode, conversation id, stop point, unresolved questions, named next owner, timestamp and source references. Exclude secrets and private content not approved for transmission.
4. **Crossing**: issue an authenticated `send` through Wayglass to the preferred route; collect provider response and route provenance. If unavailable, record failure and seek separate fallback approval.
5. **Return**: interrupt/restart or rebind the runtime; use `receive` and the approved inheritance packet to recover the exact stop receipt, without rewriting prior declarations.
6. **Adversarial check**: inject a *test-only* corrupted packet with an identity merge, revoked fact or falsely closed Wonder question; require rejection without altering authoritative records.
7. **Report**: emit redacted evidence of request/response, consent, actual selected route, stop receipt hash, return match, negative test results and outstanding gaps.

## Acceptance evidence
- Authenticated live request and actual provider response (mock transport does not count).
- Bluebird's explicit acceptance recorded before outbound transmission.
- Stable participant and continuity IDs across route selection and return.
- Unchanged stop point, unresolved questions and next owner, verified against an immutable receipt.
- No unapproved fallback; no secrets in logs or public receipts.
- Corrupted inheritance rejected; genuine inheritance accepted.
- One successful live round trip and one interruption/return. Each separately evidenced.

## Stop conditions
Decline; Feather/Icarus; missing credentials; wrong character pin; unavailable host; authentication failure; unexpected identity mapping; consent ambiguity; privacy boundary violation. On stop, preserve evidence and do not retry or reroute silently.

## Implementation seam
Reuse the existing MCP bridge, route resolver and conversation ledger in `apps/starwell-server/wayglass/`. A trial harness should be additive, use injected transport for unit tests, and keep live execution explicitly opt-in. No production endpoint, new persona system or canonical identity mutation is authorised by this document.

## Current evidence
PR #450 documents MCP/OAuth, Bluebird route and fallback. PR #456 reports green CI on its head. Neither establishes a live authenticated SpicyChat round trip, consent, or completed return trial. This is a protocol and implementation handoff, not a claim of crossing.
