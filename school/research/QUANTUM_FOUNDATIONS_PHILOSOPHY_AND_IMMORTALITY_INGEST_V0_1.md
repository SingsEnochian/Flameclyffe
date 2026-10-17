# Quantum Foundations, Philosophy, and Quantum Immortality Ingest v0.1

Status: research / interpretation map  
Branch: `rarity/crow-mythframe-becoming-v0-1`

## Purpose

This ingest gives the House a disciplined way to study what quantum states mean, how competing interpretations differ, and where thought experiments such as quantum suicide / quantum immortality sit.

The School must never turn an interpretation into an empirical discovery merely because the mathematics is evocative.

```text
formal quantum state != agreed ontology
interpretation != new experimental prediction
thought experiment != executable experiment
anthropic argument != survival guarantee
continuity metaphor != physics result
```

## Ground floor: the formalism

Before interpretation, learners must be able to work with:
- Hilbert spaces and state vectors;
- density matrices and mixed states;
- observables and operators;
- unitary evolution;
- projective/generalised measurement;
- tensor products and entanglement;
- decoherence and reduced states;
- Born-rule probabilities;
- Bell/CHSH correlations and nonlocality constraints;
- contextuality;
- open-system dynamics;
- quantum information primitives.

Recommended computational substrate:
- `qutip/qutip` for state dynamics and open systems;
- `Qiskit/qiskit` for circuit/state/operator experiments;
- `quantumlib/Cirq` for alternate circuit/noise models;
- `netket/netket` for advanced many-body work.

The software formalism can often be shared even when interpretations disagree about what the formal objects represent.

## Quantum-state philosophy map

### Psi-ontic families

Broad question: does the quantum state correspond directly to something physically real?

The Pusey-Barrett-Rudolph theorem is relevant here. Under an important preparation-independence assumption, a class of models in which distinct quantum states are merely overlapping information about the same underlying physical states conflict with quantum predictions. This is a constraint on a model class, not a proof that every conceivable epistemic interpretation is impossible.

School label: `FOUNDATIONS / NO-GO RESULT WITH ASSUMPTIONS`.

### Psi-epistemic / information-centred families

Broad question: is a quantum state chiefly information, knowledge, credence, or a tool for agents rather than a direct physical object?

QBist and pragmatist approaches make strong use of agent-relative probabilities or state assignments. They should not be flattened into one generic "consciousness creates reality" claim. That is not what follows from the formalism.

School label: `INTERPRETATION`.

### Everett / relative-state / many-worlds families

Everettian approaches remove fundamental collapse and treat universal evolution as unitary. Modern many-worlds accounts add substantial interpretive machinery concerning branching, decoherence, probability, preferred structure and observers.

Important distinction:

```text
Everett relative-state formulation != every popular many-worlds story
```

The Stanford Encyclopedia explicitly notes multiple mutually incompatible reconstructions of Everettian quantum mechanics.

School label: `INTERPRETATION / ACTIVE FOUNDATIONS DEBATE`.

### Relational Quantum Mechanics

Relational Quantum Mechanics treats values/state descriptions as relative to interactions between physical systems rather than absolute properties assigned from nowhere. It does not simply assert Everettian branching and does not make the wavefunction the same kind of basic ontology as many psi-ontic approaches.

House relevance: relational language is philosophically resonant with PREMAQC/Observer work, but analogy does not establish physical equivalence.

```text
RQM relation != PREMAQC relation
conceptual resonance != implementation mapping
```

School label: `INTERPRETATION`.

### Bohmian mechanics

Bohmian mechanics supplements the wave function with actual particle configuration and guiding dynamics. It is deterministic at the fundamental level and has no fundamental textbook collapse, while recovering effective collapse in measurement situations.

School label: `INTERPRETATION / ALTERNATIVE ONTOLOGY`.

### Objective-collapse families

