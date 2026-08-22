# Bifröst CI Failure Triage — 2026-08-22

Status: fixture repair committed; fresh CI queued
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

Current head after fixture repair and triage handoff:

```text
4cb2e6330ea2502e4938108e7993be0d4f1f9571
```

Fresh workflows have appeared for the current head:

```text
STARWELL Static Bundle:       queued · run 32561651950
Hearthgate Windows Installer: pending · run 32561651865
```

Latest PR metadata after the handoff reports `mergeable: false`; this may be transient while GitHub recomputes after new commits, or it may indicate a real stacked-branch merge issue that must be checked after CI starts.

Release remains blocked until CI reruns and verifies the full suite/build.

## Boxfire review note

This was a test-fixture correction, not a weakening of runtime fail-closed behaviour. The runtime should still block true `SHORE_STATE_INCOMPLETE` and `HIDDEN_STATE_DIVERGENCE` states.
