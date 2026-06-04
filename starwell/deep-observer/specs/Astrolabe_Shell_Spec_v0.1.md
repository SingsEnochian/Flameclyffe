# Astrolabe Shell Spec v0.1

## Purpose

The Astrolabe Shell is a reusable 3D interaction module that lets a glyph engine behave like a physical, weighted instrument suspended in the screen.

It should allow the user to pick up, tilt, rotate, inspect, and release a glyph artifact with tactile, visual, haptic, and sound feedback.

## Canon sentence

```text
The glyph should feel like an astrolabe with weight: touched, lifted, rotated in 3D, humming softly under the hand, and hanging forward as if pressing through the glass.
```

## Non-negotiables

- No hardcoded rotation constants inside the renderer.
- No hardcoded sensory responses.
- No one-off page-only 3D behaviour.
- All movement, damping, haptics, tones, and bounds should be configurable through registries or DEV controls.
- Reduced-motion, low-stim, mute, and keyboard alternatives must exist.

## Module role

The Astrolabe Shell wraps a glyph engine.

It does not generate the glyph mathematics itself.

```text
Glyph Engine renders state
Astrolabe Shell gives it spatial body
Sensory Bus makes touch audible/tactile
Event Logger records meaningful interaction shifts
```

## Inputs

- active glyph engine id
- current observation packet
- current model packet
- current theme/material tokens
- current viewport map
- pointer/touch/keyboard input
- accessibility preferences
- sensory profile
- DEV configuration values

## Outputs

- shell orientation state
- interaction events
- grab/release/rotate/inspect events
- sensory bus events
- glyph-view angle metadata
- optional event logger entries

## Interaction behaviours

### Grab

User touches, clicks, or keyboard-focuses the instrument.

Expected response:

- instrument brightens subtly
- haptic/tone confirms contact if enabled
- cursor/touch state enters `grabbed`
- shell records starting orientation and pointer position

### Rotate / tilt

User drags or uses keyboard controls.

Expected response:

- X-axis tilt changes with vertical movement
- Y-axis tilt changes with horizontal movement
- optional Z-axis twist is configurable
- parallax increases with depth layers
- haptic/sound response scales with movement velocity and active sensory profile

### Release

User lets go.

Expected response:

- instrument continues briefly with inertia
- damping eases it toward rest or held orientation
- shell emits release event
- sensory bus plays soft release/settle response

### Inspect

User can choose canonical view presets:

- front
- left oblique
- right oblique
- top tilt
- side/edge
- reset

These should be configuration entries, not one-off hardcoded transforms.

## Spatial model

The shell should support layered depth planes:

```text
back aura plane
rear ring plane
geometry/route plane
node/gem plane
core/well plane
hologram/overlay plane
```

Each plane should expose configurable `zDepth`, `parallaxScale`, and `visibilityRules`.

## Physics feel

The shell should feel physical but gentle.

Configurable variables:

- `mass`
- `inertia`
- `damping`
- `rotationLimitX`
- `rotationLimitY`
- `rotationLimitZ`
- `springReturnStrength`
- `restingTiltX`
- `restingTiltY`
- `depthProjection`
- `grabLiftAmount`
- `hoverFloatAmount`

## Sensory hooks

The shell should emit events to the Sensory Bus rather than playing sound directly.

Events:

- `astrolabe:grab`
- `astrolabe:drag`
- `astrolabe:rotate`
- `astrolabe:release`
- `astrolabe:settle`
- `astrolabe:view-change`
- `astrolabe:reset`

Suggested sensory mappings:

- grab: soft gem contact click
- slow drag: glass-on-glass scrape
- fast drag: brighter hum with velocity scaling
- release: quiet settling chime
- view preset: small harmonic confirmation

All mappings belong in the sensory registry.

## Accessibility

Required support:

- keyboard rotation controls
- reset button
- view preset buttons
- low-stim mode
- reduced-motion mode
- mute mode
- haptics optional
- no essential information conveyed only by motion or sound

## Bounds and viewport

The Astrolabe Shell must read from the Viewport / Resolution Map.

It should know:

- HUD bounds
- safe drag area
- glyph scale
- sensor-ring radius
- overlay snap zones
- panel zones
- minimum spacing around dock/panels

Floating panels and draggable gems must remain inside the instrument HUD unless explicitly detached by an advanced DEV setting.

## Registry destination

Future config home:

- `observer-astrolabe-shell.registry.js`
- `observer-sensory.registry.js`
- `observer-viewport.registry.js`

## DEV controls

Future DEV console controls:

- shell enabled/off
- depth projection
- mass
- inertia
- damping
- X/Y/Z rotation limits
- spring return
- grab lift
- haptic intensity
- drag tone intensity
- view preset selector
- reset orientation

## Boundary

The Astrolabe Shell is an embodied interaction layer. It changes how the glyph is handled and viewed. It must not change observation data, model values, or narrative meaning.

## Withness note

The glyph is not a flat screen drawing. It is an artifact with body, weight, and song.
