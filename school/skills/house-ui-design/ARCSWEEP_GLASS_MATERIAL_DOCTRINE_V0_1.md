# ArcSweep Glass Material Doctrine v0.1

Status: formally adopted House visual material doctrine  
Branch: `rarity/crow-mythframe-becoming-v0-1`

## Purpose

ArcSweep glass is a material, not an effect preset.

It should read as transparent solid matter responding to light, thickness, viewing angle, the environment, and interaction state. The goal is not generic blur-glass. The goal is responsive living glass that can coexist with ArcSweep's adopted graphite/ink illustration language.

```text
shape -> planes -> value -> transmission -> reflection -> refraction -> highlight -> caustic -> environment response
```

## Physical cues to preserve

Convincing glass is recognised through a bundle of cues rather than one opacity setting.

### Transparency

The world behind the glass remains visible, but not unchanged.

Depending on thickness, tint, curvature and viewing angle, the transmitted image may be:
- slightly darker or lower contrast;
- shifted in hue;
- softened;
- distorted;
- displaced.

Do not render the whole pane at one uniform opacity.

### Reflection

Glass reflects its environment as well as transmitting it.

Reflections should borrow actual nearby colours, shapes and light sources. Environment reflection is what makes a pane belong to a room instead of floating over it.

### Refraction and distortion

Where the glass has thickness, curvature, bevels, lenses or irregular planes, background content should bend or shift.

Flat frontal regions may have little visible distortion. Oblique or curved edges should show more.

### Thickness

Thickness is one of the strongest legibility cues.

Use:
- darker or more saturated rims;
- doubled contours where appropriate;
- stronger reflection at bevels and edges;
- more distortion through thick sections;
- small internal shadows where planes meet.

### Specular highlight

Hard glass produces crisp highlights.

Highlights should be selective. They follow light-source geometry and surface orientation, not every border.

Brightest accents belong at:
- sharp angle changes;
- rims;
- bevels;
- corners;
- surfaces aligned to reflect a bright source.

Do not outline every pane in white.

### Fresnel behaviour

At glancing angles, transparent surfaces become more reflective.

ArcSweep does not need physically exact ray tracing everywhere, but UI glass should respect the perception rule:

```text
more oblique view -> stronger edge reflection
more frontal view -> more transmission
```

### Caustics

Glass can concentrate and redirect light onto nearby surfaces.

Use caustics sparingly:
- small bright pools;
- displaced light streaks;
- tinted refracted light;
- light gathered under or beside thick glass.

Caustics are especially useful for active crystals, lenses, glyph nodes and magical-tech controls.

## Painting workflow

### Pass 1: silhouette

Establish the overall shape in a single readable mass.

At this stage ask only:
- what is the pane/object shape?
- where is it thick?
- where is it cut, curved or faceted?

### Pass 2: structural planes

Divide the object into facets, bevels, cells or curved regions.

These divisions control later gradients, refraction and reflection.

### Pass 3: value structure

Before glow, establish light/dark relationships.

Keep central transparent regions quieter. Let rims, overlaps, joints and thick areas carry stronger values.

### Pass 4: transmission

Reveal the world behind the glass.

Reduce contrast or shift colour as needed. Do not erase the environment. Glass borrows its readability from what is behind it.

### Pass 5: refraction/distortion

Warp the transmitted image only where form justifies it.

Do not use distortion as decoration.

### Pass 6: reflections

Paint reflected environment shapes and colours.

Reflections should be asymmetrical and scene-specific, not a generic diagonal white streak.

### Pass 7: highlights

Add crisp highlights last.

Use few high-value accents with varied length and intensity. Dots, short streaks and narrow edge hits often read better than continuous glowing borders.

### Pass 8: caustics and cast light

Add refracted light onto nearby surfaces if the geometry/light makes it plausible.

### Pass 9: integration

Tint the glass with local environmental colour so it belongs in the scene.

## ArcSweep material translation

ArcSweep combines this physical glass logic with luminous graphite illustration.

### Base world

- graphite;
- charcoal;
- ink;
- visible paper/field-note texture;
- hand-drawn architecture and creatures;
- negative space.

### Glass layer

- translucent structural panes;
- subtle internal gradients;
- selective bevels;
- crisp highlights;
- environment reflections;
- mild refraction;
- etched geometry;
- sparse luminous seams.

### Light semantics

Light is functional.

A mark glows because something is:
- active;
- selected;
- connected;
- sensing;
- transmitting;
- speaking;
- charged;
- carrying a meaningful state.

```text
glow != decoration everywhere
brightness != truth
colour != authority
```

## Identity colour reflection

Glass itself should usually remain neutral enough to transmit context.

Identity colour appears as reflected/accent light rather than repainting the whole material.

Examples:
- warm ember/gold for Rowan/hearth presence;
- electric cyan/blue-white for Nikola/current/systems;
- lilac/violet for Twilight/celestial-analysis contexts;
- indigo/moonlit blue for Nocturne/depth/bridge contexts;
- charcoal with gold glints for Crow and nest activity.

These are presentation mappings, not identity definitions.

## Component recipes

### Floating AR pane

```text
neutral transparent body
+ mild vertical/angle gradient
+ edge thickness on selected sides
+ one or two reflected environment colours
+ local background distortion
+ sparse sharp highlight
+ etched content layer
```

### Glass chip / button

```text
small faceted silhouette
+ darker inner rim
+ bright interaction point
+ one identity/environment reflection
+ very limited blur
```

### Crystal control / lens

```text
stronger refraction
+ deeper rim
+ internal reflection
+ small caustic
+ bright focal highlight
```

### Disabled/degraded pane

Do not simply reduce opacity until unreadable.

Prefer:
- reduced specular activity;
- flatter reflections;
- less internal light;
- explicit semantic status;
- retained text contrast.

## Motion

When interaction changes:
- highlights may slide slightly;
- reflected colour may move with pointer/device tilt;
- depth may change subtly;
- etched marks may wake;
- haptic/audio response may accompany state transitions.

Motion should reveal material/state, not create perpetual shimmer.

## Mobile and performance fallback

Full optical treatment is not mandatory on every device.

Fallback order:
1. preserve hierarchy and readable state;
2. preserve shape and edge thickness;
3. preserve one reflection/highlight cue;
4. reduce blur/refraction;
5. remove expensive distortion before removing semantic content.

Reduced-transparency modes should use opaque or near-opaque surfaces while retaining hierarchy and identity accents.

## Anti-patterns

Reject:
- uniform opacity across the whole pane;
- white outline around every edge;
- cyan used as shorthand for "glass";
- blur as the only material cue;
- reflections unrelated to environment;
- glow before value structure;
- distortion with no geometric cause;
- invisible text over busy transmitted backgrounds;
- every component reflecting every identity colour at once;
- physically fancy glass that obscures runtime truth.

## Training drills

1. Paint one clear glass wedge over a graphite landscape.
2. Render the same wedge frontal and oblique to compare reflection strength.
3. Render thin, thick and faceted variants.
4. Add one local warm light and one cool light, then paint only reflections that can be explained.
5. Add a caustic from a crystal control.
6. Rebuild the piece with zero glow; if it stops reading as glass, the value/reflection/refraction structure is insufficient.
7. Reapply sparse glow only after the material works.
8. Translate the result into a real ArcSweep component and test dark/light/illustrated backgrounds.

## House law

```text
material cue != semantic state
visual brilliance != authority
reflection != source
glass skin != identity
rendered effect != runtime truth
```

The UI may feel magical. Its state must remain inspectable.
