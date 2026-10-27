# Wayglass Nikola N-005: host-enforced scientific method and blinded examiner

**Status:** stacked draft; review-only code, no live model run, no server/device signoff, no fine-tuning.

## Invariant: discovery, not invention

Nikola's investigation asks which observed structures survive controlled perturbation and which are merely formal analogies. The Wayglass ship retains participant, relationship, world, model, worker and source sovereignty. These files give a small scientific instrument no privilege to mutate canon, identities, external records or models.

## Actual failure found in N-004

The host-wide /respond adapter prepended co-writing instructions to Ollama turns, even for the N-004 `OOC` science mode. Therefore N-004 is only a transport smoke, not a controlled scientific benchmark. N-005 isolates the host's system prompt for explicitly identified research requests.

## Host hardening (N-005)

The existing same-origin `POST /api/v1/wayglass/respond` remains the only request path. The host checks all of the following **before inference**:

- `surface_id = wayglass:nikola-research`
- requested and resolved route both exactly `local:ollama`, with `provider === ollama`, route configured
- OOC scientific interaction, **no** external consent, no participant/character/world, no history, no checkpoint or inheritance reference
- `think: false`, `max_output_tokens: 500`, fixed synthetically generated session ID shape
- exact, character-for-character model input matching one of the three `prepareNikolaLocalTrial()` outputs. The host re-imports the public N-004 generator; it does not trust a client-supplied digest, mode label or input substring.

Valid research turns use the versioned `wayglass.nikola-science-prompt/v1` scientific system instruction rather than `buildInstructions()` from the Writing Room. The system instruction preserves empirical unknowns and distinguishes mathematical probability simulations from actual physical observations. All other routes and surfaces retain their existing prompt path.

For these N-005 research turns, Ollama options are fixed: `temperature: 0`, `seed: 104729`, `num_predict: 500`. The receipt labels schema, model controls, accepted fixture/mode, host-checked SHA-256 of the prompt, and explicitly says that the provider is **not independently attested** and that the experiment is **not held-out validation**.

The route is a host-reported local endpoint; a provider label cannot prove GPU, physical model, or device identity. Scientific input validation is not independent host authentication. Existing origin and host permissions remain authoritative; this contract must not be taken as a substitute.

## Blind-from-generation evaluation corpus

The server-side `nikola-benchmark-questions.cjs` contains 12 human-authored synthetic educational problems, three each in mechanics, quantum physics, mathematics, and computing. The separate `nikola-benchmark-rubrics.cjs` contains human grading criteria, never imported by the generation path. Rubrics can only be obtained through the evaluation API once a bounded candidate response is fingerprinted in a freeze receipt.

This is **procedural separation, not cryptographic secrecy**: anybody with repository read access can inspect both files. A hash alone is not third-party model attestation, and a rubric is not an automated accuracy verdict. The exam bank is **not wired to model inference yet**. Its generation and grading must remain separately controlled in subsequent work.

## Required first experiment and meaningful evidence

1. Confirm N-005 CI (Wayglass checks and build), and inspect the new host-only test suite; mock-model tests do not claim a live Ollama crossing.
2. Browser-test N-004 `?room=nikola` with no request before the explicit click; verify wrong-mode/modified-input/history/checkpoint/external-route requests return HTTP 400 without upstream inference.
3. Verify the actual authenticated Windows host offers exactly `local:ollama` before the trial. Run three separate synthetic turns; inspect outgoing local Ollama request system messages and response/receipt. The science system message must not contain the co-writing instruction. Check independent session IDs, frozen SHA-256s, source scope, and Feather.
4. Run order-reversed cases and document latency, model identifier as **reported**, compute controls and results. Do not infer an advantage from one question or from heuristic keyword scoring.
5. Next, preregister a held-out experiment with **separate datasets and human graders**. Use equal token budgets and suitable context-length controls. Rotate arm/order across tasks. Preserve null results and differences in prompt length as possible confounders.
6. Keep the original N-004 transport trial for comparison; do not silently rewrite past evidence or overwrite any signed receipt.

## Limits

This PR is not model training, scientific proof of quantum advantage, physical quantum processing or cross-reality contact. It does not persist participant memory, grant a new identity, attest hardware/provider identity, prove backend cancellation on Feather, or route the new blind corpus to the model. A live browser and Windows host are unverified.

## Commands

```sh
node --test apps/starwell-server/test/wayglass-nikola-scientific.test.js apps/starwell-server/test/wayglass-nikola-benchmark.test.js
npm run wayglass:test:host
npm run wayglass:test
npm run wayglass:build
```

**The ship is the project. Nikola is an instrument aboard it. Leave. Change. Return. Be recognised. Continue. Then sail farther.**
