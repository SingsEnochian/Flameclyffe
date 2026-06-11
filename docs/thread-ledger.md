# STARWELL / DEEP Thread Ledger

Status: living loom-card. Last audited 2026-06-11.

Update this whenever a thread becomes load-bearing, retired, folded into React, or split into a new module.

## Purpose

This ledger keeps the recent multithreaded DEEP / STARWELL work readable. It records what is live, what is transitional, what is shared infrastructure, what is mobile-only, and what should not be duplicated.

The current rule: do not add another visual or data thread without deciding which existing thread owns the responsibility.

## Live visual threads

### DEEP central aura

Current state: live and React-native.

Primary files:

```text
apps/starwell/src/live-glyph.jsx
apps/starwell/src/deep-observer-boundary.css
apps/starwell/src/deep-starburst.css
apps/starwell/src/lib/deepStarburst.js
```

Responsibility: map shared DEEP state into CSS starburst variables on `.glyph-orb-wrap`.

Ownership note: `live-glyph.jsx` applies `buildStarburstVars(...)` directly and marks the wrapper with `data-starburst-native="aura"`. The retired binder is no longer part of the live path.

### DEEP sensor-chip flares

Current state: live and React-native.

Primary files:

```text
apps/starwell/src/live-glyph.jsx
apps/starwell/src/deep-observer-boundary.css
apps/starwell/src/lib/deepSensors.js
apps/starwell/src/lib/deepStarburst.js
```

Responsibility: give each meter chip a clipped starburst flare, tiny status bead, label, tooltip, ARIA note, and shared sensor meaning.

Canonical sensor names:

```text
Tide
Presence
Clarity
Entropy
Moon
Geomagnetic
```

Ownership note: `live-glyph.jsx` renders the six chips from `DEEP_SENSOR_CHIPS`, applies `buildSensorStarburstVars(...)`, and marks each card with `data-starburst-native="sensor"`. The six-chip grammar belongs in `deepSensors.js`. Do not duplicate it in another file.

### Mobile pocket-observatory mode

Current state: live.

Primary files:

```text
apps/starwell/src/deep-observer-mobile.css
apps/starwell/index.html
```

Responsibility: lower visual density on phones and narrow tablets, shrink the glyph stage, soften aura/chip flares, tighten labels, and keep readouts readable.

Ownership note: mobile overrides intentionally load last from `index.html`. Do not fold them into the main boundary CSS until visual QA confirms the final shape.

## Shared infrastructure threads

### DEEP state pantry

Current state: shared module and live React dependency.

Primary file:

```text
apps/starwell/src/lib/deepState.js
```

Owns:

```text
DEFAULT_DEEP_STATE
SKY_CLARITY
SKY_TINTS
clampNumber
numberOr
normaliseMoon
getBridgeDeep
normaliseDeepState
makeDeepSignature
```

Rule: DEEP defaults, bridge extraction, sky clarity, moon normalisation, and signatures live here rather than being redefined in binders or visual components.

### DEEP bridge reader

Current state: shared module and live React dependency.

Primary file:

```text
apps/starwell/src/lib/deepBridge.js
```

Owns:

```text
BRIDGE_PULSE_URL
fetchBridgeDeepPulse
```

Rule: bridge pulse fetch logic belongs here. Callers may handle live, stale, and fallback state, but they should not reimplement the bridge fetch ritual.

### DEEP starburst mapper

Current state: shared module and live React dependency.

Primary file:

```text
apps/starwell/src/lib/deepStarburst.js
```

Owns:

```text
normaliseStarburstDeep
buildStarburstVars
buildSensorStarburstVars
buildSensorStarbursts
```

Rule: aura and sensor flare CSS variables are built here. Do not duplicate the variable-building logic in React components or fallback adapters.

### DEEP sensor grammar

Current state: shared module and live React dependency.

Primary file:

```text
apps/starwell/src/lib/deepSensors.js
```

Owns:

```text
DEEP_SENSOR_CHIPS
getDeepSensorByIndex
```

