# Observer v0.2 Prototype

Standalone visual update for the DEEP Observer.

Open `observer-v02.html` beside `observer-v02.css` and `observer-v02.js` to review the prototype.

## Purpose

This prototype applies the new Branch Loom, Signal Garden, and Consent Web visual language to the Observer surface.

It is not wired into the production Observer yet.

## What it tests

- DEEP vector controls for P, C, R, E, M, A, and charge
- branch-state visualisation driven from vector values
- living glyph / field-orb expression using CSS variables
- signal branch map around a central Observer core
- generated narrative readout from the current vector state
- motion-aware CSS guarded by `prefers-reduced-motion`

## Design contract

- JavaScript owns values, derived state, and rendering.
- CSS owns glow, branch tone, motion, layout, and field expression.
- HTML owns accessible structure and controls.
- No external APIs are called in this prototype.

## Future bridge

A production version should become contained modules such as:

- DeepObserverSurface
- ObserverVectorControls
- ObserverBranchMap
- ObserverFieldOrb
- observerVectorState
- observerVisualMapping
- useObserverNarrative
