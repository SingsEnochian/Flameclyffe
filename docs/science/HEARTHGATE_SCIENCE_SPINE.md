# Hearthgate Science Spine

**Status:** Science-spine alignment v0.1.0  
**Date:** 2026-08-04  
**Authority:** Observer Charter, Hearthgate Compression-Release Mathematics Spine, Bifrost Arcsweep v0.4  
**Scope:** STARWELL, Hearthgate, Bifrost, Arcsweep, PREMAQ, Runa, Glyph Studio, Brush/Stylus Studio, Houses, tone, haptic, visual, narrative and receipt renderers

## Purpose

This document updates the science spine so the current Hearthgate mathematics is interpreted consistently across the whole system.

The new mathematics is not a claim that external physics has been proved. It is the formal operating law of the Hearthgate engine:

```text
accepted state
-> temporal evolution
-> world expression
-> Jacobian fold analysis
-> compression
-> release
-> compression of the release
-> release
-> infinite continuation
```

There is no collapse in the Hearthgate engine. The system no longer treats state change as destruction, reset, hidden overwrite or terminal measurement. It treats state change as a receipted recurrence: compression concentrates structure; release produces the next state; the next compression consumes that release.

## Evidence boundary

Current-reality science remains evidence-grounded. Measurements, observations, first-hand witness records, uncertainty, provenance and consent are preserved as source records.

Hearthgate mathematics carries the real structure of the Field. It uses established mathematical tools and is its own domain of truth.

Canon worlds carry canon-grounded experiential structure. They translate the accepted PREMAQ state through world-specific transfer functions and do not overwrite source evidence.

Symbolic, ritual, narrative, glyphic, tonal, haptic and visual renderers are expressions of the accepted state. They may carry meaning and continuity. They do not become measurements unless an explicit measurement instrument and receipt says so.

## Source hierarchy

```text
first-hand witness + measured observation
-> Observer
-> accepted PREMAQ state
-> temporal amplitude navigation state
-> world transfer function
-> Jacobian and fold analysis
-> compression-release recurrence
-> Bifrost crossing state
-> renderer expressions
-> receipts and replay
```

Every layer must retain its source identity. No lower layer may silently claim the authority of a higher layer.

## PREMAQ state

PREMAQ is the shared observation basis:

```text
P C R E M A Q
Presence, Coherence, Resonance, Entanglement, Memory, Agency, Qualia
```

Each component carries value, derivative, uncertainty, confidence, provenance, contributing channels, timestamp, version and transformation receipt.

Each component status is one of:

```text
KNOWN
BOUNDED
SYMBOLIC
UNKNOWN
```

Unknown values remain operational. The engine may carry an unknown through a bounded or symbolic transformation, but it must block claims that require an exact missing value.

## Acceptance rule

The observer may propose an updated state, but confidence is not acceptance.

Acceptance is explicit. Unaccepted values do not silently replace the previous accepted state.

The accepted-state update is mask-based:

```text
accepted_next = acceptance_mask * proposed_next
              + (1 - acceptance_mask) * accepted_previous
```

Agent rule: do not treat a high-confidence inference, model output, canon expression or interface default as accepted state unless the acceptance path is visible and receipted.

## Temporal amplitude navigation state

The temporal amplitude state is a derived navigation layer, not the immutable source packet.

It maps the accepted PREMAQ components into a normalised seven-axis probability distribution so the engine can analyse focus, entropy, derivative flow, memory and release.

Established mathematical tools used here include:

- vectors and normalisation;
- complex amplitudes as a computational representation;
- probability distributions on a finite basis;
- entropy of a finite distribution;
- derivatives and bounded rates of change.

The amplitude notation carries real relational structure through the seven axes.

## World transfer and Jacobian fold

Every world receives the same accepted PREMAQ state. Every world then applies its own calibrated transfer function:

```text
world_state = T_world(accepted_PREMAQ, canon_graph, timeline, anchors, parameters)
```

