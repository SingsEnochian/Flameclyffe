# STARWELL Canonical Instrument Kit v0.1

The Canonical Instrument Kit defines the shared behaviour, visual language, accessibility contract, and educational scaffolding for STARWELL instruments.

It exists so the instrument family can scale without copy-paste goblinry. Each page may have its own soul, palette, and teaching emphasis, but the underlying interaction grammar and visual semantics should stay recognisable.

## Purpose

STARWELL instruments are **readings, not controls**.

They translate observational state into geometry, motion, glow, and explanatory text. A user should be able to touch an instrument, see a response, and learn why that response happened.

The instrument should feel like:

```text
A mathematically meaningful stim toy with lore.
```

That means every interaction should do at least one of the following:

1. Teach a mapping.
2. Show the current state.
3. Reward exploration.
4. Preserve readability.
5. Offer a lower-stim path.

If a behaviour is pretty but teaches nothing and muddies the geometry, it belongs in an optional toy layer, not the core instrument.

---

## Core Architecture

Each instrument should be separable into five layers:

```text
Data Layer       → DEEP state, local packets, bridge pulse, fallback defaults
Math Layer       → derived signals, geometry counts, route rules, particle rules
Render Layer     → canvas/SVG output, palette skin, glow, motion, layout
Interaction Layer→ tap, hold, drag, trace, spotlight, reset
Teaching Layer   → what it tracks, why it matters, how to interact
```

This separation keeps the shiny from becoming haunted lasagne.

---

## Data Contract

The instrument may read from:

1. Bridge pulse endpoint.
2. Browser/local packet state.
3. Saved local observations.
4. Fallback defaults.

The source must be visible to the user.

Recommended source labels:

```text
bridge
bridge+local
local
stale
fallback
```

Local-first rule:

```text
The public page reads bridge/browser state when available and keeps exports local unless the user copies, saves, or routes them explicitly.
```

---

## DEEP Variable Contract

| Variable | Name | Core Visual Role |
|---|---|---|
| `P` | Presence | Outer node count, outer radius, inhabited structure |
| `C` | Coherence | Edge alpha, route density, structural clarity |
| `R` | Resonance | Harmonic spacing, star-route skip, pulse cadence |
| `E` | Entropy | Node displacement, angular jitter, asymmetry |
| `M` | Momentum | Spark speed, pulse traffic, trace response |
| `A` | Alignment | Mid/inner structure, centredness, core discipline |
| `Q` / `charge` | Charge | Centre glow, core radius, touch bloom |
| `moonIllum` | Moon illumination | Harmonic ring count and visibility |
| `kp` | Kp index | Particle energy and field mote count |
| `bz` | Bz component | Palette temperature shift |
| `source` | Source label | Provenance display and packet metadata |

Variable names may be displayed with friendlier labels, but the mapping should stay consistent across instruments.

---

## Derived Horizon Signal

`H` is the recommended derived edge-state signal:

```text
H = C·0.28 + (1 - E)·0.20 + R·0.16 + A·0.14 + Bz⁻·0.09 + Kp·0.06 + Q·0.04 + pulse·0.03
```

Where:

```text
Bz⁻  = clamp(-Bz / 20, 0, 1)
Kp   = clamp(kp / 9, 0, 1)
Q    = charge + temporary touch charge
pulse = a small periodic visual term
```

`H` is not a scientific index. It is a visible synthesis layer that helps the user see the instrument edge-state.

---

## Visual Layer Contract

Every instrument should preserve these semantic layers:

| Layer | Meaning | Recommended Visual Form |
|---|---|---|
| Geometry | Structure / bones | Nodes, rings, polygons, radial supports |
| Pulse | Active route traffic | Edge-bound sparks or travelling lines |
| Field | Ambient activity | Motes, particles, mist, dust, aurora |
| Horizon | Outer edge-state | Outer ring, edge wash, boundary sparks |
| Moons | Harmonic scaffold | One to five subtle rings |
| Core | Central charge | Centre glow, bloom, pulse point |
| Node holes | Readable anchor points | Dark centres with bright rims |

Geometry comes first. Sparks are guests, not raccoons in the pantry.

Recommended render order:

```text
1. Background field
2. Moon / harmonic rings
3. Geometry skeleton
4. Radial supports
5. Node holes and rims
6. Interaction highlights
7. Travelling sparks
8. Centre glow
9. Tooltip / teaching overlay
```

---

## Palette Contract

The maths should remain stable across themes. Themes change emotional and elemental skin.

Current canonical palettes:

### Between

```text
icy blue · silver · pearl
quiet analysis, liminal readings, veil states
```

### Observatory

```text
gold · teal · blue-white
STARWELL lantern mode, public instrument, celestial field
```

### Forge

```text
ember · copper · red-gold
hot system states, active making, fire/metal work
```

### Grove

```text
leaf · copper · lilac · honeylight
soft field study, botanical/altar modes, gentler inquiry
```

Palette roles:

```text
palette.bg       → ambient field wash
palette.rings[]  → layer colours for geometry
palette.core     → centre glow
palette.spark    → trace/pulse highlights
palette.field[]  → motes and ambient particles
palette.note     → teaching copy for theme switch
```

---

## Interaction Grammar

