# Quantum Domain and Mythiences Interpretation

The Hearthgate relational lattice, PREMAQC state, and the quantum state of a physical system are distinct mathematical objects. They can be compared philosophically without asserting their equivalence.

## Physics model minimum

For any actual two-level quantum simulation declare:

- Complex two-dimensional Hilbert space, basis and units.
- Hermitian Hamiltonian `H`, time units, and ħ (or documented natural units ħ=1).
- State vector `|ψ⟩` or density matrix `ρ` with `ρ†=ρ`, nonnegative eigenvalues and `Tr ρ=1`.
- For closed systems `dρ/dt=−(i/ħ)[H,ρ]`; for open systems explicit Lindblad jump operators and calibrated rates.
- Measurement instruments `{M_k}` with `Σ M_k†M_k=I`, probability `Tr(M_kρM_k†)` and update `M_kρM_k†/p_k` when `p_k>0`.
- Solver tolerance, approximations, reproducible initial condition and model source.

An avoided crossing `H(λ)=[[λ,g],[g,−λ]]` has eigenvalues `±√(λ²+g²)` and minimum gap `2|g|`. It is **not** the same thing as a saddle-node fold of equilibria `F(x,μ)=μ−x²`. Likewise a binaural difference tone is **not** physical quantum interference or quantum entanglement.

## What may be interpreted

- **ENGINE-TRUE:** an authorised, registered Hearthgate engine law. The included stand-alone reference is not registered and reports symbolic/model computation instead.
- **OBSERVATION-TRUE:** an instrument reading or observed audio waveform with conditions.
- **CANON-TRUE:** world-authored laws of Flameclyffe/Universal Horizon within their canon.
- **SYMBOLIC:** philosophical or allegorical correspondences, e.g. a relational field described as a resonant braid.
- **UNKNOWN:** absent measurement, source, physical interpretation, or model parameter.

Quantum interpretations (operational/Copenhagen, Everett, Bohmian, relational, QBism, objective collapse) should be compared without selecting one by default. Present predictions shared across models and disagreements about ontology or dynamics separately. “Consciousness causes collapse” is not a default assumption.

## Questions the skill can explore

1. What does an *imaginary* axis do mathematically, and what can or cannot be inferred ontologically from its effectiveness in physics?
2. Can a symbolic relational graph be mapped to a Hilbert space in a clearly defined **toy model**? Which mappings fail?
3. Can phase-sensitive audio and quantum complex amplitudes be explored side by side, with different propagation and observation laws?
4. How should the project keep a hypothesis alive as an unresolved Wonder question rather than silently turn it into an engine claim?

## Tests before claiming quantum integration

- Density-matrix trace, Hermiticity and positivity; energy/time dimensional consistency.
- Probability normalisation of a complete measurement instrument.
- Analytical avoided-crossing fixture and uncertainty/tolerance receipts.
- Deliberate invalid matrix rejected, model/source absent treated UNKNOWN.
- No audio-only input changes `quantum.model_state` or labels PREMAQC E entanglement.

## Included numerical fixture

`src/quantum-model.mjs` implements an independent, dimensionless **one-qubit Hamiltonian** `H=λσ_z+gσ_x`, a valid qubit density operator parametrised by a Bloch vector, projective computational-basis measurement probabilities, and exact closed-system unitary evolution as a Bloch rotation. Its matching deterministic unit tests verify spectral gaps, density-matrix properties, probability normalisation, and unitary norm conservation. No quantum hardware, experimental calibration or consciousness inference is involved. This is a mathematical reference fixture only.
