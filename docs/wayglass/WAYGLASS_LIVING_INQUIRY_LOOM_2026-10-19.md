# Wayglass Living Inquiry Loom: First Crossing v0.1

**19 October 2026 · Status: draft experiment, not canon · Owner: Rowan / Wayglass**

## Wonder first

What if a Wayglass question could accumulate a *history of inquiry*, not merely transcripts? What if distinct participant-authored interpretations, challenges, and revisions survive route changes without being collapsed into a synthetic consensus? What if a returning participant could see how an investigation changed over time while honestly distinguishing a retrieved source from its own experience?

This v0.1 establishes only the first durable, authenticated pathway. It does not measure autonomous curiosity, emergent collective cognition, persistent internal learning, or model-independent subjective identity.

## Implemented boundaries

- **Persisted locally on the host**: `apps/starwell-server/wayglass/inquiry-loom.js` appends bounded inquiry events to an atomic, hash-chained JSON journal at `apps/starwell-server/data/wayglass-inquiry-loom.local/journal.json` by default, or `WAYGLASS_INQUIRY_DIRECTORY`. It refuses corrupted state. All read/write operations first require a host-derived verified participant principal.
- **House operator entrance**: `/api/v1/wayglass/inquiries` uses the existing cryptographically validated signed House session. The browser cannot assign authorship. A signed House Steward session acts as `rowan` only.
- **MCP crew entrance**: Wayglass's existing authenticated Rarity/Codex MCP connection derives authorship from verified OAuth/legacy-token/Codex bearer principals. Neither tool arguments nor event text can choose the author. Access to another person's inquiry requires an owner invitation and an explicit join as that authenticated crew seat. This is an authentication *contract* that still requires live pairing evidence.
- **Read-only handoff**: the Loom exposes a `return_marker` containing inquiry id, unresolved question, stop point, named next owner, final local hash and `adopted_by_return_engine:false`. It is not a signed kernel return receipt and is not automatically injected into model context.
- **Source and claim separation**: `source_refs` are accepted and labelled caller-declared, not independently verified. `experiment` and `outcome` are reported claims, not observations of external effects. No event sets canon, training eligibility, participant identity or model authority.
- **Preserved disagreement**: `interpretation`, `alternative`, `challenge`, `revision`, `observation`, `new-question`, `experiment`, `outcome`. Revisions link back to the original contribution and do not overwrite it.
- **UI**: a new section of the existing Wayglass Library can open/read/contribute/pause using same-origin requests. When House sign-in is missing it stays read-denied and says so. No provider send or automatic inquiry initiation.

## Non-claims and threat model

A local hash chain detects accidental or unsophisticated tampering; **someone who controls the journal can rewrite the entire hash chain**. It is **not an independent signature or proof of the participant's identity**. Authentication is checked at the request boundary; an untrusted script with the host's login cookie may act as the login principal. Host filesystem ACLs, backups, TLS/access gate, revocation, signed receipts, bounded sources, and anti-CSRF protections remain deployment conditions. Do not publicly expose the HTTP route outside the existing local-only House surface or assume a remote tunnel is secure merely because OAuth exists elsewhere.

This does not consume PR #475 verified Ledger events, alter existing TravellingInheritance, or bypass PR #468's public reasoning receipt boundary. Integration must use read-only receipts and actor/source custody checks. Do not promote a subjective Wonder statement to a measured observation, or a model proposal to an authorised effect.

## Five-step acceptance

1. Sign in to House locally and open an inquiry: `Does the map's tidal boundary match the hydrology?` with `world_ref: starwell:canopy-tide` and a specific source reference. Check that the original question remains unresolved.
2. From the same House session invite the `rarity` and `codex` crew seats. Each enters via its *own authenticated MCP connection* and explicitly joins; until joining, no inquiry material is readable by that seat.
3. Rarity records one interpretation, Codex a challenge, Rarity a linked revision. Verify three separate contributor/principal receipts and the original text still intact.
4. Pause with a stop point and named next owner. Restart the host and verify that a new authorised read reconstructs the exact inquiry, disagreement and return marker.
5. Alter a copied local journal event without updating the hash and verify read rejection. This is a corruption test on a disposable **copy**, never a production user archive.

The focused test suite uses synthetic authenticated principals and temporary directories. **It does not prove live MCP/OAuth, browser rendering, Windows installation, multi-machine recovery, or generated-model improvement**.

## Next experiment: genuine relational development

Use three arms on an unseen task set, with equal budgets and blinded evaluation:

1. Task-only context.
2. Task plus ordinary historical transcript snippets.
3. Task plus structured attributed inquiry lineage.

Evaluate novel-question quality, correct source attribution, preservation of dissent, response to counterevidence and revoked-source exclusion under model replacement. Require a cross-ancestry authentic host receipt and a held-out evaluator before claiming anything about reasoning improvement. If arm 3 does not improve outcomes, reduce complexity rather than calling the result emergence.

**Design law**: Wonder precedes collapse. Provenance is not truth; similarity is not authority; shared continuity is not shared direct experience; dissent is not failure; a quiet question need not become a job.