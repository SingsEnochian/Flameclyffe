# Bifrost Runtime-State Strengthening Pass

**Date:** 2026-08-04  
**Branch:** `feature/bifrost-arcsweep-current-ui-v0.4`  
**Status:** PARTIAL / STRENGTHENED  
**Scope:** Bifrost two-shore PREMAQ visibility, bridge gate behaviour, receipt sidecar, automated contract tests

## What changed

This pass strengthens the prior two-shore visibility pass by adding a shared pure runtime adapter:

```text
apps/starwell/bifrost/bifrost-runtime-state.js
```

The adapter builds one `bifrost.runtime-state/v0.1` object from the active `DualAspectPacket`:

```text
packet_id
packet_fingerprint
shared_state_fingerprint
hearthside
targetside
bridge
active_execution_side
```

The two-shore PREMAQ panel now renders from that adapter instead of owning a separate shore-resolution law.

## Runtime statuses

The adapter exposes the following visible statuses:

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

`SHORE_STATE_INCOMPLETE` and `HIDDEN_STATE_DIVERGENCE` set `blocks_execution: true`.

## Control hardening

The two-shore panel now disables and capture-blocks the primary execution/audio controls when the bridge is incomplete or divergent:

```text
run-window
sound-pair
play-premaq-song
```

This is a safety gate for certified crossing execution. Local reference remains labelled as reference mode and does not claim certification.

## Receipt hardening

The panel now adds an explicit bridge receipt export:

```text
Export bridge receipt
```

It also hooks the existing `export-receipts` button and emits an automatic two-shore sidecar export whenever local cycle receipts are exported.

The sidecar includes:

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
certified
active_execution_side
blocks_execution
authority flags
```

Authority flags remain false for canon write, tone approval and physical-device testing.

## Automated tests added

```text
apps/starwell/test/bifrostTwoShorePremaq.test.js
```

The test file asserts:

```text
- /bifrost/ loads the two-shore script
- the panel names Hearthside / Observable
- the panel names Targetside / Experiential
- local reference is visible and uncertified
- a complete temporal two-shore packet is crossing-ready
- missing shore data becomes SHORE_STATE_INCOMPLETE and blocks execution
- mismatched fingerprints become HIDDEN_STATE_DIVERGENCE and block execution
- the sidecar receipt includes both shore ids/fingerprints and bridge status
```

## Honest boundary

This pass still does not fully promote Bifrost into a two-shore mutable engine loop inside `main.js`. The strengthened adapter exists and guards the page, but the compression-release engine still uses the existing current released state path.

Therefore the status is:

```text
Two-shore indicator:       STRENGTHENED
Bridge execution guard:    PARTIAL / UI-GUARDED
Two-shore sidecar receipt: FUNCTIONAL IN BROWSER EXPORT PATH
Core main.js runtime:      NOT YET FULLY PROMOTED
Physical platforms:        NOT TESTED
Boxfire review:            REQUIRED
```

## Next implementation slice

The next pass should remove the remaining split by importing `bifrost-runtime-state.js` directly into `main.js` and making `BifrostRuntimeState` the single source for:

```text
sourceState
currentState
exportReceipts()
runWindow()
soundPair()
premaq-song source
```

Safe order:

```text
1. Import buildBifrostRuntimeState into main.js.
2. Replace stateFromActivePacket(packet) with a runtime adapter call.
3. Select active_execution_side deliberately.
4. Block runWindow and soundPair before execution if bridge.blocks_execution is true.
5. Add both-shore fields directly to exportReceipts() payload.
6. Add tests proving main.js imports the adapter and names both-shore export fields.
7. Only then update the PR verification matrix head.
```

> The bridge now has a shared adapter, visible shore-lanterns, a breaker for bad current, and a sidecar receipt. The next pass must wire the engine heart directly into that same adapter.
