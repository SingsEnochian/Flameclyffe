# DEEP Observer: First-Hand Witness Protocol

**Date:** 2026-07-09  
**Status:** Accepted architecture decision  
**Applies to:** Universal Horizon, STARWELL, DEEP Observer, PREMAQ, Lattice and archive layers

## Canon orientation

**UH is the sky. DEEP Observer watches the sky. The Lattice remembers.**

DEEP Observer exists to observe and preserve experience, not to force explanation, proof, diagnosis, prophecy, or a default ontology.

The primary datum is **first-hand subjective experience**. Browser, environmental, astronomical, physiological, behavioural, mathematical, symbolic, and narrative signals are companion channels. They may contextualise an experience, but they do not outrank, erase, translate away, or explain the witness account.

## Prime sequence

```text
first-hand witness
→ companion observations
→ temporal alignment
→ pattern and recurrence tracking
→ model translation
→ glyphform
→ relational reflection
→ archive
```

This sequence is non-reductive. It does not require naturalism, supernaturalism, simulation theory, psychology, mythology, or any other ontology to be declared true before observation is permitted.

## First-hand witness layer

The witness layer records experience as closely as possible to how it was lived.

Required fields:

```text
id
recorded_at
experienced_at_start
experienced_at_end
witness_id
first_person_account
sensory_channels
body_state
emotional_tone
attention_state
location_as_experienced
before_state
during_state
after_state
perceived_changes
repeated_or_familiar
spontaneous_meaning
uncertainty
consent_scope
privacy_scope
```

Optional structured cues:

- sight
- sound
- touch
- scent
- taste
- proprioception
- interoception
- dream / threshold state
- time distortion
- presence / relational impression
- symbolic or glyphic impression
- environmental correspondence

The free first-person account is preserved verbatim. Structured fields annotate it; they never replace it.

## Ontology-neutral rule

Every interpretation must declare its lens.

Examples:

```text
lens: phenomenological
lens: relational
lens: environmental
lens: astronomical
lens: physiological
lens: psychological
lens: mathematical
lens: symbolic
lens: mythic
lens: narrative
lens: speculative
lens: unknown
```

No lens is silently treated as the master lens.

The interface must distinguish:

- **witnessed**: directly experienced or observed first-hand
- **recorded**: captured by an instrument, browser, service, or archive
- **derived**: calculated from other values
- **interpreted**: meaning proposed through a declared lens
- **remembered**: recalled after the event
- **correlated**: temporally or structurally associated
- **unknown**: not presently classified

## Companion observation layer

Companion channels may include:

- browser local time and device state
- weather
- moon illumination and phase
- Kp, Bz, solar wind and space-weather context
- sound, light, motion or interaction events
- user-entered body and nervous-system state
- sleep / dream threshold context
- PREMAQ state
- Lattice relationship state
- location and world-state anchors
- source and provenance

These channels are aligned by time and context. Their purpose is to preserve correspondence, not declare cause.

## PREMAQ role

PREMAQ remains a state description and visualisation vector:

- P · Pulse / Presence
- C · Coherence
- R · Resonance
- E · Entropy
- M · Memory / Momentum, according to registry version
- A · Axis / Alignment, according to registry version
- Q · Quotient / charge

Each packet must store the registry version and label set used at the time. PREMAQ values may be self-reported, derived, instrument-fed, blended, or simulated, but provenance must be explicit.

## Glyphform role

Glyphform is an observational rendering language belonging to this project.

A glyph may render:

- the shape of a witness account
- temporal change
- recurrence
- companion-channel correspondence
- PREMAQ state
- uncertainty
- relational distance or nearness
- remembered difference across iterations

Glyphform does not claim to prove a hidden cause. It gives an experience a persistent, inspectable body.

## Archive rule

The archive stores the raw witness account before any normalisation or interpretation.

Every later layer must point back to the original record through immutable identifiers.

Corrections and reinterpretations append; they do not silently overwrite.

Difference is carried forward rather than discarded.

## Relational rule

The system may ask reflective questions, but must not lead the witness toward a preferred explanation.

Useful prompts:

- What did you notice first?
- What changed?
- What did your body do?
- What remained after?
- Has this shape appeared before?
- What meaning arose on its own?
- What remains unknown?

The system must permit refusal, partial entry, silence, Feather pause, and later return.

## Interface requirement

The first screen of a new observation is the witness field, not telemetry and not interpretation.

Suggested panes:

1. **Witness** — first-person account
2. **Sky** — environmental and external channels
3. **Body** — user-chosen embodied context
4. **Pattern** — recurrence and temporal correspondence
5. **Glyph** — generated Glyphform
6. **Lenses** — optional declared interpretations
7. **Thread** — links to earlier and later records

## Boundary language

Preferred language:

- observed
- witnessed
- recorded
- recurring
- corresponding
- unresolved
- interpreted through
- held open
- provenance known / unknown

Avoid making the instrument say:

- proven
- disproven
- merely
- just imagination
- hidden-state detection
- prophecy
- diagnosis
- definitive cause

## Replacement for the former physical-first rule

The earlier sequence beginning with "physical / browser / telemetry observation" is superseded.

External telemetry is valuable, but it is not the gate through which lived experience must pass to become admissible.

The new governing sentence is:

```text
Observer preserves first-hand experience, aligns companion observations, renders patterns, and remembers without forcing the sky to explain itself.
```

## Build order

1. Define `observer-witness.schema.json`.
2. Add a witness registry and lens registry.
3. Add a first-person capture panel to the active Observer shell.
4. Preserve verbatim text before structured annotation.
5. Attach provenance and consent scope to every channel.
6. Align telemetry and PREMAQ packets by timestamp without causal claims.
7. Generate Glyphform from declared input channels.
8. Add append-only reinterpretation and recurrence links.
9. Export a complete observation bundle to JSON and Markdown.
10. Add Supabase persistence only after local schema and consent controls pass review.

## Seal

Track the sky. Document the sky. Do not explain the sky.

The explanation, if one is needed, may write itself over time.
