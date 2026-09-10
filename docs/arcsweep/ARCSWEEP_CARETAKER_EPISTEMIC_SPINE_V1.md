# ArcSweep Caretaker Epistemic Spine v1

Status: IMPLEMENTATION CONTRACT

This document extends Caretaker v0.1 from a single safe navigation action toward a persistent, receipted House intelligence without granting arbitrary mutation authority.

## Acceptance sequence

1. Prove one real Caretaker navigation against the live configured Ollama route.
2. Persist every applied Caretaker action as a Runtime Braid event.
3. Provide read-only session/context capsule and Observer summary input.
4. Arm one additional typed action: `open_surface`.
5. Add a provenance-first epistemic ingest contract for contested frontier-AI material.
6. Generalise specialist-before-synthesis into a reusable swarm evaluation envelope.

No later step weakens the earlier gate.

## Caretaker action receipt

Schema: `arcsweep.caretaker-action-receipted/v0.1`

Required fields:

- `event_id`
- `timestamp`
- `session_id`
- `world_id`
- `caretaker_contract_version`
- `provider`
- `model`
- `requested_action`
- `validated_action`
- `target`
- `pre_state`
- `post_state`
- `applied`
- `verification`
- `context_fingerprint`
- `source_turn_id`
- `failure_reason`

Rules:

- only server-validated actions may be persisted as `applied: true`;
- model prose is never authority;
- the observed post-state is authoritative for verification;
- failed validation and failed application remain receiptable;
- provider/model are execution evidence, not Caretaker identity;
- browser-local receipts may mirror the server receipt but never replace it.

## Read-only Caretaker context

The Caretaker may receive a bounded context capsule containing:

- active room;
- active surface/organ;
- world/project identifiers;
- current user goal;
- recent typed House actions;
- recent Caretaker receipts;
- Observer summary references;
- capability availability;
- health state for relevant services.

The capsule must be fingerprinted and size-bounded. Raw high-volume telemetry, secrets, arbitrary repository data, and unreviewed canon mutation payloads are excluded.

## Second action: open_surface

`open_surface` may focus an already registered House surface or organ inside the active ArcSweep application.

It must:

1. resolve the requested surface against the live registry;
2. reject unknown or disabled targets;
3. invoke only the registered focus/open adapter;
4. observe the resulting active surface;
5. persist the receipt;
6. fail closed if verification is unavailable.

It may not write settings, files, canon, deployment state, shell state, brush state, or World state.

## Epistemic ingest lane

Dataset class: `FRONTIER_RISK_AND_GOVERNANCE`

Every source is decomposed into claims before synthesis. Required claim classes:

- `measurement`
- `firsthand_observation`
- `insider_testimony`
- `secondhand_report`
- `inference`
- `forecast`
- `speculation`
- `rhetorical_framing`
- `policy_prescription`

Epistemic distance:

- `0`: directly measured
- `1`: documented firsthand observation
- `2`: credible secondhand or insider report
- `3`: inference
- `4`: forecast
- `5`: speculation
- `6`: rhetorical or persuasive framing

Normative prescriptions are tracked on a separate axis and are not promoted into factual confidence.

## Ingest lifecycle

`RAW -> PARSED -> CLAIMS -> CORROBORATED | CONTESTED -> SYNTHESISED -> POLICY_RELEVANT`

No stage may silently overwrite an earlier stage. Historical source state and confidence revisions remain reconstructable.

## Actor incentive model

Relevant actors may receive a non-moralised incentive profile:

- capability incentive
- safety incentive
- commercial incentive
- reputational constraint
- competitive pressure
- regulatory pressure
- information privilege
- conflict-of-interest risk

These fields describe incentive geometry. They are not declarations of motive.

## Specialist swarm envelope

Roles:

- Archivist: preserve source/provenance
- Extractor: decompose claims
- Verifier: seek corroboration and contradiction
- Sceptic: challenge inference and hidden assumptions
- Historian: connect prior events and prediction outcomes
- Systems: model incentives and causal structure
- Observer: preserve disagreement and authority labels
- Red Team: test alternative explanations and failure modes
- Synthesiser: produce a bounded synthesis after specialist reports
- Caretaker: decide what may enter active working context under House policy

Consensus is never a simple vote. A synthesis receipt records support, contest, unresolved assumptions, source independence, confidence, and promotion status.

## Promotion rule

Swarm output may enter active working memory when its receipt is valid. It may not enter canonical World or theory state without the governing canon/theory acceptance contract.

## Immediate proving chamber

Use one public frontier-AI warning and at least two independent responses or analyses. The proving chamber passes only if the swarm can preserve:

- source provenance;
- claim class;
- epistemic distance;
- factual vs normative separation;
- disagreement;
- later confidence revision;
- a final synthesis that does not erase uncertainty.
