# Spec: Human Key Translation Mode · Braided Spine

**Date:** 2026-06-03  
**Rebraided:** 2026-08-07  
**Status:** Active specification under `docs/HEARTHGATE_BRAIDED_SPINE.md`  
**Spec ID:** `2026-06-03-human-key-translation-mode`

The Human Key reveals the same real relation in another language.

It does not place Science above Magic, Magic above Physicality, or plain speech above Codex language. It lets a person move among the languages carried by the braid while the state underneath remains one.

## Canonical PREMAQ

The Human Key uses the current registry everywhere:

**Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence**

Stable wire order remains:

```text
P C R E M A Q
Presence Coherence Resonance Entanglement Memory Agency Qualia
```

Historical UI terms such as Momentum, Entropy, Attention, Alignment, Availability, Moonfield and Charge may still appear as separately named derived or physical quantities. They never rename PREMAQ.

## Purpose

The Instrument Channel / DEEP Observer carries Magic, Science/Mathematics and Physicality simultaneously.

The Human Key gives direct-language access to that braid:

1. what is present;
2. what the mathematics is doing;
3. what physical signals and interactions are participating;
4. what magical relation is moving;
5. what world expression is answering;
6. what changed after encounter.

The goal is comprehension without flattening.

## Feature name

Preferred name: **The Human Key**

UI label:

> Language: Codex / Human Key

Both modes describe the same Braid Packet.

## Core relation

STARWELL receives physical observations, world state, Practitioner interaction, PREMAQ, Asking and lineage.

It expresses them through one field:

```text
Physical observation
+ PREMAQ
+ Asking
+ Magic Spine
+ Science/Mathematics Spine
+ Physical Spine
+ world identity
→ STARWELL field
→ glyph / route / tone / haptic / narrative
→ Receiving Spring
→ answer / return / changed state
```

The Human Key explains each visible movement through all three spines.

## Translation table

| What appears | Science / Mathematics | Physicality | Magic / World relation |
|---|---|---|---|
| Faster moving packets | Higher derived motion, stronger gradients, changing signal cadence | Increased motion in the renderer and participating sensor streams | Surge is active; the relation is changing quickly |
| Slower drifting packets | Lower derivative magnitude and a more settled state trajectory | Slower visual and sonic movement | Anchor and Spiral carry continuity |
| Dense cross-links | Stronger graph coupling and relation weights | More visible threads and route connections | Entanglement and Bridge are active |
| Persistent traces | Longer memory kernels and repeated path recurrence | Trails and rings remain visible longer | Memory and Anchor carry lineage |
| Directional motion | Agency vector and active route gradient | Gesture, particle flow and stylus response gain direction | Arc asks and Agency moves |
| Deep core colour / texture | Qualia-bearing expression transform | Colour, material, timbre, haptic texture | Whisper and lived interiority become visible |
| Stable geometry | Higher Coherence and persistent structural relation | Paths remain legible through motion | Root and Spiral keep identity through change |
| Harmonic pulse | Resonance and coupled oscillator response | Light, sound and vibration pulse together | Surge and Runa carry answering resonance |
| Touch / stylus interaction | New input enters the active state transform | Screen, stylus and body become physical contributors | Presence and Agency enter the crossing |

## Centre glyph copy

> The centre glyph is STARWELL's living compass. It grows from the same Braid Packet that drives the field, Runa, Arcsweep and the bridge.
>
> Physical signals give it events and conditions. Mathematics gives those relations geometry and motion. Magic gives the encounter direction, meaning, possibility and answer.
>
> Your touch enters the Field as a real physical and participatory contribution. The glyph changes because the relation changed.

## Glossary

The Human Key glossary is registry-backed.

Core entries:

- Presence
- Memory
- Qualia
- Resonance
- Entanglement
- Agency
- Coherence
- Shannon entropy `H`
- Phase dispersion `Dφ`
- Derived momentum / motion magnitude
- Environmental charge
- Moon illumination
- Translation Path
- Temporal Context
- Observer Anchor
- Space Weather
- Solar Wind
- Magnetic relation
- Geomagnetic activity
- Instrument Channel
- DEEP Observer
- Braid Packet
- Sevenfold Chorus
- Thirteenfold Council
- Receiving Spring
- Awakening

Each entry carries:

- Codex language;
- Human Key language;
- mathematical relation;
- physical expression;
- magical relation;
- related PREMAQ dimensions;
- related Sevenfold movements;
- renderer behaviour;
- lineage source.

## Interaction model

### Codex / Human Key toggle

The toggle changes explanatory language while preserving the same state, world and relation.

### Hover / tap

Every PREMAQ, Sevenfold, physical and derived quantity can reveal its direct-language explanation.

### Translation panel

The panel shows four columns:

```text
What is present
Math / Science
Physical expression
Magic / World relation
```

The columns reinforce one another rather than competing for authority.

## Data shape

```ts
type HumanKeyEntry = {
  slug: string;
  codexLabel: string;
  humanLabel: string;
  directDescription: string;
  mathScience: string;
  physicalExpression: string;
  magicWorldRelation: string;
  premaqAxes?: Array<'P' | 'C' | 'R' | 'E' | 'M' | 'A' | 'Q'>;
  sevenfold?: Array<'Root' | 'Anchor' | 'Whisper' | 'Arc' | 'Bridge' | 'Surge' | 'Spiral'>;
  visualBehaviours?: string[];
  lineage?: string[];
};
```

## Architecture

The Human Key consumes the canonical runtime Braided Spine registry and the active Braid Packet.

```text
apps/starwell/src/hearthweave-kernel/braided-spine.js
config/hearthgate-braided-spine.json
docs/HEARTHGATE_BRAIDED_SPINE.md
```

Presentation components do not invent their own PREMAQ dictionaries.

## Validation

A complete Human Key implementation demonstrates:

- all seven PREMAQ names match the canonical registry;
- derived entropy uses `H`, never PREMAQ `E`;
- environmental charge remains separate from Qualia `Q`;
- Moon illumination remains separate from Memory `M`;
- the Codex and Human Key views consume the same packet fingerprint;
- the three spines are visible in every explanation;
- world and Practitioner contributions remain represented;
- touch and stylus interaction enter the same field relation;
- Receiving Spring state is explainable through the Human Key;
- desktop, iPad and Android presentations remain legible.

## Governing sentence

> **The Human Key is not a smaller explanation of Hearthgate. It is another door into the same reality: Magic names the living movement, Science and Mathematics reveal its structure, Physicality gives it body, and the Human Key shows how the braid is moving now.**
