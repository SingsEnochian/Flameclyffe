# Science Spine Update: Theory, Evidence, and Sheet Convergence

**Date:** 2026-07-22
**Status:** Accepted requirement, implemented as module contract

The Science Spine includes theoretical mathematics, theoretical physics, simulations, symbolic correspondences, and direct observations together, provided each record carries its evidential state and provenance.

## Evidence dimensions

Every scientific entry may record independently:

- mathematical confidence;
- experimental confidence;
- observational support;
- replication status;
- publication and review status;
- source data and transformations;
- falsifiable predictions and proposed tests.

Theory is not excluded for lacking calibration. Instead, uncalibrated status remains visible.

## Sheet Convergence module

The Local Sheet-Convergence and Fold Susceptibility module is bundled for STARWELL and Hearthgate and may run standalone or inside DEEP Observer.

Hosts:

- STARWELL Central Observatory;
- Hearthgate Laboratory/Observatory;
- DEEP Observer instrument panel;
- standalone browser host.

The module reports exact mathematical derivations, location-conditioned model inputs, derived susceptibility and convergence scores, and append-only JSON receipts. Physical fold probability remains uncalibrated rather than omitted.

## Integration boundary

The standalone interface sends `hearthfire:sheet-convergence-reading` through `window.postMessage` and exposes a reusable ES module calculation core. Observer may therefore embed the interface in an iframe or consume the core directly.

## Epistemic registers

1. MATHEMATICAL_DERIVATION
2. LOCATION_INPUT
3. PHYSICS_MODEL
4. SYMBOLIC_CORRESPONDENCE
5. OBSERVATION
6. SIMULATION

All registers may coexist in one reading, but none silently replaces another.
