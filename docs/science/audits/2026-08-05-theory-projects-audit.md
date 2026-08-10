# Theory Projects Audit · 2026-08-05

Scope: Runa, Flameclyffe, STARWELL, DEEP / Observer mathematics, related science and schema notes.

This audit is documentation-only. It does not alter major theory, runtime code, database schema, or published claims.

## Evidence-backed findings

### 1. PREMAQ canonical axes (resolved)

At audit time (2026-08-05), the Observer science spine and DEEP Math Spine used different axis names for the same components. That divergence is now resolved. Canonical PREMAQ/v2 axes:

- P = Presence
- C = Coherence
- R = Resonance
- E = Entanglement
- M = Memory
- A = Agency
- Q = Qualia

All documents, renderers, and data schemas should use these names. Prior divergent names (Perspective, Entropy, Momentum, Attention, Alignment, Recurrence) are historical only.

Canonical registry shape:

```json
{
  "schema": "premaq/v2",
  "components": {
    "P": { "name": "presence",      "range": [0,1], "unit": "1" },
    "C": { "name": "coherence",     "range": [0,1], "unit": "1" },
    "R": { "name": "resonance",     "range": [0,1], "unit": "1" },
    "E": { "name": "entanglement",  "range": [0,1], "unit": "1" },
    "M": { "name": "memory",        "range": [0,1], "unit": "1" },
    "A": { "name": "agency",        "range": [0,1], "unit": "1" },
    "Q": { "name": "qualia",        "range": [0,1], "unit": "1" }
  }
}
```

**Remaining task:** enforce canonical axis names at the schema validation layer; add a state-vector migration test before any component rename. All derived views should declare they are derived from premaq/v2.

### 2. The Horizon signal is a visual synthesis index, not a physical observable

The current formula is well-labelled as a visual synthesis layer and its coefficients sum to 1.0. That is good practice.

```text
H = 0.28C + 0.20(1-E) + 0.16R + 0.14A + 0.09Bz− + 0.06Kp + 0.04Q + 0.03pulse
```

Risks:

- `Q = charge + temporary touch charge` is not visibly clamped before entering the weighted sum.
- `pulse` has no documented range or phase definition.
- no uncertainty or stale-data penalty is present.
- missing values may be silently replaced by UI fallbacks.

**Implementation task:** clamp every dimensionless input to `[0,1]`, document `pulse(t)`, and attach a quality mask. Prefer returning both `H_raw` and `H_quality`.

### 3. Provenance architecture is conceptually sound but not yet mechanically enforced

The five-layer separation of instruments, measurements, derived indices, symbolic conditions, and narrative interpretation is strong. The schema crosswalk also correctly recommends using `deep_observer_events` as the canonical root rather than multiplying tables.

**Implementation task:** enforce provenance with machine-readable fields and validation:

```text
schema_version
observed_at_utc
source_id
instrument_id
quantity_kind
raw_value
raw_unit
normalized_value
normalization_version
uncertainty
quality_flag
transformation_chain
claim_class
```

Suggested `claim_class` enum:

```text
established_science
active_research
speculative_theory
fringe_inspiration
implementation_task
evidence_backed_finding
symbolic_interpretation
```

## Established science baseline

Use the current SI defining constants as the immutable unit layer:

```text
ΔνCs = 9 192 631 770 Hz exact
c    = 299 792 458 m s−1 exact
h    = 6.626 070 15 × 10−34 J s exact
e    = 1.602 176 634 × 10−19 C exact
kB   = 1.380 649 × 10−23 J K−1 exact
NA   = 6.022 140 76 × 10^23 mol−1 exact
Kcd  = 683 lm W−1 exact
```

The latest available recommended adjustment is CODATA 2022. Keep a registry distinction between:

- SI defining constants, exact by definition;
- CODATA adjusted constants, with uncertainty and covariance;
- project calibration constants;
- symbolic frequencies or correspondences.

Never store these in one undifferentiated `constants` list.

## Useful scientific lineages

### Established science

- **Planck / CODATA:** constants, dimensional analysis, uncertainty, calibration provenance.
- **Einstein:** observables are frame-dependent; derived displays should declare reference frame, coordinate system, and clock.
- **Noether:** best used as software invariants. Symmetry of data transformations should imply conserved provenance, identity, or replay integrity, not physical conservation claims.
- **Dirac / Schrödinger:** wave language must specify state space, operator, boundary conditions, and units before being called a physical wave equation.
- **Hawking / Penrose:** causal structure, horizons, singularity language, and conformal diagrams are useful metaphors only when not confused with spacetime models.

### Active research

- **Prigogine / stochastic thermodynamics:** promising for modelling Observer as an open, driven information system. Useful quantities include entropy production proxies, transition rates, and non-equilibrium steady-state diagnostics.
- **Information geometry:** useful for comparing state vectors without pretending Euclidean distance is automatically meaningful. Candidate metric: Fisher-Rao for probabilistic state estimates; simpler validated alternatives may be preferable for UI.
- **Open quantum systems:** useful only if the project later models genuine quantum states or simulations. Do not import density-matrix language merely for atmosphere.
- **Lovelock / Earth-system science:** useful for coupled environmental feeds, but each feed needs independent provenance and no hidden causal claims.

### Speculative theory

- **Wheeler:** use participatory-observer language as a model of observer-system feedback, not as proof that attention creates external physical reality.
- **Bohm:** implicate-order language may organise narrative or latent-state models, but requires formal variables and testable mappings before scientific elevation.
- **Penrose-inspired recursive geometry:** strong visual and computational lineage for aperiodic tilings, non-repeating symbolic fields, and scale-bridging interfaces.

### Fringe inspiration

- **Tesla-associated resonance lore, scalar-wave claims, morphic resonance, numerological frequency systems:** may inspire interface, music, or fiction. Keep them segregated from engineering claims unless a reproducible circuit, protocol, measurable quantity, and independent replication exist.

## Instrumentation opportunities

1. Add a `constants-registry.json` with source, edition, value, unit, uncertainty, exactness, and retrieval date.
2. Add a quantity/unit validator before any Observer normalization step.
3. Store raw NOAA/NASA/SWPC payload hashes alongside parsed values.
4. Add stale-data and missing-data states rather than substituting `0`.
5. Add deterministic replay fixtures: one packet should render the same geometry, audio parameters, and receipt across platforms.
6. Add sensitivity tests for `H`: perturb each input by ±1% and record the output change.
7. Add a state-vector migration test before renaming any PREMAQ component.
8. Add a provenance-preservation invariant inspired by Noether: transformations may add interpretations but may not erase source identity or raw measurement lineage.

## Build and integration risks

- PREMAQ semantic drift can corrupt cross-setting propagation without throwing errors.
- dimensionless values, physical quantities, UI charge, and symbolic values are currently close enough in naming to be accidentally mixed.
- visual formulae can be copied into science documents and misread as empirical laws.
- duplicate Observer schemas remain a risk despite the crosswalk warning.
- every setting-specific transfer function needs a declared input schema and version.

## Recommended next slice

1. Canonicalise `premaq/v1` meanings.
2. Create the constants registry and unit validator.
3. Add `quality_flag`, `uncertainty`, and `normalization_version` to the Observer data contract or receipt layer.
4. Add tests for clamping, missing data, deterministic replay, and semantic-version rejection.
5. Only then extend the maths spine with non-equilibrium or information-geometric models.

The present foundation is strongest where it separates observation from interpretation. The next improvement is not more cosmology. It is sharper semantics, units, provenance, and replay. That gives the mythic crown a properly engineered skull to sit upon.
