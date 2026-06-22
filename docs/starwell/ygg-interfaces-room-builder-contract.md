# Ygg Interfaces and Room Builder Contract

Status: Portal Kernel v0.1 draft. This contract describes visible interface and room-building proposals only. It does not enable live auth, live sound, external bridges, canon writes, or public publishing.

## Purpose

Ygg interfaces are the visible tools a steward can use to shape the Portal Kernel without hardcoding one fixed world shape. They are small doors with explicit duties: account gate, branch passport, starmap overlay, room builder, sound console, and Plain Pass.

The room builder grows local room seeds from templates. A room seed is a proposed world node with a parent route, theme, access settings, soundscape contract, and review state. It is inspectable before it becomes anything persistent.

## Interface rules

Every Ygg interface in v0.1 must remain lab-only and preview-safe.

- No canon writes.
- No external bridge activation.
- No live auth requirement.
- No autoplay or live sound output.
- Reduced-motion support is mandatory.
- Plain Pass must remain available.
- The output is visible proposal data.

## Room seed rules

A room seed may preview a future room, gallery, lab, bridge, nest, shrine, chamber, or grove. It may not silently publish itself.

Required controls:

- `canRename` controls local naming.
- `canRetheme` controls palette and visual grammar changes.
- `canInvite` controls whether shared-room invitations are even allowed in the future.
- `canPublish` stays false in v0.1.
- `requiresReviewForCanon` stays true for every template that could later become persistent.

Every generated room seed forces soundscape output off in v0.1: `enabled: false`, `autoplay: false`, `muted: true`, and `intensity: 0`. Sound choices may appear as proposal layers only.

## Initial templates

- Hearth Nook: private resting room near Templehouse.
- Starlit Atelier: shared visual/gallery room for references and art cards.
- Tone Lab: proposal-only sound design room.
- Moon Bridge: threshold room between Grove and story-world branches.

## Promotion path

A local room proposal can later move through review states, but v0.1 only permits proposal and local-preview states. Promotion to canon-ready requires a separate review workflow, explicit consent, export/delete design, and persistence rules.

The tree may sketch a doorway. It may not lock anyone inside it.
