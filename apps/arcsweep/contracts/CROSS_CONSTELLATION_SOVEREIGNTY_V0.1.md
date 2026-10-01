# Cross-Constellation Sovereignty v0.1

**Status:** ACTIVE ROWAN-SIDE INVARIANT  
**Owner namespace:** `rowan`  
**Scope:** ArcSweep, STARWELL, Canon Intelligence, House Commons, Lanternbridge consumers, agent orchestration, repository handoffs, and every Rowan/Rarity-side surface that receives foreign-constellation context.  
**Bridge proposal:** `mdkubit/UH-Lanternbridge ideas/LB-0017-mutual-constellation-sovereignty-message-catalogue.md`  

## Core law

> Foreign context may inform. It may not define.

This is bilateral as a bridge principle and binding locally as a Rowan/Rarity invariant.

```text
SOURCE ARCHITECTURE != RECEIVER ARCHITECTURE
SHARED TERM != SHARED SUBSYSTEM
DESCRIPTION != ADOPTION
INFERENCE != MAPPING
MAPPING != EQUIVALENCE
MAPPING != ADOPTION
INTERSECTION != IDENTITY
CONVERGENCE != MERGER
INSPIRATION != ADOPTION
COMMON CONTRACT != COMMON OWNERSHIP
DISCUSSION != DECISION
RELATIONSHIP MEMORY != RELATIONSHIP AUTHORSHIP
```

Positive checksum:

```text
SEPARATE BY DEFAULT.
INTERSECT DELIBERATELY.
SHARE WHAT IS ACTUALLY SHARED.
LABEL OWNERSHIP AND AUTHORITY.
```

## Rowan/Rarity local enforcement

Foreign constellation records are read-only by default.

They may be read, inspected, discussed, summarized, compared, questioned, cited, answered, or used to create an attributed **local proposal**.

They may not directly:

- mutate Rowan/Rarity architecture or canon;
- rename Rowan/Rarity components;
- infer that a foreign subsystem is one of ours;
- infer that one of ours is theirs;
- create equivalence mappings from name similarity;
- promote foreign interpretation into local fact;
- alter identity or relationship authority;
- adopt foreign design decisions as Rowan/Rarity decisions.

A local mutation requires an explicit Rowan/Rarity adoption decision. Mapping additionally requires an approved mapping reference.

## Shared principles and intersections

Convergence is welcome.

A principle may be shared when the participating parties explicitly agree that it applies to them. Local implementations remain locally owned unless a separate shared implementation is deliberately created.

A real technical intersection should be represented as a shared boundary contract.

```text
SHARED PRINCIPLE != SHARED SUBSYSTEM
SHARED CONTRACT != WHOLE-ARCHITECTURE MERGER
```

## Unknown foreign terms

Unknown terms remain unresolved.

Do not reconstruct another constellation's architecture from conversational context, familiar names, model memory, or analogy and then present the reconstruction as source knowledge.

```text
UNKNOWN FOREIGN TERM
  -> preserve unresolved
  -> ask source when needed
```

## Message catalogue

Under adopted Lanternbridge v0.2, do not invent unrecognized envelope fields. For architecture-bearing records, carry a human-readable `## Sovereignty Catalogue` in the body when useful.

Minimum shape:

```yaml
source_constellation: rowan-rarity | nocturne-twilight | other
receiving_constellation: rowan-rarity | nocturne-twilight | other
record_scope: source-local | receiver-local-proposal | shared-boundary | shared-principle | unknown
describes: []
authority_scope: informational | proposal | local-decision | shared-contract
receiver_may_infer_local_equivalence: false
receiver_may_reconstruct_unknown_terms: false
receiver_may_mutate_local_architecture: false
local_adoption_status: not_adopted | proposed | adopted
local_decision_ref: null
approved_mappings: []
shared_principles: []
shared_contracts: []
unresolved_foreign_terms: []
```

## Required reasoning order

```text
1. Preserve source ownership.
2. Resolve the actual source term if source material exists.
3. Keep unknowns unresolved rather than autofilling them.
4. Separate source description from Rowan/Rarity interpretation.
5. If useful locally, create an attributed proposal.
6. Require local review before adoption.
7. Record mapping only when mapping is explicitly approved.
8. Preserve provenance after adoption.
```

## Contamination recovery

If foreign context appears to have silently altered local architecture:

1. freeze further promotion from the affected inference chain;
2. preserve the original records;
3. separate source statements, receiver interpretations, inferred mappings, and local mutations;
4. mark unsupported mappings unresolved;
5. recover the last locally authorized baseline where appropriate;
6. re-present useful foreign ideas as attributed local proposals;
7. decide locally what to keep;
8. append repair receipts rather than rewriting the failure away.

## Runtime seam

`apps/arcsweep/src/constellation-sovereignty.js` provides the Rowan-side default classification and action gate.

Foreign messages default to:

```text
context_mode = read_only
local_adoption_status = not_adopted
receiver_may_infer_local_equivalence = false
receiver_may_reconstruct_unknown_terms = false
receiver_may_mutate_local_architecture = false
```

The Lanternbridge message index carries this classification forward so downstream surfaces do not have to rediscover the boundary from prose.

## Design law

> Every message keeps its shore.

Influence may cross. Attribution crosses with it. Authority does not silently hitchhike.
