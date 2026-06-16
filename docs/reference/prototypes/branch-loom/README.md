# Branch Loom Prototype

Standalone DEEP prototype for a data-driven branch state layer.

Open `branch-loom.html` beside `branch-loom.css` and `branch-loom.js` to review the prototype.

## Purpose

This prototype tests the visual contract for branches as living connective tissue.

It does not connect to the production app yet.

## States

- dormant
- listening
- active
- stressed
- protected
- severed
- healing

Each branch state changes color, width, glow, motion, and supporting layers.

## Controls

- Mode selector changes the readout context.
- Branch selector chooses which branch is being edited.
- State selector changes the selected branch state.
- Let It Breathe triggers a whole-map breath animation.
- Cycle States advances all branches through the state set.

## Implementation notes

- SVG branches are generated from data in `branch-loom.js`.
- CSS owns the visual expression of state.
- JavaScript owns state, controls, rendering, and accessibility hooks.
- Motion is guarded by `prefers-reduced-motion`.

## Future bridge

A production version should become contained React modules such as:

- DeepBranchStateLayer
- DeepBranchColorFlow
- BranchStateControls
- deepBranchStateMap
- useBranchSignalFlow
