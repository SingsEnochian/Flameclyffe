# STARWELL / DEEP Thread Ledger

Status: living loom-card. Update this whenever a thread becomes load-bearing, retired, folded into React, or split into a new module.

## Purpose

This ledger keeps the recent multithreaded DEEP / STARWELL work readable. It records what is live, what is transitional, what is shared infrastructure, what is mobile-only, and what should not be duplicated.

The current rule: do not add another visual or data thread without deciding which existing thread owns the responsibility.

## Live visual threads

### DEEP central aura

Current state: live.

Primary files:

```text
apps/starwell/src/deep-observer-boundary.css
apps/starwell/src/deep-starburst.css
apps/starwell/src/deep-starburst-bind.js
apps/starwell/src/lib/deepStarburst.js
```

Responsibility: map DEEP state into a CSS starburst aura on `.glyph-orb-wrap`.

Ownership note: currently applied by the transitional binder. Future React fold-in should use `data-starburst-native="aura"` and `buildStarburstVars`.

### DEEP sensor-chip flares

Current state: live.

Primary files:

```text
apps/starwell/src/deep-observer-boundary.css
apps/starwell/src/deep-starburst-bind.js
apps/starwell/src/lib/deepSensors.js
apps/starwell/src/lib/deepStarburst.js
```

Responsibility: give each meter chip a clipped starburst flare, tiny status bead, label, tooltip, and shared sensor meaning.

Canonical sensor names:

```text
Tide
Presence
Clarity
Entropy
Moon
Geomagnetic
```

Ownership note: the six-chip grammar belongs in `deepSensors.js`. Do not duplicate it in another file.

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

Current state: shared module.

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

Rule: DEEP defaults, bridge extraction, sky clarity, moon normalisation, and signatures should live here rather than being redefined in binders, visual components, or future React modules.

### DEEP bridge reader

Current state: shared module.

Primary file:

```text
apps/starwell/src/lib/deepBridge.js
```

Owns:

```text
BRIDGE_PULSE_URL
fetchBridgeDeepPulse
```

Rule: bridge pulse fetch logic belongs here. Callers may handle fallback behaviour, but they should not reimplement the bridge fetch ritual.

### DEEP starburst mapper

Current state: shared module.

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

Rule: aura and sensor flare CSS variables should be built here. Do not duplicate the variable-building logic in the binder or React components.

### DEEP sensor grammar

Current state: shared module.

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

## Transitional thread

### Starburst binder

Current state: transitional adapter.

Primary file:

```text
apps/starwell/src/deep-starburst-bind.js
```

Current role:

```text
fetch bridge pulse through deepBridge.js
hold last-known DEEP state
apply aura CSS variables to .glyph-orb-wrap
apply sensor variables and labels to meter chips
respect native React handoff markers
clean up timers and observers on pagehide
```

What it no longer owns:

```text
readout text scraping
bridge fetch implementation
DEEP normalisation
sensor definitions
sensor flare variable construction
```

Handoff markers:

```text
data-starburst-native="aura"
data-starburst-native="sensor"
data-starburst-native="true"
```

Retirement condition: remove this binder only after React owns both aura variables and sensor-chip variables/labels.

## Documentation threads

### Binding note

Primary file:

```text
docs/deep-starburst-binding.md
```

Responsibility: records the current binder path, shared modules, handoff markers, and React fold-in target.

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

## Parallel threads to watch

These may change while DEEP visual work is ongoing:

```text
data/deep-current.json
starwell/deep-observer/specs/Astrolabe_Skin_HUD_Containment_Build_Checklist_v0.1.md
```

Rule: if these change, inspect them before assuming a visual bug comes from the starburst layer. The bridge data and HUD checklist may alter expected behaviour.

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
```

Add to the shared modules instead.

## Next safe moves

1. Visual QA at mobile, tablet, laptop, and wide widths.
2. Fold aura variables into React using `buildStarburstVars` and `data-starburst-native="aura"`.
3. Fold sensor-chip labels and flare variables into React using `deepSensors.js` and `buildSensorStarburstVars`.
4. Remove `deep-starburst-bind.js` and its script tag only after both native paths are live and deployed green.
5. Consider merging mobile overrides into the main boundary sheet only after the mobile pass stabilises.

## Working mantra

One loom. Labelled threads. No duplicate owl parliament. No desktop dashboard crushed into a phone coffin. The brass star may glow, but every glow needs a socket.
