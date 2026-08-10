# Observer Mathematical Glyph Engine v0.1

## Purpose

The Observer DEEP glyph must not be a static icon, sticker, or decorative sigil.

It should be a living mathematical instrument: a visualisation grown from equations and shaped by the DEEP state vector.

Current problem: the live glyph can visually collapse into a small dark dot when state values are low or strokes are too subtle.

Target correction: replace the weak SVG mark with a math-bloom field that remains visible, legible, and alive across all state values.

## Design Law

> The glyph is grown from equations, not stamped on as decoration.

Related Terra Aeterna law:

> The geometry is not painted onto reality. The geometry is revealed from reality.

## Inputs

The glyph is driven by the DEEP state vector:

```text
P = Presence
C = Coherence
R = Resonance
E = Entanglement
M = Memory
A = Agency
Q = Qualia
```

Plus interaction state:

```text
pointer_x
pointer_y
interaction_charge
time
```

## Mathematical Families

The engine should combine several mathematical behaviours.

### Polar Bloom Curves

Used for the flower-like structure.

Parameters:

- petal count from Coherence
- radial depth from Presence
- luminosity from Resonance
- turbulence from Entanglement
- persistence from Memory
- animation rate from Agency

Example conceptual form:

```text
r(theta, t) = base + A1 sin(k theta + omega t) + A2 sin(k2 theta - omega2 t)
```

### Phyllotaxis Nodes

Used for seed-like / organic node distribution.

The golden angle creates natural spiral growth.

```text
theta = n * golden_angle
radius = scale * sqrt(n / N)
```

Memory increases node count.
Resonance increases node brightness.
Entanglement adds wobble.

### Lissajous / Orbital Motes

Used for moving satellite lights around the bloom.

Attention increases responsiveness.
Perspective alters orbital distance.
Resonance increases brightness.

### Resonance Lines

Connect selected nodes.

Coherence increases clean connection patterns.
Entanglement increases broken or shifting links.
Memory allows recurring paths to persist.

## Visual Mapping

| Variable | Visual Effect |
|---|---|
| Presence P | depth, scale, orbital radius, bloom openness |
| Coherence C | symmetry, petal count, clean resonance lines |
| Resonance R | glow, brightness, colour saturation, active nodes |
| Entanglement E | wobble, distortion, broken symmetry, shimmer |
| Memory M | node count, trail persistence, layered rings |
| Agency A | animation speed, pulse strength, interaction response |
| Qualia Q | warmth, inhabited quality — whether the glyph feels alive or mechanical |

## Behaviour States

### Dormant

The glyph appears as a visible seed, not a black dot.

Minimum visible structure:

- faint polar petals
- central glow
- at least one ring
- slow pulse

### Attentive

Pointer proximity brightens local nodes and motes.

### Observing

When live data is generated, the glyph blooms outward and reconfigures.

### Deep State

When coherence, resonance, and memory are high, the glyph shows stable layered geometry.

### Entangled State

When entanglement is high, curves wobble and resonance lines fragment, but the glyph remains legible.

## Implementation Plan

Phase 1:

- Build `glyph-math-lab.html` as a standalone prototype.
- Use Canvas 2D for fast iteration.
- Include sliders for P, C, R, E, M, A.
- Add pointer interaction and interaction charge.

Phase 2:

- Extract engine into a reusable script file.
- Replace `sigilSvg()` in `observer-deep.html`.
- Preserve export / prompt / state vector integration.

Phase 3:

- Add optional WebGL version for higher-quality field distortion.
- Use the same engine principles in Portal Pool and Stonewood interfaces.

## Non-goals

Do not make the glyph look like a generic occult seal.
Do not make a black dot.
Do not paste a glowing circle on top of the interface.
Do not detach the glyph from DEEP variables.
Do not let the glyph become decorative only.

## Success Test

The glyph should communicate state without requiring the user to read numbers.

High coherence should feel stable.
High entanglement should feel restless.
High memory should feel layered.
High attention should feel awake.
High resonance should feel luminous.

The glyph should feel grown, not drawn.
