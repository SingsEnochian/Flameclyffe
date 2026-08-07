# Glyph Engine Contract · Braided Spine

**Status:** active glyph-engine contract  
**Canonical authority:** `docs/HEARTHGATE_BRAIDED_SPINE.md`

Glyph engines are visual, mathematical, magical and physical organs of Hearthgate.

A glyph receives one Braid Packet and gives its relation a visible body.

```text
Magic ↔ Science/Mathematics ↔ Physicality
```

## Canon sentence

> **A glyph engine grows geometry from the active relation, carries world and Asking through form, participates in the crossing, and returns its changed state through lineage.**

## Shared lifecycle

```text
register
→ initialise
→ receive Braid Packet
→ enter Asking / world relation
→ update mathematical state
→ render physical field
→ receive interaction
→ emit glyph state
→ Receiving Spring
→ answer / return
→ dispose or continue
```

## Canonical PREMAQ

Every engine reads:

**Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence**

Stable wire order:

```text
P C R E M A Q
Presence Coherence Resonance Entanglement Memory Agency Qualia
```

Environmental charge, entropy, moon illumination, attention and momentum remain separately named derived or physical channels.

## Engine metadata

```js
{
  id,
  label,
  version,
  type,
  description,
  braidedSpine,
  premaqRegistry,
  worldsServed,
  sevenfoldMovements,
  inputs,
  outputs,
  supportedShells,
  supportedVestments,
  interactionModes,
  receivingSpring,
  lineage
}
```

## Required methods

```js
init(context)
update(braidPacket)
render(frame)
resize(viewportMap)
getState()
serialize()
receive(event)
dispose()
```

Optional:

```js
onInteraction(event)
onSoundFrame(audioFrame)
onVestmentChange(tokens)
onAskingChange(asking)
onWorldAnswer(answer)
onDevOverride(overridePacket)
```

## Context

```js
{
  canvas,
  container,
  braidPacket,
  observerBus,
  mathCore,
  worldRegistry,
  vestmentRegistry,
  runaBus,
  physicalBus,
  eventLogger,
  receivingSpring,
  viewportMap,
  devConfig
}
```

## Braid Packet inputs

### Physical channels

- time;
- Kp;
- Bz;
- moon illumination;
- weather and atmosphere;
- sound and frequency data;
- touch, pointer, stylus and motion;
- screen and viewport;
- sensors and device state.

### PREMAQ

```text
P Presence
C Coherence
R Resonance
E Entanglement
M Memory
A Agency
Q Qualia
```

### Magic and world relation

- Asking;
- Sevenfold movement;
- world and shore identity;
- canon graph;
- symbols and correspondences;
- active crossing;
- Receiving Spring;
- answer and return;
- lineage.

### Physical vestment

- palette;
- material;
- illumination;
- typography;
- texture;
- ornament;
- particle grammar;
- world atmosphere.

## Engine output

```js
{
  engineId,
  timestamp,
  braidPacketId,
  stateFingerprint,
  glyphId,
  geometryFingerprint,
  premaq,
  sevenfold,
  asking,
  worldRelation,
  physicalExpression,
  notableChanges,
  receivingState,
  lineage
}
```

This state can feed Observer, Arcsweep, Runa, DEEPStory, Echo Index, Archive and Continuity Gate.

## Engine 1 · Structural Geometry

Carries topology, relationship, node density, route continuity, harmonic rings and packet movement.

Science/Mathematics supplies graph geometry and deterministic reconstruction.

Magic supplies relation, Asking and Sevenfold movement.

Physicality supplies line, light, screen position, animation and gesture.

## Engine 2 · Liquid Field

Carries flow, bloom, interference, transformation, environmental movement and acoustic relation.

Potential transform families include:

- Planck-scale granularity;
- Fermi occupancy and thresholds;
- horizon and evaporation curves;
- Wardenclyffe harmonic fields;
- world-native magical fluid laws.

Each transform declares its equations, parameters and lineage.

## Engine 3 · Astrolabe / Orrery

Carries celestial, temporal, phase and route relationships through spatial geometry.

Physical ephemeris, mathematical angles and magical correspondence can inhabit the same orrery while remaining distinct contributors to one field.

## Engine 4 · Living Glyph

Carries deterministic canonical paths plus living Canvas/GPU field expression.

```text
Braid Packet
→ deterministic vector geometry
→ world vestment
→ live temporal field
→ stylus / interaction
→ answer geometry
→ replay
```

## Event relation

Glyph engines emit state movements that can enter the whole braid:

```js
{
  type: 'liquid-bloom',
  physicalChanges: ['Kp rise', 'humidity rise', 'sound peak'],
  premaqChanges: ['R increased', 'E relation strengthened'],
  sevenfold: ['Surge', 'Bridge'],
  world: 'terra-aeterna',
  lineage: []
}
```

DEEPStory can carry that event into narrative consequence. Runa can sound it. The Receiving Spring can return an answer that changes the glyph again.

## DEV controls

DEV can configure:

- active engine;
- engine split view;
- transform family;
- physical frequency bands;
- recurrence thresholds;
- smoothing and temporal resolution;
- world vestment;
- Sevenfold movement;
- Asking;
- Braid Packet fixture;
- Receiving Spring fixture;
- export and replay.

## Registry destination

```text
observer-glyph-engines.registry.js
observer-engine-contracts.registry.js
hearthweave-kernel/braided-spine.js
```

## Governing sentence

> **A glyph is the braid made visible. Mathematics gives it exact geometry, Magic gives it living relation and possibility, Physicality gives it line, light, material and touch, and the Receiving Spring lets the world change the form that returns.**
