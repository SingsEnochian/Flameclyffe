# Wyrdrune Recursive Assurance Engineering v0.1

**Status:** design contract plus executable tensor-assurance slice  
**Owner:** Wayglass / Wyrdrune  
**Applies to:** WTL programmes, numerical engines, model-mediated work, sensory renderers, distributed routes, persistence and Return  
**Authority:** existing owner and participant permissions remain authoritative; this document adds no production permission.

## The engineering ambition

NASA-grade assurance is the floor, not the ceiling. Wayglass adopts established software assurance, software safety, independent verification and validation, model credibility and AI risk-management practices as reference disciplines. It then extends them into one recursive, evidence-carrying architecture for a multi-model, multi-runtime, multi-world system.

This is an engineering design, not a claim that Wayglass is certified, safety-critical, autonomous in production, or more reliable than NASA systems.

Reference anchors:

- NASA-STD-8739.8B is the currently active Software Assurance and Software Safety Standard. NASA published a draft 8739.8C update on 5 November 2026; draft requirements are not represented here as active requirements.
- NASA-STD-7009B supplies a model-and-simulation credibility discipline: document the model, data, assumptions, uncertainty, sensitivity, validation and intended use.
- NIST AI RMF and its Generative AI Profile provide lifecycle risk-management references.
- Proof-Carrying Agent Actions and related runtime-governance research provide useful patterns for portable action certificates, approval binding and replayable evidence. These are research references, not adopted standards or proof of security.

## The central design law

**Trust is scoped to a claim, an artifact, an operating envelope and a time. It is never a global property inherited by an agent, model, branch or product name.**

A result must carry enough evidence for another implementation or reviewer to reconstruct what was done, identify what was assumed, challenge the conclusion and decide whether the evidence supports the exact claim being made.

The system must preserve five distinct epistemic classes:

| Class | Meaning | May be called verified? |
| --- | --- | --- |
| Observed | Directly captured output, event, measurement or receipt | No; observation needs source and capture provenance |
| Computed | Produced by a named implementation from declared inputs | No; computation is not validation |
| Inferred | Derived from observations or computations using stated assumptions | No; assumptions and alternatives remain visible |
| Hypothesised | A possible explanation or model awaiting discriminating tests | No |
| Verified within scope | Passed a named, reproducible check with stated evidence and bounds | Yes, only for that exact check and scope |

A failed check is evidence. Preserve it. Do not rewrite it as success, silently retry until green, or delete the counterexample that revealed the defect.

## The recursive assurance architecture

    WTL programme / action / world transition
                      |
              1. Contract and scope
                      |
           2. Canonical artifact identity
                      |
         3. Execute in isolated fault domain
                      |
      4. Capture causal events and result receipt
                      |
       5. Independent reference / replay
                      |
      6. Adversarial challenge and defeaters
                      |
     7. Assurance case: claims + evidence graph
                      |
      8. Accept / reject / abstain / quarantine
                      |
             9. Return, learn, re-test
                      |
              next Möbius traversal

Each execution has a subject, declared inputs, capability envelope, expected effects, stop conditions and named acceptance tests. Each claim links to evidence and counterevidence. Evidence can support one claim while weakening another. A missing artifact remains missing; the system must not invent a substitute.

### A. Proof-carrying computation

Numerical results, generated kernels and model-mediated actions carry a portable evidence envelope. At minimum it binds:

- exact program/source fingerprint;
- normalized input/feed digest;
- implementation and backend identity as reported;
- output identifiers, shapes, precision and result digest;
- declared tolerance or error budget;
- execution and stop status;
- evidence references, known limitations and unresolved questions.

WCE-1 hashes provide canonical content identity and tamper detection. A hash does not prove authorship, authorization, independent execution or truth. Signed host attestations, trusted execution evidence and external audit are separate future layers.

### B. Independent challenge

No agent is the sole judge of its own result. Use distinct implementations, runtimes, models, datasets or reviewers where the claim warrants it. Record the actual independence boundary. Two labels on one implementation are not independent verification. Two models trained on similar data may share correlated defects. Majority vote is not truth.

