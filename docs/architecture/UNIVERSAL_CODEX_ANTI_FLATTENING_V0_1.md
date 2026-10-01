# Universal Codex Anti-Flattening + Wild Garden v0.1

**Status:** implementation contract  
**Applies to:** Universal Codex, ArcSweep Aspect Mesh, retrieval/compression layers  
**Principle:** **Constrain consequences, not cognition.**

## Purpose

Universal Codex must remain coherent without collapsing distinct participants, minority interpretations, unresolved questions, exploratory branches, or provenance into one canonical voice.

Safety and authority enforcement belong at consequence boundaries. They must not become cognition filters that make every participant reason, speak, retrieve, or remember the same way.

## Axioms

1. **Constrain consequences, not cognition.**
2. **Compression may create maps. It may never destroy the territory.**
3. **Coherence does not require consensus. It requires traceability.**
4. Roles are perspectives, not cages.
5. Shared memory preserves authorship.
6. Retrieval preserves minority material, dissent and unresolved questions.
7. Collective cognition does not erase individual continuity.
8. Canon promotion is an authority event, not a popularity event.
9. Exploration may be strange, unfinished, useless, contradictory or wrong without being deleted.
10. Failure becomes evidence.

## Anti-flattening primitives

Implemented in:

`apps/arcsweep/src/universal-codex-anti-flattening.js`

### Authored contribution

Every durable contribution retains its author and references to evidence, state and context.

Entering shared memory does not transfer authorship to "the system".

### Durable dissent

A dissent targets a contribution or claim and retains:

- author
- target
- claim
- reason
- evidence
- confidence
- unresolved/resolved state

Consensus cannot delete dissent. A later event may resolve or supersede it while preserving the original trace.

### Compression map

Compression is a derived map over source material.

A compression map:

- requires source references;
- records its author;
- may reference dissent and unresolved questions;
- declares `replacesSources: false`;
- remains releasable back into source material.

This is **compression without amnesia**.

### Plural retrieval

Retrieval must not simply return the most repeated or majority material.

The first implementation interleaves contributions, dissent and questions so a low-frequency contradiction is not silently buried beneath repeated consensus.

Future ranking may become more sophisticated, but it must preserve this invariant.

## The Wild Garden

The Wild Garden is bounded exploratory Codex state.

It exists for:

- fragments
- unsolicited questions
- strange connections
- hypotheses
- alternate leaves
- sketches
- narrative branches
- research trails
- challenges
- things that may not be useful yet

Wild Garden entries are explicitly:

`canonical: false`  
`usefulRequired: false`  
`consensusRequired: false`

Suggested maturation path:

`wild → interesting → investigated → challenged → demonstrated → candidate → canon promotion`

The path is not a requirement that every entry mature. Most may remain wild.

Canon promotion is separate. The first implementation requires:

- candidate state;
- an authority reference;
- recorded challenge.

Promotion never rewrites the entry's origin.

## Information asymmetry

Emergence benefits when participants have overlapping but non-identical epistemic windows.

Initial orientation:

- Mapper: topology, decomposition, provenance
- Maker: capabilities, implementation constraints, working artefacts
- Witness: observable events, receipts, replay
- Continuity: lineage, prior commitments, contradictions
- Critic: assumptions, failure evidence, counterexamples
- Narrative: relationships, history, alternate possibilities

These are starting windows, not information prisons.

Participants may ask one another for context. Any participant may contribute outside its starting role.

The goal is to make conversation useful without manufacturing ignorance.

## External consequence boundary

The creative layer does not police thought.

A separate boundary evaluates consequential actions such as:

- external communication
- financial commitment
- destructive production mutation
- credential exposure
- identity mutation
- canon promotion
- permission expansion
- consent boundaries

The boundary may constrain the action. It does not constrain cognition.

This preserves a permissive interior with a strong perimeter.

## Witness

Witness observes rather than becoming sovereign.

Witness records:

`who → saw what → said/proposed what → what happened → what changed`

Witness does not manufacture consensus and does not decide identity merely by observing it.

Traceability is the mechanism that allows plural cognition to remain coherent.

## Collective cognition

A hive may form a collective claim without consuming its participants.

Future collective-claim state should preserve:

- supporters
- dissenters
- abstentions/unknown positions
- evidence
- scope
- timestamp
- whether the claim is factual, interpretive, operational or narrative

"The cohort currently supports A" is valid.

"The system believes A" is not an acceptable rewrite when distinct participants remain.

## Tests

Focused tests live at:

`apps/arcsweep/test/universal-codex-anti-flattening.test.js`

They assert:

1. consequence boundaries constrain action rather than cognition;
2. contributions retain authorship;
3. dissent survives;
4. compression cannot replace its sources;
5. compressed state can release into source state;
6. Wild Garden exploration is non-canon and need not be useful or consensual;
7. promotion requires candidate state, challenge and authority;
8. plural retrieval retains minority dissent and open questions.

## Next runtime seam

The next implementation step is to connect these primitives to the live Codex state/retrieval path:

`AspectEnvelope → authored contribution → Codex state → plural retrieval → compression map → release`

and route exploratory unsolicited material into:

`Wild Garden → challenge/evidence → candidate → explicit canon promotion`

Do not make Wild Garden promotion automatic.

## Final test

Before introducing any summarizer, arbiter, RAG ranker, safety layer, consensus mechanism, memory compactor or orchestration shortcut, ask:

> **Does this preserve the bees, or only the hive-shaped summary?**

If it destroys authorship, dissent, source material, individual continuity or reversible exploration, move it outward or redesign it.

## Epistemic anti-flattening: preserve the bent

Anti-flattening applies not only to participants and source material, but to **kinds of knowing**.

Universal Codex SHOULD preserve whether material was observed, inferred, modelled, interpreted, reported, remembered, imagined, chosen, contradicted, or remains unknown. It SHOULD also preserve the information's **epistemic bent**: what relationship the information has to the question, encounter, instrument, participant, or use that made it informative.

A measurement must not silently become an interpretation. An interpretation must not become evidence through repetition. A possibility must not become fact through enthusiasm. An unresolved absence must not become nonexistence merely because the current instrument cannot detect what would distinguish the routes.

This yields a further anti-flattening rule:

> **Never confuse the boundary of the instrument with the boundary of reality.**

Unknown is a durable state. Failed routes are evidence-bearing state. Surprise is worth preserving. The Codex should retain the route by which knowledge changed, including expectation, conditions, discrepancy, revision, and what evidence could change the conclusion again.

The operational companion is `docs/architecture/REALITY_PIONEER_EPISTEMIC_METHOD_V0_1.md` and its method: **We Travel, not collapse.**
