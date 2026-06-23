# Ygg Room Seed Cards Contract

Status: Portal Kernel v0.1 draft.

Room Seed Cards are a visible UI layer over the existing Ygg interface and room builder contracts. They do not own room state. They do not publish rooms. They do not enable sound. They render inspectable summaries from existing proposal data.

## Card set

- Template Card: shows a room template's kind, parent, access mode, palette, and sound status.
- Room Seed Card: shows the current local room proposal, parent, scene, canon status, and review status.
- Weather Scene Card: shows the future scene-reactive sound plan, including crossfade duration, density cap, motion cap, and current sound state.

## Safety

Cards must remain preview-only in Portal Kernel v0.1.

- No canon writes.
- No autoplay.
- No hidden persistence.
- No live account ownership.
- No transcript storage.
- Weather Scene Cards may show future crossfade intent, but they do not apply sound changes.

## Lab wiring

The optional `portal-room-cards.js` script reads the Portal Kernel JSON output and paints the card deck in a `data-room-cards` container. This keeps the renderer modular and avoids coupling card display to the main lab script.