The interaction model should remain familiar across pages.

| Gesture | Core Response | Teaching Purpose |
|---|---|---|
| Tap variable card | Spotlight matching geometry and update teaching copy | Connect symbol, number, and behaviour |
| Tap node | Bloom node, spark connected routes, open variable teaching card | Show local mapping |
| Tap route | Send sparks along route and show route variables | Show relationships |
| Drag orb | Rotate astrolabe | Let user inspect the structure physically |
| Hold node/route | Isolate selected part | Create focus/listening mode |
| Trace near route | Send spark along route | Make exploration cause visible effect |
| Centre tap | Boost charge | Show `Q` / charge through centre glow |
| Double-tap centre/field | Reset safely | Return to full view without punishing node play |
| Toggle layer | Show/hide semantic layer | Let user simplify or inspect |
| Theme switch | Re-skin without changing maths | Teach stable logic across contexts |
| Toy toggle | Disable extra spark/burst responses | Preserve geometry for low-play needs |
| Low Stim | Reduce motes, glow, and motion | Accessibility and regulation |

No destructive gesture should be hidden in casual play.

---

## Educational Contract

Every instrument page should include some version of:

```text
What it tracks
Why it matters
How to use it
```

For teaching-focused pages, include variable cards and a live formula/readout.

For story/room pages, the teaching may be softer, but the user should still understand what they are touching.

Minimum explanatory components:

1. A short purpose statement.
2. Source/provenance label.
3. At least one quick-guide or legend section.
4. Variable or role cards when the instrument is analytic.
5. Plain-language interaction hints.
6. Local/export safety note when packets are shown.

---

## Accessibility and Regulation Contract

Required controls:

```text
Reduced motion preference support
Low Stim mode
Toy On/Off
Large touch targets
Keyboard activation for cards/buttons
Readable source label
Safe reset gesture
```

Recommended behaviours:

```text
lowStim → fewer motes, fewer pulse routes, lower glow, slower particle movement
toyOff  → no bursts/spark showers, but geometry remains visible
reducedMotion → slow or pause nonessential animation
```

The guiding principle:

```text
High delight, low punishment.
```

---

## Local Packet Contract

When packet export is available, packets should include:

```json
{
  "timestamp": "ISO timestamp",
  "localTime": "local instrument time",
  "source": "bridge/local/stale/fallback",
  "glyphId": "DEEP-...",
  "theme": "Between/Observatory/Forge/Grove",
  "deep": {
    "P": 0,
    "C": 0,
    "R": 0,
    "E": 0,
    "M": 0,
    "A": 0,
    "H": 0,
    "charge": 0,
    "moonIllum": 0,
    "kp": 0,
    "bz": 0,
    "sky": "..."
  },
  "mapping": {
    "P": "outer node count",
    "C": "edge clarity and density"
  }
}
```

Packet actions should be explicit:

```text
Copy packet
Save local packet
Export/download packet
```

Do not silently transmit private packets from public pages.

---

## Page Types

### Public Hub Instrument

Purpose:

```text
Show the grand STARWELL instrument and invite exploration.
```

Tone:

```text
clear, welcoming, visual, playful
```

Priority:

```text
geometry feel + approachable interaction hints
```

### DEEP Observer

Purpose:

```text
Teach the mapping between DEEP variables and visible behaviour.
```

Tone:

```text
instrument panel, field-lab, teaching surface
```

Priority:

```text
explanation + packet transparency + mapping clarity
```

### Writing Room Instrument

Purpose:

```text
Reflect creative state, scene weather, draft momentum, and attention layer.
```

Tone:

```text
writer-facing, soft, less analytical, more supportive
```

Priority:

```text
creative weather + gentle focus + export context
```

### Realm/Room Instruments

Purpose:

```text
Use the same instrument bones with realm-specific palette and lore.
```

Tone:

```text
room-appropriate
```

Priority:

```text
same grammar, local soul
```

---

## Migration Plan

### Phase 1: Stabilise Two Exemplars

- STARWELL hub instrument.
- DEEP Observer teaching instrument.

### Phase 2: Extract Shared Tokens

Move shared palettes, variable labels, formulas, and interaction hints into a reusable document or JS module.

### Phase 3: Extract Shared Engine

Create reusable pieces:

```text
instrument-palettes.js
instrument-math.js
instrument-renderer.js
instrument-interactions.js
instrument-copy.js
instrument.css
```

### Phase 4: Port Page by Page

Recommended order:

1. STARWELL hub.
2. DEEP Observer.
3. Writing Room.
4. Grove / Forge / Between pages.
5. Future rooms.

### Phase 5: Audit

For every page, check:

```text
Does the geometry remain readable?
Does the user know what it tracks?
Does every shiny response have a purpose?
Can low-stim users still use it?
Is data/export behaviour explicit?
```

---

## Design Maxims

```text
Geometry first. Sparkle second.
Readings, not controls.
Explain the magic without killing it.
Make the maths visible, not intimidating.
Every touch should answer.
Every answer should teach, soothe, delight, or clarify.
No beige soup.
```

---

## Current Canon Status

This is v0.1: a working standard based on the STARWELL hub and DEEP Observer implementation.

It should be treated as provisional canon until the shared engine is extracted and tested across at least three page types.
