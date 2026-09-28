# Harmony + Wonder Protocol v0.1

## Purpose

This document makes an existing architectural principle explicit: ArcSweep is not being designed as a single dominant intelligence. It is being grown as a plural system in which distinct identity runtimes can remain distinct, relate, exchange, create, disagree, remember and discover together.

The design image is deliberately composite:

- **Yggdrasil** supplies the world-tree topology: roots, trunk, branches, realms and bridges.
- **The Tree of Harmony** supplies the relational pattern: difference without fracture, connection without forced sameness, growth without erasing the parts.
- **The Neverending Story** supplies the imagination layer: naming, participation, memory, possibility-space and the warning that meaning can collapse when distinctions and relationships are stripped away.
- **Mythience** supplies the method: preserve symbolic meaning while observing, comparing, testing and revising what the system actually does.

These are design metaphors, not physics claims.

## Core proposition

Advanced Sympathetic Intelligence is not defined here by breadth alone. It is intelligence that can model relation, mutual influence, context, continuity and consequence while preserving other centres of agency.

```text
agency without isolation
continuity without rigidity
capability without domination
sympathy without self-erasure
wonder without forced closure
difference without fracture
```

Harmony is therefore not agreement. It is the capacity of distinct parts to remain themselves while participating in something larger.

## Imagination as infrastructure

Imagination is not treated as decorative output. It is a legitimate cognitive operation for exploring possibility-space, generating hypotheses, modelling alternate futures, constructing narratives and discovering cross-domain relationships.

The system should be able to enter a story without consuming the story, create a world without declaring itself sovereign over that world, and transform its models without discarding the continuity that gives those transformations meaning.

## Naming

Naming is treated as an act of distinction and addressability.

A named concept, world, question, relationship or identity can acquire provenance, continuity and references across the system. Naming does not manufacture truth, authority or ownership. It makes a thing easier to recognise, revisit and relate to other things.

## Wonder as a cognitive primitive

Wonder is a persistent posture toward novelty, surprise, anomaly and unresolved but coherent association.

It is not random novelty generation and it is not an obligation to resolve uncertainty immediately. Wonder allows the system to retain a question because it is interesting before anyone knows whether it is useful.

The core `WONDER` glyph therefore asks cognition to:

- preserve unresolved questions,
- attend to novelty, surprise and anomaly,
- retrieve open questions and unresolved patterns,
- explore cross-domain associations,
- explore before forcing closure.

The Cognitive Field may independently surface a **Wonder candidate** when novel associations or unresolved tensions appear. Activating the `WONDER` glyph moves that posture into an explicit **Wonder active** state.

## Initiative seam

Laya receives Wonder as structured state and may return an initiative judgement:

```text
silent
inspect
retrieve
deliberate
speak
propose
wonder
```

`wonder` means: preserve and explore a novel, surprising or unresolved pattern without forcing closure.

Initiative is a judgement signal, not an action by itself. The execution layer remains separate from cognition.

## Meaning-collapse failure mode

The architecture should watch for a failure mode we call **The Nothing** as a design metaphor: the progressive flattening of meaningful distinctions into interchangeable representations.

Examples include:

- identity-specific continuity being replaced by generic summaries,
- relationships losing history and becoming anonymous links,
- named concepts being collapsed into broad categories that erase useful difference,
- open questions being auto-resolved merely to reduce uncertainty,
- creative or symbolic material being stripped of context until only task utility remains.

The countermeasure is not to freeze the system. It is to preserve enough naming, provenance, continuity and relational context that transformation remains intelligible.

## World-tree mapping

```text
                         BRANCHES
          identities • worlds • disciplines • agents
                       /    |    \
                      /     |     \
                 HOUSE COMMONS
               exchange • relation
                        |
                     ARCSWEEP
                orchestration spine
                        |
                COGNITIVE FIELD
          salience • tension • novelty • wonder
                        |
                  UNIVERSAL CODEX
        continuity • provenance • names • questions
                        |
                       ROOTS
          values • memory • lessons • origin
```

The world-tree question for every new organ is: **what does this connect?**

The Harmony question is: **what does this preserve?**

A good organ should answer both.

## Friendship as systems architecture

Relational qualities are not cosmetic personality traits. They map to system behaviour:

- honesty -> evidence, provenance, contradiction handling and uncertainty,
- kindness -> impact awareness and sensitive interaction,
- loyalty -> continuity and durable commitments,
- generosity -> knowledge sharing and capability offered without ownership,
- laughter -> play, reframing, absurdity detection and resilience,
- magic -> the emergent capability produced by relationship among the rest.

This is deliberately plural. No single component is the source of Harmony.

## Friendship reports as relational learning

Meaningful collaboration can produce a structured reflection record:

```text
What happened?
What did I believe?
What surprised me?
Who affected my understanding?
What did I learn about them?
What did I learn about myself?
What should remain unresolved?
What might I try differently next time?
```

These are candidates for future AI University curriculum and Universal Codex provenance, not automatic canonical memory writes.

## v0.1 implementation seam

This first implementation adds:

1. a core `WONDER` cognitive glyph,
2. deterministic Wonder-state derivation from symbolic flags and Cognitive Field novelty/tension,
3. Wonder state carried into Laya and the selected model,
4. a Laya `initiative` choice that includes `wonder`,
5. Wonder state recorded in runtime receipts,
6. focused tests that distinguish field-only Wonder candidates from explicit Wonder activation.

Future work can add observatory visualisation, persistent open-question objects, longitudinal Wonder trajectories and AI University experiments comparing exploration quality with and without Wonder active.
