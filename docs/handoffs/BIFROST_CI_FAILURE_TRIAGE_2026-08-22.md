# Bifröst CI Failure Triage — 2026-08-22

Status: fixture repair committed
PR: #113
Branch: feature/bifrost-arcsweep-current-ui-v0.4

## Failing workflow investigated

Workflow: STARWELL Static Bundle
Run: 32561439867
Job: Build portable STARWELL site
Failed step: Verify contracts and tests

The job reached the Node test suite and failed before bundle/build steps ran.

## Failure summary

The run reported 185 tests, 182 passing, 3 failing.

Failing tests:

```text
apps/starwell/test/bifrostNativeEngineImport.test.js
- native action guard blocks incomplete two-shore packets before engine execution

apps/starwell/test/bifrostRuntimeEngineBridge.test.js
- runtime policy blocks execution and legacy export when a shore is missing

apps/starwell/test/bifrostRuntimeSource.test.js
- missing selected source blocks even before legacy engine execution
```

## Root cause

The failing tests attempted to create a missing targetside packet with:

```js
packet({ targetside: undefined })
```

but their helper used destructuring defaults:

```js
function packet({ hearthside = temporalState('hearth-state'), targetside = temporalState('target-state') } = {})
```

In JavaScript, a destructured property with value `undefined` receives the default value. The fixture therefore rebuilt a complete targetside while the test expected a missing targetside.

The runtime correctly classified the packet as complete because the test gave it a complete packet.

## Repair committed

The fixture helpers now use own-property checks:

```js
function packet(options = {}) {
  const hearthside = Object.hasOwn(options, 'hearthside')
    ? options.hearthside
    : temporalState('hearth-state');
  const targetside = Object.hasOwn(options, 'targetside')
    ? options.targetside
    : temporalState('target-state');
}
```

This preserves the default complete-packet fixture while allowing explicit `undefined` to mean “shore omitted”.

Updated files:

```text
apps/starwell/test/bifrostNativeEngineImport.test.js
apps/starwell/test/bifrostRuntimeEngineBridge.test.js
apps/starwell/test/bifrostRuntimeSource.test.js
```

## Current boundary

The fix has been committed, but the current head has not yet produced a fresh workflow result at the time of this handoff.

Current head after fixture repair and triage handoff:

```text
569d8ef7ce91422f8a771acc2387e6c9cc79c6d7
```

Latest PR metadata after the handoff reports `mergeable: true`.

Release remains blocked until CI reruns and verifies the full suite/build.

## Boxfire review note

This was a test-fixture correction, not a weakening of runtime fail-closed behaviour. The runtime should still block true `SHORE_STATE_INCOMPLETE` and `HIDDEN_STATE_DIVERGENCE` states.