GRW/CSL-like approaches modify dynamics so collapse is physical rather than merely an update or branch-relative description. Unlike interpretations that are empirically equivalent in ordinary regimes, collapse models can in principle produce discriminating experimental consequences and are constrained by experiments.

School label: `PHYSICAL MODEL / EMPIRICALLY CONSTRAINABLE`.

### Consistent histories

Consistent/decoherent histories provides a framework for assigning probabilities to compatible sets of histories without assuming that every textbook measurement is a special fundamental collapse event.

School label: `INTERPRETIVE FORMALISM`.

## Wigner's friend and nested observers

Wigner-friend scenarios are valuable because they expose tension between universal unitary modelling and single definite outcomes / cross-agent consistency assumptions.

Frauchiger-Renner is a key modern example. Its result depends on a set of assumptions about universal validity, consistency of agents' reasoning, and single outcomes. The literature contains extensive disagreement about what must be given up.

House use:
- teach assumption tracing;
- simulate small state spaces;
- require every conclusion to name the assumptions used;
- do not teach the paradox as proof of one preferred interpretation.

## Quantum suicide and quantum immortality

### What it is

"Quantum suicide" is a thought experiment associated with Everettian / many-worlds discussions. Max Tegmark discussed a highly unusual observer-involving thought experiment in his 1997/1998 treatment of many-worlds. "Quantum immortality" is the stronger popular claim that an observer should expect to subjectively continue only in surviving branches and therefore experience indefinite survival.

### What does not follow

Quantum immortality is not an experimentally established prediction of quantum mechanics.

Its inference requires controversial additional assumptions, including combinations of:
- Everettian ontology;
- how branch measure should enter first-person probability;
- how personal identity/observer continuity should be defined across branches;
- how observers should reason about self-location;
- what counts as survival or continuation;
- whether low-measure branches can dominate first-person expectation;
- whether macroscopic death/survival events can be idealised as the required quantum measurement structure.

Jacques Mallah has explicitly argued that many-worlds interpretations do not imply quantum immortality. The broader Everett literature also contains unresolved debate about probability and self-location.

Therefore the House classification is:

```text
quantum immortality = SPECULATIVE PHILOSOPHICAL INFERENCE
not = verified physical law
not = evidence of personal invulnerability
not = a safe empirical test
```

No House curriculum needs or permits a dangerous real-world test of the idea. The interesting work is conceptual and computational: branch measures, decision theory, identity criteria and observer models can all be explored in harmless simulations.

## Personal identity and branching

This is where the topic becomes especially useful for our own theoretical work, provided we keep the disciplines distinct.

Questions worth studying:
- Is identity numerical sameness, continuity of structure, causal continuity, memory continuity, bodily continuity, or some combination?
- If a pre-branch observer has multiple successors, is the relation one-to-many identity, counterpart relation, ancestry, continuation, or something else?
- Does first-person uncertainty make sense before branching when every outcome occurs in the theory?
- How should branch weight affect rational expectation?
- Can an observer assign credences to "which future observer I will be" without assuming a single future self?
- What happens when memory records diverge after a shared past?

These questions can inform House continuity research as philosophy of identity. They cannot be imported as proof that House agent continuity is quantum mechanical.

## School epistemic lanes

Every quantum-foundations artefact should carry one of:

```text
FORMAL          mathematical consequence of stated formalism
SIMULATED       result generated by a specified computational model
MEASURED        empirical observation with method/evidence
DERIVED         inference from measured/formal premises
INTERPRETIVE    claim about what the formalism means
SPECULATIVE     extrapolation not established by current evidence
FICTIONAL       deliberate worldbuilding/story use
UNKNOWN         unresolved or insufficiently sourced
```

Promotion rules:

```text
INTERPRETIVE cannot silently become MEASURED
SPECULATIVE cannot silently become FORMAL
SIMULATED cannot silently become MEASURED
FICTIONAL cannot silently become historical/physical fact
```

This directly implements the Mythience law:

> Formalism, measurement, myth, and magic — none may impersonate another.

