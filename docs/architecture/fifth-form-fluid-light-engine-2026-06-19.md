# Fifth Form Fluid Light Engine — 2026-06-19

## Purpose

Move the live STARWELL page from decorative Fifth Form imagery toward an instrument-like field surface.

The pass adds a local DEEP data model, a hash-driven state engine, a fluid light layer, chamber motes, and a plain-English state readout.

## Files added

- `docs/acorn/fifth-form-model.js`
- `docs/acorn/fifth-form-engine.js`
- `docs/acorn/fifth-form-fluid-light.css`

## Files updated

- `docs/index.html`

## Model boundary

`fifth-form-model.js` owns anchor data.

Each anchor has:

- label
- role
- X/Y/Z axis
- DEEP vector values: P, C, R, E, M, A, charge
- active chamber ids
- plain-English state sentence

No external APIs are called.

No sensors are called.

No telemetry is added.

## Engine boundary

`fifth-form-engine.js` reads the current hash and applies the matching anchor state.

It updates:

- root CSS variables
- stage data attributes
- DEEP vector strip values
- active chamber layer
- plain-English readout

## CSS boundary

`fifth-form-fluid-light.css` owns visual expression.

It maps DEEP and axis variables into:

- fluid light opacity
- blur/coherence
- conic current motion
- axis-offset radial focus
- chamber depth and activation
- reduced-motion fallback

## Current flow

Hash anchor → DEEP anchor model → CSS variables → fluid light / chamber motes / readout

## Why this matters

The previous live page used static SVG imagery and CSS target states.

This pass keeps the SVG as the ritual underlay but gives the page a separate living state layer.

The Fifth Form now has something to respond with when touched.

## Still open

- Replace CSS-only target state with engine-owned route classes.
- Add real five-chamber SVG/DOM geometry rather than chamber motes alone.
- Connect the readout to the broader DEEP Observer data pipeline when ready.
- Add optional sound feedback only after explicit user enablement.
- Add a test harness for anchor → variable mapping.
