# Prototype Index

Standalone prototypes for Flameclyffe, STARWELL, DEEP, and Terra Aeterna interface research.

These prototypes are reviewable sketches. They are not production surfaces unless explicitly promoted.

## Current prototypes

- Branch Loom: `branch-loom/`
  - Data-driven branch state layer.
  - Tests dormant, listening, active, stressed, protected, severed, and healing branch states.

- Signal Garden: `signal-garden/`
  - Radial signal map.
  - Tests pulse activation from a central core to state/vector leaves.

- Consent Web: `consent-web/`
  - Explicit sensory consent map.
  - Tests off, on, blocked, and temporary activity states without starting any real sensor APIs.

- Observer v0.2: `observer-v02/`
  - Visual update for the DEEP Observer.
  - Tests P, C, R, E, M, A, and charge as CSS variables, branch states, field-orb expression, and narrative return.

- AR Manipulation Mock: `ar-manipulation-mock/`
  - Pointer-first spatial manipulation sketch.
  - Tests grab, drag, rotate, scale, anchor, dismiss, and pulse without starting a real AR runtime.

## Promotion rule

Before any prototype becomes production code:

- confirm the module boundary
- remove demo-only data
- preserve accessibility and reduced-motion support
- keep consent gates explicit
- separate state, rendering, style, and sensor/device access
