# Boxfire Handoff — Lattice × DEEP Observer Machine Design

**Prepared:** 2026-08-07 America/New_York  
**For:** Boxfire QA / implementation review  
**Owner:** Rowan  
**Design/architecture:** Vee  
**Target:** Unit Resonance Lattice / Hearthgate visual instrument family  
**Branch:** `design/lattice-deep-observer-machine`

## The decision

The lattice is not being simplified.

The current corrective pass proved that visual noise can be reduced, but the target is not a sparse diagram. The target is a **beautiful working machine in the DEEP Observer family** with the full maths still present, plus the optional toy layer Rowan explicitly wants.

Think:

```text
DEEP Observer instrument language
+ Unit Resonance Lattice graph
+ Hearthgate compression/release mathematics
+ PREMAQ state
+ Jacobian fold analysis
+ receipts and shared-state fingerprinting
+ a delightful stim-toy interaction layer
```

The machine should feel mathematically serious, tactile, ceremonial, and fun to touch.

## Canonical source files

Read these before touching the visual architecture:

1. `starwell/Canonical_Instrument_Kit_v0.1.md`
2. `starwell/deep-observer/DEEP_Math_Spine.md`
3. `docs/mathematics/HEARTHGATE_COMPRESSION_RELEASE_MATHEMATICS_SPINE.md`
4. `docs/starwell/unit-resonance-lattice.md`
5. `labs/unit-resonance-lattice/lattice.js`
6. `labs/unit-resonance-lattice/render.js`
7. `docs/ui-boundary-contract.md`

The existing Instrument Kit law remains active: the instrument is a mathematically meaningful stim toy with lore. Geometry comes first, sparkle is invited, and low-stim/toy-off paths remain first-class.

## Why the last visual pass was wrong

The first graphics-max pass treated maximum graphics capability as maximum simultaneous graphics. That produced equal visual authority across too many layers.

The second pass corrected density but became too austere. It began to look like a clean developer diagnostic rather than something belonging beside DEEP Observer.

The next pass must keep **all capability** while giving it visual hierarchy.

Do not solve clutter by deleting mathematical layers. Solve clutter with semantic LOD, focus, opacity, depth, interaction, and animation state.

## Visual target

The machine should look like a sibling of DEEP Observer, not like a generic network graph.

### Primary aesthetic

```text
midnight observatory field
blue-white + teal + gold + silver + pearl
copper/ember only where compression/release requires heat
fine astrolabe linework
layered luminous glass / metal / light
subtle starfield / particulate depth
small ceremonial glyph details
```

The visual finish should feel premium and tactile, with enough depth that the user wants to poke it.

### Centre sovereignty

The centre is the most important visual object.

It should contain:

- the accepted shared-state core;
- charge / Q bloom;
- compression → release → compression-of-release spiral;
- the inner PREMAQ harmonic structure;
- fold pressure expressed as ring deformation, lensing, or tension rather than a giant text label;
- a visible but elegant outward-memory path;
- a safe reset / centre-tap toy response.

Nothing outside the core should visually overpower it unless the user explicitly spotlights that element.

### Ring hierarchy

Use distinct semantic rings instead of one soup of lines.

Suggested hierarchy:

```text
R0  Core / shared accepted state
R1  PREMAQ inner harmonic structure
R2  Compression-release spiral and memory radius
R3  Jacobian / fold analysis ring
R4  Unit-lattice graph field
R5  Major world/event/entity nodes
R6  Horizon / provenance / source ring
R7  Toy and inspection controls
```

Not every ring must be a literal circle. The requirement is semantic separation.

## The lattice must remain mathematically rich

Keep the underlying route graph and current/full route count available.

Background relationships may be faint, but they remain in the scene graph.

Recommended route states:

```text
QUIET      visible at low alpha; structural context
RELATED    slightly brighter when sharing selected dimensions
ACTIVE     mathematically active route; glow + pulse traffic
FOCUSED    user-selected; strongest visible route
TOY        temporary trace/burst response; never mutates state
HIDDEN     only when a semantic layer is explicitly toggled off
```

