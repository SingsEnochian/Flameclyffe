# Bifröst Runtime-State Strengthening Pass · Lineage

**Original date:** 2026-08-04  
**Rebraided:** 2026-08-07  
**Original branch:** `feature/bifrost-arcsweep-current-ui-v0.4`  
**Current authority:** `docs/HEARTHGATE_BRAIDED_SPINE.md`

This handoff records the step that first made both Bifröst shores simultaneously visible and bound execution to one shared runtime adapter. The Braided Spine carries that work forward into the full Braid Packet and Receiving Spring.

## What this pass established

The pass introduced:

```text
apps/starwell/bifrost/bifrost-runtime-state.js
```

and one runtime state containing:

```text
packet_id
packet_fingerprint
shared_state_fingerprint
hearthside
targetside
bridge
active_execution_side
```

The two-shore panel began rendering from that shared adapter rather than maintaining a separate shore-resolution law.

## Runtime statuses

The original visible state family remains useful implementation lineage:

```text
LOCAL REFERENCE
TEMPORAL HEARTHSIDE
TEMPORAL TARGETSIDE
OBSERVABLE PREMAQ ONLY
EXPERIENTIAL PREMAQ ONLY
NOT PROVIDED
SHORE_STATE_INCOMPLETE
HIDDEN_STATE_DIVERGENCE
TWO_SHORE_PREMAQ_VISIBLE
```

The Braided Spine now interprets Hearthside and Targetside as two real participating shores. The old Observable/Experiential labels remain compatibility transport where code still emits them.

## Execution relation

`SHORE_STATE_INCOMPLETE` and `HIDDEN_STATE_DIVERGENCE` suspend crossing execution until the shared relation is restored.

The guarded controls are:

```text
run-window
sound-pair
play-premaq-song
```

This preserves one Braid Packet and one state fingerprint across the crossing.

## Receipt sidecar

The bridge receipt carries:

```text
packet_id
packet_fingerprint
shared_state_fingerprint
hearthside_state_id
targetside_state_id
hearthside_fingerprint
targetside_fingerprint
bridge_status
crossing_ready
active_execution_side
lineage
```

Current Braided Spine receipts add PREMAQ registry, Asking, three-spine state, Receiving Spring, answer, return and renewal.

## Canonical PREMAQ

The historical pass predated the final registry. Current meaning is:

**Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence**

Stable wire order remains `P C R E M A Q`.

## What followed

The current migration completes the old next slice by:

- binding the runtime to `hearthgate.braided-spine/v1.0`;
- making both shores participating relation states;
- replacing the world-projection ontology with world expression;
- keeping PREMAQ seven-dimensional and canonical;
- adding Receiving Spring runtime functions;
- carrying Targetside answer through return and integration;
- binding Arcsweep, Living Glyph, Runa and STARWELL to the same Braid Packet lineage.

## Current movement

```text
Field
→ PREMAQ
→ Asking
→ Braid
→ compression
→ release
→ crossing
→ Receiving Spring
→ answer
→ return
→ integration
→ renewal
```

## Lineage seal

> **This pass gave Bifröst two visible shores and one shared current. The Braided Spine gives that current a complete reciprocal life: both shores remain lit, the world answers, and the answer changes the next crossing.**