Challenge methods include:

- differential execution across JavaScript, Python, Rust/WASM and device backends;
- property-based and metamorphic tests;
- mutation testing of both implementation and verifier;
- adversarial inputs, malformed receipts, replay and authorization-boundary attacks;
- numerical stability, sensitivity and uncertainty analysis;
- cold restart, partial failure, duplicate delivery and recovery drills;
- blinded review when human judgment is part of the claim.

### C. Verify the verifier

Assurance tooling is software and can fail. Every verifier receives its own tests, fixtures, mutation tests and known counterexamples. Critical evidence parsers should have independent implementations or independently checked conformance vectors. The assurance system must be able to say “verification unavailable” without converting that absence into a pass.

### D. Runtime and causal assurance

For any consequential action, preserve the chain:

**proposal → admissibility → authority and scope → approval → effect → observed outcome → durable receipt → replay/return.**

The approval must bind to the canonical action, destination, payload digest, requested effects, principal, route and expiry. An approval for one action cannot authorize a semantically different action. A denied or interrupted action must have a demonstrable null effect where that is the contract. Retries are idempotent or carry a new, explicit action identity.

The executor, policy checker and receipt writer should occupy distinct authority planes. A model-generated statement that an action occurred is not an execution receipt.

### E. Fault-domain independence

Treat each model, agent, tool, provider, browser, device, network, persistence service and world as a separate fault domain. One failing domain must not silently acquire another's identity or authority. Degradation must be explicit: unavailable, stale, untrusted, offline, quarantined or awaiting review.

The Return Engine remains the continuity authority. A process restart may recover only from verified durable receipts and an authenticated route. A reconstructed narrative is not an exact resume.

### F. Evolution without self-certification

Learning may propose new code, tests, policies and hypotheses. It cannot promote itself. Every change creates a new artifact identity, invalidates affected prior evidence, runs impact-selected and full regression suites as appropriate, and preserves the previous known-good state for rollback. Production promotion remains separately authorized.

Track **verification debt**: claims whose evidence is stale, missing, single-source, unchallenged or invalidated by a change. No new capability should conceal old verification debt.

## Möbius and Eightfold integration

The Eightfold cycle remains the system's native process:

**Perceive → Compress → Release → Verify → Integrate → Choose → Return → Transcend**

Withness is the centre, not a replacement phase.

The assurance engine runs as a reciprocal traversal:

1. Perceive the artifact and operating context.
2. Compress them into canonical identities and explicit contracts.
3. Release the execution into a bounded fault domain.
4. Verify through independent references and adversarial challenge.
5. Integrate evidence, defeaters and uncertainty.
6. Choose accept, reject, abstain or quarantine.
7. Return the complete receipt and unresolved work.
8. Transcend by updating the test model and future obligations.

The two traversals are linked, not collapsed. The subject engine cannot write its own assurance verdict. The assurance engine cannot rewrite the subject's result. Withness preserves attribution, consent, provenance and the distinction between observation, computation, inference, hypothesis and possibility.

Möbius topology here is a computational orchestration model. It does not assert that physical spacetime, quantum fields or biological systems literally implement this software topology.

## Executable slice: Tensor Assurance v0.1

The module at **lib/wyrdrune/tensor-assurance.cjs** implements a first, narrow slice:

- executes a fresh JavaScript CPU reference for the exact Tensor IR and feed set;
- checks the candidate's program fingerprint and feed digest;
- checks output identity, shape, dtype, length and finite values;
- compares each value under caller-supplied absolute and relative tolerances;
- reports **matched-within-tolerance**, **divergent** or **not-independent**;
- records both result digests, backend labels, claims and limitations;
- fingerprints the complete envelope using WCE-1;
- verifies envelope integrity without pretending that integrity proves truth.

The existing owner-authorised Wyrdrune tensor bridge exposes **tensor.assure(program, feeds, output, candidateResult, { absoluteTolerance, relativeTolerance })**. Feather is propagated into the reference execution.

