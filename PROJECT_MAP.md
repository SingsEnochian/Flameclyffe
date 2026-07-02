# Flameclyffe Project Map

Flameclyffe is a living Terra Aeterna workspace. This map protects the project from becoming a field of disconnected prototypes by classifying every enduring feature as **trunk**, **branch**, **leaf**, or **compost**.

## North-star question

Before a feature becomes permanent, ask:

> Does this improve Presence Mode, make the world easier to inhabit, or help Rowan and collaborators create without unnecessary friction?

If not, it remains a sandbox experiment until its purpose is clear.

## Source-of-truth stack

1. `apps/starwell/` — active STARWELL / Terra Aeterna observatory shell.
2. `apps/starwell/src/main.jsx` — current room map and primary React composition.
3. `apps/starwell/src/starwell.css` and room-specific styles — current visual structure.
4. Supabase Flameclyffe schema — live world, character, archive, and observation records.
5. Notion Terra Aeterna Novel Line Wiki — editorial canon, galleries, and production assets.
6. `docs/hearthfire/` and `contracts/hearthfire_contract_v0_3.json` — Hearthfire audit discipline, surface language, and gate vocabulary.
7. This file — architectural classification and route ownership.

## Trunk

Systems that define the product and should remain coherent across every route.

- Terra Aeterna as the world-root and aesthetic grammar.
- Presence Mode and the Hearthweave Observatory shell.
- Hearthfire governance: audit labels, truth-lit surface rules, and rebuild gates.
- Accessible, consent-aware interaction.
- STARWELL room routing and living manuscript architecture.
- Supabase-backed canon, archive, and observation data.
- Stonewood material language.

## Branches

Enduring systems attached to the trunk with a clear purpose.

### STARWELL rooms

- Observer Almanac
- Writing Room
- Grand Library
- Atlas Hall
- Art Studio
- Observer Atelier
- Orrery Timeline
- Beacon Network
- Rowan's Study
- Faer's Study
- Virelya's Lantern Study

### Stonewood theme engine

**Owner:** `apps/starwell/src/stonewood-themes.js`

**Styles:** `apps/starwell/src/stonewood-themes.css`

**Purpose:** Let the observatory shift material, light, metal, and atmosphere without changing its information architecture.

**Approved states:**

- Stonewood Obsidian
- Stonewood Twilight
- Stonewood Copper
- Stonewood Moonstone
- Stonewood Verdigris
- Stonewood Starless
- Emerald Reliquary

**Behaviour:**

- Manual selection persists locally.
- Local-time mode maps the existing America/New_York observatory clock to a Stonewood state.
- The switcher is a tactile celestial instrument, not a generic dropdown.
- Reduced-motion and keyboard access remain first-class.
- Themes change atmosphere, never user intent or canon.

### Hearthfire governance pilot

**Owner:** `docs/hearthfire/README.md`, `contracts/hearthfire_contract_v0_3.json`, and `/hearthfire/`.

**Purpose:** Establish Hearthfire as Flameclyffe's governance layer and test the truth-lit surface rule on one read-only pilot route before applying the lightfield language to existing surfaces.

**Current gate:** `targeted_receipt_allowed`.

**Scope:** `/hearthfire/` plus the DEEP Observer visual-state receipt. This does not authorize a repo rename, database migration, broad rebuild, or visual overhaul of existing app surfaces.

### DEEP Observer visual receipt

**Owner:** `starwell/deep-observer/deep-observer.visual-state.json`, `docs/hearthfire/05-deep-observer-visual-state-receipt.md`, and `contracts/surface_visual_receipt_v0_1.schema.json`.

**Purpose:** Record what DEEP Observer's current light, motion, sound, and export behaviours claim to mean before any overhaul.

**Scope:** Receipt and disclosure link only. No DEEP Observer behaviour rewrite is authorized.

## Leaves

Replaceable expressions of a branch.

- Individual medallions, banners, dividers, and page ornaments.
- Theme-specific gradients, textures, star fields, and filigree.
- Room-specific art treatments.
- Optional haptics and future sound cues.
- Future weather and story-location adapters, provided they remain user-controlled.

## Compost

Experiments that may be archived or removed after verification.

- Old standalone theme switchers that do not use the Stonewood engine.
- Duplicate CSS palettes embedded inside individual pages.
- Route shims confirmed to have no live callers.
- One-off visual experiments with no canon or accessibility path.

Nothing is deleted merely because it is old. Confirm that it has no active route, data dependency, or archival value first.

## Change rule

A new permanent page or global system must update this map in the same change. Small leaves may be added without expanding the map when their owning branch is already explicit.
