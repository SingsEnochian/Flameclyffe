# Cognitive Field Engine v0.1

Status: sandbox prototype
Stacked on: Constellation runtime v0.1 / PR #393
Scope: ArcSweep cognition only

## Proposition

The Cognitive Field Engine is a persistent, non-linguistic state layer between symbolic cognition and Laya.

It is not chain-of-thought, a hidden prose scratchpad, a language model, or an authority source. It is a deterministic sparse concept lattice whose state changes through bounded injection, propagation, inhibition, decay, novelty, persistence and attractor ranking.

```text
identity + continuity
        |
        v
symbolic cognition
        |
        v
COGNITIVE FIELD ENGINE
 sparse lattice / persistent state
        |
        v
Laya typed judgement
        |
        v
ArcSweep capability gate
        |
        v
replaceable model substrate
        |
        v
runtime + field receipts
```

## v0.1 state primitives

Each concept node carries six explicit dynamics:

- activation: current field energy for the concept;
- salience: combined significance at the current tick;
- affinity: represented on relations between concept nodes;
- tension: inhibitory or competing influence reaching a concept;
- novelty: recency pressure for newly introduced concepts;
- persistence: retained activation across ticks.

Each concept receives a deterministic coordinate vector derived from its canonical concept id. Coordinates are currently generic state-space coordinates. v0.1 does **not** claim to implement E8, cRBW, RSE, or any other theoretical-physics formalism. Those remain future pluggable coordinate/evolution kernels once their exact mathematical contracts are available.

## Deterministic tick

A tick is synchronous and order-independent with respect to canonical signal ordering.

1. Compile symbolic state, continuity context and recent events into bounded concept signals.
2. Create previously unseen concept nodes with deterministic coordinates.
3. Learn or reinforce sparse co-occurrence edges.
4. Snapshot activation before propagation.
5. Propagate positive relation energy and inhibitory relation energy from the snapshot only.
6. Apply decay, event injection, propagation and inhibition.
7. Update novelty, persistence, tension, stability and salience.
8. Rank attractor candidates deterministically.
9. Bound the field to the configured maximum node count.
10. Append a compact trajectory entry and emit a replay receipt.

No random source is used by the field engine.

## Input seam

The engine accepts:

- compiled symbolic state;
- a continuity/context slice;
- recent events;
- an optional prior field state;
- deterministic configuration.

The default ArcSweep integration uses the identity runtime's continuity namespace as the field id. A cognition-engine instance therefore maintains an independent persistent field for each continuity namespace.

`FEATHER` halts before context retrieval and before a field tick, preserving the existing full-pause semantic.

## Output seam

The field summary supplied to Laya contains:

- field id and tick;
- dominant patterns;
- secondary patterns;
- current tensions;
- novel associations;
- aggregate salience;
- aggregate stability;
- compact trajectory;
- `grantsAuthority: false`.

The Laya MCP transport maps this to `state.cognitive_field` beside symbolic state. Laya remains a judgement layer. The field cannot grant capability, consent, canon, external-write permission, or production authority.

The same field summary is available to the selected generative model as deliberative context.

## Replay receipts

Every field tick emits `hearthweave.cognitive-field-receipt/v0.1` containing:

- field id;
- tick before and after;
- prior and resulting state fingerprints;
- a canonical signal fingerprint;
- canonical replay signals;
- deterministic field configuration;
- dominant pattern summary;
- `grantsAuthority: false`.

Receipts store canonical concept signals rather than the original prose used to derive them. This is enough to replay the field transition without placing raw event or continuity text inside the field receipt.

`replayCognitiveField()` begins from an explicit initial state and replays receipts in order. It verifies the state fingerprint before every tick and the resulting fingerprint after every tick. Divergence throws immediately.

The fingerprint is an FNV-1a deterministic replay identifier, not a cryptographic integrity proof. If receipts later cross a trust boundary, they should additionally receive the repository's normal cryptographic/provenance envelope.

## Laya seam

The cognitive frame now has two structured pre-linguistic inputs:

```text
symbolicState    cognitiveField
      \             /
       \           /
        v         v
          Laya
```

Symbolic state describes explicit cognitive operators and their declared semantics. The field describes evolving activation and relation structure produced by prior state plus current signals.

This separation lets AI University evaluate whether routing changes are attributable to:

- symbolic operators;
- field dynamics;
- Laya checkpoint/calibration;
- model substrate.

## Current field dynamics

Default v0.1 configuration:

```text
dimensions          8
decay               0.82
noveltyDecay        0.72
persistenceCarry    0.84
propagationRate     0.28
inhibitionRate      0.22
edgeLearningRate    0.18
edgeDecay           0.985
maxConceptsPerSignal 8
maxNodes            72
maxTrajectory       12
```

These are experimental constants, not fitted cognitive truths. They exist to make the first implementation deterministic, measurable and replayable. AI University experiments should vary them under controlled conditions rather than treating them as canonical psychology.

## Boundaries

The field engine:

- does not expose hidden language-model chain-of-thought;
- does not create authority;
- does not promote sandbox findings into production;
- does not define identity;
- does not overwrite continuity records;
- does not claim a physics implementation that is not present in code.

Identity remains above the substrate. Capability remains outside cognition. Receipts remain the evidence plane.

## Next experimental seam

Once v0.1 is stable, the next controlled experiments are:

1. same identity + same Laya + same model, varied field constants;
2. same identity + same field + same Laya, varied model substrate;
3. same identity + same field + same model, varied/calibrated Laya checkpoint;
4. field disabled vs enabled on a held-out ArcSweep cognitive corpus;
5. native numeric kernel replacement only after profiling proves a hot path.

A future native kernel may be Rust, Zig, C, SIMD or hand-tuned assembly while preserving the JavaScript contract and replay receipts. The architecture does not require the identity, continuity or Laya layers to change when the numeric substrate changes.