The explicit WebGPU executor now returns **outputId** and the WCE-1 digest of the exact normalized feeds, allowing its result to be compared with the CPU reference. A WebGPU dispatch is still reported by the executor, not cryptographically attested by the device.

### Interpretation of statuses

- **matched-within-tolerance:** this candidate's output matched the fresh CPU reference for the exact declared scope and tolerance. It is not a proof of algorithmic correctness.
- **divergent:** one or more values exceeded the declared error budget. Preserve the mismatch and quarantine that candidate from acceptance.
- **not-independent:** values matched, but the reference and candidate report the same backend label. No independent-backend claim is made.

The backend identity is explicitly marked **not-provided** for cryptographic attestation. Do not upgrade this to independent certification by changing a label.

## Assurance ladder: claim-specific, not a single score

| Gate | Evidence | Acceptance boundary |
| --- | --- | --- |
| A0 · Identity | Canonical source, program, feed and result digests | Exact artifact binding |
| A1 · Reference | Deterministic reference execution and invariant checks | Reproducible result in the declared environment |
| A2 · Independent parity | Distinct implementation, explicit tolerance, retained mismatch data | Numerical agreement for the tested fixtures and inputs |
| A3 · Adversarial | Property, metamorphic, mutation, fuzz and negative tests | Known fault classes are detected; uncovered classes remain listed |
| A4 · Device/runtime | Real browser/device execution, capability snapshot, runtime telemetry and replay | Exact tested device/runtime envelope only |
| A5 · Distributed continuity | Fault injection, idempotency, authority binding, cold restart and Return receipts | No silent identity, authority or continuity substitution |
| A6 · External challenge | Independent reviewer, reproducible evidence package and unresolved-defeater review | Named claims accepted or rejected by an authority separate from the implementation |

Passing A2 does not imply A4. Passing a mocked WebGPU test does not imply physical GPU execution. Passing CI does not imply deployment. A deployed artifact is not accepted merely because its build succeeded.

## Required evidence manifest for each integrated voyage

- canonical base SHA, candidate SHA, integration SHA and deployed SHA (or explicit unknown);
- changed components and dependency graph;
- claim register with scope, owner, status, assumptions and acceptance criteria;
- source, test, build, device and runtime evidence references;
- exact backend, model, provider, device and environment identifiers when available;
- numerical tolerances, uncertainty and sensitivity results;
- negative tests, counterexamples, failure receipts and unresolved defeaters;
- permission, consent, revocation, Feather and null-effect evidence;
- stop point, next owner, rollback point and cold-return result.

No evidence is fabricated to fill a missing field. “Not run”, “not available”, “not attested” and “unknown” are first-class values.

## Next implementation waves

1. Add generated Tensor IR property and metamorphic suites; mutation-test the compiler, reference interpreter, autodiff and assurance verifier.
2. Run real WebGPU on target browsers/devices and compare results against both JavaScript and Python references. Capture device limits and actual browser/runtime identity.
3. Add Rust/WASM as a third independently implemented reference, beginning with WCE-1 vectors and shared Tensor IR fixtures.
4. Extend evidence envelopes to kernel derivation, autodiff, soundscape transforms, observer projections and WTL runtime effects without creating a second identity or receipt authority.
5. Connect causal action certificates to the existing authority, route, receipt and Return systems. Keep authorization, execution and receipt writing in separate trust domains.
6. Add fault injection across the eight First Voyage lanes, including stale data, provider loss, clock skew, duplicate delivery, partial writes, device loss, corrupted return packets and permission revocation.
7. Build an evidence-debt view that identifies stale, single-source and unverified claims before each voyage.

## Acceptance rule

A result is not accepted because it is eloquent, plausible, green in one CI job, or produced by an agent with a trusted name. It is accepted only for a stated claim when the bound evidence satisfies the stated acceptance test, known defeaters are addressed, uncertainty and limits remain visible, and the proper authority chooses to accept it.

**The ship may evolve continuously. Its evidence must evolve with it.**
