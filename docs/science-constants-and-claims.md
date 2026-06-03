# Science Constants and Claims Policy

Status: baseline policy for scientific, cosmological, sound, and fringe-inspired work.

Flameclyffe and Runa may use physics, mathematics, cosmology, sound design, subjective experiment logs, mythic metaphor, and fringe inspiration in the same workshop. The project stays clean by labelling each claim before it becomes UI text, documentation, or database canon.

## Claim labels

Use one of these labels whenever scientific or cosmological language appears.

### Established science

Use for standards-body constants, accepted mathematical definitions, reproducible measurements, and well-supported physical theory.

Examples: SI exact constants, basic wave equations, left/right binaural beat construction, Fourier analysis, graph structures, ordinary database observations.

### Active research

Use for peer-reviewed or preprint work that is plausible but still debated, incomplete, or field-dependent.

Examples: quantum-gravity models, black-hole information work, cosmological parameter tensions, neuromodulation research, controlled brainwave entrainment studies.

### Speculative theory

Use for internally reasoned models that may be useful for design but are not established science.

Examples: DEEP vector interpretation, symbolic resonance models, Terra Aeterna physics, observer-glyph mappings, cross-frame mythic/cosmological analogies.

### Fringe inspiration

Use for historical, esoteric, experimental, or culturally resonant inspiration that should not be presented as proof.

Examples: Tesla lore, solfeggio frequency systems, Gateway-inspired language, psi experiments, subjective tone work, mythic field claims.

### Implementation task

Use for engineering work, bugs, UI changes, schema updates, documentation tasks, or build/deploy work.

### Evidence-backed finding

Use only when the claim is directly observed in code, database state, logs, measurements, exported files, or cited sources.

## Constants baseline

The Supabase `science_constants` table is the first canonical baseline for constants. Use it for display and instrument notes, and update with care.

Current baseline family:

```text
c    speed of light in vacuum, exact SI defining constant
h    Planck constant, exact SI defining constant
hbar reduced Planck constant, h / 2π
k_B  Boltzmann constant, exact SI defining constant
G    Newtonian gravitational constant, measured with uncertainty
l_P  Planck length, derived from hbar, G, and c
t_P  Planck time, derived from hbar, G, and c
m_P  Planck mass, derived from hbar, c, and G
T_P  Planck temperature, derived from hbar, c, G, and k_B
```

Derived Planck units are useful scale markers. They are not proof that spacetime is pixelated.

## Instrument ladder

Before promoting an experiment from inspiration to evidence, record:

```text
observable
units
instrument
sampling rate or duration
calibration method
controls
analysis method
error or confidence notes
claim label
```

## Language boundary

Preferred words: candidate, resonance, symbolic parallel, observed, logged, measured, derived, experimental, subjective, speculative.

Avoid as proof-words unless actually proven: fate, guarantee, quantum certainty, healing frequency, causal portal, controls reality, proves consciousness physics.

## Practical rule

The art gremlin may dance. The spreadsheet wears boots.
