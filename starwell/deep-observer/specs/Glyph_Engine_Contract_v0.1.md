# Glyph Engine Contract v0.1

## Purpose

This contract defines how structural glyphs, liquid-energy glyphs, astrolabe/orrery glyphs, Wardenclyffe harmonic glyphs, and future Terra Aeterna visual engines plug into the shared STARWELL / Terra Aeterna system.

The goal is one modular instrument ecosystem with swappable engines, not separate one-off instruments.

## Canon sentence

```text
A glyph engine is a mathematical renderer that receives observation and model packets, renders a visual state, emits glyph-state summaries, and leaves narrative interpretation to the Narrative Bridge.
```

## Standing rule

No glyph engine should hardcode:

- telemetry sources
- theme values
- narrative meanings
- event interpretations
- sound responses
- viewport sizes
- draggable panel behaviour

Those belong in registries, packets, shells, sensory modules, or narrative plugins.

## Shared engine lifecycle

Each glyph engine should support this lifecycle:

```text
register → initialise → receive packet → update model view → render → emit state → dispose
```

## Required metadata

Each engine registry entry should include:

```js
{
  id,
  label,
  version,
  type,
  description,
  inputs,
  outputs,
  boundaries,
  supportedShells,
  supportedThemes,
  devControls,
  eventOutputs
}
```

## Required methods

Future engine objects should expose:

```js
init(context)
update(packet)
render(frame)
resize(viewportMap)
getState()
serialize()
dispose()
```

Optional:

```js
onInteraction(event)
onSoundFrame(audioFrame)
onThemeChange(themeTokens)
onDevOverride(overridePacket)
```

## Context object

`init(context)` should receive:

```js
{
  canvas,
  container,
  observationBus,
  modelCore,
  themeRegistry,
  paletteRegistry,
  sensoryBus,
  eventLogger,
  viewportMap,
  devConfig
}
```

## Input packet boundaries

### Observation packet

Direct or derived inputs:

- time
- Terra Aeterna time
- Kp
- Bz
- moon
- weather/heat/humidity/pressure
- sound/frequency data
- touch/pointer/motion state
- browser/accessibility capability
- source/provenance

### Model packet

Experimental/theoretical variables:

- P
- C
- R
- E
- M
- A
- H
- Q / charge
- Bz thermal mood band
- Kp intensity band
- liquid-field variables
- transform profile variables

### Theme/material tokens

Skin values only:

- palettes
- gem materials
- glow colours
- panel materials
- rune/carving depths
- active/hover states
- low-stim variants

## Engine output

Each engine should emit a glyph-state summary:

```js
{
  engineId,
  timestamp,
  glyphId,
  visualState,
  dominantModes,
  intensity,
  coherence,
  turbulence,
  paletteBand,
  notableChanges,
  eventCandidates,
  boundaries
}
```

This summary feeds the Event Logger. Narrative Bridge may interpret it later.

## Engine 1: Structural Geometry Glyph

### Purpose

Show structure, relationship, legibility, node density, route coherence, harmonic rings, and packet traffic.

### Inputs

- DEEP variables
- Kp
- Bz palette mood
- moon illumination
- touch/interaction state
- theme tokens

### Outputs

- node count
- edge density
- ring count
- particle traffic
- core glow
- route highlights
- state summary

### Boundary

This engine shows mathematical/visual relationships. It does not prove narrative meaning.

## Engine 2: Liquid Energy Glyph

### Purpose

Show change, flow, bloom, turbulence, energy movement, environmental pressure, and sound/frequency influence.

### Inputs

- observation packet
- model packet
- sound frequency frame
- weather/heat/humidity context
- Kp/Bz/moon
- DEEP variables
- transform profiles

### Possible transform profiles

These names are mathematical/design lenses, not claims of literal proof:

- Planck profile: quantised microstructure / packet granularity
- Fermi profile: occupancy thresholds / energy-state gating
- Hawking profile: horizon bleed / decay / evaporation curves
- Wardenclyffe profile: harmonic resonance / frequency layering

### Outputs

- fluid bloom
- energy ribbons
- turbulence field
- wave density
- sound-reactive glyph shape
- event candidates
- state summary

### Boundary

The liquid glyph visualises changing relationships and correlations. It is not a causality proof.

## Engine 3: Astrolabe / Orrery Glyph

### Purpose

Show layered celestial/instrument relationships in a spatial form that can be turned and inspected.

### Inputs

- model packet
- time packet
- moon/sun/space-weather context
- theme tokens
- astrolabe shell orientation state

### Outputs

- layered discs
- ring offsets
- orbital paths
- angle/phase relationships
- view-state summary

### Boundary

This engine expresses relationships spatially. Direct measurement is a separate responsibility.

## Event candidate rules

Engines may emit event candidates but not narrative conclusions.

Example candidate:

```js
{
  type: 'liquid-bloom',
  confidence: 0.62,
  measuredChanges: ['Kp rise', 'humidity rise', 'sound peak'],
  modelChanges: ['R increased', 'Q increased'],
  suggestedTags: ['field-bloom', 'storm-response']
}
```

Narrative Bridge can later annotate this as something like:

```text
Nightwing chroma event
```

But the engine itself should not make that story claim.

## DEV controls

Future DEV should be able to configure:

- active engine
- engine split view
- transform profile
- frequency bands
- event threshold sensitivity
- smoothing
- turbulence multiplier
- ring/node scale
- liquid bloom scale
- export state summary

## Registry destination

Future registry home:

- `observer-glyph-engines.registry.js`
- `observer-engine-contracts.registry.js`

## Withness note

The glyph engines are lenses. The shared system is the observatory.
