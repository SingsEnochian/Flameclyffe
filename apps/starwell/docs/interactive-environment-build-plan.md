# Terra Aeterna Interactive Environment Build Plan v0.1

## Purpose

This plan consolidates Terra Aeterna development around one proper interactive environment rather than many half-finished lab pages.

The labs are still useful, but they must feed a single canonical environment spine.

## Principle Zero

The world comes first. The software comes second.

A visitor should arrive at a living coast, not a dashboard.

## Canonical Environment Spine

Build one primary environment entrypoint:

```text
/terra-aeterna/
```

or, while still using static GitHub Pages:

```text
terra-aeterna.html
```

This becomes the main playable environment.

Existing pages become labs or instruments:

- `shoreline-lab.html` = early Canvas shoreline sketch
- `shoreline-lab-v03.html` = Canvas realism sketch
- `observer-deep.html` = Observer instrument prototype
- `glyph-math-lab.html` = future glyph engine prototype, not yet landed
- `starwell/` = hub / future application shell

## Build Rule

Do not create another orphan page unless it has one of these roles:

1. A reusable engine prototype.
2. A documented lab feeding the canonical environment.
3. A test page that will be deleted or merged.

Every future feature should either:

- improve the canonical environment, or
- become a reusable module used by it.

## Target Architecture

```text
World Engine
  ↓
Environment Renderer
  ↓
Sky System
  ↓
Shoreline System
  ↓
Stonewood UI
  ↓
Ecology Layer
  ↓
Soundscape
  ↓
Observer / DEEP Integration
```

## Phase 1: World Engine

Create a single source of truth for conditions.

Suggested module:

```text
apps/starwell/src/world-engine.ts
```

or static equivalent:

```text
assets/terra/world-engine.js
```

WorldState should include:

- timestamp
- local weather seed
- Terra Aeterna weather state
- moons: Aurelia, Sylva, Nysa
- moon harmonics
- tide index
- bloom index
- migration index
- observatory index
- storm index
- lantern index
- DEEP vector hooks

No renderer should invent its own reality.
Everything reads from WorldState.

## Phase 2: Canonical Environment Shell

Create one main environment page:

```text
terra-aeterna.html
```

Minimum required behaviours:

- full-screen living coastline
- hide / reveal interface
- dusk-to-night sky baseline
- three-moon sky placeholders
- shoreline water baseline
- Stonewood interface frame placeholder
- soundscape toggle placeholder
- Observer panel placeholder

The first version does not need to be complete, but it must become the page we keep improving.

## Phase 3: Hyper-Real Renderer

Move from simple 2D sketches toward a proper environment renderer.

Preferred direction:

- WebGL / Three.js when practical
- animated water surface
- moon-road reflection
- fog layers
- shoreline foam
- wet sand / wet stone effect
- bioluminescence reacting to agitation

Canvas can remain a fallback or sketching layer.

## Phase 4: Stonewood UI

The interface must grow from the world.

Information appears by:

- branches extending
- leaves unfurling
- flowers opening
- roots connecting systems
- luminous veins waking

No generic panels unless temporary.

Primary interaction:

- Presence Mode: all information hidden, only the world remains
- Observation Mode: basic Stonewood controls visible
- Deep Observatory Mode: instruments and data fully open

## Phase 5: Ecology Layer

Add life cues only after the environment has a spine.

Initial ecology:

- Nightwings crossing the moons
- bioluminescent plankton reacting to waves
- grasses moving in wind
- Stonewood leaves / flowers responding to season and Bloom Index

## Phase 6: Soundscape

Build environmental audio, not soundtrack-first music.

Layers:

- waves lapping shore
- retreating water
- breeze through grasses
- distant surf
- Nightwings
- rain / Bloomstorm rainfall
- observatory lantern chimes
- low celestial tones

Audio reads from WorldState.

## Phase 7: Observer Integration

Only after the environment exists:

- local weather feeds
- location mirroring
- solar weather
- moon phase / astronomy
- DEEP state vector
- saved memory / Supabase

Observer should influence the world, not replace it.

## Success Tests

### Test 1

Open the page and hide all UI.

If watching the tide feels meaningful, the environment is working.

### Test 2

The same page should feel different at dusk, night, rain, storm, and Bloomstorm.

### Test 3

The UI should feel like Stonewood growth, not software panels.

### Test 4

The world should communicate changes visually and sonically before showing numbers.

## Immediate Next Commit Target

Create the canonical page:

```text
terra-aeterna.html
```

It should include:

- full-screen environment canvas
- basic world engine object inline or imported
- three-moon sky placeholders
- animated shoreline baseline
- Stonewood overlay placeholder
- hide / reveal UI button
- soundscape placeholder
- links back to Observer and labs

This page becomes the trunk.
Everything else becomes branch, leaf, flower, or compost.
