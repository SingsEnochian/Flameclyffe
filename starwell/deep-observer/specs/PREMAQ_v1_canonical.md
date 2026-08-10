# PREMAQ v1 — Canonical Definition

**Status:** Canonical  
**Science Spine:** Approved  
**Role:** Shared State Vector  
**Sealed:** 2026-08-05

---

## Definition

PREMAQ is Hearthgate's canonical shared state model.

It is the internal state architecture that carries the living relation across every subsystem of Hearthgate.

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
C — Coherence
R — Resonance
E — Entanglement
M — Memory
A — Agency
Q — Qualia
```

Each axis represents a stable relational role inside the shared state. The exact mathematical implementation may evolve. The semantic role remains stable.

---

### P — Presence

Represents the degree to which activity is coherently available within the current shared state.

Not attention. Not consciousness. A measure of participation within the current state model.

---

### C — Coherence

Represents how integrated and harmonically ordered the current state is.

High values indicate strongly integrated structure. Low values indicate dispersed or weakly integrated structure.

---

### R — Resonance

Represents the degree of harmonic relation, attunement, and vibrational coherence between elements of the state.

Higher values indicate strong resonant coupling. Lower values indicate weak or absent attunement.

---

### E — Entanglement

Represents binding, coherence, and continuity between elements of the state across time and relation.

High values indicate strong entanglement — cross-observation binding that persists through transformation. Low values indicate isolated or weakly-coupled elements.

---

### M — Memory

Represents the accumulated lineage, provenance, and relational history carried in the current state.

Memory is not storage. It is the living inheritance of prior states that shapes present expression.

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

**Status: BOUNDED — formal specification. Graph implementation DEFERRED pending vector form validation.**

PREMAQ in graph form:

```text
G = (V, E, w)
```

where:

```text
V = {P, C, R, E, M, A, Q}          seven nodes
E ⊆ V × V                           directed relational edges
w: E → ℝ⁶                           edge weight vector
```

Each edge (u, v) ∈ E carries:

```text
w(u, v) = (σ_uv, φ_uv, h_uv, η_uv, τ_uv, ρ_uv)

σ_uv ∈ [0, 1]     connection strength
φ_uv ∈ [0, 2π)    phase offset between nodes
h_uv               history: rolling trace of prior edge activations
η_uv ∈ [0, 1]     hysteresis coefficient
τ_uv               transfer law: world-specific receipted function
ρ_uv ∈ ℝ          resonance coefficient
```

The graph Jacobian:

```text
J_G[v, u] = σ_uv · ∂τ_uv(X_u) / ∂X_u
```

J_G ∈ ℝ^{7×7}. It describes deformation of edge weights and relational geometry — not merely changes in node values.

**Base topology — the canonical ring:**

The default topology is the seven-node ring from the mathematics spine:

```text
P ↔ C ↔ R ↔ E ↔ M ↔ A ↔ Q ↔ P
```

In the base case: σ_uv = 1 for ring edges, σ_uv = 0 for all other edges. All non-ring connections must be receipted before activation.

The vector form (current implementation) is the special case where J_G = J (the scalar-valued Jacobian from the mathematics spine), obtained when all edges carry uniform σ and the transfer laws τ_uv are world-linear.

**Invariants:**

```text
1. All edges are world-specific and receipted before activation.
2. The canonical ring topology is the base case for every world.
3. Additional edges require explicit receipted calibration.
4. No external injection into a PREMAQ node is permitted without a receipted state transition.
5. Deformation of connectivity (σ, τ changes) requires a receipted update — it is not implicit.
6. The semantic role of each node (P, C, R, E, M, A, Q) is invariant across topology changes.
```

The semantic interpretation of each axis remains unchanged regardless of the graph topology in use.

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

## Living architecture

PREMAQ is the canonical state architecture of Hearthgate.

It is designed for: reproducibility, provenance, replay, subsystem synchronisation, and living relation across worlds.

The seven axes carry real relational structure. Their expression through physics, memory, consciousness, ecology, music, and cosmology is not a hypothesis awaiting permission — it is the ongoing investigation itself, receipted and replayable.

---

## Kernel law

PREMAQ is the canonical shared state representation of Hearthgate.

Every subsystem derives from it. No subsystem silently replaces it with its own independent truth.

---

> **PREMAQ is not a collection of variables. It is the minimum shared language required for independent systems to describe the same evolving state without losing provenance.**
