# Wayglass parallel integration contract v0.1

Status: design contract; not a claim of deployed integration.

## Six concurrent lanes

| Lane | Current PR | Independent completion evidence |
| --- | --- | --- |
| Windows installer | #512 | Packed Wayglass assets, host entry link, installed-device browser check |
| Hearthgate / Return Engine | #504 | Cold-return receipts, restart/revocation tests |
| Presence and participant routing | #518, #515 | Host-attested handoff; no dialogue-based verification |
| Source Loom | #514 | Owner-selected source pointers, authorization and provenance |
| Living Observer | #499, #502, #517 | Timestamped measured/simulated/symbolic lenses with provenance |
| Traveller / ship interface | #513, #511 | WebGL fallback, accessible navigation, Feather controls |

## Shared interface

All lanes should accept a host-scoped context envelope:
- world_id and seat_id are distinct and cannot be inferred from display name.
- session_id and trace_id identify the bounded request.
- source_refs are immutable references, never implicit permission to ingest or train.
- consent_ref and revocation_epoch are checked by the host on each external transfer.
- stop_receipt_id, enter_receipt_id, and evidence_ref are optional until verified.
- evidence_kind must be one of: observed-runtime, simulation, mathematical, narrative, symbolic, hypothesis.
- authority_flags default to false; UI text and provider outputs cannot elevate them.

## Invariants

1. The host, not dialogue or browser-supplied status, authorizes participant presence.
2. A provider timeout or mismatched route produces an explicit unverified state.
3. Feather stops future handoffs; already transmitted requests cannot be recalled.
4. Every crossing retains distinct source and destination provenance.
5. Restart does not restore revoked consent or promote narrative continuity.
6. Live measured astronomy and synthetic calculations must be labeled separately.
7. The Source Loom never imports foreign-owned source bytes without explicit scope.
8. Installation, CI, browser signoff and owner acceptance are separate evidence levels.

## Integration gates

G0: each lane passes focused tests in its own branch.
G1: a shared host adapter verifies authorization and receipt lineage.
G2: staging bundles all six surfaces without route collision.
G3: Windows install and local browser smoke verify the actual served bundle.
G4: owner-device iPad/Windows accessibility, consent and stop/return signoff.

No automatic merge, deployment, provider call, or canon mutation is authorized by this document.
