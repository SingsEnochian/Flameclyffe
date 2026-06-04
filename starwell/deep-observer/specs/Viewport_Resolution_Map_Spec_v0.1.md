# Viewport / Resolution Map Spec v0.1

## Purpose

This spec defines how STARWELL / DEEP Observer should map screen sizes, browser chrome constraints, HUD bounds, glyph scale, sensor-ring radius, control dock spacing, and draggable panel zones.

Current responsive hotfixes exist, but they are not enough. The instrument needs a formal viewport map so it behaves consistently on iPad, mobile, desktop, split-screen, and browser-chrome-constrained layouts.

## Current status

Partially fixed, not solved.

The current CSS includes breakpoint hotfixes around:

- `1120px`
- `780px`
- `520px`

It adjusts orb/canvas size and sensor-node size, but the outer sensor ring still uses inset nudges and one-off top adjustments. This can cause clipping, crowding, or off-centre appearance.

## Canon sentence

```text
The instrument should not guess its geometry from scattered CSS nudges; it should read a viewport map and derive glyph scale, sensor radius, dock position, panel zones, and drag bounds from shared tokens.
```

## Standing rule

No viewport hardcoding in renderer logic.

Viewport-dependent values must become:

- CSS custom properties
- viewport registry values
- DEV-console tunable parameters
- derived layout tokens

## Core layout zones

The page should define these zones:

```text
page bounds
shell bounds
instrument HUD bounds
glyph frame bounds
sensor ring bounds
control dock bounds
right panel bounds
floating overlay safe zones
snap zones
scroll-safe zones
```

## Required measurements

Each viewport map should produce:

```js
{
  viewportWidth,
  viewportHeight,
  devicePixelRatio,
  orientation,
  browserChromeCompensation,
  hudBounds,
  glyphSize,
  glyphCenterX,
  glyphCenterY,
  sensorRingRadius,
  sensorNodeSize,
  sensorNodeGap,
  dockWidth,
  dockHeight,
  dockTopGap,
  panelWidth,
  overlayBounds,
  snapZones,
  lowStimScale,
  astrolabeDepthScale
}
```

## Breakpoint families

### Wide desktop

Suggested range:

```text
>= 1280px width
```

Targets:

- glyph large enough for detailed geometry
- sensor ring wide and clear
- panel beside glyph if space allows
- overlays can dock left/right
- astrolabe shell can use fuller 3D depth

### Standard tablet / iPad landscape

Suggested range:

```text
900px – 1279px width
```

Targets:

- glyph remains central
- sensor ring radius widens enough to avoid clipping
- dock sits below glyph with explicit gap
- panel may stack below or remain beside depending height
- draggable panels must stay inside HUD

### Narrow tablet / large mobile

Suggested range:

```text
640px – 899px width
```

Targets:

- glyph scales down
- sensor nodes shrink slightly
- sensor ring remains circular and centred
- dock uses 2–3 row grid
- floating panels default to side/corner snap
- lower text panels stack below

### Mobile

Suggested range:

```text
< 640px width
```

Targets:

- glyph becomes priority view
- sensor ring may become scroll-free radial or collapsible
- dock becomes compact grid
- dual time panel defaults to minimised chip
- dev console remains hidden unless unlocked
- low-stim and reduced-motion defaults are respected

## Sensor ring rule

The outer sensor ring must be centred on the glyph centre, not positioned by scattered top/left nudges.

Suggested future system:

```css
.orb-frame {
  --glyph-size: ...;
  --sensor-ring-radius: ...;
  --sensor-node-size: ...;
}
```

Each sensor node should use polar coordinates derived from a registry or CSS variable map:

```text
angle + radius + node size → transform position
```

Avoid:

```css
.sensor-ring { inset: -4% -9% -12% -9%; }
.sensor-node[data-reading="time"] { top: 1.5%; }
```

Those may remain as temporary hotfixes only until registry mapping exists.

## Control dock rule

The dock below the glyph must have explicit spacing tokens.

Required token:

```text
--dock-gap-from-glyph: 3px minimum
```

The requested immediate rule:

```text
control panel beneath glyph readout sits at least 3px below the glyph/sensor zone.
```

This should be measured from the outer sensor ring safe bounds, not only from the canvas bounds.

## Draggable UI bounds

Floating panels must be contained inside the instrument HUD unless explicitly detached in DEV.

Applies to:

- dual time panel
- sensory gem / haptics controls
- future event logger panel
- future glyph build selector
- future floating Codex panels

Required behaviour:

- clamp drag to HUD bounds
- update bounds on resize/orientation change
- update bounds when UI hides/shows
- snap to side/corner zones
- never scroll as an unmoored page-fixed object unless deliberately in detached mode

## Dual time positioning

Default behaviour:

- anchor to side away from glyph centre
- draggable within HUD
- snap left/right/top/bottom corners
- minimise to a small chip
- pin option prevents auto-hide

It should not block the glyph centre unless user intentionally places it there.

## Astrolabe shell relationship

The Astrolabe Shell must read the viewport map for:

- depth scale
- rotation sensitivity
- parallax strength
- safe overlay bounds
- glyph scale
- low-stim motion limits

Small screens should reduce depth, inertia, and large parallax by default.

## DEV controls

Future DEV console should expose:

- active viewport band
- glyph size
- sensor ring radius
- sensor node size
- dock width
- dock height
- dock gap
- overlay bounds preview
- reset panel positions
- detached panels on/off
- low-stim scale

## Registry destination

Future file:

```text
observer-viewport.registry.js
```

## Temporary CSS notes

The existing hotfix CSS can remain, but it should be treated as temporary.

Extraction targets:

- sensor ring inset hacks → viewport registry + polar layout
- sensor node size breakpoints → viewport registry tokens
- dock margin values → `--dock-gap-from-glyph` and HUD zone spacing
- interface cloak sizing → viewport registry shell mode
- floating panel behaviour → HUD-bound drag module

## Acceptance tests

Test at minimum:

- 390px mobile portrait
- 430px mobile portrait
- 768px tablet portrait
- 1024px iPad landscape
- 1180px iPad/browser split landscape
- 1366px laptop
- 1440px desktop
- 1920px desktop

At each size:

- glyph is centred
- sensor ring is circular and not clipping
- node labels readable or gracefully compacted
- dock has at least 3px spacing from glyph/sensor zone
- dual time can anchor away from centre
- sensory gem stays inside HUD
- Hide UI does not produce wandering controls
- reduced-motion/low-stim do not break layout

## Withness note

The HUD should feel like an instrument made for many hands and many screens, not a single screenshot held together by candle wax.
