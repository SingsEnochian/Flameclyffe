# Theory, Mathematics, and Cosmology Audit — 2026-07-22

Scope: Runa, Flameclyffe, STARWELL, DEEP / Observer, science constants, resonance mathematics, and related implementation notes.

## Findings

1. Planck/CODATA baseline is structurally sound but metadata-light. Add source version, uncertainty metadata, and tests.
2. The DEEP state equation is correctly labelled heuristic but lacks cadence, coefficient semantics, boundary behaviour, and model versioning.
3. Noether-inspired continuity rules should become executable invariants.
4. Resonance should be decomposed into recurrence, coupling, and phase components with visible weights and null-model comparisons.
5. Resonance-lattice metrics need coordinate-kind and unit-system metadata so semantic coordinates are not mistaken for physical dimensions.
6. Historical lineages should distinguish mathematics, established physics, active research, speculative theory, and fringe inspiration.

## Recommended DEEP update form

```text
P_(t+1) = clamp(P_t + Δt[α(C_t-E_t)+βR_tM_t+γA_t+η_t], 0, 1)
```

Store `Δt`, coefficient set, normalization method, and model version in every derived record.

## Priority queue

- P0: constants provenance and uncertainty metadata plus deterministic tests;
- P0: versioned DEEP heuristic equation and transformation receipt;
- P1: machine-enforced continuity invariants;
- P1: resonance decomposition into recurrence, coupling, and phase;
- P1: coordinate-kind and unit-system metadata for lattice metrics;
- P2: conformal/causal diagrams, entropy-production plots, and information-flow graphs.

## Fringe and speculative shelf

Store original source, strongest reproducible evidence, known objections or failed replications, proposed falsification test, creative use, and a status label for each entry.

## CERN matter and quark–gluon plasma record — 2026-07-22

**Record type:** OBSERVATION / ESTABLISHED SCIENCE / ACTIVE RESEARCH  
**Reason for inclusion:** candidate lineage for STARWELL cosmology, extreme-matter instrumentation, phase-transition modelling, and early-Universe comparison.

### What CERN was colliding before Long Shutdown 3

The final 2026 LHC physics season began with approximately nine weeks of proton–proton running, followed by approximately three weeks of lead-ion running. The LHC then moved into high-intensity proton-beam studies and a controlled magnet-quench campaign before handover for the four-year High-Luminosity LHC upgrade.

The relevant beam species and matter systems are:

- **protons** in proton–proton collisions;
- **fully stripped lead nuclei**, conventionally represented as `Pb82+`, in lead–lead collisions;
- **oxygen nuclei** in proton–oxygen and oxygen–oxygen collisions during the 2025 special ion campaign;
- **neon nuclei** in neon–neon collisions during the same campaign;
- **antiprotons, antihydrogen, antiprotonic atoms, and related antimatter systems** at CERN's separate Antimatter Factory programme.

### Matter states and phenomena under study

**Established science:** High-energy heavy-ion collisions create short-lived, extremely hot and dense QCD matter. The principal state of interest is the **quark–gluon plasma (QGP)**, in which quarks and gluons are temporarily deconfined from individual hadrons.

**Cosmological framing:** QGP is used as a laboratory analogue for the hot strongly interacting matter expected during the Universe's earliest microseconds. This is an analogy of physical state and governing interactions, not a recreation of the whole early Universe.

**Active research:** The oxygen and neon campaigns test how collective and QGP-like behaviour emerges as collision systems become smaller and structurally different. CERN reported that early ALICE results showed significant evidence of QGP formation in these lighter systems, while the neon data also probed the nucleus's unusual elongated or “bowling-pin” geometry.

**Established experimental sequence:** After physics production ended on 14 June 2026, the LHC ran high-intensity tests under conditions approaching those planned for the High-Luminosity LHC, followed by a quench campaign. The machine was handed over for upgrade work on 29 June 2026.

### Antimatter programme kept distinct from LHC collision matter

CERN's Antimatter Factory is a separate experimental lineage from the LHC heavy-ion programme. Its AD/ELENA complex supplies slow antiprotons to experiments including AEgIS, ALPHA, ASACUSA, BASE, GBAR, and PUMA. These programmes study antihydrogen, antiprotonic atoms, matter–antimatter symmetry, gravity, precision spectroscopy, and antiproton interactions with nuclei.

Do not collapse these into one category:

```text
LHC proton and ion programme
= high-energy collisions, Higgs/Standard Model measurements, QCD, heavy-ion matter, QGP

Antimatter Factory programme
= slowed and trapped antiprotons/anti-atoms, precision symmetry tests, gravity, spectroscopy, nuclear probes
```

### STARWELL / Runa instrumentation opportunities

**Implementation task — proposed, not yet accepted:**

- add an `extreme-matter` research registry with explicit fields for beam species, collision system, centre-of-mass energy, detector, run period, observable, source, and epistemic status;
- add a QCD phase-transition notebook separating measured detector observables from hydrodynamic interpretation and cosmological analogy;
- track small-system collectivity across `pp`, `p–O`, `O–O`, `Ne–Ne`, `Pb–Pb`, and future ion species;
- map geometry-sensitive observables so nuclear shape, impact parameter, multiplicity, flow coefficients, jet quenching, and particle yields remain independently inspectable;
- preserve CERN machine-state records alongside physics records: beam species, bunch structure, luminosity, quench tests, shutdown state, and upgrade milestones;
- create a cross-link between QGP, Prigogine-style nonequilibrium thermodynamics, entropy production, hydrodynamic flow, symmetry breaking, and early-Universe phase-transition research;
- keep antimatter experiments in a parallel registry rather than merging them into the heavy-ion/QGP dataset.

### Questions for later audit

- Which ALICE/ATLAS/CMS/LHCb observables provide the cleanest public machine-readable record for STARWELL ingestion?
- Which hydrodynamic quantities can be represented without implying that a detector reconstructs them directly?
- Can phase-diagram visualisation support uncertainty bands, model families, and lattice-QCD provenance?
- Which HiLumi upgrade telemetry and public run-status feeds are stable enough for a live CERN instrument adapter?
- How should Runa represent a transient state that exists only through statistical reconstruction across many collision events?

### Official source ledger

- CERN, “Final laps at the LHC”: https://home.cern/final-laps-lhc/
- CERN, “Final collisions, new horizons”: https://home.cern/final-collisions-new-horizons/
- CERN, “Accelerator Report: Pushing the LHC towards HiLumi LHC conditions… and cut!”: https://home.cern/accelerator-report-pushing-the-lhc-towards-hilumi-lhc-conditions-and-cut/
- CERN, “Long Shutdown 3”: https://home.cern/science/long-shutdown-3/
- CERN, “First-ever collisions of oxygen at the LHC”: https://home.cern/first-ever-collisions-oxygen-lhc/
- CERN, “LHC delivers a record number of particle collisions in 2025”: https://home.cern/lhc-delivers-record-number-particle-collisions-2025/
- CERN, “Antimatter”: https://home.cern/science/physics/antimatter/
- CERN, “The Antiproton Decelerator”: https://home.cern/science/accelerators/antiproton-decelerator/

## Governing rule

A lineage may inspire an instrument. The instrument must still declare what it measured, how it transformed the measurement, and which claims remain interpretation.
