# STARWELL DEEP HUD integration decision

Date: 2026-06-15
Status: accepted
Scope: STARWELL / DEEP HUD socket, bounds, and diagnostics

## Decision

The DEEP HUD runtime must stay contract-fed. HUD class names, socket ownership, bounds events, diagnostic labels, and debug affordances should be read from small shared contract modules rather than copied into binders, debug overlays, or React components.

The current runtime path uses:

- `apps/starwell/src/lib/deepHudContract.js` for shared HUD selectors, dataset keys, owners, events, and state names.
- `apps/starwell/src/lib/deepHudDebugContract.js` for DEV-only debug bead and diagnostics constants.
- `apps/starwell/src/lib/deepHudMeasureSelectors.js` for contract-built selector bundles passed into HUD measurement callers.
- `apps/starwell/src/deep-hud-socket-bind.js` to create the bootstrap HUD socket before bounds are measured.
- `apps/starwell/src/deep-hud-bounds-bind.js` to measure panel, stage, readout, safe rects, and publish bounds vars/events.
- `apps/starwell/src/deep-hud-socket-diagnostics.js` to report socket health in DEV.
- `apps/starwell/src/deep-hud-debug-bead.js` to render the opt-in DEV bounds bead.

## Current runtime state

The live HUD binders no longer rely on the legacy default selector block in `deepHudBounds.js` during normal operation.

`deep-hud-bounds-bind.js` passes `HUD_MEASURE_SELECTORS` into `measureHudBounds()`.

`deep-hud-debug-bead.js` also passes `HUD_MEASURE_SELECTORS` into `measureHudBounds()`.

This means the active runtime selector path is contract-fed even though `deepHudBounds.js` still contains a legacy fallback selector object.

## Known fossil

`apps/starwell/src/lib/deepHudBounds.js` still contains a fallback block like:

```js
export const DEFAULT_HUD_SELECTORS = {
  root: '.starwell',
  shell: '.live-glyph-panel.deep-observer-panel',
  stage: '.glyph-orb-wrap',
  readout: '.glyph-readout',
  hudLayer: '.deep-observer-hud-layer',
};
```

This fallback is currently inert for the live HUD runtime, because active callers pass `HUD_MEASURE_SELECTORS` explicitly. It should still be retired during a patch-capable/local editing pass.

## Future patch

When using a patch-capable editor, replace the fallback block in `deepHudBounds.js` with:

```js
import { HUD_MEASURE_SELECTORS } from './deepHudMeasureSelectors.js';

export const DEFAULT_HUD_SELECTORS = HUD_MEASURE_SELECTORS;
```

Do not rewrite the geometry math while making this change. The intended patch is selector cleanup only.

## Guardrails

- Do not hardcode HUD selectors in binders, debug overlays, or React components.
- Keep CSS selectors in CSS where necessary; CSS cannot import JS contracts.
- Keep `deepHudBounds.js` focused on geometry and placement math.
- Keep DEV-only toggles and labels in `deepHudDebugContract.js`.
- Keep runtime socket health checks in `deepHudSocketInvariant.js`.
- Do not force branch rewinds or non-fast-forward updates to bypass connector limits.

## Next test target

Add a small DEV assertion or test harness around `collectHudSocketReport()` to confirm:

- at least one DEEP observer panel exists when the viewer is mounted,
- each observer panel has exactly one direct HUD socket,
- there are zero orphan HUD sockets,
- there are zero duplicate HUD sockets,
- bounds eventually reach the ready state.

This keeps the tree self-reporting instead of requiring manual DOM spelunking.
