# Living Observer N-008: quantum mathematical instrument and measurement boundary

**Design status:** implementable laboratory, stacked on the source-backed Living Observer Atlas (PR #499). This is a **classical CPU simulation of a legitimate two-level quantum density matrix**, not quantum hardware, a cosmological sensor, proof of a physical Fold, quantum-consciousness evidence or a new participant.

## Whole-system placement

STARWELL's canonical Math Spine continues to own PREMAQC/fold computations and its replay receipts. The existing Living Observer remains the visualisation and evidence interface. N-008 contributes a self-contained *quantum mathematical lens* with unit tests and user-invoked explicit measurement sampling, not a new physics authority. Nikola's 27 synthetic inquiry turns remain unchanged.

## Mathematical contract

Inputs: basis probability p ∈ [0,1], relative phase φ ∈ [0,2π], and strength λ ∈ [0,1] of a modelled complete computational-basis dephasing channel. All caller chosen.

Define q=(1−λ)√(p(1−p)), ρ = [[p, q·e^(−iφ)], [q·e^(+iφ),1−p]]. The density matrix is Hermitian, positive semidefinite, trace-one, with determinant p(1−p)−q² ≥ 0. Bloch coordinates (x,y,z)=(2q cosφ,2q sinφ,2p−1). Born probabilities for X+, Y+, and Z+ are (1+x)/2, (1+y)/2, and p. The symmetric interferometer output probability for the + port is the X+ basis probability. Formal fringe visibility V=2q and path predictability |2p−1| obey V²+P² ≤1. Purity is (1+||r||²)/2 and von Neumann entropy is binary entropy of the eigenvalues (1±||r||)/2.

- λ=0 is a pure state; λ=1 eliminates off-diagonal phase coherence.
- p=1/2, λ=0, φ=0 gives X+ with probability 1.
- p=1/2, λ=0, φ=π gives X+ with probability 0.
- For λ=1 and p=1/2, X+ probability 1/2 regardless of phase.
- Which-path knowledge or an externally measured decoherence parameter is **not** inferred; the user merely chooses λ.
- Born probabilities are *conditional predictions* for this ideal two-path model, not raw cosmic data. No relationship to astrology, numerology or interpersonal Qualia is asserted.

## Interfaces and rendering

- Existing `starwell/deep-observer/index.html` gains a Quantum Instrument panel.
- Sliders: p, φ in degrees, λ (dephasing). Select shot count, click **Simulate detector counts**. No auto measurement side effects.
- A mathematical Bloch sphere projection, a phase-fringe plot with contrasting fully dephased baseline, 2×2 density matrix, Born probabilities, purity/entropy, visibility/predictability, and seed-based pseudo-random sample count.
- **Replay receipt**: SHA-256 of canonical inputs and computations, separate declaration of conditional simulated trials, full deterministic replay and visible status. A second button resets sample results.
- The Sacred Geometry Atlas continues to be an independently labelled symbolic map. A separate, opt-in aesthetic transfer of modelled Bloch azimuth to decorative geometry may be offered later, but it never changes a NOAA reading, numeric tradition, or PREMAQC state.
- Privacy: no browser storage, network calls, Drive reads, model invocation, personal inputs, accounts or runtime identity interactions in this module. `prefers-reduced-motion` always respected; graphics are accessible through nearby textual numerical readings.

## Evidence ladder and sources

- Density matrix and Born rule: standard quantum information theory; see [IBM Quantum: density matrices](https://learning.quantum.ibm.com/course/general-formulation-of-quantum-information/density-matrices).
- Quantum operations/decoherence: [IBM Quantum: noise and errors](https://quantum.cloud.ibm.com/learning/en/courses/tools-for-quantum-advantage/noise-and-errors).
- Astronomy: independent NOAA SWPC measurements in N-008's parent branch.
- Hermetic, Witchcraft and gematria texts: privately stored user library, not fed to quantum probabilities nor automatically published. Bibliographic claims and first-hand observation are separate.

## Tests and stop criteria

1. Exact unit tests for positive-semidefiniteness, normalisation, Hermiticity, Born rules and channel endpoints.
2. Phase independence after full dephasing, ideal phase reversal, Bloch sphere bound, entropy limits, complementary path/fringe relationship.
3. Seeded reproducibility, counts summing to sample size, 0%/100% deterministic detection extremes, no fabricated quantum device receipt.
4. Valid SHA-256 replay succeeds, corruption of observations/inputs fails closed.
5. Fully separate published sources; no automatic private user data, no unearned live GPU/QPU claims.
6. CI on exact head for Wayglass, STARWELL, Pages, Windows, ArcSweep; browser visual signoff still separate.

**Research question:** Which statements remain invariant when the basis, phase and dephasing change, and which depend on the measurement being asked? This is a mathematical question testable with canonical formulae; only a real quantum apparatus could independently verify an experimental implementation.