Rule: sensor labels, notes, base sizes, rotations, and proxy mappings belong here. If the six-chip language changes, update this module first.

### DEEP HUD bounds helper

Current state: implemented pure helper. Passive binding is active. Empty HUD layer socket is active. No active floating HUD panels yet.

Primary files:

```text
apps/starwell/src/lib/deepHudBounds.js
apps/starwell/src/deep-hud-bounds-bind.js
apps/starwell/src/deep-hud-bounds.css
apps/starwell/index.html
```

Owns:

```text
DEFAULT_HUD_SELECTORS
DEFAULT_HUD_BREAKPOINTS
DEFAULT_HUD_INSETS
DEFAULT_PANEL_SIZE
DEFAULT_PANEL_POSITIONS
toHudRect
makeRect
insetRect
getHudViewportClass
getHudInset
resolveHudElements
getViewportRect
getAvoidRects
measureHudBounds
clampPanelPosition
makeHudSnapZones
getDefaultPanelZone
positionPanelInZone
getDefaultPanelPosition
panelIntersectsRect
avoidRectsForDefaultPosition
```

Passive binder role:

```text
measure the active Observer shell
ensure an empty .deep-observer-hud-layer exists when React has not provided one
mark that layer data-deep-hud-layer="empty"
publish --deep-hud-* CSS custom properties
set data-deep-hud-bounds="ready"
set data-deep-hud-viewport by viewport class
dispatch deep-observer:hud-bounds with plain data
recalculate on resize, orientation change, DOM mutation, and ResizeObserver events
```

Rule: flexible HUD measurement, safe bounds, avoid zones, snap zones, default panel zones, and panel clamping belong here. No hardcoded coffin-coordinates. No live HUD furniture. No sound. No haptics. No React state mutation. The binding layer is active, but it is passive infrastructure only.

## Retired but retained thread

### Starburst binder

Current state: retained in the repository as a rollback reference, retired from the STARWELL live load path.

Primary file:

```text
apps/starwell/src/deep-starburst-bind.js
```

Historical role:

```text
fetch bridge pulse through deepBridge.js
hold last-known DEEP state
apply aura CSS variables to .glyph-orb-wrap
apply sensor variables and labels to meter chips
respect native React handoff markers
clean up timers and observers on pagehide
```

Current ownership:

```text
live-glyph.jsx owns bridge polling and live/stale/fallback status
live-glyph.jsx owns aura variables and data-starburst-native="aura"
live-glyph.jsx owns sensor labels, notes, variables, and data-starburst-native="sensor"
deepStarburst.js owns aura and sensor variable construction
deepSensors.js owns the six-chip grammar
```

Live-path note: `apps/starwell/index.html` no longer loads `deep-starburst-bind.js`.

Retention rule: keep the file available until visual QA confirms aura and sensor parity across target viewports. Do not delete it without a separate cleanup decision.

## Dormant / static HUD threads

Decision note:

```text
docs/hud-integration-decision.md
docs/starwell-viewport-hud-wrapper-contract.md
```

Current decision: keep the static HUD files shelved for now. Treat them as prototypes/reference implementations. Do not directly load them into `apps/starwell/index.html` until the viewport/HUD wrapper contract is satisfied and sensory consent gates have been reviewed.

### HUD bounds helper

Current state: repo-present, not referenced by STARWELL React search results as of the latest audit.

Primary file:

```text
starwell/deep-observer/deep-observer-hud-bounds.js
```

Responsibility: exposes `window.DEEP_OBSERVER_HUD` with helpers for HUD element detection, bounds rectangles, clamping, default panel positions, snap zones, element clamping, element snapping, and `deep-observer:hud-bounds` dispatches.

Ownership note: do not duplicate floating-panel clamp or snap logic in STARWELL. Use `apps/starwell/src/lib/deepHudBounds.js` for STARWELL-native pure helper work rather than loading the global static helper directly.

### Sensory engine panel

Current state: repo-present, not referenced by STARWELL React search results as of the latest audit.

Primary file:

```text
starwell/deep-observer/deep-observer-sensory.js
```

