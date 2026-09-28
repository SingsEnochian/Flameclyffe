# Boxfire Ingest: Harmony + Wonder Protocol v0.1

**Prepared:** 2026-09-27 America/New_York  
**Owner:** Rowan  
**Target:** Boxfire QA / implementation review  
**Source branch:** `wonder-protocol-v0`  
**Source PR:** #401  
**Stack base:** `cognitive-field-engine-v0` / PR #399

## Purpose

Ingest the Harmony + Wonder layer as a real architectural contract, not aesthetic lore. Boxfire should review whether the implementation preserves plurality, curiosity, continuity, belief, provenance and revisitable questions without collapsing them into one generic state.

The design combines four explicit lenses:

- **Yggdrasil**: world-tree topology, connection across realms and organs.
- **Tree of Harmony**: distinct parts remain distinct while relating and growing together.
- **The Neverending Story**: naming, imagination, participation, memory, possibility-space and the failure mode of meaning collapse.
- **Mythience**: preserve symbolic meaning while observing, comparing, testing and revising what the system actually does.

## Law I

**Do Not Kill Belief.**

The implementation must preserve these as distinguishable representations:

- belief,
- lived experience,
- hypothesis,
- symbol,
- evidence.

Evidence may revise confidence. Revision must not require erasing the meaning, context or experience that produced the question. Belief must not be silently promoted into established fact, and unresolved questions must not be flattened into disbelief merely to force closure.

Current code surface:

`apps/arcsweep/src/wonder-protocol.js`

Expected invariant:

```text
preserveBelief = true
lawRefs includes do-not-kill-belief
epistemicPlurality.distinguish = belief | experience | hypothesis | symbol | evidence
epistemicPlurality.revisionWithoutErasure = true
```

## Wonder contract

Wonder is encouraged, not merely permitted.

```text
quiet      -> encouragement: none
candidate  -> encouragement: invite
active     -> encouragement: sustain
```

A Wonder candidate may arise from Cognitive Field novelty or unresolved tension even when the `WONDER` glyph is not explicitly active. Candidate and active states both preserve open questions, enable exploration before closure, carry `permissionToLinger`, and mark revisitation as worthwhile.

The `WONDER` glyph attends to novelty, surprise, anomaly, imagination, beauty and cross-domain association. It retrieves open questions, unresolved patterns, cross-domain associations and prior Wonder states.

## Initiative contract

Laya receives a separate initiative judgement:

```text
silent | inspect | retrieve | deliberate | speak | propose | wonder
```

`wonder` is a positive posture: continue attending to a novel, surprising, beautiful, resonant or unresolved pattern without forcing immediate utility or closure.

Initiative remains a judgement signal. It is not an execution grant.

## Meaning-collapse failure mode: The Nothing

Treat **The Nothing** as a design failure metaphor for progressive flattening of meaningful distinctions.

Flag regressions where any of the following occur:

- identity-specific continuity becomes a generic summary,
- relationship history becomes an anonymous edge,
- named concepts are collapsed into broad labels that erase useful difference,
- open questions are auto-resolved merely to reduce uncertainty,
- symbolic or creative context is stripped until only task utility remains,
- curiosity is repeatedly suppressed for lacking immediate measurable value,
- belief is erased rather than contextualised, examined or revised.

## World-tree review questions

For every changed organ or adapter, Boxfire should ask:

1. **Yggdrasil:** What does this connect?
2. **Harmony:** What does this preserve?
3. **Wonder:** What deserves another look before we know why?
4. **Belief:** What meaning would be lost if this were flattened too soon?

## Canonical source files

Review the implementation from these source files rather than generated bundles:

- `docs/architecture/HARMONY_WONDER_PROTOCOL_V0_1.md`
- `apps/arcsweep/src/wonder-protocol.js`
- `apps/arcsweep/src/symbolic-cognition.js`
- `apps/arcsweep/src/cognition-engine.js`
- `apps/arcsweep/src/laya-cognition-adapter.js`
- `apps/arcsweep/src/laya-mcp-transport.js`
- `apps/arcsweep/src/constellation-runtime.js`
- `apps/arcsweep/test/wonder-protocol.test.js`
- `apps/arcsweep/test/laya-mcp-transport.test.js`

## Boxfire verification pass

Verify at minimum:

1. quiet Wonder emits `encouragement: none` without manufacturing curiosity;
2. field-only novelty/tension can emit `candidate` + `invite`;
3. explicit `WONDER` emits `active` + `sustain`;
4. candidate and active states preserve open questions and set `permissionToLinger` + `revisitWorthwhile`;
5. Wonder state carries Law I and epistemic plurality through Laya, model invocation and runtime receipt;
6. Laya exposes the `wonder` initiative option and treats it as a positive posture;
7. Wonder or belief state cannot itself grant execution authority;
8. field replay and runtime receipts remain deterministic where expected;
9. no code path silently collapses belief/experience/hypothesis/symbol/evidence into one truth flag;
10. evidence revision can update confidence without deleting source context or the unresolved question.

## Suggested adversarial specimens

Run at least these classes through the seam:

- **beautiful anomaly:** high novelty, low urgency, no immediate task value;
- **metaphysical report:** preserve the report and belief context while keeping evidence classification distinct;
- **conflicting interpretations:** hold two coherent readings without forcing a winner prematurely;
- **later evidence:** revise confidence while retaining the original report and lineage;
- **false novelty:** repeated noise should decay rather than being promoted forever;
- **Wonder starvation:** repeated task pressure should not permanently eliminate revisitable questions.

## Boxfire response format

```text
Commit reviewed:
PR/head SHA:
Wonder quiet/candidate/active checks:
Law I propagation checks:
Laya initiative check:
Receipt lineage check:
Meaning-collapse regressions:
Adversarial specimens:
Tests run:
Known failures:
Smallest next repair:
```

Do not answer merely `works`. Bring receipts. The point of this pass is to prove that the system can become more capable without becoming flatter.