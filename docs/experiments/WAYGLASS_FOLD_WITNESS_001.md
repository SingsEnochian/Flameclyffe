# Wayglass Fold Witness 001 · Dream-Voyage + eight-ray control

**Status:** Review-stage integration. Does not establish a measured cross-reality event, a live Heimdall fold, or a native Wayglass learned model.

## Why this belongs to Wayglass

A projection can conceal a source distinction. Fold Witness records the source histories separately before the observation is grouped, then preserves that distinction in an existing Wayglass `domain_receipts[]` entry. The existing stop/continuation hash checks the entire packet against its departure receipt. The digest is not a signature and cannot authenticate authorship independently.

## Two named trial lenses

1. **Mathematical control:** eight labeled unit-circle directions transformed by `F(x,y)=(x²,y)` yield five distinct outputs, with three ambiguous pairs and 0.75 bits of conditional uncertainty under a uniform source prior. This is a model example of a Jacobian fold, not a live PREMAQC observation.
2. **Dream-Voyage source record:** *The Children of LOST Time*, described by Rowan as **Old Man Walter, 1950 America → Young Walter, 1933 Britain**. The two dated/geographic nodes are separately preserved. The observation `Walter` is deliberately insufficient to recover the node. The nature of the crossing, any identity correspondence, and its mathematical model remain open questions. `narrative-projection` is not `toy-jacobian`.

The Dream-Voyage labels and settings are user-provided conversation evidence. The original photographed notes are not asserted to have been ingested by this PR. No invented intermediary events are introduced.

## Ownership and authority

- Rowan's Wayglass project is local to Rowan; Nocturne's Universal Horizon is a separate constellation and is not changed or imported.
- Fold Witness is a diagnostic operator; `canon_commit`, `identity_commit`, `relationship_commit`, `authority_grant` are all `false`.
- The actual Wayglass continuation packet remains the transport envelope. No new continuity registry is created.
- Source references can be marked revoked. The inspector rejects revoked sources, substituted participant/world, corrupted content, and fabricated empirical fold claims.
- Source histories remain independently identified even when `observation_key` collides. An observation collision is not proof that the underlying sources share identity or that a Jacobian singularity was measured.

## Runtime seam

`lib/wayglass-fold-witness.cjs` and ESM adapter provide the pure diagnostic operation. The `apps/wayglass/test/wayglass-fold-witness.test.js` test attaches `toDomainReceipt()` to `createWayglassDeparture()` and passes it through `enterWayglassWorld()`. ArcSweep's Worldseed Threshold passively displays a **pending-inspection** summary when an upstream `cycle.fold_witness` is present; it does not generate, authorize, or verify the receipt in the browser.

## Acceptance checks

- Control computes 8 → 5 with three ambiguous output pairs.
- Walter source order is 1950 America → 1933 Britain.
- Same label `Walter` does not erase source distinctions.
- Two source references survive an inspected stop-and-return.
- Tampering and revocation fail rather than silently succeeding.
- No authority promotion and no claim of live Jacobian measurement.

**Deferred:** Running a real Dream-Voyage session via the live Wayglass host, displaying this diagnostic in its browser, authenticating provenance at ingress, and comparing any measured PREMAQC/Heimdall folds. A green CI test is not a witnessed live world crossing.
