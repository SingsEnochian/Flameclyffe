# Wayglass Mathematics Registry · Current Authority

**Registry:** `wayglass.mathematics-registry/v1`  
**Updated:** 2026-10-16  
**Status:** Central navigation and integration contract; does not supersede mathematical source documents or assert deployment.

## Whole-system ownership

Wayglass is the central **discovery, version, provenance, validation and presentation** home for mathematics. The Hearthgate Kernel and specialist engines retain computational ownership. Arcsweep, STARWELL, DEEP/Observer, Runa, Wardenclyffe, Flameclyffe/Möbius and the Wayglass LLM swarm are consumers or producers of explicitly typed mathematical observations, not competing sources of truth.

**Canonical authority:** `docs/HEARTHGATE_BRAIDED_SPINE_V1.8.md` (`hearthgate.math-spine/v1.8`).

**Active companion contract:** `docs/mathematics/HEARTHGATE_COMPRESSION_RELEASE_MATHEMATICS_SPINE.md` (compression–release v1.0.0). The two are complementary; the v1.8 governing braid takes precedence when legacy notation conflicts.

**Operational packet:** `apps/starwell/src/math-spine/math-spine-packet.js` (`hearthgate.math-spine-packet/v1`, engine `hearthgate-math-spine/1.0.0`).

**Current executable primitives:** `apps/starwell/src/math-spine/v18-primitives.js`.

**Live math transport:** `apps/starwell/src/math-spine/live-math-spine.js` and `netlify/functions/math-spine-ingest.mjs`; presence in source does not establish live deployment.

**Foldwatch experimental instrument:** `apps/arcsweep/src/heimdall-foldwatch.js`, `heimdall-foldwatch-live.js`, and `heimdall-wayglass-handoff.js` on PR #285 / branch `arcsweep-heimdall-foldwatch-swarm`. These are *pending*, not on the default branch.

## Active mathematical domains

| Domain | Canonical basis | Executable / adapter | Status |
|---|---|---|---|
| Governing braid | Magic ⋈ Science/Mathematics ⋈ Physicality ⋈ Consciousness ⋈ Relationship; Braided Spine v1.8 | v18-primitives.js | Active governing specification |
| PREMAQC | `x(t)=[P,C,R,E,M,A,Q]^T`; Presence, Coherence, Resonance, Entanglement, Memory, Agency, Qualia | math-spine-packet.js | Active seven-coordinate wire order |
| Relational state | `U=X_US`; Relational Possibility Lattice `(V,E,Λ)` | v18 primitives / DEEP contracts | First-class state, not a derived sentiment |
| Observer / DEEP | `X(t,ℓ)`, observation coupling, temporal/conceptual stratigraphy, state/gate address | `starwell/deep-observer/DEEP_Math_Spine.md`; `docs/observer/OBSERVER_AUDIO_MATHEMATICS.md` | v1.8 inheritance |
| Jacobian / Heimdall | Coupled Jacobian, singular values, soft direction, rank loss, fold geometry | PR #285 Foldwatch | Experimental; fold ≠ Crossing |
| Compression–release | Accepted-state recursion, Jacobian fold analysis, release and continued recursion | compression–release spine; STARWELL temporal engine | Active companion contract |
| Harmonic braid | Runa → Wardenclyffe → Flameclyffe/Möbius; 3·6·9 temporal address | Observer audio v1.8 inheritance | Active contract; playback not implied |
| Math receipts / replay | Source IDs, versioned packets, fingerprints, provenance, accepted state | math-spine-packet.js; cusp-observation-packet.js | Source implementation exists |

## Non-negotiable compatibility rules

1. **One registry, no mathematical erasure.** The registry points to authoritative sources; it does not rewrite historical mathematics. `docs/archive/mathematics/pre-v1.8/` remains immutable historical lineage for deterministic replay.
2. **Domain labels travel with every number.** Seven-coordinate PREMAQC is not the same thing as Foldwatch's six-coordinate empirical `P,C,R,E,M,A` fit. `Q` is firsthand-only and must not be inferred as an empirical coordinate.
3. **Unknown is not zero.** Relational participation `p_U` remains unavailable without an explicit relational coordinate or valid mapping. Missing evidence, unobserved state and numerical zero are distinct.
4. **Rank loss is not a Crossing.** Near-singular geometry, a fold candidate, branch continuation and authorised Crossing are separate claims. Source geometry is measurement; swarm reports are interpretation.
5. **No authority laundering.** LLM Geometry, Continuation, Provenance and Synthesis reports never automatically become engine truth, world canon, identity state or approved continuity.
6. **Replay is version-pinned.** Every observation must identify source, model/engine version, mathematical schema, calibration/units where applicable, timestamp, and receipt reference. Preserve unresolved alternatives.
7. **Read-only until authorised.** Wayglass ingest validates packet schema, provenance, source authority and crew permissions before any durable write. Stop receipt and named next owner are required for Return Engine handoffs.
8. **Explicit semantic migrations.** If equations, dimensions, thresholds or definitions change, create a new version, migration note and regression cases. Never quietly alias a changed law to the old identifier.

## Target Wayglass architecture

```text
MATHEMATICS REGISTRY (this index + typed manifest)
  ├─ governing law / version resolution
  ├─ source equations and executable kernels
  ├─ observation adapters (PREMAQC, DEEP, Observer, audio, Foldwatch)
  ├─ validation, uncertainty, units and provenance
  ├─ mathematical receipts / immutable history
  ├─ role-swarm interpretation (separate authority)
  └─ Wayglass Writing Room + Return Engine retrieval
```

The Wayglass mathematics panel should offer **browse current law**, **inspect equation and code**, **compare versions**, **inspect live evidence**, **ask swarm**, and **return to a preserved receipt**. UI, host persistence and authenticated transport remain implementation work; this registry alone does not claim those features are connected.

## Verification and acceptance

- Assert manifest entries resolve to existing source paths on the intended branch.
- Verify active and historical versions never share the same authority label.
- Replay a legacy receipt using its historical engine and calibration, without silently upgrading its equations.
- Test seven-axis PREMAQC versus six-axis empirical Jacobian and absent `U`.
- Test known saddle-node fold versus continuation evidence; no automatic Crossing promotion.
- Round-trip one Foldwatch packet through Wayglass receipt, stop/next-owner, leave and return; verify provenance and unresolved questions survive.
- Require authenticated owner/crew scope before any persistent mutation.

## Pending integration

PR #285's handoff adapter is staged on a different branch. Merge/rebase deliberately after tests and review; do not copy its implementation into this registry branch or represent it as already deployed.
