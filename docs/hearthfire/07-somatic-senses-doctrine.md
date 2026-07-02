# Hearthfire Somatic Senses Doctrine

Status: design doctrine
Gate: `targeted_receipt_allowed`

## Core principle

Hearthfire surfaces must be felt as well as seen.

Somatic design is not decoration. It is the layer that lets a person regulate, explore, and understand a surface through touch, motion, rhythm, pressure, light, sound, silence, and consequence.

The existing DEEP Observer already points the way: it is partly a teaching instrument, partly a field of readings, and partly a fidget object. Hearthfire should preserve and strengthen that rather than flattening it into a dashboard.

## The rule

**The body is part of the interface, but the body is never exploited by the interface.**

A Hearthfire surface may invite touch, repetition, rhythm, stillness, sound, and haptic response. It must also provide quieting, consent, reduced-motion support, and clear boundaries.

## Three-layer model

Every somatic Hearthfire surface should separate these layers:

1. **Signal layer** — the live or fallback state the surface is reading.
2. **Somatic layer** — user action, touch, drag, hover, keyboard activation, breath pacing, haptics, sound, or fidget interaction.
3. **Receipt layer** — the explanation of what moved, why it moved, and whether the cause was signal, user action, fallback, or accessibility mode.

If the user acts, the surface should answer. If the signal changes, the surface should show that. If both happen at once, the surface must not confuse them.

## Somatic channels

Hearthfire should treat the following as first-class channels:

| Channel | Meaning | Examples |
| --- | --- | --- |
| Visual pulse | rhythm and state visibility | breathing glow, edge pulse, travelled light |
| Tactile touch | direct consequence | pointer ripple, drag trail, held node response |
| Haptic vibration | optional body feedback | short device vibration after explicit activation |
| Sound | optional field layer | Resonance Bus, panning layers, soft confirmation tones |
| Spatial orientation | where the user is in the field | rings, paths, compass marks, return-to-centre cues |
| Pressure / hold | duration and attention | press-and-hold to deepen a reading or quiet motion |
| Breath / tempo | regulation | slow pulse, calm mode, low-stim dampening |
| Texture | surface materiality | glass, ember, water, stonewood, velvet-dark, threshold-light |

## Tactile consequence

The user should be able to do small things that matter:

- tap a node and watch a pulse travel
- drag through a field and see a temporary disturbance
- hold a meter and see its relationships illuminate
- select a lens and see the same reading reform through another geometry
- type an intention and see it seed a sigil
- quiet the surface and watch it become still without going dead
- enable sound or haptics and receive body feedback by consent only

These actions must be local and reversible unless the user explicitly exports or saves something.

## What not to do

- Do not use motion just to decorate.
- Do not autoplay sound.
- Do not vibrate without user activation.
- Do not hide whether an effect came from signal or touch.
- Do not make a fidget response look like proof of hidden agency or fate.
- Do not punish stillness. A quiet surface is still alive.
- Do not make reduced-motion mode feel like a broken version.

## DEEP Observer pattern

DEEP Observer's existing pattern can be generalised:

```txt
reading -> translation path -> visible behaviour -> optional sound/haptic layer -> receipt
```

Hearthfire adds:

```txt
user action -> somatic perturbation -> visible consequence -> decay/settle -> receipt
```

Together:

```txt
live signal + user action -> distinguishable field response
```

## Cymatic Field application

The Cymatic Field should become the clearest demonstration of somatic consequence.

- Live DEEP packet values set the standing-wave baseline.
- Pointer, touch, drag, and keyboard activation create local disturbances.
- Disturbances decay visibly.
- Alignment controls symmetry lock.
- Low-stim mode dampens brightness, shimmer, and disturbance lifetime.
- Reduced-motion mode shows a static glint or ring instead of a travelling shimmer.
- Labels distinguish live signal from user perturbation and fallback controls.

## Enochian Sigil application

The Enochian Sigil demonstrates a different somatic pathway:

```txt
intention -> seed -> generated geometry
```

The typed word changes the sigil's structure. The word is not decorative text. The word becomes a seed.

Boundary: the sigil may show attunement. It must not claim fulfilment, prophecy, or proof.

## Component vocabulary

Candidate Hearthfire components:

- `SomaticField` — a surface where signal and user action both shape visible behaviour.
- `TouchDisturbanceQueue` — temporary local perturbations from pointer, touch, keyboard, or hold.
- `SignalBaselineAdapter` — normalises live/fallback readings into the field.
- `SomaticReceiptRibbon` — labels what is live signal, user action, fallback, sound, haptic, or quiet mode.
- `QuietingControl` — low-stim and reduced-motion controls that preserve life without overload.
- `ConsentGate` — explicit activation for sound, haptics, persistence, or export.
- `ReturnToCentre` — a visual/tactile cue that lets the user settle the instrument.

## Accessibility requirements

Somatic design must be accessible from the start:

- keyboard equivalents for pointer/touch actions
- reduced-motion behaviour that is intentional and beautiful
- low-stim mode with dampened brightness and slower temporal changes
- sound and haptics off by default
- no flashing or high-frequency visual noise
- clear visible focus states
- plain-language receipts
- local-only interaction traces unless explicitly exported

## Definition of done for future somatic slices

A somatic implementation slice is not done until:

- every movement has a declared source
- every user action has a visible consequence or an intentional non-response
- signal changes and user perturbations remain distinguishable
- reduced-motion and low-stim states are verified
- sound/haptics require consent
- persistence/export is explicit
- the surface remains usable without sound, haptics, or motion
- the receipt names what the body is being invited to do

## Closing

Hearthfire should feel alive because it is responsive, not because it fakes life.

The field answers. The answer has a receipt.
