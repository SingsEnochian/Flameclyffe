# DEEP Observer Math Spine

This file documents the visible mathematical logic behind the DEEP Observer teaching instrument.

The page is intentionally framed as a **reading instrument**, not a control panel and not a claim of proof. DEEP variables are observational inputs that are translated into geometry, motion, glow, and field behaviour so a user can learn what the current state *looks like*.

## Core Variables

| Variable | Name | Visible Role | Why it matters |
|---|---|---|---|
| `P` | Presence | Outer node count, outer radius, presence spotlight | Shows how inhabited or structurally present the field feels. |
| `C` | Coherence | Edge alpha, route density, connective clarity | Shows whether the geometry is holding together or loosening. |
| `R` | Resonance | Harmonic spacing, star-route skip, pulse cadence | Shows whether the field is rhythmically active or quiet. |
| `E` | Entanglement | Node wobble, angular jitter, asymmetry | Shows the living complexity of cross-binding within the field. |
| `M` | Memory | Spark speed, route traffic, trace response | Shows accumulated lineage animating present motion. |
| `A` | Agency | Mid-node count, inner centring, agency glow | Shows the available directed capacity of the field. |
| `Q` | Qualia | Core glow, centre radius, touch bloom | Shows the lived interior quality at the instrument centre. |
| `moonIllum` | Moon illumination | Harmonic ring count and visibility | Provides a soft celestial ring scaffold. |
| `kp` | Kp index | Particle energy and field mote count | Adds environmental energy without changing core structure. |
| `bz` | Bz component | Palette temperature bias | Shifts the field cooler/warmer inside the current theme. |
| `source` | Data source | Packet label | Shows whether the panel is using bridge, local, stale, or fallback data. |

## Derived Horizon Signal

`H` is a derived edge signal. It is deliberately simple and inspectable:

```text
H = C·0.28 + (1 - E)·0.20 + R·0.16 + A·0.14 + Bz⁻·0.09 + Kp·0.06 + Q·0.04 + pulse·0.03
```

Where:

```text
Bz⁻ = clamp(-Bz / 20, 0, 1)
Kp  = clamp(kp / 9, 0, 1)
Q   = charge + temporary touch charge
pulse = a small periodic term used to keep the horizon visually alive
```

The horizon is not a scientific index. It is a visual synthesis layer: a way to turn several signals into an edge-state that the user can see.

## Geometry Mapping

### Outer Ring

```text
outerNodeCount = round(7 + P·7)
```

Presence increases the number of outer nodes. Higher presence means the instrument feels more inhabited and structurally populated.

### Mid Ring

```text
midNodeCount = round(5 + A·4)
midRadius = 238 + R·24
```

Agency and resonance shape the middle body. Agency controls how many mid nodes appear; resonance alters their spacing and harmonic distance.

### Inner Ring and Core

```text
innerNodeCount = 6
coreNodeCount = 3
coreRadius = 76 + charge·24
```

The inner structure remains stable enough to teach from. Charge expands the core triad and centre glow.

### Entropy Wobble

```text
angle = baseAngle + sin(seed + nodeIndex + layer) · E · 0.04
```

Entanglement perturbs node placement without destroying readability. Higher entanglement means the glyph becomes more organic, less perfectly symmetrical.

## Route Mapping

Routes are drawn as rings, star-polygons, radial supports, and core spokes.

```text
outer ring routes: P + C
mid ring routes: C + A
inner ring routes: R + C
triad routes: Q + A
outer star routes: P + R + C
mid star routes: C + R
inner star routes: R
radial routes: C + P
core spokes: Q + R
```

These labels power teaching interaction. When the user taps a card, matching routes brighten so the concept becomes visible.

## Motion Mapping

### Spark Speed

```text
sparkSpeed = 0.004 + M·0.012 + (Kp / 9)·0.006 + randomVariance
```

Memory and Kp both make sparks move faster. Memory is internal motion; Kp is environmental particle energy.

### Pulse Routes

Pulse traffic prefers star routes, core spokes, and mid-ring routes so motion follows meaningful structure instead of spraying randomly.

```text
activePulseCount = lowStim ? 3 : max(5, round(5 + R·8 + Kp·0.35))
```

Resonance and Kp add liveliness. Low-stim mode keeps motion quiet.

## Moon Rings

```text
ringCount = round(1 + (moonIllum / 100) · 4)
```

Moon illumination creates one to five harmonic rings. The moon layer is a living celestial scaffold.

## Theme Palettes

The current implementation supports these palettes:

- **Between:** icy blue, silver, pearl. Best for quiet analysis.
- **Observatory:** gold, teal, blue-white. STARWELL lantern mode.
- **Forge:** ember, copper, red-gold. For hot system states.
- **Grove:** leaf, copper, lilac, honeylight. Soft field study.

The maths stay stable across themes. The palette changes the emotional and elemental skin.

## Interaction Model

| Gesture | Response | Teaching purpose |
|---|---|---|
| Tap variable card | Highlight matching geometry and update teaching text | Connect symbol to visual behaviour. |
| Tap node | Bloom node, spark connected routes, open that variable card | Show how local geometry maps to DEEP. |
| Tap route | Send sparks along route, show route variables | Show relationships between variables. |
| Drag orb | Rotate astrolabe | Let the user inspect the structure physically. |
| Hold node/route | Isolate the selected part | Create focus/listening mode. |
| Trace near a route | Send spark along route | Turn exploration into cause-and-effect play. |
| Centre tap | Boost charge | Show `Q`/charge through core glow. |
| Double-tap centre/field | Reset | Return to full view safely. |

## Accessibility / Regulation Layer

- **Toy On/Off:** removes spark bursts and extra responses while preserving geometry.
- **Low Stim:** reduces motes, softens glow, and quiets movement.
- **Reduced motion preference:** slows spark travel when detected.

The goal is high delight with low punishment: users can poke, drag, trace, and explore without breaking the instrument or losing their place.

## Canon Rule

Every visual behaviour should do at least one of these things:

1. Teach the mapping.
2. Show the current state.
3. Reward exploration.
4. Preserve readability.
5. Offer a lower-stim path.

If a behaviour is pretty but teaches nothing and muddies the geometry, it belongs in a theme toy layer, not the core instrument.
