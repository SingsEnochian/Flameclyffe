# DEEP Starburst Binding

Status: transitional implementation note.

The DEEP starburst layer is currently wired as a low-risk companion module rather than a direct React prop path. This lets the visual socket prove itself without replacing the load-bearing live glyph component.

## Current path

```text
LiveGlyphViewer renders DEEP readout text
→ deep-starburst-bind.js reads the glyph meter values
→ deepStarburst.js maps values to CSS custom properties
→ deep-observer-boundary.css applies those properties to .glyph-orb-wrap::before
→ the glyph aura breathes as a CSS starburst
```

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

## Data mapping

```text
P / moonIllum  → ray count
C              → sharpness / inner mask
E / Kp         → jitter and turbulence
Bz             → colour temperature
charge         → luminosity and size
A / R          → transitional binder size boost
```

## Why the binder exists

`live-glyph.jsx` is currently a large load-bearing component. Directly replacing it to add one style prop has higher blast radius than a small companion module.

The binder is intentionally temporary. It watches only the STARWELL root, throttles DOM changes, skips redundant writes, and cleans itself up on page hide.

## Fold-in target

Once the visual behaviour is confirmed, move the binding into React:

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
    <div className="glyph-orb-wrap glyph-orb-canvas-wrap" style={starburstVars}>
      <canvas className="glyph-orb glyph-orb-canvas" />
    </div>
  );
}
```

Then remove:

```text
apps/starwell/src/deep-starburst-bind.js
<script type='module' src='./src/deep-starburst-bind.js'></script>
```

## Guardrail

Do not replace the central canvas yet. The starburst is currently an aura/socket layer. Central-core replacement should happen only after containment, performance, and accessibility testing.
