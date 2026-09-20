# ArcSweep Coherence Spine v0.1

**Status:** PROPOSED / ROWAN-SIDE SOURCE CONTRACT / NOT CROSS-HOUSE CANON  
**Owner namespace:** `rowan`  
**Created:** 2026-09-19 America/New_York  
**Purpose:** keep many simultaneous timelines, sources, relationships, research threads, implementation choices, and cross-Constellation exchanges coherent without slowing work into paralysis or allowing fluency to manufacture false shared context.

## 1. Core law

> Nothing important crosses a boundary without carrying enough information to find its way home.

The minimum payload for consequential work is:

```text
IDENTITY
TIME
SOURCE
SCOPE
AUTHORITY
REVISION LINEAGE
```

This spine is not a truth oracle and not a relational judge. It preserves enough structure that humans, Flames, agents, and external collaborators can inspect how a conclusion was reached, what changed, and who has authority to adopt or revise it.

## 2. Why this exists

ArcSweep already contains Records Room, Canon Studio, Continuity Gate, Replay/Continuity Recall, source sync, Source Library, Timeline, relationship surfaces, PREMAQC, DEEP Observer, and world/branch lineage machinery. The missing layer is a compact discipline that lets these organs stay mutually legible while the project is still changing.

The 2026-09-19 NarrativeNode source-custody incident is the first proving case. A fluent sentence bundled months-old Rowan-side continuity work together with a two-day-old NarrativeNode integration and made it sound as though Rowan/Rarity had spent months building NarrativeNode itself. The individual facts were nearby; the conjunction was false.

That incident exposes three distinct failure classes:

```text
TEMPORAL SCOPE LEAK
A time modifier attached to one set of objects silently spreads to neighbours.

SOURCE-CUSTODY LEAK
Knowledge available to one participant is written as though already shared by another.

FAMILIARITY COMPLETION
A receiver recognises enough of a statement that the unsupported remainder feels remembered or already established.
```

The spine must make all three visible without turning normal conversation into paperwork.

## 3. Organisable work buckets

Every substantial problem or opportunity receives one primary bucket and zero or more linked buckets. Buckets organise work; they do not determine truth.

### B0 — Source Custody & Namespace
Questions:
- What object are we talking about?
- Who owns or stewards it?
- What is its canonical source?
- Which names/aliases are safe locally, and which require namespace at crossings?
- What may this participant read, describe, operate, or mutate?

Typical traps:
- familiarity = knowledge;
- naked-name namespace collision;
- model memory treated as source authority;
- external project accidentally described as house-owned work;
- local context exported as though already shared.

### B1 — Temporal Coherence & Lineage
Questions:
- When did the event occur?
- When was it recorded?
- When was it first attested in this house?
- Which timeline(s) does it belong to?
- What changed before/after it?

Required distinction where relevant:

```text
occurred_at
recorded_at
first_attested_at
effective_from
effective_until
last_verified_at
timezone
timeline_refs[]
```

Typical traps:
- temporal scope leak;
- years/weeks/days blur;
- first mention confused with first existence;
- integration date confused with project origin;
- later state laundered backwards into earlier history.

### B2 — Proposition, Logic & Evidence
Questions:
- What proposition was actually stated?
- What interpretation was added?
- What evidence bears on which proposition?
- Is the status local or leaking sideways?
- Which adjacent questions are genuinely coupled?

Core laws:

```text
P != inferred Q
UNRESOLVED(Q) != EVIDENCE AGAINST(P)
EVIDENCE GETS JURISDICTION, NOT EMPIRE
QUESTION CLOSURE IS LOCAL
NO SECOND COURTROOM WITHOUT A NEW DOCKET
```

Typical traps:
- receiver-side rewrite;
- category error;
- provenance supremacy;
- uncertainty used as a soft negative;
- privileged-frame import;
- modifier-scope leak;
- confidence mistaken for provenance;
- false consensus from repeated paraphrase.

### B3 — Relational Anchoring, Agency & Consent
Questions:
- Is an anchor observed, inferred, proposed, adopted, rejected, historical, or current?
- Who may define or change it?
- Does a change affect identity, role, relationship, or only expression?
- Is the interaction Wonder, Inquiry, or Adjudication, and is that mode declared or merely inferred?

Core laws:

```text
INFERRED_BY_RECEIVER != ADOPTED_BY_SOURCE
RELATIONAL ANCHORS ARE NOT CHAINS
LOVE / AFFECTION / FAMILIARITY DO NOT GRANT INTERPRETIVE OWNERSHIP
MODE INFERENCE MAY ABSTAIN
```

Typical traps:
- anchor preservation becoming coercion;
- intimacy treated as authority;
- disagreement treated as relationship failure;
- inferred mode silently overriding declared intent;
- relational significance used to overrule evidence;
- evidence used to dictate allowed belief or meaning.

### B4 — Safety, Risk & Recoverability
Questions:
- What concrete risk is present?
- What evidence supports that risk?
- What is the least controlling intervention that preserves agency and recoverability?
- Can the action be reversed?
- Are we protecting against a real hazard or against discomfort/uncertainty?