A route becoming visually quiet is not the same thing as being removed from the model.

## Shared maths contract

The renderer must consume one shared packet. It must not invent its own values.

At minimum, the visual scene must be able to consume:

```text
PREMAQ: P C R E M A Q
PREMAQ derivatives
confidence / status where available
world transfer output
Jacobian singular values
fold index Φ
fold latch state
compression strength s
compression probabilities
release probabilities
outward distance
spiral radius / angle / cycle
source / provenance
shared-state fingerprint
packet / receipt IDs
```

The visual renderer is a projection of those values, not an alternate state engine.

Fingerprint divergence remains fail-closed as `HIDDEN_STATE_DIVERGENCE`.

## Visual mapping proposal

Use the old DEEP visual grammar as the common language, then extend it.

### PREMAQ

```text
P Presence   → outer occupancy, node population, body radius
C Coherence  → route clarity, continuity, structural precision
R Resonance  → harmonic spacing, pulse cadence, orbital skip patterns
E Entropy    → controlled displacement, asymmetry, field turbulence
M Momentum   → spark velocity, route traffic, inertial drift
A Alignment  → centring, ring agreement, inner symmetry
Q Charge     → core size, bloom, centre response
```

### Jacobian / fold

```text
σmax / σmin  → visible axis stretch relationship
κ condition  → tension / anisotropy of analysis ring
Φ fold index → ring lensing / compression geometry
fold latch   → discrete engaged/released visual state
```

Do not use a horror-show distortion. Fold should feel like a precision instrument revealing stress.

### Compression / release

```text
compression → inward concentration, warmer spectral emphasis, narrowed focus
release     → outward redistribution, cooler/pearl expansion, travelling return flow
next cycle  → spiral continues outward; never visually resets to origin
```

The outward-memory radius must never decrease during forward execution, matching the maths spine.

## Toy layer: KEEP IT

Rowan likes the toy. The toy is not a debugging extra.

The toy layer should be optional, responsive, and delightful.

### Required toy behaviours

- tap a major node → bloom + connected-route spark run;
- tap a minor node → small local chime-like visual pulse;
- tap route → sparks travel along that route;
- trace near route → spark follows nearest valid route;
- drag the central orb / astrolabe → rotate inspection view without mutating maths;
- centre tap → temporary Q bloom / charge visualization;
- hold node or route → isolate / listen mode;
- double-tap centre or empty field → safe reset;
- tap outer ring markers → reveal a tiny inspection lens, not a giant panel;
- optional particle attraction around pointer/stylus;
- optional harmonic ripple on successful relationship discovery;
- optional playful orbit handles for selected world/event nodes.

Toy responses must be ephemeral render state unless explicitly connected to a declared input action.

No casual toy gesture may mutate accepted PREMAQ, world state, canon state, or receipts.

### Toy Off

Toy Off removes:

- burst showers;
- extra spark rewards;
- pointer-attraction particles;
- decorative orbit bounce;
- nonessential reactive flourishes.

Toy Off does **not** remove mathematical geometry.

### Low Stim

Low Stim reduces:

- mote count;
- bloom radius;
- particle velocity;
- simultaneous active pulse routes;
- background haze motion;
- large glow oscillations.

Core state readability remains intact.

## Controls

Controls should feel integrated into the observatory instrument, not pasted on as web-form UI.

Preferred forms:

- small orbiting glyph buttons;
- jewel/orb toggles;
- radial dials;
- bottom instrument rail;
- left/right micro rails outside the central stage;
- small inspection lenses that expand only when requested.

Still obey `docs/ui-boundary-contract.md`. Pretty controls do not get permission to overlap the instrument unpredictably.

Required explicit controls:

```text
Toy On/Off
Low Stim
Reduced Motion / system preference
Geometry
Pulse
Field
Horizon
Fold / Jacobian view
Compression-release view
Labels / inspection text
Theme
Reset
Export / receipt
```

