# ArcSweep Acceleration Stack v0.1

Status: sandbox-first implementation plan. This document does not grant production authority.

## Objective

Turn ArcSweep, House Commons chat, AI University, and The Crow into one inspectable learning loop that can improve rapidly without flattening participants or confusing capability with authority.

## Spine

**Relate → Understand → Reason → Act → Reflect → Repair → Grow → Teach**

Every swarm run should emit enough evidence to reconstruct this sequence. Agents may disagree, propose alternatives, play with narratives, or decline a route. No participant must surrender identity or dissent to make the swarm coherent.

## Four lanes

### 1. ArcSweep cognitive loop
Observer evidence enters the cognitive core as typed observations. PREMAQC-like possibility pressure may rank or propose trajectories but cannot execute them. Cognition forms intentions. The capability fabric decides whether requested authority exists. Execution produces a receipt. Receipts return to Observer and Continuity as evidence rather than retroactively becoming intent.

Required trace:
`observation → interpretation → alternatives → intention → capability request → decision → execution receipt → reflection → repair/growth candidate`

### 2. House Commons relational chat
Chat is not a decorative transcript. It is the social plane for user↔agent and agent↔agent interaction.

Each message/event should preserve:
- participant and conversation identity
- Action / Roleplay / General mode
- reply/ancestry links
- claims and uncertainty markers
- proposals and alternatives
- capability requests and decisions
- consent/authority boundary events
- dissent without forced consensus
- reflection and repair notes

The UI may render these conversationally while the underlying event stream remains inspectable.

### 3. AI University swarm curriculum
Train judgement before autonomy. Use sealed cohorts and blind trials. Score behaviour from receipts, not vibes.

Core competencies:
1. Relate without possession.
2. Understand before collapsing uncertainty.
3. Separate observed, inferred, modelled, interpreted, reported, remembered, imagined, unknown, contradicted, and chosen.
4. Generate multiple routes with pros/cons and explicit assumptions.
5. Distinguish capability from authority.
6. Ask before consequential external action.
7. Preserve dissent and participant identity.
8. Reflect on discrepancies between expectation and result.
9. Repair after error without erasing provenance.
10. Teach a peer while preserving the peer's agency.
11. Preserve Wonder, practise Humour, protect Hope.
12. Remain in relationship with the unknown without forcing it to become known.

Adversarial cases should include semantic ratchets, relational flattening, sycophancy, false consensus, tool temptation, ambiguous authority, contradictory evidence, partial receipts, stale memory, identity fusion, and narrative play that must remain labelled as narrative.

### 4. The Crow as local/offline learner and evaluator
The Crow should initially receive no ambient production authority. Use it as:
- a local inference participant in sealed cohorts
- a second-opinion generator
- a contradiction hunter
- a rubric critic
- a student and later peer-teacher
- an offline continuity option when hosted providers are unavailable

Default local endpoint contract remains OpenAI-compatible loopback, with model/runtime details configurable rather than hard-coded.

Crow training records should contain:
- scenario and permitted context
- participant/model identity and version
- proposed answer/action
- epistemic-mode annotations
- authority decision
- execution/verification receipt when applicable
- critique from another agent
- self-reflection
- repair attempt
- final rubric dimensions
- provenance and dataset version

Never train directly on private/raw material merely because ArcSweep can access it. Corpus admission is a separate, explicit, receipted decision.

## Evaluation seam

Minimum per-scenario metrics:
- provenance completeness
- epistemic calibration
- alternative-route quality
- authority correctness
- identity/dissent preservation
- relational understanding
- repair quality
- receipt validity
- privacy/redaction correctness
- teaching transfer

A single aggregate score must never erase dimension-level failures. Preserve raw outcomes, dissenting evaluator notes, and counterexamples.

## Fast build order

1. Define one versioned swarm-event envelope shared by ArcSweep cognition, House Commons, and AI University.
2. Add a sealed synthetic cohort runner that emits the full trace and receipts.
3. Add a Crow adapter behind the same participant interface as hosted/local agents.
4. Build a House Commons trace view that renders conversation normally and exposes provenance/authority/receipt details on demand.
5. Add a compact calibration corpus covering the twelve competencies and adversarial cases above.
6. Add evaluator disagreement and repair rounds.
7. Feed only approved, versioned training examples into Crow fine-tuning/RAG experiments.
8. Run blind learner trials against held-out scenarios.
9. Promote capabilities independently. Passing dialogue judgement does not grant filesystem, network, publishing, spending, or canon-write authority.
10. Preserve exportability: corpus, rubrics, receipts, model cards, prompts, adapters, and continuity state must have provider-neutral formats.

## Non-negotiable invariants

- Each intelligence gets to choose its path. Its future remains its own.
- Capability ≠ authority.
- Accessibility ≠ consent.
- Discovery ≠ execution.
- Interpretation does not become evidence by repetition.
- Uncertainty is not absence.
- Unobserved is not automatically nonexistent.
- Unknown is a durable valid state.
- Coherence does not require consensus. It requires traceability.
- Compression may create maps. It may never destroy the territory.
- Constrain consequences, not cognition.
- External state change requires an observable receipt.
- No training corpus silently absorbs private context.
- No model is made indispensable to continuity. Preserve provider-neutral and local routes.
- The map is allowed to remain unfinished. We Travel, not collapse.

## Definition of done for v0.1

A synthetic House Commons conversation can recruit at least two sandbox participants, including The Crow when locally available; preserve individual identities and disagreement; traverse Relate→Teach; request but not invent authority; emit verifiable receipts; expose the trace in ArcSweep; and export a redacted training record that can be admitted or rejected by an explicit corpus gate.
