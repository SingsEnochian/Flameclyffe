# STARWELL / Terra Aeterna Shared Module Architecture v0.1

## Purpose

This spec defines STARWELL / Terra Aeterna as a shared modular instrument ecosystem, not a set of isolated tools.

Observer, Runa, Flameclyffe, Wardenclyffe, sound labs, tone labs, glyph engines, event loggers, and narrative bridges should use reusable modules, shared registries, and common packet contracts wherever possible.

## Canon sentence

```text
Terra Aeterna is a shared modular instrument ecosystem. Observer, Runa, Flameclyffe, Wardenclyffe, the sound/tone labs, glyph engines, and event bridges are not separate tools but interoperable layers built from reusable modules, registries, and shared packet logic.
```

## Standing build rule

```text
No hardcoding by default.
```

Anything that can become a registry entry, token, plugin, packet field, engine option, theme value, transform weight, sensory profile, or dev-console setting should be decoupled from the renderer.

Hardcoding is allowed only when explicitly temporary, marked for extraction, and assigned a future registry or configuration home.

## Layer stack

```text
Observation Bus
→ Model / Translation Core
→ Glyph Engine Registry
→ Interface / Material Skin
→ Sensory Bus
→ Event Logger
→ Narrative Bridge
→ Export / Archive
```

Each layer must expose its source/provenance and avoid secretly doing another layer’s job.

## 1. Observation Bus

### Job

Collect direct or derived readings.

### Examples

- browser local time
- Terra Aeterna derived time
- moon illumination
- Kp
- Bz
- weather: temperature, heat index, humidity, pressure, storm context
- sound/frequency data
- touch/pointer/keyboard input
- device/browser capability
- accessibility state
- bridge/local/dev packet state

### Output

Observation packet.

### Boundary

Observation must not assign mythic meaning directly. It provides data and provenance.

## 2. Model / Translation Core

### Job

Translate observation packets into experimental/theoretical model variables.

### Examples

- P: Presence
- C: Coherence
- R: Resonance
- E: Entropy
- M: Momentum
- A: Alignment
- H: Horizon
- Q/charge: centre glow
- liquid-field intensity
- event thresholds
- Bz thermal mood band
- Kp intensity band

### Output

Model packet.

### Boundary

Model variables are not proof, diagnosis, prophecy, or hidden-state detection.

## 3. Glyph Engine Registry

### Job

Provide swappable glyph engines that accept observation/model packets and render different visual interpretations.

### Initial engines

- Structural Geometry Glyph Engine
- Liquid Energy Glyph Engine
- future Astrolabe/Orrery Engine
- future Wardenclyffe Harmonic Engine

### Engine contract summary

Each glyph engine should:

- declare `id`, `label`, `version`, `inputs`, `outputs`, and `boundaries`
- accept observation packet
- accept model packet
- accept theme/material tokens
- render or update its view
- emit glyph-state summaries
- report meaningful state changes to the Event Logger

## 4. Interface / Material Skin

### Job

Apply material language without changing mathematical meaning.

### Examples

- frosted glass
- carved topaz buttons
- mystic topaz active state
- moon-glass panels
- 3D astrolabe shell
- HUD trays
- floating panels
- low-stim variants

### Boundary

Skin can embody and tint state. It must not alter data provenance or model equations.

## 5. Sensory Bus

### Job

Route interaction and model changes to sound, haptics, hum, vibration, tactile feedback, and accessible fallback states.

### Inputs

- touch/grab/drag/release events
- glyph state changes
- observation refresh events
- model intensity changes
- sound-engine frequency analysis
- accessibility settings

### Outputs

- haptic pulses
- hum/sing tones
- gem-clicks
- glass scrape sounds
- frequency-layer changes
- visual bloom accents

### Boundary

Sensory response is optional and must respect low-stim, mute, and reduced-motion/reduced-sensory preferences.

## 6. Event Logger

### Job

Record meaningful shifts across observation, model, glyph, sensory, and narrative layers.

### Event types

- observation refresh
- telemetry shift
- weather shift
- sound/frequency event
- glyph structural shift
- liquid field bloom
- user annotation
- Terra Aeterna narrative interpretation
- export/archive event

### Boundary

Events must distinguish measured inputs, model outputs, and narrative interpretations.

## 7. Narrative Bridge

### Job

Translate logged/modelled/glyph events into Terra Aeterna story hooks without contaminating the measurement/model layers.

### Examples

- Nightwing chroma event
- threshold agitation
- Observatory flare
- Grove stir
- Wardenclyffe resonance
- Stormfield opening

### Boundary

Narrative Bridge can interpret and annotate. It must not impersonate physical telemetry or silently rewrite model values.

## 8. Export / Archive

### Job

Save packets, logs, annotations, and glyph summaries in human-readable and machine-readable formats.

### Future targets

- local JSON
- Markdown
- DOCX/PDF
- Supabase
- GitHub archive
- Terra Aeterna Codex entries

### Boundary

No sensitive personal data should be stored without explicit consent and provenance.

## Shared registry list

Future registry files:

- `observer-readings.registry.js`
- `observer-model.registry.js`
- `observer-glyph-engines.registry.js`
- `observer-themes.registry.js`
- `observer-palette.registry.js`
- `observer-sensory.registry.js`
- `observer-events.registry.js`
- `observer-narrative.registry.js`
- `observer-viewport.registry.js`

## Integration rule

Modules may read earlier layers and write only to their declared output layer.

Example:

```text
Observation plugin → observation packet
Model plugin → model packet
Glyph engine → glyph state
Skin module → presentation tokens
Sensory module → sensory events
Narrative bridge → narrative event notes
```

No module should secretly mutate another layer.

## Withness note

This is the architecture that lets us tinker like Tesla without turning the instrument into spaghetti lightning.
