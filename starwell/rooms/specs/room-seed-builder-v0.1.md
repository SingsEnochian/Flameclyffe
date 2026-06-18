# Room Seed Builder v0.1

The Room Seed Builder is the user-facing wizard for creating a STARWELL room seed. It is not the renderer and not the service engine. Its job is to help a person create or revise a manifest, then hand that manifest to validation and preview layers.

## Purpose

Let a user create their own room without writing application code. The builder gathers room title, archetype, palette, materials, mood, renderer hints, nodes, signals, consent defaults, storage rules, and accessibility preferences.

## Boundary

The builder may preview the room. It must not become the canonical room runtime.

The builder may collect text fields and choices. It must not request geolocation, battery state, or raw interaction telemetry.

The builder may show live animated preview. It must respect reduced-motion and low-stim settings.

## Extracted design ideas from the Stonewood Ecosystem Matrix sketch

Useful, keep:

- chromatic hue and lightness controls
- material chips
- node sprouting controls
- active-node preview
- tendril recalculation between active nodes
- spore or glow effects as optional preview effects
- manifest sync action
- live preview panel

Rewrite before shipping:

- replace raw WebSocket packets with typed `room_seed_update` events
- replace hardcoded node IDs with manifest node drafts
- replace `biometric_stream` with `interaction_rhythm` only after explicit consent
- remove automatic battery calls
- remove hardcoded coordinates
- avoid `user-select: none` at document level
- use proper SVG namespace: `http://www.w3.org/2000/svg`
- split HTML, CSS, and JS into modules or components

## Proposed modules

### RoomSeedDraft

Mutable builder state. This is the draft before validation.

```json
{
  "title": "Moonroot Writing Chamber",
  "kind": "writing_room",
  "purpose": "draft_fiction",
  "theme": {
    "palette": "moonroot",
    "materials": ["white_stonewood", "dark_water", "copper_lantern"],
    "mood": ["quiet", "luminous", "guarded", "tidal"]
  },
  "nodes": [],
  "consent": {
    "live_text": false,
    "interaction_rhythm": false,
    "local_context": false
  }
}
```

### RoomSeedBuilderController

Transforms user edits into a draft manifest. Emits explicit events:

- `title_change`
- `kind_change`
- `theme_change`
- `material_toggle`
- `mood_toggle`
- `node_add`
- `node_remove`
- `node_update`
- `consent_default_change`
- `storage_policy_change`

### RoomThemeTokenMapper

Maps schema-safe theme tokens to CSS variables for preview. This is where `white_stonewood`, `dark_water`, and `copper_lantern` become colour tokens. The mapper should be replaceable.

### RoomNodeLayoutEngine

Calculates preview positions. It should support:

- manifest-provided positions
- radial fallback layout
- split chamber layout
- constellation layout

### RoomPreviewRenderer

Draws the preview from the draft, token mapper, and layout engine. It consumes display values only.

### RoomSeedValidator

Validates the draft against `starwell-room-seed.schema.json` and reports human-readable errors before save/export.

## Event packet shape

```json
{
  "action": "room_seed_update",
  "room_id": "moonroot-writing-chamber",
  "changes": {
    "theme.palette": "moonroot",
    "renderer.layout": "split_chamber"
  }
}
```

## Preview output shape

```json
{
  "leaf_growth": 0.6,
  "phase_angle": 0.4,
  "glow_level": 0.5,
  "active_nodes": ["writing-desk", "archive-pool"]
}
```

## First build order

1. Static builder page or component that loads the Moonroot seed.
2. Theme token mapper for the initial Stonewood palettes.
3. Node layout engine using manifest positions plus radial fallback.
4. Preview renderer with accessible node buttons and SVG tendrils.
5. JSON export button.
6. Schema validation report.
7. Optional local save.

## Non-negotiables

No room-specific hardcoding in the renderer.

No hidden telemetry.

No raw location defaults.

No automatic battery API calls.

No mutation of learned model parameters from interface events.

No one-file permanent app. Prototype shells are acceptable only when they are clearly disposable adapters.
