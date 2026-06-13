# DEEP HUD Integration Decision Note

Status: active decision note after passive HUD infrastructure repair. Do not treat this as approval to load sensory panels or floating HUD furniture.

## Purpose

The Astrolabe Skin + HUD Containment checklist says the Observer should become one coherent human / cybernetic / Stonewood / magical / astrolabe instrument, not a collection of glittering parts.

This note records how the existing dormant/static HUD files relate to that checklist after the STARWELL-native passive bounds layer was repaired and tested.

Related governing contract:

```text
docs/starwell-viewport-hud-wrapper-contract.md
```

Use that contract for STARWELL viewport, HUD wrapper, bounds, safe-zone, mobile docking, sensory/haptic gates, and future `deepHudBounds.js` scope decisions.

## Checklist signal

The Astrolabe checklist makes HUD containment Phase 1. Its core requirement is that all floating UI remain inside the instrument HUD unless deliberately detached later through development tooling.

Specific Phase 1 tasks include:

```text
define observer-hud-bounds or equivalent safe-zone module
read viewport map from window.DEEP_OBSERVER_VIEWPORT_MAP when active
calculate instrument/HUD bounds
create snap zones
clamp draggable panels inside HUD bounds
recalculate on resize / orientation change
provide reset positions
keep sensory controls from becoming loose page-fixed objects
keep dual time panel away from glyph centre by default
```

It also says not to duplicate floating-panel logic, to document script and CSS load order, and to keep observation, model, glyph, skin, sensory, and narrative layers separate.

## Existing corridor files

### `starwell/deep-observer/deep-observer-hud-bounds.js`

Current state: repo-present, static/global, and still shelved from the STARWELL React path.

Observed role: defines a window-level HUD helper, `window.DEEP_OBSERVER_HUD`, for HUD element detection, bounds, clamping, snap zones, default positions, snapping, and dispatching a `deep-observer:hud-bounds` event.

Fit with checklist: high as a reference implementation. It helped define the STARWELL-native helper shape, but it should not be loaded directly into the Vite app while the native helper exists.

Risk: it is a global static helper rather than a shared module under `apps/starwell/src/lib`. If imported casually, it may create hidden coupling through `window` state.

### `starwell/deep-observer/deep-observer-sensory.js`

Current state: repo-present, static/global, and still shelved from the STARWELL React path.

Observed role: creates a draggable `#sensoryPanel` with sound, haptic, hum, and soft-mode controls. It uses `window.DEEP_OBSERVER_HUD` when available for panel clamping and snapping.

Fit with checklist: partial to high. This supports Phase 6 sensory feedback and Phase 1 floating-panel containment, but it is also a static global script with DOM creation side effects.

Risk: sound/haptic behaviour must remain opt-in, low-stim aware, and device-gated. This file must not be loaded into STARWELL without checking consent, reduced-motion, mute, and sensory clutter constraints.

## STARWELL-native status

The active STARWELL path now has a native pure bounds helper and passive binder:

```text
apps/starwell/src/lib/deepHudBounds.js
apps/starwell/src/deep-hud-bounds-bind.js
apps/starwell/src/deep-hud-bounds.css
apps/starwell/test/deepHudBounds.test.js
```

Completed native repairs:

```text
panel-local shell / stage / readout measurement
readoutRect included in avoidRects
fallback zones de-duplicated and collision-checked
production HUD socket remains empty and panel-free
development diagnostic bead is gated by import.meta.env.DEV plus explicit opt-in
helper regressions run in CI before production build
```

The production HUD layer is therefore empty infrastructure, not a hidden control panel. Development diagnostics may mark the layer `diagnostic`, but production does not import that diagnostic module.

## Current decision

Do not directly load the static HUD or sensory files into `apps/starwell/index.html`.

Treat them as prototypes/reference implementations for future shared modules only:

```text
apps/starwell/src/lib/deepHudBounds.js
apps/starwell/src/lib/deepSensoryBus.js
```

The pure HUD bounds portion has already been ported into STARWELL-native helper form. The sensory portion remains dormant until consent, low-stim, reset, mobile docking, and device gates are explicit.

## Recommended next implementation slice

The next safe implementation slice is React-owned HUD layer handoff:

```text
live-glyph.jsx renders .deep-observer-hud-layer inside the Observer shell
passive binder observes and measures an existing React-owned layer
passive binder creates a fallback empty layer only when React has not rendered one
no furniture, sensory controls, sound, or haptics are introduced in this slice
```

This keeps ownership moving toward React before any visible HUD furniture arrives.

## Acceptance gate before loading sensory UI

Do not load a sensory panel into STARWELL until all are true:

```text
sound never plays before user opt-in
haptics never fire if unsupported or disabled
low-stim visibly and audibly calms the interface
panel stays bounded to HUD on mobile and desktop
panel can reset to a safe default position
panel cannot cover the glyph centre by default
production HUD layer ownership is explicit
```

## Documentation gap

The Astrolabe checklist references these companion specs:

```text
Build_Governance_Audit_Checklist_v0.1.md
Viewport_Resolution_Map_Spec_v0.1.md
Astrolabe_Shell_Spec_v0.1.md
Glyph_Engine_Contract_v0.1.md
Shared_Module_Architecture_v0.1.md
```

A code search did not find those exact filenames in the repository during the earlier audit pass. They may be planned, renamed, or stored outside the repo. Do not assume they exist until found.

## Working decision

For now: keep static HUD files shelved, keep sensory dormant, use the STARWELL-native helper for bounds and snap logic, and hand HUD layer ownership to React before adding visible controls.

No duplicate clamp/snap logic. No duplicate sound/haptic panel. One instrument, one HUD contract.
