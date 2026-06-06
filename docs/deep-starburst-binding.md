# DEEP Starburst Binding

Status: transitional implementation note.

The DEEP starburst layer is currently wired as a low-risk companion module rather than a direct React prop path. This lets the visual socket prove itself without replacing the load-bearing live glyph component.

## Current path

```text
Bridge pulse JSON
→ deepBridge.js fetches and validates the bridge pulse
→ deepState.js extracts, normalises, and signs the DEEP packet
→ deep-starburst-bind.js applies the visual variables and last-known fallback behaviour
→ deepStarburst.js consumes shared normalised DEEP state and maps aura/sensor flare values to CSS custom properties
→ deepSensors.js supplies the shared six-chip sensor grammar
→ deep-observer-boundary.css applies those properties to .glyph-orb-wrap::before and the meter-chip flare sockets
→ the glyph aura and sensor chips breathe as CSS starbursts
```

The binder no longer scrapes rendered readout text. It delegates bridge-pulse fetching to `deepBridge.js`, then falls back to the last known or default DEEP state if the pulse is unavailable.

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

`deepStarburst.js` now imports from `deepState.js` for shared normalisation instead of carrying its own duplicate DEEP defaults. Use `normaliseDeepState` and `makeDeepSignature` for DEEP packet handling, `buildStarburstVars` for the central aura, and `buildSensorStarburstVars` for meter-chip flares. Both the transitional binder and the future React implementation should import from these modules. Do not duplicate the six-chip map, bridge reader, or sensor variable builder in another file unless there is a deliberate reason to fork the instrument language.

## Data mapping

```text
P / moonIllum  → ray count
C              → sharpness / inner mask
E / Kp         → jitter and turbulence
Bz             → colour temperature
charge         → luminosity and size
A / R          → transitional binder size boost
```

The six meter chips currently map to:

```text
Tide          temporal signature and symbolic mode
Presence      P and A: node density, attention, activation
Clarity       C and R: edge sharpness, coherence, resonance
Entropy       E and Bz: disturbance, turbulence, colour shift
Moon          M and moon illumination: cycle and ring influence
Geomagnetic   Kp and charge: storm energy and centre luminosity
```

## Why the binder exists

`live-glyph.jsx` is currently a large load-bearing component. Directly replacing it to add one style prop has higher blast radius than a small companion module.

The binder is intentionally temporary. It watches only the STARWELL root, throttles DOM changes, skips redundant writes, polls the bridge pulse once per minute through `fetchBridgeDeepPulse`, and cleans itself up on page hide.

## Native handoff marker

The binder now honours a native React handoff marker. If a future React component supplies the starburst variables itself, add one of these markers and the binder will skip that element:

```jsx
<div data-starburst-native="aura" />
<div data-starburst-native="sensor" />
<div data-starburst-native="true" />
```

Use `aura` on `.glyph-orb-wrap` and `sensor` on individual `.glyph-meter-grid > div` cards. Use `true` only when the element should be fully ignored by the binder regardless of scope.

## Fold-in target

Once the visual behaviour is confirmed, move the aura binding into React:

```jsx
import { buildStarburstVars } from './lib/deepStarburst.js';

function DeepGlyphCanvas({ glyph, onActivate, onSoften, onKeyDown }) {
  const starburstVars = useMemo(
    () => buildStarburstVars(glyph.deep, {
      baseSize: 132 + glyph.deep.A * 24 + glyph.deep.R * 18,
      rotation: glyph.deep.E * 18 + glyph.deep.kp * 2.5,
    }),
    [glyph.deep],
  );

  return (
    <div className="glyph-orb-wrap glyph-orb-canvas-wrap" data-starburst-native="aura" style={starburstVars}>
      <canvas className="glyph-orb glyph-orb-canvas" />
    </div>
  );
}
```

Then move the sensor-chip labels and flare variables into the React meter grid with `data-starburst-native="sensor"`, importing sensor metadata from `./lib/deepSensors.js` and flare variables from `buildSensorStarburstVars`. If React also takes ownership of bridge polling, wrap `fetchBridgeDeepPulse` rather than reimplementing bridge fetch logic. After both steps are complete, remove:

```text
apps/starwell/src/deep-starburst-bind.js
<script type='module' src='./src/deep-starburst-bind.js'></script>
```

## Guardrail

Do not replace the central canvas yet. The starburst is currently an aura/socket layer. Central-core replacement should happen only after containment, performance, and accessibility testing.
