# Prototype Modularity Audit — 2026-06-16

## Scope

Reviewed current DEEP / AR prototype and architecture files:

- `docs/reference/prototypes/README.md`
- `docs/reference/prototypes/branch-loom/`
- `docs/reference/prototypes/signal-garden/`
- `docs/reference/prototypes/consent-web/`
- `docs/reference/prototypes/observer-v02/`
- `docs/architecture/deep-ar-depth-and-materials.md`
- `docs/architecture/deep-ar-gesture-manipulation.md`

## Result

The prototype set is acceptable for current sketch-stage work.

The code is mostly data-driven rather than DOM-hardcoded.

The main flexibility risks are normal prototype risks:

- model data lives inside prototype JS files
- SVG coordinates are literal values inside model arrays
- some timing values are local constants
- controls are re-rendered during state updates in some prototypes
- production module boundaries are documented but not implemented yet

## Fixes made during audit

### Signal Garden repo gap fixed

The prototype index referenced `signal-garden/`, but the folder was missing from the repository.

Added:

- `signal-garden/README.md`
- `signal-garden/signal-garden.html`
- `signal-garden/signal-garden.css`
- `signal-garden/signal-garden.js`

The new Signal Garden uses a small signal model and generates SVG nodes and branches from data.

### Consent Web AR branch gap fixed

Consent Web included Depth / LiDAR but did not yet include Gesture Manipulation.

Added Gesture Manipulation as an off-by-default consent branch.

Consent Web now includes both:

- Depth / LiDAR
- Gesture Manipulation

Both exist as AR-ready branches and do not activate real sensors.

## Current good patterns

### Branch Loom

- README defines it as a data-driven branch state layer.
- SVG branches are generated from JavaScript data.
- CSS owns state expression.
- JavaScript owns controls, state, rendering, and accessibility hooks.
- Motion is guarded by `prefers-reduced-motion`.

### Signal Garden

- Signal model is centralized in `SIGNALS`.
- Core model is centralized in `CORE`.
- Branch and node rendering are generated from data.
- Pulse duration is named as `ACTIVE_MS` instead of hidden in event code.
- CSS owns pulse, colour, glow, and motion.

### Consent Web

- Permission model is centralized in `permissions`.
- Branches and controls are generated from permission data.
- Real sensor APIs are not called.
- Disabled branches remain visible.
- `aria-pressed` is used on toggles.
- Depth / LiDAR and Gesture Manipulation are off by default.

### Observer v0.2

- Vector defaults are centralized in `DEFAULT_VECTOR`.
- Metric metadata is centralized in `metricMeta`.
- CSS variable mapping lives in metadata.
- Branch states derive from vector values.
- Narrative derives from vector state.
- CSS owns the field look and branch expression.

### AR architecture

- Depth and gesture are separate consent branches.
- Raw sensor data is filtered before it reaches DEEP.
- DEEP receives abstract events, not raw frames, meshes, or landmarks.
- CSS remains the authoring language.
- AR receives compiled material tokens.

## Current risks

### R1: Prototype JS contains embedded model data

This is acceptable for standalone prototypes.

Before production promotion, move model data into separate files such as:

- `branchLoomModel.js`
- `signalGardenModel.js`
- `consentBranches.js`
- `observerMetricModel.js`

### R2: Literal coordinates exist in model arrays

This is acceptable while SVG prototypes are hand-composed.

Before production promotion, move layout into a layout function or config object.

Preferred pattern:

- semantic model: id, label, type, state
- layout model: radius, angle, anchor, lane
- renderer: converts layout values into coordinates

### R3: Controls are sometimes re-rendered on every state change

This is acceptable for small prototypes.

Before production promotion, split initial control creation from output updates.

### R4: Some values are still visual constants

Examples include bend amount, animation duration, node radius, and pulse lifetime.

Before production promotion, move these into named config constants or CSS custom properties.

### R5: Sensor branches are visual only

This is intentional.

Before production promotion, adapters must remain behind consent gates and emit abstract events only.

## Promotion checklist

No prototype should be promoted until it has:

- model data separated from renderer code
- named constants for timing, size, and layout values
- accessible controls
- reduced-motion support
- explicit consent gates for sensory features
- no real sensor API calls without user activation
- no raw sensor persistence by default
- fallback controls for AR / gesture actions
- clear module boundary

## Audit cadence

Repeat this audit every three days during active prototype work.

Focus on:

- hardcoded values
- module boundaries
- consent gates
- accessibility
- reduced-motion support
- raw sensor exposure
- renderer-specific coupling
