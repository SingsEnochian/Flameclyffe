# Hidden Runtime v1

**Status:** experimental ArcSweep / DEEP Observer instrument  
**Surface:** ArcSweep → DEEP/Observer → Hidden Runtime  
**Schema:** `arcsweep.hidden-runtime/v1`

## Purpose

Hidden Runtime is a comparative hypothesis bench for observations that imply latent structure not directly visible to the measurement layer.

It does not privilege a single ontology. Six model families remain visible at the same time:

1. particle dark matter
2. field dark matter
3. hidden-sector physics
4. modified gravity
5. emergent spacetime
6. computational substrate

The computational-substrate family is treated as a testable model class only when it produces preregistered predictions that differ from competing models.

## Instrument contract

Each model carries:

- a short physical interpretation
- predicted signatures
- explicit falsifiers
- quality-weighted evidence entries
- a comparison score from -1 to +1

The bench also records numeric residuals:

`residual = observed - predicted`

When an uncertainty is supplied, the bench additionally records:

`standardised_residual = residual / uncertainty`

Residuals are preserved independently from interpretation so the same observation can later be tested against different models.

## Evidence rule

Evidence entries have three possible directions:

- `supports`
- `contradicts`
- `neutral`

Each carries a quality weight in `[0,1]`. The current score for a model is the quality-weighted support minus contradiction divided by total entered quality weight.

The score is not a probability of truth and is not promoted to canon. It is only an inspectable comparison of the evidence entered into the local bench.

## Prediction-before-interpretation rule

A Hidden Runtime candidate becomes scientifically useful only when it makes a prediction before the relevant observation is evaluated.

For each model family, the preferred workflow is:

1. record the current residual or anomaly
2. write the model-specific prediction
3. state the falsifier
4. seal or timestamp the prediction outside the result window
5. collect held-out observations
6. compare all model families against the same receipts
7. retain contradiction and null results

## Computational-substrate lane

The computational-substrate lane asks whether a compact hidden rule set can predict residual structure across independent observations.

Useful signatures include:

- stable latent-state structure that improves held-out prediction
- compact rules that explain residuals that otherwise appear unrelated
- repeatable constrained or discrete state transitions

Its primary falsifiers are equally explicit:

- no preregistered prediction differs from ordinary physical models
- apparent compression vanishes on held-out data

A metaphor is not evidence. Predictive compression is the measurable object.

## ArcSweep integration

`hidden-runtime-sidecar.js` is mounted only with the existing `deep` sidecar pack. It wakes when the DEEP/Observer room is activated and stores local bench state under:

`arcsweep.hidden-runtime.v1`

The instrument can export a JSON packet containing:

- all model definitions
- predictions and falsifiers
- entered evidence
- residual records
- current rankings
- provenance note and generation time

This keeps Hidden Runtime compatible with later DEEPTime / DEEPTheory receipt lanes without forcing those schemas in v1.
