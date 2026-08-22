# Bifröst Runtime Bootstrap Handoff

**Date:** 2026-08-22  
**Branch:** `feature/bifrost-arcsweep-current-ui-v0.4`  
**Scope:** Bifröst `/bifrost/` runtime authority, two-shore execution guard, early bootstrap receipt

## Purpose

This pass moves the two-shore runtime execution policy in front of the legacy Bifröst page handlers.

The previous pass created the shared runtime adapter and execution bridge, but the two-shore panel was still the primary module applying the policy. This pass adds an early bootstrap module that loads before `main.js`.

## Files changed

```text
apps/starwell/bifrost/bifrost-runtime-bootstrap.js
apps/starwell/bifrost/index.html
apps/starwell/test/bifrostRuntimeBootstrap.test.js
docs/handoffs/BIFROST_RUNTIME_BOOTSTRAP_2026-08-22.md
```

## Runtime load order

`apps/starwell/bifrost/index.html` now loads:

```text
bifrost-runtime-bootstrap.js
main.js
two-shore-premaq.js
premaq-song.js
```

The bootstrap installs the execution bridge before the old page handlers and before the visual two-shore panel becomes the visible reviewer surface.

## What the bootstrap does

The bootstrap:

```text
1. reads the active DualAspectPacket from session storage;
2. builds BifrostRuntimeState;
3. applies BifrostRuntimeExecutionPolicy;
4. installs the capture-phase execution bridge;
5. exposes runtime state and policy on window;
6. emits bifrost:runtime-bootstrap;
7. stores a bootstrap receipt;
8. records blocked-action receipts when guarded controls are refused.
```

Global review handles:

```text
window.__BIFROST_RUNTIME_STATE__
window.__BIFROST_RUNTIME_EXECUTION_POLICY__
window.__BIFROST_RUNTIME_BOOTSTRAP_RECEIPT__
window.__BIFROST_LAST_BLOCKED_ACTION_RECEIPT__
```

Events:

```text
bifrost:runtime-bootstrap
bifrost:execution-policy
bifrost:runtime-state
```

## Guarded actions

The runtime execution bridge guards:

```text
run-window
sound-pair
play-premaq-song
export-receipts
```

When the bridge status is `SHORE_STATE_INCOMPLETE` or `HIDDEN_STATE_DIVERGENCE`, these controls are blocked before their legacy handlers execute.

## Authority boundary

This is a runtime authority hardening pass. It still does not claim:

```text
physical device testing
browser audio audition approval
Shokz or transducer validation
tone approval
canon write
external physical proof
```

The bootstrap may permit labelled local reference mode, but local reference remains uncertified and non-canon.

## Boxfire review checklist

Box should verify:

```text
[ ] `bifrost-runtime-bootstrap.js` loads before `main.js`.
[ ] The bootstrap installs `installBifrostRuntimeExecutionBridge`.
[ ] `run-window`, `sound-pair`, `play-premaq-song`, and `export-receipts` are blocked on incomplete/divergent packets.
[ ] Blocked actions leave `window.__BIFROST_LAST_BLOCKED_ACTION_RECEIPT__`.
[ ] The visible two-shore panel still renders Hearthside, Bridge, and Targetside.
[ ] Local reference mode remains labelled and uncertified.
[ ] No module claims tone approval, canon write, or physical-device proof.
[ ] Tests are run against the current PR head before updating the verification matrix.
```

## Remaining next pass

The final hardening step is direct `main.js` consumption of the shared runtime state.

Target:

```text
main.js should import bifrost-runtime-state.js or bifrost-runtime-engine-bridge.js directly
runWindow() should read policy before executing
soundPair() should read policy before sounding
exportReceipts() should embed the two-shore sidecar directly rather than relying on an external hook
premaq-song.js should obey the same policy for play/export
```

## Verdict

The bridge breaker now loads before the engine room opens. The next pass wires the engine controls to the same breaker internally, so the guard is not only preloaded but native to the engine functions.
