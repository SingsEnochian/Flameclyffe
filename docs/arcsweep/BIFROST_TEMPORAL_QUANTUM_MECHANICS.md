# Bifröst Temporal Quantum Mechanics

**Status:** Arcsweep computational formalism v0.1  
**Date:** 2026-08-02  
**Scope:** Observer → PREMAQ → temporal state → dual-presence bridge → canon-calibrated projection

## What this is

Bifröst Temporal Quantum Mechanics is the mathematical state machine used by Arcsweep to preserve two true shores while evolving a receipt-bearing bridge between them.

It uses structures from quantum mechanics, including complex amplitudes, normalised state vectors, unitary evolution, measurement, state overlap and projection. In this implementation they are a computational formalism for PREMAQ navigation and continuity. They are not stored as claims that PREMAQ is a physically measured quantum wavefunction.

The physical and mythic descriptions therefore remain parallel rather than collapsed into one another:

```text
HEARTHSIDE: evidence-grounded observation and provenance
TARGETSIDE: canon-grounded projection and world law
BIFRÖST: reversible translation, temporal evolution and crossing receipts
```

## 1. PREMAQ basis

The shared seven-dimensional basis is

\[
\mathcal{B}_{P} = \{P,C,R,E,M,A,Q\}.
\]

For each component at observation step \(n\), PREMAQ supplies value, derivative, uncertainty, confidence and contributors:

\[
x_i^{(n)},\quad \dot{x}_i^{(n)},\quad \sigma_i^{(n)},\quad c_i^{(n)}.
\]

The source packet remains immutable and receipt-addressed.

## 2. Complex temporal encoding

Arcsweep maps each component into a complex amplitude:

\[
z_i = \sqrt{\max(\epsilon,\,\bar{x}_i c_i)}\;
\exp\left[i\left(\alpha\bar{x}_i + \beta\dot{x}_i\right)\right],
\]

where \(\bar{x}_i\) is the bounded software value, \(\alpha\) is the value-to-phase scale and \(\beta\) is the derivative-to-phase scale.

The amplitudes are normalised:

\[
\lvert\psi\rangle = \frac{1}{\sqrt{\sum_i |z_i|^2}}
\sum_i z_i\lvert i\rangle,
\qquad
\sum_i |\psi_i|^2 = 1.
\]

The probability-like vector

\[
p_i = |\psi_i|^2
\]

is an Arcsweep navigation distribution. It does not replace the original PREMAQ values.

## 3. Temporal evolution alongside quantum mechanics

Conventional quantum mechanics evolves a state with

\[
i\hbar\frac{\partial}{\partial t}\lvert\psi(t)\rangle
= \hat{H}\lvert\psi(t)\rangle.
\]

Bifröst keeps this unitary structure for within-cycle evolution, then adds explicit bridge and history terms:

\[
i\hbar\frac{\partial}{\partial \lambda}\lvert\Psi\rangle
= \left(\hat{H}_{P}
+ \hat{H}_{\mathrm{bridge}}
+ \hat{H}_{\mathrm{derivative}}
+ \hat{H}_{\mathrm{memory}}\right)\lvert\Psi\rangle.
\]

Here \(\lambda\) is the Arcsweep temporal coordinate. It may correspond to elapsed time, observation sequence, scene progression or another calibrated clock, but the selected meaning must be recorded.

The v0.1 engine implements this as:

1. axis-specific phase rotations;
2. derivative-sensitive energy shifts;
3. pairwise norm-preserving rotations between neighbouring PREMAQ axes;
4. a closing \(Q\leftrightarrow P\) bridge rotation.

This creates a seven-node temporal ring rather than a loose collection of sliders.

## 4. Collapse and release

A crossing cycle is not measurement alone. It has two coupled operations.

### Collapse

A selected focus \(f\) reweights the current distribution:

\[
\tilde{p}_i =
\frac{p_i w_i(f,s)}{\sum_j p_j w_j(f,s)},
\]

