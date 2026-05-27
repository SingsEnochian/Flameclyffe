# Shoreline Hyperrealism Direction v0.1

## Core Rule

Terra Aeterna's shoreline should be hyper-realistic first and mythic second.

The magic must not look pasted on.

The shoreline should read first as believable water, moonlight, fog, shoreline foam, wet stone, atmospheric depth, and natural bioluminescence. Only then should sigil geometry, portal effects, Kelyran language, and mythic phenomena emerge from the physical environment.

> Reality is the base layer. Terra Aeterna is what reality reveals when observed deeply.

## What v0.3 Is

The current Canvas 2D prototypes are motion and composition sketches.

They are valuable for testing:

- horizon composition
- moon-road placement
- wave rhythm
- pointer disturbance
- bioluminescent reaction
- observatory landmark placement
- emotional arrival

They are not the final rendering strategy for a hyper-realistic coast.

## Rendering Direction

The likely final shoreline renderer should use WebGL or Three.js, not only Canvas 2D.

Canvas remains useful as a sketchbook and fallback.

WebGL / Three.js should eventually handle:

- water plane with animated normal maps
- Fresnel reflection
- moon-road shimmer
- refraction / distortion
- depth tinting
- wet shoreline materials
- volumetric-looking fog layers
- particle systems for bioluminescence
- subtle caustic-like sigil revelation

## Physical Realism Priorities

### Water

- Multi-frequency wave motion
- Gerstner or Gerstner-inspired waves
- Noise / turbulence to avoid repetition
- Slower water near shore
- Shallow-water bunching
- Moon reflection broken by wave normals
- Depth gradient from shore to open water

### Shoreline

- Foam accumulation at wave break
- Foam fade and drift
- Backwash sheen
- Wet stone / pale Stonewood limestone appearance
- Fine shoreline texture
- Shallow-water transparency where possible

### Bioluminescence

Bioluminescence should be reactive.

It should brighten when water is agitated by:

- breaking waves
- pointer movement
- ripple propagation
- storms / wind
- portal emergence
- approaching shoreline

It should not behave like random decorative sparkle.

### Fog and Atmosphere

- Layered parallax fog banks
- Horizon haze
- Fog density affecting lantern glow
- Light scattering around moon and observatory
- Reduced star brightness near horizon
- Subtle warm tint near horizon due to atmospheric extinction

### Stars and Moon

- Stars dimmer and warmer near horizon
- Sharper and brighter overhead
- Smooth scintillation, not random blinking
- Real moon phase eventually from Observer
- Moonlight reflection controlled by water surface

## Mythic Integration Rule

Sigils, portals, and language should be revealed by physical phenomena, not pasted over the scene.

Good:

- geometry briefly appears as reflected moonlight
- Kelyran forms from bioluminescent motes
- portal outline appears through caustics under water
- DEEP sigil is revealed by wave interference
- a glyph appears when fog and lantern light cross

Bad:

- giant glowing circle slapped on top of water
- floating UI card over the ocean
- magic decal with no physical cause
- random particles that ignore water motion

## Design Law

> The geometry is not painted onto reality. The geometry is revealed from reality.

## Build Path

1. Keep improving Canvas 2D prototypes for fast iteration.
2. Create `shoreline-webgl-lab.html` as the first hyper-realistic rendering experiment.
3. Use simple procedural water first.
4. Add moon-road reflection tied to wave normals.
5. Add reactive particle bioluminescence.
6. Add the Portal Pool as a physically strange tidal basin.
7. Only then introduce visible sigil geometry.

## Success Test

Open the page and watch for one minute.

If it feels like software, keep working.

If it feels like standing on a cold luminous coast at night, the shoreline is alive.