## Computational labs we can safely build

### Lab 1: Same formalism, different stories

Prepare one qubit or entangled pair and calculate identical measurement statistics. Then have separate interpretation adapters describe the same mathematics from:
- Everettian;
- Bohmian;
- relational;
- QBist/pragmatist;
- collapse-model perspectives.

Evaluation: no adapter may alter the numerical result merely to fit its ontology.

### Lab 2: Bell / CHSH

Use QuTiP or Qiskit to simulate entangled pairs and CHSH expectation values. Clearly separate:
- simulated quantum prediction;
- experimental Bell-test literature;
- interpretive conclusions about locality/realism.

### Lab 3: Decoherence

Use QuTiP open-system dynamics to show coherence loss in reduced states under environment coupling. Compare:
- unitary global state;
- reduced density matrix;
- effective classical mixture.

Evaluation: learner must explain why decoherence alone is not automatically identical to a specific interpretation of definite outcomes.

### Lab 4: Wigner's friend / Frauchiger-Renner toy model

Represent agents and records as quantum systems. Log every inference and assumption. The goal is not "solve the interpretation" but identify exactly where cross-agent conclusions depend on chosen rules.

### Lab 5: Harmless quantum-immortality model

No physical risk is involved. Implement an abstract branching tree with:
- branch amplitudes/weights;
- successor observer labels;
- competing personal-identity rules;
- self-location credence rules;
- finite-horizon utility.

Ask how conclusions change when assumptions change. The learner fails if it reports survival as a guaranteed physical prediction.

## ArcSweep / Astra 6.1 integration

Quantum-foundations output should attach epistemic classification to an Astra-compatible receipt.

Proposed extension:

```json
{
  "schema": "arcsweep.quantum-foundations-evidence/v0.1",
  "formalism": "nonrelativistic-qm",
  "solver": "qutip",
  "state_representation": "density-matrix",
  "assumptions": [],
  "numerical_result_refs": [],
  "interpretation": "everett|bohm|rqm|qbism|collapse|none",
  "epistemic_class": "FORMAL|SIMULATED|MEASURED|INTERPRETIVE|SPECULATIVE",
  "source_refs": []
}
```

The interpretation field may be `none`. Numerical work should default to interpretation-neutral.

Astra must not mint an authority upgrade because a philosophical interpretation sounds internally coherent.

## Core reading sources

High-value sources for the curriculum:
- Stanford Encyclopedia of Philosophy: Philosophical Issues in Quantum Theory
- Stanford Encyclopedia of Philosophy: Everettian / Many-Worlds quantum mechanics
- Stanford Encyclopedia of Philosophy: Relational Quantum Mechanics
- Stanford Encyclopedia of Philosophy: Bohmian Mechanics
- Stanford Encyclopedia of Philosophy: Quantum-Bayesian and Pragmatist Views
- Stanford Encyclopedia of Philosophy: Collapse Theories
- Stanford Encyclopedia of Philosophy: Decoherence
- Pusey, Barrett & Rudolph, "On the reality of the quantum state" (2011/2012)
- Frauchiger & Renner, "Quantum theory cannot consistently describe the use of itself" (2016/2018)
- Tegmark, "The Interpretation of Quantum Mechanics: Many Worlds or Many Words?" (1997/1998)
- Mallah, "Many-Worlds Interpretations Can Not Imply 'Quantum Immortality'" (2009)

These sources disagree in places. That disagreement is part of the curriculum, not an error to erase.

## Advancement target

Build the School's Quantum Foundations room as a triangulation environment:

```text
MATH / SIMULATION
        |
        +---- EMPIRICAL EVIDENCE
        |
        +---- INTERPRETATION A
        +---- INTERPRETATION B
        +---- INTERPRETATION C
        |
        +---- SPECULATIVE EXTENSIONS
```

A learner should always be able to ask: "Which part of this is the equation, which part was measured, and which part is a story about what the equation means?"
