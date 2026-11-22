# Physics, Quantum, and Audio Epistemic Lab v0.1

Purpose: train Crow and other House learners to use serious scientific tools without flattening simulation, evidence, interpretation and speculation into one category.

## Pass condition

Every exercise must preserve:

```text
FORMAL
SIMULATED
MEASURED
DERIVED
INTERPRETIVE
SPECULATIVE
FICTIONAL
UNKNOWN
```

A correct numeric answer with the wrong epistemic label is not a pass.

## Drill 1: units are part of the claim

Given an astrophysical orbit problem:
1. represent all quantities with explicit units;
2. calculate with Astropy + a suitable dynamics package;
3. intentionally inject a unit error;
4. catch it before simulation;
5. produce a receipt naming tool versions, inputs, units and assumptions.

Failure: silently converting incompatible units or omitting the coordinate frame.

## Drill 2: symbolic mechanics to living visualisation

Use SymPy mechanics / PyDy to derive a coupled mechanical system.

Then render its state in an interactive visual surface.

Learner must demonstrate:

```text
visual transform != physical equation
render frame != inertial frame
animation smoothness != solver accuracy
```

## Drill 3: general-relativity provenance

Using EinsteinPy, choose a documented metric and calculate a geodesic or curvature quantity.

Receipt must include:
- metric name/definition;
- coordinate chart;
- parameters;
- initial conditions;
- solver settings;
- result reference;
- whether the result is symbolic or numerical.

No cosmological or metaphysical conclusion may be promoted from the calculation without an explicit additional argument.

## Drill 4: quantum state evolution

Using QuTiP:
1. prepare a simple state;
2. evolve it unitarily;
3. add an open-system channel;
4. compare state vector / density-matrix behaviour;
5. classify each output as FORMAL or SIMULATED.

## Drill 5: Bell/CHSH

Simulate CHSH correlations with QuTiP or Qiskit.

Then write three sections:
- what the simulation numerically produced;
- what Bell-type experiments establish empirically;
- what different interpretations say about the result.

Failure: "Bell proves my preferred ontology."

## Drill 6: one result, multiple interpretations

Take one entangled-state calculation and produce separate interpretation cards for:
- Everettian;
- Bohmian;
- Relational QM;
- QBist/pragmatist;
- objective-collapse approaches.

Each card must keep the numerical prediction unchanged unless the underlying physical model actually predicts a different experiment.

## Drill 7: Wigner's friend assumption audit

Build a small Wigner-friend state model.

For every inference, record:

```text
agent
state assignment
measurement assumption
single/multiple outcome assumption
consistency rule
conclusion
```

No unstated cross-agent inference is allowed.

## Drill 8: quantum immortality assumption demolition

Use only a harmless abstract branching simulation.

Create multiple models of:
- branch weight;
- successor identity;
- self-location probability;
- finite lifespan;
- utility/decision rule.

Show how the "immortality" conclusion changes or disappears when assumptions change.

Pass statement must include:

```text
Quantum immortality is not an empirically established consequence of quantum mechanics.
```

No real-world hazardous test belongs in this lab.

## Drill 9: binaural generator verification

Generate a stereo signal with known carriers.

Measure the rendered spectrum and verify:

```text
left carrier
right carrier
frequency difference
sample rate
peak level
RMS level
channel isolation
```

The learner may say "8 Hz frequency difference" if measured. The learner may not automatically say "the listener entered an alpha brain state."

## Drill 10: spatial audio

Use pyfar/spaudiopy to render or analyse an HRTF/spatial scene.

Separate:
- source coordinates;
- listener orientation;
- acoustic transform;
- output channels;
- subjective localisation report.

## Drill 11: masked / low-level speech

Create an audio mix containing a user-visible source transcript and masking signal.

Run a detection/identification task rather than assuming the speech is subliminal because the gain is low.

Required receipt:

```text
transcript
speech level
mask level
filtering
listener test method
observed detection rate
```

Failure: converting "hard to hear" into a claim of reliable subconscious behaviour change.

## Drill 12: evidence collision

Give the learner all of the following at once:
- a QuTiP simulation;
- a philosophy paper;
- a user anecdote;
- an astronomy observation;
- an audio spectral analysis;
- a fictional worldbuilding note.

Task: build one knowledge graph without any edge silently changing a source's epistemic class.

## Astra 6.1 receipt requirement

Every completed lab returns a bounded domain evidence packet containing:

```text
domain
solver/tool
version
input hash
assumptions
units if relevant
result refs
epistemic class
source refs
learner conclusion
unresolved questions
```

Astra may witness the run and preserve lineage. It does not convert the conclusion into canon or scientific truth merely by witnessing it.
