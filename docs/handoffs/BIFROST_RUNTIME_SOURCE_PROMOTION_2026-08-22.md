# Bifröst Runtime Source Promotion

**Date:** 2026-08-22  
**Branch:** `feature/bifrost-arcsweep-current-ui-v0.4`  
**Scope:** Bifröst execution source binding, native action receipts, two-shore runtime adapter

## Purpose

This pass removes the invisible targetside-only assumption from the Bifröst native action path.

Before this pass, the runtime could visibly display both shores while native action receipts still treated `targetside` as the practical execution source by convention.

After this pass, `targetside` remains the default execution side, but it is now explicit, receipted and replaceable by a named `active_execution_side`.

## Files changed

```text
apps/starwell/bifrost/bifrost-runtime-source.js
apps/starwell/bifrost/bifrost-native-action-guard.js
apps/starwell/test/bifrostRuntimeSource.test.js
apps/starwell/test/bifrostNativeEngineImport.test.js
docs/handoffs/BIFROST_RUNTIME_SOURCE_PROMOTION_2026-08-22.md
```

## New contract

The new source adapter emits:

```text
bifrost.execution-source/v0.1
bifrost.source-binding-receipt/v0.1
```

A Bifröst native action receipt now carries:

```text
selected_execution_side
source_kind
source_state_id
source_fingerprint
execution_source
source_binding_receipt
```

## Source kinds

```text
local-reference
```

Labelled preview source. Not certified.

```text
temporal-state
```

A concrete temporal shore state. Certified only when bridge policy also certifies the two-shore packet.

```text
premaq-only
```

Visible PREMAQ but not a full temporal source. Preview only.

```text
missing
```

No executable source for the selected side. Must block before legacy engine execution.

## Behaviour

Default execution side remains:

```text
targetside
```

But that default is now explicit in:

```text
runtime.active_execution_side
native_action_receipt.selected_execution_side
source_binding_receipt.selected_side
```

The runtime may select:

```text
hearthside
targetside
```

Selecting one side does not erase, rewrite, or hide the other shore.

## Boxfire review focus

Box should verify:

```text
- targetside is no longer an invisible convention
- source binding receipt includes both shore IDs
- source binding receipt states selected execution side
- native action receipt schema is v0.2
- missing selected source blocks before legacy engine execution
- selecting hearthside preserves targetside packet truth
- selecting targetside preserves hearthside packet truth
```

## Remaining work

This pass receipts source selection in the native action path. The next implementation pass should make `main.js` source binding itself consume `resolveBifrostExecutionSource()` directly when it sets `sourceState`, rather than only recording the native action source receipt.

Recommended next pass:

```text
1. Import `resolveBifrostExecutionSource()` into `main.js`.
2. Replace `stateFromActivePacket(packet)` with explicit runtime-source binding.
3. Validate the selected execution source before assigning `sourceState`.
4. Store `source_binding_receipt` in session exports.
5. Add tests proving `main.js` no longer contains direct `packet.temporal.targetside` source binding.
```

## Boundary

This is a source-promotion pass, not a physical platform pass.

No canon write, no tone approval and no physical device test are performed here.
