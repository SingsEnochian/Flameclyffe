# Cymatic Field Live Reactivity Spec

Status: design / receipt extension
Gate: `targeted_receipt_allowed`
Origin: Faer's DEEP Observer Geometry Lenses prototype

## Core principle

The Cymatic Field must be derived from live signals and reactive to user action.

The reading defines the field. The user's action perturbs the field. The instrument should show both clearly.

In Hearthfire terms: **what you do matters**, but what you do does not secretly rewrite the underlying reading.

## Required boundary

The Cymatic Field is not a screensaver and not an oracle. It is a live consequence surface.

- Live DEEP signals set the baseline wave body.
- User input creates local, temporary perturbations.
- The visual field shows that perturbation as a causal event.
- The baseline reading remains distinguishable from the user's perturbation.
- Perturbations are ephemeral and local unless explicitly exported by the user.

## Live signal adapter

The lens should read from live DEEP state when available, with the prototype sliders kept as a fallback or debugging layer.

Preferred source order:

1. Live DEEP packet exposed by the existing observer runtime.
2. Parsed packet text from the DEEP Observer packet panel.
3. Browser-local geometry-lens state.
4. Prototype fallback defaults.

The adapter should normalise values into the DEEP variable set:

- `P` — Presence
- `C` — Coherence
- `R` — Resonance
- `E` — Entropy
- `A` — Alignment
- `M` — Motion
- `H` — derived Horizon

## Cymatic mapping

The current prototype mapping is right and should be completed rather than replaced.

| Reading | Cymatic role |
| --- | --- |
| `C` Coherence | angular standing-wave mode |
| `R` Resonance | radial standing-wave mode |
| `A` Alignment | symmetry lock, node stability, mirror balance |
| `E` Entropy | blur, threshold width, field fuzz |
| `M` Motion | phase drift and response speed |
| `P` Presence | field density, brightness, and energy |
| `H` Horizon | outer ring intensity and threshold confidence |

## User reactivity model

Every meaningful user action should produce a visible, temporary response.

Examples:

- Pointer or touch on the canvas creates a local ripple disturbance.
- Dragging across the field creates a trail of phase perturbations.
- Selecting a lens changes the geometry, not the underlying reading.
- Adjusting a slider in prototype mode changes fallback readings only.
- Activating a sensor by keyboard creates the same disturbance as touch.
- Low-stim mode dampens response amplitude.
- Reduced-motion mode shows a static ring or brief glint instead of travelling shimmer.

A disturbance should have:

```json
{
  "x": 0.5,
  "y": 0.5,
  "strength": 0.35,
  "source": "pointer",
  "reading_context": "touch",
  "created_at": "browser-now",
  "decay_ms": 1800
}
```

## What the field should show

The Cymatic Field should separate three layers:

1. **Baseline field** — live DEEP reading mapped into standing-wave structure.
2. **Interaction field** — user action causing local distortion, brightening, or node displacement.
3. **Receipt layer** — plain-language labels naming what is live signal, what is user perturbation, and what is fallback.

The page should never make the user guess whether a change came from the signal or from their own action.

## The missing Alignment role

The current Cymatic prototype labels `A → symmetry`, but Alignment is not yet materially used in the field formula. The first implementation polish should wire Alignment into symmetry quality.

Recommended behaviour:

- High `A`: cleaner radial symmetry, sharper stable nodes, calmer mirrored field.
- Low `A`: asymmetry, slight rotational skew, noisier node boundaries.

This makes Alignment legible without making it decorative.

## Accessibility and consent

- Sound and haptics remain off until user activation.
- Pointer reactivity must have keyboard equivalents.
- Reduced-motion users should receive static, readable state changes.
- Low-stim mode should dampen brightness, shimmer, and perturbation lifetime.
- No interaction response should imply hidden agency, fate, or metaphysical proof.

## Non-authorization

This spec does not authorize replacing DEEP Observer, enabling sound autoplay, writing to a database, or persisting interaction traces.

It authorizes a future implementation slice only after Rowan explicitly promotes the gate.

## Candidate implementation names

- `GeometryLensSignalAdapter`
- `CymaticInteractionField`
- `CymaticDisturbanceQueue`
- `GeometryLensReceiptPanel`

## Definition of done for the future slice

A future implementation slice is done only when:

- live DEEP packet values can drive the lens baseline
- fallback sliders remain clearly labelled as fallback/prototype controls
- canvas/pointer/keyboard interactions visibly perturb the field
- perturbations decay locally and are not persisted by default
- reduced-motion and low-stim behaviours are verified
- the visual receipt is updated to include the live signal and user perturbation layers
