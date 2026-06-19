# World Node Contract v0.1

Status: draft contract for Portal Kernel v0.1

A World Node is a place with behaviour, not a page wearing scenery. It may be a house, room, shrine, city, lab, book, grove, pasture, gallery, storyworld, private sanctuary, shared playfield, or instrument space.

World Nodes are the addressable places Ygg can grow toward. They define where a user is, what rules apply, which presences may enter, what sensory layers are available, and how the user returns home.

## Required fields

- `id`: stable string identifier.
- `kind`: room, shrine, city, lab, grove, world, instrument, playfield, gallery, archive, or custom.
- `title`: user-facing name.
- `parentId`: optional parent node.
- `world`: owning world or project.
- `access`: visibility, entry consent, exit route, age gate when needed, and shared/private status.
- `theme`: biome, palette, motion tier, contrast tier, and optional location skin.
- `soundscape`: consent-safe ambient layer ids, autoplay false by default, mute state, intensity.
- `narrative`: canon layer, tone, story permissions, allowed guides, and ambiguity rules.
- `embodiment`: typing, touch, pointer, motion, haptic, and gaze response policies.
- `participants`: presence ids allowed, invited, waiting, or blocked.

## Safety invariants

Every World Node must declare a return path. Private and shrine nodes require explicit entry. Sound and haptics default off. Shared rooms require invitation state. Adult or intimate rooms require separate gates and must never be reached by accidental navigation.

## Initial nodes

Portal Kernel v0.1 seeds these conceptual nodes only:

```txt
templehouse
lighted-steps
templehouse-shrine
ygg-gate
dreaming-grove
terra-aeterna
luna-eira
runa
grove-playfield
```

These nodes are contracts for later UI. They do not activate production navigation by themselves.