Responsibility: creates a draggable `#sensoryPanel` with sound, haptic, hum, and soft-mode controls. It uses `window.DEEP_OBSERVER_HUD` when available for panel clamping and snapping.

Ownership note: this is a sensory/HUD layer, not the same thread as STARWELL starburst aura or sensor-chip visuals. Do not add another sound/haptic panel to STARWELL without deciding whether to reuse, module-ise, or retire this one. Do not load sensory UI before sound, haptic, low-stim, mobile bounds, and reset-position consent gates are explicit.

## Documentation threads

### Binding note

Primary file:

```text
docs/deep-starburst-binding.md
```

Responsibility: records the completed React ownership path, shared modules, native markers, retired binder status, and rollback conditions.

### UI boundary contract

Primary file:

```text
docs/ui-boundary-contract.md
```

Responsibility: defines stage/rail/status regions, breakpoints, layer rules, overflow rules, and visual QA checklist.

### DEEP Observer math notes

Primary file:

```text
docs/deep-observer-math.md
```

Responsibility: keeps DEEP framed as symbolic instrumentation, not a physics proof or causation engine.

### HUD integration decision

Primary file:

```text
docs/hud-integration-decision.md
```

Responsibility: records the decision to keep static HUD files shelved for now, treat them as prototypes, and build or bridge STARWELL-native helpers only after the viewport/HUD wrapper contract is explicit.

### Viewport / HUD wrapper contract

Primary file:

```text
docs/starwell-viewport-hud-wrapper-contract.md
```

Responsibility: defines the STARWELL viewport root, Observer instrument shell, glyph stage, readout rail, active empty HUD overlay layer socket, bounds model, default panel positions, snap zones, mobile rules, sensory gates, `deepHudBounds.js` scope, and passive bounds binding layer.

## Completed ownership transition

All four implementation commits were deployed green on 2026-06-11:

```text
19e5835f72dbddf93f38176ea7fa001013c3fa80
Consolidate live glyph DEEP bridge state helpers

d28234e72baa59bd76f217acbf74d3575192ce1d
Hand off DEEP aura starburst to React

0d31ff68d365d5873c35c5ffc1f9f86321dd7ced
Hand off DEEP sensor chips to React

8cc429379a89e3e25966ca7e7ec2d95948f7ff62
Retire transitional DEEP starburst binder from STARWELL
```

## Parallel threads to watch

These may change while DEEP visual work is ongoing:

```text
data/deep-current.json
starwell/deep-observer/specs/Astrolabe_Skin_HUD_Containment_Build_Checklist_v0.1.md
starwell/deep-observer/deep-observer-hud-bounds.js
starwell/deep-observer/deep-observer-sensory.js
```

Rule: if these change, inspect them before assuming a visual bug comes from the starburst layer. The bridge data, HUD checklist, bounds helper, and sensory engine may alter expected behaviour.

## Do not duplicate

Do not create another copy of:

```text
DEEP defaults
bridge pulse URL
bridge fetch logic
six-chip sensor map
starburst CSS variable mapping
mobile density overrides
native handoff marker rules
floating HUD clamp / snap logic
sound / haptic sensory panel logic
```

Add to the shared modules or explicitly bridge the static HUD files instead.

## Next safe moves

1. Perform visual QA at mobile, tablet, laptop, and wide widths.
2. Confirm aura and sensor parity in live, stale, and quiet-fallback bridge states.
3. Keep `deep-observer-sensory.js` dormant until sound, haptic, low-stim, mobile bounds, and reset-position consent gates are explicit.
4. Add HUD furniture only after it can consume measured bounds, live inside the empty HUD layer, and respect mobile docking.
5. Consider deleting the retired binder only after parity QA and a separate explicit cleanup approval.
6. Consider merging mobile overrides into the main boundary sheet only after the mobile pass stabilises.

## Working mantra

One loom. Labelled threads. No duplicate owl parliament. No desktop dashboard crushed into a phone coffin. The brass star may glow, but every glow needs a socket.
