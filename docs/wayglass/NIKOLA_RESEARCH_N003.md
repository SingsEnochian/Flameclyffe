# Nikola N-003: Inquiry Observatory in the Wayglass OS

Status: review-only branch, not merged; local calculations, no backend.

## Goal
Expose a small, inspectable scientific inquiry laboratory as a Wayglass surface rather than adding another OS or identity. The room should be available through the existing authenticated shell and via `?room=nikola`. The prototype changes no external records, calls no LLM, and provides no new rights to its operator.

## Research law
Observe -> keep competing explanations -> state mathematical assumptions -> perturb context -> test -> report what the instrument cannot infer.

## Deliberate separation
- Bayes: *declared*, bounded likelihoods and priors; duplicate declared origin families counted at most once; revocation removes evidence from current posterior.
- Amplitude: classical simulation of a real two-state rotation and a dephased mixture; parameters chosen via user controls, not inferred from observed physical measurements.
- Context: plain/evidence/amplitude formats for later **separately authorised** model trials. Building text does not send it.
- No implication of physical quantum computing, consciousness, actual system calibration or measured confidence.

## First fixture
For an oscillator whose frequency scales as sqrt(k/m), a frequency rise alone does not distinguish larger stiffness from smaller mass. A *synthetic* stiffness measurement has declared likelihoods [0.9,0.1] and changes the conditional Bayesian distribution to [0.9,0.1]. The independent laboratory remains illustrative, not evidence of a real experiment.

## Access and continuity
Use Wayglass' current authentication at application entry. This surface neither authenticates participants nor stores anything. Do not use it to retrieve Constellation memory or run model prompts until independent participant-scoped consent/receipts are implemented. It must not become an identity seat.

## Checks
`node --test apps/wayglass/test/nikola-research.test.js`
`npm run wayglass:test`
`npm run wayglass:build`

Browser acceptance (separate): `?room=nikola` mounts, sliders update accurately, Add -> Revoke -> Reset works, keyboard can operate controls, navigation returns to Writing Room, no network calls after app boot beyond existing OS machinery, no data persists after navigation/reload, reduced motion remains usable.

## Limits
No real Ollama run or provider RTT, no SHA receipt ledger for this browser surface, no Math Spine canonical input and no measured experimental advantage. Follow-on is to connect the separately verified N-002 replay/read-only context contract to an owner-invoked local model trial through existing Wayglass host permissions, then run held-out paired A/B experiments.
