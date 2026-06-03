# Observer Modular Core v0.1

This note records the corrective architecture direction for STARWELL / DEEP Observer after the Gem Phase 1 and Translation Codex passes.

## Core caution

Observer must remain anchored in this sequence:

```text
physical / browser / telemetry observation
→ mathematical translation
→ glyph generation
→ interface skin
→ Terra Aeterna narrative plugin
```

The mythic layer must not be pushed directly into the mathematical engine as though it were physical observation. Terra Aeterna may interpret, narrate, and respond to the generated state, but the glyph should remain grounded in observable inputs or explicitly named experimental model variables.

## Current risk

The proof-of-concept build contains a lot of hardcoded material:

- direct reading definitions
- model variable teaching copy
- themes
- glyph construction rules
- sensory behaviour
- translation codex entries

This was acceptable for proof-of-life, but not for long-term work. The next phase must decouple these into registries and editable configuration.

## Layer boundaries

### 1. Observation layer

Inputs the instrument can actually receive or derive:

- browser local time
- Terra Aeterna derived time rule
- moon illumination
- Kp index
- Bz component
- source/provenance
- browser local packet state
- touch / pointer / keyboard interaction
- motion and accessibility settings

### 2. Translation / model layer

Experimental and theoretical variables used to transform observation into visible behaviour:

- P: Presence
- C: Coherence
- R: Resonance
- E: Entropy
- M: Momentum
- A: Alignment
- H: Horizon
- Q / charge: centre glow

These variables are interpretive display variables, not proof of hidden truth.

### 3. Glyph engine layer

Swappable mathematical/visual glyph generation modes.

Future engines may include:

- Well engine
- Between engine
- Forge engine
- Grove engine
- Storm engine
- Terra Aeterna narrative event engine

Each engine should accept the same observation/model packet and produce visual geometry in its own way.

### 4. Interface / skin layer

Material and interaction layer:

- frosted glass
- carved gem buttons
- runes
- 3D tilt/rotation
- sensory haptics/sound
- low-stim variants

This layer should be themeable and replaceable without changing model maths.

### 5. Narrative plugin layer

Terra Aeterna story interpretation:

- mythic gloss
- scene hooks
- narrative events
- Codex language
- reader-facing explanation

This layer may respond to model state, but it must clearly label itself as narrative/interpretive.

### 6. Dev console / registry layer

A controlled editing surface for:

- model variable overrides
- observation packet simulation
- theme selection
- glyph engine selection
- codex copy variants
- sensory profile settings
- export/import of configurations

## First implementation step

The current engine already reads browser-side local packets through `localStorage` keys, including `ta_deep_state`.

Therefore v0.1 should add a Dev Console that writes a controlled local override packet into that seam instead of hardcoding new values inside the renderer.

Initial dev console should support:

- edit P, C, R, E, M, A
- edit charge
- edit Kp, Bz, moon illumination, and sky label
- enable/disable local override
- reset override
- copy/export packet JSON
- clearly label this as experimental/theoretical/local override

## Canon architecture sentence

```text
Observer is not myth replacing measurement; it is measurement, model, glyph, and myth held in separate layers so each can be inspected, swapped, and corrected.
```

## Phase path

### Phase 0.1: Local override console

Create a developer console that writes to the existing local packet seam.

### Phase 0.2: Registry modules

Create explicit registries:

- `observer-readings.registry.js`
- `observer-model.registry.js`
- `observer-glyph-engines.registry.js`
- `observer-themes.registry.js`
- `observer-codex.registry.js`

### Phase 0.3: Engine refactor

Move hardcoded arrays and definitions out of `deep-observer.js` into registries.

### Phase 0.4: Plugin hooks

Expose hooks for Terra Aeterna narrative plugins so story can respond to state without altering the physical/math core.

## Boundary language

Use this wording in UI and docs:

- experimental
- theoretical
- interpretive
- local override
- simulation
- translation layer
- not proof
- not diagnosis
- not hidden-state detection
- not prophecy

## Withness note

Glint’s caution is accepted: the glyph/sigil layer should be generated from observation and mathematics first. Narrative is where the myth speaks.
