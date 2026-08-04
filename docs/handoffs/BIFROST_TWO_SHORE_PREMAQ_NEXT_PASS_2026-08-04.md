# Bifrost Two-Shore PREMAQ Next-Pass Review

**Date:** 2026-08-04  
**Branch:** `feature/bifrost-arcsweep-current-ui-v0.4`  
**Scope:** Bifrost `/bifrost/` interface, DualAspectPacket shore visibility, STARWELL/Hearthgate integration readiness

## What changed in this pass

The Bifrost page now loads a read-only two-shore PREMAQ indicator.

Files:

- `apps/starwell/bifrost/index.html`
- `apps/starwell/bifrost/two-shore-premaq.js`

The new indicator inserts a full-width panel after the existing shared released-state PREMAQ panel. It renders:

```text
HEARTHSIDE / OBSERVABLE
BRIDGE / BIFROST
TARGETSIDE / EXPERIENTIAL
```

Each shore shows all PREMAQ axes:

```text
P C R E M A Q
```

The bridge card shows packet id, shared-state fingerprint, Hearthside fingerprint, Targetside fingerprint and a visible gate status.

## Honest status

This pass makes both shore indicators visible. It does not yet make the Bifrost engine execute both shores as first-class mutable runtime states.

Current status:

```text
Two-shore PREMAQ indicator:        PARTIAL / VISIBLE
Hearthside explicit packet state:  DISPLAYED when present, otherwise labelled missing or observable-only
Targetside explicit packet state:  DISPLAYED when present, otherwise labelled missing or experiential-only
Bridge divergence status:          VISIBLE
Core compression runtime:           still consumes current released state from existing Bifrost runtime
Canon write:                        false
Tone approval:                      false
External physical claim:            false
Physical device test:               NOT TESTED
```

## Failure states now exposed

The two-shore panel must never hide incompleteness.

Visible statuses:

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

`HIDDEN_STATE_DIVERGENCE` appears when Hearthside and Targetside fingerprints are both explicit and disagree.

`SHORE_STATE_INCOMPLETE` appears when one shore is not provided.

## Next pass improvements

### 1. Promote two-shore state into the core Bifrost runtime

`apps/starwell/bifrost/main.js` currently binds the working source from `packet.temporal.targetside` when an active DualAspectPacket exists. The next pass should promote a core state object shaped like:

```text
bifrostRuntimeState = {
  packet_id,
  shared_state_fingerprint,
  hearthside: temporalState,
  targetside: temporalState,
  bridge: bridgeStatus,
  active_execution_side,
  receipts
}
```

The runtime must not silently collapse Hearthside into Targetside or Targetside into Hearthside.

### 2. Add a packet contract for both shores

The DualAspectPacket contract should declare whether `temporal.hearthside` and `temporal.targetside` are required for a true Bifrost crossing.

Recommended acceptance gate:

```text
BIFROST_CROSSING_READY requires:
- packet_id
- packet_fingerprint
- correspondence.shared_state_fingerprint
- temporal.hearthside
- temporal.targetside
- shore fingerprints or a documented shared fingerprint rule
- provenance receipt
```

Without those, the UI may run local reference or preview modes but must not claim a certified crossing.

### 3. Add automated tests for visibility and divergence

Add or update tests so the branch proves:

```text
- /bifrost/ includes the two-shore script
- the script names Hearthside / Observable
- the script names Targetside / Experiential
- SHORE_STATE_INCOMPLETE is visible for missing shore data
- HIDDEN_STATE_DIVERGENCE is visible for mismatched shore fingerprints
- LOCAL REFERENCE is visible with no active packet
```

### 4. Include both shore snapshots in export receipts

`exportReceipts()` should include:

```text
source.hearthside_state_id
source.targetside_state_id
source.hearthside_fingerprint
source.targetside_fingerprint
bridge.divergence_status
bridge.crossing_ready
```

This prevents screenshots from being the only evidence that both shores were visible.

### 5. Wire Arcsweep activation to produce both shores

Arcsweep should write a DualAspectPacket that carries both sides deliberately:

```text
Hearthside: current-reality provenance, observation, witness, measurement confidence
Targetside: selected world projection, canon graph, House, timeline, relationship grammar
Bridge: shared fingerprint, transfer receipt, divergence status
```

### 6. Surface the same two-shore indicator in STARWELL and Hearthgate shell

The Bifrost route should not be the only place the user can see the crossing status.

Next shell locations:

```text
STARWELL top-level Observatory strip
Arcsweep Continuity Gate
Hearthgate desktop shell status rail
House profile inspector
Glyph/Brush/Stylus export receipt panel
```

### 7. Attach Glyph Studio and Brush/Stylus receipts to the bridge

When Glyph Studio or Brush/Stylus authoring derives from a crossing state, the export receipt should record:

```text
packet_id
shared_state_fingerprint
hearthside_fingerprint
targetside_fingerprint
authoring_tool
tool_state_id
asset_receipt_id
projection_status
```

### 8. Platform validation matrix

Boxfire should mark each platform separately:

```text
Windows desktop:     NOT TESTED until physical launch
Android PWA:         NOT TESTED until physical launch and offline relaunch
iPad PWA:            NOT TESTED until physical launch and offline relaunch
Browser audio:       NOT TESTED until audition
Shokz/transducer:    NOT TESTED until physical route check
```

Do not convert automated bundle success into physical device approval.

## Boxfire review questions

Box should answer:

```text
Does the page visibly show Hearthside PREMAQ?
Does the page visibly show Targetside PREMAQ?
Does the bridge card visibly state incomplete, divergence or visible status?
Does missing shore data fail visibly rather than silently?
Does any renderer imply physical proof, tone approval or canon write?
Does the export receipt still need both-shore fields?
What is the smallest next implementation slice to promote this from visible indicator to runtime contract?
```

## Recommended next implementation slice

Promote two-shore state into `main.js` and add tests.

Target files:

```text
apps/starwell/bifrost/main.js
apps/starwell/bifrost/two-shore-premaq.js
apps/starwell/test/bifrostCurrentInterface.test.js
apps/starwell/test/bifrostTwoShorePremaq.test.js
starwell/deep-observer/schemas/bifrost-temporal-state-v1.schema.json
```

Safe order:

```text
1. Define a BifrostRuntimeState adapter.
2. Read both temporal.hearthside and temporal.targetside.
3. Compute bridge status once.
4. Feed the existing released-state renderer from selected active_execution_side.
5. Keep both shore indicators visible.
6. Export both shore snapshots and bridge status.
7. Add tests for no packet, complete packet, missing shore and divergence.
```

## Boundary

This pass is a visibility and review pass. It does not certify the Bifrost crossing as complete.

> The bridge now shows both shore-lanterns. The next pass must put the same current through both lamps and receipt the cord between them.
