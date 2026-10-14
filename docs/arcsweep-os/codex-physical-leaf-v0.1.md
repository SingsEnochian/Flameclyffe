# Universal Codex physical leaf v0.1

Status: sandboxed interface slice for ArcSweep / Universal Codex.

## Purpose

Add one direct-manipulation forward leaf to the existing Universal Codex without creating a second page-state machine.

The physical layer may interpret pointer, touch, or Pencil movement, but only the existing `__arcsweepMagicBook.turn()` bridge may commit the page transition. That bridge continues to own binding state, `turnMagicBookPage`, rendering midpoint, and the canonical `page-turn` receipt.

## Interaction contract

1. The outer edge exposes one bounded forward-leaf grip when an adjacent page exists.
2. Pointer, touch, or Pencil down creates an inert visual clone of the current right page.
3. Movement toward the spine maps monotonically to drag progress from 0 to 1.
4. A deliberate pull past the progress threshold, or a sufficiently directional flick with minimum travel, commits.
5. A cancelled or insufficient drag animates back to the resting page and writes no page-turn receipt.
6. A committed drag calls the existing Book `turn()` method and lets that method create the sole canonical receipt.
7. Tap and keyboard activation remain valid next-page actions.
8. Reduced-motion mode keeps the semantic page action but does not create a draggable animated clone.

## Rendering boundary

The v0.1 leaf is a direct-manipulation DOM page clone with perspective rotation, lift, slight pinch, and paper-back exposure. The existing Three.js book renderer is dimmed during the drag and temporarily hidden during the commit so two independent page-turn animations do not compete visually.

This is intentionally not yet the final skeletal-curvature renderer. The next rendering upgrade may replace the visual clone with segmented or skinned page geometry while retaining this exact input and commit contract.

## Authority boundary

The leaf sidecar:

- cannot change the active page directly;
- cannot create `Magic Book` receipts;
- cannot navigate ArcSweep rooms;
- cannot write to external systems;
- can emit bounded `arcsweep:codex-physical-leaf` observation events for UI inspection.

## Verification

Focused tests cover adjacent-page targeting, progress, flick velocity, commit thresholds, non-mutating snapshots, pointer capture, coalesced events, reduced motion, and the requirement that the canonical Book bridge owns mutation.
