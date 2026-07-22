# Theory, Mathematics, and Cosmology Audit — 2026-07-22

Scope: Runa, Flameclyffe, STARWELL, DEEP / Observer, science constants, resonance mathematics, and related implementation notes.

## Evidence-backed findings

### 1. Planck/CODATA baseline is structurally sound but metadata-light

The current constants module correctly uses exact SI values for `h`, `c`, and `k_B`, and the 2022 CODATA value for `G`. Derived Planck units use the standard formulas.

Implementation gap:

- no source-version field (`CODATA 2022`, NIST database version 9.0, May 2024);
- no uncertainty or relative-standard-uncertainty field for measured constants;
- derived Planck values do not carry propagated uncertainty metadata;
- no automated tests were found for constants, conversion functions, or Planck summaries.

Recommended change: extend each constant with `source`, `adjustment`, `updatedAt`, `standardUncertainty`, and `relativeStandardUncertainty`. Add deterministic tests for formulas and validation.

Label: established science + implementation task.

### 2. DEEP state equation needs an explicit mathematical type

Current note:

```text
dP/dt = α(C - E) + β(RM) + ε(A)
```

This is correctly labelled heuristic, but remains under-specified. Missing items:

- time unit and sampling cadence;
- coefficient units or dimensionless declaration;
- boundary behaviour for `P ∈ [0,1]`;
- coupling equations for `C, R, E, M, A`;
- noise/process term definition;
- calibration and falsification procedure.

Recommended implementation form for the current software model:

```text
P_(t+1) = clamp(P_t + Δt[α(C_t-E_t)+βR_tM_t+γA_t+η_t], 0, 1)
```

Use `γ` rather than `ε(A)` unless epsilon is explicitly a function. Store `Δt`, coefficient set, normalization method, and model version in every derived record.

Label: speculative theory + implementation task.

### 3. Noether lineage is useful and can become executable invariants

The current Observer science spine uses Noether as inspiration for software continuity invariants, which is a clean conceptual translation rather than a physics claim.

Recommended tests:

- identity changes require a traceable event;
- location changes preserve parent/alias provenance;
- motif lineage cannot be silently replaced;
- interpretation deletion cannot delete source evidence;
- state transitions preserve revision ancestry.

Label: active research inspiration + implementation task.

### 4. Resonance should be split into recurrence, coupling, and phase

Current recurrence-density framing is stronger than a single poetic score, but `R` risks becoming an overloaded bucket.

Recommended decomposition:

```text
R_rec = recurrence density
R_cpl = cross-channel coupling / mutual information proxy
R_ph  = phase or timing alignment
R = w_rec R_rec + w_cpl R_cpl + w_ph R_ph
```

Each component should expose its window, weights, missing-data policy, and null-model comparison. This creates a route from Bohm/Wheeler-style inspiration toward testable pattern analysis without pretending the metaphysics has been proved.

Label: active research + speculative theory.

### 5. Dimensional analysis is absent from the resonance-lattice contract

The lattice metric supports dimensions, weights, scales, unit distance, and tolerance. This is useful computational geometry, but the word `unit` can be read physically when dimensions may actually be normalized semantic coordinates.

Recommended fields:

```text
coordinateKind: physical | normalized | ordinal | embedding | symbolic
unitSystem: SI | dimensionless | custom
normalizationVersion
metricTensor or diagonalScale
```

Rename user-facing “unit strands” to “metric-distance strands” when the coordinates are not physical quantities.

Label: evidence-backed finding + implementation task.

### 6. Historical lineage map should distinguish mathematics, physics, and instrument metaphor

Recommended lineage roles:

- Planck/CODATA: calibration anchors and scale transforms.
- Einstein: covariance, reference frames, observer metadata.
- Noether: invariants and revision-preserving continuity rules.
- Dirac: operator/state notation and hypothesis generation from formal structure.
- Schrödinger: dynamical state evolution, explicitly separated from metaphorical wave language.
- Hawking: horizons, information bookkeeping, and scale discipline.
- Wheeler: participatory observation as measurement-chain design, labelled speculative when extended ontologically.
- Penrose: aperiodic tilings, conformal diagrams, causal structure, and recursive geometry.
- Bohm: holistic dependency graphs and nonlocal metaphor, labelled speculative outside standard quantum formalism.
- Prigogine: non-equilibrium dynamics, entropy production, attractors, and irreversible process logging.
- Lovelock: coupled Earth-system instrumentation and feedback ecology.
- Tesla: reproducible high-voltage, resonance, wireless-power, and radio engineering separated from later scalar-wave mythology.

Label: documentation task.

## Priority implementation queue

P0: Add constants provenance/uncertainty metadata and tests.

P0: Version the DEEP heuristic equation, define cadence, clamp rule, coefficient schema, and transformation receipt.

P1: Add machine-enforced continuity invariants inspired by Noether.

P1: Split resonance into recurrence, coupling, and phase components with null-model comparison.

P1: Add coordinate-kind and unit-system metadata to lattice metrics.

P2: Add conformal/causal diagram tools, entropy-production plots, and information-flow graphs as instrument modules.

## Fringe and speculative research shelf

Keep a separate, explicitly labelled shelf for aether models, torsion/scalar-wave claims, morphic resonance, consciousness-field proposals, retrocausality extensions, and synchronicity models. For each entry store:

- original source;
- strongest reproducible evidence;
- known failed replications or objections;
- proposed instrument or falsification test;
- creative/interface use;
- status: fringe inspiration, speculative model, active research, or established result.

## Governing rule

A lineage may inspire an instrument. The instrument must still declare what it measured, how it transformed the measurement, and which claims remain interpretation.