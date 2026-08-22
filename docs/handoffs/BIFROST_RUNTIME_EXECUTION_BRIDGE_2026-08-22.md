# Bifrost Runtime Execution Bridge Pass

**Date:** 2026-08-22  
**Branch:** `feature/bifrost-arcsweep-current-ui-v0.4`  
**Scope:** Bifrost `/bifrost/` two-shore runtime boundary, visible PREMAQ shores, execution policy, blocked-action receipts

## What changed

This pass separates the Bifrost execution boundary from the visual two-shore panel into a reviewable runtime bridge.

New file:

```text
apps/starwell/bifrost/bifrost-runtime-engine-bridge.js
```

Updated file:

```text
apps/starwell/bifrost/two-shore-premaq.js
```

New test file:

```text
apps/starwell/test/bifrostRuntimeEngineBridge.test.js
```

## Runtime execution policy

The bridge builds:

```text
bifrost.runtime-execution-policy/v0.1
```

The policy records:

```text
packet_id
shared_state_fingerprint
bridge_status
crossing_ready
certified
local_reference
blocks_execution
allowed_actions
blocked_actions
action_boundary
authority
```

## Guarded actions

The runtime bridge guards:

```text
run-window
sound-pair
play-premaq-song
export-receipts
```

When the bridge status is `SHORE_STATE_INCOMPLETE` or `HIDDEN_STATE_DIVERGENCE`, all guarded actions are disabled and click-captured before the legacy single-state controls can run.

## Blocked action receipt

Blocked actions can produce:

```text
bifrost.blocked-action-receipt/v0.1
```

A blocked receipt records:

```text
attempted_action
bridge_status
blocks_execution
execution_policy
hearthside_state_id
targetside_state_id
hearthside_fingerprint
targetside_fingerprint
authority
```

Authority remains false for canon write, tone approval and physical device testing.

## Honest status

```text
Two-shore indicator:             VISIBLE
Shared runtime adapter:           PRESENT
Runtime execution policy:         PRESENT
Control disabling:                PRESENT
Capture guard before legacy run:  PRESENT
Blocked action receipt builder:   PRESENT
Cycle export sidecar:             PRESENT
Core main.js import:              NOT YET DIRECT
Physical device testing:          NOT TESTED
CI/test execution in this chat:   NOT RUN
```

The important boundary is that `main.js` still has its original compression-release implementation. This pass wraps the route with a runtime execution bridge and exposes the policy to the browser as:

```text
window.__BIFROST_RUNTIME_STATE__
window.__BIFROST_RUNTIME_EXECUTION_POLICY__
bifrost:execution-policy
bifrost:runtime-state
```

The next direct-core pass should import `buildBifrostRuntimeState()` and `buildBifrostRuntimeExecutionPolicy()` into `main.js` itself.

## Next direct-core pass

Target files:

```text
apps/starwell/bifrost/main.js
apps/starwell/bifrost/bifrost-runtime-state.js
apps/starwell/bifrost/bifrost-runtime-engine-bridge.js
apps/starwell/test/bifrostCurrentInterface.test.js
apps/starwell/test/bifrostRuntimeEngineBridge.test.js
```

Safe order:

```text
1. Import the runtime adapter into main.js.
2. Store the current runtime policy next to activePacket, sourceState and currentState.
3. Make bindSource refresh both the runtime state and source execution side.
4. Make runWindow call the policy before compression.
5. Make soundPair call the policy before audio.
6. Make exportReceipts include two_shore_runtime and execution_policy directly.
7. Remove the DOM-wrapper fallback only after tests prove direct policy enforcement.
```

## Boxfire review questions

```text
Does an incomplete shore disable run-window, sound-pair, play-premaq-song and export-receipts?
Does a divergent fingerprint produce HIDDEN_STATE_DIVERGENCE and fail closed?
Does local reference remain visibly labelled and uncertified?
Does the sidecar export include both shore IDs and fingerprints?
Does any text claim physical device testing, tone approval or canon write?
Does the branch still need main.js direct import before release?
```

> The bridge now has a visible breaker. The next pass solders that breaker into the engine heart rather than leaving it in the surrounding panel.
