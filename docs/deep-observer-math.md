# DEEP Observer Math Notes

Status: implementation guide and claims boundary.

DEEP Observer is a symbolic instrumentation layer. It maps condition vectors into geometry, motion, colour, and bridge receipts. It is not a physics proof, prophecy engine, or causal control system.

## Current vector family

The live glyph code currently works with a normalised DEEP vector such as:

```text
P      presence / node density
C      coherence / thread strength
R      resonance / ring expansion
E      entropy / roughness or disturbance
dpdt   momentum / moving sparks
M      moon or cyclic illumination
A      attention or observer activation
kp     geomagnetic activity input when available
bz     solar wind Bz field input when available
charge centre activation / luminous wakefulness
dphi   phase rotation / angular drift
```

These are interface variables. They may be derived from weather, space-weather feeds, manual conditions, story shards, ritual notes, sound settings, or local UI state, but they must be labelled by source.

## Mapping pattern

The current glyph pattern is graph-and-field-first:

- presence becomes holes, nodes, or density;
- coherence becomes threads;
- resonance becomes rings;
- momentum becomes travelling sparks;
- Bz colours the field;
- Kp affects particle energy;
- charge wakes the centre light.

This is a designed visual grammar, not a natural-law claim.

## Implementation guidance

Every DEEP record should keep enough information to reconstruct the visual state:

```text
source
observed_at
state_vector
condition_json
motifs
glyph seed or signature
visibility
linked event or codex entry
confidence label
```

Use deterministic mappings where possible so a saved event can be re-rendered later.

## Claim boundary

Use these labels in UI and docs:

- Instrument only.
- Symbolic mirror.
- Candidate resonance.
- Evidence-backed observation.
- Speculative mapping.
- Fringe inspiration.

Avoid deterministic language such as fate, proof, guarantees, or direct causation unless the claim is supported by measurement, controls, and documentation.

## Useful next work

Add a shared `deep-vector` module so STARWELL, Project Zero Companion, Runa, and any future Observer tools use the same clamping, defaults, labels, and display logic.
