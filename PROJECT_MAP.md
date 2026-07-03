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
4. `apps/starwell/src/scfe/` — read-only Starwell Concurrent Field Engine v0.1 kernels, contracts, and snapshot orchestration.
5. Supabase Flameclyffe schema — live world, character, archive, and observation records.
6. Notion Terra Aeterna Novel Line Wiki — editorial canon, galleries, and production assets.
7. This file — architectural classification and route ownership.

## Trunk

Systems that define the product and should remain coherent across every route.

- Terra Aeterna as the world-root and aesthetic grammar.
- Presence Mode and the Hearthweave Observatory shell.
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
- SCFE Read-Only Lab (`apps/starwell/scfe-lab.html`) — standalone lab entrypoint for Barbault maths, DEEP seed vectors, somatic safety, sacred geometry mapping, Hearthfire protocol recommendation, Terra Aeterna prompts, and manual JSON export. No Supabase writes.

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
