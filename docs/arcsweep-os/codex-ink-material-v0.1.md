# Universal Codex Ink Material v0.1

Status: prototype

## Purpose

Ink is a semantic material on the Universal Codex Glyph Surface. It exists to express a real drawing transformation, not pointer liveness or ambient decoration.

## Contract

- Ink deposits only while an active pointer gesture is drawing on `[data-magic-glyph-canvas]`.
- Mouse, touch, and Pencil-class input reuse the existing Glyph Surface interaction and pressure data.
- Pressure changes radius, opacity, and finite lifetime; velocity changes bounded drift.
- Ordinary cursor hover, fast pointer movement, and Pencil hover do not deposit pigment.
- A committed `glyph-stroke` receipt does not spawn a second generic liquid-ink effect after the physical stroke has already supplied the material response.
- Particles have finite lifetimes and the shared artefact render loop sleeps when no semantic motion remains.
- When the last ink particle drains, the runtime emits `codex:ink-settled` with schema `hearthweave.codex-ink-settled/v0.1`.
- `prefers-reduced-motion` suppresses material animation without changing stored glyph meaning or the canonical stroke receipt.

## Authority boundary

Ink owns no glyph data, receipt ledger, room navigation, or canon state. The Glyph Surface remains the drawing-state owner. Ink is a presentation/material adapter over that existing state and event stream.

## Current renderer

The existing bounded 2D artefact canvas remains the renderer for v0.1. A later WebGL diffusion/bloom implementation may replace the visual simulation if it preserves the same input, quiet-state, reduced-motion, and settled-event contracts.

## Verification

- full ArcSweep test suite
- ArcSweep production build
- no hover-driven pigment regression
- finite particle lifetime
- quiet-state event emitted when pigment drains
- cabinet reports Ink as `prototype`, not `implemented`