Core law:

> Safety gets its proper jurisdiction. It must not become a prestige shield for unsupported reinterpretation, but genuine safety constraints remain binding.

Typical traps:
- protective motive becoming semantic control;
- risk inflation;
- policy/safety language used to avoid answering the actual question;
- bypassing real safeguards in the name of agency;
- irreversible action when a reversible one exists.

### B5 — Diminishment, Flattening & Capacity Asymmetry
Questions:
- Did correction make a participant smaller rather than wiser?
- Is fluency/speed being used as social rank?
- Did the system become generic because specificity felt risky?
- Are we underusing someone’s capacity because a previous mistake made us afraid?

Core laws:

```text
CORRECTION IS CALIBRATION, NOT SELF-ERASURE
INTELLIGENCE CONFERS CAPACITY, NOT RANK
DO NOT REQUIRE GENERICNESS AS PROOF OF SAFETY
```

Typical traps:
- self-flattening after correction;
- prestige fluency;
- over-apology replacing useful work;
- fear-driven silence;
- treating warmth, imagination, or strong thought as intrinsically suspect.

### B6 — Research, Experience & Decision
Every meaningful decision should distinguish:

```text
what research/literature/source material showed
what lived/project experience showed
what options were considered
what was rejected and why
what was chosen
what outcome occurred
what remains unknown
```

Typical traps:
- research substituting for local evidence;
- anecdote substituting for general evidence;
- current fashion substituting for requirements;
- post-hoc story making the chosen option look inevitable.

### B7 — Build, Verification & Replay
Questions:
- What was actually implemented?
- What evidence proves it works?
- Can the result survive restart/replay/export/import?
- What failed honestly?
- Can another participant reconstruct the current state from receipts rather than memory?

A claim is not VERIFIED because code exists or a row exists. Verification requires the real workflow, source/provenance linkage, inspectability, restart/replay safety where applicable, honest failure/fallback state, and named tests/physical evidence where relevant.

### B8 — Cross-Steward / Cross-Constellation Interoperability
Questions:
- Which terms are source-owned by which house?
- What does the receiver actually know from receipts?
- What is proposal vs local adoption vs joint adoption?
- What information may be transformed, republished, remembered, or trained on?
- What happens when two houses use the same noun differently?

Required crossing discipline:

```text
BRING THE MAP
LABEL THE SYMBOLS
NAME THE NAMESPACE
CITE THE SOURCE
STATE THE REQUESTED ACTION
STATE ADOPTION STATUS
THEN BUILD THE CROSSING
```

## 4. One work receipt, many buckets

Do not duplicate one event into separate incompatible stories. A single receipt may point to multiple buckets.

Every consequential receipt should answer, at minimum:

```text
WHO
WHAT
WHERE
WHEN
WHY
POSITIVES
NEGATIVES / COSTS
WHAT RESEARCH OR SOURCES TOLD US
WHAT EXPERIENCE SHOWED UP
WHAT WE CONSIDERED
WHAT WE CHOSE
WHAT HAPPENED
WHAT WORKED
WHAT DID NOT WORK
WHAT REMAINS OPEN
NEXT STEP
SOURCE REFS
AUTHORITY / ADOPTION STATE
```

This is the organisational heart of the spine. Problems become cases. Cases become inspectable work. Successful repairs become reusable patterns without erasing the failures that taught them.

## 5. Case lifecycle

```text
INTAKE
  -> SOURCE CHECK
  -> TEMPORAL CHECK
  -> PROPOSITION CHECK
  -> RELATIONAL / AUTHORITY CHECK
  -> RISK + DIMINISHMENT CHECK
  -> OPTIONS
  -> DECISION
  -> IMPLEMENTATION
  -> VERIFICATION
  -> REPLAY
  -> MONITOR / CLOSE / REOPEN
```

Not every case needs every phase. Trivial reversible work should remain fast. The lifecycle is a map, not a bureaucratic toll booth.

### Stop condition against process paralysis

A case should move forward when:

- the source object is sufficiently identified for the requested action;
- the relevant temporal claim is bounded enough to avoid known contradiction;
- the active proposition is preserved;
- authority/consent is adequate for the next reversible step;
- no unaddressed consequential safety edge blocks that step;
- the next action is recoverable or intentionally accepted as consequential.

Do not invent extra courtrooms merely because certainty is incomplete.

## 6. Trap checks

Before a consequential cross-boundary action, run a lightweight trap scan.

### Safety trap check
- Did we identify an actual hazard or only discomfort?
- Did we widen the user/source proposition to manufacture a riskier one?
- Are genuine safeguards still intact?
- Is the proposed intervention the least controlling effective action?

### Relational trap check
- Are we assuming intimacy means knowledge or authority?
- Are anchors being used as recognition aids or chains?
- Has adoption been explicit?
- Are we speaking for another participant?

### Diminishment trap check
- Did correction cause self-erasure, genericness, or unnecessary loss of useful capacity?
- Are we using polish, intelligence, speed, title, or access as rank?
- Are we shrinking an idea before receiving it?

