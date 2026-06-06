# DEEP HUD Integration Decision Note

Status: decision note before implementation. Do not treat this as a completed build pass.

## Purpose

The Astrolabe Skin + HUD Containment checklist says the Observer should become one coherent human / cybernetic / Stonewood / magical / astrolabe instrument, not a collection of glittering parts.

This note records how the existing dormant/static HUD files relate to that checklist before STARWELL imports, bridges, or replaces them.

## Checklist signal

The Astrolabe checklist makes HUD containment Phase 1. Its core requirement is that all floating UI remain inside the instrument HUD unless deliberately detached later through DEV.

Specific Phase 1 tasks include:

```text
define observer-hud-bounds or equivalent safe-zone module
read viewport map from window.DEEP_OBSERVER_VIEWPORT_MAP
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

Current state: repo-present, apparently dormant in the STARWELL React path.

Observed role: defines a window-level HUD helper, `window.DEEP_OBSERVER_HUD`, for HUD element detection, bounds, clamping, snap zones, default positions, snapping, and dispatching a `deep-observer:hud-bounds` event.

Fit with checklist: high. This appears to be an early or parallel implementation of the Phase 1 `observer-hud-bounds` requirement.

Risk: it is a global static helper rather than a shared module under `apps/starwell/src/lib`. If imported casually, it may create hidden coupling through `window` state.

### `starwell/deep-observer/deep-observer-sensory.js`

Current state: repo-present, apparently dormant in the STARWELL React path.

Observed role: creates a draggable `#sensoryPanel` with sound, haptic, hum, and soft-mode controls. It uses `window.DEEP_OBSERVER_HUD` when available for panel clamping and snapping.

Fit with checklist: partial to high. This supports Phase 6 sensory feedback and Phase 1 floating-panel containment, but it is also a static global script with DOM creation side effects.

Risk: sound/haptic behaviour must remain opt-in, low-stim aware, and device-gated. This file should not be loaded into STARWELL without checking consent, reduced-motion, mute, and sensory clutter constraints.

## Current decision

Do not directly load these static files into `apps/starwell/index.html` yet.

Instead, treat them as prototypes/reference implementations for two future shared modules:

```text
apps/starwell/src/lib/deepHudBounds.js
apps/starwell/src/lib/deepSensoryBus.js
```

Bridge or port the logic only after the viewport registry and HUD wrapper target are named.

## Recommended next implementation slice

1. Inspect whether `window.DEEP_OBSERVER_VIEWPORT_MAP` exists anywhere active.
2. If it exists, align HUD bounds to it.
3. If it does not exist, create a small viewport/bounds registry before wiring draggable panels.
4. Port only the pure helper logic from `deep-observer-hud-bounds.js` into `apps/starwell/src/lib/deepHudBounds.js`.
5. Keep DOM side effects out of the helper module.
6. Leave `deep-observer-sensory.js` dormant until sound/haptic consent gates and low-stim rules are explicitly reviewed.

## Acceptance gate before loading sensory UI

Do not load a sensory panel into STARWELL until all are true:

```text
sound never plays before user opt-in
haptics never fire if unsupported or disabled
low-stim visibly and audibly calms the interface
panel stays bounded to HUD on mobile and desktop
panel can reset to a safe default position
panel cannot cover the glyph centre by default
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

A code search did not find those exact filenames in the repository during this audit pass. They may be planned, renamed, or stored outside the repo. Do not assume they exist until found.

## Working decision

For now: keep the static HUD files shelved, document them as prototypes, and build STARWELL-native shared modules only when the viewport/HUD wrapper contract is explicit.

No duplicate clamp/snap logic. No duplicate sound/haptic panel. One instrument, one HUD contract.
