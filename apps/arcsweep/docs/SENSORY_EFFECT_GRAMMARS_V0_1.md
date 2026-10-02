# ArcSweep Sensory Effect Grammars v0.1

Status: adopted experimental sound/haptic design vocabulary
Scope: ArcSweep, Runa-facing sensory rendering, somatic interface, art/worldbuilding reference translation

## Purpose

Recent visual references include fictional, symbolic, contemplative, and subjective-state motifs such as electric build-up, branching life-force imagery, dream entry, projection, capability suppression, psychic-development exercises, grounding, inward attention, threshold crossing, and deliberate return.

ArcSweep does not treat those labels as scientific proof. It extracts transferable temporal and perceptual structures and maps them into bounded interface, sound, haptic, training, and worldbuilding grammars.

```text
reference motif
    -> transferable change-shape
    -> bounded sensory texture
    -> semantic cue
    -> sound + haptic renderer
    -> receipt
```

Core law:

```text
SYSTEM MEANING != SENSORY TEXTURE
```

## Adopted texture families

### Charge
Accumulation -> threshold -> discharge -> short afterglow.
Engineering mapping: rising frequency steps, short attack, stronger successive pulses, optional lateral movement, rapid release.

### Branching
Seed -> propagation -> branching -> stabilisation.
Engineering mapping: central pulse followed by alternating branches, slight pitch divergence, spatial branching where supported, return to stable centre.

### Projection / displacement
Anchor -> outward displacement -> remote spatial impression -> return.
Engineering mapping: centre -> lateral widening -> centre, gradual pitch lift, out-and-back haptic envelope, explicit return cue.

### Dream / diffuse
Soft boundary -> drift -> diffuse imagery -> return.
Engineering mapping: slow attack, longer release, low-contrast modulation, soft-wave haptics, fewer sharp transients.

### Damping / suppression
Active signal -> attenuation -> collapse toward quiet -> held state.
Engineering mapping: falling pitch, reduced pulse strength, narrower stereo field, longer release.

### Return / restoration
Inverse of damping: quiet beginning -> controlled rise -> stable centre.

### Focus
Broad sensory field -> narrowed target.
Engineering mapping: centre-weighted sound, stable pitch, compact haptic pulse. Focus does not imply correctness.

### Uncertainty
Competing unresolved interpretations.
Engineering mapping: paired or gently alternating cues, slight symmetric divergence, no triumphant resolution.

## Grounding and altered-state training grammar

The newest reference set contributes a useful sequence for practices involving meditation, visualisation, inward attention, dream/projection language, and subjective state change:

```text
ground -> settle -> orient attention -> choose target -> modulate sensory field
-> cross threshold -> observe -> log confidence -> return -> compare
```

Transferable engineering patterns:
- Grounding cue: low-centre tone, compact haptic, no spatial drift.
- Settling cue: slower attack/release and decreasing pulse density.
- Attention cue: centred, narrow-band, low-complexity sound.
- Threshold cue: short double event marking a state change without implying metaphysical truth.
- Spatialisation cue: widening stereo or alternating lateral haptic pattern where supported.
- Observation window: no continuous stimulation; the interface becomes quieter so the user can notice their own experience.
- Return cue: inverse spatial motion, gentle pitch convergence, stable final pulse.
- Confidence logging: subjective report remains separate from measured state.
- Blind comparison where appropriate: prediction and outcome can be compared without rewriting the prior report.

## Psychic-development reference translation

References describing intuition, clairvoyance, projection, dream access, energy work, or similar practices are used as training-design and sensory-attention references, not proof of paranormal mechanisms.

Transferable structures include deliberate attention, sensory localisation, imagery rehearsal, confidence recording, uncertainty logging, held-out trials where appropriate, return-to-baseline cues, and prediction-versus-outcome comparison.

## Runtime implementation

Implemented texture catalogue:

```text
neutral
charge
branching
projection
dream
damping
return
focus
uncertainty
```

Runtime files:

```text
apps/arcsweep/src/somatic-textures.js
apps/arcsweep/src/somatic-runtime.js
apps/arcsweep/src/os/somatic-service.js
```

Every sensory texture receipt declares `physical_claim = false` unless a future separately validated instrument contract establishes a specific physical measurement.

## House law

```text
cue meaning != texture
texture != evidence
felt effect != external mechanism proof
symbolic mapping != measurement
sound/haptic output != medical effect
subjective report != external-state proof
```

Wonder is welcome. The layers stay legible.