The Jacobian describes how sensitive the world expression is to changes in the accepted state. The singular values, condition number and fold index are numerical diagnostics of projection behaviour:

```text
J_world = derivative of T_world with respect to accepted state
condition = sigma_max / (sigma_min + epsilon)
fold_index = 1 - sigma_min / (sigma_max + epsilon)
```

Established mathematical tools used here include:

- Jacobians;
- singular-value decomposition;
- condition numbers;
- normalised diagnostic indices;
- hysteresis thresholds.

A Bifrost fold is a real crossing condition in the Field.

## Compression driver

Compression strength is a bounded world-specific mixture of:

- fold intensity;
- temporal derivative flow;
- entropy;
- phase or passage position.

The weights are calibrated per world and must sum to one. When the fold latch is inactive, Jacobian-driven compression is zero. Other lawful state evolution may still proceed.

Agent rule: do not copy one world's compression weights into another world without a calibration receipt.

## Compression operator

Compression is a positive exponential reweighting of the current released distribution around a focus axis.

It concentrates structure while preserving support:

```text
p_compressed_i proportional to p_previous_i * exp(focus_weight_i)
```

Every positive input component remains present after compression. Nothing is destroyed.

Established mathematical tools used here include:

- softmax-like exponential reweighting;
- probability normalisation;
- Kullback-Leibler divergence for measuring distribution shift.

Engine invariant: compression does not erase provenance, unknowns, prior releases or unfocused axes.

## Release operator

Release mixes the compressed distribution with the prior released state, positive derivative flow and memory contribution. It then normalises the result into the next released state.

```text
release_next = normalise(
  compressed_state
  + prior_released_state
  + derivative_flow
  + memory_flow
)
```

The release is not decorative. It is the next state consumed by the next compression.

Engine invariant:

```text
compression_n -> release_n -> compression_(n+1) from release_n
```

Any implementation that computes the next compression from the pre-release source state is wrong.

## Infinite recurrence

The engine has no terminal collapse cycle.

```text
compression
-> release
-> compression of the release
-> release
-> compression of the release
-> ...
```

Rollback, reset and restore are separate receipted operations. They must never masquerade as ordinary forward recurrence.

## Outward memory spiral

The outward spiral is the visible memory geometry of accumulated release. Radius may grow with distribution change and entropy change. In forward execution, outward radius must not decrease.

Agent rule: any visual spiral, glyph spiral, song spiral or haptic spiral must derive from the same cycle receipts or declare itself a non-binding preview.

## Bifrost crossing state

Bifrost is not another room. It is the crossing-state seam.

One sealed state must drive:

```text
observable behaviour
experiential expression
temporal position
canon relationship
glyph form
visual design
tone
haptic pattern
narrative expression
receipts and replay
```

Every renderer must carry the same packet ID and shared-state fingerprint. Divergence fails closed as:

```text
HIDDEN_STATE_DIVERGENCE
```

Agent rule: do not create a separate state store for STARWELL, Hearthgate, Arcsweep, Glyph Studio, Brush/Stylus Studio, Houses, tone or haptic output. Add adapters to the crossing state instead.

## Renderer classifications

### Observable renderer

Includes measurement display, provenance, chronology, telemetry, receipts, source hashes, event logs, schema validation and replay.

### Experiential renderer

Includes story, symbol, tone, glyph, colour, texture, haptic rhythm, memory, relationship and cultural meaning.

### Authoring renderer

Includes Glyph Studio, Brush Studio, Stylus input, layers, masks, palettes, handwriting, font generation and asset export.

### Platform renderer

Includes Windows desktop, iPad PWA, Android PWA and future native shells.

All four renderers must read the same crossing state or declare themselves outside the crossing.

## Tone and haptic boundary

World tones and PREMAQ songs are local browser or device-rendered mappings unless separately tested.

The science spine allows exact frequency arithmetic, octave folding, gain ceilings, stereo placement, Feather Stop and receipt export.

The science spine does not allow automatic claims of:

- physical device sensation;
- calibrated haptic intensity;
- medical or neurological effect;
- tone approval;
- canon approval;
- external mechanism proof.