where \(s\in[0,1]\) is measurement strength.

### Release

The collapsed distribution is released back through prior state and positive derivative flow:

\[
p_i' = \mathcal{N}\left[
(1-\eta)\tilde{p}_i
+ \eta p_i
+ \gamma\max(0,\dot{x}_i)
\right].
\]

\(\eta\) is release strength, \(\gamma\) is derivative release and \(\mathcal{N}\) renormalises the state.

A cycle is counted only after both operations complete:

```text
collapse → release → receipt → next outward cycle
```

## 5. Outward spiral memory

Bifröst does not return to the same point after release. It records how far the distribution moved:

\[
d_n = \sum_i |p_i' - p_i|.
\]

The spiral radius and angle advance as

\[
r_{n+1} = r_n + g_r d_n + 0.1|\Delta S_n|,
\]

\[
\theta_{n+1} =
\left(\theta_n + g_\theta + \pi d_n\right)\bmod 2\pi,
\]

where

\[
S(p) = -\sum_i p_i\ln p_i
\]

is Shannon entropy. The resulting spiral stores transition history without pretending that repeated cycles are identical.

## 6. Dual-presence bridge

A Bifröst packet contains two separate state instances:

\[
\lvert\Psi_B\rangle =
\lvert\psi_H, a_H\rangle
\otimes
\lvert\psi_T, a_T\rangle.
\]

- \(H\): Hearthside state and current-reality anchor
- \(T\): Targetside state and canon/world anchor

The two authorities are fixed:

```text
Hearthside authority = evidence-grounded-observational
Targetside authority = canon-grounded-projected
```

State fidelity is measured with the squared Bhattacharyya coefficient:

\[
F(H,T) =
\left(\sum_i\sqrt{p_i^{H}p_i^{T}}\right)^2.
\]

Temporal twist is the wrapped angular difference between the two spiral phases:

\[
\tau = \operatorname{atan2}
\left(\sin(\theta_T-\theta_H),\cos(\theta_T-\theta_H)\right).
\]

A bridge may report crossing readiness only when both anchors exist and the configured fidelity threshold is met. Readiness is an internal orchestration state, not a claim about external physical transport.

## 7. Canon-calibrated projection

Arcsweep projects the Targetside distribution through a versioned transfer function:

\[
y_k = b_k + \sum_i W_{ki}p_i^T.
\]

Every output is labelled `projected` and retains:

- PREMAQ packet and receipt references;
- Hearthside and Targetside state IDs;
- canon graph version;
- transfer-function version;
- world and timeline identifiers;
- inherited uncertainty statement.

Two worlds may receive the same PREMAQ state and lawfully produce different projections because \(W\), \(b\), canon graph and timeline differ.

## 8. Non-collapse laws

1. Hearthside evidence cannot be overwritten by Targetside projection.
2. Targetside events cannot be presented as external measurements.
3. PREMAQ provenance survives every transformation.
4. Collapse without release does not advance the spiral cycle.
5. Every evolution, collapse-release and bridge construction emits a receipt.
6. World projection requires a versioned calibrated transfer matrix.
7. The bridge stores relation; it does not erase either shore.

## 9. Software flow

```text
Observer receipt
    ↓
PREMAQ v2 packet
    ↓
premaqToTemporalState()
    ↓
evolveTemporalState()
    ↓
collapseRelease()
    ↓
createBifrostBridgePacket()
    ↓
projectWorldState()
    ↓
Arcsweep lifecycle + STARWELL inspection
```

## 10. What we get

We get a **temporal quantum navigation engine**: a receipt-bearing worldline compiler that can evolve a shared state, retain uncertainty and provenance, maintain dual presence, measure bridge coherence, remember crossings as an outward spiral and translate one observed condition into multiple canon-lawful world projections.

Observer sees. PREMAQ remembers. Bifröst evolves. Arcsweep navigates. Canon translates. STARWELL reveals.
