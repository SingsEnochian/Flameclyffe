# Palette Atlas Ingest v0.1

Status: draft research + implementation contract  
Scope: ArcSweep / Starwell / Flameclyffe / Runa / Glyph Forge / Codex visual systems  
Authority: Rowan explicit instruction, 2026-10-01

## Purpose

Build a reusable colour-language layer for all project surfaces.

The Atlas has three source lanes:

1. **Rowan-owned palettes** — first-class project source material when Rowan identifies them as her own.
2. **External palette archives** — study/provenance sources for colour relationships, naming language and aesthetic trends.
3. **Original project palettes** — new palettes generated in-house from extracted principles, world semantics and interface needs.

## Governing distinction

**Reference is not ownership. Inspiration is not ingestion permission.**

External sources teach principles. Rowan-owned sources may be imported as authored project material. Original palettes should remain the default output of the system.

## Rowan COLOURlovers corpus

Rowan identified the COLOURlovers profile below as containing palettes she created:

- https://www.colourlovers.com/lover/brilliantrouble

Observed public profile state on 2026-10-01:

- 114 palettes
- 26 patterns
- 58 named colours
- 2 templates

This corpus is **owner-authorised source material** for the project. Preserve the original palette name, hex values when available, source URL/profile, creation date/year when available, and ingest provenance.

Initial public examples visible on the profile:

- `Reese's Pieces` — `#302F3D #324557 #878787 #D4A537 #B00038`
- `Delicate` — `#AFA574 #A29D73 #898D6A #6D7B62 #4B644E`
- `To the Nines` — `#7A0C2F #99123D #B31547 #ED3B41 #FF9195`
- `Help Is On The Way` — `#394FFF #0076FF #FF833B #E0E394 #A4C400`
- `Babylonian` — `#0585AF #0C9D52 #EA5800 #B7A8A9 #635254`
- `Flowers` — `#567B84 #7CC8FA #7ADCF7 #C1E7FC #FFF0D7`

Recent profile activity also names project-relevant palettes including `Bluebird Brick`, `Starath`, `Epra Map 001`, `Pireth - New Design`, `Sakisk II`, and `Cooling Jasper`. These should be imported when their complete palette records are retrieved rather than guessed from partial search results.

## External palette sources

### COLOURlovers

Discovery:

- https://www.colourlovers.com/palettes
- https://www.colourlovers.com/palettes/digital-art

Use external community palettes for:

- adjacency / coexistence studies
- colour naming language
- digital-art mood families
- screen-first saturation and contrast examples
- historic community taste patterns

Do not mirror the whole archive into a project corpus. Record provenance for any palette retained as a reference. Prefer extracting principles and generating a new project palette.

### Stitch Palettes

Discovery:

- https://stitchpalettes.com/
- https://stitchpalettes.com/explore/
- Rowan-supplied curated archive URL from 2026-10-01

Use for:

- thread/material colour harmony
- warm / cool / light / dark / pastel / vibrant / retro / modern families
- practical colour relationships that survive translation across media

Do not copy protected paid pattern/download assets into the repository. Extract design principles and build original palettes unless an asset is clearly authorised for reuse.

## Palette record

Every durable project palette should carry:

- `id`
- `name`
- `version`
- `colors`
- semantic roles
- mood tags
- environment/world tags
- intended surfaces
- source kind: `rowan-owned`, `original`, `derived-principle`, `licensed-reference`
- source/provenance records
- contrast notes
- optional material translation notes

Recommended semantic roles:

- `void` — deepest field/background
- `shadow` — secondary dark/surface
- `body` — dominant middle colour
- `light` — readable luminous colour
- `spark` — focus/accent/active affordance
- optional `bloom` — glow/atmospheric expansion
- optional `signal` — explicit status/warning/success

## Original palette doctrine

Default generation path:

`source study -> extracted principle -> original palette -> accessibility/contrast review -> contextual audition -> approved project palette`

Do not create near-clones of external sources by shifting one hex value.

Useful generation strategies:

- OKLCH/LCH perceptual hue arcs
- analogous field + complementary spark
- split-complementary accents
- dark-field + spectral highlight
- muted body + one saturated signal
- warm/cool relational contrast
- material-aware translation for stonewood, metal, glass, ink, textile and bioluminescent surfaces
- image-derived palettes from user-owned or appropriately licensed images
- semantic prompts such as `stormglass`, `ember archive`, `moon-shell`, `sea-lantern`, `ritual circuitry`, `holographic moss`

## Holographic UI law

Holographic does not mean `cyan everywhere`.

Use colour as a responsive field:

- materials retain a quiet native colour
- active systems bloom into spectral accents
- gesture proximity may change luminance/chroma before position
- state transitions may crossfade semantic roles
- attention is focused by contrast rather than permanent glow
- reduced-motion mode preserves colour-state meaning without depending on animation

## Palette audition

A palette is not approved because it looks good as five swatches. Test it against:

1. text/background contrast
2. controls and focus states
3. dark/light appearance variants where relevant
4. holographic bloom and transparency
5. colour-blind distinguishability for state-carrying colours
6. grayscale hierarchy
7. small-screen compression
8. large-field fatigue
9. neighbouring palettes on the same surface
10. semantic fit with the room/world/character using it

## Next implementation seam

1. Build an owner-authorised Rowan palette registry from the `brilliantrouble` profile.
2. Add an original palette generator using perceptual colour space and semantic roles.
3. Add palette audition utilities for contrast, grayscale hierarchy and UI-state separation.
4. Expose approved palettes as design tokens consumable by ArcSweep/Starwell/Flameclyffe surfaces.
5. Keep external palette archives in a provenance/source lane rather than silently promoting them into project canon.
