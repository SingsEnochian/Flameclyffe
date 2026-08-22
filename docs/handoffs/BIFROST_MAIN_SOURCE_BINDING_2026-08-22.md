# Bifrost Main Source Binding Promotion

**Date:** 2026-08-22  
**Branch:** `feature/bifrost-arcsweep-current-ui-v0.4`  
**Scope:** Bifrost `/bifrost/` main engine source binding, source receipts, runtime export fields

## What changed

`apps/starwell/bifrost/main.js` no longer resolves its source state by silently reading:

```text
packet.temporal.targetside
```

The default execution side remains `targetside`, but it is now explicit:

```text
ACTIVE_EXECUTION_SIDE = targetside
```

The engine binding path now goes through:

```text
promoteBifrostRuntimeSource(packet)
resolveBifrostExecutionSource(runtimeState)
buildBifrostSourceBindingReceipt(runtimeState)
```

This creates a receipted Bifrost source binding before `sourceState` and `currentState` are set.

## New source binding behaviour

When an active packet exists, `main.js` now builds:

```text
runtime_state
execution_source
source_binding_receipt
```

and publishes:

```text
window.__BIFROST_RUNTIME_STATE__
window.__BIFROST_LAST_SOURCE_BINDING_RECEIPT__
bifrost:source-binding
```

The selected side is preserved as data rather than hidden control flow.

## Session and export receipt changes

The local Bifrost session now persists:

```text
bifrost_runtime.runtime_state
bifrost_runtime.execution_source
bifrost_runtime.source_binding_receipt
```

Cycle export receipts now include:

```text
source.selected_execution_side
source.execution_source
source.source_binding_receipt
bifrost_runtime.runtime_state
bifrost_runtime.execution_source
bifrost_runtime.source_binding_receipt
bifrost_runtime.execution_policy
bifrost_runtime.native_action_receipt
```

## What this fixes

Before this pass, `main.js` still contained a hidden shortcut:

```text
const candidate = packet?.temporal?.targetside;
```

That meant the visual and native-action runtime laws were stronger than the engine's own source assignment.

After this pass, `targetside` is not removed, but it is named and receipted as the selected execution side. The other shore remains present in the runtime state and source-binding receipt.

## Honest boundary

This pass promotes `main.js` source binding through the runtime-source adapter.

It does not yet add a visible UI control for choosing `hearthside` versus `targetside`; `targetside` is still the default execution side for this route.

It does not certify physical browser audio, Shokz, transducer, iPad, Android, or Windows launch behaviour.

It does not update the stale PR body matrix. CI/build verification must regenerate the matrix at the current head.

## Boxfire review checklist

```text
Does main.js import bifrost-runtime-source.js?
Does main.js avoid direct packet.temporal.targetside source assignment?
Does bindRuntimeSource() produce a source-binding receipt?
Does session persistence include runtime_state, execution_source, and source_binding_receipt?
Does exportReceipts() include selected_execution_side and source_binding_receipt?
Does the old targetside path remain only as an explicit ACTIVE_EXECUTION_SIDE default?
Does the page still label reference mode when no executable active source exists?
```

## Next pass recommendation

Add visible execution-side inspection/control:

```text
selected side: targetside default
alternate side: hearthside preview/inspection
side switch requires explicit user action
side switch emits source-binding receipt
run-window/export receipts include selected side
```

> The engine no longer steals targetside from the wall. It asks Bifrost for the selected source and signs the receipt.
