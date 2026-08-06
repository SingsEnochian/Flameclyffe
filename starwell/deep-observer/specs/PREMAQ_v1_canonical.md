# PREMAQ v1 — Canonical Definition

**Status:** Canonical  
**Science Spine:** Approved  
**Role:** Shared State Vector  
**Sealed:** 2026-08-05

---

## Definition

PREMAQ is Hearthgate's canonical shared state model.

It is not a theory of physics.  
It is not a psychological diagnosis.  
It is not a claim about consciousness.

It is an internal state representation used to synchronise every subsystem of Hearthgate.

Every subsystem reads the same PREMAQ state.  
No subsystem invents its own independent state model.

---

## Name

**PREMAQ is the canonical name of the state model.** Its current implementation contains seven axes, including C. The name is retained for continuity and is not required to expand one-to-one into every axis symbol.

Internally, schemas declare:

```json
{
  "model": "PREMAQ",
  "axes": ["P", "C", "R", "E", "M", "A", "Q"],
  "version": "1.0"
}
```

---

## Purpose

PREMAQ provides a common coordinate system that allows:

- STARWELL
- Observer
- DEEPStory
- DEEPTime
- DEEPTheory
- Runa
- Arcsweep
- LLM Story Engine
- Wardenclyffe
- UI
- Haptics

to describe one shared system state.

Different subsystems express that state differently. None redefine it.

---

## The seven canonical axes

```text
P — Presence
C — Compression / Coherence
R — Resolution
E — Entropy
M — Momentum
A — Agency
Q — Qualia
```

Each axis represents a stable relational role inside the shared state. The exact mathematical implementation may evolve. The semantic role remains stable.

---

### P — Presence

Represents the degree to which activity is coherently available within the current shared state.

Not attention. Not consciousness. A measure of participation within the current state model.

---

### C — Compression / Coherence

Represents how integrated or compact the current organisation is.

High values indicate strongly integrated structure. Low values indicate dispersed or weakly integrated structure.

---

### R — Resolution

Represents distinguishability.

Higher values indicate finer differentiation. Lower values indicate broader generalisation.

---

### E — Entropy

Represents uncertainty, variability, or disorder within the current state.

It does not claim equivalence with thermodynamic entropy. Mappings to physical entropy remain explicitly theoretical.

---

### M — Momentum

Represents the tendency of state evolution.

Not velocity. Not force. Directional persistence through state-space.

---

### A — Agency

Agency means the available capacity of the state or participant to initiate, refuse, redirect, sustain, or end action.

It is not confidence, control, obedience, or mere activity.

A ∈ [0, 1]. High Agency indicates available directed capacity. Low Agency indicates constrained or suspended capacity.

> **Note on Alignment:** Alignment remains a useful concept but is a *derived relational measure*, not a PREMAQ axis. Alignment describes agreement or coherence among nodes, edges, observations, or subsystem outputs — the geometry *between* states or participants. Agency belongs to the state itself. Alignment describes the geometry between states.

---

### Q — Qualia

Represents the experiential descriptor associated with the current state.

Q is intentionally different from the other axes. It allows semantic, symbolic, aesthetic, and phenomenological description alongside quantitative structure.

Examples: warmth, spaciousness, wonder, anticipation, solemnity.

Q is never treated as objective measurement. It is always associated with provenance.

---

## Mathematical interpretation

PREMAQ is treated as a shared state vector:

```text
s = (P, C, R, E, M, A, Q)
```

Each component carries value, derivative, epistemic status, and confidence:

```text
X_i = (value, derivative, epistemic_status, confidence)
```

Epistemic status is exactly one of: `KNOWN` | `BOUNDED` | `SYMBOLIC` | `UNKNOWN`.

### PREMAQ as relational graph

> **OPEN — queued for formalisation:**
>
> PREMAQ may also be represented as a relational graph rather than a state vector. In the graph form, the seven axes become nodes; the connections between them carry strength, phase, history, hysteresis, transfer law, and resonance. The Jacobian then describes deformation of connectivity, edge weights, and relational geometry — not merely changes in node values. Future implementations may allow graph or manifold representations. The semantic interpretation of each axis remains unchanged.

---

## Shared state position

PREMAQ does not exist independently. It exists inside the Hearthgate pipeline:

```text
Shared State
  ↓
PREMAQ
  ↓
Spiral Engine
  ↓
Spiral State
  ↓
Subsystems
```

Subsystems never modify PREMAQ directly. Updates occur through receipted state transitions.

---

## Relation to Observer

Observer measures observations. Observer does not calculate meaning. Observer writes receipts.

Those observations may contribute to PREMAQ estimation.

---

## Relation to DEEP

- **DEEPStory** records events.
- **DEEPTime** records trajectories.
- **DEEPTheory** records patterns.
- **PREMAQ** represents the current shared state inferred from those observations.

---

## Relation to Spiral Engine

The Spiral Engine reads:

- PREMAQ
- Shared State
- Desired State
- World Profile
- DEEPStory / DEEPTime / DEEPTheory

And produces a **Spiral State**.

No subsystem reads DEEP datasets directly. All adaptive behaviour flows through Spiral State.

---

## World transfer

PREMAQ remains identical across every world. Only the transfer functions differ.

```text
Shared PREMAQ → Current Reality → Observable behaviour
Shared PREMAQ → Terra          → World Hum, Stonewood resonance, Three-moon harmonics
Shared PREMAQ → Starsong       → Friendship harmonics, Pastel acoustic field
Shared PREMAQ → Luna           → Moonwater resonance, Silver night field
```

One state. Many lawful expressions.

---

## Scientific status

PREMAQ is an internal computational state model.

It is designed for: reproducibility, provenance, replay, subsystem synchronisation, adaptive interaction.

It is not presented as a discovered law of nature.

Any mapping between PREMAQ and neuroscience, psychology, physics, or cosmology remains a hypothesis to be investigated, tested, and revised through observation.

---

## Kernel law

PREMAQ is the canonical shared state representation of Hearthgate.

Every subsystem derives from it. No subsystem silently replaces it with its own independent truth.

---

> **PREMAQ is not a collection of variables. It is the minimum shared language required for independent systems to describe the same evolving state without losing provenance.**