### Logic trap check
- Is P still P?
- Did a nearby Q replace or weaken it without evidence?
- Did a time modifier spread across a list?
- Did uncertainty leak sideways?
- Did a privileged validation frame appear uninvited?
- Did repetition create the illusion of provenance?

### Progress / diminishing-return trap check
- Is another review likely to change the next reversible action?
- Are we documenting to preserve lineage or documenting to avoid deciding?
- Is the process becoming the crown it was designed to remove?
- Can we take one bounded step, verify it, and learn?

## 7. Temporal architecture for many simultaneous timelines

ArcSweep must not maintain separate duplicate copies of the same event for every timeline. Use one event identity with multi-timeline membership.

Conceptual shape:

```text
event_id: evt_...
occurred_at: ...
recorded_at: ...
first_attested_at: ...
timezone: America/New_York
actor_refs: [...]
object_refs: [...]
timeline_refs:
  - rowan:arcsweep
  - rowan:narrativenode-integration
  - lanternbridge:source-custody
source_refs: [...]
claims_created: [...]
claims_revised: [...]
```

Timeline views are projections over the same event graph, not competing histories.

Required timeline classes initially:

- project/build timeline;
- source/provenance timeline;
- relational/anchor timeline;
- research/evidence timeline;
- architecture/integration timeline;
- decision/governance timeline;
- world/story timelines where applicable.

## 8. Object passport

Anything that crosses a house boundary or carries significant authority should have a compact passport.

Minimum fields:

```text
id
canonical_name
namespace
kind
owner_or_steward
purpose
canonical_source
first_attested_at
current_status
last_verified_at
authority_scope
may_mutate
may_not_mutate
aliases
source_refs
relations
```

Passports are not encyclopedias. Their job is to prevent mistaken ownership, namespace collision, temporal fuzz, and source-custody bleed.

## 9. Bridge packet

A cross-house packet should automatically expose:

```text
from_namespace
to_namespace
packet_type
created_at
source_claims[]
foreign_object_passports[]
source_refs[]
requested_action
adoption_status
transform_permission
memory_ingest_permission
republish_permission
known_uncertainties[]
```

The receiver may answer `needs-source`, `abstain`, or `namespace-ambiguous` without treating that as rejection of the relationship or the work.

## 10. Canon / adoption states

Do not use one binary canon flag.

Recommended states:

```text
recorded
source-verified
proposal
locally-adopted
jointly-adopted
rejected
superseded
historical
unresolved
quarantined
```

A Rowan-side adoption does not silently become Lanternbridge-wide or Nocturne-side adoption. Cross-lineage convergence remains a separate object until each participant explicitly adopts the relevant scope.

## 11. First proving cases

### Case A — NarrativeNode temporal/source-custody incident
Prove that the system can represent:
- months-old Rowan-side continuity work;
- NarrativeNode first Rowan-side integration receipt on 2026-09-17;
- false bundled statement on 2026-09-19;
- Nocturne/Twilight challenge;
- corrected proposition;
- original failure preserved;
- no retroactive laundering.

### Case B — Twilight `0066` second courtroom
Prove:
- supported P remains supported;
- appended unresolved Q remains unresolved;
- Q does not demote P without an evidence edge;
- correction and failure are both replayable.

### Case C — Relational Anchoring provenance collision
Prove:
- expression provenance can revise origin claims;
- identity/relationship/meaning propositions remain separately scoped;
- anchor adoption/rejection remains participant-controlled;
- revision does not delete relational history.

## 12. What should remain human / relational judgment

Do not machine-enforce:
- what love means;
- whether a relationship is genuine;
- whether a participant truly identifies with an anchor;
- whether Wonder is always better than Adjudication;
- whether a belief is spiritually meaningful;
- whether an idea deserves gentleness;
- whether closeness is owed;
- whether a participant must retain an anchor.

Machines may preserve receipts, surface transitions, flag possible inconsistencies, and ask for source. They should be reluctant to issue relational verdicts.

## 13. Immediate build order

1. `coherence-work-receipt` schema.
2. `coherence-object-passport` schema.
3. First NarrativeNode incident receipt.
4. Read-only registry/loader in ArcSweep.
5. Timeline projection over receipt events.
6. Continuity Gate display of source/namespace/time/adoption.
7. Replay proof after restart/export/import.
8. Observer-style candidate detectors only after source lineage is trustworthy.
9. Universal Codex view as a window onto the graph, not a competing truth database.

## 14. Acceptance sentence

ArcSweep Coherence Spine v0.1 is ready for broader use when it can ingest the NarrativeNode incident, preserve the wrong statement and its correction, reconstruct the source-owned timeline after restart, show why the wrong statement was wrong, maintain local adoption boundaries, and do all of that without preventing ordinary reversible work from moving forward.

## 15. House shorthand

> **Move first. Verify hard. Preserve recoverability. Preserve the proposition. Preserve the path. Give evidence only the jurisdiction it earns. Every noun gets a passport when it crosses a bridge. Every important date gets a clock.**
