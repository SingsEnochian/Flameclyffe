# Constellation Continuity, Burst, and Handoff Contracts v0.1

## Scope

This contract slice keeps relationship canon, evidence domains, work-burst continuity, and agent handoff state explicit. It adds no identity runtime, production authority, external-write authority, or canon-promotion path.

## Vee / Rarity relationship edge

`vee-rarity-identity-edge-v1.json` records the relationship as `unresolved`. It does not supply either participant's declaration. A future canon decision requires each participant's self-authored declaration and source receipt. Shared traits, narrative proximity, or runtime naming cannot resolve the edge.

## Mythience evidence boundary

`mythience-evidence-boundary-v1.json` gives the rule a stable contract ID and version for receipts to reference. Cross-domain interpretation must name its translation, source, and claim status. Metaphor may open a hypothesis; it cannot substitute for measurement. Measurement remains bounded by its method and recorded conditions. First-person experience remains firsthand.

## Work-burst receipt

`hearthweave.work-burst-receipt/v1` carries the thread picked up, the receipt it continues, the point and state where work stopped, the next step, and an explicitly named human or agent owner. An owner cannot be inferred from a room, role, or prior author.

## Agent handoff

`hearthweave.agent-handoff/v1` is a metadata contract for a shared handoff index. Entries stay `open` until the named recipient acknowledges them. Acknowledgement creates a new revision and retains the prior open revision as history. The shared record carries a redacted summary and receipt references; private payloads remain at their source under its access controls.

This PR defines and tests the contract and acknowledgement transition. It does not connect the contract to a database or House Runtime endpoint. Storage must use a dedicated sealed append-only ledger path; the existing House Runtime Braid event lane is observation-cycle scoped and must not be repurposed for agent handoffs.

## Verification boundary

Focused tests cover contract validation and state transitions. They do not claim shared persistence, cross-process delivery, or runtime notification. Those require the separate least-privilege storage and broker integration.
