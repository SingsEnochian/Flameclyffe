# Observer Master Map v0.1

This is the working map for STARWELL / DEEP Observer after the no-hardcoding Notch.

## Standing build rule

```text
No hardcoding by default.
```

Anything that can become a variable, registry entry, plugin, editable dev-console setting, theme token, glyph engine, or narrative layer must be decoupled from the renderer.

Hardcoding is allowed only when all four conditions are true:

1. It is explicitly temporary.
2. It is marked with a clear extraction note.
3. It does not mix observation, mathematics, and myth into one hidden blob.
4. It has a named registry or dev-console destination.

## Prime architecture

Observer is a layered system:

```text
Observation → Translation / Model → Glyph Engine → Interface Skin → Narrative Plugin → Export / Archive
```

Each layer has its own job. No layer should secretly do another layer’s work.

## Layer 1: Observation

### Purpose

Receives or derives physical, browser, telemetry, and local context.

### Examples

- browser local time
- derived Terra Aeterna time rule
- moon illumination
- Kp
- Bz
- source / provenance
- browser local packet state
- touch / pointer / keyboard interaction
- motion / accessibility settings

### Must be editable through

- bridge pulse feed
- local override packet
- DEV console
- future observation registry

### Must not do

- assign mythic meaning directly
- pretend narrative interpretation is physical telemetry
- overwrite model values without provenance

## Layer 2: Translation / Model

### Purpose

Transforms observations into experimental/theoretical model variables.

### Current variables

- `P` Presence
- `C` Coherence
- `R` Resonance
- `E` Entropy
- `M` Momentum
- `A` Alignment
- `H` Horizon
- `Q` / `charge` Centre glow

### Must be editable through

- DEV console
- future model registry
- import/export packet JSON

### Must not do

- claim proof
- diagnose the user
- claim hidden states
- become narrative canon without being labelled as narrative

## Layer 3: Glyph Engine

### Purpose

Converts model state into geometry, motion, particles, rings, and visible behaviours.

### Future engines

- Well engine
- Between engine
- Forge engine
- Grove engine
- Storm engine
- Terra Aeterna narrative event engine

### Must be editable through

- future glyph engine registry
- future engine selector in DEV
- exported configuration

### Must not do

- contain hardcoded story conclusions
- hide equations inside UI styling
- directly mutate narrative state

## Layer 4: Interface Skin

### Purpose

Controls the visual/tactile material language.

### Current skin themes

- frosted glass
- carved rune accents
- gem buttons
- beveled dock
- sensory gem
- hologram panel
- future 3D astrolabe body

### Must be editable through

- theme registry
- CSS custom properties
- DEV theme controls
- future asset/style pack

### Must not do

- change mathematical meaning
- alter observation source
- make fallback states unreadable

## Layer 5: Narrative Plugin

### Purpose

Adds Terra Aeterna interpretation, story hooks, Codex language, and mythic resonance.

### Examples

- Well / Forge / Grove interpretation
- scene event hooks
- mythic translation copy
- narrative consequences
- story-state markers

### Must be editable through

- narrative plugin registry
- Codex registry
- Terra Aeterna event registry
- future story export layer

### Must not do

- impersonate physical telemetry
- silently rewrite model variables
- present mythic meaning as proof

## Layer 6: Export / Archive

### Purpose

Stores or exports observation packets, dev override packets, narrative events, and generated logs.

### Examples

- local packet export
- copied JSON
- saved browser packets
- future Supabase logs
- future Markdown / DOCX / PDF export

### Must be editable through

- packet schema
- export registry
- archive policy

### Must not do

- store sensitive data without consent
- blur experimental dev values with live telemetry
- hide provenance

## Current no-hardcoding refactor targets

### Immediate

- Keep DEV console as the first override seam.
- Use `ta_deep_state` local packet path for controlled experimental overrides.
- Do not add new model constants directly into `deep-observer.js` unless marked temporary.

### Next extraction targets

1. `DIRECT_READINGS` → `observer-readings.registry.js`
2. `TEACH` and Codex copy → `observer-codex.registry.js`
3. `THEMES` → `observer-themes.registry.js`
4. glyph construction rules → `observer-glyph-engines.registry.js`
5. sensory profiles → `observer-sensory.registry.js`
6. Terra Aeterna meanings → `observer-narrative.registry.js`

## Dev console scope

DEV console is allowed to edit:

- model variables
- observation simulation values
- local override packets
- future glyph engine selection
- future theme selection
- future registry-import/export JSON

DEV console is not allowed to:

- silently overwrite live bridge data without provenance
- claim a local override is real telemetry
- mutate narrative canon without a story-event packet

## Registry rule

A registry entry should answer:

```text
id
label
layer
source/provenance
inputs
outputs
math or display behaviour
plain-English explanation
Terra Aeterna interpretation, if any
boundaries
editable fields
```

## Plugin rule

A plugin may read from earlier layers and write only to its own declared output.

Examples:

- narrative plugin may read model state and write story hooks
- skin plugin may read model state and write visual styling
- glyph engine may read model state and write geometry
- observation plugin may write observation packets

No plugin should secretly write into another layer.

## Hardcoding audit checklist

Before adding code, ask:

1. Is this a value that should be editable?
2. Is this a mapping that belongs in a registry?
3. Is this a visual theme token?
4. Is this a narrative interpretation?
5. Is this physical observation or model translation?
6. Does the UI expose enough provenance?
7. Can DEV alter it without opening the source file?

If yes to 1–4, do not hardcode it in the renderer.

## Current phase gates

### Gate A: Stable dev console

DEV must open, edit values, apply local override, export JSON, import JSON, and reset cleanly.

### Gate B: Registry scaffold

Create registry files before adding new glyph engines or narrative plugins.

### Gate C: Engine extraction

Move current hardcoded readings, teaching copy, themes, and glyph-engine rules into registries.

### Gate D: 3D artifact build

Only after registry scaffold exists, begin the 3D spatial instrument layer.

### Gate E: Terra Aeterna plugin

Narrative plugin hooks come after the observation/model/glyph separation is clear.

## Canon sentence

```text
Observer is a layered instrument: reality is observed, mathematics translates, glyphs render, interface skin embodies, and Terra Aeterna narrates. No layer secretly replaces another.
```

## Withness note

The shiny can continue, but the bones must stay inspectable. The rugby drunkards now have lanes.
