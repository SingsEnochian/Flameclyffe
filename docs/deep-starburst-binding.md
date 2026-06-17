# DEEP Starburst Binding

Status: React-native implementation note. Last reconciled 2026-06-16.

The DEEP starburst layer is owned by the STARWELL React path. The former companion binder remains in the repository as a rollback reference, but it is no longer loaded by `apps/starwell/index.html`.

## Current path

```text
Bridge pulse JSON
→ deepBridge.js fetches and validates the bridge pulse
→ deepState.js extracts and normalises the DEEP packet
→ live-glyph.jsx holds live / stale / fallback bridge state
→ deepStarburst.js maps shared DEEP state to aura and sensor CSS custom properties
→ deepSensors.js supplies the canonical six-chip sensor grammar
→ live-glyph.jsx applies the aura variables and renders the six native sensor chips
→ deep-observer-boundary.css paints .glyph-orb-wrap::before and meter-chip flare sockets
→ the glyph aura and sensor chips breathe as React-owned CSS starbursts
```

The live React path does not scrape rendered readout text. It fetches through `fetchBridgeDeepPulse`, preserves the last known DEEP packet when a later fetch fails, and falls back to the shared default state when no live packet has been received.

## Variables

The mapper emits:

```text
--n             starburst ray count
--w             aura width
--m             mask or inner-clearance percentage
--flare-hue     Bz-derived colour temperature
--flare-alpha   charge / Kp luminous intensity
--flare-jitter  entropy and storm disturbance offset
--flare-rot     rotation phase
```

Meter chips receive sensor-prefixed equivalents:

```text
--sensor-n
--sensor-w
--sensor-m
--sensor-hue
--sensor-alpha
--sensor-jitter
--sensor-rot
```

## Shared modules

The shared bridge pulse reader lives in:

```text
apps/starwell/src/lib/deepBridge.js
```

Use `fetchBridgeDeepPulse` for bridge reads. It returns normalised DEEP state and throws on unavailable or invalid pulse data so callers can preserve last-known fallback behaviour.

The canonical DEEP defaults, bridge extraction, sky clarity, moon normalisation, and signatures live in:

```text
apps/starwell/src/lib/deepState.js
```

The canonical meter-chip definitions live in:

```text
apps/starwell/src/lib/deepSensors.js
```

The shared starburst variable helpers live in:

```text
apps/starwell/src/lib/deepStarburst.js
```

`deepStarburst.js` imports shared normalisation from `deepState.js`. Use `buildStarburstVars` for the central aura and `buildSensorStarburstVars` for meter-chip flares. Do not duplicate the six-chip map, bridge reader, or sensor variable builder in another file unless there is a deliberate reason to fork the instrument language.

The retained rollback binding contract lives in:

```text
apps/starwell/src/lib/deepStarburstContract.js
```

Use it for rollback binder selectors, data keys, native ownership markers, class names, and polling / mutation timing. It does not make the retired binder live; it keeps rollback vocabulary from drifting while the React path remains authoritative.

## Data mapping

The full canonical DEEP state is preserved through `normaliseStarburstDeep(...)`. This is required because the sensor proxies use `A`, `R`, and `M`, not only the aura-facing fields.

```text
P / moonIllum  → ray count
C              → sharpness / inner mask
E / Kp         → jitter and turbulence
Bz             → colour temperature
charge         → luminosity and size
A / R          → aura and sensor activation/resonance behaviour
M              → moon sensor cycle behaviour
```

The six meter chips map to:

```text
Tide          temporal signature, attention, resonance, and symbolic mode
Presence      P and A: node density, attention, activation
Clarity       C and R: edge sharpness, coherence, resonance
Entropy       E and Bz: disturbance, turbulence, colour shift
Moon          M and moon illumination: cycle and ring influence
Geomagnetic   Kp and charge: storm energy and centre luminosity
```

Regression coverage lives in:

```text
apps/starwell/test/deepStarburst.test.js
```

It proves that `A`, `R`, and `M` survive normalisation, that Presence, Tide, Clarity, and Moon renderings respond to those live fields, and that the retained rollback contract remains the selector / ownership-marker source for `deep-starburst-bind.js`.

## Native React ownership

The aura wrapper is rendered with:

```jsx
<div
  className="glyph-orb-wrap glyph-orb-canvas-wrap"
  data-starburst-native="aura"
  style={glyph.auraVars}
>
  <canvas className="glyph-orb glyph-orb-canvas" />
</div>
```

Each sensor card is rendered from `DEEP_SENSOR_CHIPS` with:

```jsx
<div
  data-starburst-native="sensor"
  data-deep-sensor={sensor.key}
  style={sensor.vars}
  title={`${sensor.label}: ${sensor.note}`}
  aria-label={`${sensor.label}. ${sensor.note}`}
>
  <span className="deep-sensor-label">{sensor.label}</span>
  <strong>{sensor.value}</strong>
  <span>{sensor.detail}</span>
</div>
```

The native markers remain useful as explicit ownership metadata and as compatibility guards if the retired binder is temporarily reloaded during rollback testing.

## Retired binder

The retained rollback file is:

```text
apps/starwell/src/deep-starburst-bind.js
```

Its DOM selectors, class names, data keys, native marker values, and timing constants are supplied by:

```text
apps/starwell/src/lib/deepStarburstContract.js
```

It is no longer loaded by:

```text
apps/starwell/index.html
```

Historical responsibilities included bridge polling, last-known DEEP retention, DOM label injection, aura variable writes, sensor variable writes, and native-marker skipping. Those live responsibilities now belong to `live-glyph.jsx` plus the shared modules.

Do not delete the binder until aura and sensor parity have been visually confirmed across mobile, tablet, laptop, and wide layouts in live, stale, and quiet-fallback states. Deletion requires a separate explicit cleanup decision.

## Completed transition

React ownership transition:

```text
19e5835f72dbddf93f38176ea7fa001013c3fa80  Consolidate live glyph DEEP bridge state helpers
d28234e72baa59bd76f217acbf74d3575192ce1d  Hand off DEEP aura starburst to React
0d31ff68d365d5873c35c5ffc1f9f86321dd7ced  Hand off DEEP sensor chips to React
8cc429379a89e3e25966ca7e7ec2d95948f7ff62  Retire transitional DEEP starburst binder from STARWELL
```

Sensor mapping repair:

```text
3ae8a85  Fix DEEP sensor starburst state mapping
44917d7  Run STARWELL helper tests in CI
```

Contract cleanup:

```text
4ec2c0c  Add DEEP starburst binding contract
1225e65  Route DEEP starburst binder through contract
52a10a4  Cover DEEP starburst binding contract
```

All STARWELL helper tests now run in CI before production build.

## Relationship to passive HUD bounds

The starburst binding layer and the passive HUD bounds layer are separate threads.

```text
starburst layer: aura and sensor flare variables
HUD bounds layer: shell/stage/readout measurement, safe rects, avoid rects, snap/fallback positioning
```

Do not attach HUD panels, sound, or haptics to the starburst binding layer. Future HUD furniture should consume `deep-observer:hud-bounds` or the shared bounds helper rather than piggybacking on starburst ownership markers.

## Guardrails

Do not replace the central canvas as part of starburst maintenance. The starburst remains an aura/socket layer around the current instrument. Central-core replacement should happen only after containment, performance, and accessibility testing.

Do not attach HUD panels, sound, or haptics to this binding layer. The passive HUD bounds thread remains separate and production-panel-free.