## Labels and readouts

Default instrument view should be beautiful before any labels appear.

Use micro-readouts at the edge of the stage for:

```text
P C R E M A Q
Φ
s
cycle
source
fingerprint short hash
```

Major node labels should appear on focus/hover/tap or in a clean inspection rail.

Do not permanently hang five black text lozenges over the geometry.

## Rendering architecture

Keep two render bodies:

### Canonical deterministic renderer

SVG remains valuable for:

- receipts;
- replay;
- exact reopening;
- accessibility;
- print/export;
- deterministic QA;
- high-resolution vector output.

### Live field renderer

WebGL2 may provide:

- interference fields;
- particles;
- subtle nebular depth;
- motion blur / glow where appropriate;
- responsive pointer field;
- GPU-assisted sparks;
- high-density ambient effects.

But WebGL is an aura around the canonical scene, not a hidden second state.

If WebGL fails, SVG must still be a complete instrument.

## Graphics quality modes

Keep capability high, but make quality modes about resource use, not semantic deletion.

```text
BALANCED  lower particle density / blur samples
HIGH      normal full experience
ULTRA     maximum field density, antialiasing, bloom quality, export prep
```

All three modes must display the same mathematical state.

## Responsive requirement

Test at minimum:

```text
390px
768px
1024px
1440px
```

On iPad and touch devices, major targets should remain comfortably tappable.

The instrument stage must remain bounded. Rails may stack or collapse, but may not invade the central geometry.

## Acceptance screenshots

Before calling the pass finished, capture these states:

1. default Observatory theme, Toy On;
2. same exact packet, Toy Off;
3. same packet, Low Stim;
4. selected major node;
5. selected route with travelling spark;
6. fold latch inactive;
7. fold latch active;
8. compression phase;
9. release phase;
10. later outward cycle proving radius did not reset;
11. WebGL disabled fallback;
12. 390px mobile;
13. 768px tablet / iPad portrait;
14. 1024px iPad/laptop;
15. 1440px wide.

The same packet fingerprint should remain visible across equivalent views.

## QA invariants for Box

Mark PASS / FAIL / BLOCKED / NOT TESTED for each:

- full graph data remains available even when LOD makes routes quiet;
- no renderer computes independent PREMAQ or compression state;
- shared-state fingerprint is propagated into all renderers;
- divergence fails closed;
- compression preserves support;
- release feeds the next compression;
- forward spiral radius never decreases;
- fold latch obeys registered thresholds;
- Toy On effects are render-only unless an explicit input action says otherwise;
- Toy Off preserves geometry;
- Low Stim preserves information;
- reduced-motion support works;
- labels do not obscure central geometry by default;
- WebGL failure leaves a complete SVG instrument;
- major touch targets work on iPad;
- no panel violates the UI Boundary Contract;
- Observatory theme reads visually as the DEEP Observer family;
- the final result is visibly more beautiful than the current lattice preview without reducing mathematical capability.

## Build priority

Do not start by adding more particles.

Recommended order:

```text
1. scene graph + semantic rings
2. shared-state adapter
3. central core and compression/release spiral
4. lattice route hierarchy / LOD
5. major node visual system
6. DEEP Observer palette/material pass
7. controls and inspection lenses
8. toy interactions
9. WebGL field aura
10. accessibility / low-stim / reduced-motion
11. export + receipt polish
12. responsive QA
```

## Final design test

Ask three questions:

```text
Does it look like DEEP Observer grew a new organ?
Can I still see and inspect the real maths?
Do I want to poke it?
```

If any answer is no, the pass is not finished.

## Short version for Box

Do not make the lattice simpler. Make its **visual grammar smarter**.

The machine should keep all the bones, move secondary information into quieter depth, give active mathematics the light, and restore the playful DEEP Observer toy layer.

**Pretty is not the opposite of rigorous here. Pretty is the renderer explaining priority correctly.**