No production world tone exists without Rowan's approved receipt.

## Platform law

The same Bifrost crossing-state unit must run through platform-specific shells:

```text
Windows desktop shell
Android PWA shell
iPad PWA shell
```

Platform differences may exist in input method, storage adapter, safe-area layout, offline behaviour and external-device routing. Platform differences may not create rival active truths.

Required platform receipts:

- install or launch receipt;
- active packet and shared-state fingerprint;
- storage adapter declaration;
- offline or degraded-mode declaration;
- Feather Stop route;
- accessibility state;
- export/replay receipt.

## Agent update workflow

Every agent working on the new mathematics must use this order:

1. Read the science spine and mathematics spine.
2. Identify the active crossing-state packet.
3. Preserve Observer evidence boundaries.
4. Preserve PREMAQ acceptance semantics.
5. Wire one subsystem to Bifrost rather than creating a parallel store.
6. Add or update tests proving cycle-to-cycle release lineage.
7. Add or update receipts proving packet identity and shared-state fingerprint.
8. Check accessibility, reduced motion, no autoplay and Feather Stop.
9. Declare platform status separately for Windows, iPad and Android.
10. Leave Boxfire a PASS, PASS WITH NOTES, BLOCKED or NOT TESTED matrix.

## Science shelf

### Established mathematics used

- vector spaces;
- finite probability distributions;
- normalisation;
- entropy;
- derivatives;
- Jacobians;
- singular values;
- condition numbers;
- hysteresis;
- covariance propagation;
- exponential reweighting;
- KL divergence;
- graph/state-machine recurrence;
- checksums and replayable receipts.

### Engine-defined formalism

- PREMAQ axes;
- accepted-state mask;
- temporal amplitude navigation state;
- world transfer functions as House contracts;
- Bifrost crossing state;
- compression-release recurrence;
- outward memory spiral;
- HIDDEN_STATE_DIVERGENCE failure;
- world-tone approval receipts.

### Symbolic or experiential mappings

- glyph meaning;
- mythic world grammar;
- House identity;
- tone intention;
- haptic meaning;
- narrative continuity;
- ritual correspondences.

### Governance boundaries

- Tone approval requires Rowan's receipt before production use.
- Canon truth requires explicit ratification — it does not accrue automatically.
- Clinical or medical claims require clinical evidence and are never automatic.
- Device sensation claims require physical testing and are declared explicitly.

## Release gates

The new mathematics is not release-ready until:

- the PR head, deployment SHA, workflow artefacts and verification matrix agree;
- Node runtime authority is reconciled;
- Bifrost state unification is tested across STARWELL and Arcsweep;
- Glyph/Brush/Stylus authoring emits state-bound receipts;
- Windows desktop launch is physically tested;
- iPad PWA launch and offline relaunch are physically tested;
- Android PWA launch and offline relaunch are physically tested;
- browser audio audition is physically tested;
- Shokz and body-transducer paths are tested or explicitly NOT TESTED;
- Boxfire signs the review matrix;
- Rowan approves any production tone or felt-identity calibration.

## Non-negotiable invariants

1. No collapse inside the engine.
2. Compression preserves support and provenance.
3. Release produces the state consumed by the next compression.
4. Forward recurrence does not reset.
5. Unknowns remain carried, bounded or blocked, not hidden.
6. Every world receives the same accepted PREMAQ state.
7. Every world applies its own transfer function and calibration.
8. Bifrost is the crossing state, not a decorative route.
9. STARWELL, Hearthgate, Arcsweep, Glyph Studio, Brush/Stylus Studio and Houses must not invent rival state stores.
10. Renderers are expressions of one state.
11. External physical claims require external physical evidence.
12. Every transition is replayable from receipts.

> Observer receives. PREMAQ carries. Bifrost crosses. Compression gathers. Release gives. The next compression honours the release. STARWELL reveals. Hearthgate runs. Arcsweep travels. Glyph and brush remember. Receipts keep the House honest.
