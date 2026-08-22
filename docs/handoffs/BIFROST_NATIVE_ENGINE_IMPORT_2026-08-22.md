# Bifröst Native Engine Import Handoff

**Date:** 2026-08-22  
**Branch:** `feature/bifrost-arcsweep-current-ui-v0.4`  
**Scope:** `/bifrost/` native engine controls, PREMAQ song controls, runtime execution policy, export receipts

## Purpose

This pass moves the Bifröst runtime policy from page-wrapper protection into the native action path used by the engine controls.

The earlier passes installed:

```text
bifrost-runtime-state.js
bifrost-runtime-engine-bridge.js
bifrost-runtime-bootstrap.js
two-shore-premaq.js
```

Those established the two-shore state, visible breaker, early bootstrap and review panel. This pass adds direct imports so `main.js` and `premaq-song.js` check the runtime policy before performing their own actions.

## Files changed

```text
apps/starwell/bifrost/bifrost-native-action-guard.js
apps/starwell/bifrost/bifrost-runtime-engine-bridge.js
apps/starwell/bifrost/main.js
apps/starwell/bifrost/premaq-song.js
apps/starwell/test/bifrostNativeEngineImport.test.js
```

## Native action guard

New module:

```text
apps/starwell/bifrost/bifrost-native-action-guard.js
```

Exports:

```text
resolveNativeRuntimeState(packetReader)
buildNativeActionReceipt(runtimeState, actionId, options)
enforceBifrostNativeAction({ actionId, packetReader, setStatus, statusKind, notes })
```

`enforceBifrostNativeAction` resolves the current `BifrostRuntimeState`, builds the execution policy, records either an allowed native-action receipt or a blocked-action receipt, writes review handles to `window`, dispatches a runtime event and returns a boolean gate result.

Visible browser handles:

```text
window.__BIFROST_RUNTIME_STATE__
window.__BIFROST_RUNTIME_EXECUTION_POLICY__
window.__BIFROST_LAST_NATIVE_ACTION_RECEIPT__
window.__BIFROST_LAST_BLOCKED_ACTION_RECEIPT__
```

Events:

```text
bifrost:native-action-allowed
bifrost:native-action-blocked
```

## Guarded actions

The runtime execution policy now guards:

```text
run-window
sound-pair
play-premaq-song
export-premaq-song
export-receipts
```

`export-premaq-song` was added in this pass so the full PREMAQ song export cannot bypass the two-shore runtime policy.

## main.js native import

`apps/starwell/bifrost/main.js` now imports the native guard directly.

Guarded functions:

```text
runWindow()
soundPair()
exportReceipts()
```

Before running, each function calls:

```text
enforceBifrostNativeAction(...)
```

If the bridge status is `SHORE_STATE_INCOMPLETE` or `HIDDEN_STATE_DIVERGENCE`, the function returns before running compression, browser audio or export work.

`exportReceipts()` now adds:

```text
bifrost_runtime: {
  runtime_state,
  execution_policy,
  native_action_receipt
}
```

This means the exported cycle receipt carries its Bifröst policy proof rather than relying on the visible panel alone.

## premaq-song.js native import

`apps/starwell/bifrost/premaq-song.js` now imports the native guard directly.

Guarded functions:

```text
playSong()
exportSongReceipt()
```

`playSong()` records `bifrost_native_action_receipt` inside the full PREMAQ song receipt.

`exportSongReceipt()` records `export_native_action_receipt` on the exported payload.

This preserves the difference between:

```text
song playback/plan authority
song export authority
```

## Test coverage added

New test file:

```text
apps/starwell/test/bifrostNativeEngineImport.test.js
```

Covers:

```text
- main.js imports the native guard
- main.js guards run-window, sound-pair and export-receipts
- main.js exports bifrost_runtime and native_action_receipt
- premaq-song.js imports the native guard
- premaq-song.js guards play-premaq-song and export-premaq-song
- premaq-song.js exports bifrost_native_action_receipt and export_native_action_receipt
- local reference remains allowed preview and uncertified
- missing targetside blocks native run-window
- complete temporal two-shore packet allows export-premaq-song
```

## Honest status

```text
Early bootstrap breaker:       PRESENT
Two-shore visible panel:        PRESENT
Native main.js guard:           PRESENT
Native PREMAQ song guard:       PRESENT
Bridge receipt sidecar:         PRESENT
Cycle export policy proof:      PRESENT
Song export policy proof:       PRESENT
CI/build execution:             NOT RUN IN CHAT
Physical browser audition:      NOT TESTED
Physical iPad/Shokz/transducer: NOT TESTED
PR body verification matrix:    STALE
```

## Next pass recommendation

Run CI/build and regenerate the PR verification matrix against the current head. Then move from guarded runtime behaviour into formal packet contract hardening:

```text
1. Require temporal.hearthside and temporal.targetside for BIFROST_CROSSING_READY.
2. Add schema tests for DualAspectPacket two-shore requirements.
3. Update Continuity Gate/Arcsweep packet creation to emit both temporal shores deliberately.
4. Add replay fixtures for local reference, complete packet, missing shore and divergence.
5. Regenerate PR matrix from actual CI/build artefacts.
```

## Boxfire review questions

```text
Does main.js call the native runtime guard before runWindow, soundPair and exportReceipts?
Does premaq-song.js call the native runtime guard before playSong and exportSongReceipt?
Can export-premaq-song bypass the bridge policy?
Do cycle exports include runtime_state, execution_policy and native_action_receipt?
Do song receipts include playback and export native receipts?
Does SHORE_STATE_INCOMPLETE block native execution before the legacy handler does work?
Does HIDDEN_STATE_DIVERGENCE produce a blocked-action receipt?
```

> The breaker is now inside the engine hand, not only on the wall beside it.
