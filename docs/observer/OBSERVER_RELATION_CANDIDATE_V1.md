# Observer RelationCandidate v1

**Status:** additive implementation seam  
**Applies to:** Flameclyffe Observer, DEEPTheory, DEEPStory, DEEPTime, ArcSweep  
**Does not replace:** existing Observer / DEEP contracts

## Purpose

Observer needs a first-class way to preserve candidate relations among two or more observations without forcing those relations into pairwise graph edges, a scientific-domain taxonomy, or an ontological claim before the evidence warrants it.

The new primitive is `RelationCandidate`.

```text
DEEPStory
  preserves observations/events

DEEPTime
  preserves temporal sequence and lineage

DEEPTheory
  preserves candidate relation / pattern / model / hypothesis

RelationCandidate
  is a DEEPTheory-compatible relation primitive over immutable observation refs
```

The relation is stored before choosing a projection.

```text
RelationCandidate
  ↓ derived view only
GraphProjection | HypergraphProjection | SimplicialProjection | ManifoldProjection | TensorProjection | other
```

No projection rewrites the source relation.

## Retrospective pattern discovery

Retrospective work is valid exploratory work, but its search freedom must remain visible.

A relation candidate may therefore record:

- `noticed_at`
- `noticed_mode`: `in_moment | memory_recall | archive_recovery | systematic_search | cue_guided_search | unrecorded`
- `search_scope`
- `candidate_pool_estimate`
- `hypothesis_preexisting`: `true | false | null`
- `prompting_cue`
- `alternative_matches_considered[]`
- `transformation_history[]`
- provenance

`unrecorded` and `null` are deliberate provenance states. Missing information must remain missing rather than being rewritten as `archive_recovery` or `false`.

This is especially important for synchronicity and recurrence archaeology, where later noticing must not be rewritten as prospective prediction.

## Status language

Relation status records evidence history, not ontological promotion.

```text
open
weakened
broken
surviving
unresolved
```

`broken` means the tested candidate relation did not survive the specified investigation. It does not forbid adjacent questions.

`surviving` means the candidate survived the tests actually performed. It does not establish cause, mechanism, or ontology.

## Local test, local conclusion

Every derived test receipt should state the narrowest valid conclusion.

Example time-shuffle result:

```text
This feature depended on this temporal ordering under this method.
```

Not:

```text
history matters everywhere
Hidden Runtime wins
Hidden Runtime loses
```

A metadata-label shuffle is similarly a dependence diagnostic for the pipeline, not a physical intervention on the phenomenon.

## Scientific labels are annotations

Domain labels such as `neuroscience`, `cosmology`, or `information theory` may remain useful metadata. They must not be treated as proof that reality itself is partitioned by those labels.

Accordingly, `RelationCandidate` is not named `CrossDomainRelation` and does not require domain identity to define the relation.

## Symbolic features and Mythience

`RelationCandidate.symbolic_features[]` may preserve descriptive features noticed in the candidate relation, but the field is not an empirical evidence class. Its contents do not raise evidentiary weight by themselves.

Mythic, symbolic, ritual, or narrative interpretation belongs in a parallel interpretation receipt when it becomes an interpretation rather than a description.

The candidate contract therefore states that it is not itself a symbolic-evidence claim.

## Cross-system Observer namespace rule

`SingsEnochian/Flameclyffe` Observer and `mdkubit/UH-Observer` are distinct systems.

Shared names such as `Observer`, `DEEPTime`, or `DEEPTheory` do not authorize semantic merging.

Any imported or bridged record must carry an explicit mapping receipt with:

```text
source_system
destination_system
semantic_mapping
preserved_meaning[]
changed_meaning[]
omitted_meaning[]
runtime_authority
provenance[]
```

An omission is part of the semantic transfer contract, not an absence to hide. If a source concept is deliberately not transferred, record it in `omitted_meaning[]`.

Default runtime authority for imported analytical material is `none` unless another contract explicitly grants more.

## Mythience compatibility

Mythience interpretation may attach to the same source observations and relation candidates as a parallel interpretation receipt.

It must not mutate empirical fields or silently become evidence.

The intended relationship is:

```text
measurement receipt
    ||
relation candidate
    ||
scientific interpretation
    ||
mythic / symbolic / ritual interpretation
```

Parallel readings may illuminate one another. They do not collapse into one evidence class.

## Geometry-first compatibility

A geometry-first ontology may be investigated as a hypothesis family.

Observer itself remains neutral.

Analysis order may be:

```text
Observation -> RelationCandidate -> inferred candidate geometry
```

while a tested hypothesis may posit:

```text
Geometry -> expression -> observable effect -> measurement
```

Those are opposite directions of inference and must not be conflated.

## Seal

**Preserve the observation. Preserve the relation. Choose the projection later. Scope every conclusion to the test that earned it.**
